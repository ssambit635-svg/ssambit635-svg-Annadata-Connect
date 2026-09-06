import { Router } from 'express';
import { getDb } from '../db/store.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { ApiError } from '../middleware/error.js';
import { summary, centreAlerts } from '../services/queue.service.js';
import { runScenario } from '../services/simulator.service.js';
import { requireNumber } from '../middleware/validate.js';
import { presentCentre, presentRequest } from '../utils/present.js';

const router = Router();
router.use(authenticate, authorize('authority'));

// POST /api/authority/simulator — run a what-if procurement scenario.
// Pure planning endpoint: it projects current centre state + scenario inputs
// and never writes anything to the store.
router.post('/simulator', (req, res, next) => {
  try {
    const db = getDb();
    const body = req.body || {};
    const additionalFarmers = Math.round(requireNumber(body.additionalFarmers ?? 0, 'additionalFarmers', { min: 0, max: 100000 }));
    const additionalQuantityQuintal = Math.round(requireNumber(body.additionalQuantityQuintal ?? 0, 'additionalQuantityQuintal', { min: 0, max: 100000000 }));
    const arrivalsPct = requireNumber(body.arrivalsPct ?? 0, 'arrivalsPct', { min: 0, max: 300 });
    const cropId = body.cropId ? String(body.cropId) : null;
    if (cropId && !db.crops.some((c) => c.id === cropId)) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'Unknown crop.');
    }
    let simulationDate = null;
    if (body.simulationDate) {
      const m = String(body.simulationDate).match(/^(\d{4})-(\d{2})-(\d{2})$/);
      const probe = m ? new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]))) : null;
      if (
        !probe ||
        Number.isNaN(probe.getTime()) ||
        probe.getUTCFullYear() !== Number(m[1]) ||
        probe.getUTCMonth() !== Number(m[2]) - 1 ||
        probe.getUTCDate() !== Number(m[3]) ||
        probe.getUTCFullYear() < 2020 ||
        probe.getUTCFullYear() > 2100
      ) {
        throw new ApiError(400, 'VALIDATION_ERROR', 'simulationDate must be a valid YYYY-MM-DD date.');
      }
      simulationDate = String(body.simulationDate);
    }
    res.json(
      runScenario(db, {
        additionalFarmers,
        additionalQuantityQuintal,
        arrivalsPct,
        cropId,
        simulationDate,
      })
    );
  } catch (e) {
    next(e);
  }
});

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
