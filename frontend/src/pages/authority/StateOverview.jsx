import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../../i18n/I18nContext.jsx';
import { usePoll } from '../../hooks/usePoll.js';
import { authorityService } from '../../services/api/farmerService.js';
import { Loading, ErrorState } from '../../components/States.jsx';
import { StatusBadge } from '../../components/StatusBadge.jsx';
import Icon from '../../components/Icon.jsx';
import { formatInr } from '../../utils/format.js';
import { MCard, SectionH } from '../../mobile/ui.jsx';
import { ArtMandi, ArtScales } from '../../mobile/art.jsx';
import { TrendChart, HBars, Donut, PipelineFlow } from '../../components/Charts.jsx';

// The authority-only State Command Centre: whole-state procurement on one
// screen with heavy charts — 7-day trend, district comparisons, crop mix,
// the live pipeline flowchart — and a one-tap drill-down into every district.
export default function StateOverview() {
  const { t, pick, lang } = useI18n();
  const { data, error, loading, reload, refreshing } = usePoll(() => authorityService.stateOverview(), { intervalMs: 15000 });
  const [districtName, setDistrictName] = useState(null);
  const [districtData, setDistrictData] = useState(null);
  const [districtError, setDistrictError] = useState(null);
  const [districtLoading, setDistrictLoading] = useState(false);

  async function openDistrict(name) {
    setDistrictName(name);
    setDistrictError(null);
    setDistrictLoading(true);
    setDistrictData(null);
    try {
      const d = await authorityService.overview(name);
      setDistrictData(d);
    } catch (e) {
      setDistrictError(e);
    } finally {
      setDistrictLoading(false);
    }
  }

  function closeDistrict() {
    setDistrictName(null);
    setDistrictData(null);
    setDistrictError(null);
  }

  if (loading) return <Loading />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  const { totals, districts, trend, cropMix, pipeline, asOf, homeDistrict } = data;
  const asOfStr = asOf ? new Date(asOf).toLocaleString(lang === 'en' ? 'en-IN' : lang === 'hi' ? 'hi-IN' : 'or-IN', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' }) : '—';

  const cropSegments = cropMix.map((m) => ({ label: pick(m.crop, 'name'), value: m.quintals }));
  const pipelineStages = [
    { key: 'waiting', label: t('authority.pipelineStage.waiting'), count: pipeline.waiting, tone: 'gold' },
    { key: 'called', label: t('authority.pipelineStage.called'), count: pipeline.called, tone: 'blue' },
    { key: 'processing', label: t('authority.pipelineStage.processing'), count: pipeline.processing, tone: 'slate' },
    { key: 'completed', label: t('authority.pipelineStage.completed'), count: pipeline.completedToday, tone: 'green' },
    { key: 'rejected', label: t('authority.pipelineStage.rejected'), count: pipeline.rejectedToday, tone: 'red' },
  ];

  return (
    <div>
      {/* ── header ── */}
      <div className="page-head">
        <div>
          <h1><Icon name="activity" size={22} /> {t('authority.stateMonitor')}</h1>
          <p className="page-sub page-sub-meta">
            <span>{t('authority.stateSub')}</span>
            <span><Icon name="clock" size={13} /> {t('authority.asOf')} {asOfStr}</span>
          </p>
        </div>
        <div className="page-head-actions">
          {districtName && (
            <button className="btn btn-outline btn-sm" onClick={closeDistrict}>← {t('authority.stateView')}</button>
          )}
          <Link className="btn btn-outline btn-sm" to="/authority"><Icon name="grid" size={14} /> {t('nav.overview')}</Link>
          <button className="btn btn-outline btn-sm" onClick={reload} disabled={refreshing}><Icon name="refresh" size={14} /> {t('common.refresh')}</button>
        </div>
      </div>

      {/* ── state KPIs ── */}
      <div className="kpi-grid">
        <div className="m-stat gold"><div className="m-stat-num">{totals.farmersToday}</div><div className="m-stat-lbl">{t('authority.totalFarmersToday')}</div></div>
        <div className="m-stat"><div className="m-stat-num">{totals.waiting}</div><div className="m-stat-lbl">{t('authority.waitingNow')}</div></div>
        <div className="m-stat"><div className="m-stat-num">{totals.procuredQuintals.toLocaleString('en-IN')}</div><div className="m-stat-lbl">{t('authority.totalProcured')} ({t('common.quintalShort')})</div></div>
        <div className="m-stat"><div className="m-stat-num">{formatInr(totals.procuredValueInr)}</div><div className="m-stat-lbl">{t('authority.procuredValue')}</div></div>
        <div className="m-stat"><div className="m-stat-num">{formatInr(totals.paidValueInr)}</div><div className="m-stat-lbl">{t('authority.paidValue')}</div></div>
        <div className="m-stat"><div className="m-stat-num">{totals.openCentres}/{totals.totalCentres}</div><div className="m-stat-lbl">{t('authority.centresOpen')}</div></div>
        <div className="m-stat"><div className="m-stat-num">{totals.registeredFarmers}</div><div className="m-stat-lbl">{t('authority.registeredFarmers')}</div></div>
        <div className="m-stat warning"><div className="m-stat-num">{totals.alerts}</div><div className="m-stat-lbl">{t('authority.alertsCount')}</div></div>
      </div>

      {/* ── district drill-down panel ── */}
      {districtName && (
        <MCard plain style={{ marginBottom: 16, borderColor: 'rgba(22, 101, 52, 0.35)' }}>
          <div className="m-card-h m-card-h-split">
            <span><Icon name="grid" size={18} /> {t('authority.districtView')}: <strong style={{ color: 'var(--m-green-forest)' }}>{districtName}</strong></span>
            <button type="button" className="text-button" onClick={closeDistrict}>← {t('authority.stateView')}</button>
          </div>
          {districtLoading && <Loading label={t('common.loading')} />}
          {districtError && <div className="form-banner error">{districtError.message}</div>}
          {districtData && (
            <>
              <div className="kpi-grid compact">
                <div className="m-stat"><div className="m-stat-num">{districtData.totals.farmersToday}</div><div className="m-stat-lbl">{t('authority.totalFarmersToday')}</div></div>
                <div className="m-stat"><div className="m-stat-num">{districtData.totals.waiting}</div><div className="m-stat-lbl">{t('authority.totalWaiting')}</div></div>
                <div className="m-stat"><div className="m-stat-num">{districtData.totals.procuredQuintals}</div><div className="m-stat-lbl">{t('authority.totalProcured')} ({t('common.quintalShort')})</div></div>
                <div className="m-stat"><div className="m-stat-num">{formatInr(districtData.totals.procuredValueInr)}</div><div className="m-stat-lbl">{t('authority.procuredValue')}</div></div>
                <div className="m-stat warning"><div className="m-stat-num">{districtData.totals.alerts}</div><div className="m-stat-lbl">{t('authority.alertsCol')}</div></div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {districtData.centres.map((c) => (
                  <Link
                    key={c.id}
                    to={`/authority/centres/${c.id}`}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                      background: 'var(--m-cream)', border: '1px solid var(--m-line)',
                      borderRadius: 12, textDecoration: 'none', color: 'var(--m-ink)',
                    }}
                  >
                    <span className="quick-ico" style={{ width: 34, height: 34 }}><Icon name="store" size={17} /></span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <strong style={{ display: 'block', fontSize: 13.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{pick(c, 'name')}</strong>
                      <span style={{ fontSize: 12, color: 'var(--m-ink-soft)' }}>
                        {c.stats.waiting} {t('farmer.farmersWaiting')} · {c.capacityPct}% {t('authority.capacityUsed')}
                      </span>
                    </span>
                    <StatusBadge status={c.status} />
                    {c.alerts.length > 0 && <span className="badge warning">{c.alerts.length} {t('authority.alertsCol')}</span>}
                    <Icon name="arrowUpRight" size={15} style={{ color: 'var(--m-ink-faint)' }} />
                  </Link>
                ))}
              </div>
            </>
          )}
        </MCard>
      )}

      {/* ── trend + pipeline ── */}
      <div className="grid two">
        <MCard plain>
          <SectionH title={t('authority.trendTitle')} hint={t('authority.trendHint')} art={<Icon name="chart" size={22} />} />
          <TrendChart points={trend} ariaLabel={t('authority.trendHint')} />
          <div style={{ display: 'flex', gap: 14, marginTop: 8, fontSize: 12, color: 'var(--m-ink-soft)', fontWeight: 600, flexWrap: 'wrap' }}>
            <span><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 3, background: '#166534', marginRight: 5 }} />{t('authority.trendQuintals')}</span>
            <span><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 3, background: '#b9d9c2', marginRight: 5 }} />{t('authority.trendFarmers')}</span>
          </div>
        </MCard>

        <MCard plain>
          <SectionH title={t('authority.pipelineTitle')} hint={t('authority.pipelineHint')} art={<ArtScales size={28} />} />
          <PipelineFlow stages={pipelineStages} ariaLabel={t('authority.pipelineHint')} />
          <div style={{ marginTop: 14 }}>
            <SectionH title={t('authority.cropMixTitle')} hint={t('authority.cropMixHint')} art={<ArtMandi size={26} />} />
            <Donut segments={cropSegments} formatValue={(v) => v.toLocaleString('en-IN')} ariaLabel={t('authority.cropMixHint')} />
          </div>
        </MCard>
      </div>

      {/* ── districts ── */}
      <div style={{ marginTop: 16 }}>
        <SectionH title={t('authority.districtsTitle')} art={<Icon name="grid" size={24} />} />
        <MCard plain>
          <HBars
            items={districts}
            labelFor={(d) => d.name}
            valueFor={(d) => d.totals.procuredQuintals}
            pctFor={(d) => `${d.totals.procuredQuintals.toLocaleString('en-IN')} q · ${d.capacityPct}%`}
            colorFor={(d) => (d.name === homeDistrict ? '#c79a2e' : '#166534')}
            ariaLabel={t('authority.districtsTitle')}
          />
          <div className="district-grid">
            {districts.map((d) => (
              <button
                type="button"
                key={d.name}
                onClick={() => openDistrict(d.name)}
                className={`district-card${d.name === homeDistrict ? ' is-home' : ''}`}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'space-between' }}>
                  <strong style={{ fontSize: 14.5, color: 'var(--m-green-forest)' }}>{d.name}</strong>
                  {d.name === homeDistrict && <span className="m-badge" style={{ background: 'var(--m-gold-soft)', color: 'var(--m-gold-deep)' }}>{t('authority.homeDistrictTag')}</span>}
                </span>
                <span style={{ fontSize: 12.5, color: 'var(--m-ink-soft)' }}>
                  {d.totals.farmersToday} {t('authority.districtFarmers')} · {d.totals.waiting} {t('authority.districtWaiting')}
                </span>
                <span style={{ fontSize: 12.5, color: 'var(--m-ink-soft)' }}>
                  {d.totals.procuredQuintals} {t('common.quintalShort')} {t('authority.districtProcured')} · {d.totals.openCentres}/{d.totals.totalCentres} {t('authority.centresOpen')}
                  {d.totals.alerts > 0 ? ` · ${d.totals.alerts} ${t('authority.alertsCol')}` : ''}
                </span>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--m-green)' }}>
                  {t('authority.viewDistrict')} <Icon name="arrowUpRight" size={13} />
                </span>
              </button>
            ))}
          </div>
        </MCard>
      </div>
    </div>
  );
}
