import { distanceKm } from '../utils/geo.js';
import { waitingCount, estimatedWaitMinutes } from './queue.service.js';

// Rule used for comparing options: an assumed cost of moving one quintal one
// kilometre. Applied identically to every channel so MSP and market options are
// compared on the same footing. Deliberately a documented constant, not ML.
export const TRANSPORT_COST_PER_KM_PER_QUINTAL = 0.4;

// True "MSP buyer" options are computed from the existing government centres:
// every OPEN centre procures the selected crop at that crop's MSP. Private
// market buyers (type 'market') are listed in seed data with above-MSP rates.
function buildMspOptions(db, { crop, quantityQuintal, origin }) {
  return db.centres.map((centre) => {
    const distance = distanceKm(origin, { lat: centre.lat, lng: centre.lng });
    const queueCount = waitingCount(db, centre.id);
    const capacityPct = Math.round((centre.currentStockQuintals / centre.capacityQuintals) * 100);
    const remaining = centre.capacityQuintals - centre.currentStockQuintals;
    const waitMin = estimatedWaitMinutes(db, centre.id, queueCount);
    const rate = crop.mspPerQuintal;

    const reasons = [];
    let eligible = true;
    if (centre.status !== 'OPEN') {
      eligible = false;
      reasons.push(centre.status === 'PAUSED' ? 'Intake paused' : 'Centre closed');
    }
    if (remaining < quantityQuintal) {
      eligible = false;
      reasons.push(`Only ${Math.max(remaining, 0)} q storage left`);
    }

    return {
      optionId: `msp:${centre.id}`,
      channel: 'MSP',
      buyerId: centre.id,
      nameEn: centre.nameEn,
      nameHi: centre.nameHi,
      nameOr: centre.nameOr,
      categoryEn: 'Government Procurement Centre',
      categoryHi: 'सरकारी खरीद केंद्र',
      categoryOr: 'ସରକାରୀ କ୍ରୟ କେନ୍ଦ୍ର',
      address: centre.address,
      distanceKm: Math.round(distance * 10) / 10,
      ratePerQuintal: rate,
      isPremium: false,
      premiumPercent: 0,
      grossValueInr: Math.round(rate * quantityQuintal * 100) / 100,
      queueCount,
      estimatedWaitMinutes: waitMin,
      capacityPct,
      remainingQuintal: Math.max(remaining, 0),
      paymentEn: 'MSP — paid to bank account after grading & completion',
      paymentHi: 'MSP — ग्रेडिंग और पूर्णता के बाद बैंक खाते में भुगतान',
      paymentOr: 'MSP — ଗ୍ରେଡିଂ ଓ ସମାପ୍ତି ପରେ ବ୍ୟାଙ୍କ ଖାତାରେ ଦେୟ',
      eligible,
      ineligibilityReasons: reasons,
      flags: [],
    };
  });
}

function buildMarketOptions(db, { crop, quantityQuintal, origin }) {
  return db.buyers
    .filter((b) => b.crops.some((line) => line.cropId === crop.id))
    .map((buyer) => {
      const line = buyer.crops.find((l) => l.cropId === crop.id);
      const distance = distanceKm(origin, { lat: buyer.lat, lng: buyer.lng });
      const remaining = line.intakeCapacityQuintal - (line.committedQuintal || 0);
      const reasons = [];
      let eligible = true;
      if (buyer.status !== 'OPEN') {
        eligible = false;
        reasons.push(buyer.status === 'CLOSED' ? 'Buyer currently closed' : 'Buyer paused');
      }
      if (remaining < quantityQuintal) {
        eligible = false;
        reasons.push(`Buyer can take only ${Math.max(remaining, 0)} q right now`);
      }

      const rate = line.offerPerQuintal;
      const premium = Math.round(((rate - crop.mspPerQuintal) / crop.mspPerQuintal) * 100);

      return {
        optionId: `market:${buyer.id}`,
        channel: 'MARKET',
        buyerId: buyer.id,
        nameEn: buyer.nameEn,
        nameHi: buyer.nameHi,
        nameOr: buyer.nameOr,
        categoryEn: buyer.categoryEn,
        categoryHi: buyer.categoryHi,
        categoryOr: buyer.categoryOr,
        address: buyer.address,
        distanceKm: Math.round(distance * 10) / 10,
        ratePerQuintal: rate,
        isPremium: rate > crop.mspPerQuintal,
        premiumPercent: premium,
        grossValueInr: Math.round(rate * quantityQuintal * 100) / 100,
        remainingQuintal: Math.max(remaining, 0),
        operatingHours: buyer.operatingHours,
        settlementEn: buyer.settlementEn,
        settlementHi: buyer.settlementHi,
        settlementOr: buyer.settlementOr,
        noteEn: buyer.noteEn || '',
        noteHi: buyer.noteHi || '',
        noteOr: buyer.noteOr || '',
        eligible,
        ineligibilityReasons: reasons,
        flags: [],
      };
    });
}

/**
 * Compare every buyer that will take `quantityQuintal` of `crop` right now.
 * Options span two channels:
 *   - MSP  : the government procurement centres (guaranteed MSP price, queue & payout later)
 *   - MARKET: private market / FPO buyers paying above-MSP, settled on the spot
 *
 * Ranking is transparent: every option gets a net value (gross value minus an
 * estimated transport cost), then options are sorted by net value, ties broken
 * by lower distance. Flags tag "best value", the cheapest-reliable MSP centre,
 * and the top-paying market buyer. Deliberately rule-based — no ML is claimed.
 */
export function sellingOptions(db, { farmer, cropId, quantityQuintal }) {
  const crop = db.crops.find((c) => c.id === cropId);
  if (!crop) {
    return { error: 'Crop not found.' };
  }
  const village = db.villages.find((v) => v.id === farmer.villageId);
  const origin = village || { lat: 20.2961, lng: 85.8245 }; // fallback: Bhubaneswar

  const msp = buildMspOptions(db, { crop, quantityQuintal, origin });
  const market = buildMarketOptions(db, { crop, quantityQuintal, origin });
  const all = [...msp, ...market];
  const eligible = all.filter((o) => o.eligible);
  const ineligible = all.filter((o) => !o.eligible);

  const transportPerQtyKm = TRANSPORT_COST_PER_KM_PER_QUINTAL * quantityQuintal;
  for (const o of eligible) {
    o.transportCostInr = Math.round(o.distanceKm * transportPerQtyKm * 100) / 100;
    o.netValueInr = Math.round((o.grossValueInr - o.transportCostInr) * 100) / 100;
    o.flags = [];
  }

  // Sort by net value desc, ties by distance asc, then by rate desc.
  eligible.sort((a, b) => {
    if (b.netValueInr !== a.netValueInr) return b.netValueInr - a.netValueInr;
    if (a.distanceKm !== b.distanceKm) return a.distanceKm - b.distanceKm;
    return b.ratePerQuintal - a.ratePerQuintal;
  });

  if (eligible.length) {
    eligible[0].flags.push('BEST_OVERALL');
    // Cheapest-to-reach MSP option that is not already flagged best overall.
    const mspSorted = eligible
      .filter((o) => o.channel === 'MSP')
      .sort((a, b) => a.estimatedWaitMinutes - b.estimatedWaitMinutes || a.distanceKm - b.distanceKm);
    if (mspSorted.length && !mspSorted[0].flags.includes('BEST_OVERALL')) {
      mspSorted[0].flags.push('BEST_MSP');
    }
    // Top-paying market buyer among several (only when it adds value to flag).
    const marketEligible = eligible.filter((o) => o.channel === 'MARKET');
    if (marketEligible.length > 1) {
      const top = [...marketEligible].sort((a, b) => b.ratePerQuintal - a.ratePerQuintal)[0];
      if (!top.flags.includes('BEST_OVERALL')) top.flags.push('BEST_PRICE');
    }
  }

  const best = eligible[0] || null;
  const basisEn =
    `Options compared by net amount after an estimated transport cost of ₹${TRANSPORT_COST_PER_KM_PER_QUINTAL} per km per quintal. ` +
    `Ranked by highest net value (₹${formatLakhish(best ? best.netValueInr : 0)} for the best option), ties by shorter distance. ` +
    'Government MSP centres pay the guaranteed MSP after grading; market buyers pay above MSP on the spot.';
  const basisHi =
    `विकल्पों की तुलना अनुमानित परिवहन लागत ₹${TRANSPORT_COST_PER_KM_PER_QUINTAL} प्रति किमी प्रति क्विंटल घटाकर की गई। ` +
    'सर्वोच्च शुद्ध राशि के अनुसार क्रम, दूरी से टाई-ब्रेक। सरकारी MSP केंद्र ग्रेडिंग के बाद तय MSP देते हैं; बाज़ार खरीददार तुरंत ऊपरी दर देते हैं।';
  const basisOr =
    `ପ୍ରତି କି.ମି. ପ୍ରତି କ୍ୱିଣ୍ଟାଲ ₹${TRANSPORT_COST_PER_KM_PER_QUINTAL} ଆନୁମାନିକ ପରିବହନ ଖର୍ଚ୍ଚ ବାଦ୍ ଦେଇ ବିକଳ୍ପ ତୁଳନା କରାଯାଇଛି। ` +
    'ସର୍ବାଧିକ ନିଟ୍ ରାଶି ଅନୁସାରେ କ୍ରମ, ସମାନ ହେଲେ କମ୍ ଦୂରତା। ସରକାରୀ MSP କେନ୍ଦ୍ର ଗ୍ରେଡିଂ ପରେ ନିଶ୍ଚିତ MSP ଦିଅନ୍ତି; ବଜାର କ୍ରେତା ତତ୍‌କ୍ଷଣାତ୍ ଅଧିକ ଦର ଦିଅନ୍ତି।';

  return {
    mspRatePerQuintal: crop.mspPerQuintal,
    options: eligible,
    unavailable: ineligible,
    recommended: best,
    bestValueInr: best ? best.netValueInr : 0,
    basisEn,
    basisHi,
    basisOr,
    summaryEn: makeSummaryEn(crop, quantityQuintal, best),
    summaryHi: makeSummaryHi(crop, quantityQuintal, best),
    summaryOr: makeSummaryOr(crop, quantityQuintal, best),
  };
}

function formatLakhish(n) {
  return Number(n).toLocaleString('en-IN');
}

function makeSummaryEn(crop, qty, best) {
  if (!best) return `No buyer can accept ${qty} q of ${crop.nameEn} right now. Try a smaller quantity.`;
  const label = best.channel === 'MARKET' ? `${best.nameEn} (${best.categoryEn})` : best.nameEn;
  return `Best option: ${label} at ₹${best.ratePerQuintal}/q — an estimated ₹${formatLakhish(best.netValueInr)} in hand for ${qty} q after transport.`;
}

function makeSummaryHi(crop, qty, best) {
  if (!best) return `अभी ${qty} क्विंटल ${crop.nameHi} कोई खरीददार स्वीकार नहीं कर सकता। कम मात्रा आज़माएँ।`;
  const label = best.channel === 'MARKET' ? `${best.nameHi} (${best.categoryHi})` : best.nameHi;
  return `सर्वोत्तम: ${label} — ₹${best.ratePerQuintal}/क्वि, परिवहन के बाद ${qty} क्विंटल के लिए अनुमानित ₹${formatLakhish(best.netValueInr)} प्राप्त।`;
}

function makeSummaryOr(crop, qty, best) {
  const cropName = crop.nameOr || crop.nameEn;
  if (!best) return `ଏବେ ${qty} କ୍ୱିଣ୍ଟାଲ ${cropName} କୌଣସି କ୍ରେତା ନେଇପାରିବେ ନାହିଁ। କମ୍ ପରିମାଣ ଚେଷ୍ଟା କରନ୍ତୁ।`;
  const name = best.nameOr || best.nameEn;
  const label = best.channel === 'MARKET' ? `${name} (${best.categoryOr || best.categoryEn})` : name;
  return `ସର୍ବୋତ୍ତମ ବିକଳ୍ପ: ${label} — ₹${best.ratePerQuintal}/କ୍ୱି, ପରିବହନ ପରେ ${qty} କ୍ୱିଣ୍ଟାଲ ପାଇଁ ଆନୁମାନିକ ₹${formatLakhish(best.netValueInr)} ହାତରେ।`;
}

// Is this farmer free to commit a new sale right now (no active MSP request and
// no live market booking)? Used to keep "one sale at a time" across both channels.
export function hasActiveSale(db, farmerId) {
  const activeRequest = db.requests.some(
    (r) => r.farmerId === farmerId && ['WAITING', 'CALLED', 'PROCESSING'].includes(r.status)
  );
  const activeBooking = db.saleBookings.some(
    (b) => b.farmerId === farmerId && b.status === 'CONFIRMED'
  );
  return { activeRequest, activeBooking };
}
