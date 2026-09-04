// Loader for the historical Agmarknet mandi price extract.
//
// This is REAL observed data, not seeded/mock data: the CSV next to this file
// is a curated slice of the monthly Agmarknet panel published in
// https://github.com/pointbreak71/dpi410-final-project-v2 (see
// agmarknet/source.meta.json for provenance and scripts/build-agmarknet-sample.mjs
// for the reproducible extraction).
//
// The CSV is small (a few hundred rows) and immutable, so it is parsed once at
// boot and kept in memory with a couple of indexes. Nothing here writes to the
// application database - historical prices are read-only reference data.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, 'agmarknet');
const CSV_PATH = path.join(DATA_DIR, 'mandi_prices_monthly.csv');
const META_PATH = path.join(DATA_DIR, 'source.meta.json');

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

function toRecord(row) {
  const year = Number(row.year);
  const month = Number(row.month);
  return {
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
    minPrice: Number(row.min_price_avg) || 0,
    maxPrice: Number(row.max_price_avg) || 0,
    nObs: Number(row.n_obs) || 0,
    mandiId: row.mandi_id || '',
    marketKey: `${row.state_name}::${row.market_name}`,
  };
}

let cache = null;

/**
 * Parse the extract once and build the lookups the service layer needs.
 * Throws on a missing/empty file: this API surface exists only because the
 * dataset exists, so failing loudly at boot beats silently serving nothing.
 */
export function loadMarketPrices() {
  if (cache) return cache;

  if (!fs.existsSync(CSV_PATH)) {
    throw new Error(
      `Historical Agmarknet extract missing at ${CSV_PATH}. ` +
        'Run: node scripts/build-agmarknet-sample.mjs'
    );
  }
  const rows = parseCsv(fs.readFileSync(CSV_PATH, 'utf8'))
    .map(toRecord)
    .filter((r) => r.commodity && r.marketName && r.year && r.month >= 1 && r.month <= 12 && r.modalPrice > 0)
    .sort((a, b) =>
      a.commodity.localeCompare(b.commodity) ||
      a.stateName.localeCompare(b.stateName) ||
      a.marketName.localeCompare(b.marketName) ||
      a.period.localeCompare(b.period)
    );

  if (!rows.length) throw new Error(`Historical Agmarknet extract at ${CSV_PATH} has no usable rows.`);

  const meta = fs.existsSync(META_PATH) ? JSON.parse(fs.readFileSync(META_PATH, 'utf8')) : null;

  const commodities = [...new Set(rows.map((r) => r.commodity))].sort();
  const states = [...new Set(rows.map((r) => r.stateName))].sort();
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

  const years = rows.map((r) => r.year);
  const periods = rows.map((r) => r.period).sort();
  cache = {
    rows,
    meta,
    commodities,
    states,
    markets,
    coverage: {
      rowCount: rows.length,
      seriesCount: markets.length,
      fromYear: Math.min(...years),
      toYear: Math.max(...years),
      fromPeriod: periods[0],
      toPeriod: periods[periods.length - 1],
      dailyObservations: rows.reduce((a, r) => a + r.nObs, 0),
    },
  };
  return cache;
}

export function commodityLabel(commodity) {
  return COMMODITY_LABELS[commodity] || { en: commodity, hi: commodity };
}
