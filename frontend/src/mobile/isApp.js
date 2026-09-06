// Which frontend should boot: the website (default in browsers) or the bespoke
// native app UI ("Annadata Saathi") that ships inside the Android APK.
//
// - Inside the Capacitor shell it is ALWAYS the app UI.
// - In a normal browser it is the website, but `?app=1` flips a stored preview
//   flag so the app UI can be tried (and screenshotted) in any browser.
//   `?app=0` flips it back off.
const PREVIEW_KEY = 'ks-app-ui-preview';

function readPreviewFlag() {
  try { return localStorage.getItem(PREVIEW_KEY) === '1'; } catch { return false; }
}

export function isAppMode() {
  if (typeof window === 'undefined') return false;
  if (window.Capacitor?.isNativePlatform?.()) return true;
  return readPreviewFlag();
}

// Reads/stores the preview override once at boot (App.jsx) so navigating
// between routes does not re-run the URL parsing.
export function consumePreviewOverride() {
  if (typeof window === 'undefined') return;
  const params = new URLSearchParams(window.location.search);
  if (params.has('app')) {
    const on = params.get('app') !== '0';
    try { localStorage.setItem(PREVIEW_KEY, on ? '1' : '0'); } catch { /* private mode */ }
    params.delete('app');
    const rest = params.toString();
    window.history.replaceState({}, '', `${window.location.pathname}${rest ? `?${rest}` : ''}`);
    return on;
  }
  return null;
}
