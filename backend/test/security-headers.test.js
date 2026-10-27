import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import request from 'supertest';

const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'annadata-security-tests-'));
process.env.DATA_FILE = path.join(directory, 'db.json');
process.env.NODE_ENV = 'production';
process.env.JWT_SECRET = 'isolated-test-signing-key-that-is-long-enough-for-production';
process.env.SEED_ON_BOOT = 'false';
const { createApp } = await import('../src/app.js');
const app = createApp();

after(() => fs.rmSync(directory, { recursive: true, force: true }));

test('production API sets defensive headers and prevents API response caching', async () => {
  const response = await request(app).get('/api/health');
  assert.equal(response.status, 200);
  assert.equal(response.headers['x-powered-by'], undefined);
  assert.equal(response.headers['x-content-type-options'], 'nosniff');
  assert.equal(response.headers['x-frame-options'], 'DENY');
  assert.equal(response.headers['referrer-policy'], 'strict-origin-when-cross-origin');
  assert.equal(response.headers['permissions-policy'], 'camera=(), microphone=(), geolocation=()');
  assert.equal(response.headers['strict-transport-security'], 'max-age=31536000; includeSubDomains');
  assert.equal(response.headers['cache-control'], 'no-store');
});
