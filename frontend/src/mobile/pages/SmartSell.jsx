// Smart Sell — compare government MSP centres and above-MSP market buyers
// before committing. Mobile version of the website flow, same API.
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../../i18n/I18nContext.jsx';
import { referenceService, sellingService, farmerService, requestService } from '../../services/api/farmerService.js';
import { marketPriceService } from '../../services/api/marketPriceService.js';
import { formatDate, formatInr } from '../../utils/format.js';
import Icon from '../../components/Icon.jsx';
import { ArtScales, ArtRupeeSprout, ArtMandi, ArtSuccess } from '../art.jsx';
import { MCard, MBtn, MStepper, MOption, MLoader, MError, MConfirm, MBadge, SectionH } from '../ui.jsx';

const FLAG_LABEL = { BEST_OVERALL: 'bestOverall', BEST_MSP: 'bestMsp', BEST_PRICE: 'bestPrice' };

export default function SmartSell() {
  const { t, pick, lang } = useI18n();

  const [mode, setMode] = useState('form'); // form | compare | result
  const [crops, setCrops] = useState([]);
  const [cropsError, setCropsError] = useState(null);
  const [form, setForm] = useState({ cropId: '', quantity: '' });
  const [fieldError, setFieldError] = useState('');
  const [apiError, setApiError] = useState(null);
  const [busy, setBusy] = useState(false);

  const [compare, setCompare] = useState(null);
  const [selected, setSelected] = useState(null);
  const [result, setResult] = useState(null);
  const [bench, setBench] = useState(null);

  const [blocked, setBlocked] = useState(false);
  const [activeRequest, setActiveRequest] = useState(null);
  const [activeBooking, setActiveBooking] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [bookingsLoading, setBookingsLoading] = useState(true);
  const [bookingsError, setBookingsError] = useState(null);
  const [cancelFor, setCancelFor] = useState(null);
  const [cancelBusy, setCancelBusy] = useState(false);
  const [requestCancelBusy, setRequestCancelBusy] = useState(false);
  const [requestCancelConfirm, setRequestCancelConfirm] = useState(false);

  async function loadBookings() {
    setBookingsLoading(true);
    setBookingsError(null);
    try {
      const [b, me] = await Promise.all([sellingService.bookings(), farmerService.me()]);
      const liveBooking = b.bookings.find((x) => x.status === 'CONFIRMED') || null;
      setBookings(b.bookings);
      setActiveRequest(me.activeRequest || null);
      setActiveBooking(liveBooking);
      setBlocked(Boolean(me.activeRequest) || Boolean(liveBooking));
    } catch (e) {
      setBookingsError(e);
    } finally {
      setBookingsLoading(false);
    }
  }

  async function cancelActiveRequest() {
    if (!activeRequest) return;
    setRequestCancelBusy(true);
    setApiError(null);
    try {
      await requestService.cancel(activeRequest.id);
      setRequestCancelConfirm(false);
      await loadBookings();
    } catch (e) {
      setApiError(e);
    } finally {
      setRequestCancelBusy(false);
    }
  }

  useEffect(() => {
    referenceService.crops().then((d) => setCrops(d.crops)).catch((e) => setCropsError(e));
    loadBookings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const crop = crops.find((c) => c.id === form.cropId);

  function validate() {
    setFieldError('');
    if (!form.cropId) { setFieldError(t('farmer.selectCrop')); return false; }
    const q = Number(form.quantity);
    if (!q || q < 1 || q > 500) { setFieldError(t('farmer.quantityHint')); return false; }
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

  async function cancelBooking() {
    setCancelBusy(true);
    try {
      await sellingService.cancelBooking(cancelFor);
      setCancelFor(null);
      await loadBookings();
    } catch (e) {
      setApiError(e);
    } finally {
      setCancelBusy(false);
    }
  }

  function reset() {
    setMode('form');
    setCompare(null);
    setSelected(null);
    setResult(null);
    setBench(null);
    setApiError(null);
  }

  // Historical footing for the selected buyer's rate (real Agmarknet data).
  useEffect(() => {
    const opt = compare?.options.find((o) => o.optionId === selected);
    if (!crop || !opt) { setBench(null); return undefined; }
    let cancelled = false;
    setBench(null);
    marketPriceService.benchmark({ cropId: crop.id, pricePerQuintal: opt.ratePerQuintal })
      .then((b) => { if (!cancelled && b?.available) setBench(b); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [selected, compare, crop]);

  return (
    <div className="m-stagger">
      <MCard plain className="gold">
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <ArtScales size={54} className="m-anim-pop" />
          <div>
            <h2 style={{ fontSize: 18.5, fontFamily: 'var(--m-f-display)' }}>{t('smartSell.title')}</h2>
            <p style={{ fontSize: 13.5, color: 'var(--m-ink-soft)' }}>{t('smartSell.subtitle')}</p>
          </div>
        </div>
      </MCard>

      {blocked && (
        <MCard plain className="gold" style={{ borderColor: 'rgba(199, 154, 46, 0.35)' }}>
          <div className="m-card-h" style={{ color: 'var(--m-amber)' }}>
            <Icon name="alertOctagon" size={19} /> {t('smartSell.blockedTitle')}
          </div>
          <p style={{ fontSize: 14, marginBottom: 10 }}>
            {activeRequest
              ? t('smartSell.blockedRequest', { token: activeRequest.tokenNumber })
              : t('smartSell.blockedBooking', { ref: activeBooking ? activeBooking.reference : '' })}
          </p>
          <p style={{ fontSize: 13, color: 'var(--m-ink-soft)', marginBottom: 12 }}>{t('smartSell.blockedHint')}</p>
          <div className="m-btn-row" style={{ marginTop: 4 }}>
            {activeRequest && (
              <>
                <MBtn to={`/requests/${activeRequest.id}`} variant="soft" size="sm" icon={<Icon name="ticket" size={16} />}>
                  {t('smartSell.viewActive')}
                </MBtn>
                <MBtn variant="danger" size="sm" onClick={() => setRequestCancelConfirm(true)} disabled={requestCancelBusy}>
                  {t('smartSell.cancelActiveRequest')}
                </MBtn>
              </>
            )}
            {activeBooking && (
              <>
                <MBtn variant="soft" size="sm" onClick={() => setCancelFor(activeBooking.id)}>
                  {t('smartSell.viewBooking')}
                </MBtn>
                <MBtn variant="danger" size="sm" onClick={() => setCancelFor(activeBooking.id)} disabled={cancelBusy}>
                  {t('smartSell.cancelActiveBooking')}
                </MBtn>
              </>
            )}
          </div>
        </MCard>
      )}
      {apiError && mode !== 'result' && <div className="m-banner error" role="alert"><Icon name="alertTriangle" size={17} />{apiError.message}</div>}

      {/* ── form ── */}
      {mode === 'form' && (
        <form onSubmit={onCompare}>
          {cropsError ? (
            <MError error={cropsError} onRetry={() => window.location.reload()} />
          ) : (
            <MCard plain>
              <div className="m-card-h"><Icon name="wheat" size={19} /> {t('smartSell.stepCrop')}</div>
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
            </MCard>
          )}
          <MCard plain>
            <div className="m-card-h"><Icon name="scales" size={19} /> {t('farmer.enterQuantity')}</div>
            <MStepper value={form.quantity} onChange={(v) => setForm((f) => ({ ...f, quantity: v }))} />
            <div className="m-hint" style={{ marginTop: 6 }}>{t('farmer.quantityHint')}</div>
          </MCard>
          {fieldError && <div className="m-banner warning" role="alert"><Icon name="info" size={17} />{fieldError}</div>}
          <MBtn block type="submit" disabled={busy} icon={<Icon name="search" size={18} />}>
            {busy ? t('smartSell.comparing') : t('smartSell.compare')}
          </MBtn>
        </form>
      )}

      {/* ── compare ── */}
      {mode === 'compare' && compare && (
        <>
          <MCard plain className="leaf">
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <strong style={{ fontFamily: 'var(--m-f-display)', fontSize: 16 }}>{crop ? pick(crop, 'name') : ''} · {compare.quantityQuintal} {t('common.quintalShort')}</strong>
              <button type="button" className="text-button" onClick={reset}>← {t('smartSell.change')}</button>
            </div>
            <p style={{ fontSize: 13.5, color: 'var(--m-ink-soft)', marginTop: 4 }}>
              {t('smartSell.mspRate')}: <strong>{formatInr(compare.mspRatePerQuintal)}</strong>
            </p>
            {compare.summaryEn && <p style={{ fontSize: 14, marginTop: 6 }}>{pick(compare, 'summary')}</p>}
          </MCard>

          {compare.options.length === 0 ? (
            <div className="m-banner error"><Icon name="alertOctagon" size={17} />{t('smartSell.noEligible')}</div>
          ) : (
            <>
              <SectionH title={t('smartSell.resultsTitle')} art={<ArtMandi size={32} />} />
              {compare.options.map((o) => (
                <MOption
                  key={o.optionId}
                  selected={selected === o.optionId}
                  onSelect={() => setSelected(o.optionId)}
                  title={pick(o, 'name')}
                  chips={
                    <>
                      <MBadge tone={o.channel === 'MARKET' ? 'info' : 'success'}>{o.channel === 'MARKET' ? t('smartSell.channelMarket') : t('smartSell.channelMSP')}</MBadge>
                      {o.channel === 'MARKET' && o.isPremium && <MBadge tone="warning">+{o.premiumPercent}% {t('smartSell.premiumUp')}</MBadge>}
                      {o.flags.map((f) => <MBadge key={f} tone="gold">★ {t(`smartSell.${FLAG_LABEL[f]}`)}</MBadge>)}
                    </>
                  }
                  sub={o.channel === 'MARKET' && o.noteEn ? pick(o, 'note') : (o.address || '')}
                >
                  <div className="m-factors">
                    <div className="m-f"><div className="m-k">{t('smartSell.rate')}</div><div className="m-v">{formatInr(o.ratePerQuintal)}</div></div>
                    <div className="m-f"><div className="m-k">{t('smartSell.netValue')}</div><div className="m-v">{formatInr(o.netValueInr)}</div></div>
                    {o.channel === 'MSP' ? (
                      <>
                        <div className="m-f"><div className="m-k">{t('farmer.distance')}</div><div className="m-v">{o.distanceKm} {t('common.km')}</div></div>
                        <div className="m-f"><div className="m-k">{t('smartSell.wait')}</div><div className="m-v">~{o.estimatedWaitMinutes} {t('common.min')}</div></div>
                      </>
                    ) : (
                      <>
                        <div className="m-f"><div className="m-k">{t('farmer.distance')}</div><div className="m-v">{o.distanceKm} {t('common.km')}</div></div>
                        <div className="m-f"><div className="m-k">{t('smartSell.intakeLeft')}</div><div className="m-v">{o.remainingQuintal} {t('common.quintalShort')}</div></div>
                      </>
                    )}
                  </div>
                  <p style={{ fontSize: 12.5, color: 'var(--m-ink-soft)', marginTop: 8 }}>
                    {o.channel === 'MARKET' ? pick(o, 'settlement') : pick(o, 'payment')}
                  </p>
                </MOption>
              ))}

              <p style={{ fontSize: 12.5, color: 'var(--m-ink-faint)' }}>
                <Icon name="info" size={14} /> {t('smartSell.basisNote')} {pick(compare, 'basis')}
              </p>

              {bench && (
                <MCard plain className="gold">
                  <div className="m-card-h">
                    <ArtRupeeSprout size={30} /> {t('prices.benchTitle')}
                    <span className="m-right">{pick(bench, 'message') || t('prices.benchTypical')}</span>
                  </div>
                  <div className="m-stat-grid">
                    <MStatStandIn num={formatInr(Math.round(bench.last12MonthAverage))} label={t('prices.avg12')} />
                    <MStatStandIn
                      num={`${bench.vsLast12MonthsPercent >= 0 ? '+' : ''}${bench.vsLast12MonthsPercent}%`}
                      label={t('prices.benchVsAvg')}
                      tone={bench.vsLast12MonthsPercent >= 0 ? 'success' : 'danger'}
                    />
                  </div>
                </MCard>
              )}
            </>
          )}

          {compare.unavailable.length > 0 && (
            <MCard plain>
              <div className="m-card-h" style={{ color: 'var(--m-ink-soft)' }}><Icon name="ban" size={18} /> {t('farmer.unavailable')}</div>
              {compare.unavailable.map((o) => (
                <div key={o.optionId} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, padding: '8px 0', borderBottom: '1.5px dashed #e5e9dd', fontSize: 13.5, opacity: 0.7 }}>
                  <span>{o.channel === 'MARKET' ? t('smartSell.channelMarket') : t('smartSell.channelMSP')} · {pick(o, 'name')}</span>
                  <span style={{ color: 'var(--m-red)', fontSize: 12, textAlign: 'right' }}>{o.ineligibilityReasons.join(' · ')}</span>
                </div>
              ))}
            </MCard>
          )}

          <div className="m-btn-row">
            <MBtn variant="soft" onClick={reset}>← {t('smartSell.back')}</MBtn>
            <MBtn variant="primary" onClick={onBook} disabled={!selected || busy || blocked} style={{ flex: 2 }}>
              {busy ? t('smartSell.booking') : t('smartSell.sellAndBook')}
            </MBtn>
          </div>
        </>
      )}

      {/* ── result ── */}
      {mode === 'result' && result && (
        <div style={{ textAlign: 'center' }}>
          <ArtSuccess size={120} className="m-anim-pop" style={{ margin: '8px auto' }} />
          <h2 style={{ fontSize: 22, fontWeight: 800 }}>
            {result.channel === 'MSP' ? t('smartSell.bookedMspTitle') : t('smartSell.bookedMarketTitle')}
          </h2>
          <p style={{ color: 'var(--m-ink-soft)', fontSize: 14.5, marginBottom: 12 }}>
            {result.channel === 'MSP' ? t('smartSell.bookedMspHint') : t('smartSell.bookedMarketHint')}
          </p>

          {result.channel === 'MSP' && result.request ? (
            <MCard plain className="green">
              <div className="m-display" style={{ fontSize: 40, fontWeight: 800, color: '#fff' }}>{result.request.tokenNumber}</div>
              <p style={{ color: '#cfe2cd', fontSize: 14 }}>
                {formatInr((result.option || {}).ratePerQuintal)}/{t('common.quintalShort')} · {pick(result.request.centre, 'name')}
              </p>
            </MCard>
          ) : result.booking ? (
            <MCard plain className="green">
              <div className="m-display" style={{ fontSize: 40, fontWeight: 800, color: '#fff' }}>{result.booking.reference}</div>
              <p style={{ color: '#cfe2cd', fontSize: 14 }}>
                {formatInr(result.booking.agreedRatePerQuintal)}/{t('common.quintalShort')} · {pick(result.booking.buyer, 'name')}
              </p>
              <p style={{ color: '#9fbba1', fontSize: 12.5 }}>{pick(result.booking.buyer, 'settlement')}</p>
            </MCard>
          ) : null}

          {(result.channel === 'MSP' ? result.request?.grossValueInr : result.booking?.grossValueInr) != null && (
            <p style={{ color: 'var(--m-ink-soft)', marginTop: 10 }}>
              {t('farmer.estimatedValue')}: <strong>{formatInr(result.channel === 'MSP' ? result.request.grossValueInr : result.booking.grossValueInr)}</strong>
            </p>
          )}

          <div className="m-btn-row" style={{ marginTop: 14 }}>
            {result.channel === 'MSP' && result.request && (
              <MBtn to={`/requests/${result.request.id}`} variant="primary" icon={<Icon name="ticket" size={17} />}>{t('smartSell.trackLive')}</MBtn>
            )}
            <MBtn to="/farmer" variant="soft">{t('smartSell.done')}</MBtn>
          </div>
          <button type="button" className="text-button" style={{ marginTop: 12 }} onClick={reset}>{t('smartSell.keepSelling')}</button>
        </div>
      )}

      {/* ── my market bookings ── */}
      {mode !== 'result' && (
        <MCard plain>
          <div className="m-card-h"><Icon name="store" size={19} /> {t('smartSell.myBookings')}</div>
          {bookingsError ? (
            <MError error={bookingsError} onRetry={loadBookings} />
          ) : bookingsLoading ? (
            <MLoader />
          ) : bookings.length === 0 ? (
            <p style={{ color: 'var(--m-ink-faint)', fontSize: 14 }}>{t('smartSell.noBookings')}</p>
          ) : (
            bookings.map((b) => {
              const active = b.status === 'CONFIRMED';
              return (
                <div key={b.id} className="m-row" style={{ marginBottom: 10 }}>
                  <span className="m-row-ico m-row-ico-token gold">{b.reference?.slice(0, 4)}</span>
                  <div className="m-row-main">
                    <div className="m-row-title">{pick(b.buyer, 'name')} <MBadge tone={active ? 'success' : 'neutral'}>{t(`smartSell.bookingStatus.${b.status}`)}</MBadge></div>
                    <div className="m-row-sub">
                      {b.reference} · {b.quantityQuintal}{t('common.quintalShort')} {pick(b.crop, 'name')} · {formatInr(b.agreedRatePerQuintal)}/{t('common.quintalShort')} · {formatDate(b.createdAt, lang)}
                    </div>
                  </div>
                  {active && (
                    <MBtn size="sm" variant="danger" onClick={() => setCancelFor(b.id)} disabled={cancelBusy}>
                      {t('smartSell.cancelBooking')}
                    </MBtn>
                  )}
                </div>
              );
            })
          )}
        </MCard>
      )}

      <MConfirm
        open={Boolean(cancelFor)}
        onClose={() => setCancelFor(null)}
        onConfirm={cancelBooking}
        title={t('smartSell.cancelBooking')}
        sub={t('smartSell.cancelBookingConfirm')}
        confirmLabel={t('common.confirm')}
        danger
        busy={cancelBusy}
      />

      <MConfirm
        open={requestCancelConfirm}
        onClose={() => setRequestCancelConfirm(false)}
        onConfirm={cancelActiveRequest}
        title={t('farmer.cancelRequest')}
        sub={t('farmer.cancelConfirm')}
        confirmLabel={t('common.confirm')}
        danger
        busy={requestCancelBusy}
      />
    </div>
  );
}

function MStatStandIn({ num, label, tone = 'success' }) {
  return (
    <div className={`m-stat ${tone === 'danger' ? 'danger' : ''}`}>
      <div className="m-stat-num">{num}</div>
      <div className="m-stat-lbl">{label}</div>
    </div>
  );
}
