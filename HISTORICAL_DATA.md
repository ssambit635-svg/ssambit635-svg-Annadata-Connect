# Historical Mandi Data (Agmarknet) — Data Source & Pipeline

Annadata Connect shows **real historical mandi prices**, not generated demo numbers.
The price history behind the *Mandi Prices* page and the Smart Sell "historical price check"
comes from published Agmarknet panels, cut down to small extracts that ship with the repo.

```
Historical CSVs ->  Backend loader  ->  Filter / aggregate  ->  API  ->  Frontend
(Agmarknet)         marketPrices.js     marketPrices.service   /api/market-prices   Mandi Prices page
```

Three levels are served — pick one on the *Mandi Prices* page:

| Level | Grain | What each month carries |
| --- | --- | --- |
| **Mandi** | one APMC market | arrivals + min/max band + daily-observation count |
| **District** | mean across 4+ mandis | mean ± sd + mandi count |
| **State** | mean across the state's mandis | mean ± sd + mandi count (incl. **Odisha**) |

---

## 1. Where the data comes from

| | |
| --- | --- |
| **Upstream repository** | <https://github.com/pointbreak71/dpi410-final-project-v2> |
| **Commit pinned** | `841ec503bfb5d0fb251d1eed11e03d103aa4ab64` |
| **Files used** | `data/clean/did_inputs/within_mandi_range.csv` (272,785 mandi-month rows) · `across_mandi_district.csv` (21,324 district-month rows) · `across_mandi_state.csv` (27,326 state-month rows) |
| **Original source** | Agmarknet 2.0 API (`api.agmarknet.gov.in`), Directorate of Marketing & Inspection, Govt. of India |
| **Collected by** | that repository's `scripts/agmarknet_range_scraper.py` |
| **Panel coverage** | 11 crops × 36 states, 2010–2025, ~1.12 million monthly market observations |

The upstream project is a difference-in-differences study of eNAM adoption; its cleaned Agmarknet
panels are the part we reuse. Nothing in Annadata Connect fabricates, interpolates or randomises a
price — every value can be traced back to a row of those CSVs.

## 2. What ships in this repo

| Path | Contents |
| --- | --- |
| `backend/src/data/agmarknet/mandi_prices_monthly.csv` | Mandi-level extract — **493 rows / 9 market series** |
| `backend/src/data/agmarknet/mandi_prices_district_monthly.csv` | District-level extract — **3,567 rows / 147 district series** |
| `backend/src/data/agmarknet/mandi_prices_state_monthly.csv` | State-level extract — **3,148 rows / 73 state series** |
| `backend/src/data/agmarknet/source.meta.json` | Mandi provenance, field dictionary, selection rule, caveats |
| `backend/src/data/agmarknet/levels.meta.json` | District/state provenance, field dictionary, selection rule, caveats |
| `scripts/build-agmarknet-sample.mjs` | Reproducible mandi extractor |
| `scripts/build-agmarknet-levels.mjs` | Reproducible district/state extractor |

Only ~7.2k rows are kept: the app needs well-covered series to chart, not a
1.1 M-row national panel, and small CSVs keep the repo light and the API instant.

### Columns — mandi extract

| Column | Meaning |
| --- | --- |
| `state_name` | State (derived from the Agmarknet `state_id`; the upstream `state_name` column is empty) |
| `market_name` | Mandi / APMC market name as listed on Agmarknet |
| `district` | District, where upstream matched the mandi to the eNAM directory |
| `commodity` | Crop, lowercase (`paddy`, `wheat`, `maize`, `mustard`, `cotton`) |
| `year`, `month` | Calendar year and month (1–12) |
| `arrivals_mt` | Total arrivals that month, metric tonnes |
| `modal_price_avg` | Modal price, ₹/quintal (see the note below) |
| `min_price_avg`, `max_price_avg` | Arrival-weighted monthly averages of the daily min / max price |
| `n_obs` | Number of daily observations behind that month |
| `mandi_id` | eNAM mandi id when matched upstream |

### Columns — district / state extracts

| Column | Meaning |
| --- | --- |
| `state_name` | State (upstream `state_clean` / `state_final`) |
| `district` | District (district file only) |
| `commodity` | Crop, lowercase (upstream `crop` column) |
| `year`, `month` | Calendar year and month (1–12) |
| `price_mean` | Mean of the daily modal prices across that district/state's mandis, ₹/quintal |
| `price_sd` | Standard deviation of those modal prices across mandis, ₹/quintal |
| `n_mandis` | Number of mandis behind that district/state-month mean |

### Current extracts

Mandi level (all 2021-01 → 2025-12 unless noted):

| Commodity | Mandis |
| --- | --- |
| paddy | Ambikapur APMC (Chhattisgarh), Ammoor APMC (Tamil Nadu) |
| wheat | Ambikapur APMC (Chhattisgarh), Khatra APMC (West Bengal) |
| maize | Keshkal APMC (Chhattisgarh), Vellore APMC (Tamil Nadu) |
| mustard | Bankura Sadar APMC (West Bengal), Jaspur APMC (Chhattisgarh) |
| cotton | Kolathur APMC (Tamil Nadu), 2021-02 → 2025-12 |

District level (2021-01 → 2025-12, full window kept, 147 series across 9 states):

| Commodity | Districts | States |
| --- | --- | --- |
| paddy | 26 | Gujarat, Haryana, Madhya Pradesh, Punjab, Rajasthan, Tamil Nadu, Uttar Pradesh, Uttarakhand |
| wheat | 52 | Gujarat, Haryana, Madhya Pradesh, Maharashtra, Punjab, Rajasthan, Uttar Pradesh, Uttarakhand |
| maize | 26 | Gujarat, Haryana, Madhya Pradesh, Maharashtra, Rajasthan, Tamil Nadu, Uttar Pradesh |
| mustard | 31 | Gujarat, Haryana, Madhya Pradesh, Rajasthan, Uttar Pradesh |
| cotton | 12 | Gujarat, Haryana, Maharashtra, Punjab, Rajasthan, Tamil Nadu |

State level (2021-01 → 2025-12, full window kept, 73 series across 19 states):

| Commodity | States |
| --- | --- |
| paddy (18) | Andhra Pradesh, Bihar, Chhattisgarh, Gujarat, Haryana, Jharkhand, Karnataka, Madhya Pradesh, Maharashtra, **Odisha**, Puducherry, Punjab, Rajasthan, Tamil Nadu, Telangana, Tripura, Uttar Pradesh, Uttarakhand |
| wheat (14) | Bihar, Chhattisgarh, Gujarat, Haryana, Jharkhand, Karnataka, Madhya Pradesh, Maharashtra, **Odisha**, Punjab, Rajasthan, Telangana, Uttar Pradesh, Uttarakhand |
| maize (18) | Andhra Pradesh, Bihar, Chhattisgarh, Gujarat, Haryana, Jharkhand, Karnataka, Madhya Pradesh, Maharashtra, Nagaland, **Odisha**, Puducherry, Punjab, Rajasthan, Tamil Nadu, Telangana, Uttar Pradesh, Uttarakhand |
| mustard (11) | Bihar, Chhattisgarh, Gujarat, Haryana, Madhya Pradesh, Maharashtra, Punjab, Rajasthan, Telangana, Uttar Pradesh, Uttarakhand |
| cotton (12) | Andhra Pradesh, Gujarat, Haryana, Madhya Pradesh, Maharashtra, **Odisha**, Puducherry, Punjab, Rajasthan, Tamil Nadu, Telangana, Uttar Pradesh |

### Note on `modal_price_avg` (mandi level)

The upstream repository publishes the **min/max band** panel in git, but keeps the modal-price panel
out of git (`.gitignore`: `data/clean/prices/`). `modal_price_avg` here is therefore the midpoint of
the arrival-weighted monthly min and max averages. It was validated against the district-level modal
means that the same repository *does* publish (`across_mandi_district.csv`):

- Pearson **r = 0.94** over 16,092 overlapping district-months
- median absolute deviation **8.7 %**

`min_price_avg` and `max_price_avg` are shipped alongside so any consumer can see the raw band, and
`source.meta.json` records the caveat next to the data.

### Note on `price_mean` (district / state levels)

`price_mean` is a **published upstream aggregate** (mean of daily modal prices across mandis), not a
reconstruction. Two caveats travel with it:

- District-month means always rest on 4+ mandis in this window; some **state**-month means rest on
  a single mandi (`n_mandis = 1`). The count ships alongside every row so consumers can weigh them.
- Rows with non-positive or absurd (`≥ ₹1,00,000/q`) means are dropped at build time (unit-slip
  guard); the filter is recorded in `levels.meta.json`.

## 3. Regenerating / widening the extracts

```bash
# clones the upstream repo into .data-src/ (git-ignored) if it is not there yet
npm run data:agmarknet:all        # mandi + district + state extracts

# or individually
npm run data:agmarknet            # mandi level only
npm run data:agmarknet:levels     # district + state levels only

# or point at an existing clone, and change the slice
node scripts/build-agmarknet-sample.mjs \
  --source ../dpi410-final-project-v2 \
  --commodities paddy,wheat,maize,mustard,cotton \
  --from-year 2015 --to-year 2025 \
  --min-months 24 --max-rows 500

node scripts/build-agmarknet-levels.mjs \
  --source ../dpi410-final-project-v2 \
  --commodities paddy,wheat,maize,mustard,cotton \
  --from-year 2021 --to-year 2025 \
  --max-price 100000
```

Mandi selection is deterministic: the script walks the requested commodities round-robin and takes
the market series with the most complete monthly coverage in the window, preferring a state it has
not used yet for that commodity, until the row budget is spent. Series are taken whole, so every
chart is a continuous run of real months.

District/state selection keeps the **full window** for the requested commodities (no row budget, no
min-months cutoff): district coverage is sparse for some crops, so every observed month is retained.
Series are never partially cut.

## 4. Backend

| File | Role |
| --- | --- |
| `backend/src/data/marketPrices.js` | Parses the CSVs once at boot, indexes them, maps app crops → commodities |
| `backend/src/services/marketPrices.service.js` | Filter + aggregate: trend series, seasonality, mandi/district/state comparison, yearly roll-up, price benchmark |
| `backend/src/routes/marketPrices.routes.js` | Public read-only endpoints under `/api/market-prices` |

All aggregation is plain descriptive statistics (weighted means, medians, percentiles) — no
forecasting, no ML, so every number on screen is defensible.

### Endpoints

| Endpoint | Purpose |
| --- | --- |
| `GET /api/market-prices/meta` | Provenance, per-level coverage, commodity/state/district/mandi lists, crop→commodity map |
| `GET /api/market-prices/series` | Monthly modal price + arrivals trend, with summary stats |
| `GET /api/market-prices/seasonality` | Average price per calendar month → best/worst month to sell |
| `GET /api/market-prices/markets` | Mandi-by-mandi comparison for one commodity |
| `GET /api/market-prices/districts` | District-by-district comparison for one commodity |
| `GET /api/market-prices/states` | State-by-state comparison for one commodity |
| `GET /api/market-prices/yearly` | Year-by-year roll-up (arrival-weighted at mandi level, plain mean otherwise) |
| `GET /api/market-prices/benchmark` | Where an offered ₹/quintal sits in the historical distribution |
| `GET /api/market-prices/rows` | The filtered raw rows, for transparency and CSV download |

Common query parameters: `level` (`market` default · `district` · `state`), `commodity` **or**
`cropId` (e.g. `crop-wheat`), `state`, `district`, `market`, `fromYear`, `toYear`; plus
`pricePerQuintal` for `/benchmark` and `limit` for `/rows`. The comparison endpoints always read
their own level (`/markets` → mandi, `/districts` → district, `/states` → state); other filters
narrow the pool.

## 5. Frontend

| File | Role |
| --- | --- |
| `frontend/src/pages/MarketPricesPage.jsx` | *Mandi Prices* page (`/market-prices`) — level tabs, filters, trend chart, seasonality, mandi/district/state comparison, yearly table, raw rows + CSV download |
| `frontend/src/components/PriceTrendChart.jsx` | Dependency-free SVG line/band/arrivals chart and seasonality bars |
| `frontend/src/components/PriceBenchmarkCard.jsx` | "Is this a good price?" card, embedded in Smart Sell |
| `frontend/src/services/api/marketPriceService.js` | Typed wrappers over the endpoints above |

## 6. Attribution

Underlying data © Government of India (Agmarknet / Directorate of Marketing & Inspection), cleaned
and republished by [pointbreak71/dpi410-final-project-v2](https://github.com/pointbreak71/dpi410-final-project-v2).
Please keep this attribution if you reuse the extract.
