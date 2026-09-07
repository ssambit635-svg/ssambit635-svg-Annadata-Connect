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

// IST wall-clock date for trend bucketing (Asia/Kolkata is UTC+5:30).
const istDay = (iso) => {
  const d = new Date(iso);
  return new Date(d.getTime() + 5.5 * 3600 * 1000).toISOString().slice(0, 10);
};

const districtNames = (db) => [...new Set(db.centres.map((c) => c.district))].sort();

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
// Accepts ?district=Name so the state monitor can drill into any district.
router.get('/overview', (req, res) => {
  const db = getDb();
  const requested = req.query.district ? String(req.query.district) : null;
  const homeDistrict = req.user.district || 'Khordha';
  const district = requested || homeDistrict;
  const districtCentres = db.centres.filter((c) => c.district === district);
  if (districtCentres.length === 0) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: `No procurement centres found for district ${district}.` } });
  }
  const centres = districtCentres.map((c) => {
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
    procuredValueInr: centres.reduce((a, c) => a + c.procuredValueInr, 0),
    paidValueInr: centres.reduce((a, c) => a + c.paidValueInr, 0),
    openCentres: centres.filter((c) => c.status === 'OPEN').length,
    totalCentres: centres.length,
    alerts: centres.reduce((a, c) => a + c.alerts.length, 0),
  };
  res.json({ district, homeDistrict, districts: districtNames(db), totals, centres });
});

// GET /api/authority/state-overview — whole-state command view for the
// authority monitor: totals, per-district rows, a 7-day procurement trend,
// crop mix and the live pipeline (flowchart) stage counts.
router.get('/state-overview', (req, res) => {
  const db = getDb();
  const today = istDay(new Date().toISOString());

  const centreRows = db.centres.map((c) => {
    const s = summary(db, c.id);
    const procured = db.requests
      .filter((r) => r.centreId === c.id && r.status === 'COMPLETED')
      .reduce((sum, r) => sum + r.quantityQuintals, 0);
    const value = db.requests
      .filter((r) => r.centreId === c.id && r.payment)
      .reduce((sum, r) => sum + r.payment.amountInr, 0);
    const paid = db.requests
      .filter((r) => r.centreId === c.id && r.payment && r.payment.status === 'PAID')
      .reduce((sum, r) => sum + r.payment.amountInr, 0);
    return {
      centre: presentCentre(db, c),
      stats: s,
      procuredQuintals: Math.round(procured * 100) / 100,
      procuredValueInr: Math.round(value),
      paidValueInr: Math.round(paid),
      alerts: centreAlerts(db, c.id),
    };
  });

  const districts = districtNames(db).map((name) => {
    const rows = centreRows.filter((r) => r.centre.district === name);
    const capacity = rows.reduce((a, r) => a + r.centre.capacityQuintals, 0);
    const stock = rows.reduce((a, r) => a + r.centre.currentStockQuintals, 0);
    return {
      name,
      totals: {
        farmersToday: rows.reduce((a, r) => a + r.stats.farmersToday, 0),
        waiting: rows.reduce((a, r) => a + r.stats.waiting, 0),
        completed: rows.reduce((a, r) => a + r.stats.completed, 0),
        procuredQuintals: Math.round(rows.reduce((a, r) => a + r.procuredQuintals, 0) * 100) / 100,
        procuredValueInr: rows.reduce((a, r) => a + r.procuredValueInr, 0),
        paidValueInr: rows.reduce((a, r) => a + r.paidValueInr, 0),
        openCentres: rows.filter((r) => r.centre.status === 'OPEN').length,
        totalCentres: rows.length,
        alerts: rows.reduce((a, r) => a + r.alerts.length, 0),
      },
      capacityQuintals: capacity,
      stockQuintals: stock,
      capacityPct: capacity ? Math.round((stock / capacity) * 1000) / 10 : 0,
    };
  });

  const trend = [];
  for (let back = 6; back >= 0; back -= 1) {
    const d = new Date(Date.now() - back * 86400000);
    const day = istDay(d.toISOString());
    const dayReqs = db.requests.filter((r) => istDay(r.createdAt) === day);
    const completed = dayReqs.filter((r) => r.status === 'COMPLETED');
    trend.push({
      date: day,
      label: d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }),
      farmers: new Set(dayReqs.map((r) => r.farmerId)).size,
      quintals: Math.round(completed.reduce((a, r) => a + r.quantityQuintals, 0) * 100) / 100,
      valueInr: completed.reduce((a, r) => a + (r.payment ? r.payment.amountInr : 0), 0),
      isToday: day === today,
    });
  }

  const cropMix = db.crops.map((c) => {
    const rows = db.requests.filter((r) => r.cropId === c.id && r.status === 'COMPLETED');
    const quintals = Math.round(rows.reduce((a, r) => a + r.quantityQuintals, 0) * 100) / 100;
    const valueInr = rows.reduce((a, r) => a + (r.payment ? r.payment.amountInr : 0), 0);
    return { crop: { id: c.id, nameEn: c.nameEn, nameHi: c.nameHi, nameOr: c.nameOr }, quintals, valueInr };
  }).filter((m) => m.quintals > 0);

  const pipeline = {
    waiting: db.requests.filter((r) => r.status === 'WAITING' && istDay(r.createdAt) === today).length,
    called: db.requests.filter((r) => r.status === 'CALLED' && istDay(r.createdAt) === today).length,
    processing: db.requests.filter((r) => r.status === 'PROCESSING' && istDay(r.createdAt) === today).length,
    completedToday: db.requests.filter((r) => r.status === 'COMPLETED' && istDay(r.createdAt) === today).length,
    rejectedToday: db.requests.filter((r) => r.status === 'REJECTED' && istDay(r.createdAt) === today).length,
  };

  const totals = {
    farmersToday: centreRows.reduce((a, r) => a + r.stats.farmersToday, 0),
    waiting: centreRows.reduce((a, r) => a + r.stats.waiting, 0),
    completed: centreRows.reduce((a, r) => a + r.stats.completed, 0),
    procuredQuintals: Math.round(centreRows.reduce((a, r) => a + r.procuredQuintals, 0) * 100) / 100,
    procuredValueInr: centreRows.reduce((a, r) => a + r.procuredValueInr, 0),
    paidValueInr: centreRows.reduce((a, r) => a + r.paidValueInr, 0),
    openCentres: centreRows.filter((r) => r.centre.status === 'OPEN').length,
    totalCentres: centreRows.length,
    alerts: centreRows.reduce((a, r) => a + r.alerts.length, 0),
    districts: districts.length,
    registeredFarmers: db.users.filter((u) => u.role === 'farmer').length,
  };

  res.json({
    state: 'Odisha',
    asOf: new Date().toISOString(),
    homeDistrict: req.user.district || null,
    totals,
    districts,
    trend,
    cropMix,
    pipeline,
  });
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
