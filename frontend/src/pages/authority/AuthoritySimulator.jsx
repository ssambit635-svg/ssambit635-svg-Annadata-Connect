import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../../i18n/I18nContext.jsx';
import { authorityService, referenceService } from '../../services/api/farmerService.js';
import { StatusBadge } from '../../components/StatusBadge.jsx';
import Icon from '../../components/Icon.jsx';
import { waitText } from '../../utils/format.js';

// District-level "what-if" planner for procurement. Everything shown here is the
// deterministic projection returned by POST /api/authority/simulator, computed
// from current centre state — capacity, storage, queue, processing rate,
// operating hours and recorded arrival history. It is a planning estimate,
// never a prediction of real-world arrivals (see the note under the results).

const NUM = new Intl.NumberFormat('en-IN');

function localDateStr() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

function fmtQ(n) {
  return NUM.format(Math.round(n * 10) / 10);
}

const LEVEL_TONE = { OVERLOADED: 'bad', CRITICAL: 'warn', HIGH: 'high', OK: 'ok', INTAKE_OFF: 'off' };
const LEVEL_KEY = {
  OVERLOADED: 'lvlOverloaded',
  CRITICAL: 'lvlCritical',
  HIGH: 'lvlHigh',
  OK: 'lvlOk',
  INTAKE_OFF: 'lvlIntakeOff',
};
const BAR_TONE = (level) => (level === 'OVERLOADED' ? 'bad' : level === 'CRITICAL' || level === 'HIGH' ? 'warn' : '');

function LevelPill({ level }) {
  const { t } = useI18n();
  return <span className={`sim-pill ${LEVEL_TONE[level] || 'off'}`}>{t(`simulator.${LEVEL_KEY[level] || 'lvlOk'}`)}</span>;
}

function StatTile({ tone, num, label, sub }) {
  return (
    <div className={`stat ${tone || ''}`}>
      <div className="num">{num}</div>
      <div className="lbl">{label}</div>
      {sub && <div className="lbl" style={{ fontSize: '0.72rem', opacity: 0.85 }}>{sub}</div>}
    </div>
  );
}

function ScenarioPanel({ scenario, setScenario, crops, busy, onRun, onPreset }) {
  const { t, pick } = useI18n();
  return (
    <div className="card sim-panel">
      <div className="sim-card-title">
        <div>
          <h2 style={{ margin: 0 }}>{t('simulator.scenarioTitle')}</h2>
          <p style={{ margin: '0.15rem 0 0', color: 'var(--c-text-soft)', fontSize: '0.85rem' }}>{t('simulator.scenarioHint')}</p>
        </div>
        <Icon name="activity" size={26} />
      </div>

      <div className="sim-form-grid">
        <div className="field">
          <label htmlFor="sim-farmers">{t('simulator.farmers')}</label>
          <input
            id="sim-farmers"
            className="input"
            type="number"
            min={0}
            max={100000}
            step={1}
            inputMode="numeric"
            value={scenario.farmers}
            onChange={(e) => setScenario({ ...scenario, farmers: e.target.value })}
            placeholder="0"
          />
          <div className="hint">{t('simulator.farmersHint')}</div>
        </div>
        <div className="field">
          <label htmlFor="sim-crop">{t('simulator.crop')}</label>
          <select id="sim-crop" className="select" value={scenario.crop} onChange={(e) => setScenario({ ...scenario, crop: e.target.value })}>
            <option value="">{t('simulator.cropAny')}</option>
            {crops.map((c) => (
              <option key={c.id} value={c.id}>{pick(c, 'name')}</option>
            ))}
          </select>
          <div className="hint">{t('simulator.cropHint')}</div>
        </div>
        <div className="field">
          <label htmlFor="sim-qty">{t('simulator.qty')}</label>
          <input
            id="sim-qty"
            className="input"
            type="number"
            min={0}
            max={100000000}
            step={1}
            inputMode="numeric"
            value={scenario.qty}
            onChange={(e) => setScenario({ ...scenario, qty: e.target.value })}
            placeholder="0"
          />
          <div className="hint">{t('simulator.qtyHint')}</div>
        </div>
        <div className="field">
          <label htmlFor="sim-pct">{t('simulator.pct')}</label>
          <input
            id="sim-pct"
            className="input"
            type="number"
            min={0}
            max={300}
            step={1}
            inputMode="numeric"
            value={scenario.pct}
            onChange={(e) => setScenario({ ...scenario, pct: e.target.value })}
            placeholder="0"
          />
          <div className="hint">{t('simulator.pctHint')}</div>
        </div>
        <div className="field">
          <label htmlFor="sim-date">{t('simulator.date')}</label>
          <input
            id="sim-date"
            className="input"
            type="date"
            value={scenario.date}
            onChange={(e) => setScenario({ ...scenario, date: e.target.value })}
          />
        </div>
      </div>

      <div className="sim-actions">
        <button type="button" className="btn btn-primary" onClick={onRun} disabled={busy}>
          {busy ? <><span className="spinner sm" aria-hidden="true" /> {t('simulator.running')}</> : <><Icon name="activity" size={16} /> {t('simulator.run')}</>}
        </button>
        <button type="button" className="btn btn-outline" onClick={() => setScenario({ farmers: '', qty: '', pct: '', crop: '', date: localDateStr() })} disabled={busy}>
          {t('simulator.reset')}
        </button>
        <span className="sim-preset-label">{t('simulator.presets')}:</span>
        <button type="button" className="btn btn-outline btn-sm" disabled={busy} onClick={() => onPreset({ farmers: '100', qty: '', pct: '10' })}>
          {t('simulator.presetModerate')}
        </button>
        <button type="button" className="btn btn-outline btn-sm" disabled={busy} onClick={() => onPreset({ farmers: '300', qty: '500', pct: '25' })}>
          {t('simulator.presetHeavy')}
        </button>
      </div>
    </div>
  );
}

// Two labelled bars — CURRENT vs SIMULATED — with the simulation band colour.
function UtilBars({ cur, sim, level }) {
  const { t } = useI18n();
  const pct = Math.min(100, Math.max(0, sim));
  return (
    <div className="sim-bars">
      <div className="sim-bar-row">
        <span className="sim-dot cur" aria-hidden="true" />
        <span className="sim-bar-lbl">{t('simulator.cur')} · {cur}%</span>
        <div className="bar"><span style={{ width: `${Math.min(100, cur)}%` }} /></div>
      </div>
      <div className="sim-bar-row">
        <span className="sim-dot go" aria-hidden="true" />
        <span className="sim-bar-lbl">{t('simulator.sim')} · {sim}%</span>
        <div className={`bar ${BAR_TONE(level)}`}><span style={{ width: `${pct}%` }} /></div>
      </div>
    </div>
  );
}

function CentreCard({ c }) {
  const { t, pick } = useI18n();
  const s = c.simulated;
  const out = (c.suggested || [])[0];
  return (
    <div className={`card sim-centre ${s.level === 'OVERLOADED' ? 'is-bad' : s.level === 'CRITICAL' ? 'is-warn' : ''}`}>
      <div className="sim-centre-head">
        <strong>{pick(c.centre, 'name')}</strong>
        <span className="sim-pill-row">
          <StatusBadge status={c.centre.status} />
          <LevelPill level={s.level} />
        </span>
      </div>

      {!c.intake && (
        <p className="sim-line warn"><Icon name="ban" size={15} /> {t('simulator.noIntake', { status: t(`status.${c.centre.status}`) })}</p>
      )}

      <div className="sim-metrics">
        <div className="sim-metric">
          <span className="sim-metric-lbl">{t('simulator.queueNow')}</span>
          <b className="mono sim-cur">{c.current.queue}</b>
        </div>
        <div className="sim-metric">
          <span className="sim-metric-lbl">{t('simulator.queueSim')}</span>
          <b className={`mono ${s.queue > c.current.queue ? 'sim-worse' : ''}`}>{c.intake ? s.queue : '—'}</b>
        </div>
        <div className="sim-metric">
          <span className="sim-metric-lbl">{t('simulator.waitNow')}</span>
          <b className="mono sim-cur">{waitText(c.current.waitMinutes, t)}</b>
        </div>
        <div className="sim-metric">
          <span className="sim-metric-lbl">{t('simulator.waitSim')}</span>
          <b className={`mono ${s.waitMinutes > c.current.waitMinutes ? 'sim-worse' : ''}`}>{c.intake ? waitText(s.waitMinutes, t) : '—'}</b>
        </div>
        <div className="sim-metric">
          <span className="sim-metric-lbl">{t('simulator.arrivals')}</span>
          <b className="mono sim-cur">{c.current.arrivals}</b>
        </div>
        <div className="sim-metric">
          <span className="sim-metric-lbl">{t('simulator.arrivals')} · {t('simulator.sim')}</span>
          <b className="mono">{c.intake ? s.arrivals : c.current.arrivals}</b>
        </div>
      </div>

      <div className="sim-storage">
        <div className="sim-row">
          <span className="lbl">{t('simulator.storage')} · {t('simulator.capacity')} {fmtQ(c.centre.capacityQuintals)} {t('common.quintalShort')}</span>
          <span className="mono">
            {fmtQ(c.current.stockQuintals)} <span className="sim-arrow" aria-hidden="true">→</span>{' '}
            <b className={s.overloaded ? 'sim-worse' : ''}>{fmtQ(s.stockQuintals)}</b>
          </span>
        </div>
        <UtilBars cur={c.current.utilizationPct} sim={s.utilizationPct} level={s.level} />
      </div>

      <div className="sim-sub">
        <span><Icon name="users" size={14} /> {t('simulator.activeNow')}: {c.current.active}</span>
        <span><Icon name="clock" size={14} /> {t('officer.processing')}: {c.centre.avgProcessingMinutesPerFarmer} {t('common.min')}</span>
        <span><Icon name="target" size={14} /> {t('simulator.servicePerDay')}: {c.dailyServiceCapacityFarmers}</span>
        {c.intake && <span><Icon name="chart" size={14} /> {t('simulator.avgLot')}: {c.avgQuintalPerFarmer} {t('common.quintalShort')}</span>}
      </div>

      {c.intake && s.extraFarmers > 0 && (
        <p className="sim-addline"><Icon name="plus" size={14} /> {t('simulator.extraFarmers', { n: NUM.format(s.extraFarmers) })}</p>
      )}

      {out ? (
        out.code === 'NO_SPARE_CAPACITY' ? (
          <p className="sim-line bad"><Icon name="alertOctagon" size={16} /> {t('simulator.actionNoSpare', { from: pick(c.centre, 'name') })}</p>
        ) : (
          <p className="sim-line ok">
            <Icon name="arrowUpRight" size={16} style={{ transform: 'rotate(90deg)' }} />
            {t('simulator.actionRedirect', {
              qty: fmtQ(out.quantityQuintal),
              farmers: NUM.format(out.farmers),
              from: pick(c.centre, 'name'),
              to: out.toNameHi || out.toNameEn,
            })}
            {(c.suggested || []).length > 1 && (
              <span className="sim-after">+{c.suggested.length - 1} {t('nav.more').toLowerCase()}</span>
            )}

            <span className="sim-after"> {t('simulator.afterRedirect')}: {c.redirectedAfter.utilizationPct}%</span>
          </p>
        )
      ) : c.intake ? (
        <p className="sim-line none"><Icon name="checkCircle" size={16} /> {t('simulator.suggestNone')}</p>
      ) : null}
    </div>
  );
}

function WarningsCard({ result }) {
  const { t, pick } = useI18n();
  const storageRows = result.centres.filter((c) => c.intake && (c.simulated.level === 'OVERLOADED' || c.simulated.level === 'CRITICAL'));
  const queueRows = result.centres.filter((c) => c.intake && c.simulated.queue >= 10 && !storageRows.includes(c));
  return (
    <div className="card">
      <h2 style={{ marginTop: 0 }}>{t('simulator.alertsTitle')}</h2>
      {storageRows.length === 0 && queueRows.length === 0 ? (
        <p className="ok-line"><Icon name="checkCircle" size={17} /> {t('simulator.noWarnings')}</p>
      ) : (
        <ul className="alert-list">
          {storageRows.map((c) => (
            <li key={c.centre.id + '-cap'} className={c.simulated.level === 'OVERLOADED' ? 'critical' : 'warning'}>
              <Icon name={c.simulated.level === 'OVERLOADED' ? 'alertOctagon' : 'alertTriangle'} size={16} />
              {t('simulator.warningLine', {
                name: pick(c.centre, 'name'),
                stock: fmtQ(c.simulated.stockQuintals),
                capacity: fmtQ(c.centre.capacityQuintals),
                pct: c.simulated.utilizationPct,
              })}
            </li>
          ))}
          {queueRows.map((c) => (
            <li key={c.centre.id + '-queue'} className="warning">
              <Icon name="alertTriangle" size={16} />
              {t('simulator.warningQueue', {
                name: pick(c.centre, 'name'),
                farmers: c.simulated.queue,
                wait: waitText(c.simulated.waitMinutes, t),
              })}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ActionsCard({ result }) {
  const { t, pick } = useI18n();
  const moves = result.recommendations.filter((r) => r.code === 'REDIRECT');
  const noSpare = result.recommendations.filter((r) => r.code === 'NO_SPARE_CAPACITY');
  const withSpace = result.centres
    .filter((c) => c.intake)
    .map((c) => ({ c, free: c.centre.capacityQuintals - c.redirectedAfter.stockQuintals }))
    .filter((x) => x.free > 1)
    .sort((a, b) => b.free - a.free);
  return (
    <div className="card">
      <h2 style={{ marginTop: 0 }}>{t('simulator.actionTitle')}</h2>
      {moves.length === 0 && noSpare.length === 0 ? (
        <p className="ok-line"><Icon name="checkCircle" size={17} /> {t('simulator.noActions')}</p>
      ) : (
        <ul className="sim-reco-list">
          {moves.map((r, i) => (
            <li key={`${r.fromCentreId}-${i}`} className="ok">
              <Icon name="arrowUpRight" size={16} style={{ transform: 'rotate(90deg)' }} />
              <span>
                <strong>{r.fromNameHi || r.fromNameEn}</strong> → <strong>{r.toNameHi || r.toNameEn}</strong>
                <br />
                {t('simulator.actionRedirect', {
                  qty: fmtQ(r.quantityQuintal),
                  farmers: NUM.format(r.farmers),
                  from: '',
                  to: '',
                })}
              </span>
            </li>
          ))}
          {noSpare.map((r, i) => (
            <li key={`${r.fromCentreId}-ns-${i}`} className="critical">
              <Icon name="alertOctagon" size={16} />
              <span>{t('simulator.actionNoSpare', { from: r.fromNameHi || r.fromNameEn })}</span>
            </li>
          ))}
        </ul>
      )}

      <h3 style={{ fontSize: '1rem', margin: '0.9rem 0 0.5rem' }}>{t('simulator.availTitle')}</h3>
      {withSpace.length === 0 ? (
        <p style={{ color: 'var(--c-text-soft)', fontSize: '0.85rem' }}><Icon name="info" size={15} /> {t('simulator.noAvail')}</p>
      ) : (
        <ul className="sim-avail-list">
          {withSpace.map(({ c, free }) => (
            <li key={c.centre.id}>
              <span>{pick(c.centre, 'name')}</span>
              <b className="mono">{fmtQ(free)} {t('common.quintalShort')}</b>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ComparisonTable({ result }) {
  const { t, pick } = useI18n();
  return (
    <div className="table-wrap">
      <table className="data">
        <thead>
          <tr>
            <th>{t('authority.centreCol')}</th>
            <th>{t('simulator.cur')} → {t('simulator.sim')}: {t('simulator.arrivals')}</th>
            <th>{t('simulator.queue')}</th>
            <th>{t('simulator.storage')} ({t('common.quintalShort')})</th>
            <th>{t('simulator.utilization')}</th>
            <th>{t('simulator.wait')}</th>
          </tr>
        </thead>
        <tbody>
          {result.centres.map((c) => (
            <tr key={c.centre.id}>
              <td>
                {pick(c.centre, 'name')}
                <div className="sim-table-pill-row"><LevelPill level={c.simulated.level} />{!c.intake && <StatusBadge status={c.centre.status} />}</div>
              </td>
              <td className="mono">{c.current.arrivals} <span className="sim-arrow">→</span> {c.simulated.arrivals}</td>
              <td className="mono">{c.current.queue} <span className="sim-arrow">→</span> {c.intake ? c.simulated.queue : '—'}</td>
              <td className="mono">{fmtQ(c.current.stockQuintals)} <span className="sim-arrow">→</span> <b className={c.simulated.overloaded ? 'sim-worse' : ''}>{fmtQ(c.simulated.stockQuintals)}</b></td>
              <td className="mono">{c.current.utilizationPct}% <span className="sim-arrow">→</span> <b className={c.simulated.overloaded ? 'sim-worse' : ''}>{c.simulated.utilizationPct}%</b></td>
              <td className="mono">{waitText(c.current.waitMinutes, t)} <span className="sim-arrow">→</span> {c.intake ? waitText(c.simulated.waitMinutes, t) : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function AuthoritySimulator() {
  const { t } = useI18n();
  const [crops, setCrops] = useState([]);
  const [scenario, setScenario] = useState({ farmers: '', qty: '', pct: '', crop: '', date: localDateStr() });
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;
    referenceService
      .crops()
      .then((d) => alive && setCrops(d.crops || []))
      .catch(() => { /* optional selector — never blocks the simulator */ });
    return () => { alive = false; };
  }, []);

  function buildPayload(farmers, qty, pct, date, crop) {
    return {
      additionalFarmers: Math.max(0, Math.floor(Number(farmers) || 0)),
      additionalQuantityQuintal: Math.max(0, Number(qty) || 0),
      arrivalsPct: Math.max(0, Math.min(300, Number(pct) || 0)),
      simulationDate: date || localDateStr(),
      cropId: crop || null,
    };
  }

  async function run(payload) {
    setBusy(true);
    setError(null);
    try {
      setResult(await authorityService.simulate(payload));
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }

  function onRun() {
    run(buildPayload(scenario.farmers, scenario.qty, scenario.pct, scenario.date, scenario.crop));
  }

  function onPreset(p) {
    const merged = { ...scenario, ...p };
    setScenario(merged);
    run(buildPayload(merged.farmers, merged.qty, merged.pct, merged.date, merged.crop));
  }

  const atRisk = result ? result.centres.filter((c) => c.simulated.overloaded || c.simulated.level === 'CRITICAL') : [];
  const hasRun = Boolean(result);

  return (
    <>
      <div className="page-head">
        <div>
          <h1 style={{ marginBottom: 0 }}>{t('simulator.title')}</h1>
          <p style={{ margin: 0, color: 'var(--c-text-soft)' }}>{t('simulator.subtitle')}</p>
        </div>
        <Link className="btn btn-outline btn-sm" to="/authority">← {t('authority.overview')}</Link>
      </div>

      <div className="sim-hero"><Icon name="activity" size={17} /> {t('simulator.blurb')}</div>

      <ScenarioPanel scenario={scenario} setScenario={setScenario} crops={crops} busy={busy} onRun={onRun} onPreset={onPreset} />

      {error && (
        <div className="form-banner error" role="alert" style={{ marginBottom: '1rem' }}>
          {t('common.errorGeneric')} {error?.message ? `(${error.message})` : ''}{' '}
          <button type="button" className="text-button" onClick={onRun}>{t('common.retry')}</button>
        </div>
      )}

      {!hasRun && !busy && (
        <div className="card state">
          <span className="state-ico"><Icon name="activity" size={20} /></span>
          <p style={{ margin: 0 }}>{t('simulator.subtitle')}</p>
        </div>
      )}

      {result && (
        <>
          <div className="sim-scenario-strip">
            <Icon name="activity" size={16} />
            <b>{t('simulator.scenarioChip', {
              farmers: NUM.format(result.simulation.additionalFarmers),
              qty: NUM.format(result.simulation.additionalQuantityQuintal),
              pct: result.simulation.arrivalsPct,
            })}</b>
            <span>· {t('simulator.scenarioOn', { date: result.simulation.date })}</span>
            {result.simulation.crop && <span>· {result.simulation.crop.nameEn}</span>}
          </div>

          <div className="grid stats" style={{ marginBottom: '1rem' }}>
            <StatTile tone="info" num={NUM.format(result.totals.expectedArrivals)} label={t('simulator.statArrivals')} sub={`${t('simulator.cur')}: ${NUM.format(result.totals.farmersTodayDistrict)}`} />
            <StatTile num={`${fmtQ(result.totals.projectedStockQuintals)} ${t('common.quintalShort')}`} label={t('simulator.statLoad')} sub={`${t('simulator.capacity')}: ${fmtQ(result.totals.capacityQuintals)} ${t('common.quintalShort')}`} />
            <StatTile
              tone={result.totals.projectedUtilizationPct >= 90 ? 'bad' : result.totals.projectedUtilizationPct >= 75 ? 'warn' : 'ok'}
              num={`${result.totals.projectedUtilizationPct}%`}
              label={t('simulator.statUtil')}
            />
            <StatTile tone={atRisk.length ? 'bad' : ''} num={atRisk.length} label={t('simulator.statAtRisk')} />
            <StatTile tone="ok" num={`${fmtQ(result.totals.freeCapacityQuintals)} ${t('common.quintalShort')}`} label={t('simulator.statSpare')} sub={result.totals.recommendedRedirectQuintals > 0 ? `${t('simulator.actionTitle')}: ${fmtQ(result.totals.recommendedRedirectQuintals)} ${t('common.quintalShort')}` : undefined} />
          </div>

          <div className="grid two" style={{ marginBottom: '1.2rem' }}>
            <WarningsCard result={result} />
            <ActionsCard result={result} />
          </div>

          <h2 style={{ marginBottom: '0.2rem' }}>{t('simulator.centreImpactTitle')}</h2>
          <div className="grid two" style={{ marginBottom: '1.2rem' }}>
            {result.centres.map((c) => <CentreCard key={c.centre.id} c={c} />)}
          </div>

          <h2 style={{ marginBottom: '0.4rem' }}>{t('simulator.comparisonTitle')}</h2>
          <div className="sim-note"><Icon name="info" size={16} />
            <span>{t('simulator.queueNote')}</span>
          </div>
          <div className="sim-note"><Icon name="info" size={16} />
            <span>
              {t('simulator.methodNote')}{' '}
              {result.baseline.historyDays >= 2
                ? t('simulator.historyNote', { days: result.baseline.historyDays })
                : t('simulator.historyTodayOnly')}
            </span>
          </div>
          <div className="sim-note" style={{ marginBottom: '0.8rem' }}><Icon name="info" size={16} />
            <span>{t('simulator.bands')}</span>
          </div>
          <ComparisonTable result={result} />
        </>
      )}
    </>
  );
}
