import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../../components/Icon.jsx';
import { useI18n } from '../../i18n/I18nContext.jsx';
import { referenceService, sellingService, farmerService } from '../../services/api/farmerService.js';
import { formatInr, formatDate } from '../../utils/format.js';
import { Loading, ErrorState } from '../../components/States.jsx';
import { PriceBenchmarkCard } from '../../components/PriceBenchmarkCard.jsx';

const FLAG_LABEL = { BEST_OVERALL: 'bestOverall', BEST_MSP: 'bestMsp', BEST_PRICE: 'bestPrice' };
const FLAG_TONE = { BEST_OVERALL: 'success', BEST_MSP: 'info', BEST_PRICE: 'warning' };

// Compare buyers (government MSP centres + above-MSP market buyers) before you
// commit to selling your produce. Step 1: crop+quantity → step 2: ranked buyers
// → step 3: booked sale (token for MSP, booking reference for market).
export default function SmartSellPage() {
  const { t, pick, lang } = useI18n();

  const [mode, setMode] = useState('form'); // 'form' | 'compare' | 'result'
  const [crops, setCrops] = useState([]);
  const [cropsError, setCropsError] = useState(null);
  const [form, setForm] = useState({ cropId: '', quantity: '' });
  const [fieldError, setFieldError] = useState('');
  const [apiError, setApiError] = useState(null);
  const [busy, setBusy] = useState(false);

  const [compare, setCompare] = useState(null); // payload from /options
  const [selected, setSelected] = useState(null); // optionId
  const [result, setResult] = useState(null);

  const [blocked, setBlocked] = useState(false);
  const [bookings, setBookings] = useState([]);
  const [bookingsLoading, setBookingsLoading] = useState(true);
  const [bookingsError, setBookingsError] = useState(null);

  async function loadBookings() {
    setBookingsLoading(true);
    setBookingsError(null);
    try {
      const [b, me] = await Promise.all([sellingService.bookings(), farmerService.me()]);
      setBookings(b.bookings);
      setBlocked(Boolean(me.activeRequest) || b.bookings.some((x) => x.status === 'CONFIRMED'));
    } catch (e) {
      setBookingsError(e);
    } finally {
      setBookingsLoading(false);
    }
  }

  useEffect(() => {
    referenceService
      .crops()
      .then((d) => setCrops(d.crops))
      .catch((e) => setCropsError(e));
    loadBookings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const crop = crops.find((c) => c.id === form.cropId);

  function validate() {
    setFieldError('');
    if (!form.cropId) {
      setFieldError(t('farmer.selectCrop'));
      return false;
    }
    const q = Number(form.quantity);
    if (!q || q < 1 || q > 500) {
      setFieldError(t('farmer.quantityHint'));
      return false;
    }
    return true;
  }

  async function onCompare(e) {
    e?.preventDefault();
    if (!validate()) return;
    setBusy(true);
    setApiError(null);
    try {
      const data = await sellingService.options(form.cropId, Number(form.quantity));
      setCompare(data);
      setSelected(data.recommended?.optionId || data.options[0]?.optionId || null);
      setMode('compare');
    } catch (err) {
      setApiError(err);
    } finally {
      setBusy(false);
    }
  }

  async function onBook() {
    const opt = compare?.options.find((o) => o.optionId === selected);
    if (!opt) return;
    if (!window.confirm(t('smartSell.confirmText'))) return;
    setBusy(true);
    setApiError(null);
    try {
      const data = await sellingService.book({
        cropId: form.cropId,
        quantityQuintal: Number(form.quantity),
        channel: opt.channel,
        buyerId: opt.buyerId,
      });
      setResult({ ...data, option: opt });
      setMode('result');
      await loadBookings();
    } catch (err) {
      setApiError(err);
      if (err.status === 409) await loadBookings();
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setMode('form');
    setCompare(null);
    setSelected(null);
    setResult(null);
    setApiError(null);
  }

  return (
    <div className="page narrow">
      <h1 style={{ marginBottom: '0.15rem' }}>
        <Icon name="wheat" size={20} /> {t('smartSell.title')}
      </h1>
      <p className="hint" style={{ marginTop: 0 }}>{t('smartSell.subtitle')}</p>

      {blocked && (
        <div className="form-banner warning">{t('smartSell.activeBlockNote')}</div>
      )}
      {apiError && mode !== 'result' && <div className="form-banner error">{apiError.message}</div>}

      {mode === 'form' && (
        <form className="card" onSubmit={onCompare} noValidate>
          <h2 style={{ marginTop: 0 }}>{t('smartSell.stepCrop')}</h2>
          <div className="field">
            <label htmlFor="ss-crop">{t('farmer.selectCrop')}</label>
            {cropsError ? (
              <div className="field-error">{t('common.errorNetwork')}</div>
            ) : (
              <select
                id="ss-crop"
                className="select"
                value={form.cropId}
                onChange={(e) => setForm((f) => ({ ...f, cropId: e.target.value }))}
              >
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
            <label htmlFor="ss-qty">{t('farmer.enterQuantity')}</label>
            <input
              id="ss-qty"
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
          {fieldError && <div className="field-error" role="alert">{fieldError}</div>}
          <button className="btn btn-primary btn-block" type="submit" disabled={busy || blocked}>
            {busy ? t('smartSell.comparing') : (<><Icon name="search" size={16} /> {t('smartSell.compare')}</>)}
          </button>
          <p className="hint" style={{ fontSize: '0.85rem', marginTop: '0.75rem' }}>
            {t('farmer.mspNote')}
          </p>
        </form>
      )}

      {mode === 'compare' && compare && (
        <CompareStage
          crop={crop}
          compare={compare}
          selected={selected}
          setSelected={setSelected}
          onBook={onBook}
          onBack={() => { setMode('form'); setCompare(null); setSelected(null); setApiError(null); }}
          busy={busy}
          blocked={blocked}
          t={t}
          pick={pick}
        />
      )}

      {mode === 'result' && result && (
        <ResultStage result={result} crop={crop} t={t} pick={pick} lang={lang} onReset={reset} />
      )}

      {/* Market bookings panel */}
      {mode !== 'result' && (
        <div style={{ marginTop: '1.25rem' }}>
          <BookingsPanel
            bookings={bookings}
            loading={bookingsLoading}
            error={bookingsError}
            reload={loadBookings}
            onChanged={loadBookings}
          />
        </div>
      )}
    </div>
  );
}

function CompareStage({ crop, compare, selected, setSelected, onBook, onBack, busy, blocked, t, pick }) {
  const selectedOption = compare.options.find((o) => o.optionId === selected) || compare.options[0] || null;
  return (
    <>
      <div className="card" style={{ background: 'var(--c-bg-soft, #f5f9f6)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.6rem', flexWrap: 'wrap' }}>
          <span>
            <strong>{crop ? pick(crop, 'name') : ''}</strong> · {compare.quantityQuintal}{' '}
            {t('common.quintalShort')} ·{' '}
            <span style={{ color: 'var(--c-text-soft)' }}>
              {t('smartSell.mspRate')}: {formatInr(compare.mspRatePerQuintal)}
            </span>
          </span>
          <button className="btn btn-ghost btn-sm" onClick={onBack} type="button">
            ← {t('smartSell.change')}
          </button>
        </div>
        {compare.summaryEn && (
          <p style={{ margin: '0.5rem 0 0', color: 'var(--c-text-strong, #0f3d22)' }}>
            {pick(compare, 'summary')}
          </p>
        )}
      </div>

      {compare.options.length === 0 ? (
        <div className="form-banner error">{t('smartSell.noEligible')}</div>
      ) : (
        <>
          <h2>{t('smartSell.resultsTitle')}</h2>
          {compare.options.map((o) => (
            <OptionRow key={o.optionId} option={o} selected={selected} onSelect={setSelected} t={t} pick={pick} />
          ))}
          <p className="hint" style={{ fontSize: '0.85rem' }}>
            <Icon name="info" size={14} /> {t('smartSell.basisNote')} {pick(compare, 'basis')}
          </p>
          {/* Historical footing: how the selected offer compares with what this
              crop actually fetched in the mandis (real Agmarknet records). */}
          {crop && selectedOption && (
            <PriceBenchmarkCard cropId={crop.id} pricePerQuintal={selectedOption.ratePerQuintal} />
          )}
        </>
      )}

      {compare.unavailable.length > 0 && (
        <div className="card">
          <h2 style={{ color: 'var(--c-text-soft)' }}>
            <Icon name="ban" size={16} /> {t('farmer.unavailable')}
          </h2>
          {compare.unavailable.map((o) => (
            <div key={o.optionId} className="alt-row" style={{ opacity: 0.65 }}>
              <span>
                {o.channel === 'MARKET' ? t('smartSell.channelMarket') : t('smartSell.channelMSP')} · {pick(o, 'name')}
              </span>
              <span style={{ fontSize: '0.85rem', color: 'var(--c-danger)' }}>{o.ineligibilityReasons.join(' · ')}</span>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
        <button className="btn btn-outline" onClick={onBack} type="button">← {t('smartSell.back')}</button>
        <button className="btn btn-primary" style={{ flex: 1 }} onClick={onBook} disabled={!selected || busy || blocked}>
          {busy ? t('smartSell.booking') : (<><Icon name="checkCircle" size={16} /> {t('smartSell.sellAndBook')}</>)}
        </button>
      </div>
    </>
  );
}

function OptionRow({ option, selected, onSelect, t, pick }) {
  const channelLabel = option.channel === 'MARKET' ? t('smartSell.channelMarket') : t('smartSell.channelMSP');
  const rateTxt = formatInr(option.ratePerQuintal);
  return (
    <div className={`alt-row opt-row ${selected ? 'opt-selected' : ''}`}>
      <label style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start', cursor: 'pointer', flex: 1 }}>
        <input type="radio" name="buyer" checked={selected === option.optionId} onChange={() => onSelect(option.optionId)} style={{ marginTop: 6, width: 20, height: 20 }} />
        <span style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <strong>{pick(option, 'name')}</strong>
            <span className={`badge ${option.channel === 'MARKET' ? 'info' : 'success'}`}>
              {channelLabel}
            </span>
            {option.channel === 'MARKET' && option.isPremium && (
              <span className="badge warning">+{option.premiumPercent}% {t('smartSell.premiumUp')}</span>
            )}
            {option.flags.map((f) => (
              <span key={f} className={`badge ${FLAG_TONE[f] || 'success'}`}>
                ★ {t(`smartSell.${FLAG_LABEL[f]}`)}
              </span>
            ))}
          </div>
          {option.channel === 'MARKET' && option.noteEn && (
            <span className="reco-strengths"><Icon name="info" size={13} /> {pick(option, 'note')}</span>
          )}

          <div className="reco-factors" style={{ marginBottom: 0 }}>
            <div className="f"><div className="k">{t('smartSell.rate')}</div><div className="v">{rateTxt}</div></div>
            <div className="f"><div className="k">{t('smartSell.value')}</div><div className="v">{formatInr(option.grossValueInr)}</div></div>
            {option.channel === 'MSP' ? (
              <>
                <div className="f"><div className="k">{t('farmer.distance')}</div><div className="v">{option.distanceKm} {t('common.km')}</div></div>
                <div className="f"><div className="k">{t('smartSell.queue')}</div><div className="v">{option.queueCount}</div></div>
                <div className="f"><div className="k">{t('smartSell.wait')}</div><div className="v">~{option.estimatedWaitMinutes} {t('common.min')}</div></div>
                <div className="f"><div className="k">{t('farmer.capacity')}</div><div className="v">{option.capacityPct}%</div></div>
              </>
            ) : (
              <>
                <div className="f"><div className="k">{t('farmer.distance')}</div><div className="v">{option.distanceKm} {t('common.km')}</div></div>
                <div className="f"><div className="k">{t('smartSell.intakeLeft')}</div><div className="v">{option.remainingQuintal} {t('common.quintalShort')}</div></div>
                <div className="f"><div className="k">{t('smartSell.hours')}</div><div className="v">{option.operatingHours}</div></div>
              </>
            )}
            <div className="f"><div className="k">{t('smartSell.netValue')}</div><div className="v">{formatInr(option.netValueInr)}</div></div>
          </div>

          <div style={{ fontSize: '0.85rem', color: 'var(--c-text-soft)', marginTop: '0.25rem' }}>
            <Icon name="rupee" size={13} />
            {option.channel === 'MARKET' ? pick(option, 'settlement') : pick(option, 'payment')}
            {option.address ? ` · ${option.address}` : ''}
          </div>
        </span>
      </label>
    </div>
  );
}

function ResultStage({ result, crop, t, pick, lang, onReset }) {
  const isMsp = result.channel === 'MSP';
  const item = isMsp ? result.request : result.booking;
  return (
    <div className="card" style={{ textAlign: 'center' }}>
      <div className="big-check" aria-hidden>
        <Icon name="checkCircle" size={54} strokeWidth={1.4} />
      </div>
      <h2>{isMsp ? t('smartSell.bookedMspTitle') : t('smartSell.bookedMarketTitle')}</h2>
      <p className="hint">{isMsp ? t('smartSell.bookedMspHint') : t('smartSell.bookedMarketHint')}</p>

      {isMsp && item ? (
        <div className="token-card">
          <div className="token-label">{t('smartSell.yourToken').toUpperCase()}</div>
          <div className="token-number">{item.tokenNumber}</div>
          <div className="rows">
            <div className="cell">
              <div className="k">{t('smartSell.mspRate')}</div>
              <div className="v">{formatInr((result.option || {}).ratePerQuintal)}/{t('common.quintalShort')}</div>
            </div>
            <div className="cell">
              <div className="k">{t('farmer.centre')}</div>
              <div className="v" style={{ fontSize: '0.95rem' }}>{pick(item.centre, 'name')}</div>
            </div>
          </div>
        </div>
      ) : item ? (
        <div className="token-card">
          <div className="token-label">{t('smartSell.reference').toUpperCase()}</div>
          <div className="token-number">{item.reference}</div>
          <div className="rows">
            <div className="cell">
              <div className="k">{t('smartSell.rate')}</div>
              <div className="v">{formatInr(item.agreedRatePerQuintal)}/{t('common.quintalShort')}</div>
            </div>
            <div className="cell">
              <div className="k">{t('farmer.centre')}</div>
              <div className="v" style={{ fontSize: '0.9rem' }}>{pick(item.buyer, 'name')}</div>
            </div>
          </div>
          <p style={{ margin: '0.5rem 0 0', color: 'var(--c-text-soft)', fontSize: '0.9rem' }}>
            {pick(item.buyer, 'settlement')}
          </p>
        </div>
      ) : null}

      {item?.grossValueInr != null && (
        <p style={{ color: 'var(--c-text-soft)' }}>
          {t('farmer.estimatedValue')}: <strong>{formatInr(item.grossValueInr)}</strong>
        </p>
      )}

      <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'center', flexWrap: 'wrap' }}>
        {isMsp && item && (
          <Link className="btn btn-primary" to={`/requests/${item.id}`}>
            <Icon name="ticket" size={16} /> {t('smartSell.trackLive')}
          </Link>
        )}
        <Link className="btn btn-primary" to="/farmer">
          {t('smartSell.done')}
        </Link>
        <button className="btn btn-outline" onClick={onReset}>
          {t('smartSell.keepSelling')}
        </button>
      </div>
    </div>
  );
}

function BookingsPanel({ bookings, loading, error, reload, onChanged }) {
  const { t, pick, lang } = useI18n();
  const [busyId, setBusyId] = useState(null);

  async function onCancel(id) {
    if (!window.confirm(t('smartSell.cancelBookingConfirm'))) return;
    setBusyId(id);
    try {
      await sellingService.cancelBooking(id);
      await onChanged();
    } catch (e) {
      alert(e.message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="card" aria-labelledby="myBookings">
      <h2 id="myBookings" style={{ marginTop: 0 }}>{t('smartSell.myBookings')}</h2>
      {error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : loading ? (
        <Loading label={t('common.loading')} />
      ) : bookings.length === 0 ? (
        <div className="hint">{t('smartSell.noBookings')}</div>
      ) : (
        bookings.map((b) => {
          const active = b.status === 'CONFIRMED';
          return (
            <div key={b.id} className="alt-row" style={{ alignItems: 'center' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <strong>{pick(b.buyer, 'name')}</strong>
                  <span className={`badge ${active ? 'success' : 'neutral'}`}>
                    {t(`smartSell.bookingStatus.${b.status}`)}
                  </span>
                </div>
                <div className="hint" style={{ marginTop: '0.2rem', marginBottom: 0 }}>
                  {b.reference} · {b.quantityQuintal} {t('common.quintalShort')} {pick(b.crop, 'name')} ·{' '}
                  {formatInr(b.agreedRatePerQuintal)}/{t('common.quintalShort')} ·{' '}
                  {formatDate(b.createdAt, lang)}
                </div>
              </div>
              {active && (
                <button className="btn btn-danger btn-sm" disabled={busyId === b.id} onClick={() => onCancel(b.id)}>
                  {t('smartSell.cancelBooking')}
                </button>
              )}
            </div>
          );
        })
      )}
    </section>
  );
}
