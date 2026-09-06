// Procurement Simulator — Annadata Saathi (mobile) authority module.
// Same scenario engine and API as the website; the phone-first layout stacks
// inputs, district impact, warnings, centre impact cards and the honest-note.
import { useEffect, useRef, useState } from 'react';
import { useI18n } from '../../i18n/I18nContext.jsx';
import { authorityService, referenceService } from '../../services/api/farmerService.js';
import Icon from '../../components/Icon.jsx';
import { waitText } from '../../utils/format.js';
import { MCard, MBtn, MField, MInput, MSelect, MStat, MBar, MBadge, MLoader, MError, SectionH } from '../ui.jsx';
import { ArtMandi } from '../art.jsx';

const NUM = new Intl.NumberFormat('en-IN');
const TONE = { OVERLOADED: 'danger', CRITICAL: 'warning', HIGH: 'warning', OK: 'success', INTAKE_OFF: 'neutral' };
const LEVEL_KEY = { OVERLOADED: 'lvlOverloaded', CRITICAL: 'lvlCritical', HIGH: 'lvlHigh', OK: 'lvlOk', INTAKE_OFF: 'lvlIntakeOff' };

function localDateStr() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

function fmtQ(n) {
  return NUM.format(Math.round(n * 10) / 10);
}

function Pill({ level }) {
  const { t } = useI18n();
  return <MBadge tone={TONE[level] || 'neutral'}>{t(`simulator.${LEVEL_KEY[level] || 'lvlOk'}`)}</MBadge>;
}

function Row({ label, value, strong, worse }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'baseline', padding: '4px 0' }}>
      <span style={{ fontSize: 13, color: 'var(--m-ink-soft)' }}>{label}</span>
      <b className="m-display" style={{ fontSize: 13.5, fontFamily: 'var(--m-f-num)', color: worse ? 'var(--m-red)' : strong ? 'var(--m-green-deep)' : 'inherit' }}>{value}</b>
    </div>
  );
}

function CentreCard({ c }) {
  const { t, pick } = useI18n();
  const s = c.simulated;
  const out = (c.suggested || [])[0];
  return (
    <MCard plain>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <strong style={{ fontSize: 14.5, flex: 1 }}>{pick(c.centre, 'name')}</strong>
        <Pill level={s.level} />
      </div>

      {!c.intake && (
        <div className="m-banner warning" style={{ marginTop: 6 }}>
          <Icon name="ban" size={15} />
          <span>{t('simulator.noIntake', { status: t(`status.${c.centre.status}`) })}</span>
        </div>
      )}

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', margin: '6px 0 2px' }}>
        <MBadge status={c.centre.status} />
      </div>

      <Row label={`${t('simulator.queueNow')} → ${t('simulator.queueSim')}`} value={`${c.current.queue} → ${c.intake ? s.queue : '—'}`} worse={s.queue > c.current.queue} />
      <Row label={`${t('simulator.arrivals')} (${t('simulator.cur')} → ${t('simulator.sim')})`} value={`${c.current.arrivals} → ${c.intake ? s.arrivals : c.current.arrivals}`} />
      <Row label={`${t('simulator.wait')} (${t('simulator.cur')} → ${t('simulator.sim')})`} value={`${waitText(c.current.waitMinutes, t)} → ${c.intake ? waitText(s.waitMinutes, t) : '—'}`} worse={s.waitMinutes > c.current.waitMinutes} />

      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, margin: '8px 0 3px' }}>
        <span style={{ color: 'var(--m-ink-soft)' }}>{t('simulator.storage')}</span>
        <b className="m-display" style={{ fontFamily: 'var(--m-f-num)' }}>
          {fmtQ(c.current.stockQuintals)} → <span style={{ color: s.overloaded ? 'var(--m-red)' : 'inherit' }}>{fmtQ(s.stockQuintals)}</span> {t('common.quintalShort')}
        </b>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <span style={{ fontSize: 11.5, color: 'var(--m-ink-soft)', width: 74, flexShrink: 0 }}>{t('simulator.cur')} {c.current.utilizationPct}%</span>
        <MBar pct={c.current.utilizationPct} height={8} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 11.5, color: 'var(--m-ink-soft)', width: 74, flexShrink: 0 }}>{t('simulator.sim')} {s.utilizationPct}%</span>
        <MBar pct={s.utilizationPct} height={8} />
      </div>
      <p style={{ fontSize: 11.5, color: 'var(--m-ink-faint)', margin: '5px 0 0' }}>
        {t('simulator.capacity')}: {fmtQ(c.centre.capacityQuintals)} {t('common.quintalShort')} · {t('simulator.servicePerDay')}: {c.dailyServiceCapacityFarmers}
      </p>

      {c.intake && s.extraFarmers > 0 && (
        <p style={{ fontSize: 12.5, color: 'var(--m-green-deep)', margin: '6px 0 0' }}>
          <Icon name="plus" size={13} /> {t('simulator.extraFarmers', { n: NUM.format(s.extraFarmers) })}
        </p>
      )}

      {out ? (
        out.code === 'NO_SPARE_CAPACITY' ? (
          <div className="m-banner error" style={{ marginTop: 8 }}>
            <Icon name="alertOctagon" size={15} /> {t('simulator.actionNoSpare', { from: pick(c.centre, 'name') })}
          </div>
        ) : (
          <div className="m-banner success" style={{ marginTop: 8 }}>
            <Icon name="arrowUpRight" size={15} style={{ transform: 'rotate(90deg)' }} />
            <span>
              {t('simulator.actionRedirect', {
                qty: fmtQ(out.quantityQuintal),
                farmers: NUM.format(out.farmers),
                from: pick(c.centre, 'name'),
                to: out.toNameHi || out.toNameEn,
              })}
              {(c.suggested || []).length > 1 ? ` · +${c.suggested.length - 1} ${t('nav.more').toLowerCase()}` : ''}
              {' '}· {t('simulator.afterRedirect')}: {c.redirectedAfter.utilizationPct}%
            </span>
          </div>
        )
      ) : c.intake ? (
        <p style={{ fontSize: 12.5, color: 'var(--m-ink-faint)', margin: '6px 0 0' }}>
          <Icon name="checkCircle" size={13} /> {t('simulator.suggestNone')}
        </p>
      ) : null}
    </MCard>
  );
}

export default function AuthoritySimulator() {
  const { t, pick } = useI18n();
  const [crops, setCrops] = useState([]);
  const [form, setForm] = useState({ farmers: '', qty: '', pct: '', crop: '', date: localDateStr() });
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const busyRef = useRef(false);

  useEffect(() => {
    let alive = true;
    referenceService.crops()
      .then((d) => alive && setCrops(d.crops || []))
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  function payloadOf(f) {
    return {
      additionalFarmers: Math.max(0, Math.floor(Number(f.farmers) || 0)),
      additionalQuantityQuintal: Math.max(0, Number(f.qty) || 0),
      arrivalsPct: Math.max(0, Math.min(300, Number(f.pct) || 0)),
      simulationDate: f.date || localDateStr(),
      cropId: f.crop || null,
    };
  }

  async function run(payload) {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError(null);
    try {
      setResult(await authorityService.simulate(payload));
    } catch (e) {
      setError(e);
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  function preset(p) {
    const merged = { ...form, ...p };
    setForm(merged);
    run(payloadOf(merged));
  }

  const atRisk = result ? result.centres.filter((c) => c.simulated.overloaded || c.simulated.level === 'CRITICAL') : [];
  const moves = result ? result.recommendations.filter((r) => r.code === 'REDIRECT') : [];

  if (busy && !result) return <MLoader label={t('simulator.running')} />;
  if (error && !result) return <MError error={error} onRetry={() => run(payloadOf(form))} />;

  return (
    <div className="m-stagger">
      <MCard plain className="green">
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <ArtMandi size={54} className="m-anim-pop" />
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ fontSize: 18, color: '#fff', fontFamily: 'var(--m-f-display)' }}>{t('simulator.title')}</h2>
            <p style={{ fontSize: 12.5, color: '#cfe2cd' }}>{t('simulator.subtitle')}</p>
          </div>
        </div>
      </MCard>

      {/* Scenario inputs */}
      <MCard>
        <div className="m-card-h"><Icon name="activity" size={19} /> {t('simulator.scenarioTitle')}</div>
        <p style={{ fontSize: 12.5, color: 'var(--m-ink-faint)', marginBottom: 10 }}>{t('simulator.scenarioHint')}</p>
        <MField label={t('simulator.farmers')} hint={t('simulator.farmersHint')} htmlFor="ms-farmers">
          <MInput id="ms-farmers" type="number" min={0} inputMode="numeric" placeholder="0"
            value={form.farmers} onChange={(e) => setForm({ ...form, farmers: e.target.value })} />
        </MField>
        <MField label={t('simulator.crop')} hint={t('simulator.cropHint')} htmlFor="ms-crop">
          <MSelect id="ms-crop" value={form.crop} onChange={(e) => setForm({ ...form, crop: e.target.value })}>
            <option value="">{t('simulator.cropAny')}</option>
            {crops.map((c) => <option key={c.id} value={c.id}>{pick(c, 'name')}</option>)}
          </MSelect>
        </MField>
        <MField label={t('simulator.qty')} hint={t('simulator.qtyHint')} htmlFor="ms-qty">
          <MInput id="ms-qty" type="number" min={0} inputMode="numeric" placeholder="0"
            value={form.qty} onChange={(e) => setForm({ ...form, qty: e.target.value })} />
        </MField>
        <MField label={t('simulator.pct')} hint={t('simulator.pctHint')} htmlFor="ms-pct">
          <MInput id="ms-pct" type="number" min={0} max={300} inputMode="numeric" placeholder="0"
            value={form.pct} onChange={(e) => setForm({ ...form, pct: e.target.value })} />
        </MField>
        <MField label={t('simulator.date')} htmlFor="ms-date">
          <MInput id="ms-date" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
        </MField>
        <MBtn block variant="primary" icon={<Icon name="activity" size={17} />} onClick={() => run(payloadOf(form))} disabled={busy}>
          {busy ? t('simulator.running') : t('simulator.run')}
        </MBtn>
        <div className="m-chip-row" style={{ marginTop: 10 }}>
          <span style={{ fontSize: 12, color: 'var(--m-ink-faint)', padding: '6px 0' }}>{t('simulator.presets')}</span>
          <button type="button" className="m-chip" onClick={() => preset({ farmers: '100', qty: '', pct: '10' })} disabled={busy}>{t('simulator.presetModerate')}</button>
          <button type="button" className="m-chip" onClick={() => preset({ farmers: '300', qty: '500', pct: '25' })} disabled={busy}>{t('simulator.presetHeavy')}</button>
        </div>
      </MCard>

      {error && result && (
        <div className="m-banner error" role="alert">
          <Icon name="alertTriangle" size={15} />
          <span>{t('common.errorGeneric')} <button type="button" className="m-chip" onClick={() => run(payloadOf(form))}>{t('common.retry')}</button></span>
        </div>
      )}

      {result && (
        <>
          <div className="m-stat-grid">
            <MStat num={NUM.format(result.totals.expectedArrivals)} label={t('simulator.statArrivals')} tone="info" />
            <MStat num={`${fmtQ(result.totals.projectedStockQuintals)} ${t('common.quintalShort')}`} label={t('simulator.statLoad')} />
            <MStat num={`${result.totals.projectedUtilizationPct}%`} label={t('simulator.statUtil')} tone={result.totals.projectedUtilizationPct >= 90 ? 'warning' : result.totals.projectedUtilizationPct >= 75 ? 'warning' : 'success'} />
            <MStat num={atRisk.length} label={t('simulator.statAtRisk')} tone={atRisk.length ? 'warning' : 'success'} />
            <MStat num={`${fmtQ(result.totals.freeCapacityQuintals)} ${t('common.quintalShort')}`} label={t('simulator.statSpare')} className="gold" />
          </div>

          <p style={{ fontSize: 12, color: 'var(--m-ink-faint)' }}>
            <Icon name="activity" size={13} /> {t('simulator.scenarioChip', {
              farmers: NUM.format(result.simulation.additionalFarmers),
              qty: NUM.format(result.simulation.additionalQuantityQuintal),
              pct: result.simulation.arrivalsPct,
            })} · {t('simulator.scenarioOn', { date: result.simulation.date })}
          </p>

          <MCard plain>
            <div className="m-card-h"><Icon name="alertTriangle" size={19} /> {t('simulator.alertsTitle')}</div>
            {atRisk.length === 0 && moves.length === 0 ? (
              <p style={{ fontSize: 13.5, color: 'var(--m-ink-faint)' }}><Icon name="checkCircle" size={15} /> {t('simulator.noWarnings')} {t('simulator.noActions')}</p>
            ) : (
              atRisk.map((c) => (
                <div key={c.centre.id + '-cap'} className={`m-banner ${c.simulated.level === 'OVERLOADED' ? 'error' : 'warning'}`} style={{ marginBottom: 8 }}>
                  <Icon name="alertOctagon" size={15} />
                  <span>{t('simulator.warningLine', {
                    name: pick(c.centre, 'name'),
                    stock: fmtQ(c.simulated.stockQuintal || c.simulated.stockQuintals),
                    capacity: fmtQ(c.centre.capacityQuintals),
                    pct: c.simulated.utilizationPct,
                  })}</span>
                </div>
              ))
            )}
            {atRisk.length === 0 && moves.length > 0 && (
              <p style={{ fontSize: 13.5, color: 'var(--m-ink-faint)' }}><Icon name="checkCircle" size={15} /> {t('simulator.noWarnings')}</p>
            )}
          </MCard>

          {moves.length > 0 && (
            <MCard plain>
              <div className="m-card-h"><Icon name="arrowUpRight" size={19} style={{ transform: 'rotate(90deg)' }} /> {t('simulator.actionTitle')}</div>
              {moves.map((r, i) => (
                <div key={i} className="m-banner success" style={{ marginBottom: 8 }}>
                  <Icon name="arrowUpRight" size={15} style={{ transform: 'rotate(90deg)' }} />
                  <span>{t('simulator.actionRedirect', {
                    qty: fmtQ(r.quantityQuintal),
                    farmers: NUM.format(r.farmers),
                    from: r.fromNameHi || r.fromNameEn,
                    to: r.toNameHi || r.toNameEn,
                  })}</span>
                </div>
              ))}
            </MCard>
          )}

          <SectionH title={t('simulator.centreImpactTitle')} art={<ArtMandi size={30} />} />
          {result.centres.map((c) => <CentreCard key={c.centre.id} c={c} />)}

          <MCard plain>
            <div className="m-card-h"><Icon name="info" size={19} /> {t('simulator.comparisonTitle')}</div>
            <p style={{ fontSize: 12.5, color: 'var(--m-ink-faint)', lineHeight: 1.5 }}>
              {t('simulator.queueNote')}
            </p>
            <p style={{ fontSize: 12.5, color: 'var(--m-ink-faint)', lineHeight: 1.5 }}>
              {t('simulator.methodNote')}{' '}
              {result.baseline.historyDays >= 2 ? t('simulator.historyNote', { days: result.baseline.historyDays }) : t('simulator.historyTodayOnly')}
            </p>
            <p style={{ fontSize: 12.5, color: 'var(--m-ink-faint)', lineHeight: 1.5 }}>{t('simulator.bands')}</p>
          </MCard>
        </>
      )}

      {!result && !busy && (
        <MCard plain>
          <p style={{ fontSize: 13.5, color: 'var(--m-ink-faint)', margin: 0 }}>{t('simulator.blurb')}</p>
        </MCard>
      )}
    </div>
  );
}
