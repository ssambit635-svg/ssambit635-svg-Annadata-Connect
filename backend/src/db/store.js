import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import config from '../config.js';
import { CROPS, VILLAGES, CENTRES, USERS, BUYERS } from '../data/seed-data.js';

const DB_PATH = config.dataFile;
let cache = null;

function seedDemoRequests(db) {
  // Give the demo a realistic starting state:
  // queued farmers at Bhubaneswar Central so the officer dashboard is alive.
  const now = Date.now();
  const mk = (i, farmerId, cropId, qty, centreId, status, minutesAgo) => ({
    id: randomUUID(),
    farmerId,
    cropId,
    quantityQuintals: qty,
    centreId,
    tokenNumber: `ANC-${String(i).padStart(3, '0')}`,
    seq: i,
    status,
    note: '',
    createdAt: new Date(now - minutesAgo * 60000).toISOString(),
    updatedAt: new Date(now - minutesAgo * 60000).toISOString(),
    timeline: [
      { status: 'REQUEST_SUBMITTED', at: new Date(now - minutesAgo * 60000).toISOString(), by: farmerId },
      { status: 'TOKEN_GENERATED', at: new Date(now - minutesAgo * 60000 + 5000).toISOString(), by: 'system' },
    ],
  });

  const centre = 'centre-bbsr-central';
  // Completed seed requests carry realistic payment records (PAID) so the
  // farmer's payment-history dashboard shows real data from first boot.
  const paid1 = {
    status: 'PAID',
    amountInr: 40 * 2300,
    createdAt: new Date(now - 230 * 60000).toISOString(),
    paidAt: new Date(now - 200 * 60000).toISOString(),
    reference: 'UTR260901A4012',
  };
  const paid2 = {
    status: 'PAID',
    amountInr: 30 * 2300,
    createdAt: new Date(now - 190 * 60000).toISOString(),
    paidAt: new Date(now - 170 * 60000).toISOString(),
    reference: 'UTR260901B7781',
  };
  const r101 = mk(101, 'farmer-demo-2', 'crop-paddy', 40, centre, 'COMPLETED', 240); r101.payment = paid1;
  const r102 = mk(102, 'farmer-demo-2', 'crop-paddy', 30, centre, 'COMPLETED', 200); r102.payment = paid2;
  const reqs = [
    r101, r102,
    mk(103, 'farmer-demo-2', 'crop-maize', 25, centre, 'PROCESSING', 60),
    mk(104, 'farmer-demo-2', 'crop-paddy', 35, centre, 'CALLED', 50),
    mk(105, 'farmer-demo-2', 'crop-paddy', 42, centre, 'WAITING', 40),
    mk(106, 'farmer-demo-2', 'crop-wheat', 28, centre, 'WAITING', 32),
    mk(107, 'farmer-demo-2', 'crop-paddy', 50, centre, 'WAITING', 25),
    mk(108, 'farmer-demo-2', 'crop-mustard', 15, centre, 'WAITING', 18),
    mk(109, 'farmer-demo-2', 'crop-paddy', 45, centre, 'WAITING', 10),
    mk(110, 'farmer-demo-2', 'crop-moong', 12, centre, 'WAITING', 5),
  ];
  // Officer Jatni centre gets a couple of requests too.
  reqs.push(mk(111, 'farmer-demo-2', 'crop-paddy', 60, 'centre-jatni', 'WAITING', 30));
  reqs.push(mk(112, 'farmer-demo-2', 'crop-paddy', 33, 'centre-jatni', 'WAITING', 15));
  db.requests.push(...reqs);
  db.meta.tokenSeq = 112;
}

export function seed(force = false) {
  if (fs.existsSync(DB_PATH) && !force) return false;
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  const db = {
    meta: { tokenSeq: 100, seededAt: new Date().toISOString() },
    users: USERS.map((u) => ({
      ...u,
      isDemo: true,
      passwordHash: bcrypt.hashSync(u.password, 10),
      password: undefined,
      createdAt: new Date().toISOString(),
    })),
    crops: CROPS,
    villages: VILLAGES,
    centres: CENTRES.map((c) => ({ ...c })),
    buyers: BUYERS.map((b) => ({
      ...b,
      crops: b.crops.map((c) => ({ ...c })),
    })),
    requests: [],
    saleBookings: [],
    notifications: [],
    smsLog: [],
  };
  seedDemoRequests(db);
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
  cache = db;
  return true;
}

let writeTimer = null;
function persist() {
  // Debounce writes to keep the JSON store simple and safe enough for a demo.
  clearTimeout(writeTimer);
  writeTimer = setTimeout(() => {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
    fs.writeFileSync(DB_PATH, JSON.stringify(cache, null, 2));
  }, 50);
}

export function getDb() {
  if (cache) return cache;
  if (!fs.existsSync(DB_PATH)) seed();
  cache = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
  // Forward-compatible migration for older data files.
  if (!Array.isArray(cache.smsLog)) cache.smsLog = [];
  if (!Array.isArray(cache.notifications)) cache.notifications = [];
  if (!Array.isArray(cache.saleBookings)) cache.saleBookings = [];
  let mutated = false;
  for (const user of cache.users) {
    const seedUser = USERS.find((entry) => entry.id === user.id);
    if (seedUser && !user.isDemo) {
      user.isDemo = true;
      mutated = true;
    }
    // Mock sign-in maps sample accounts by email, so older data files (seeded
    // before farmers had one) are backfilled from the seed definition.
    if (seedUser && user.isDemo) {
      if (seedUser.email && !user.email) { user.email = seedUser.email; mutated = true; }
      if (seedUser.name && user.name !== seedUser.name) { user.name = seedUser.name; mutated = true; }
    }
    if (user.registeredBy?.startsWith('officer:') && user.passwordHash && bcrypt.compareSync('Kisan@123', user.passwordHash)) {
      user.passwordHash = null;
      mutated = true;
    }
    // Old Google demo flow allowed anyone to self-assign staff privileges.
    // An administrator must explicitly re-provision those accounts.
    if (user.registeredBy === 'self:google' && user.role !== 'farmer' && !user.accessApproved && !user.authDisabled) {
      user.authDisabled = true;
      mutated = true;
    }
  }
  if (!Array.isArray(cache.buyers) || cache.buyers.length === 0) {
    cache.buyers = BUYERS.map((b) => ({ ...b, crops: b.crops.map((c) => ({ ...c })) }));
    mutated = true;
  }
  // Assign Farmer IDs (ANC-F-0001…) to farmers that predate the ID feature.
  const nextSeq = () => {
    const max = cache.users
      .filter((u) => u.role === 'farmer' && /ANC-F-\d{4,}$/.test(u.farmerId || ''))
      .reduce((m, u) => Math.max(m, parseInt(u.farmerId.split('-')[2], 10)), 0);
    return max + 1;
  };
  let seq = nextSeq();
  cache.users.filter((u) => u.role === 'farmer' && !u.farmerId).forEach((u) => {
    u.farmerId = `ANC-F-${String(seq++).padStart(4, '0')}`;
    mutated = true;
  });
  if (mutated) saveDb();
  return cache;
}

// Next Farmer ID (ANC-F-0003, …) — used at registration / assisted entry.
export function mintFarmerId(db) {
  const max = db.users
    .filter((u) => u.role === 'farmer' && /ANC-F-\d{4,}$/.test(u.farmerId || ''))
    .reduce((m, u) => Math.max(m, parseInt(u.farmerId.split('-')[2], 10)), 0);
  return `ANC-F-${String(max + 1).padStart(4, '0')}`;
}

export function saveDb() {
  persist();
}

export function nextToken(db) {
  db.meta.tokenSeq += 1;
  return { seq: db.meta.tokenSeq, tokenNumber: `ANC-${String(db.meta.tokenSeq).padStart(3, '0')}` };
}

export function resetDb() {
  cache = null;
  if (fs.existsSync(DB_PATH)) fs.unlinkSync(DB_PATH);
  return seed(true);
}
