// Last-good snapshot cache for the APK's gate moments (token / ID card /
// farmer home). When the network is gone at the procurement centre, the
// farmer can still show the last saved token instead of an error screen.
// Snapshots are timestamped and clearly labelled offline in the UI — queue
// position inside a snapshot is stale by definition.
const PREFIX = 'anc-cache-';

export function saveSnapshot(key, data) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify({ at: Date.now(), data }));
  } catch { /* storage full / private mode — offline view is best-effort */ }
}

export function loadSnapshot(key) {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && parsed.data ? parsed : null;
  } catch {
    return null;
  }
}
