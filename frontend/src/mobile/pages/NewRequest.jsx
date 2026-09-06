// New procurement request — a 3-step guided wizard:
// crop + quantity → best centre → token in hand.
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useI18n } from '../../i18n/I18nContext.jsx';
import { referenceService, requestService } from '../../services/api/farmerService.js';
import { formatInr } from '../../utils/format.js';
import Icon from '../../components/Icon.jsx';
import { ArtWheat, ArtSuccess, ArtSun, ArtMandi } from '../art.jsx';
import { MCard, MBtn, MField, MStepper, MOption, MLoader, MError, TicketCard, SectionH, MBadge } from '../ui.jsx';

export default function NewRequest() {
  const { t, pick } = useI18n();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [crops, setCrops] = useState([]);
  const [cropsError, setCropsError] = useState(null);
  const [form, setForm] = useState({ cropId: '', quantity: '' });
  const [fieldError, setFieldError] = useState('');
  const [reco, setReco] = useState(null);
  const [selected, setSelected] = useState(null);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [apiError, setApiError] = useState(null);

  useEffect(() => {
    referenceService.crops().then((d) => setCrops(d.crops)).catch((e) => setCropsError(e));
  }, []);

  const crop = crops.find((c) => c.id === form.cropId);

  function validateStep1() {
    setFieldError('');
    if (!form.cropId) { setFieldError(t('farmer.selectCrop')); return false; }
    const q = Number(form.quantity);
    if (!q || q < 1 || q > 500) { setFieldError(t('farmer.quantityHint')); return false; }
    return true;
  }

  async function onEvaluate(e) {
    e?.preventDefault();
    if (!validateStep1()) return;
    setBusy(true);
    setApiError(null);
    try {
      const data = await requestService.recommend(form.cropId, Number(form.quantity));
      setReco(data);
      setSelected(data.recommended?.centreId || data.alternatives[0]?.centreId || null);
      setStep(2);
    } catch (err) {
      setApiError(err);
    } finally {
      setBusy(false);
    }
  }

  async function onConfirm() {
    if (!selected) return;
    setBusy(true);
    setApiError(null);
    try {
      const data = await requestService.create({
        cropId: form.cropId,
        quantityQuintals: Number(form.quantity),
        centreId: selected,
      });
      setResult(data);
      setStep(3);
    } catch (err) {
      setApiError(err);
    } finally {
      setBusy(false);
    }
  }

  if (cropsError && step === 1) return <MError error={cropsError} onRetry={() => window.location.reload()} />;

  return (
    <div>
      {/* ── stepper ── */}
      <MCard plain tight style={{ marginBottom: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {['farmer.steps.crop', 'farmer.steps.centre', 'farmer.steps.token'].map((key, i) => {
            const n = i + 1;
            const state = step === n ? 'current' : step > n ? 'done' : 'pending';
            return (
              <div key={key} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span
                  className={`m-badge ${state === 'done' ? 'success' : state === 'current' ? 'gold' : 'neutral'}`}
                  style={{ justifyContent: 'center', minWidth: 30, minHeight: 30, padding: 0, borderRadius: 999, fontWeight: 800 }}
                >
                  {state === 'done' ? <Icon name="check" size={14} strokeWidth={3.4} /> : n}
                </span>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: state === 'pending' ? 'var(--m-ink-faint)' : 'var(--m-green-deep)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {t(key)}
                </span>
                {i < 2 && <span style={{ flex: 1, borderTop: '2.5px dotted #d9e0d2', minWidth: 8 }} aria-hidden="true" />}
              </div>
            );
          })}
        </div>
      </MCard>

      {apiError && <div className="m-banner error" role="alert"><Icon name="alertTriangle" size={17} />{apiError.message}</div>}

      {/* ── step 1: crop + quantity ── */}
      {step === 1 && (
        <form onSubmit={onEvaluate} className="m-stagger">
          <MCard plain>
            <div className="m-card-h"><ArtWheat size={24} /> {t('farmer.selectCrop')}</div>
            {crops.length === 0 ? (
              <MLoader />
            ) : (
              <div className="m-crop-grid">
                {crops.map((c) => (
                  <MOption
                    key={c.id}
                    selected={form.cropId === c.id}
                    onSelect={() => setForm((f) => ({ ...f, cropId: c.id }))}
                    title={pick(c, 'name')}
                    sub={`${formatInr(c.mspPerQuintal)} / ${t('common.quintalShort')} MSP`}
                  />
                ))}
              </div>
            )}
          </MCard>

          <MCard plain>
            <div className="m-card-h"><Icon name="scales" size={20} /> {t('farmer.enterQuantity')}</div>
            <MStepper id="qty" value={form.quantity} onChange={(v) => setForm((f) => ({ ...f, quantity: v }))} />
            <div className="m-hint" style={{ marginTop: 6 }}>{t('farmer.quantityHint')}</div>
            {crop && Number(form.quantity) > 0 && (
              <div className="m-banner success" style={{ marginTop: 12 }}>
                <Icon name="rupee" size={17} />
                {t('farmer.estimatedValue')}: <strong>{formatInr(crop.mspPerQuintal * Number(form.quantity))}</strong>
              </div>
            )}
          </MCard>

          {fieldError && <div className="m-banner warning" role="alert"><Icon name="info" size={17} />{fieldError}</div>}

          <MBtn block type="submit" disabled={busy} icon={<Icon name="search" size={18} />}>
            {busy ? t('farmer.evaluating') : t('farmer.evaluateCentres')}
          </MBtn>
          <p style={{ fontSize: 12.5, color: 'var(--m-ink-faint)', textAlign: 'center' }}>{t('farmer.mspNote')}</p>
        </form>
      )}

      {/* ── step 2: centre choice ── */}
      {step === 2 && reco && (
        <div className="m-stagger">
          {reco.recommended ? (
            <MCard className="leaf" plain>
              <div className="m-card-h">
                <Icon name="star" size={20} /> {t('farmer.recommended')}
                <span className="m-badge gold" style={{ marginLeft: 'auto' }}>★</span>
              </div>
              <MOption
                selected={selected === reco.recommended.centreId}
                onSelect={() => setSelected(reco.recommended.centreId)}
                title={pick(reco.recommended, 'name')}
                sub={reco.recommended.strengths.join(' · ')}
              >
                <Factors entry={reco.recommended} t={t} />
              </MOption>
              <p style={{ fontSize: 13, color: 'var(--m-ink-soft)', marginTop: 4 }}>
                <strong>{t('farmer.whyThis')}</strong> {reco.basis}
              </p>
            </MCard>
          ) : (
            <div className="m-banner error" role="alert"><Icon name="alertOctagon" size={17} />{t('farmer.noEligible')}</div>
          )}

          {reco.alternatives.length > 0 && (
            <>
              <SectionH title={t('farmer.alternatives')} art={<ArtMandi size={26} />} />
              {reco.alternatives.map((c) => (
                <MOption
                  key={c.centreId}
                  selected={selected === c.centreId}
                  onSelect={() => setSelected(c.centreId)}
                  title={pick(c, 'name')}
                  sub={c.strengths.join(' · ')}
                >
                  <Factors entry={c} t={t} />
                </MOption>
              ))}
            </>
          )}

          {reco.ineligible.length > 0 && (
            <MCard plain>
              <div className="m-card-h" style={{ color: 'var(--m-ink-soft)' }}><Icon name="ban" size={18} /> {t('farmer.unavailable')}</div>
              {reco.ineligible.map((c) => (
                <div key={c.centreId} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, padding: '8px 0', borderBottom: '1.5px dashed #e5e9dd', fontSize: 14, opacity: 0.7 }}>
                  <span>{pick(c, 'name')} <MBadge status={c.status} /></span>
                  <span style={{ color: 'var(--m-red)', fontSize: 12.5, textAlign: 'right' }}>{c.ineligibilityReasons.join(' · ')}</span>
                </div>
              ))}
            </MCard>
          )}

          <div className="m-btn-row">
            <MBtn variant="soft" onClick={() => setStep(1)}>← {t('common.back')}</MBtn>
            <MBtn variant="primary" onClick={onConfirm} disabled={!selected || busy} icon={<Icon name="checkCircle" size={18} />} style={{ flex: 2 }}>
              {busy ? t('farmer.generatingToken') : t('farmer.confirmCentre')}
            </MBtn>
          </div>
        </div>
      )}

      {/* ── step 3: token ready ── */}
      {step === 3 && result && (
        <div className="m-stagger" style={{ textAlign: 'center' }}>
          <ArtSuccess size={130} className="m-anim-pop" style={{ margin: '10px auto 4px' }} />
          <h2 style={{ fontSize: 24, fontWeight: 800 }}>{t('farmer.tokenGenerated')}</h2>
          <p style={{ color: 'var(--m-ink-soft)', fontSize: 14.5 }}>{t('farmer.tokenGeneratedHint')}</p>
          <TicketCard request={result.request} queue={result.queue} />
          <div className="m-btn-row" style={{ marginTop: 14 }}>
            <MBtn to={`/requests/${result.request.id}`} variant="primary" icon={<Icon name="ticket" size={17} />}>
              {t('farmer.trackLive')}
            </MBtn>
            <MBtn to="/farmer" variant="soft">{t('nav.dashboard')}</MBtn>
          </div>
          <div style={{ margin: '10px 0 0' }}>
            <ArtSun size={40} sleepy className="m-anim-pop" />
          </div>
        </div>
      )}
    </div>
  );
}

function Factors({ entry, t }) {
  return (
    <div className="m-factors">
      <div className="m-f"><div className="m-k">{t('farmer.distance')}</div><div className="m-v">{entry.distanceKm} {t('common.km')}</div></div>
      <div className="m-f"><div className="m-k">{t('farmer.queueLen')}</div><div className="m-v">{entry.queueCount}</div></div>
      <div className="m-f"><div className="m-k">{t('farmer.capacity')}</div><div className="m-v">{entry.capacityPct}%</div></div>
      <div className="m-f"><div className="m-k">{t('farmer.wait')}</div><div className="m-v">~{entry.estimatedWaitMinutes} {t('common.min')}</div></div>
    </div>
  );
}
