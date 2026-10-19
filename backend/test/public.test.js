import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import express from 'express';
import request from 'supertest';

const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'annadata-public-tests-'));
process.env.DATA_FILE = path.join(directory, 'db.json');
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'isolated-test-signing-key-that-is-not-a-production-secret';
const { getDb } = await import('../src/db/store.js');
const { default: publicRoutes } = await import('../src/routes/public.routes.js');
const { errorHandler } = await import('../src/middleware/error.js');

after(() => fs.rmSync(directory, { recursive: true, force: true }));

function fixture() {
  const db = getDb();
  const now = new Date().toISOString();
  db.crops = [
    { id: 'crop-paddy', nameEn: 'Paddy (Common)', nameHi: 'धान', nameOr: 'ଧାନ', mspPerQuintal: 2300 },
  ];
  db.centres = [
    {
      id: 'centre-jatni', nameEn: 'Jatni Mandi Procurement Centre', nameHi: 'जटणी', nameOr: 'ଜଟଣୀ',
      district: 'Khordha', address: 'Jatni Market Yard', lat: 20.16, lng: 85.7,
      capacityQuintals: 5000, currentStockQuintals: 1000, avgProcessingMinutesPerFarmer: 20,
      status: 'OPEN', operatingHours: '9 AM – 5 PM',
    },
  ];
  db.users = [
    { id: 'farmer-1', role: 'farmer', name: 'Ramesh Chandra Sahoo', phone: '9876543210' },
  ];
  db.requests = [
    {
      id: 'req-1', seq: 2, farmerId: 'farmer-1', cropId: 'crop-paddy', centreId: 'centre-jatni',
      tokenNumber: 'ANC-1042', status: 'WAITING', quantityQuintals: 12,
      timeline: [
        { status: 'REQUEST_SUBMITTED', at: now, by: 'farmer-1' },
        { status: 'WAITING', at: now, by: 'system' },
      ],
      payment: null, createdAt: now, updatedAt: now,
    },
    {
      id: 'req-0', seq: 1, farmerId: 'farmer-1', cropId: 'crop-paddy', centreId: 'centre-jatni',
      tokenNumber: 'ANC-1041', status: 'CALLED', quantityQuintals: 5,
      timeline: [], payment: null, createdAt: now, updatedAt: now,
    },
  ];
  const app = express();
  app.use(express.json());
  app.use('/api/public', publicRoutes);
  app.use(errorHandler);
  return app;
}

test('GET /api/public/centres returns live status without auth', async () => {
  const app = fixture();
  const res = await request(app).get('/api/public/centres');
  assert.equal(res.status, 200);
  assert.equal(res.body.centres.length, 1);
  const centre = res.body.centres[0];
  assert.equal(centre.status, 'OPEN');
  assert.equal(centre.nameOr, 'ଜଟଣୀ');
  assert.equal(centre.queue.waiting, 1);
  assert.equal(centre.queue.called, 1);
});

test('POST /api/public/track returns status when token + phone match', async () => {
  const app = fixture();
  const res = await request(app)
    .post('/api/public/track')
    .send({ tokenNumber: 'anc-1042', phone: '+91 98765 43210' });
  assert.equal(res.status, 200);
  assert.equal(res.body.track.tokenNumber, 'ANC-1042');
  assert.equal(res.body.track.status, 'WAITING');
  assert.equal(res.body.track.farmerFirstName, 'Ramesh');
  assert.equal(res.body.track.queue.position, 2);
  assert.equal(res.body.track.queue.aheadCount, 1);
  assert.equal(res.body.track.estimatedValueInr, 27600);
  // Timeline must not leak internal actor ids.
  assert.equal(res.body.track.timeline[0].by, undefined);
});

test('POST /api/public/track gives one generic 404 for wrong phone or token', async () => {
  const app = fixture();
  const wrongPhone = await request(app)
    .post('/api/public/track')
    .send({ tokenNumber: 'ANC-1042', phone: '9000000000' });
  assert.equal(wrongPhone.status, 404);
  assert.equal(wrongPhone.body.error.code, 'TRACK_NOT_FOUND');

  const wrongToken = await request(app)
    .post('/api/public/track')
    .send({ tokenNumber: 'ANC-9999', phone: '9876543210' });
  assert.equal(wrongToken.status, 404);
  assert.equal(wrongToken.body.error.code, 'TRACK_NOT_FOUND');
});
