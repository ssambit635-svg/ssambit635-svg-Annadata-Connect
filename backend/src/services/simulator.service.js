// Procurement Simulator — deterministic what-if planning service.
//
// The simulator is a planning aid, not a forecasting model. Every projection is
// derived from the same data the live dashboards already use: current centre
// capacity and storage, the live queue, per-centre processing rate, operating
// hours, and recorded arrival history (request creation dates). No machine
// learning, no invented future data — the authority can sanity-check "what if"
// scenarios before they happen, and the UI always says so.
//
// The service is pure: it reads the db passed in and never writes to the store.

import { presentCentre } from '../utils/present.js';
import { summary } from './queue.service.js';

// Storage utilization bands — kept in step with queue.service.centreAlerts
// (75% high, 90% critical) so the simulator and live alerts tell one story.
export const BAND_HIGH_PCT = 75;
export const BAND_CRITICAL_PCT = 90;

const HISTORY_WINDOW_DAYS = 30;
const DEFAULT_OPERATING_MINUTES = 540; // 9h — only when hours cannot be parsed

function dayKeyOf(isoString) {
  const d = new Date(isoString);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function todayKey() {
  return dayKeyOf(new Date().toISOString());
}

function parseOperatingMinutes(operatingHours) {
  if (!operatingHours) return DEFAULT_OPERATING_MINUTES;
  const m = String(operatingHours).match(/(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/);
  if (!m) return DEFAULT_OPERATING_MINUTES;
  const start = Number(m[1]) * 60 + Number(m[2]);
  const end = Number(m[3]) * 60 + Number(m[4]);
  const minutes = end - start;
  return minutes > 0 ? minutes : DEFAULT_OPERATING_MINUTES;
}

// Recorded arrivals: today's counts per centre plus per-day history for the
// previous HISTORY_WINDOW_DAYS (excluding today, which is still in progress).
function buildArrivalHistory(db) {
  const today = todayKey();
  const oldest = Date.now() - HISTORY_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  const todayByCentre = {};
  const perDay = {}; // dayKey -> { centreId: count }
  for (const r of db.requests) {
    const created = new Date(r.createdAt).getTime();
    if (created < oldest) continue;
    const key = dayKeyOf(r.createdAt);
    if (key === today) {
      todayByCentre[r.centreId] = (todayByCentre[r.centreId] || 0) + 1;
      continue;
    }
    perDay[key] ??= {};
    perDay[key][r.centreId] = (perDay[key][r.centreId] || 0) + 1;
  }
  // Per-centre totals across the recorded full days.
  const daysByCentre = {};
  let totalArrivals = 0;
  for (const [day, rows] of Object.entries(perDay)) {
    for (const [centreId, count] of Object.entries(rows)) {
      daysByCentre[centreId] ??= { sum: 0, days: 0 };
      daysByCentre[centreId].sum += count;
      daysByCentre[centreId].days += 1;
      totalArrivals += count;
    }
  }
  const historyDays = Object.keys(perDay).length;
  return {
    historyDays,
    todayByCentre,
    daysByCentre,
    avgDailyArrivalsDistrict: historyDays > 0 ? Math.round(totalArrivals / historyDays) : 0,
    todayArrivalsDistrict: Object.values(todayByCentre).reduce((a, b) => a + b, 0),
    historyFrom: Object.keys(perDay).sort()[0] || null,
    historyTo: Object.keys(perDay).sort().at(-1) || null,
  };
}

// Average booked lot (quintals per farmer) — centre-specific, then crop at the
// centre, then crop district-wide, then any crop district-wide.
function avgLotQuintals(db, centreId, cropId) {
  const pick = (rows, crop) => {
    let n = 0;
    let sum = 0;
    for (const r of rows) {
      if (crop && r.cropId !== crop) continue;
      n += 1;
      sum += r.quantityQuintals;
    }
    return n ? sum / n : null;
  };
  const centreRows = centreId ? db.requests.filter((r) => r.centreId === centreId) : db.requests;
  if (cropId) {
    return pick(centreRows, cropId) ?? pick(db.requests, cropId) ?? pick(db.requests, null) ?? 20;
  }
  return pick(centreRows, null) ?? pick(db.requests, null) ?? 20;
}

// Largest-remainder integer allocation so per-centre slices always add up to
// the district-wide total the authority entered.
function allocate(total, weights) {
  if (total <= 0 || weights.length === 0) return weights.map(() => 0);
  const raw = weights.map((w) => total * w);
  const out = raw.map((r) => Math.floor(r));
  let remainder = total - out.reduce((a, b) => a + b, 0);
  const order = raw
    .map((r, i) => ({ i, frac: r - Math.floor(r) }))
    .sort((a, b) => b.frac - a.frac);
  for (let k = 0; k < remainder && k < order.length; k += 1) out[order[k].i] += 1;
  return out;
}

function utilizationLevel(stock, capacity) {
  if (stock > capacity) return 'OVERLOADED';
  if (capacity > 0 && stock * 100 >= capacity * BAND_CRITICAL_PCT) return 'CRITICAL';
  if (capacity > 0 && stock * 100 >= capacity * BAND_HIGH_PCT) return 'HIGH';
  return 'OK';
}

function round1(n) {
  return Math.round(n * 10) / 10;
}

// Builds the district-wide scenario projection. `input` is validated by the
// route before it reaches this function.
export function runScenario(db, input) {
  const simDate = input.simulationDate || todayKey();
  const simulatingToday = simDate === todayKey();
  const history = buildArrivalHistory(db);
  const crop = input.cropId ? db.crops.find((c) => c.id === input.cropId) : null;

  const farm = Number(input.additionalFarmers) || 0;
  const qty = Number(input.additionalQuantityQuintal) || 0;
  const pct = Number(input.arrivalsPct) || 0;

  const centres = db.centres.map((c) => {
    const s = summary(db, c.id);
    return {
      centre: c,
      open: c.status === 'OPEN',
      summary: s,
      opMinutes: parseOperatingMinutes(c.operatingHours),
      // Baseline daily arrivals: live today's arrivals when simulating today;
      // the recorded per-day average once ≥2 full days of history exist.
      baseline: 0,
      baselineSource: 'today',
    };
  });

  // Baseline arrivals per centre.
  for (const row of centres) {
    const todayCount = history.todayByCentre[row.centre.id] || 0;
    const hist = history.daysByCentre[row.centre.id];
    if (!simulatingToday && hist && hist.days >= 2) {
      row.baseline = Math.round(hist.sum / hist.days);
      row.baselineSource = 'history';
    } else {
      row.baseline = todayCount;
      row.baselineSource = 'today';
    }
  }

  // District demand weights over intake-open centres. Centres with no recorded
  // arrivals still receive a tiny floor so their spare capacity shows up in the
  // scenario instead of being invisible to the maths.
  const openRows = centres.filter((r) => r.open);
  const weightSum = openRows.reduce((a, r) => a + (r.baseline + 1), 0);
  for (const row of centres) row.weight = row.open && weightSum > 0 ? (row.baseline + 1) / weightSum : 0;

  const extraFarmers = allocate(farm, openRows.map((r) => r.weight));
  const extraQty = allocate(qty, openRows.map((r) => r.weight));
  openRows.forEach((r, i) => {
    r.extraFarmers = extraFarmers[i];
    r.extraQty = extraQty[i];
  });

  // Projected per-centre state.
  const projected = centres.map((row) => {
    const { centre, summary: s, open } = row;
    const intake = open;
    const lot = avgLotQuintals(db, centre.id, crop?.id || null);
    const boost = intake ? Math.round(row.baseline * (pct / 100)) : 0;
    const expectedArrivals = intake ? row.baseline + boost + row.extraFarmers : s.farmersToday;
    const farmerProduce = intake ? Math.round(row.extraFarmers * lot) : 0;
    const stockSim = centre.currentStockQuintals + farmerProduce + (intake ? row.extraQty : 0);
    const capacity = centre.capacityQuintals;
    const capacityPerDay = Math.max(1, Math.floor(row.opMinutes / centre.avgProcessingMinutesPerFarmer));
    const activeNow = s.waiting + s.called + s.processing;
    // Queue at close of the simulated day: everything the centre must still
    // serve (current backlog + the simulated day's arrivals) minus what its
    // processing rate and operating hours can clear in one day.
    const queueSim = intake ? Math.max(0, activeNow + expectedArrivals - capacityPerDay) : s.waiting;
    const utilizationRaw = (stockSim / capacity) * 100;
    const level = intake ? utilizationLevel(stockSim, capacity) : 'INTAKE_OFF';
    return {
      centre,
      intake,
      avgQuintalPerFarmer: round1(lot),
      dailyServiceCapacityFarmers: capacityPerDay,
      sharePct: Math.round(row.weight * 1000) / 10,
      current: {
        arrivals: s.farmersToday,
        queue: s.waiting,
        active: activeNow,
        servedToday: s.completed,
        stockQuintals: centre.currentStockQuintals,
        utilizationPct: Math.round((centre.currentStockQuintals / capacity) * 100),
        waitMinutes: Math.round(s.waiting * centre.avgProcessingMinutesPerFarmer),
      },
      simulated: {
        extraFarmers: intake ? row.extraFarmers : 0,
        extraQuantityQuintal: intake ? row.extraQty : 0,
        arrivals: expectedArrivals,
        queue: queueSim,
        stockQuintals: Math.round(stockSim * 10) / 10,
        utilizationPct: Math.round(utilizationRaw),
        waitMinutes: Math.round(queueSim * centre.avgProcessingMinutesPerFarmer),
        level,
        overloaded: stockSim > capacity,
        baselineSource: row.baselineSource,
      },
      suggested: null,
      redirectedAfter: null,
    };
  });

  // Suggested redistribution — greedy, storage-driven, matching live thresholds:
  // when projected storage exceeds capacity (OVERLOADED), move just enough load
  // to the open centre with the most remaining capacity to bring it to 90%.
  const atRisk = projected
    .filter((p) => p.intake && p.simulated.overloaded)
    .sort((a, b) => b.simulated.stockQuintals - a.simulated.stockQuintals);

  const runningStock = new Map(
    projected.filter((p) => p.intake).map((p) => [p.centre.id, p.simulated.stockQuintals])
  );

  const recommendations = [];
  for (const from of atRisk) {
    const fromLot = from.avgQuintalPerFarmer || 1;
    let needQ = from.simulated.stockQuintals - from.centre.capacityQuintals * 0.9;
    let steps = 0;
    while (needQ > 0.5 && steps < projected.length) {
      steps += 1;
      // Open centre with the most free capacity right now.
      let best = null;
      let bestFree = 0;
      for (const p of projected) {
        if (!p.intake || p.centre.id === from.centre.id) continue;
        const free = p.centre.capacityQuintals - (runningStock.get(p.centre.id) || 0);
        if (free > bestFree) {
          bestFree = free;
          best = p;
        }
      }
      if (!best) {
        recommendations.push({
          code: 'NO_SPARE_CAPACITY',
          fromCentreId: from.centre.id,
          fromNameEn: from.centre.nameEn,
          fromNameHi: from.centre.nameHi,
          toCentreId: null,
          quantityQuintal: Math.round(needQ),
          farmers: Math.max(1, Math.round(needQ / fromLot)),
        });
        break;
      }
      const moveQ = Math.min(needQ, bestFree);
      runningStock.set(best.centre.id, (runningStock.get(best.centre.id) || 0) + moveQ);
      recommendations.push({
        code: 'REDIRECT',
        fromCentreId: from.centre.id,
        fromNameEn: from.centre.nameEn,
        fromNameHi: from.centre.nameHi,
        toCentreId: best.centre.id,
        toNameEn: best.centre.nameEn,
        toNameHi: best.centre.nameHi,
        quantityQuintal: Math.round(moveQ),
        farmers: Math.max(1, Math.round(moveQ / fromLot)),
      });
      needQ -= moveQ;
    }
  }

  for (const p of projected) {
    const out = recommendations.filter((r) => r.fromCentreId === p.centre.id);
    const received = recommendations.filter((r) => r.toCentreId === p.centre.id);
    if (out.length > 0) {
      p.suggested = out.map((r) => ({
        toCentreId: r.toCentreId,
        toNameEn: r.toNameEn,
        toNameHi: r.toNameHi,
        quantityQuintal: r.quantityQuintal,
        farmers: r.farmers,
        code: r.code,
      }));
    }
    const net =
      p.simulated.stockQuintals -
      out.reduce((a, r) => a + r.quantityQuintal, 0) +
      received.reduce((a, r) => a + r.quantityQuintal, 0);
    p.redirectedAfter = {
      stockQuintals: Math.round(net * 10) / 10,
      utilizationPct: Math.round((net / p.centre.capacityQuintals) * 100),
    };
  }

  const openCentres = projected.filter((p) => p.intake);
  const totals = {
    farmersTodayDistrict: history.todayArrivalsDistrict,
    expectedArrivals: openCentres.reduce((a, p) => a + p.simulated.arrivals, 0),
    extraFarmersDistrict: openCentres.reduce((a, p) => a + p.simulated.extraFarmers, 0),
    currentStockQuintals:
      Math.round(projected.reduce((a, p) => a + p.current.stockQuintals, 0) * 10) / 10,
    capacityQuintals: projected.reduce((a, p) => a + p.centre.capacityQuintals, 0),
    projectedStockQuintals:
      Math.round(openCentres.reduce((a, p) => a + p.simulated.stockQuintals, 0) * 10) / 10,
    projectedUtilizationPct: Math.round(
      (openCentres.reduce((a, p) => a + p.simulated.stockQuintals, 0) /
        openCentres.reduce((a, p) => a + p.centre.capacityQuintals, 0)) *
        100
    ),
    overloadedCentres: projected.filter((p) => p.simulated.overloaded).length,
    criticalCentres: projected.filter((p) => p.simulated.level === 'CRITICAL').length,
    freeCapacityQuintals:
      Math.round(
        openCentres.reduce((a, p) => a + Math.max(0, p.centre.capacityQuintals - p.simulated.stockQuintals), 0) *
          10
      ) / 10,
    recommendedRedirectQuintals: recommendations.reduce((a, r) => a + r.quantityQuintal, 0),
    recommendedRedirectFarmers: recommendations.reduce((a, r) => a + r.farmers, 0),
  };

  return {
    district: db.users.find((u) => u.role === 'authority')?.district || 'Khordha',
    simulation: {
      date: simDate,
      simulatingToday,
      cropId: crop?.id || null,
      crop: crop ? { id: crop.id, nameEn: crop.nameEn, nameHi: crop.nameHi, nameOr: crop.nameOr } : null,
      additionalFarmers: farm,
      additionalQuantityQuintal: qty,
      arrivalsPct: pct,
    },
    baseline: {
      historyDays: history.historyDays,
      historyFrom: history.historyFrom,
      historyTo: history.historyTo,
      avgDailyArrivalsDistrict: history.avgDailyArrivalsDistrict,
      todayArrivalsDistrict: history.todayArrivalsDistrict,
    },
    totals,
    centres: projected.map((p) => ({
      centre: presentCentre(db, p.centre),
      intake: p.intake,
      avgQuintalPerFarmer: p.avgQuintalPerFarmer,
      dailyServiceCapacityFarmers: p.dailyServiceCapacityFarmers,
      current: p.current,
      simulated: p.simulated,
      suggested: p.suggested,
      redirectedAfter: p.redirectedAfter,
    })),
    recommendations,
  };
}
