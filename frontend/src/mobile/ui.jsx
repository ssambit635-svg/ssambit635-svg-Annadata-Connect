// Annadata Connect — shared UI primitives.
// Small, composable building blocks so every screen speaks the same
// design language: pill buttons, rounded cards, thumb-sized targets.
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../components/Icon.jsx';
import { useI18n } from '../i18n/I18nContext.jsx';
import { statusTone, formatInr, waitText, JOURNEY, formatDate } from '../utils/format.js';
import { ArtWheat, ArtBasket, ArtSun, ArtLogo, ArtBirds, ArtNotice } from './art.jsx';

/* ── Card ────────────────────────────────────────────────────────── */
export function MCard({ className = '', plain, tight, children, ...rest }) {
  const cls = ['m-card', plain && 'plain', tight && 'tight', className].filter(Boolean).join(' ');
  return <div className={cls} {...rest}>{children}</div>;
}

/* ── Buttons ─────────────────────────────────────────────────────── */
export function MBtn({ to, variant = 'primary', size, block, icon, iconRight, className = '', children, ...rest }) {
  const cls = `m-btn ${variant} ${size === 'sm' ? 'sm' : ''} ${block ? 'block' : ''} ${className}`.replace(/\s+/g, ' ').trim();
  const inner = (
    <>
      {icon}
      {children}
      {iconRight}
    </>
  );
  if (to) return <Link to={to} className={cls}>{inner}</Link>;
  return <button type="button" className={cls} {...rest}>{inner}</button>;
}

export function MIconBtn({ icon, label, className = '', ...rest }) {
  return (
    <button type="button" className={`m-icon-btn ${className}`.trim()} aria-label={label} {...rest}>
      {icon}
    </button>
  );
}

/* ── Badges ──────────────────────────────────────────────────────── */
export function MBadge({ status, tone, children }) {
  const { t } = useI18n();
  const t2 = tone || statusTone(status);
  const text = status ? t(`status.${status}`) : children;
  return (
    <span className={`m-badge ${t2}`}>
      <span className="m-dot" aria-hidden="true" />
      {text}
    </span>
  );
}

export function MPayBadge({ payment }) {
  const { t } = useI18n();
  if (!payment) return null;
  const paid = payment.status === 'PAID';
  return (
    <span className={`m-badge ${paid ? 'success' : 'warning'}`}>
      <span className="m-dot" />
      {paid ? t('farmer.payment.paid') : t('farmer.payment.pending')}
    </span>
  );
}

/* ── Stats / bars ────────────────────────────────────────────────── */
export function MStat({ num, label, tone = '', className = '' }) {
  return (
    <div className={`m-stat ${tone} ${className}`.trim()}>
      <div className="m-stat-num">{num}</div>
      <div className="m-stat-lbl">{label}</div>
    </div>
  );
}

export function MBar({ pct, tone = '', height }) {
  const toneCls = pct >= 90 ? 'bad' : pct >= 75 ? 'warn' : tone;
  return (
    <div className={`m-bar ${toneCls}`.trim()} role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100} style={height ? { height } : undefined}>
      <span style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} />
    </div>
  );
}

/* ── Form bits ───────────────────────────────────────────────────── */
export function MField({ label, hint, children, htmlFor }) {
  return (
    <div className="m-field">
      {label && <label htmlFor={htmlFor}>{label}</label>}
      {children}
      {hint && <div className="m-hint">{hint}</div>}
    </div>
  );
}

export function MInput({ className = '', ...rest }) {
  return <input className={`m-input ${className}`.trim()} {...rest} />;
}

export function MSelect({ className = '', children, ...rest }) {
  return (
    <select className={`m-input m-select ${className}`.trim()} {...rest}>
      {children}
    </select>
  );
}

/* number stepper with big +/- buttons */
export function MStepper({ value, min = 1, max = 500, onChange, id }) {
  const set = (n) => onChange(Math.min(max, Math.max(min, n)));
  return (
    <div className="m-stepper">
      <button type="button" className="m-step-btn" aria-label="−" onClick={() => set(Number(value || min) - 1)}>−</button>
      <input
        id={id}
        className="m-input"
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
        onBlur={(e) => { if (e.target.value === '') onChange(min); }}
        aria-label="quantity"
      />
      <button type="button" className="m-step-btn" aria-label="+" onClick={() => set(Number(value || min) + 1)}>+</button>
    </div>
  );
}

/* radio option card with the round check */
export function MOption({ selected, onSelect, disabled, title, sub, chips, children, onClickBody }) {
  return (
    <div
      className={`m-option ${selected ? 'selected' : ''} ${disabled ? 'disabled' : ''}`.trim()}
      role="radio"
      aria-checked={selected}
      tabIndex={0}
      onClick={() => !disabled && onSelect?.()}
      onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && !disabled) { e.preventDefault(); onSelect?.(); } }}
    >
      <span className="m-check" aria-hidden="true"><Icon name="check" size={15} strokeWidth={3.4} /></span>
      <div className="m-opt-title">
        {title}
        {chips}
      </div>
      {sub && <div className="m-opt-sub">{sub}</div>}
      {children}
    </div>
  );
}

/* ── Section heading ─────────────────────────────────────────────── */
export function SectionH({ title, hint, art }) {
  return (
    <div className="m-section-h">
      {art}
      <span className="m-section-title">{title}</span>
      {hint && <span className="m-section-hint">{hint}</span>}
    </div>
  );
}

/* key-value line with an icon */
export function KV({ icon, children }) {
  return (
    <p className="m-kv">
      {icon}
      <span>{children}</span>
    </p>
  );
}

/* ── Loading / error / empty ─────────────────────────────────────── */
export function MLoader({ label }) {
  const { t } = useI18n();
  return (
    <div className="m-loader-brand" role="status" aria-live="polite">
      <ArtLogo size={56} />
      <div className="m-loader-word">{t('saathi.name')}</div>
      <div className="m-spinner" aria-hidden="true" />
      <p style={{ color: 'var(--m-ink-faint)', fontSize: 13.5 }}>{label || t('common.loading')}</p>
    </div>
  );
}

export function MError({ error, onRetry }) {
  const { t } = useI18n();
  const network = error?.code === 'NETWORK_ERROR';
  const message = network
    ? t('common.errorNetwork')
    : error?.message && error?.message !== 'Unexpected error'
      ? error.message
      : t('common.errorGeneric');
  return (
    <div className="m-state" role="alert">
      <ArtNotice size={76} tone="error" />
      <div className="m-state-title">{t('common.crashTitle')}</div>
      <p className="m-state-sub">{message}</p>
      {onRetry && (
        <MBtn variant="primary" onClick={onRetry} icon={<Icon name="refresh" size={17} />}>
          {t('common.retry')}
        </MBtn>
      )}
    </div>
  );
}

export function MEmpty({ art, title, hint, action }) {
  const { t } = useI18n();
  return (
    <div className="m-state">
      {art || <ArtBasket size={96} className="m-anim-pop" />}
      <div className="m-state-title">{title || t('common.empty')}</div>
      {hint && <p className="m-state-sub">{hint}</p>}
      {action}
    </div>
  );
}

/* ── Bottom sheet & confirm ──────────────────────────────────────── */
export function Sheet({ open, onClose, title, sub, children }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <>
      <div className="m-sheet-backdrop" onClick={onClose} />
      <div className="m-sheet" role="dialog" aria-modal="true" aria-label={title}>
        <div className="m-sheet-grab" aria-hidden="true" />
        {title && <h3>{title}</h3>}
        {sub && <p className="m-sheet-sub">{sub}</p>}
        {children}
      </div>
    </>
  );
}

export function MConfirm({ open, onClose, onConfirm, title, sub, confirmLabel, danger, busy }) {
  const { t } = useI18n();
  return (
    <Sheet open={open} onClose={onClose} title={title} sub={sub}>
      <div className="m-btn-row" style={{ marginTop: 6 }}>
        <MBtn variant="soft" onClick={onClose} disabled={busy}>{t('common.cancel')}</MBtn>
        <MBtn variant={danger ? 'danger' : 'primary'} onClick={onConfirm} disabled={busy}>
          {busy ? t('common.loading') : confirmLabel || t('common.confirm')}
        </MBtn>
      </div>
    </Sheet>
  );
}

/* ── Token ticket — the app's signature card ─────────────────────── */
export function TicketCard({ request, queue, label, compact }) {
  const { t, pick } = useI18n();
  if (!request) return null;
  return (
    <div className="m-ticket">
      <div className="m-ticket-top">
        <span aria-hidden="true"><Icon name="ticket" size={20} /></span>
        <span className="m-ticket-label">{(label || t('farmer.yourToken')).toUpperCase()}</span>
        <span className="m-right"><MBadge status={request.status} /></span>
      </div>

      <div className="m-ticket-num">
        <small>{t('farmer.queuePosition')}: {queue?.inQueue ? `#${queue.position}` : '—'}</small>
        {request.tokenNumber}
      </div>
      <p className="m-ticket-sub">
        {pick(request.crop, 'name')} · {request.quantityQuintals} {t('common.quintal')} · {t('farmer.estimatedValue')} {formatInr(request.estimatedValueInr)}
      </p>

      <div className="m-perf" aria-hidden="true" />

      <div className="m-ticket-body">
        <div className="m-ticket-grid">
          <div className="m-cell">
            <div className="m-k">{t('farmer.estimatedWait')}</div>
            <div className="m-v">{queue?.inQueue ? waitText(queue.estimatedWaitMinutes, t) : '—'}</div>
          </div>
          <div className="m-cell">
            <div className="m-k">{t('farmer.aheadOfYou')}</div>
            <div className="m-v">{queue?.inQueue ? queue.aheadCount : '—'}</div>
          </div>
          {!compact && (
            <>
              <div className="m-cell">
                <div className="m-k">{t('farmer.crop')}</div>
                <div className="m-v" style={{ fontSize: 15 }}>{pick(request.crop, 'name')}</div>
              </div>
              <div className="m-cell">
                <div className="m-k">{t('farmer.quantity')}</div>
                <div className="m-v">{request.quantityQuintals} {t('common.quintalShort')}</div>
              </div>
            </>
          )}
          <div className="m-cell wide">
            <div className="m-k">{t('farmer.centre')}</div>
            <div className="m-v" style={{ fontSize: 15 }}>{pick(request.centre, 'name')}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Status journey timeline ─────────────────────────────────────── */
export function Journey({ request }) {
  const { t, lang } = useI18n();
  const labels = t('farmer.journeySteps');
  const doneSet = new Set((request.timeline || []).map((x) => x.status));
  const terminal = ['CANCELLED', 'REJECTED'].includes(request.status);
  const order = { PENDING: 1, WAITING: 2, CALLED: 3, PROCESSING: 4 };
  const currentIdx = request.status in order ? order[request.status] : 1;

  return (
    <ol className="m-journey">
      {JOURNEY.map((step, i) => {
        const entry = (request.timeline || []).find((x) => x.status === step);
        const done = doneSet.has(step) || (step === 'COMPLETED' && request.status === 'COMPLETED');
        const current = !done && !terminal && currentIdx === i;
        return (
          <li key={step} className={done ? 'done' : current ? 'current' : 'pending'}>
            <span className="m-node" aria-hidden="true">
              {done ? <Icon name="check" size={16} strokeWidth={3.4} /> : i + 1}
            </span>
            <div>
              <div className="m-j-name">{labels[i]}</div>
              {entry && <div className="m-j-at">{formatDate(entry.at, lang)}</div>}
              {current && <div className="m-j-at">●</div>}
            </div>
          </li>
        );
      })}
      {terminal && (
        <li className="danger done">
          <span className="m-node" aria-hidden="true"><Icon name="x" size={15} strokeWidth={3.4} /></span>
          <div>
            <div className="m-j-name">{t(`status.${request.status}`)}</div>
            {request.note && <div className="m-j-at">{request.note}</div>}
          </div>
        </li>
      )}
    </ol>
  );
}

/* ── Language pills (light-on-dark) ─────────────────────────────── */
export function MLangPills({ variant = 'dark' }) {
  const { lang, setLang, languages } = useI18n();
  if (variant === 'light') {
    return (
      <div className="m-chip-row" role="group" aria-label="Language">
        {languages.map((l) => (
          <button key={l.code} type="button" className={`m-chip ${lang === l.code ? 'active' : ''}`} onClick={() => setLang(l.code)}>
            {l.native}
          </button>
        ))}
      </div>
    );
  }
  return (
    <div className="m-lang-row" role="group" aria-label="Language">
      {languages.map((l) => (
        <button key={l.code} type="button" className={`m-lang-pill ${lang === l.code ? 'active' : ''}`} onClick={() => setLang(l.code)}>
          {l.native}
        </button>
      ))}
    </div>
  );
}

/* ── Offline pill ────────────────────────────────────────────────── */
export function useOffline() {
  const [offline, setOffline] = useState(() => (typeof navigator !== 'undefined' ? !navigator.onLine : false));
  useEffect(() => {
    const on = () => setOffline(false);
    const off = () => setOffline(true);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);
  return offline;
}

/* helper: time-of-day greeting */
export function greetingKey() {
  const h = new Date().getHours();
  if (h < 12) return 'saathi.greetMorning';
  if (h >= 17) return 'saathi.greetEvening';
  return 'saathi.greetDay';
}

export { ArtWheat, ArtBasket, ArtLogo, ArtBirds, ArtSun, ArtNotice };
