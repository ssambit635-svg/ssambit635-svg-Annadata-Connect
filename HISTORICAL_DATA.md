# Historical Mandi Data (Agmarknet) — Data Source & Pipeline

Annadata Connect shows **real historical mandi prices**, not generated demo numbers.
The price history behind the *Mandi Prices* page and the Smart Sell "historical price check"
comes from a published Agmarknet panel, cut down to a small extract that ships with the repo.

```
Historical CSV  ->  Backend loader  ->  Filter / aggregate  ->  API  ->  Frontend
(Agmarknet)         marketPrices.js     marketPrices.service   /api/market-prices   Mandi Prices page
```

---

## 1. Where the data comes from

| | |
| --- | --- |
| **Upstream repository** | <https://github.com/pointbreak71/dpi410-final-project-v2> |
| **Commit pinned** | `841ec503bfb5d0fb251d1eed11e03d103aa4ab64` |
| **File used** | `data/clean/did_inputs/within_mandi_range.csv` (272,785 monthly rows) |
| **Original source** | Agmarknet 2.0 API (`api.agmarknet.gov.in`), Directorate of Marketing & Inspection, Govt. of India |
| **Collected by** | that repository's `scripts/agmarknet_range_scraper.py` |
| **Panel coverage** | 11 crops × 36 states, 2010–2025, ~1.12 million monthly market observations |

The upstream project is a difference-in-differences study of eNAM adoption; its cleaned Agmarknet
panel is the part we reuse. Nothing in Annadata Connect fabricates, interpolates or randomises a
price — every value can be traced back to a row of that CSV.

## 2. What ships in this repo

| Path | Contents |
| --- | --- |
| `backend/src/data/agmarknet/mandi_prices_monthly.csv` | The extract actually served — **493 rows / 9 market series** |
| `backend/src/data/agmarknet/source.meta.json` | Provenance, field dictionary, selection rule, caveats |
| `scripts/build-agmarknet-sample.mjs` | Reproducible extractor (upstream CSV → the two files above) |

Only a few hundred rows are kept: the app needs a handful of well-covered series to chart, not a
1.1 M-row national panel, and a small CSV keeps the repo light and the API instant.

### Columns

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

### Current extract

| Commodity | Mandis | Window |
| --- | --- | --- |
| paddy | Ambikapur APMC (Chhattisgarh), Ammoor APMC (Tamil Nadu) | 2021-01 → 2025-12 |
| wheat | Ambikapur APMC (Chhattisgarh), Khatra APMC (West Bengal) | 2021-01 → 2025-12 |
| maize | Keshkal APMC (Chhattisgarh), Vellore APMC (Tamil Nadu) | 2021-01 → 2025-12 |
| mustard | Bankura Sadar APMC (West Bengal), Jaspur APMC (Chhattisgarh) | 2021-01 → 2025-12 |
| cotton | Kolathur APMC (Tamil Nadu) | 2021-02 → 2025-12 |

### Note on `modal_price_avg`

The upstream repository publishes the **min/max band** panel in git, but keeps the modal-price panel
out of git (`.gitignore`: `data/clean/prices/`). `modal_price_avg` here is therefore the midpoint of
the arrival-weighted monthly min and max averages. It was validated against the district-level modal
means that the same repository *does* publish (`across_mandi_district.csv`):

- Pearson **r = 0.94** over 16,092 overlapping district-months
- median absolute deviation **8.7 %**

`min_price_avg` and `max_price_avg` are shipped alongside so any consumer can see the raw band, and
`source.meta.json` records the caveat next to the data.

## 3. Regenerating / widening the extract

```bash
# clones the upstream repo into .data-src/ (git-ignored) if it is not there yet
npm run data:agmarknet

# or point at an existing clone, and change the slice
node scripts/build-agmarknet-sample.mjs \
  --source ../dpi410-final-project-v2 \
  --commodities paddy,wheat,maize,mustard,cotton \
  --from-year 2015 --to-year 2025 \
  --min-months 24 --max-rows 500
```

Selection is deterministic: the script walks the requested commodities round-robin and takes the
market series with the most complete monthly coverage in the window, preferring a state it has not
used yet for that commodity, until the row budget is spent. Series are taken whole, so every chart
is a continuous run of real months.

## 4. Backend

| File | Role |
| --- | --- |
| `backend/src/data/marketPrices.js` | Parses the CSV once at boot, indexes it, maps app crops → commodities |
| `backend/src/services/marketPrices.service.js` | Filter + aggregate: trend series, seasonality, mandi comparison, yearly roll-up, price benchmark |
| `backend/src/routes/marketPrices.routes.js` | Public read-only endpoints under `/api/market-prices` |

All aggregation is plain descriptive statistics (weighted means, medians, percentiles) — no
forecasting, no ML, so every number on screen is defensible.

### Endpoints

| Endpoint | Purpose |
| --- | --- |
| `GET /api/market-prices/meta` | Provenance, coverage, commodity/state/mandi lists, crop→commodity map |
| `GET /api/market-prices/series` | Monthly modal price + arrivals trend, with summary stats |
| `GET /api/market-prices/seasonality` | Average price per calendar month → best/worst month to sell |
| `GET /api/market-prices/markets` | Mandi-by-mandi comparison for one commodity |
| `GET /api/market-prices/yearly` | Year-by-year roll-up (arrival-weighted) |
| `GET /api/market-prices/benchmark` | Where an offered ₹/quintal sits in the historical distribution |
| `GET /api/market-prices/rows` | The filtered raw rows, for transparency and CSV download |

Common query parameters: `commodity` **or** `cropId` (e.g. `crop-wheat`), `state`, `market`,
`fromYear`, `toYear`; plus `pricePerQuintal` for `/benchmark` and `limit` for `/rows`.

## 5. Frontend

| File | Role |
| --- | --- |
| `frontend/src/pages/MarketPricesPage.jsx` | *Mandi Prices* page (`/market-prices`) — filters, trend chart, seasonality, mandi comparison, yearly table, raw rows + CSV download |
| `frontend/src/components/PriceTrendChart.jsx` | Dependency-free SVG line/band/arrivals chart and seasonality bars |
| `frontend/src/components/PriceBenchmarkCard.jsx` | "Is this a good price?" card, embedded in Smart Sell |
| `frontend/src/services/api/marketPriceService.js` | Typed wrappers over the endpoints above |

## 6. Attribution

Underlying data © Government of India (Agmarknet / Directorate of Marketing & Inspection), cleaned
and republished by [pointbreak71/dpi410-final-project-v2](https://github.com/pointbreak71/dpi410-final-project-v2).
Please keep this attribution if you reuse the extract.
