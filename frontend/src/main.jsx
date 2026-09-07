import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles/global.css';
import './styles/home-polish.css';
import './styles/portal-theme.css';
import './styles/auth.css';
import './styles/polish-v3.css';
import './styles/polish-v4.css';
import '@fontsource/noto-sans-devanagari/devanagari-400.css';
import '@fontsource/noto-sans-devanagari/devanagari-600.css';
import '@fontsource/noto-sans-oriya/400.css';
import '@fontsource/noto-sans-oriya/600.css';
// Annadata Connect app typography — Plus Jakarta Sans (variable) for display
// and numerals, Inter for UI text, IBM Plex Mono for tokens and IDs.
// All bundled in the APK (no Google Fonts calls at runtime).
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource-variable/inter-tight/index.css';
import '@fontsource-variable/plus-jakarta-sans/index.css';
import '@fontsource/ibm-plex-mono/500.css';
import '@fontsource/ibm-plex-mono/600.css';
import './pwa/register.js';
import { initNative } from './pwa/native.js';
import './styles/brand.css';
import './styles/mobile.css';
import './styles/mobile-gov.css';
import './styles/web-apk.css';

initNative();

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
