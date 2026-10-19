import { Suspense, lazy } from 'react';
import { isAppMode, consumePreviewOverride } from './mobile/isApp.js';
import { ToastHost } from './components/Toast.jsx';

// Which frontend boots is decided once per load: the website in browsers,
// the Android app UI inside the Capacitor APK (or ?app=1 preview).
// Each frontend is its own lazy chunk — the APK never downloads the website
// (landing + GSAP + portal pages) and the website never downloads the app UI.
consumePreviewOverride();

const WebApp = lazy(() => import('./WebApp.jsx'));
const MobileApp = lazy(() => import('./mobile/MobileApp.jsx').then((m) => ({ default: m.MobileApp })));

export default function App() {
  const Root = isAppMode() ? MobileApp : WebApp;
  return (
    <>
    <Suspense fallback={<div role="status" style={{ padding: '2rem', textAlign: 'center', fontFamily: 'system-ui, sans-serif' }}>Annadata Connect…</div>}>
      <Root />
    </Suspense>
    <ToastHost />
    </>
  );
}
