import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import config from '../config.js';
import { CROPS, VILLAGES, CENTRES, USERS, BUYERS } from '../data/seed-data.js';

const DB_PATH = config.dataFile;
let cache = null;

function seedDemoRequests(db) {
  // Give the demo a realistic starting state: a procurement day in full
  // swing across the district. Every centre has its own farmers in the
  // queue, completed handovers with payment records, and a mix of crops —
  // so officer dashboards, the authority overview and every farmer's own
  // history look like real mock data rather than a single test account.
  const now = Date.now();
  const crop = (id) => db.crops.find((c) => c.id === id);
  const mk = (i, farmerId, cropId, qty, centreId, status, minutesAgo, extra = {}) => {
    const created = new Date(now - minutesAgo * 60000);
    const timeline = [
      { status: 'REQUEST_SUBMITTED', at: created.toISOString(), by: farmerId },
      { status: 'TOKEN_GENERATED', at: new Date(created.getTime() + 5000).toISOString(), by: 'system' },
      { status: 'WAITING', at: new Date(created.getTime() + 5000).toISOString(), by: 'system' },
    ];
    const officer = db.users.find((u) => u.role === 'officer' && u.centreId === centreId)?.id || 'system';
    const step = (st, offsetMin) => timeline.push({ status: st, at: new Date(created.getTime() + offsetMin * 60000).toISOString(), by: officer });
    if (['CALLED', 'PROCESSING', 'COMPLETED'].includes(status)) step('CALLED', Math.min(minutesAgo - 2, 12));
    if (['PROCESSING', 'COMPLETED'].includes(status)) step('PROCESSING', Math.min(minutesAgo - 1, 16));
    if (status === 'COMPLETED') step('COMPLETED', Math.min(minutesAgo, 28));
    if (status === 'REJECTED') timeline.push({ status: 'REJECTED', at: new Date(created.getTime() + 9 * 60000).toISOString(), by: officer });
    if (status === 'CANCELLED') timeline.push({ status: 'CANCELLED', at: new Date(created.getTime() + 6 * 60000).toISOString(), by: farmerId });
    const updatedAt = timeline[timeline.length - 1].at;
    const r = {
      id: randomUUID(),
      farmerId,
      cropId,
      quantityQuintals: qty,
      centreId,
      tokenNumber: `ANC-${String(i).padStart(3, '0')}`,
      seq: i,
      status,
      note: extra.note || '',
      createdAt: created.toISOString(),
      updatedAt,
      timeline,
    };
    if (status === 'COMPLETED') {
      const amountInr = crop(cropId).mspPerQuintal * qty;
      const paid = extra.paid !== false;
      r.payment = {
        status: paid ? 'PAID' : 'PENDING',
        amountInr,
        createdAt: updatedAt,
        paidAt: paid ? new Date(new Date(updatedAt).getTime() + 25 * 60000).toISOString() : null,
        reference: paid ? `UTR2609${String(i).padStart(2, '0')}${['A', 'B', 'C', 'D'][i % 4]}${String(4010 + i * 37).slice(-4)}` : '',
      };
    }
    return r;
  };

  const BBSR = 'centre-bbsr-central';
  const JATNI = 'centre-jatni';
  const KHORDHA = 'centre-khordha';
  const BALIANTA = 'centre-balianta';
  const PIPILI = 'centre-pipili';

  const reqs = [
    // ── Yesterday / earlier today: completed handovers, mostly paid ──
    mk(101, 'farmer-demo-2', 'crop-paddy', 40, BBSR, 'COMPLETED', 1490),
    mk(102, 'farmer-003', 'crop-paddy', 30, BBSR, 'COMPLETED', 1420),
    mk(103, 'farmer-005', 'crop-moong', 8, JATNI, 'COMPLETED', 1380),
    mk(104, 'farmer-demo', 'crop-paddy', 36, BBSR, 'COMPLETED', 1310),
    mk(105, 'farmer-008', 'crop-mustard', 14, KHORDHA, 'COMPLETED', 1250),
    mk(106, 'farmer-011', 'crop-paddy', 52, BALIANTA, 'COMPLETED', 1200),
    mk(107, 'farmer-014', 'crop-maize', 22, PIPILI, 'COMPLETED', 1130),
    mk(108, 'farmer-006', 'crop-paddy', 45, JATNI, 'COMPLETED', 240),
    mk(109, 'farmer-004', 'crop-paddy', 38, BBSR, 'COMPLETED', 205, { paid: false }),
    mk(110, 'farmer-009', 'crop-wheat', 20, BBSR, 'COMPLETED', 170, { paid: false }),
    mk(111, 'farmer-017', 'crop-paddy', 60, KHORDHA, 'COMPLETED', 150),
    // ── Terminal states so history views show every badge ──
    mk(112, 'farmer-013', 'crop-cotton', 12, BBSR, 'REJECTED', 140, { note: 'Moisture above 17% — dry the lot and re-book.' }),
    mk(113, 'farmer-019', 'crop-paddy', 25, JATNI, 'CANCELLED', 120),
    // ── Bhubaneswar Central: at the counter right now ──
    mk(114, 'farmer-demo-2', 'crop-maize', 25, BBSR, 'PROCESSING', 62),
    mk(115, 'farmer-003', 'crop-paddy', 40, BBSR, 'CALLED', 54),
    // ── Bhubaneswar Central: waiting line ──
    mk(116, 'farmer-010', 'crop-paddy', 42, BBSR, 'WAITING', 47),
    mk(117, 'farmer-015', 'crop-wheat', 28, BBSR, 'WAITING', 41),
    mk(118, 'farmer-007', 'crop-paddy', 50, BBSR, 'WAITING', 35),
    mk(119, 'farmer-006', 'crop-mustard', 15, BBSR, 'WAITING', 29),
    mk(120, 'farmer-005', 'crop-paddy', 45, BBSR, 'WAITING', 22),
    mk(121, 'farmer-020', 'crop-moong', 12, BBSR, 'WAITING', 16),
    mk(122, 'farmer-012', 'crop-paddy', 33, BBSR, 'WAITING', 9),
    mk(123, 'farmer-018', 'crop-maize', 18, BBSR, 'WAITING', 4),
    // ── Jatni ──
    mk(124, 'farmer-016', 'crop-paddy', 60, JATNI, 'CALLED', 38),
    mk(125, 'farmer-008', 'crop-paddy', 33, JATNI, 'WAITING', 27),
    mk(126, 'farmer-009', 'crop-moong', 9, JATNI, 'WAITING', 14),
    mk(127, 'farmer-demo', 'crop-paddy', 30, JATNI, 'WAITING', 6),
    // ── Khordha ──
    mk(128, 'farmer-004', 'crop-mustard', 16, KHORDHA, 'PROCESSING', 44),
    mk(129, 'farmer-011', 'crop-paddy', 48, KHORDHA, 'WAITING', 31),
    mk(130, 'farmer-014', 'crop-paddy', 35, KHORDHA, 'WAITING', 19),
    mk(131, 'farmer-013', 'crop-maize', 24, KHORDHA, 'WAITING', 8),
    // ── Balianta ──
    mk(132, 'farmer-019', 'crop-paddy', 40, BALIANTA, 'WAITING', 26),
    mk(133, 'farmer-010', 'crop-wheat', 22, BALIANTA, 'WAITING', 12),
    // ── Pipili ──
    mk(134, 'farmer-018', 'crop-paddy', 30, PIPILI, 'CALLED', 33),
    mk(135, 'farmer-012', 'crop-moong', 10, PIPILI, 'WAITING', 21),
    mk(136, 'farmer-017', 'crop-paddy', 44, PIPILI, 'WAITING', 7),
  ];
  db.requests.push(...reqs);
  db.meta.tokenSeq = 136;

  // In-app notifications that mirror the seeded history, so farmer inboxes
  // are populated from first boot. Newest first once sorted by the API.
  const note = (farmerId, type, minutesAgo, en, hi, read = true) => db.notifications.push({
    id: randomUUID(), userId: farmerId, type, messageEn: en, messageHi: hi, read,
    createdAt: new Date(now - minutesAgo * 60000).toISOString(),
  });
  for (const r of reqs) {
    const c = crop(r.cropId);
    const centre = db.centres.find((x) => x.id === r.centreId);
    const ago = Math.round((now - new Date(r.createdAt).getTime()) / 60000);
    note(r.farmerId, 'REQUEST_CREATED', ago,
      `Token ${r.tokenNumber} generated for ${r.quantityQuintals} q of ${c.nameEn}. Please wait for your turn.`,
      `${r.quantityQuintals} क्विंटल ${c.nameHi} के लिए टोकन ${r.tokenNumber} बन गया है। कृपया अपनी बारी का इंतज़ार करें।`);
    if (['CALLED', 'PROCESSING', 'COMPLETED'].includes(r.status)) {
      note(r.farmerId, 'CALLED', Math.max(ago - 12, 1),
        `Your turn has come at ${centre.nameEn} for token ${r.tokenNumber}. Please reach the counter.`,
        `${centre.nameHi} में टोकन ${r.tokenNumber} की बारी आ गई है। कृपया काउंटर पर पहुंचें।`, r.status !== 'CALLED');
    }
    if (r.status === 'COMPLETED' && r.payment) {
      note(r.farmerId, 'COMPLETED', Math.max(ago - 28, 1),
        `Procurement completed for token ${r.tokenNumber}. Payment of ₹${r.payment.amountInr} is being processed.`,
        `टोकन ${r.tokenNumber} की खरीद पूरी हो गई है। ₹${r.payment.amountInr} का भुगतान प्रक्रिया में है।`);
      if (r.payment.status === 'PAID') {
        note(r.farmerId, 'PAYMENT_PAID', Math.max(ago - 53, 1),
          `Payment of ₹${r.payment.amountInr} for token ${r.tokenNumber} has been transferred (Ref: ${r.payment.reference}).`,
          `टोकन ${r.tokenNumber} का ₹${r.payment.amountInr} भुगतान ट्रांसफर हो गया है (संदर्भ: ${r.payment.reference})।`, false);
      }
    }
    if (r.status === 'REJECTED') {
      note(r.farmerId, 'REJECTED', Math.max(ago - 9, 1),
        `Your request ${r.tokenNumber} was rejected: ${r.note}`,
        `आपका अनुरोध ${r.tokenNumber} अस्वीकार कर दिया गया है: ${r.note}`, false);
    }
  }
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
