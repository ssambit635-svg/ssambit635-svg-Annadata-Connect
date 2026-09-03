import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { getDb, saveDb, nextToken } from '../db/store.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { ApiError } from '../middleware/error.js';
import { requireFields, requireNumber } from '../middleware/validate.js';
import { recommendCentres } from '../services/recommendation.service.js';
import { queueSnapshot, ACTIVE_STATUSES } from '../services/queue.service.js';
import { presentRequest } from '../utils/present.js';
import { notifyFarmer } from '../services/notifier.service.js';

const router = Router();
router.use(authenticate, authorize('farmer'));

function findActiveRequest(db, farmerId) {
  return db.requests.find((r) => r.farmerId === farmerId && ACTIVE_STATUSES.includes(r.status));
}

// POST /api/requests/recommend — evaluate centres for a crop+quantity, no data written.
router.post('/recommend', (req, res, next) => {
  try {
    const db = getDb();
    requireFields(req.body, ['cropId', 'quantityQuintals']);
    if (!db.crops.some((c) => c.id === req.body.cropId)) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'Please choose a valid crop.');
    }
    const qty = requireNumber(req.body.quantityQuintals, 'quantityQuintals', { min: 1, max: 500 });
    res.json({
      quantityQuintals: qty,
      cropId: req.body.cropId,
      ...recommendCentres(db, { farmer: req.user, cropId: req.body.cropId, quantityQuintals: qty }),
    });
  } catch (e) {
    next(e);
  }
});

// POST /api/requests — farmer confirms a centre; token + queue entry are created.
router.post('/', (req, res, next) => {
  try {
    const db = getDb();
    requireFields(req.body, ['cropId', 'quantityQuintals', 'centreId']);
    const crop = db.crops.find((c) => c.id === req.body.cropId);
    if (!crop) throw new ApiError(400, 'VALIDATION_ERROR', 'Please choose a valid crop.');
    const qty = requireNumber(req.body.quantityQuintals, 'quantityQuintals', { min: 1, max: 500 });
    const centre = db.centres.find((c) => c.id === req.body.centreId);
    if (!centre) throw new ApiError(404, 'NOT_FOUND', 'Procurement centre not found.');
    if (centre.status !== 'OPEN') throw new ApiError(409, 'CENTRE_NOT_OPEN', `This centre is currently ${centre.status}. Please pick another centre.`);
    const remaining = centre.capacityQuintals - centre.currentStockQuintals;
    if (remaining < qty) throw new ApiError(409, 'CENTRE_CAPACITY_EXCEEDED', `This centre can accept only ${Math.max(remaining, 0)} quintals more.`);
    const existing = findActiveRequest(db, req.user.id);
    if (existing) throw new ApiError(409, 'ACTIVE_REQUEST_EXISTS', `You already have an active request (${existing.tokenNumber}). Complete or cancel it first.`);

    const { seq, tokenNumber } = nextToken(db);
    const now = new Date().toISOString();
    const request = {
      id: randomUUID(),
      farmerId: req.user.id,
      cropId: crop.id,
      quantityQuintals: qty,
      centreId: centre.id,
      tokenNumber,
      seq,
      status: 'WAITING',
      note: '',
      createdAt: now,
      updatedAt: now,
      timeline: [
        { status: 'REQUEST_SUBMITTED', at: now, by: req.user.id },
        { status: 'TOKEN_GENERATED', at: now, by: 'system' },
        { status: 'WAITING', at: now, by: 'system' },
      ],
    };
    db.requests.push(request);
    notifyFarmer(db, req.user.id, 'REQUEST_CREATED',
      `Token ${tokenNumber} generated for ${qty} q of ${crop.nameEn}. Please wait for your turn.`,
      `${qty} क्विंटल ${crop.nameHi} के लिए टोकन ${tokenNumber} बन गया है। कृपया अपनी बारी का इंतज़ार करें।`,
      { smsText: `Annadata Connect: Token ${tokenNumber} booked for ${qty}q ${crop.nameEn} at ${centre.nameEn}. Track your queue in the app.` });
    saveDb();
    res.status(201).json({ request: presentRequest(db, request), queue: queueSnapshot(db, request) });
  } catch (e) {
    next(e);
  }
});

// GET /api/requests/mine — history, newest first.
router.get('/mine', (req, res) => {
  const db = getDb();
  const mine = db.requests
    .filter((r) => r.farmerId === req.user.id)
    .sort((a, b) => b.seq - a.seq)
    .map((r) => presentRequest(db, r));
  res.json({ requests: mine });
});

function ownedRequest(req, db) {
  const r = db.requests.find((x) => x.id === req.params.id);
  if (!r || r.farmerId !== req.user.id) {
    throw new ApiError(404, 'NOT_FOUND', 'Request not found.');
  }
  return r;
}

// GET /api/requests/:id — full detail with timeline and queue snapshot.
router.get('/:id', (req, res, next) => {
  try {
    const db = getDb();
    const r = ownedRequest(req, db);
    res.json({
      request: presentRequest(db, r, { withTimeline: true }),
      queue: queueSnapshot(db, r),
    });
  } catch (e) {
    next(e);
  }
});

// POST /api/requests/:id/cancel
router.post('/:id/cancel', (req, res, next) => {
  try {
    const db = getDb();
    const r = ownedRequest(req, db);
    if (!['PENDING', 'WAITING'].includes(r.status)) {
      throw new ApiError(409, 'INVALID_STATE', 'Only a waiting request can be cancelled.');
    }
    r.status = 'CANCELLED';
    r.updatedAt = new Date().toISOString();
    r.timeline.push({ status: 'CANCELLED', at: r.updatedAt, by: req.user.id });
    saveDb();
    res.json({ request: presentRequest(db, r, { withTimeline: true }) });
  } catch (e) {
    next(e);
  }
});

export default router;
