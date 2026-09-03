// Presentation helpers. Backend statuses are translated to farmer-friendly text here.

export const STATUS_TONE = {
  PENDING: 'neutral', WAITING: 'warning', CALLED: 'info',
  PROCESSING: 'info', COMPLETED: 'success', CANCELLED: 'danger', REJECTED: 'danger',
  OPEN: 'success', PAUSED: 'warning', CLOSED: 'danger',
};

export function formatInr(n) {
  if (n === null || n === undefined) return '—';
  return '₹' + Number(n).toLocaleString('en-IN');
}

export function formatTime(iso, lang) {
  const d = new Date(iso);
  return d.toLocaleTimeString(lang === 'hi' ? 'hi-IN' : 'en-IN', { hour: '2-digit', minute: '2-digit' });
}

export function formatDate(iso, lang) {
  const d = new Date(iso);
  return d.toLocaleString(lang === 'hi' ? 'hi-IN' : 'en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export function waitText(minutes, t) {
  if (minutes <= 0) return `~0 ${t('common.min')}`;
  if (minutes < 60) return `~${minutes} ${t('common.minutes')}`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `~${h}h ${m}m` : `~${h}h`;
}

export function statusTone(status) {
  return STATUS_TONE[status] || 'neutral';
}

// Ordered lifecycle used by the visual journey on the farmer status page.
export const JOURNEY = ['REQUEST_SUBMITTED', 'TOKEN_GENERATED', 'WAITING', 'CALLED', 'PROCESSING', 'COMPLETED'];
