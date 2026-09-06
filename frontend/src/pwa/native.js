// Capacitor (APK) niceties: Android hardware back button navigates history
// instead of killing the app; exits only from the root screens.
export async function initNative() {
  const cap = window.Capacitor;
  if (!cap?.isNativePlatform?.()) return;
  try {
    const { App } = await import('@capacitor/app');
    App.addListener('backButton', ({ canGoBack }) => {
      const root = ['/', '/login', '/farmer', '/officer', '/authority'].includes(window.location.pathname);
      if (canGoBack && !root) window.history.back();
      else App.exitApp();
    });
    document.documentElement.classList.add('is-native');
  } catch { /* plugin unavailable in web builds */ }
}
