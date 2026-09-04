import { api } from './client.js';

// Historical Agmarknet mandi prices (real data, see backend/src/data/agmarknet).
// Query objects are plain { commodity | cropId, state, market, fromYear, toYear }.
function qs(params = {}) {
  const search = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === '') continue;
    search.set(k, String(v));
  }
  const s = search.toString();
  return s ? `?${s}` : '';
}

export const marketPriceService = {
  meta: () => api('/api/market-prices/meta'),
  series: (params) => api(`/api/market-prices/series${qs(params)}`),
  seasonality: (params) => api(`/api/market-prices/seasonality${qs(params)}`),
  markets: (params) => api(`/api/market-prices/markets${qs(params)}`),
  yearly: (params) => api(`/api/market-prices/yearly${qs(params)}`),
  benchmark: (params) => api(`/api/market-prices/benchmark${qs(params)}`),
  rows: (params) => api(`/api/market-prices/rows${qs(params)}`),
};
