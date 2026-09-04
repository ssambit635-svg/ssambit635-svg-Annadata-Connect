# Annadata Connect — API Integration Map

This document is the **source of truth** for the frontend ↔ backend contract. The frontend service
layer (`frontend/src/services/api/*`) implements exactly these endpoints — nothing invented.

- Base URL (dev single-port): `http://localhost:5000`
- All endpoints are prefixed with `/api`
- Auth: `Authorization: Bearer <JWT>` (obtained from `login`/`register`)
- Error shape: `{ "error": { "code": "STRING_CODE", "message": "human readable", "details?": {...} } }`

## Roles

`farmer`, `officer`, `authority`

## Error codes

| Code                      | HTTP | Meaning                                          |
| ------------------------- | ---- | ------------------------------------------------ |
| `VALIDATION_ERROR`        | 400  | Missing/invalid fields (`details.fields` when applicable) |
| `AUTH_TOKEN_MISSING`      | 401  | No Bearer token                                  |
| `AUTH_TOKEN_INVALID`      | 401  | Expired/invalid token → frontend logs out        |
| `AUTH_INVALID_CREDENTIALS`| 401  | Wrong phone/password                             |
| `FORBIDDEN`               | 403  | Authenticated but wrong role                     |
| `NOT_FOUND`               | 404  | Unknown resource/route                           |
| `PHONE_ALREADY_REGISTERED`| 409  | Register with an existing phone                  |
| `ACTIVE_REQUEST_EXISTS`   | 409  | Farmer already has an active request             |
| `CENTRE_NOT_OPEN`         | 409  | Centre is PAUSED/CLOSED                          |
| `CENTRE_CAPACITY_EXCEEDED`| 409  | Not enough remaining storage                     |
| `ACTIVE_BOOKING_EXISTS`   | 409  | Farmer already has a live market sell booking    |
| `BUYER_NOT_OPEN`          | 409  | Market buyer is not taking deliveries            |
| `BUYER_CAPACITY_EXCEEDED` | 409  | Market buyer's intake for the crop is full       |
| `INVALID_STATE`           | 409  | Illegal lifecycle transition                     |
| `NETWORK_ERROR`           | –    | Frontend-generated (fetch failed)                |

## Auth & reference (public)

| Method | Endpoint                 | Body                                                        | Response                                   |
| ------ | ------------------------ | ----------------------------------------------------------- | ------------------------------------------ |
| POST   | `/api/auth/register`     | `{name, phone, password, villageId, preferredLanguage?}`    | `201 {token, user}` — always role=farmer   |
| POST   | `/api/auth/login`        | `{phone, password}`                                         | `200 {token, user}`                        |
| GET    | `/api/reference/crops`   | –                                                           | `{crops:[{id,nameEn,nameHi,mspPerQuintal}]}` |
| GET    | `/api/reference/villages`| –                                                           | `{villages:[{id,nameEn,nameHi}]}`          |

## Historical mandi prices (public, read-only)

Real Agmarknet monthly panel — see [HISTORICAL_DATA.md](HISTORICAL_DATA.md) for provenance.
Common query params: `commodity` **or** `cropId` (`crop-paddy|crop-wheat|crop-maize|crop-mustard|crop-cotton`),
`state`, `market`, `fromYear`, `toYear`.

| Method | Endpoint                            | Extra params        | Response                                                                 |
| ------ | ----------------------------------- | ------------------- | ------------------------------------------------------------------------ |
| GET    | `/api/market-prices/meta`           | –                   | `{source, coverage, commodities[], states[], markets[], cropCommodityMap, months[]}` |
| GET    | `/api/market-prices/series`         | –                   | `{query, points:[{period,year,month,modalPrice,minPrice,maxPrice,arrivalsMt,nObs}], summary}` |
| GET    | `/api/market-prices/seasonality`    | –                   | `{query, overallAveragePrice, months:[{month,averagePrice,index,arrivalsMt}], best, worst, spreadPercent}` |
| GET    | `/api/market-prices/markets`        | –                   | `{query, markets:[{marketName,stateName,averagePrice,last12MonthAverage,latestPrice,months}]}` |
| GET    | `/api/market-prices/yearly`         | –                   | `{query, years:[{year,averagePrice,minPrice,maxPrice,arrivalsMt,months}]}` |
| GET    | `/api/market-prices/benchmark`      | `pricePerQuintal`   | `{available, percentile, verdict:'STRONG'\|'TYPICAL'\|'WEAK', historicalAverage, last12MonthAverage, messageEn, messageHi}` |
| GET    | `/api/market-prices/rows`           | `limit` (≤1000)     | `{total, limit, rows:[…raw CSV fields]}` |

Additional error code: `NO_HISTORY_FOR_CROP` (400) — the crop has no counterpart in the dataset.

## Authenticated — any role

| Method | Endpoint                  | Notes                                                     |
| ------ | ------------------------- | --------------------------------------------------------- |
| GET    | `/api/auth/me`            | `{user}`                                                  |
| GET    | `/api/centres`            | `{centres:[…presentCentre + queue summary]}`              |
| GET    | `/api/centres/:id`        | `{centre}`                                                |
| GET    | `/api/notifications`      | `{notifications:[…], unreadCount}` (own, newest first)    |
| PATCH  | `/api/notifications/:id/read` | `{notification}`                                      |
| POST   | `/api/notifications/read-all` | `{updated}`                                           |

## Farmer

| Method | Endpoint                    | Body                                  | Response / effect                                        |
| ------ | --------------------------- | ------------------------------------- | -------------------------------------------------------- |
| GET    | `/api/farmers/me`           | –                                     | `{profile(+village), activeRequest, activeQueue}`        |
| GET    | `/api/farmers/id-card`              | – | Farmer ID card payload: farmerId, profile, village, registered crops, QR data-URI |
| POST   | `/api/requests/recommend`   | `{cropId, quantityQuintals}`          | `{recommended, alternatives[], ineligible[], basis}` — transparent rule-based scoring, writes nothing |
| POST   | `/api/requests`             | `{cropId, quantityQuintals, centreId}`| `201 {request, queue}` — creates token `ANC-xxx`, status `WAITING` |
| GET    | `/api/requests/mine`        | –                                     | `{requests:[…]}` newest first                            |
| GET    | `/api/requests/:id`         | –                                     | `{request(+timeline), queue:{position, aheadCount, estimatedWaitMinutes, centreSummary}}` |
| POST   | `/api/requests/:id/cancel`  | –                                     | Only from `WAITING`/`PENDING` → `CANCELLED`              |

### Smart Selling Options (farmer, `/api/selling`)

| Method | Endpoint                          | Body                                  | Effect                                                  |
| ------ | --------------------------------- | ------------------------------------- | ------------------------------------------------------- |
| POST   | `/api/selling/options`            | `{cropId, quantityQuintal}`           | `{mspRatePerQuintal, options[], unavailable[], recommended, bestValueInr, basisEn, basisHi, summaryEn, summaryHi}` — ranks every buyer (MSP centres + above-MSP market buyers) by net value after an estimated transport cost; writes nothing |
| POST   | `/api/selling/book`               | `{cropId, quantityQuintal, channel, buyerId}` | `channel=MSP` → creates a normal procurement request+token (`201 {channel, kind:'request', request, queue}`); `channel=MARKET` → records a market booking (`201 {channel, kind:'booking', booking}`). One active sale (request OR booking) per farmer. |
| GET    | `/api/selling/bookings`           | –                                     | `{bookings:[…]}` — the farmer's private-buyer market bookings, newest first |
| POST   | `/api/selling/bookings/:id/cancel`| –                                     | `CONFIRMED` booking → `CANCELLED`, releases the buyer's intake capacity |

**Selling option object**: `{optionId, channel: MSP|MARKET, buyerId, nameEn/nameHi, categoryEn/Hi, address,
distanceKm, ratePerQuintal, isPremium, premiumPercent, grossValueInr, netValueInr, transportCostInr,
flags[], …}`. MSP options also carry `queueCount, estimatedWaitMinutes, capacityPct, remainingQuintal,
paymentEn/Hi`; MARKET options carry `remainingQuintal, operatingHours, settlementEn/Hi, noteEn/Hi`.

**Flags**: `BEST_OVERALL` (best net value), `BEST_MSP` (cheapest MSP wait among MSP options),
`BEST_PRICE` (top ₹/q among several market buyers).

**Market booking object**: `{id, reference(SSB-xxxx), status: CONFIRMED|CANCELLED, quantityQuintal,
agreedRatePerQuintal, grossValueInr, crop, buyer, createdAt, timeline}`.

**Selling ranking rule**: `net = gross − (distanceKm × quantity × ₹0.4/km/q)`; options sorted by net
descending, ties by distance. Same transport constant for every channel. Deliberately **not ML**.

## Officer (bound to their `centreId`)

| Method | Endpoint                            | Body                              | Effect                                                        |
| ------ | ----------------------------------- | --------------------------------- | ------------------------------------------------------------- |
| GET    | `/api/officer/dashboard`            | –                                 | `{centre, stats, alerts[], payments{pendingCount,pendingAmountInr,paidCount,paidAmountInr}, serving[], nextWaiting[]}` |
| GET    | `/api/officer/queue`                | –                                 | `{centre, queue:[{position, …request, farmer}]}`              |
| GET    | `/api/officer/requests?status=`     | –                                 | `{requests:[…]}` optional status filter                       |
| PATCH  | `/api/officer/requests/:id/status`  | `{action, note?}`                 | `CALL: WAITING→CALLED` · `START: CALLED→PROCESSING` · `COMPLETE: PROCESSING\|CALLED→COMPLETED` (adds stock + opens a `payment` record, status `PENDING`) · `REJECT: WAITING\|CALLED→REJECTED`; farmer notified each time |
| PATCH  | `/api/officer/requests/:id/payment` | `{action: "MARK_PAID", reference?}` | Marks the payment `PAID` (timestamp + reference) and notifies the farmer |
| GET    | `/api/officer/sms-log`              | –                                 | `{provider, smsLog[]}` — SMS outbox; officer sees only own centre's farmers, authority sees all |
| GET    | `/api/officer/centre`               | –                                 | `{centre, stats, alerts}`                                     |
| PATCH  | `/api/officer/centre`               | `{status: OPEN\|PAUSED}`          | Pause/resume intake                                           |
| POST   | `/api/officer/assisted-request`     | `{farmerPhone, farmerName, cropId, quantityQuintals}` | Counter token for walk-in farmers; auto-registers new phones |

## Request object — payment field

Every completed procurement carries a `payment` object on its request:

```json
"payment": {
  "status": "PENDING | PAID",       // PENDING = opened when officer completes procurement
  "amountInr": 96600,               // quantity × crop MSP
  "createdAt": "ISO", "paidAt": "ISO|null", "reference": "UTR string | ''"
}
```

Non-completed requests have `"payment": null`.

## Authority (read-only oversight)

| Method | Endpoint                      | Response                                                        |
| ------ | ----------------------------- | --------------------------------------------------------------- |
| GET    | `/api/authority/overview`     | `{district, totals, centres:[…+stats+procuredQuintals+alerts]}` |
| GET    | `/api/authority/centres/:id`  | `{centre, stats, alerts, recentRequests}`                       |

## Domain model

**Request status lifecycle**

```
WAITING ──CALL──▶ CALLED ──START──▶ PROCESSING ──COMPLETE──▶ COMPLETED
   └──CANCEL──▶ CANCELLED      └────────REJECT (from WAITING/CALLED)──▶ REJECTED
```

`PENDING` exists in the enum for future approval-style flows; fresh requests start at `WAITING`.

**Queue math (transparent, rule-based)**

- Position = index in centre queue ordered by creation sequence (only `WAITING/CALLED/PROCESSING`)
- Estimated wait = `aheadCount × centre.avgProcessingMinutesPerFarmer`
- Recommendation score = `0.45·wait + 0.30·distance + 0.25·capacityUtil` (normalized); only `OPEN`
  centres with `remainingCapacity ≥ quantity` are eligible. Deliberately **not ML**.

**Alerts**: `CAPACITY_CRITICAL ≥90%`, `CAPACITY_HIGH ≥75%`, `QUEUE_LONG ≥10 waiting`, `CENTRE_NOT_OPEN`.
