import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { getDb, saveDb, nextToken } from '../db/store.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { ApiError } from '../middleware/error.js';
import { requireFields, requireNumber } from '../middleware/validate.js';
import { sellingOptions, hasActiveSale } from '../services/smartSelling.service.js';
import { notifyFarmer } from '../services/notifier.service.js';
import { queueSnapshot } from '../services/queue.service.js';
import { presentRequest } from '../utils/present.js';

const router = Router();
router.use(authenticate, authorize('farmer'));

function resolveCrop(db, cropId) {
  const crop = db.crops.find((c) => c.id === cropId);
  if (!crop) throw new ApiError(400, 'VALIDATION_ERROR', 'Please choose a valid crop.');
  return crop;
}

// POST /api/selling/options — compare every buyer for a crop+quantity. Writes nothing.
router.post('/options', (req, res, next) => {
  try {
    const db = getDb();
    requireFields(req.body, ['cropId', 'quantityQuintal']);
    const crop = resolveCrop(db, req.body.cropId);
    const qty = requireNumber(req.body.quantityQuintal, 'quantityQuintal', { min: 1, max: 500 });
    const out = sellingOptions(db, { farmer: req.user, cropId: crop.id, quantityQuintal: qty });
    res.json({ cropId: crop.id, quantityQuintal: qty, ...out });
  } catch (e) {
    next(e);
  }
});

// POST /api/selling/book — commit a sale to the chosen buyer.
//   channel 'MSP'    → creates a normal procurement request + token (existing flow).
//   channel 'MARKET' → records a market booking with the private buyer.
router.post('/book', (req, res, next) => {
  try {
    const db = getDb();
    requireFields(req.body, ['cropId', 'quantityQuintal', 'channel', 'buyerId']);
    const crop = resolveCrop(db, req.body.cropId);
    const qty = requireNumber(req.body.quantityQuintal, 'quantityQuintal', { min: 1, max: 500 });
    const channel = String(req.body.channel).toUpperCase();
    if (!['MSP', 'MARKET'].includes(channel)) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'channel must be MSP or MARKET.');
    }

    const { activeRequest, activeBooking } = hasActiveSale(db, req.user.id);
    if (activeRequest) {
      throw new ApiError(409, 'ACTIVE_REQUEST_EXISTS', 'You already have an active procurement request. Complete or cancel it before selling again.');
    }
    if (activeBooking) {
      throw new ApiError(409, 'ACTIVE_BOOKING_EXISTS', 'You already have a live market booking. Cancel it before committing another sale.');
    }

    if (channel === 'MSP') return bookMsp(db, req, res, crop, qty);
    return bookMarket(db, req, res, crop, qty);
  } catch (e) {
    next(e);
  }
});

function bookMsp(db, req, res, crop, qty) {
  const centre = db.centres.find((c) => c.id === req.body.buyerId);
  if (!centre) throw new ApiError(404, 'NOT_FOUND', 'Procurement centre not found.');
  if (centre.status !== 'OPEN') {
    throw new ApiError(409, 'CENTRE_NOT_OPEN', `This centre is currently ${centre.status}. Please pick another buyer.`);
  }
  const remaining = centre.capacityQuintals - centre.currentStockQuintals;
  if (remaining < qty) {
    throw new ApiError(409, 'CENTRE_CAPACITY_EXCEEDED', `This centre can accept only ${Math.max(remaining, 0)} quintals more.`);
  }

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
    soldVia: 'SMART_SELL',
    createdAt: now,
    updatedAt: now,
    timeline: [
      { status: 'REQUEST_SUBMITTED', at: now, by: req.user.id },
      { status: 'TOKEN_GENERATED', at: now, by: 'system' },
      { status: 'WAITING', at: now, by: 'system' },
    ],
  };
  db.requests.push(request);
  notifyFarmer(
    db,
    req.user.id,
    'REQUEST_CREATED',
    `Smart sell confirmed: token ${tokenNumber} for ${qty} q of ${crop.nameEn} at ${centre.nameEn}. MSP ₹${crop.mspPerQuintal}/q.`,
    `${qty} क्विंटल ${crop.nameHi} के लिए टोकन ${tokenNumber} बन गया — ${centre.nameHi}, MSP ₹${crop.mspPerQuintal}/क्वि।`,
    { smsText: `Annadata Connect: MSP sale booked. Token ${tokenNumber} for ${qty}q ${crop.nameEn} at ${centre.nameEn}. Track your turn in the app.` }
  );
  saveDb();
  res.status(201).json({
    channel: 'MSP',
    kind: 'request',
    request: presentRequest(db, request),
    queue: queueSnapshot(db, request),
  });
}

function nextBookingReference(db) {
  db.meta.sellingSeq = (db.meta.sellingSeq || 1000) + 1;
  return `SSB-${db.meta.sellingSeq}`;
}

function bookMarket(db, req, res, crop, qty) {
  const buyer = db.buyers.find((b) => b.id === req.body.buyerId);
  if (!buyer) throw new ApiError(404, 'NOT_FOUND', 'Buyer not found.');
  const line = buyer.crops.find((l) => l.cropId === crop.id);
  if (!line) throw new ApiError(400, 'VALIDATION_ERROR', 'This buyer does not procure the selected crop.');
  if (buyer.status !== 'OPEN') {
    throw new ApiError(409, 'BUYER_NOT_OPEN', 'This buyer is currently not taking deliveries. Pick another.');
  }
  const remaining = line.intakeCapacityQuintal - (line.committedQuintal || 0);
  if (remaining < qty) {
    throw new ApiError(409, 'BUYER_CAPACITY_EXCEEDED', `This buyer can take only ${Math.max(remaining, 0)} quintals right now.`);
  }

  line.committedQuintal = (line.committedQuintal || 0) + qty;
  const reference = nextBookingReference(db);
  const now = new Date().toISOString();
  const booking = {
    id: randomUUID(),
    reference,
    farmerId: req.user.id,
    buyerId: buyer.id,
    cropId: crop.id,
    quantityQuintal: qty,
    agreedRatePerQuintal: line.offerPerQuintal,
    grossValueInr: Math.round(line.offerPerQuintal * qty * 100) / 100,
    status: 'CONFIRMED',
    createdAt: now,
    updatedAt: now,
    timeline: [{ status: 'CONFIRMED', at: now, by: req.user.id }],
  };
  db.saleBookings.push(booking);
  notifyFarmer(
    db,
    req.user.id,
    'MARKET_SALE_BOOKED',
    `Smart sell booked at ${buyer.nameEn} — ${qty} q ${crop.nameEn} at ₹${line.offerPerQuintal}/q (${buyer.settlementEn}). Ref ${reference}.`,
    `${buyer.nameHi} पर स्मार्ट बिक्री बुक — ${qty} क्विंटल ${crop.nameHi}, ₹${line.offerPerQuintal}/क्वि (${buyer.settlementHi})। रेफ ${reference}।`,
    { smsText: `Annadata Connect: Market sale booked. ${qty}q ${crop.nameEn} at ${buyer.nameEn} for Rs ${line.offerPerQuintal}/q, paid on the spot. Ref ${reference}.` }
  );
  saveDb();
  res.status(201).json({ channel: 'MARKET', kind: 'booking', booking: presentBooking(db, booking) });
}

function presentBooking(db, b) {
  const buyer = db.buyers.find((x) => x.id === b.buyerId);
  const crop = db.crops.find((c) => c.id === b.cropId);
  return {
    id: b.id,
    reference: b.reference,
    status: b.status,
    quantityQuintal: b.quantityQuintal,
    agreedRatePerQuintal: b.agreedRatePerQuintal,
    grossValueInr: b.grossValueInr,
    crop: crop ? { id: crop.id, nameEn: crop.nameEn, nameHi: crop.nameHi, nameOr: crop.nameOr } : null,
    buyer: buyer
      ? {
          id: buyer.id,
          nameEn: buyer.nameEn,
          nameHi: buyer.nameHi,
          nameOr: buyer.nameOr,
          categoryEn: buyer.categoryEn,
          categoryHi: buyer.categoryHi,
          categoryOr: buyer.categoryOr,
          address: buyer.address,
          operatingHours: buyer.operatingHours,
          settlementEn: buyer.settlementEn,
          settlementHi: buyer.settlementHi,
          settlementOr: buyer.settlementOr,
        }
      : null,
    createdAt: b.createdAt,
    updatedAt: b.updatedAt,
    timeline: b.timeline,
  };
}

// GET /api/selling/bookings — the farmer's market (private buyer) bookings.
router.get('/bookings', (req, res) => {
  const db = getDb();
  const mine = db.saleBookings
    .filter((b) => b.farmerId === req.user.id)
    .sort((a, b2) => (b2.createdAt || '').localeCompare(a.createdAt || ''))
    .map((b) => presentBooking(db, b));
  res.json({ bookings: mine });
});

// POST /api/selling/bookings/:id/cancel — release a CONFIRMED market booking.
router.post('/bookings/:id/cancel', (req, res, next) => {
  try {
    const db = getDb();
    const b = db.saleBookings.find((x) => x.id === req.params.id && x.farmerId === req.user.id);
    if (!b) throw new ApiError(404, 'NOT_FOUND', 'Booking not found.');
    if (b.status !== 'CONFIRMED') throw new ApiError(409, 'INVALID_STATE', 'Only a confirmed booking can be cancelled.');
    const buyer = db.buyers.find((x) => x.id === b.buyerId);
    const line = buyer && buyer.crops.find((l) => l.cropId === b.cropId);
    if (line) line.committedQuintal = Math.max((line.committedQuintal || 0) - b.quantityQuintal, 0);
    b.status = 'CANCELLED';
    b.updatedAt = new Date().toISOString();
    b.timeline.push({ status: 'CANCELLED', at: b.updatedAt, by: req.user.id });
    notifyFarmer(
      db,
      req.user.id,
      'MARKET_SALE_CANCELLED',
      `Your market sale booking ${b.reference} was cancelled and ${b.quantityQuintal} q released back to ${buyer ? buyer.nameEn : 'the buyer'}.`,
      `आपकी बाज़ार बिक्री बुकिंग ${b.reference} रद्द हुई और ${b.quantityQuintal} क्विंटल ${buyer ? buyer.nameHi : 'खरीददार'} को वापस मुक्त हुआ।`
    );
    saveDb();
    res.json({ booking: presentBooking(db, b) });
  } catch (e) {
    next(e);
  }
});

export default router;
