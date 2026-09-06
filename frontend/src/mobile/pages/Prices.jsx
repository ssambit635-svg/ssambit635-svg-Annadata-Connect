// Mandi prices, mobile edition — what the crop actually fetched in real
// Agmarknet mandis: latest price, trend, best month, top-paying mandis.
import { useEffect, useMemo, useState } from 'react';
import { useI18n } from '../../i18n/I18nContext.jsx';
import { marketPriceService } from '../../services/api/marketPriceService.js';
import { formatInr } from '../../utils/format.js';
import Icon from '../../components/Icon.jsx';
import { ArtMandi, ArtRupeeSprout } from '../art.jsx';
import { MCard, MStat, MLoader, MError, MEmpty, MBadge, SectionH } from '../ui.jsx';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function Prices() {
  const { t, pick, lang } = useI18n();
  const [meta, setMeta] = useState(null);
  const [metaError, setMetaError] = useState(null);
  const [commodity, setCommodity] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    marketPriceService.meta()
      .then((m) => {
        if (cancelled) return;
        setMeta(m);
        setCommodity((c) => c || m.commodities[0]?.commodity || '');
      })
      .catch((e) => !cancelled && setMetaError(e));
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!commodity) return undefined;
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all([
      marketPriceService.series({ commodity }),
      marketPriceService.seasonality({ commodity }),
      marketPriceService.markets({ commodity }),
    ])
      .then(([series, season, markets]) => {
        if (!cancelled) setData({ series, season, markets });
      })
      .catch((e) => !cancelled && setError(e))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [commodity]);

  const trend = useMemo(() => {
    const points = (data?.series?.points || []).slice(-24);
    if (points.length < 2) return null;
    const values = points.map((p) => p.modalPrice);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const W = 320;
    const H = 110;
    const x = (i) => 6 + (i * (W - 12)) / (points.length - 1);
    const y = (v) => 10 + (1 - (v - min) / (max - min || 1)) * (H - 26);
    const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.modalPrice).toFixed(1)}`).join(' ');
    const area = `${path} L${x(points.length - 1).toFixed(1)},${H - 4} L${x(0).toFixed(1)},${H - 4} Z`;
    return { points, path, area, min, max, x, y, W, H, last: points[points.length - 1], first: points[0] };
  }, [data]);

  if (metaError) return <MError error={metaError} onRetry={() => window.location.reload()} />;
  if (!meta) return <MLoader />;

  const summary = data?.series?.summary;
  const commodities = meta.commodities;
  const topMarkets = (data?.markets?.markets || data?.markets || []).slice?.(0, 5) || [];
  const seasonMonths = data?.season?.months || [];

  return (
    <div className="m-stagger">
      {/* ── crop chips ── */}
      <div className="m-chip-row" role="group" aria-label={t('prices.commodity')}>
        {commodities.map((c) => (
          <button
            key={c.commodity}
            type="button"
            className={`m-chip ${commodity === c.commodity ? 'active' : ''}`}
            onClick={() => setCommodity(c.commodity)}
          >
            {pick(c, 'name') || c.commodity}
          </button>
        ))}
      </div>

      <MCard plain className="gold">
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <ArtMandi size={64} className="m-anim-pop" />
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: 18, fontFamily: 'var(--m-f-display)' }}>{t('prices.title')}</h2>
            <p style={{ fontSize: 12.5, color: 'var(--m-ink-soft)' }}>{t('prices.subtitle')}</p>
            <span className="m-badge gold" style={{ marginTop: 6 }}>
              <Icon name="checkCircle" size={13} /> {t('prices.realData')}
            </span>
          </div>
        </div>
      </MCard>

      {loading && <MLoader />}
      {error && <MError error={error} onRetry={() => setCommodity((c) => c)} />}

      {!loading && !error && data && (summary ? (
        <>
          {/* ── summary ── */}
          <div className="m-stat-grid">
            <MStat num={formatInr(Math.round(summary.latest.modalPrice))} label={t('prices.latestPrice', { period: summary.latest.period })} />
            <MStat num={formatInr(Math.round(summary.last12MonthAverage))} label={t('prices.avg12')} />
            <MStat
              num={`${summary.changePercent >= 0 ? '+' : ''}${summary.changePercent}%`}
              label={t('prices.change', { from: summary.earliest.period, to: summary.latest.period })}
              tone={summary.changePercent >= 0 ? '' : 'danger'}
            />
            <MStat num={formatInr(Math.round(summary.maxPrice))} label={t('prices.peak', { period: summary.peak.period })} className="gold" />
          </div>

          {/* ── trend sparkline ── */}
          {trend && (
            <MCard plain>
              <div className="m-card-h"><Icon name="chart" size={18} /> {t('prices.trendTitle')}</div>
              <svg className="m-spark" viewBox="0 0 320 118" role="img" aria-label={t('prices.trendAria')}>
                <defs>
                  <linearGradient id="m-spark-fill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#166534" stopOpacity="0.22" />
                    <stop offset="1" stopColor="#166534" stopOpacity="0.02" />
                  </linearGradient>
                </defs>
                <path d={trend.area} fill="url(#m-spark-fill)" />
                <path d={trend.path} fill="none" stroke="#166534" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                {trend.points.map((p, i) => (
                  i === trend.points.length - 1
                    ? <circle key={i} cx={trend.x(i)} cy={trend.y(p.modalPrice)} r="5.5" fill="#fbbf24" stroke="#0f3d22" strokeWidth="2.4" />
                    : null
                ))}
                <text x="6" y="112" fontSize="10" fill="#8a978c" fontWeight="700">{trend.first.period}</text>
                <text x="314" y="112" fontSize="10" fill="#8a978c" fontWeight="700" textAnchor="end">{trend.last.period}</text>
              </svg>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, color: 'var(--m-ink-soft)', fontWeight: 700, marginTop: 4 }}>
                <span>{t('prices.trough', { period: summary.trough.period })}: {formatInr(Math.round(summary.minPrice))}</span>
                <span>~{summary.months} {t('prices.months')}</span>
              </div>
            </MCard>
          )}

          {/* ── best month to sell ── */}
          {seasonMonths.length > 0 && (
            <MCard plain>
              <div className="m-card-h"><ArtRupeeSprout size={30} /> {t('prices.seasonTitle')}</div>
              <div className="m-month-bars">
                {seasonMonths.map((m) => {
                  const has = m.averagePrice !== null && m.averagePrice !== undefined;
                  const values = seasonMonths.filter((x) => x.averagePrice !== null).map((x) => x.averagePrice);
                  const min = Math.min(...values);
                  const max = Math.max(...values);
                  const pct = has && max > min ? 14 + ((m.averagePrice - min) / (max - min)) * 86 : has ? 60 : 3;
                  const best = data.season.best && m.month === data.season.best.month;
                  return (
                    <div key={m.month} className={`m-mb ${best ? 'best' : ''}`} title={has ? formatInr(Math.round(m.averagePrice)) : ''}>
                      <div className="m-mb-bar" style={{ height: `${pct}%` }} />
                      <span className="m-mb-lbl">{(pick(m, 'name') || MONTHS[(m.month - 1 + 12) % 12]).slice(0, 3)}</span>
                    </div>
                  );
                })}
              </div>
              {data.season.best && (
                <p style={{ fontSize: 13, color: 'var(--m-ink-soft)', marginTop: 8 }}>
                  <Icon name="star" size={14} /> {t('prices.seasonNote')}
                </p>
              )}
            </MCard>
          )}

          {/* ── top paying mandis ── */}
          {topMarkets.length > 0 && (
            <>
              <SectionH title={t('prices.compareTitle')} art={<ArtMandi size={30} />} hint={t('prices.topPaying')} />
              <div className="m-stack">
                {topMarkets.map((m, i) => (
                  <div key={`${m.stateName}-${m.marketName}`} className="m-row">
                    <span className={`m-row-ico ${i === 0 ? 'gold' : ''}`}>#{i + 1}</span>
                    <div className="m-row-main">
                      <div className="m-row-title">{m.marketName}</div>
                      <div className="m-row-sub">
                        {m.district || m.stateName} · {formatInr(Math.round(m.latestPrice))} ({m.latestPeriod})
                      </div>
                    </div>
                    <div className="m-row-side">
                      <div className="m-row-amount">{formatInr(Math.round(m.last12MonthAverage))}</div>
                      <div style={{ fontSize: 11, color: 'var(--m-ink-faint)', fontWeight: 700 }}>12m avg</div>
                    </div>
                  </div>
                ))}
              </div>
              <p style={{ fontSize: 12, color: 'var(--m-ink-faint)', textAlign: 'center' }}>{t('prices.compareNote')}</p>
            </>
          )}

          <p style={{ fontSize: 11.5, color: 'var(--m-ink-faint)', textAlign: 'center', marginTop: 4 }}>
            {t('prices.sourceLine', {
              rows: (meta.coverage?.rowCount || 0).toLocaleString('en-IN'),
              markets: meta.coverage?.seriesCount || 0,
              from: meta.coverage?.fromPeriod || '',
              to: meta.coverage?.toPeriod || '',
              obs: (meta.coverage?.dailyObservations || 0).toLocaleString('en-IN'),
            })}
          </p>
        </>
      ) : (
        <MEmpty title={t('prices.benchNoData')} />
      ))}
    </div>
  );
}
