import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from './Icon.jsx';
import { useI18n } from '../i18n/I18nContext.jsx';
import { marketPriceService } from '../services/api/marketPriceService.js';
import { PriceTrendChart } from './PriceTrendChart.jsx';
import { formatInr } from '../utils/format.js';

const TONE = { STRONG: 'success', TYPICAL: 'info', WEAK: 'warning' };
const LABEL = { STRONG: 'prices.benchStrong', TYPICAL: 'prices.benchTypical', WEAK: 'prices.benchWeak' };

/**
 * Puts a rate a buyer is offering next to what the crop actually fetched in the
 * mandis, using the historical Agmarknet extract (/api/market-prices).
 * Silently renders nothing while loading or when the crop has no history.
 */
export function PriceBenchmarkCard({ cropId, pricePerQuintal, compact = false }) {
  const { t, pick } = useI18n();
  const [state, setState] = useState({ loading: true, bench: null, series: null, unsupported: false });

  useEffect(() => {
    if (!cropId || !pricePerQuintal) return;
    let cancelled = false;
    setState((s) => ({ ...s, loading: true }));
    Promise.all([
      marketPriceService.benchmark({ cropId, pricePerQuintal }),
      marketPriceService.series({ cropId }),
    ])
      .then(([bench, series]) => {
        if (!cancelled) setState({ loading: false, bench, series, unsupported: false });
      })
      .catch((e) => {
        if (!cancelled) {
          setState({ loading: false, bench: null, series: null, unsupported: e.code === 'NO_HISTORY_FOR_CROP' });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [cropId, pricePerQuintal]);

  if (state.loading) return null;
  if (state.unsupported) {
    return (
      <p className="foot-note">
        <Icon name="info" size={13} /> {t('prices.benchNoData')}
      </p>
    );
  }
  const bench = state.bench;
  if (!bench?.available) return null;

  const points = (state.series?.points || []).slice(-24);
  const tone = TONE[bench.verdict] || 'info';

  return (
    <div className="card price-benchmark">
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <h2 style={{ margin: 0, fontSize: '1rem' }}>
          <Icon name="chart" size={16} /> {t('prices.benchTitle')}
        </h2>
        <span className={`badge ${tone} verdict`}>{t(LABEL[bench.verdict] || 'prices.benchTypical')}</span>
      </div>

      <p style={{ margin: '0.5rem 0 0.4rem' }}>{pick(bench, 'message')}</p>

      <div className="grid stats" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))' }}>
        <div className="stat">
          <div className="num">{formatInr(Math.round(bench.pricePerQuintal))}</div>
          <div className="lbl">{t('smartSell.rate')}</div>
        </div>
        <div className="stat info">
          <div className="num">{formatInr(Math.round(bench.last12MonthAverage))}</div>
          <div className="lbl">{t('prices.avg12')}</div>
        </div>
        <div className={`stat ${bench.vsLast12MonthsPercent >= 0 ? 'ok' : 'bad'}`}>
          <div className="num">{bench.vsLast12MonthsPercent >= 0 ? '+' : ''}{bench.vsLast12MonthsPercent}%</div>
          <div className="lbl">{t('prices.benchVsAvg')}</div>
        </div>
      </div>

      {!compact && points.length > 1 && (
        <div style={{ marginTop: '0.7rem' }}>
          <PriceTrendChart points={points} height={170} showArrivals={false} ariaLabel={t('prices.trendAria')} />
        </div>
      )}

      <p className="foot-note">
        <Link to="/market-prices">{t('prices.title')} →</Link>
      </p>
    </div>
  );
}
