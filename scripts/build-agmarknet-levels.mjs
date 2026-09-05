#!/usr/bin/env node
/**
 * build-agmarknet-levels.mjs
 * ---------------------------------------------------------------------------
 * Builds the DISTRICT- and STATE-level historical mandi price extracts that the
 * backend serves alongside the mandi-level extract.
 *
 * SOURCE (real data, not mock):
 *   https://github.com/pointbreak71/dpi410-final-project-v2
 *   files: data/clean/did_inputs/across_mandi_district.csv  (21,324 rows)
 *          data/clean/did_inputs/across_mandi_state.csv     (27,326 rows)
 *   District/state-month modal means aggregated from the Agmarknet 2.0 API
 *   (api.agmarknet.gov.in) daily modal prices, 2010-2025.
 *
 * Together with scripts/build-agmarknet-sample.mjs (mandi level) this gives the
 * app a multilevel panel:
 *   mandi    -> arrivals + min/max band,  3 states,  mandi detail
 *   district -> mean +/- sd across 4+ mandis, 9 states,  ~80 districts
 *   state    -> mean +/- sd, 19 states incl. Odisha (the app's home state)
 *
 * Unlike the mandi extract (a row-budgeted slice), the district/state extracts
 * keep the FULL 2021-2025 window for the app's five commodities: district
 * coverage is sparse for some crops, so every real month is worth keeping, and
 * ~6.7k small rows are still trivial to ship and serve.
 *
 * Nothing is synthesised: every number in the output CSVs comes from a row of
 * the upstream files.
 *
 * Usage:
 *   node scripts/build-agmarknet-levels.mjs                # auto-clones source
 *   node scripts/build-agmarknet-levels.mjs --source /path/to/dpi410-final-project-v2
 *   node scripts/build-agmarknet-levels.mjs --from-year 2021 --to-year 2025
 */

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

const SOURCE_REPO = 'https://github.com/pointbreak71/dpi410-final-project-v2';
const DISTRICT_FILE = 'data/clean/did_inputs/across_mandi_district.csv';
const STATE_FILE = 'data/clean/did_inputs/across_mandi_state.csv';
const OUT_DIR = path.join(repoRoot, 'backend/src/data/agmarknet');
const OUT_DISTRICT = path.join(OUT_DIR, 'mandi_prices_district_monthly.csv');
const OUT_STATE = path.join(OUT_DIR, 'mandi_prices_state_monthly.csv');
const OUT_META = path.join(OUT_DIR, 'levels.meta.json');

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------
function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

const opts = {
  source: arg('source', path.join(repoRoot, '.data-src/dpi410-final-project-v2')),
  fromYear: Number(arg('from-year', 2021)),
  toYear: Number(arg('to-year', 2025)),
  // Commodities kept in the extracts. These map 1:1 onto the crops the app
  // procures (see CROP_COMMODITY in backend/src/data/marketPrices.js).
  commodities: arg('commodities', 'paddy,wheat,maize,mustard,cotton').split(','),
  // Sanity ceiling, Rs/quintal. Guards against unit slips in the upstream
  // panel (e.g. one 134,721/q row outside the default window).
  maxPrice: Number(arg('max-price', 100000)),
};

// ---------------------------------------------------------------------------
// Source acquisition
// ---------------------------------------------------------------------------
function ensureSource() {
  const districtCsv = path.join(opts.source, DISTRICT_FILE);
  const stateCsv = path.join(opts.source, STATE_FILE);
  if (fs.existsSync(districtCsv) && fs.existsSync(stateCsv)) return { districtCsv, stateCsv };

  console.log(`Source not found at ${opts.source} — cloning ${SOURCE_REPO} …`);
  fs.mkdirSync(path.dirname(opts.source), { recursive: true });
  const res = spawnSync('git', ['clone', '--depth', '1', SOURCE_REPO, opts.source], { stdio: 'inherit' });
  if (res.status !== 0 || !fs.existsSync(districtCsv) || !fs.existsSync(stateCsv)) {
    console.error(
      `\nCould not obtain the source dataset.\n` +
        `Clone it manually and re-run with --source:\n` +
        `  git clone --depth 1 ${SOURCE_REPO}\n` +
        `  node scripts/build-agmarknet-levels.mjs --source ./dpi410-final-project-v2\n`
    );
    process.exit(1);
  }
  return { districtCsv, stateCsv };
}

function sourceCommit() {
  const res = spawnSync('git', ['-C', opts.source, 'rev-parse', 'HEAD'], { encoding: 'utf8' });
  return res.status === 0 ? res.stdout.trim() : 'unknown';
}

// ---------------------------------------------------------------------------
// Parse + select
// ---------------------------------------------------------------------------
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

function readRows(csvPath) {
  const text = fs.readFileSync(csvPath, 'utf8');
  const lines = text.split(/\r?\n/);
  const header = splitCsvLine(lines[0]);
  const idx = Object.fromEntries(header.map((h, i) => [h.trim(), i]));
  const rows = [];
  for (let i = 1; i < lines.length; i += 1) {
    if (!lines[i]) continue;
    const c = splitCsvLine(lines[i]);
    const get = (name) => (idx[name] === undefined ? '' : (c[idx[name]] || '').trim());
    rows.push({
      district: get('district'),
      stateName: get('state_clean') || get('state_final'),
      commodity: get('crop').toLowerCase(),
      year: Number(get('year')),
      month: Number(get('month')),
      priceMean: Number(get('price_mean')),
      priceSd: Number(get('price_sd')),
      nMandis: Number(get('n_mandis')),
    });
  }
  return rows;
}

function usable(r, { requireDistrict }) {
  return (
    r.commodity &&
    opts.commodities.includes(r.commodity) &&
    r.stateName &&
    (!requireDistrict || r.district) &&
    Number.isFinite(r.year) &&
    r.year >= opts.fromYear &&
    r.year <= opts.toYear &&
    r.month >= 1 &&
    r.month <= 12 &&
    Number.isFinite(r.priceMean) &&
    r.priceMean > 0 &&
    r.priceMean < opts.maxPrice &&
    Number.isFinite(r.nMandis) &&
    r.nMandis >= 1
  );
}

function csvCell(v) {
  const s = v === null || v === undefined ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

const DISTRICT_HEADER = ['state_name', 'district', 'commodity', 'year', 'month', 'price_mean', 'price_sd', 'n_mandis'];
const STATE_HEADER = ['state_name', 'commodity', 'year', 'month', 'price_mean', 'price_sd', 'n_mandis'];

function writeCsv(filePath, header, rows) {
  const lines = [header.join(',')];
  for (const r of rows) lines.push(header.map((h) => csvCell(r[h])).join(','));
  fs.writeFileSync(filePath, `${lines.join('\n')}\n`, 'utf8');
}

function coverage(rows, keyFn) {
  const keys = [...new Set(rows.map(keyFn))].sort();
  return {
    rows: rows.length,
    series: keys.length,
    commodities: [...new Set(rows.map((r) => r.commodity))].sort(),
    states: [...new Set(rows.map((r) => r.state_name))].sort(),
    districts: [...new Set(rows.map((r) => r.district).filter(Boolean))].sort(),
  };
}

function main() {
  const { districtCsv, stateCsv } = ensureSource();

  console.log(`Reading ${districtCsv} …`);
  const districtUpstream = readRows(districtCsv);
  console.log(`  ${districtUpstream.length.toLocaleString('en-IN')} upstream district-month observations`);
  console.log(`Reading ${stateCsv} …`);
  const stateUpstream = readRows(stateCsv);
  console.log(`  ${stateUpstream.length.toLocaleString('en-IN')} upstream state-month observations`);

  const districtOut = districtUpstream
    .filter((r) => usable(r, { requireDistrict: true }))
    .map((r) => ({
      state_name: r.stateName,
      district: r.district,
      commodity: r.commodity,
      year: r.year,
      month: r.month,
      price_mean: Math.round(r.priceMean * 100) / 100,
      price_sd: Number.isFinite(r.priceSd) ? Math.round(r.priceSd * 100) / 100 : '',
      n_mandis: Math.trunc(r.nMandis),
    }))
    .sort(
      (a, b) =>
        a.commodity.localeCompare(b.commodity) ||
        a.state_name.localeCompare(b.state_name) ||
        a.district.localeCompare(b.district) ||
        a.year - b.year ||
        a.month - b.month
    );

  const stateOut = stateUpstream
    .filter((r) => usable(r, { requireDistrict: false }))
    .map((r) => ({
      state_name: r.stateName,
      commodity: r.commodity,
      year: r.year,
      month: r.month,
      price_mean: Math.round(r.priceMean * 100) / 100,
      price_sd: Number.isFinite(r.priceSd) ? Math.round(r.priceSd * 100) / 100 : '',
      n_mandis: Math.trunc(r.nMandis),
    }))
    .sort(
      (a, b) =>
        a.commodity.localeCompare(b.commodity) ||
        a.state_name.localeCompare(b.state_name) ||
        a.year - b.year ||
        a.month - b.month
    );

  fs.mkdirSync(OUT_DIR, { recursive: true });
  writeCsv(OUT_DISTRICT, DISTRICT_HEADER, districtOut);
  writeCsv(OUT_STATE, STATE_HEADER, stateOut);

  const districtCoverage = coverage(districtOut, (r) => `${r.commodity}|${r.state_name}|${r.district}`);
  const stateCoverage = coverage(stateOut, (r) => `${r.commodity}|${r.state_name}`);

  const meta = {
    dataset: 'Agmarknet district/state monthly modal price means (curated extracts)',
    isMockData: false,
    source: {
      repository: SOURCE_REPO,
      commit: sourceCommit(),
      files: {
        district: { file: DISTRICT_FILE, upstreamRows: districtUpstream.length },
        state: { file: STATE_FILE, upstreamRows: stateUpstream.length },
      },
      originalSource: 'Agmarknet 2.0 API (api.agmarknet.gov.in), Directorate of Marketing & Inspection, Govt. of India',
      collectedBy: 'pointbreak71/dpi410-final-project-v2 (scripts/agmarknet_range_scraper.py)',
    },
    extract: {
      generatedAt: new Date().toISOString(),
      generatedBy: 'scripts/build-agmarknet-levels.mjs',
      commodities: [...opts.commodities].sort(),
      period: { fromYear: opts.fromYear, toYear: opts.toYear },
      filters: {
        priceMeanGt: 0,
        priceMeanLt: opts.maxPrice,
        minMandis: 1,
      },
      selectionRule:
        'Full window kept for the requested commodities (no row budget, no min-months cutoff): district coverage is sparse for some crops, so every observed month is retained. Series are never partially cut.',
      district: {
        file: 'mandi_prices_district_monthly.csv',
        ...districtCoverage,
      },
      state: {
        file: 'mandi_prices_state_monthly.csv',
        ...stateCoverage,
      },
    },
    fields: {
      state_name: 'State (upstream state_clean / state_final)',
      district: 'District (district file only)',
      commodity: 'Commodity (lowercase; upstream crop column)',
      year: 'Calendar year',
      month: 'Calendar month, 1-12',
      price_mean: 'Mean of the daily modal prices across the mandis of that district/state that month, Rs/quintal',
      price_sd: 'Standard deviation of those modal prices across mandis, Rs/quintal (blank where upstream has none)',
      n_mandis: 'Number of mandis behind that district/state-month mean',
    },
    notes: [
      'Every row is real observed Agmarknet data. No values are simulated, interpolated or randomly generated.',
      'price_mean is a published upstream aggregate (mean across mandis), unlike the mandi extract whose modal price is reconstructed as the midpoint of the published min/max band.',
      'Some state-month means rest on a single mandi (n_mandis = 1); the count is shipped alongside so consumers can weigh them. District-month means always rest on 4+ mandis in this window.',
      'Re-run scripts/build-agmarknet-levels.mjs to regenerate or widen the extracts.',
    ],
  };
  fs.writeFileSync(OUT_META, `${JSON.stringify(meta, null, 2)}\n`, 'utf8');

  console.log(`\nWrote ${districtOut.length} rows / ${districtCoverage.series} district series -> ${path.relative(repoRoot, OUT_DISTRICT)}`);
  console.log(`  states (${districtCoverage.states.length}): ${districtCoverage.states.join(', ')}`);
  console.log(`Wrote ${stateOut.length} rows / ${stateCoverage.series} state series -> ${path.relative(repoRoot, OUT_STATE)}`);
  console.log(`  states (${stateCoverage.states.length}): ${stateCoverage.states.join(', ')}`);
  console.log(`Wrote provenance -> ${path.relative(repoRoot, OUT_META)}`);
}

main();
