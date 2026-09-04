// Filter + aggregate layer over the historical Agmarknet extract.
//
//   Historical CSV -> loadMarketPrices() -> (this file) -> routes -> frontend
//
// Everything here is a pure read over the in-memory rows: filtering by
// commodity / state / market / year, then rolling the monthly observations up
// into the shapes the UI needs (trend line, seasonality, market comparison,
// price benchmark). No ML, no forecasting - plain descriptive statistics on
// observed mandi data, so every number on screen can be traced to a CSV row.

import {
  loadMarketPrices,
  commodityLabel,
  MONTH_LABELS,
  CROP_COMMODITY,
} from '../data/marketPrices.js';

const round = (n, d = 0) => {
  const f = 10 ** d;
  return Math.round(n * f) / f;
};

const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

function median(xs) {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/** Share of observed monthly modal prices at or below `price` (0-100). */
function percentileOf(values, price) {
  if (!values.length) return null;
  const below = values.filter((v) => v <= price).length;
  return round((below / values.length) * 100);
}

function monthName(month) {
  return MONTH_LABELS[month - 1] || { en: String(month), hi: String(month) };
}

/** Arrival-weighted average, falling back to a plain mean when arrivals are 0. */
function weightedPrice(rows) {
  const w = rows.reduce((a, r) => a + r.arrivalsMt, 0);
  if (w > 0) return rows.reduce((a, r) => a + r.modalPrice * r.arrivalsMt, 0) / w;
  return mean(rows.map((r) => r.modalPrice));
}

// ---------------------------------------------------------------------------
// Filtering
// ---------------------------------------------------------------------------

/**
 * @param {object} q
 * @param {string} [q.commodity]  commodity slug, e.g. 'wheat'
 * @param {string} [q.cropId]     app crop id, e.g. 'crop-wheat' (mapped to a commodity)
 * @param {string} [q.state]      state name
 * @param {string} [q.market]     market/mandi name
 * @param {number} [q.fromYear]
 * @param {number} [q.toYear]
 */
export function filterRows(q = {}) {
  const { rows } = loadMarketPrices();
  const commodity = q.commodity || (q.cropId ? CROP_COMMODITY[q.cropId] : null);
  const state = q.state || null;
  const market = q.market || null;
  const fromYear = Number.isFinite(q.fromYear) ? q.fromYear : null;
  const toYear = Number.isFinite(q.toYear) ? q.toYear : null;

  return rows.filter((r) => {
    if (commodity && r.commodity !== commodity) return false;
    if (state && r.stateName !== state) return false;
    if (market && r.marketName !== market) return false;
    if (fromYear && r.year < fromYear) return false;
    if (toYear && r.year > toYear) return false;
    return true;
  });
}

// ---------------------------------------------------------------------------
// Catalogue / meta
// ---------------------------------------------------------------------------

export function catalogue() {
  const data = loadMarketPrices();
  const commodities = data.commodities.map((c) => {
    const rows = data.rows.filter((r) => r.commodity === c);
    const label = commodityLabel(c);
    return {
      commodity: c,
      nameEn: label.en,
      nameHi: label.hi,
      states: [...new Set(rows.map((r) => r.stateName))].sort(),
      markets: [...new Set(rows.map((r) => r.marketName))].sort(),
      months: rows.length,
      fromYear: Math.min(...rows.map((r) => r.year)),
      toYear: Math.max(...rows.map((r) => r.year)),
    };
  });

  return {
    source: data.meta,
    coverage: data.coverage,
    commodities,
    states: data.states,
    markets: data.markets,
    cropCommodityMap: CROP_COMMODITY,
    months: MONTH_LABELS.map((m, i) => ({ month: i + 1, nameEn: m.en, nameHi: m.hi })),
  };
}

// ---------------------------------------------------------------------------
// Monthly trend series
// ---------------------------------------------------------------------------

/**
 * Monthly modal-price series for the selected slice. When more than one market
 * matches, the months are combined with an arrival-weighted average so the
 * caller always gets one clean line to plot.
 */
export function priceSeries(q = {}) {
  const rows = filterRows(q);
  if (!rows.length) return emptySeries(q);

  const byPeriod = new Map();
  for (const r of rows) {
    if (!byPeriod.has(r.period)) byPeriod.set(r.period, []);
    byPeriod.get(r.period).push(r);
  }

  const points = [...byPeriod.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([period, group]) => {
      const [year, month] = period.split('-').map(Number);
      return {
        period,
        year,
        month,
        monthEn: monthName(month).en,
        monthHi: monthName(month).hi,
        modalPrice: round(weightedPrice(group), 2),
        minPrice: round(Math.min(...group.map((r) => r.minPrice)), 2),
        maxPrice: round(Math.max(...group.map((r) => r.maxPrice)), 2),
        arrivalsMt: round(group.reduce((a, r) => a + r.arrivalsMt, 0), 2),
        nObs: group.reduce((a, r) => a + r.nObs, 0),
        markets: group.length,
      };
    });

  const prices = points.map((p) => p.modalPrice);
  const first = points[0];
  const last = points[points.length - 1];
  const peak = points.reduce((a, p) => (p.modalPrice > a.modalPrice ? p : a), points[0]);
  const trough = points.reduce((a, p) => (p.modalPrice < a.modalPrice ? p : a), points[0]);
  const last12 = points.slice(-12);

  return {
    query: normalisedQuery(q, rows),
    points,
    summary: {
      months: points.length,
      dailyObservations: points.reduce((a, p) => a + p.nObs, 0),
      totalArrivalsMt: round(points.reduce((a, p) => a + p.arrivalsMt, 0), 2),
      averagePrice: round(mean(prices), 2),
      medianPrice: round(median(prices), 2),
      minPrice: round(Math.min(...prices), 2),
      maxPrice: round(Math.max(...prices), 2),
      latest: last,
      earliest: first,
      peak,
      trough,
      last12MonthAverage: round(mean(last12.map((p) => p.modalPrice)), 2),
      changePercent: first.modalPrice ? round(((last.modalPrice - first.modalPrice) / first.modalPrice) * 100, 1) : 0,
      volatilityPercent: mean(prices)
        ? round(((Math.max(...prices) - Math.min(...prices)) / mean(prices)) * 100, 1)
        : 0,
    },
  };
}

function normalisedQuery(q, rows) {
  const commodity = q.commodity || (q.cropId ? CROP_COMMODITY[q.cropId] : null) || rows[0]?.commodity || null;
  const label = commodity ? commodityLabel(commodity) : null;
  return {
    commodity,
    commodityEn: label ? label.en : null,
    commodityHi: label ? label.hi : null,
    state: q.state || null,
    market: q.market || null,
    fromYear: Number.isFinite(q.fromYear) ? q.fromYear : rows.length ? Math.min(...rows.map((r) => r.year)) : null,
    toYear: Number.isFinite(q.toYear) ? q.toYear : rows.length ? Math.max(...rows.map((r) => r.year)) : null,
  };
}

function emptySeries(q) {
  return { query: normalisedQuery(q, []), points: [], summary: null };
}

// ---------------------------------------------------------------------------
// Seasonality: which month of the year historically pays best
// ---------------------------------------------------------------------------

export function seasonality(q = {}) {
  const rows = filterRows(q);
  if (!rows.length) return { query: normalisedQuery(q, []), months: [], best: null, worst: null, spreadPercent: 0 };

  const overall = mean(rows.map((r) => r.modalPrice));
  const months = MONTH_LABELS.map((label, i) => {
    const month = i + 1;
    const group = rows.filter((r) => r.month === month);
    const avg = group.length ? mean(group.map((r) => r.modalPrice)) : null;
    return {
      month,
      nameEn: label.en,
      nameHi: label.hi,
      averagePrice: avg === null ? null : round(avg, 2),
      // 100 = the all-year average for this slice
      index: avg === null ? null : round((avg / overall) * 100, 1),
      arrivalsMt: round(group.reduce((a, r) => a + r.arrivalsMt, 0), 2),
      samples: group.length,
    };
  });

  const withData = months.filter((m) => m.averagePrice !== null);
  const best = withData.length ? withData.reduce((a, m) => (m.averagePrice > a.averagePrice ? m : a)) : null;
  const worst = withData.length ? withData.reduce((a, m) => (m.averagePrice < a.averagePrice ? m : a)) : null;

  return {
    query: normalisedQuery(q, rows),
    overallAveragePrice: round(overall, 2),
    months,
    best,
    worst,
    spreadPercent: best && worst && worst.averagePrice ? round(((best.averagePrice - worst.averagePrice) / worst.averagePrice) * 100, 1) : 0,
  };
}

// ---------------------------------------------------------------------------
// Market comparison: same commodity across the mandis in the extract
// ---------------------------------------------------------------------------

export function marketComparison(q = {}) {
  const rows = filterRows(q);
  if (!rows.length) return { query: normalisedQuery(q, []), markets: [] };

  const byMarket = new Map();
  for (const r of rows) {
    if (!byMarket.has(r.marketKey)) byMarket.set(r.marketKey, []);
    byMarket.get(r.marketKey).push(r);
  }

  const markets = [...byMarket.values()]
    .map((group) => {
      const sorted = [...group].sort((a, b) => a.period.localeCompare(b.period));
      const latest = sorted[sorted.length - 1];
      const prices = sorted.map((r) => r.modalPrice);
      const last12 = sorted.slice(-12).map((r) => r.modalPrice);
      return {
        marketName: latest.marketName,
        stateName: latest.stateName,
        district: latest.district,
        mandiId: latest.mandiId,
        months: sorted.length,
        averagePrice: round(mean(prices), 2),
        last12MonthAverage: round(mean(last12), 2),
        minPrice: round(Math.min(...prices), 2),
        maxPrice: round(Math.max(...prices), 2),
        latestPrice: latest.modalPrice,
        latestPeriod: latest.period,
        totalArrivalsMt: round(sorted.reduce((a, r) => a + r.arrivalsMt, 0), 2),
        dailyObservations: sorted.reduce((a, r) => a + r.nObs, 0),
      };
    })
    .sort((a, b) => b.last12MonthAverage - a.last12MonthAverage || a.marketName.localeCompare(b.marketName));

  return { query: normalisedQuery(q, rows), markets };
}

// ---------------------------------------------------------------------------
// Yearly roll-up
// ---------------------------------------------------------------------------

export function yearlySummary(q = {}) {
  const rows = filterRows(q);
  const byYear = new Map();
  for (const r of rows) {
    if (!byYear.has(r.year)) byYear.set(r.year, []);
    byYear.get(r.year).push(r);
  }
  const years = [...byYear.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([year, group]) => ({
      year,
      averagePrice: round(weightedPrice(group), 2),
      minPrice: round(Math.min(...group.map((r) => r.minPrice)), 2),
      maxPrice: round(Math.max(...group.map((r) => r.maxPrice)), 2),
      arrivalsMt: round(group.reduce((a, r) => a + r.arrivalsMt, 0), 2),
      months: new Set(group.map((r) => r.period)).size,
      dailyObservations: group.reduce((a, r) => a + r.nObs, 0),
    }));
  return { query: normalisedQuery(q, rows), years };
}

// ---------------------------------------------------------------------------
// Benchmark: is the rate a buyer is offering good, historically?
// ---------------------------------------------------------------------------

/**
 * Compare an offered rate (Rs/quintal) against what this commodity actually
 * fetched in the mandis of the extract. Used by Smart Sell to put a real
 * historical footing under the "is this a good price?" question.
 */
export function benchmark(q = {}) {
  const rows = filterRows(q);
  const price = Number(q.pricePerQuintal);
  if (!rows.length || !Number.isFinite(price) || price <= 0) {
    return { available: false, query: normalisedQuery(q, rows) };
  }

  const sorted = [...rows].sort((a, b) => a.period.localeCompare(b.period));
  const prices = sorted.map((r) => r.modalPrice);
  const last12 = sorted.slice(-12).map((r) => r.modalPrice);
  const avg = mean(prices);
  const recent = mean(last12);
  const pct = percentileOf(prices, price);
  const vsRecent = recent ? round(((price - recent) / recent) * 100, 1) : 0;

  let verdict = 'TYPICAL';
  if (pct >= 75) verdict = 'STRONG';
  else if (pct <= 25) verdict = 'WEAK';

  const label = normalisedQuery(q, rows);
  const scope = [label.market, label.state].filter(Boolean).join(', ') || 'the mandis in this dataset';

  return {
    available: true,
    query: label,
    pricePerQuintal: round(price, 2),
    percentile: pct,
    verdict,
    monthsCompared: prices.length,
    historicalAverage: round(avg, 2),
    last12MonthAverage: round(recent, 2),
    historicalMin: round(Math.min(...prices), 2),
    historicalMax: round(Math.max(...prices), 2),
    vsAveragePercent: avg ? round(((price - avg) / avg) * 100, 1) : 0,
    vsLast12MonthsPercent: vsRecent,
    messageEn:
      `₹${round(price)}/quintal sits at the ${pct}th percentile of ${prices.length} monthly Agmarknet modal prices ` +
      `for ${label.commodityEn || 'this crop'} in ${scope} (${label.fromYear}-${label.toYear}). ` +
      `The last 12 months averaged ₹${round(recent)}/quintal.`,
    messageHi:
      `₹${round(price)}/क्विंटल पिछले ${prices.length} महीनों के अगमार्कनेट भावों में ${pct}वें प्रतिशतक पर है ` +
      `(${label.commodityHi || 'यह फसल'}, ${label.fromYear}-${label.toYear})। ` +
      `पिछले 12 महीनों का औसत ₹${round(recent)}/क्विंटल रहा।`,
  };
}
