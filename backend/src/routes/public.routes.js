import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { getDb } from '../db/store.js';
import { ApiError } from '../middleware/error.js';
import { presentCentre } from '../utils/present.js';
import { queueSnapshot, summary } from '../services/queue.service.js';

// Public, unauthenticated read-only endpoints for the landing page.
// - GET  /centres : live centre status + queue counts (no personal data).
// - POST /track   : a farmer who only has a paper token + their registered
//   mobile number can see request status without creating an account.
//   Both fields must match; failures return one generic 404 so token
//   numbers cannot be enumerated. Rate-limited like sign-in.
const router = Router();

router.get('/centres', (req, res) => {
  const db = getDb();
  res.json({
    centres: db.centres.map((c) => {
      const s = summary(db, c.id);
      return {
        ...presentCentre(db, c),
        queue: {
          farmersToday: s.farmersToday,
          waiting: s.waiting,
          called: s.called,
          processing: s.processing,
          completed: s.completed,
        },
      };
    }),
  });
});

const trackLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next) => next(new ApiError(429, 'RATE_LIMITED', 'Too many attempts. Please try again later.')),
});

const digits = (v) => String(v || '').replace(/\D/g, '').slice(-10);

router.post('/track', trackLimit, (req, res, next) => {
  try {
    const tokenNumber = String(req.body?.tokenNumber || '').trim().toUpperCase();
    const phone = digits(req.body?.phone);
    const fail = () => new ApiError(404, 'TRACK_NOT_FOUND', 'No token found for this token number and mobile number.');
    if (!tokenNumber || phone.length !== 10) throw fail();

    const db = getDb();
    const request = db.requests.find((r) => String(r.tokenNumber || '').toUpperCase() === tokenNumber);
    if (!request) throw fail();
    const farmer = db.users.find((u) => u.id === request.farmerId);
    if (!farmer || digits(farmer.phone) !== phone) throw fail();

    const crop = db.crops.find((c) => c.id === request.cropId);
    const centre = db.centres.find((c) => c.id === request.centreId);
    const queue = queueSnapshot(db, request);

    res.json({
      track: {
        tokenNumber: request.tokenNumber,
        status: request.status,
        farmerFirstName: String(farmer.name || '').trim().split(/\s+/)[0] || '',
        quantityQuintals: request.quantityQuintals,
        estimatedValueInr: crop ? Math.round(crop.mspPerQuintal * request.quantityQuintals * 100) / 100 : null,
        crop: crop ? { nameEn: crop.nameEn, nameHi: crop.nameHi, nameOr: crop.nameOr, mspPerQuintal: crop.mspPerQuintal } : null,
        centre: centre
          ? { nameEn: centre.nameEn, nameHi: centre.nameHi, nameOr: centre.nameOr, district: centre.district, address: centre.address, status: centre.status }
          : null,
        queue: {
          inQueue: queue.inQueue,
          position: queue.position,
          aheadCount: queue.aheadCount,
          estimatedWaitMinutes: queue.estimatedWaitMinutes,
        },
        timeline: (request.timeline || []).map(({ status, at }) => ({ status, at })),
        payment: request.payment
          ? { status: request.payment.status, amountInr: request.payment.amountInr, paidAt: request.payment.paidAt || null, reference: request.payment.reference || null }
          : null,
        updatedAt: request.updatedAt,
      },
    });
  } catch (e) {
    next(e);
  }
});

export default router;
