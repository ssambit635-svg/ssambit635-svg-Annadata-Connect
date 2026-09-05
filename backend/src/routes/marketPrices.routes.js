import { Router } from 'express';
import { ApiError } from '../middleware/error.js';
import { CROP_COMMODITY, PRICE_LEVELS, loadMarketPrices } from '../data/marketPrices.js';
import {
  catalogue,
  filterRows,
  priceSeries,
  seasonality,
  marketComparison,
  districtComparison,
  stateComparison,
  yearlySummary,
  benchmark,
} from '../services/marketPrices.service.js';

// Public read-only API over the historical Agmarknet panels (mandi, district
// and state levels).
//   Historical CSVs -> data/marketPrices.js -> services/marketPrices.service.js
//                   -> these routes -> frontend
// Open like /api/reference: it is published government market data and the
// landing page shows it before a farmer signs in.
const router = Router();

function parseQuery(req) {
  const { level, commodity, cropId, state, district, market, fromYear, toYear } = req.query;
  const data = loadMarketPrices();

  if (level && !PRICE_LEVELS.includes(String(level))) {
    throw new ApiError(400, 'VALIDATION_ERROR', `Unknown level '${level}'. Known: ${PRICE_LEVELS.join(', ')}.`);
  }
  if (commodity && !data.commodities.includes(String(commodity))) {
    throw new ApiError(400, 'VALIDATION_ERROR', `Unknown commodity '${commodity}'. Known: ${data.commodities.join(', ')}.`);
  }
  if (cropId && !CROP_COMMODITY[String(cropId)]) {
    throw new ApiError(400, 'NO_HISTORY_FOR_CROP', `No historical mandi data is available for crop '${cropId}'.`);
  }
  if (state && !data.states.includes(String(state))) {
    throw new ApiError(400, 'VALIDATION_ERROR', `Unknown state '${state}'. Known: ${data.states.join(', ')}.`);
  }
  const yr = (v, name) => {
    if (v === undefined || v === '') return undefined;
    const n = Number(v);
    if (!Number.isInteger(n) || n < 1900 || n > 2100) {
      throw new ApiError(400, 'VALIDATION_ERROR', `${name} must be a four-digit year.`);
    }
    return n;
  };

  return {
    level: level ? String(level) : undefined,
    commodity: commodity ? String(commodity) : undefined,
    cropId: cropId ? String(cropId) : undefined,
    state: state ? String(state) : undefined,
    district: district ? String(district) : undefined,
    market: market ? String(market) : undefined,
    fromYear: yr(fromYear, 'fromYear'),
    toYear: yr(toYear, 'toYear'),
  };
}

function wrap(handler) {
  return (req, res, next) => {
    try {
      handler(req, res);
    } catch (e) {
      next(e);
    }
  };
}

// GET /api/market-prices/meta — dataset provenance, coverage and filter options.
router.get('/meta', wrap((req, res) => res.json(catalogue())));

// GET /api/market-prices/series?level=&commodity=&state=&district=&market=&fromYear=&toYear=
// Monthly modal price + arrivals trend for the selected slice.
router.get('/series', wrap((req, res) => res.json(priceSeries(parseQuery(req)))));

// GET /api/market-prices/seasonality?... — average price by calendar month.
router.get('/seasonality', wrap((req, res) => res.json(seasonality(parseQuery(req)))));

// GET /api/market-prices/markets?... — mandi-by-mandi comparison for a commodity.
router.get('/markets', wrap((req, res) => res.json(marketComparison(parseQuery(req)))));

// GET /api/market-prices/districts?... — district-by-district comparison.
// Always reads the district level; other filters narrow the pool.
router.get('/districts', wrap((req, res) => res.json(districtComparison(parseQuery(req)))));

// GET /api/market-prices/states?... — state-by-state comparison.
// Always reads the state level; other filters narrow the pool.
router.get('/states', wrap((req, res) => res.json(stateComparison(parseQuery(req)))));

// GET /api/market-prices/yearly?... — year-by-year roll-up.
router.get('/yearly', wrap((req, res) => res.json(yearlySummary(parseQuery(req)))));

// GET /api/market-prices/benchmark?...&pricePerQuintal=2350
// Where an offered rate sits in the historical distribution.
router.get('/benchmark', wrap((req, res) => {
  const q = parseQuery(req);
  const price = Number(req.query.pricePerQuintal);
  if (!Number.isFinite(price) || price <= 0) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'pricePerQuintal must be a positive number.');
  }
  res.json(benchmark({ ...q, pricePerQuintal: price }));
}));

// GET /api/market-prices/rows?...&limit=100 — the raw filtered CSV rows, for
// transparency ("show me the data behind this chart") and CSV download.
router.get('/rows', wrap((req, res) => {
  const q = parseQuery(req);
  const limit = Math.min(Math.max(Number(req.query.limit) || 200, 1), 1000);
  const rows = filterRows(q);
  res.json({
    total: rows.length,
    limit,
    rows: rows.slice(0, limit).map((r) => ({
      level: r.level,
      stateName: r.stateName,
      marketName: r.marketName,
      district: r.district,
      commodity: r.commodity,
      year: r.year,
      month: r.month,
      arrivalsMt: r.arrivalsMt,
      modalPriceAvg: r.modalPrice,
      minPriceAvg: r.minPrice,
      maxPriceAvg: r.maxPrice,
      priceSd: r.sdPrice,
      nMandis: r.nMandis,
      nObs: r.nObs,
      mandiId: r.mandiId,
    })),
  });
}));

export default router;
