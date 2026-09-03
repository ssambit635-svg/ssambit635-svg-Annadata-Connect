import { getDb } from '../db/store.js';
import { ApiError } from '../middleware/error.js';

// Queue is the set of requests at a centre that still need serving:
// CALLED > PROCESSING are "currently at counter", WAITING are in line behind them.
export const ACTIVE_STATUSES = ['WAITING', 'CALLED', 'PROCESSING'];
export const REQUEST_STATUSES = ['PENDING', 'WAITING', 'CALLED', 'PROCESSING', 'COMPLETED', 'CANCELLED', 'REJECTED'];

export function centreQueue(db, centreId) {
  return db.requests
    .filter((r) => r.centreId === centreId && ACTIVE_STATUSES.includes(r.status))
    .sort((a, b) => a.seq - b.seq);
}

export function waitingCount(db, centreId) {
  return db.requests.filter((r) => r.centreId === centreId && r.status === 'WAITING').length;
}

export function estimatedWaitMinutes(db, centreId, aheadCount) {
  const centre = db.centres.find((c) => c.id === centreId);
  if (!centre) throw new ApiError(404, 'NOT_FOUND', 'Centre not found.');
  return Math.round(aheadCount * centre.avgProcessingMinutesPerFarmer);
}

// Full queue snapshot for one farmer's request.
export function queueSnapshot(db, request) {
  const queue = centreQueue(db, request.centreId);
  const idx = queue.findIndex((r) => r.id === request.id);
  const centre = db.centres.find((c) => c.id === request.centreId);

  // Finished requests are not in the queue anymore.
  if (idx === -1) {
    return {
      inQueue: false,
      position: null,
      aheadCount: 0,
      estimatedWaitMinutes: 0,
      centreSummary: summary(db, request.centreId),
      centreStatus: centre?.status || 'OPEN',
    };
  }
  const aheadCount = idx; // everyone strictly ahead in seq order
  return {
    inQueue: true,
    position: idx + 1,
    aheadCount,
    estimatedWaitMinutes: estimatedWaitMinutes(db, request.centreId, aheadCount),
    centreSummary: summary(db, request.centreId),
    centreStatus: centre.status,
  };
}

export function isToday(isoString) {
  const d = new Date(isoString);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

export function summary(db, centreId) {
  const todays = db.requests.filter((r) => r.centreId === centreId && isToday(r.createdAt));
  const centre = db.centres.find((c) => c.id === centreId);
  return {
    farmersToday: todays.length,
    waiting: todays.filter((r) => r.status === 'WAITING').length,
    called: todays.filter((r) => r.status === 'CALLED').length,
    processing: todays.filter((r) => r.status === 'PROCESSING').length,
    completed: todays.filter((r) => r.status === 'COMPLETED').length,
    rejected: todays.filter((r) => r.status === 'REJECTED').length,
    cancelled: todays.filter((r) => r.status === 'CANCELLED').length,
    capacityPct: centre ? Math.round((centre.currentStockQuintals / centre.capacityQuintals) * 100) : null,
  };
}

// Rule-based alerts so dashboards highlight congestion without inventing data.
export function centreAlerts(db, centreId) {
  const s = summary(db, centreId);
  const centre = db.centres.find((c) => c.id === centreId);
  const alerts = [];
  if (centre.status !== 'OPEN') {
    alerts.push({ level: 'info', code: 'CENTRE_NOT_OPEN', messageEn: `Centre is currently ${centre.status}.`, messageHi: `केंद्र वर्तमान में ${centre.status === 'PAUSED' ? 'ठप' : 'बंद'} है।` });
  }
  if (s.capacityPct >= 90) {
    alerts.push({ level: 'critical', code: 'CAPACITY_CRITICAL', messageEn: `Storage ${s.capacityPct}% full. New intake may stop soon.`, messageHi: `भंडारण ${s.capacityPct}% भरा हुआ है। नई खरीद जल्द रुक सकती है।` });
  } else if (s.capacityPct >= 75) {
    alerts.push({ level: 'warning', code: 'CAPACITY_HIGH', messageEn: `Storage ${s.capacityPct}% full.`, messageHi: `भंडारण ${s.capacityPct}% भरा हुआ है।` });
  }
  const estMin = estimatedWaitMinutes(db, centreId, s.waiting);
  if (s.waiting >= 10) {
    alerts.push({ level: 'warning', code: 'QUEUE_LONG', messageEn: `${s.waiting} farmers waiting (~${estMin} min).`, messageHi: `${s.waiting} किसान प्रतीक्षा में (~${estMin} मिनट)।` });
  }
  return alerts;
}
