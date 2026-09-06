import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';

const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'annadata-simulator-tests-'));
process.env.DATA_FILE = path.join(directory, 'db.json');
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'isolated-test-signing-key-that-is-not-a-production-secret';

const { default: config } = await import('../src/config.js');
const { seed, getDb } = await import('../src/db/store.js');
const { default: authorityRoutes } = await import('../src/routes/authority.routes.js');
const { errorHandler } = await import('../src/middleware/error.js');

function tomorrowKey() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

function fixture() {
  seed(true);
  const db = getDb();
  const app = express();
  app.use(express.json());
  app.use('/api/authority', authorityRoutes);
  app.use(errorHandler);
  const api = request(app);
  const tokenFor = (id, role) =>
    jwt.sign({ sub: id, role, purpose: 'session' }, config.jwtSecret, {
      algorithm: 'HS256',
      issuer: 'annadata-connect',
      audience: 'annadata-connect:web',
    });
  return {
    api,
    db,
    authorityToken: tokenFor('authority-demo', 'authority'),
    farmerToken: tokenFor('farmer-demo', 'farmer'),
  };
}

after(async () => {
  await new Promise((resolve) => setTimeout(resolve, 80));
  fs.rmSync(directory, { recursive: true, force: true });
});

test('simulator requires an authority session', async () => {
  const { api } = fixture();
  const body = { additionalFarmers: 100 };
  const anon = await api.post('/api/authority/simulator').send(body);
  assert.equal(anon.status, 401);
  assert.match(anon.body.error.code, /AUTH_TOKEN/);
  const farmer = await api
    .post('/api/authority/simulator')
    .set('Authorization', 'Bearer ' + fixture().farmerToken)
    .send(body);
  assert.equal(farmer.status, 403);
  assert.equal(farmer.body.error.code, 'FORBIDDEN');
});

test('no-op scenario reproduces current state without mutating the store', async () => {
  const { api, db, authorityToken } = fixture();
  const stockBefore = db.centres.map((c) => ({ id: c.id, stock: c.currentStockQuintals }));
  const requestsBefore = db.requests.length;
  const res = await api
    .post('/api/authority/simulator')
    .set('Authorization', 'Bearer ' + authorityToken)
    .send({ additionalFarmers: 0, additionalQuantityQuintal: 0, arrivalsPct: 0 });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  assert.equal(res.body.centres.length, db.centres.length);
  assert.equal(res.body.totals.extraFarmersDistrict, 0);
  assert.equal(res.body.totals.recommendedRedirectFarmers, 0);
  for (const c of res.body.centres) {
    assert.equal(c.simulated.stockQuintals, c.current.stockQuintals, `${c.centre.id} stock unchanged`);
    assert.equal(c.simulated.utilizationPct, c.current.utilizationPct, `${c.centre.id} utilisation unchanged`);
  }
  // The store must be untouched: same centre stocks and same request rows.
  assert.deepEqual(
    db.centres.map((c) => ({ id: c.id, stock: c.currentStockQuintals })),
    stockBefore
  );
  assert.equal(db.requests.length, requestsBefore);
});

test('heavy scenario projects overload and suggests a redistribution', async () => {
  const { api, authorityToken } = fixture();
  const res = await api
    .post('/api/authority/simulator')
    .set('Authorization', 'Bearer ' + authorityToken)
    .send({
      additionalFarmers: 500,
      additionalQuantityQuintal: 0,
      arrivalsPct: 25,
      simulationDate: tomorrowKey(),
    });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  const { totals, centres, recommendations } = res.body;
  assert.ok(totals.expectedArrivals > totals.farmersTodayDistrict, 'projected arrivals exceed today');
  assert.ok(centres.some((c) => c.simulated.overloaded), 'at least one centre overloaded');
  assert.ok(centres.every((c) => c.simulated.queue >= 0));
  assert.ok(recommendations.length > 0, 'overload triggers a recommendation');
  const redirect = recommendations.find((r) => r.code === 'REDIRECT');
  assert.ok(redirect, 'recommendation is a redirect');
  assert.ok(redirect.fromCentreId && redirect.toCentreId, 'redirect names both centres');
  assert.ok(redirect.quantityQuintal > 0 && redirect.farmers > 0, 'redirect carries load');
  // Suggested sums are consistent with the recommendation list.
  const outTotals = centres.reduce((a, c) => a + (c.suggested || []).reduce((s, x) => s + x.quantityQuintal, 0), 0);
  assert.equal(outTotals, totals.recommendedRedirectQuintals);
  // Every centre reports what it looks like after the suggested redirects.
  for (const c of centres) {
    assert.equal(typeof c.redirectedAfter.utilizationPct, 'number');
    assert.equal(typeof c.simulated.waitMinutes, 'number');
  }
});

test('same scenario is deterministic and respects the paused centre', async () => {
  const { api, authorityToken } = fixture();
  const payload = { additionalFarmers: 120, arrivalsPct: 10 };
  const call = () =>
    api.post('/api/authority/simulator').set('Authorization', 'Bearer ' + authorityToken).send(payload);
  const a = await call();
  const b = await call();
  assert.equal(a.status, 200);
  assert.deepEqual(a.body, b.body, 'two identical runs return identical projections');
  const paused = a.body.centres.find((c) => c.centre.id === 'centre-tangi');
  assert.ok(paused, 'paused centre is present in the report');
  assert.equal(paused.intake, false);
  assert.equal(paused.simulated.level, 'INTAKE_OFF');
  assert.equal(paused.simulated.extraFarmers, 0, 'no new farmers are sent to a paused centre');
});

test('validates scenario inputs', async () => {
  const { api, authorityToken } = fixture();
  const auth = { Authorization: 'Bearer ' + authorityToken };
  const negative = await api.post('/api/authority/simulator').set(auth).send({ additionalFarmers: -5 });
  assert.equal(negative.status, 400);
  assert.equal(negative.body.error.code, 'VALIDATION_ERROR');
  const tooHighPct = await api.post('/api/authority/simulator').set(auth).send({ arrivalsPct: 999 });
  assert.equal(tooHighPct.status, 400);
  const unknownCrop = await api.post('/api/authority/simulator').set(auth).send({ cropId: 'crop-unknown' });
  assert.equal(unknownCrop.status, 400);
  const badDate = await api
    .post('/api/authority/simulator')
    .set(auth)
    .send({ simulationDate: '2026-13-40' });
  assert.equal(badDate.status, 400);
  // Valid crop + date pass and are echoed back.
  const ok = await api
    .post('/api/authority/simulator')
    .set(auth)
    .send({ cropId: 'crop-paddy', simulationDate: '2026-09-15', additionalQuantityQuintal: 2500 });
  assert.equal(ok.status, 200, JSON.stringify(ok.body));
  assert.equal(ok.body.simulation.crop.id, 'crop-paddy');
  assert.equal(ok.body.simulation.date, '2026-09-15');
  assert.equal(ok.body.totals.extraFarmersDistrict, 0, 'quantity-only scenario moves no farmers');
});
