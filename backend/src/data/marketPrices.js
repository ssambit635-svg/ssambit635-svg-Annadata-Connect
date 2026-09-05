// Loader for the historical Agmarknet mandi price extracts (multilevel).
//
// This is REAL observed data, not seeded/mock data: the CSVs next to this file
// are curated slices of the monthly Agmarknet panels published in
// https://github.com/pointbreak71/dpi410-final-project-v2 (see
// agmarknet/source.meta.json and agmarknet/levels.meta.json for provenance,
// scripts/build-agmarknet-sample.mjs and scripts/build-agmarknet-levels.mjs
// for the reproducible extraction).
//
// Three levels are served, all 2021-2025 for the app's five commodities:
//   market   mandi_prices_monthly.csv           mandi detail + arrivals + min/max band
//   district mandi_prices_district_monthly.csv  district-month modal means (+/- sd, 4+ mandis)
//   state    mandi_prices_state_monthly.csv     state-month modal means (+/- sd, incl. Odisha)
//
// The CSVs are small (a few thousand rows combined) and immutable, so they are
// parsed once at boot and kept in memory with a couple of indexes. Nothing here
// writes to the application database - historical prices are read-only
// reference data.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, 'agmarknet');
const MARKET_CSV = path.join(DATA_DIR, 'mandi_prices_monthly.csv');
const DISTRICT_CSV = path.join(DATA_DIR, 'mandi_prices_district_monthly.csv');
const STATE_CSV = path.join(DATA_DIR, 'mandi_prices_state_monthly.csv');
const MARKET_META = path.join(DATA_DIR, 'source.meta.json');
const LEVELS_META = path.join(DATA_DIR, 'levels.meta.json');

export const PRICE_LEVELS = ['market', 'district', 'state'];

// Crops the app procures -> commodity label used by Agmarknet. Crops with no
// counterpart in the extract (e.g. moong) simply have no history to show.
export const CROP_COMMODITY = {
  'crop-paddy': 'paddy',
  'crop-wheat': 'wheat',
  'crop-maize': 'maize',
  'crop-mustard': 'mustard',
  'crop-cotton': 'cotton',
};

export const COMMODITY_LABELS = {
  paddy: { en: 'Paddy', hi: 'धान' },
  wheat: { en: 'Wheat', hi: 'गेहूं' },
  maize: { en: 'Maize', hi: 'मक्का' },
  mustard: { en: 'Mustard', hi: 'सरसों' },
  cotton: { en: 'Cotton', hi: 'कपास' },
  rice: { en: 'Rice', hi: 'चावल' },
  onion: { en: 'Onion', hi: 'प्याज' },
  potato: { en: 'Potato', hi: 'आलू' },
  tomato: { en: 'Tomato', hi: 'टमाटर' },
  chana: { en: 'Gram (Chana)', hi: 'चना' },
  soybean: { en: 'Soybean', hi: 'सोयाबीन' },
};

export const LEVEL_LABELS = {
  market: { en: 'Mandi', hi: 'मंडी' },
  district: { en: 'District', hi: 'ज़िला' },
  state: { en: 'State', hi: 'राज्य' },
};

export const MONTH_LABELS = [
  { en: 'Jan', hi: 'जन' }, { en: 'Feb', hi: 'फ़र' }, { en: 'Mar', hi: 'मार्च' },
  { en: 'Apr', hi: 'अप्रै' }, { en: 'May', hi: 'मई' }, { en: 'Jun', hi: 'जून' },
  { en: 'Jul', hi: 'जुल' }, { en: 'Aug', hi: 'अग' }, { en: 'Sep', hi: 'सित' },
  { en: 'Oct', hi: 'अक्तू' }, { en: 'Nov', hi: 'नव' }, { en: 'Dec', hi: 'दिस' },
];

function splitCsvLine(line) {
  const out = [];
  let cur = '';
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i += 1; }
      else if (ch === '"') quoted = false;
      else cur += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { out.push(cur); cur = ''; }
    else cur += ch;
  }
  out.push(cur);
  return out;
}

function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length);
  if (!lines.length) return [];
  const header = splitCsvLine(lines[0]).map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const cells = splitCsvLine(line);
    const row = {};
    header.forEach((h, i) => { row[h] = (cells[i] ?? '').trim(); });
    return row;
  });
}

function readCsvOrEmpty(filePath) {
  if (!fs.existsSync(filePath)) return [];
  return parseCsv(fs.readFileSync(filePath, 'utf8'));
}

const numOrNull = (v) => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

// Unified record shape across levels. Level-specific fields are null/empty
// where the level has no such measure (never zero-filled, so consumers can
// tell "not measured" apart from a real zero):
//   market   -> arrivalsMt / minPrice / maxPrice / nObs / mandiId
//   district -> sdPrice / nMandis + district
//   state    -> sdPrice / nMandis
function toMarketRecord(row) {
  const year = Number(row.year);
  const month = Number(row.month);
  return {
    level: 'market',
    stateName: row.state_name,
    marketName: row.market_name,
    district: row.district || '',
    commodity: row.commodity,
    year,
    month,
    // Sortable YYYY-MM key used for series ordering and range filters.
    period: `${year}-${String(month).padStart(2, '0')}`,
    arrivalsMt: Number(row.arrivals_mt) || 0,
    modalPrice: Number(row.modal_price_avg) || 0,
    minPrice: numOrNull(row.min_price_avg),
    maxPrice: numOrNull(row.max_price_avg),
    sdPrice: null,
    nMandis: null,
    nObs: Number(row.n_obs) || 0,
    mandiId: row.mandi_id || '',
    marketKey: `${row.state_name}::${row.market_name}`,
    districtKey: row.district ? `${row.state_name}::${row.district}` : '',
  };
}

function toAggregateRecord(row, level) {
  const year = Number(row.year);
  const month = Number(row.month);
  return {
    level,
    stateName: row.state_name,
    marketName: '',
    district: level === 'district' ? row.district || '' : '',
    commodity: row.commodity,
    year,
    month,
    period: `${year}-${String(month).padStart(2, '0')}`,
    arrivalsMt: 0,
    modalPrice: Number(row.price_mean) || 0,
    minPrice: null,
    maxPrice: null,
    sdPrice: numOrNull(row.price_sd),
    nMandis: numOrNull(row.n_mandis),
    nObs: 0,
    mandiId: '',
    marketKey: '',
    districtKey: level === 'district' && row.district ? `${row.state_name}::${row.district}` : '',
  };
}

const bySeries = (a, b) =>
  a.commodity.localeCompare(b.commodity) ||
  a.stateName.localeCompare(b.stateName) ||
  (a.marketName || a.district).localeCompare(b.marketName || b.district) ||
  a.period.localeCompare(b.period);

function validRow(r) {
  return Boolean(r.commodity && r.stateName && r.year && r.month >= 1 && r.month <= 12 && r.modalPrice > 0);
}

function levelCoverage(rows, { seriesKey, extra = {} } = {}) {
  if (!rows.length) {
    return { rowCount: 0, seriesCount: 0, fromYear: null, toYear: null, fromPeriod: null, toPeriod: null, ...extra };
  }
  const years = rows.map((r) => r.year);
  const periods = rows.map((r) => r.period).sort();
  return {
    rowCount: rows.length,
    seriesCount: seriesKey ? new Set(rows.map(seriesKey)).size : rows.length,
    fromYear: Math.min(...years),
    toYear: Math.max(...years),
    fromPeriod: periods[0],
    toPeriod: periods[periods.length - 1],
    ...extra,
  };
}

let cache = null;

/**
 * Parse the extracts once and build the lookups the service layer needs.
 * Throws on a missing/empty mandi file: this API surface exists only because
 * the dataset exists, so failing loudly at boot beats silently serving
 * nothing. District/state files are optional additions - the API degrades to
 * mandi-only when they are absent (e.g. an older checkout).
 */
export function loadMarketPrices() {
  if (cache) return cache;

  if (!fs.existsSync(MARKET_CSV)) {
    throw new Error(
      `Historical Agmarknet extract missing at ${MARKET_CSV}. ` +
        'Run: node scripts/build-agmarknet-sample.mjs'
    );
  }
  const rows = readCsvOrEmpty(MARKET_CSV).map(toMarketRecord).filter(validRow).sort(bySeries);
  const districtRows = readCsvOrEmpty(DISTRICT_CSV)
    .map((r) => toAggregateRecord(r, 'district'))
    .filter((r) => validRow(r) && r.district)
    .sort(bySeries);
  const stateRows = readCsvOrEmpty(STATE_CSV)
    .map((r) => toAggregateRecord(r, 'state'))
    .filter(validRow)
    .sort(bySeries);

  if (!rows.length) throw new Error(`Historical Agmarknet extract at ${MARKET_CSV} has no usable rows.`);

  const meta = fs.existsSync(MARKET_META) ? JSON.parse(fs.readFileSync(MARKET_META, 'utf8')) : null;
  const levelsMeta = fs.existsSync(LEVELS_META) ? JSON.parse(fs.readFileSync(LEVELS_META, 'utf8')) : null;

  const commodities = [...new Set([...rows, ...districtRows, ...stateRows].map((r) => r.commodity))].sort();
  const states = [...new Set([...rows, ...districtRows, ...stateRows].map((r) => r.stateName))].sort();
  const statesByLevel = {
    market: [...new Set(rows.map((r) => r.stateName))].sort(),
    district: [...new Set(districtRows.map((r) => r.stateName))].sort(),
    state: [...new Set(stateRows.map((r) => r.stateName))].sort(),
  };
  const commoditiesByLevel = {
    market: [...new Set(rows.map((r) => r.commodity))].sort(),
    district: [...new Set(districtRows.map((r) => r.commodity))].sort(),
    state: [...new Set(stateRows.map((r) => r.commodity))].sort(),
  };

  const markets = [];
  const seenMarket = new Set();
  for (const r of rows) {
    const key = `${r.marketKey}::${r.commodity}`;
    if (seenMarket.has(key)) continue;
    seenMarket.add(key);
    markets.push({
      key: r.marketKey,
      marketName: r.marketName,
      stateName: r.stateName,
      district: r.district,
      commodity: r.commodity,
      mandiId: r.mandiId,
    });
  }

  const districts = [];
  const seenDistrict = new Set();
  for (const r of districtRows) {
    const key = `${r.districtKey}::${r.commodity}`;
    if (seenDistrict.has(key)) continue;
    seenDistrict.add(key);
    districts.push({
      key: r.districtKey,
      district: r.district,
      stateName: r.stateName,
      commodity: r.commodity,
    });
  }

  const stateSeries = [];
  const seenState = new Set();
  for (const r of stateRows) {
    const key = `${r.stateName}::${r.commodity}`;
    if (seenState.has(key)) continue;
    seenState.add(key);
    stateSeries.push({ key, stateName: r.stateName, commodity: r.commodity });
  }

  const byLevel = (list) => [...new Set(list)].sort();
  const districtNames = byLevel(districtRows.map((r) => r.district));

  const levels = {
    market: levelCoverage(rows, {
      seriesKey: (r) => `${r.marketKey}::${r.commodity}`,
      extra: { dailyObservations: rows.reduce((a, r) => a + r.nObs, 0) },
    }),
    district: levelCoverage(districtRows, {
      seriesKey: (r) => `${r.districtKey}::${r.commodity}`,
      extra: {
        districtCount: districtNames.length,
        mandiMonths: districtRows.reduce((a, r) => a + (r.nMandis || 0), 0),
      },
    }),
    state: levelCoverage(stateRows, {
      seriesKey: (r) => `${r.stateName}::${r.commodity}`,
      extra: { mandiMonths: stateRows.reduce((a, r) => a + (r.nMandis || 0), 0) },
    }),
  };

  cache = {
    rows,
    districtRows,
    stateRows,
    meta,
    levelsMeta,
    commodities,
    states,
    statesByLevel,
    commoditiesByLevel,
    districtNames,
    markets,
    districts,
    stateSeries,
    levels,
    // Kept for backward compatibility: the mandi-level coverage that older
    // clients read as the whole dataset.
    coverage: levels.market,
  };
  return cache;
}

export function rowsForLevel(level) {
  const data = loadMarketPrices();
  if (level === 'district') return data.districtRows;
  if (level === 'state') return data.stateRows;
  return data.rows;
}

export function commodityLabel(commodity) {
  return COMMODITY_LABELS[commodity] || { en: commodity, hi: commodity };
}

export function levelLabel(level) {
  return LEVEL_LABELS[level] || { en: level, hi: level };
}
