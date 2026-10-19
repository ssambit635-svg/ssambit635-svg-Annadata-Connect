// Lightweight toast + confirm system for both frontends (web portal and
// mobile app). Replaces window.alert / window.confirm, which broke the
// design system and looked like a browser error inside the APK WebView.
//
// Usage:
//   import { toast, confirmDialog } from '../components/Toast.jsx';
//   toast('Saved', 'success');
//   if (!(await confirmDialog({ message, confirmLabel, cancelLabel, danger: true }))) return;
// <ToastHost /> is mounted once in App.jsx (no i18n dependency — callers pass
// already-translated strings).
import { useEffect, useRef, useState } from 'react';
import Icon from './Icon.jsx';

let seq = 0;
const listeners = new Set();
function emit(evt) {
  listeners.forEach((fn) => {
    try { fn(evt); } catch { /* host errors must never break callers */ }
  });
}

export function toast(message, tone = 'info') {
  if (!message) return;
  emit({ type: 'toast', id: ++seq, message: String(message), tone });
}

export function confirmDialog({ title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', danger = false } = {}) {
  if (listeners.size === 0) {
    // No host mounted (e.g. unit tests) — fall back to the native dialog
    // rather than silently swallowing a destructive-action guard.
    return Promise.resolve(typeof window !== 'undefined' ? window.confirm(message || title || '') : false);
  }
  return new Promise((resolve) => {
    emit({ type: 'confirm', id: ++seq, title, message, confirmLabel, cancelLabel, danger, resolve });
  });
}

const TONE_ICON = { success: 'checkCircle', error: 'alertTriangle', info: 'info' };

export function ToastHost() {
  const [toasts, setToasts] = useState([]);
  const [confirm, setConfirm] = useState(null);
  const confirmBtnRef = useRef(null);
  const lastFocusRef = useRef(null);

  useEffect(() => {
    const onEvent = (evt) => {
      if (evt.type === 'toast') {
        setToasts((list) => [...list.slice(-2), evt]);
        setTimeout(() => setToasts((list) => list.filter((x) => x.id !== evt.id)), 4500);
      } else if (evt.type === 'confirm') {
        lastFocusRef.current = document.activeElement;
        setConfirm(evt);
      }
    };
    listeners.add(onEvent);
    return () => listeners.delete(onEvent);
  }, []);

  useEffect(() => {
    if (confirm) confirmBtnRef.current?.focus();
  }, [confirm]);

  const settle = (value) => {
    if (!confirm) return;
    confirm.resolve(value);
    setConfirm(null);
    lastFocusRef.current?.focus?.();
  };

  useEffect(() => {
    if (!confirm) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') settle(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [confirm]);

  return (
    <>
      <div className="anc-toasts" aria-live="polite" aria-atomic="false">
        {toasts.map((x) => (
          <div key={x.id} className={`anc-toast tone-${x.tone}`} role={x.tone === 'error' ? 'alert' : 'status'}>
            <Icon name={TONE_ICON[x.tone] || 'info'} size={17} />
            <span>{x.message}</span>
            <button type="button" className="anc-toast-x" aria-label="Dismiss" onClick={() => setToasts((list) => list.filter((y) => y.id !== x.id))}>
              <Icon name="x" size={14} />
            </button>
          </div>
        ))}
      </div>

      {confirm && (
        <div className="anc-confirm-backdrop" onClick={() => settle(false)}>
          <div
            className="anc-confirm"
            role="alertdialog"
            aria-modal="true"
            aria-label={confirm.title || confirm.message}
            onClick={(e) => e.stopPropagation()}
          >
            {confirm.title && <strong className="anc-confirm-title">{confirm.title}</strong>}
            {confirm.message && <p className="anc-confirm-msg">{confirm.message}</p>}
            <div className="anc-confirm-actions">
              <button type="button" className="anc-confirm-btn" onClick={() => settle(false)}>{confirm.cancelLabel}</button>
              <button
                type="button"
                ref={confirmBtnRef}
                className={`anc-confirm-btn${confirm.danger ? ' is-danger' : ' is-primary'}`}
                onClick={() => settle(true)}
              >
                {confirm.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
