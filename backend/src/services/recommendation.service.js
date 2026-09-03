import { distanceKm } from '../utils/geo.js';
import { waitingCount, estimatedWaitMinutes, centreQueue } from './queue.service.js';

/**
 * Transparent, rule-based centre recommendation.
 *
 * A centre is eligible when it is OPEN and has enough remaining storage
 * for the requested quantity. Eligible centres are scored on:
 *   - distance from the farmer's village (lower is better)
 *   - estimated wait, driven by current queue length × centre processing speed
 *   - filling the least-utilized centre balances demand
 * Final score = 0.45 * wait + 0.30 * distance + 0.25 * capacity utilization
 * (all three normalized to 0..1 across eligible centres).
 *
 * This is deliberately rule-based — no ML is claimed or implied.
 */
export function recommendCentres(db, { farmer, cropId, quantityQuintals }) {
  const village = db.villages.find((v) => v.id === farmer.villageId);
  const origin = village || { lat: 20.2961, lng: 85.8245 }; // fallback: Bhubaneswar

  const evaluated = db.centres.map((centre) => {
    const distance = distanceKm(origin, { lat: centre.lat, lng: centre.lng });
    const queueCount = waitingCount(db, centre.id);
    const capacityPct = Math.round((centre.currentStockQuintals / centre.capacityQuintals) * 100);
    const remainingQuintals = centre.capacityQuintals - centre.currentStockQuintals;
    const waitMin = estimatedWaitMinutes(db, centre.id, queueCount);
    const reasons = [];
    let eligible = true;

    if (centre.status !== 'OPEN') {
      eligible = false;
      reasons.push(centre.status === 'PAUSED' ? 'Intake paused' : 'Centre closed');
    }
    if (remainingQuintals < quantityQuintals) {
      eligible = false;
      reasons.push(`Only ${Math.max(remainingQuintals, 0)} q storage left`);
    }

    // Human-readable strengths for the UI.
    const strengths = [];
    if (queueCount === 0) strengths.push('No queue right now');
    if (capacityPct < 50) strengths.push('Plenty of storage available');
    if (distance < 5) strengths.push('Very close to your village');

    return {
      centreId: centre.id,
      nameEn: centre.nameEn,
      nameHi: centre.nameHi,
      distanceKm: Math.round(distance * 10) / 10,
      queueCount,
      capacityPct,
      estimatedWaitMinutes: waitMin,
      processingMinutesPerFarmer: centre.avgProcessingMinutesPerFarmer,
      status: centre.status,
      eligible,
      ineligibilityReasons: reasons,
      strengths,
      score: null,
    };
  });

  const eligible = evaluated.filter((e) => e.eligible);
  if (eligible.length) {
    const maxWait = Math.max(...eligible.map((e) => e.estimatedWaitMinutes), 1);
    const maxDist = Math.max(...eligible.map((e) => e.distanceKm), 1);
    for (const e of eligible) {
      const normWait = e.estimatedWaitMinutes / maxWait;
      const normDist = e.distanceKm / maxDist;
      const normCap = e.capacityPct / 100;
      e.score = Math.round((0.45 * normWait + 0.3 * normDist + 0.25 * normCap) * 1000) / 1000;
    }
    eligible.sort((a, b) => a.score - b.score);
  }

  return {
    recommended: eligible[0] || null,
    alternatives: eligible.slice(1),
    ineligible: evaluated.filter((e) => !e.eligible),
    basis:
      'Rule-based: 45% estimated waiting time, 30% distance from your village, 25% centre storage utilization. ' +
      'Only OPEN centres with enough storage for your quantity are eligible.',
  };
}
