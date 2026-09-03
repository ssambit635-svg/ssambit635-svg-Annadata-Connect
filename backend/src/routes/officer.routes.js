import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { getDb, saveDb, nextToken, mintFarmerId } from '../db/store.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { ApiError } from '../middleware/error.js';
import { requireFields, requireNumber, requirePhone } from '../middleware/validate.js';
import config from '../config.js';
import { centreQueue, summary, centreAlerts, ACTIVE_STATUSES } from '../services/queue.service.js';
import { notifyFarmer } from '../services/notifier.service.js';
import { sendSms } from '../services/sms.service.js';
import { presentCentre, presentRequest } from '../utils/present.js';

const router = Router();
router.use(authenticate, authorize('officer', 'authority'));

function officerCentre(req) {
  const db = getDb();
  const centreId = req.user.role === 'authority' ? req.query.centreId || req.body.centreId : req.user.centreId;
  const centre = db.centres.find((c) => c.id === centreId);
  if (!centre) throw new ApiError(400, 'VALIDATION_ERROR', 'No procurement centre is assigned.');
  return { db, centre };
}

function notify(db, userId, type, messageEn, messageHi) {
  notifyFarmer(db, userId, type, messageEn, messageHi);
}

// GET /api/officer/dashboard — stats, alerts, payment summary, current queue head.
router.get('/dashboard', (req, res, next) => {
  try {
    const { db, centre } = officerCentre(req);
    const queue = centreQueue(db, centre.id);
    const withPayments = db.requests.filter((r) => r.centreId === centre.id && r.payment);
    const payments = {
      pendingCount: withPayments.filter((r) => r.payment.status === 'PENDING').length,
      pendingAmountInr: withPayments.filter((r) => r.payment.status === 'PENDING').reduce((s, r) => s + r.payment.amountInr, 0),
      paidCount: withPayments.filter((r) => r.payment.status === 'PAID').length,
      paidAmountInr: withPayments.filter((r) => r.payment.status === 'PAID').reduce((s, r) => s + r.payment.amountInr, 0),
    };
    res.json({
      centre: presentCentre(db, centre),
      stats: summary(db, centre.id),
      alerts: centreAlerts(db, centre.id),
      payments,
      serving: queue.filter((r) => r.status !== 'WAITING').slice(0, 3).map((r) => presentRequest(db, r, { withFarmer: true })),
      nextWaiting: queue.filter((r) => r.status === 'WAITING').slice(0, 5).map((r) => presentRequest(db, r, { withFarmer: true })),
    });
  } catch (e) {
    next(e);
  }
});

// GET /api/officer/queue — full active queue.
router.get('/queue', (req, res, next) => {
  try {
    const { db, centre } = officerCentre(req);
    const queue = centreQueue(db, centre.id).map((r, i) => ({
      position: i + 1,
      ...presentRequest(db, r, { withFarmer: true }),
    }));
    res.json({ centre: presentCentre(db, centre), queue });
  } catch (e) {
    next(e);
  }
});

// GET /api/officer/sms-log — SMS outbox for this officer's centre (authority: all).
router.get('/sms-log', (req, res, next) => {
  try {
    const db = getDb();
    let rows = db.smsLog || [];
    if (req.user.role === 'officer') {
      const farmerIds = new Set(
        db.requests.filter((r) => r.centreId === req.user.centreId).map((r) => r.farmerId)
      );
      farmerIds.add(...db.users.filter((u) => u.role === 'farmer').filter((u) => farmerIds.has(u.id)).map((u) => u.id));
      const phones = new Set(db.users.filter((u) => farmerIds.has(u.id)).map((u) => u.phone));
      rows = rows.filter((s) => phones.has(s.to));
    }
    res.json({
      provider: config.smsProvider,
      smsLog: rows.slice(-25).reverse(),
    });
  } catch (e) {
    next(e);
  }
});

// PATCH /api/officer/requests/:id/payment — settle a completed procurement's payment.
//   body: { action: 'MARK_PAID', reference? }
router.patch('/requests/:id/payment', (req, res, next) => {
  try {
    const { db, centre } = officerCentre(req);
    const action = String(req.body.action || '').toUpperCase();
    if (action !== 'MARK_PAID') throw new ApiError(400, 'VALIDATION_ERROR', "action must be 'MARK_PAID'.");
    const r = db.requests.find((x) => x.id === req.params.id && x.centreId === centre.id);
    if (!r) throw new ApiError(404, 'NOT_FOUND', 'Request not found at your centre.');
    if (!r.payment) throw new ApiError(409, 'INVALID_STATE', 'Payment exists only after procurement is completed.');
    if (r.payment.status === 'PAID') throw new ApiError(409, 'INVALID_STATE', 'This payment is already marked as paid.');
    r.payment.status = 'PAID';
    r.payment.paidAt = new Date().toISOString();
    r.payment.reference = String(req.body.reference || '').trim();
    r.updatedAt = new Date().toISOString();
    notify(db, r.farmerId, 'PAYMENT_PAID',
      `Payment of ₹${r.payment.amountInr} for token ${r.tokenNumber} has been transferred${r.payment.reference ? ` (Ref: ${r.payment.reference})` : ''}.`,
      `टोकन ${r.tokenNumber} का ₹${r.payment.amountInr} भुगतान ट्रांसफर हो गया है${r.payment.reference ? ` (संदर्भ: ${r.payment.reference})` : ''}।`);
    saveDb();
    res.json({ request: presentRequest(db, r, { withFarmer: true }) });
  } catch (e) {
    next(e);
  }
});

// GET /api/officer/requests?status=WAITING — today's requests, optionally filtered.
router.get('/requests', (req, res, next) => {
  try {
    const { db, centre } = officerCentre(req);
    let rows = db.requests.filter((r) => r.centreId === centre.id);
    if (req.query.status) rows = rows.filter((r) => r.status === String(req.query.status).toUpperCase());
    rows.sort((a, b) => b.seq - a.seq);
    res.json({ requests: rows.map((r) => presentRequest(db, r, { withFarmer: true })) });
  } catch (e) {
    next(e);
  }
});

// PATCH /api/officer/requests/:id/status — lifecycle transitions.
//   body: { action: 'CALL' | 'START' | 'COMPLETE' | 'REJECT', note? }
const TRANSITIONS = {
  CALL: { from: ['WAITING'], to: 'CALLED' },
  START: { from: ['CALLED'], to: 'PROCESSING' },
  COMPLETE: { from: ['PROCESSING', 'CALLED'], to: 'COMPLETED' },
  REJECT: { from: ['WAITING', 'CALLED'], to: 'REJECTED' },
};

router.patch('/requests/:id/status', (req, res, next) => {
  try {
    const { db, centre } = officerCentre(req);
    const action = String(req.body.action || '').toUpperCase();
    const rule = TRANSITIONS[action];
    if (!rule) throw new ApiError(400, 'VALIDATION_ERROR', 'action must be one of: CALL, START, COMPLETE, REJECT.');
    const r = db.requests.find((x) => x.id === req.params.id && x.centreId === centre.id);
    if (!r) throw new ApiError(404, 'NOT_FOUND', 'Request not found at your centre.');
    if (!rule.from.includes(r.status)) {
      throw new ApiError(409, 'INVALID_STATE', `Cannot ${action} a request that is ${r.status}.`);
    }
    const now = new Date().toISOString();
    r.status = rule.to;
    r.note = String(req.body.note || r.note || '');
    r.updatedAt = now;
    r.timeline.push({ status: rule.to, at: now, by: req.user.id });

    if (action === 'COMPLETE') {
      // Stock goes in — capacity tracking updates at handover completion.
      centre.currentStockQuintals += r.quantityQuintals;
      // And a payment record is opened for the farmer (settled at MSP).
      const crop = db.crops.find((c) => c.id === r.cropId);
      const amountInr = crop ? Math.round(crop.mspPerQuintal * r.quantityQuintals * 100) / 100 : 0;
      r.payment = { status: 'PENDING', amountInr, createdAt: now, paidAt: null, reference: '' };
    }
    const MESSAGES = {
      CALLED: [
        `Your turn has come at ${centre.nameEn} for token ${r.tokenNumber}. Please reach the counter.`,
        `${centre.nameHi} में टोकन ${r.tokenNumber} की बारी आ गई है। कृपया काउंटर पर पहुंचें।`,
      ],
      PROCESSING: [`Procurement has started for token ${r.tokenNumber}.`, `टोकन ${r.tokenNumber} की खरीद शुरू हो गई है।`],
      COMPLETED: r.payment
        ? [
            `Procurement completed for token ${r.tokenNumber}. Payment of ₹${r.payment.amountInr} is being processed.`,
            `टोकन ${r.tokenNumber} की खरीद पूरी हो गई है। ₹${r.payment.amountInr} का भुगतान प्रक्रिया में है।`,
          ]
        : [`Procurement completed for token ${r.tokenNumber}. Thank you!`, `टोकन ${r.tokenNumber} की खरीद पूरी हो गई है। धन्यवाद!`],
      REJECTED: [`Your request ${r.tokenNumber} was rejected${r.note ? `: ${r.note}` : ''}.`, `आपका अनुरोध ${r.tokenNumber} अस्वीकार कर दिया गया है${r.note ? `: ${r.note}` : ''}।`],
    };
    const [en, hi] = MESSAGES[rule.to];
    notify(db, r.farmerId, 'status'.toUpperCase() + '_UPDATE', en, hi);
    saveDb();
    res.json({ request: presentRequest(db, r, { withFarmer: true, withTimeline: true }) });
  } catch (e) {
    next(e);
  }
});

// GET /api/officer/centre — capacity & status; PATCH to open/pause intake.
router.get('/centre', (req, res, next) => {
  try {
    const { db, centre } = officerCentre(req);
    res.json({ centre: presentCentre(db, centre), stats: summary(db, centre.id), alerts: centreAlerts(db, centre.id) });
  } catch (e) {
    next(e);
  }
});

router.patch('/centre', (req, res, next) => {
  try {
    const { db, centre } = officerCentre(req);
    const status = String(req.body.status || '').toUpperCase();
    if (!['OPEN', 'PAUSED'].includes(status)) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'status must be OPEN or PAUSED.');
    }
    centre.status = status;
    saveDb();
    res.json({ centre: presentCentre(db, centre), stats: summary(db, centre.id) });
  } catch (e) {
    next(e);
  }
});

// POST /api/officer/assisted-request — counter staff creates a request for a
// farmer who walked in without the app (assisted mode).
router.post('/assisted-request', (req, res, next) => {
  try {
    const { db, centre } = officerCentre(req);
    requireFields(req.body, ['farmerPhone', 'farmerName', 'cropId', 'quantityQuintals']);
    const phone = requirePhone(req.body.farmerPhone, 'farmerPhone');
    const qty = requireNumber(req.body.quantityQuintals, 'quantityQuintals', { min: 1, max: 500 });
    const crop = db.crops.find((c) => c.id === req.body.cropId);
    if (!crop) throw new ApiError(400, 'VALIDATION_ERROR', 'Please choose a valid crop.');
    if (centre.status !== 'OPEN') throw new ApiError(409, 'CENTRE_NOT_OPEN', 'Centre intake is not open.');

    let farmer = db.users.find((u) => u.phone === phone && u.role === 'farmer');
    if (!farmer) {
      // Register the walk-in farmer with a temporary password they can change later.
      farmer = {
        id: randomUUID(),
        role: 'farmer',
        farmerId: mintFarmerId(db),
        name: String(req.body.farmerName).trim(),
        phone,
        passwordHash: bcrypt.hashSync('Kisan@123', 10),
        villageId: db.villages[0].id,
        district: centre.district,
        createdAt: new Date().toISOString(),
        registeredBy: `officer:${req.user.id}`,
      };
      db.users.push(farmer);
      sendSms(db, {
        to: phone,
        text: `Annadata Connect: Account created at ${centre.nameEn}. Login: ${phone}, password: Kisan@123. Use the app to track your token.`,
      }).catch(() => {});
    }
    if (db.requests.some((r) => r.farmerId === farmer.id && ACTIVE_STATUSES.includes(r.status))) {
      throw new ApiError(409, 'ACTIVE_REQUEST_EXISTS', 'This farmer already has an active request.');
    }
    const { seq, tokenNumber } = nextToken(db);
    const now = new Date().toISOString();
    const request = {
      id: randomUUID(),
      farmerId: farmer.id,
      cropId: crop.id,
      quantityQuintals: qty,
      centreId: centre.id,
      tokenNumber,
      seq,
      status: 'WAITING',
      note: 'Created at centre counter (assisted).',
      createdAt: now,
      updatedAt: now,
      timeline: [
        { status: 'REQUEST_SUBMITTED', at: now, by: req.user.id },
        { status: 'TOKEN_GENERATED', at: now, by: 'system' },
        { status: 'WAITING', at: now, by: 'system' },
      ],
    };
    db.requests.push(request);
    notify(db, farmer.id, 'REQUEST_CREATED',
      `A request was created for you at ${centre.nameEn}. Token ${tokenNumber}.`,
      `${centre.nameHi} पर आपके लिए अनुरोध बनाया गया है। टोकन ${tokenNumber}।`);
    saveDb();
    res.status(201).json({ request: presentRequest(db, request, { withFarmer: true }) });
  } catch (e) {
    next(e);
  }
});

export default router;
