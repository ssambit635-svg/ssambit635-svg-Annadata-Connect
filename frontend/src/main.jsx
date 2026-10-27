import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
// CSS is split by surface (see imports in LandingPage / LoginPage /
// RegisterPage / AppShell / MobileApp) so a landing visitor no longer
// downloads the portal + app stylesheets, and the APK skips the website's.
// Only the shared base + brand sheets and fonts load everywhere. Import
// ORDER inside each surface preserves the original cascade.
import './styles/global.css';
import '@fontsource/noto-sans-devanagari/devanagari-400.css';
import '@fontsource/noto-sans-devanagari/devanagari-600.css';
import '@fontsource/noto-sans-oriya/oriya-400.css';
import '@fontsource/noto-sans-oriya/oriya-600.css';
// Product typography: Plus Jakarta Sans display, Inter UI text, and IBM
// Plex Mono for identifiers. Only the Latin display face is loaded here;
// Odia / Devanagari glyphs fall back to the bundled Noto faces above.
import '@fontsource/inter/latin-400.css';
import '@fontsource/inter/latin-500.css';
import '@fontsource/inter/latin-600.css';
import './styles/fonts.css';
import '@fontsource/ibm-plex-mono/latin-500.css';
import '@fontsource/ibm-plex-mono/latin-600.css';
import './pwa/register.js';
import { initNative } from './pwa/native.js';
import './styles/brand.css';

initNative();

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
