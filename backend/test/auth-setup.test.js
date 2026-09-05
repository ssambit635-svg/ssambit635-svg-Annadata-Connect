import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import bcrypt from 'bcryptjs';

const cwd = fileURLToPath(new URL('..', import.meta.url));
const baseEnv = { ...process.env, NODE_ENV: 'production', JWT_SECRET: 'test-only-random-length-signing-key-not-a-live-secret', ALLOW_DEMO_LOGIN: '' };
function run(args, env = {}) {
  return spawnSync(process.execPath, args, { cwd, env: { ...baseEnv, ...env }, encoding: 'utf8', timeout: 10000 });
}
function withStore(fn) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'annadata-setup-tests-'));
  const file = path.join(directory, 'db.json');
  try { fn(file); } finally { fs.rmSync(directory, { recursive: true, force: true }); }
}

test('production refuses a default/short signing key and disables sample login by default', () => {
  const invalid = run(['--input-type=module', '-e', "await import('./src/config.js')"], { JWT_SECRET: 'change-me-in-production' });
  assert.notEqual(invalid.status, 0);
  assert.match(invalid.stderr, /JWT_SECRET/);
  const valid = run(['--input-type=module', '-e', "const {default:c}=await import('./src/config.js');console.log(c.allowDemoLogin)"]);
  assert.equal(valid.status, 0, valid.stderr);
  assert.equal(valid.stdout.trim(), 'false');
});

test('trusted CLI provisions real staff without a password, verified-contact claim, or default centre', () => withStore((file) => {
  const provision = run(['src/scripts/provision-account.js', '--role', 'authority', '--name', 'Test Authority', '--email', 'Approved@Example.com', '--phone', '9876500000', '--district', 'Khordha'], { DATA_FILE: file });
  assert.equal(provision.status, 0, provision.stderr);
  const store = JSON.parse(fs.readFileSync(file, 'utf8'));
  const staff = store.users.find((u) => u.email === 'approved@example.com');
  assert.equal(staff.role, 'authority');
  assert.equal(staff.accessApproved, true);
  assert.equal(staff.passwordHash, null);
  assert.equal(staff.phoneVerified, false);
  assert.equal(staff.emailVerified, false);
  assert.equal(staff.isDemo, false);
  const noCentre = run(['src/scripts/provision-account.js', '--role', 'officer', '--name', 'Test Officer', '--email', 'officer@example.com', '--district', 'Khordha'], { DATA_FILE: file });
  assert.notEqual(noCentre.status, 0);
  const officer = run(['src/scripts/provision-account.js', '--role', 'officer', '--name', 'Test Officer', '--email', 'officer@example.com', '--district', 'Khordha', '--centre-id', 'centre-jatni'], { DATA_FILE: file });
  assert.equal(officer.status, 0, officer.stderr);
  assert.equal(JSON.parse(fs.readFileSync(file, 'utf8')).users.find((u) => u.email === 'officer@example.com').centreId, 'centre-jatni');
}));

test('CLI cannot claim contacts already belonging to another account', () => withStore((file) => {
  const args = ['src/scripts/provision-account.js', '--role', 'authority', '--name', 'Test Authority', '--email', 'approved@example.com', '--district', 'Khordha'];
  assert.equal(run(args, { DATA_FILE: file }).status, 0);
  const duplicate = run(args, { DATA_FILE: file });
  assert.notEqual(duplicate.status, 0);
  assert.match(duplicate.stderr, /already belongs/);
  assert.equal(JSON.parse(fs.readFileSync(file, 'utf8')).users.filter((u) => u.email === 'approved@example.com').length, 1);
}));

test('old insecure staff, seed accounts and shared walk-in passwords migrate safely', () => withStore((file) => {
  const legacy = {
    meta: {}, users: [
      { id: 'legacy-google', name: 'Legacy', role: 'authority', registeredBy: 'self:google' },
      { id: 'walk-in', name: 'Walk In', role: 'farmer', registeredBy: 'officer:old', passwordHash: bcrypt.hashSync('Kisan@123', 4) },
      { id: 'officer-demo', name: 'Old Seed', role: 'officer' },
    ], crops: [], villages: [], centres: [], requests: [],
  };
  fs.writeFileSync(file, JSON.stringify(legacy));
  const migrated = run(['--input-type=module', '-e', "const {getDb}=await import('./src/db/store.js');getDb()"], { DATA_FILE: file });
  assert.equal(migrated.status, 0, migrated.stderr);
  const users = JSON.parse(fs.readFileSync(file, 'utf8')).users;
  assert.equal(users.find((u) => u.id === 'legacy-google').authDisabled, true);
  assert.equal(users.find((u) => u.id === 'walk-in').passwordHash, null);
  assert.equal(users.find((u) => u.id === 'officer-demo').isDemo, true);
}));
