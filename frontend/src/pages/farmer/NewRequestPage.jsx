import { useEffect, useState } from 'react';
import Icon from '../../components/Icon.jsx';
import { Link, useNavigate } from 'react-router-dom';
import { useI18n } from '../../i18n/I18nContext.jsx';
import { referenceService, requestService } from '../../services/api/farmerService.js';
import { StatusBadge } from '../../components/StatusBadge.jsx';
import { formatInr } from '../../utils/format.js';

// Step 1: crop + quantity → Step 2: recommended centre → Step 3: token.
export default function NewRequestPage() {
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
    referenceService
      .crops()
      .then((d) => setCrops(d.crops))
      .catch((e) => setCropsError(e));
  }, []);

  function validateStep1() {
    setFieldError('');
    if (!form.cropId) return setFieldError(t('farmer.selectCrop')), false;
    const q = Number(form.quantity);
    if (!q || q < 1 || q > 500) return setFieldError(t('farmer.quantityHint')), false;
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

  const crop = crops.find((c) => c.id === form.cropId);

  return (
    <div className="page narrow">
      <h1>{t('farmer.newRequestTitle')}</h1>
      <div className="steps" aria-hidden>
        {['crop', 'centre', 'token'].map((s, i) => (
          <div key={s} className={`step ${step === i + 1 ? 'active' : step > i + 1 ? 'done' : ''}`}>
            {i + 1}. {t(`farmer.steps.${s}`)}
          </div>
        ))}
      </div>

      {apiError && <div className="form-banner error">{apiError.message}</div>}

      {step === 1 && (
        <form className="card" onSubmit={onEvaluate} noValidate>
          <div className="field">
            <label htmlFor="crop">{t('farmer.selectCrop')}</label>
            {cropsError ? (
              <div className="field-error">{t('common.errorNetwork')}</div>
            ) : (
              <select id="crop" className="select" value={form.cropId} onChange={(e) => setForm((f) => ({ ...f, cropId: e.target.value }))}>
                <option value="">{t('farmer.selectCrop')}</option>
                {crops.map((c) => (
                  <option key={c.id} value={c.id}>
                    {pick(c, 'name')} — {formatInr(c.mspPerQuintal)}/{t('common.quintalShort')}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div className="field">
            <label htmlFor="qty">{t('farmer.enterQuantity')}</label>
            <input
              id="qty"
              className="input"
              type="number"
              min="1"
              max="500"
              inputMode="numeric"
              value={form.quantity}
              onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
            />
            <div className="hint">{t('farmer.quantityHint')}</div>
          </div>
          {crop && form.quantity > 0 && (
            <p>
              {t('farmer.estimatedValue')}: <strong>{formatInr(crop.mspPerQuintal * Number(form.quantity))}</strong>
            </p>
          )}
          {fieldError && <div className="field-error" role="alert">{fieldError}</div>}
          <button className="btn btn-primary btn-block" type="submit" disabled={busy}>
            {busy ? t('farmer.evaluating') : (<><Icon name="search" size={16} /> {t('farmer.evaluateCentres')}</>)}
          </button>
          <p className="hint" style={{ fontSize: '0.85rem', marginTop: '0.75rem' }}>{t('farmer.mspNote')}</p>
        </form>
      )}

      {step === 2 && reco && (
        <>
          {reco.recommended ? (
            <div className="card reco-card">
              <h2><Icon name="star" size={18} /> {t('farmer.recommended')}</h2>
              <RecommendationRow
                entry={reco.recommended}
                selected={selected === reco.recommended.centreId}
                onSelect={() => setSelected(reco.recommended.centreId)}
                t={t}
                pick={pick}
              />
              <p className="basis">
                {t('farmer.whyThis')} {reco.basis}
              </p>
            </div>
          ) : (
            <div className="form-banner error">{t('farmer.noEligible')}</div>
          )}

          {reco.alternatives.length > 0 && (
            <div className="card">
              <h2>{t('farmer.alternatives')}</h2>
              {reco.alternatives.map((c) => (
                <RecommendationRow key={c.centreId} entry={c} selected={selected === c.centreId} onSelect={() => setSelected(c.centreId)} t={t} pick={pick} compact />
              ))}
            </div>
          )}

          {reco.ineligible.length > 0 && (
            <div className="card">
              <h2 style={{ color: 'var(--c-text-soft)' }}><Icon name="ban" size={17} /> {t('farmer.unavailable')}</h2>
              {reco.ineligible.map((c) => (
                <div key={c.centreId} className="alt-row" style={{ opacity: 0.65 }}>
                  <span>{pick(c, 'name')} · <StatusBadge status={c.status} /></span>
                  <span style={{ fontSize: '0.85rem', color: 'var(--c-danger)' }}>{c.ineligibilityReasons.join(' · ')}</span>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.6rem' }}>
            <button className="btn btn-outline" onClick={() => setStep(1)}>
              ← {t('common.back')}
            </button>
            <button className="btn btn-primary" style={{ flex: 1 }} onClick={onConfirm} disabled={!selected || busy}>
              {busy ? t('farmer.generatingToken') : (<><Icon name="checkCircle" size={16} /> {t('farmer.confirmCentre')}</>)}
            </button>
          </div>
        </>
      )}

      {step === 3 && result && (
        <div className="card" style={{ textAlign: 'center' }}>
          <div className="big-check" aria-hidden><Icon name="checkCircle" size={54} strokeWidth={1.4} /></div>
          <h2>{t('farmer.tokenGenerated')}</h2>
          <div className="token-card">
            <div className="token-label">{t('farmer.yourToken').toUpperCase()}</div>
            <div className="token-number">{result.request.tokenNumber}</div>
            <div className="rows">
              <div className="cell">
                <div className="k">{t('farmer.queuePosition')}</div>
                <div className="v">#{result.queue.position}</div>
              </div>
              <div className="cell">
                <div className="k">{t('farmer.centre')}</div>
                <div className="v v-text">{pick(result.request.centre, 'name')}</div>
              </div>
            </div>
          </div>
          <p style={{ color: 'var(--c-text-soft)' }}>{t('farmer.tokenGeneratedHint')}</p>
          <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link className="btn btn-primary" to={`/requests/${result.request.id}`}>
              <Icon name="ticket" size={16} /> {t('farmer.trackLive')}
            </Link>
            <button className="btn btn-outline" onClick={() => navigate('/')}>
              {t('nav.dashboard')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function RecommendationRow({ entry, selected, onSelect, t, pick, compact = false }) {
  return (
    <div className="alt-row" style={compact ? {} : { display: 'block' }}>
      <label style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start', cursor: 'pointer', flex: 1 }}>
        <input type="radio" name="centre" checked={selected} onChange={onSelect} style={{ marginTop: 6, width: 20, height: 20 }} />
        <span style={{ flex: 1 }}>
          <strong>{pick(entry, 'name')}</strong>
          {entry.strengths.length > 0 && (
            <span className="reco-strengths"><Icon name="check" size={13} strokeWidth={2.8} /> {entry.strengths.join(' · ')}</span>
          )}
          <div className="reco-factors" style={{ marginBottom: 0 }}>
            <div className="f"><div className="k">{t('farmer.distance')}</div><div className="v">{entry.distanceKm} {t('common.km')}</div></div>
            <div className="f"><div className="k">{t('farmer.queueLen')}</div><div className="v">{entry.queueCount}</div></div>
            <div className="f"><div className="k">{t('farmer.capacity')}</div><div className="v">{entry.capacityPct}%</div></div>
            <div className="f"><div className="k">{t('farmer.wait')}</div><div className="v">~{entry.estimatedWaitMinutes} {t('common.min')}</div></div>
          </div>
        </span>
      </label>
    </div>
  );
}
