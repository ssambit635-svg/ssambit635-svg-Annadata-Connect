import { Router } from 'express';
import { getDb } from '../db/store.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { ApiError } from '../middleware/error.js';
import { summary, centreAlerts } from '../services/queue.service.js';
import { presentCentre, presentRequest } from '../utils/present.js';

const router = Router();
router.use(authenticate, authorize('authority'));

// GET /api/authority/overview — district-level view across all centres.
router.get('/overview', (req, res) => {
  const db = getDb();
  const centres = db.centres.map((c) => {
    const s = summary(db, c.id);
    const volumeToday = db.requests
      .filter((r) => r.centreId === c.id && r.status === 'COMPLETED')
      .reduce((sum, r) => sum + r.quantityQuintals, 0);
    const valueToday = db.requests
      .filter((r) => r.centreId === c.id && r.payment)
      .reduce((sum, r) => sum + r.payment.amountInr, 0);
    const paidToday = db.requests
      .filter((r) => r.centreId === c.id && r.payment && r.payment.status === 'PAID')
      .reduce((sum, r) => sum + r.payment.amountInr, 0);
    return {
      ...presentCentre(db, c),
      stats: s,
      procuredQuintals: Math.round(volumeToday * 100) / 100,
      procuredValueInr: Math.round(valueToday),
      paidValueInr: Math.round(paidToday),
      alerts: centreAlerts(db, c.id),
    };
  });
  const totals = {
    farmersToday: centres.reduce((a, c) => a + c.stats.farmersToday, 0),
    waiting: centres.reduce((a, c) => a + c.stats.waiting, 0),
    completed: centres.reduce((a, c) => a + c.stats.completed, 0),
    procuredQuintals: Math.round(centres.reduce((a, c) => a + c.procuredQuintals, 0) * 100) / 100,
    openCentres: centres.filter((c) => c.status === 'OPEN').length,
    totalCentres: centres.length,
  };
  res.json({ district: req.user.district || 'Khordha', totals, centres });
});

// GET /api/authority/centres/:id — single-centre drill-down.
router.get('/centres/:id', (req, res, next) => {
  const db = getDb();
  const centre = db.centres.find((c) => c.id === req.params.id);
  if (!centre) return next(new ApiError(404, 'NOT_FOUND', 'Procurement centre not found.'));
  const requests = db.requests
    .filter((r) => r.centreId === centre.id)
    .sort((a, b) => b.seq - a.seq)
    .slice(0, 50)
    .map((r) => presentRequest(db, r, { withFarmer: true }));
  res.json({
    centre: presentCentre(db, centre),
    stats: summary(db, centre.id),
    alerts: centreAlerts(db, centre.id),
    recentRequests: requests,
  });
});

export default router;
