import { useEffect, useMemo, useState } from 'react';
import Icon from '../components/Icon.jsx';
import { useI18n } from '../i18n/I18nContext.jsx';
import { marketPriceService } from '../services/api/marketPriceService.js';
import { PriceTrendChart, SeasonalityBars } from '../components/PriceTrendChart.jsx';
import { Loading, ErrorState, EmptyState } from '../components/States.jsx';
import { formatInr } from '../utils/format.js';

// Historical mandi prices: Agmarknet monthly panel (2021-2025) served by
// /api/market-prices. Every figure on this page is computed by the backend
// from the CSV extract in backend/src/data/agmarknet - nothing is simulated.
export default function MarketPricesPage() {
  const { t, lang } = useI18n();

  const [meta, setMeta] = useState(null);
  const [metaError, setMetaError] = useState(null);
  const [filters, setFilters] = useState({ commodity: '', state: '', market: '', fromYear: '', toYear: '' });
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showRows, setShowRows] = useState(false);

  // 1. Load the catalogue (commodities/states/markets + provenance).
  useEffect(() => {
    marketPriceService
      .meta()
      .then((m) => {
        setMeta(m);
        const first = m.commodities[0];
        setFilters((f) => ({
          ...f,
          commodity: f.commodity || (first ? first.commodity : ''),
          fromYear: f.fromYear || String(m.coverage.fromYear),
          toYear: f.toYear || String(m.coverage.toYear),
        }));
      })
      .catch(setMetaError);
  }, []);

  const commodityInfo = useMemo(
    () => meta?.commodities.find((c) => c.commodity === filters.commodity) || null,
    [meta, filters.commodity]
  );

  const marketOptions = useMemo(() => {
    if (!meta) return [];
    return meta.markets
      .filter((m) => (!filters.commodity || m.commodity === filters.commodity) && (!filters.state || m.stateName === filters.state))
      .map((m) => m.marketName)
      .filter((v, i, arr) => arr.indexOf(v) === i)
      .sort();
  }, [meta, filters.commodity, filters.state]);

  // 2. Load every view of the current slice in one go.
  useEffect(() => {
    if (!filters.commodity) return;
    const query = {
      commodity: filters.commodity,
      state: filters.state || undefined,
      market: filters.market || undefined,
      fromYear: filters.fromYear || undefined,
      toYear: filters.toYear || undefined,
    };
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all([
      marketPriceService.series(query),
      marketPriceService.seasonality(query),
      marketPriceService.markets({ commodity: query.commodity, fromYear: query.fromYear, toYear: query.toYear }),
      marketPriceService.yearly(query),
      marketPriceService.rows({ ...query, limit: 600 }),
    ])
      .then(([series, season, markets, yearly, rows]) => {
        if (!cancelled) setData({ series, season, markets, yearly, rows });
      })
      .catch((e) => !cancelled && setError(e))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [filters.commodity, filters.state, filters.market, filters.fromYear, filters.toYear]);

  function update(patch) {
    setFilters((f) => {
      const next = { ...f, ...patch };
      // Changing commodity/state can invalidate the chosen market.
      if (patch.commodity !== undefined || patch.state !== undefined) next.market = '';
      return next;
    });
  }

  function downloadCsv() {
    if (!data?.rows?.rows?.length) return;
    const header = [
      'state_name', 'market_name', 'district', 'commodity', 'year', 'month',
      'arrivals_mt', 'modal_price_avg', 'min_price_avg', 'max_price_avg', 'n_obs', 'mandi_id',
    ];
    const lines = [header.join(',')];
    for (const r of data.rows.rows) {
      lines.push([
        r.stateName, `"${r.marketName}"`, r.district, r.commodity, r.year, r.month,
        r.arrivalsMt, r.modalPriceAvg, r.minPriceAvg, r.maxPriceAvg, r.nObs, r.mandiId,
      ].join(','));
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `agmarknet_${filters.commodity}_${filters.fromYear}_${filters.toYear}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (metaError) return <ErrorState error={metaError} onRetry={() => window.location.reload()} />;
  if (!meta) return <Loading />;

  const src = meta.source?.source;
  const summary = data?.series?.summary;
  const season = data?.season;

  return (
    <>
      <div className="page-head">
        <div>
          <h1 style={{ marginBottom: '0.15rem' }}>{t('prices.title')}</h1>
          <p style={{ margin: 0, color: 'var(--c-text-soft)', fontSize: '0.92rem' }}>{t('prices.subtitle')}</p>
        </div>
        <span className="badge info">
          <Icon name="chart" size={14} /> {t('prices.realData')}
        </span>
      </div>

      {/* Provenance: this dataset is real, and here is exactly where it came from. */}
      <div className="card source-note">
        <p style={{ margin: 0 }}>
          <Icon name="info" size={15} />{' '}
          {t('prices.sourceLine', {
            rows: meta.coverage.rowCount,
            markets: meta.coverage.seriesCount,
            from: meta.coverage.fromPeriod,
            to: meta.coverage.toPeriod,
            obs: meta.coverage.dailyObservations.toLocaleString('en-IN'),
          })}
        </p>
        {src && (
          <p style={{ margin: '0.35rem 0 0', fontSize: '0.85rem', color: 'var(--c-text-soft)' }}>
            {t('prices.sourceRepo')}:{' '}
            <a href={src.repository} target="_blank" rel="noreferrer">
              {src.repository.replace('https://github.com/', '')}
            </a>{' '}
            · <code>{src.file}</code> · {t('prices.sourceUpstream', { n: src.upstreamRows.toLocaleString('en-IN') })}
          </p>
        )}
      </div>

      {/* Filter -> aggregate -> API -> chart */}
      <div className="card filters">
        <div className="field">
          <label htmlFor="f-commodity">{t('prices.commodity')}</label>
          <select id="f-commodity" className="select" value={filters.commodity} onChange={(e) => update({ commodity: e.target.value })}>
            {meta.commodities.map((c) => (
              <option key={c.commodity} value={c.commodity}>
                {lang === 'hi' ? c.nameHi : c.nameEn}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="f-state">{t('prices.state')}</label>
          <select id="f-state" className="select" value={filters.state} onChange={(e) => update({ state: e.target.value })}>
            <option value="">{t('prices.allStates')}</option>
            {(commodityInfo?.states || meta.states).map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="f-market">{t('prices.market')}</label>
          <select id="f-market" className="select" value={filters.market} onChange={(e) => update({ market: e.target.value })}>
            <option value="">{t('prices.allMarkets')}</option>
            {marketOptions.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="f-from">{t('prices.fromYear')}</label>
          <select id="f-from" className="select" value={filters.fromYear} onChange={(e) => update({ fromYear: e.target.value })}>
            {yearRange(meta).map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="f-to">{t('prices.toYear')}</label>
          <select id="f-to" className="select" value={filters.toYear} onChange={(e) => update({ toYear: e.target.value })}>
            {yearRange(meta).map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      {loading && <Loading />}
      {error && <ErrorState error={error} onRetry={() => update({})} />}

      {!loading && !error && data && (!summary || data.series.points.length === 0) && (
        <EmptyState title={t('prices.noData')} hint={t('prices.noDataHint')} />
      )}

      {!loading && !error && summary && (
        <>
          <div className="grid stats">
            <div className="stat">
              <div className="num">{formatInr(Math.round(summary.latest.modalPrice))}</div>
              <div className="lbl">{t('prices.latestPrice', { period: summary.latest.period })}</div>
            </div>
            <div className="stat info">
              <div className="num">{formatInr(Math.round(summary.last12MonthAverage))}</div>
              <div className="lbl">{t('prices.avg12')}</div>
            </div>
            <div className="stat ok">
              <div className="num">{formatInr(Math.round(summary.maxPrice))}</div>
              <div className="lbl">{t('prices.peak', { period: summary.peak.period })}</div>
            </div>
            <div className="stat warn">
              <div className="num">{formatInr(Math.round(summary.minPrice))}</div>
              <div className="lbl">{t('prices.trough', { period: summary.trough.period })}</div>
            </div>
            <div className={`stat ${summary.changePercent >= 0 ? 'ok' : 'bad'}`}>
              <div className="num">{summary.changePercent >= 0 ? '+' : ''}{summary.changePercent}%</div>
              <div className="lbl">{t('prices.change', { from: summary.earliest.period, to: summary.latest.period })}</div>
            </div>
            <div className="stat">
              <div className="num">{summary.months}</div>
              <div className="lbl">{t('prices.monthsCovered', { obs: summary.dailyObservations })}</div>
            </div>
          </div>

          <div className="card">
            <h2 style={{ marginTop: 0, fontSize: '1.05rem' }}>
              {t('prices.trendTitle')}
              <span className="chart-legend">
                <span className="k line" /> {t('prices.legendModal')}
                <span className="k band" /> {t('prices.legendBand')}
                <span className="k bar" /> {t('prices.legendArrivals')}
              </span>
            </h2>
            <PriceTrendChart points={data.series.points} ariaLabel={t('prices.trendAria')} />
          </div>

          <div className="grid two">
            <div className="card">
              <h2 style={{ marginTop: 0, fontSize: '1.05rem' }}>{t('prices.seasonTitle')}</h2>
              {season?.best && (
                <p className="callout">
                  <Icon name="star" size={15} />{' '}
                  {t('prices.seasonBest', {
                    month: lang === 'hi' ? season.best.nameHi : season.best.nameEn,
                    price: formatInr(Math.round(season.best.averagePrice)),
                    worst: lang === 'hi' ? season.worst.nameHi : season.worst.nameEn,
                    spread: season.spreadPercent,
                  })}
                </p>
              )}
              <SeasonalityBars months={season?.months || []} bestMonth={season?.best?.month} />
              <p className="foot-note">{t('prices.seasonNote')}</p>
            </div>

            <div className="card">
              <h2 style={{ marginTop: 0, fontSize: '1.05rem' }}>{t('prices.yearTitle')}</h2>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>{t('prices.year')}</th>
                      <th>{t('prices.avgPrice')}</th>
                      <th>{t('prices.range')}</th>
                      <th>{t('prices.arrivals')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.yearly.years.map((y) => (
                      <tr key={y.year}>
                        <td>{y.year}</td>
                        <td className="mono">{formatInr(Math.round(y.averagePrice))}</td>
                        <td className="mono soft">
                          {Math.round(y.minPrice).toLocaleString('en-IN')}–{Math.round(y.maxPrice).toLocaleString('en-IN')}
                        </td>
                        <td className="mono">{Math.round(y.arrivalsMt).toLocaleString('en-IN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="foot-note">{t('prices.yearNote')}</p>
            </div>
          </div>

          <div className="card">
            <h2 style={{ marginTop: 0, fontSize: '1.05rem' }}>{t('prices.compareTitle')}</h2>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>{t('prices.market')}</th>
                    <th>{t('prices.state')}</th>
                    <th>{t('prices.avg12')}</th>
                    <th>{t('prices.periodAvg')}</th>
                    <th>{t('prices.latest')}</th>
                    <th>{t('prices.months')}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.markets.markets.map((m, i) => (
                    <tr key={`${m.stateName}-${m.marketName}`} className={filters.market === m.marketName ? 'row-active' : ''}>
                      <td>
                        {i === 0 && <span className="badge success" style={{ marginRight: '0.4rem' }}>{t('prices.topPaying')}</span>}
                        <button className="linkish" type="button" onClick={() => update({ state: m.stateName, market: m.marketName })}>
                          {m.marketName}
                        </button>
                        {m.district && <div className="soft small">{m.district}</div>}
                      </td>
                      <td>{m.stateName}</td>
                      <td className="mono">{formatInr(Math.round(m.last12MonthAverage))}</td>
                      <td className="mono">{formatInr(Math.round(m.averagePrice))}</td>
                      <td className="mono">
                        {formatInr(Math.round(m.latestPrice))} <span className="soft small">{m.latestPeriod}</span>
                      </td>
                      <td className="mono">{m.months}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="foot-note">{t('prices.compareNote')}</p>
          </div>

          <div className="card">
            <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <button className="btn btn-outline btn-sm" type="button" onClick={() => setShowRows((v) => !v)}>
                <Icon name="list" size={15} /> {showRows ? t('prices.hideRows') : t('prices.showRows', { n: data.rows.total })}
              </button>
              <button className="btn btn-outline btn-sm" type="button" onClick={downloadCsv}>
                <Icon name="fileText" size={15} /> {t('prices.downloadCsv')}
              </button>
            </div>
            {showRows && (
              <div className="table-wrap" style={{ marginTop: '0.8rem', maxHeight: '340px', overflowY: 'auto' }}>
                <table>
                  <thead>
                    <tr>
                      <th>state_name</th>
                      <th>market_name</th>
                      <th>commodity</th>
                      <th>year</th>
                      <th>month</th>
                      <th>arrivals_mt</th>
                      <th>modal_price_avg</th>
                      <th>n_obs</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.rows.rows.map((r) => (
                      <tr key={`${r.marketName}-${r.commodity}-${r.year}-${r.month}`}>
                        <td>{r.stateName}</td>
                        <td>{r.marketName}</td>
                        <td>{r.commodity}</td>
                        <td className="mono">{r.year}</td>
                        <td className="mono">{r.month}</td>
                        <td className="mono">{r.arrivalsMt.toLocaleString('en-IN')}</td>
                        <td className="mono">{r.modalPriceAvg.toLocaleString('en-IN')}</td>
                        <td className="mono">{r.nObs}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <p className="foot-note">{t('prices.rowsNote')}</p>
          </div>
        </>
      )}
    </>
  );
}

function yearRange(meta) {
  const out = [];
  for (let y = meta.coverage.fromYear; y <= meta.coverage.toYear; y += 1) out.push(String(y));
  return out;
}
