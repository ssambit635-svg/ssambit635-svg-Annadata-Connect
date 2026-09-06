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
// Annadata Saathi typography — a neutral, institutional grotesk for UI text,
// a tighter cut for headings and a monospace for tokens, amounts and IDs.
// All bundled in the APK (no Google Fonts calls at runtime).
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource-variable/inter-tight/index.css';
import '@fontsource/ibm-plex-mono/500.css';
import '@fontsource/ibm-plex-mono/600.css';
import './pwa/register.js';
import { initNative } from './pwa/native.js';
import './styles/mobile.css';
import './styles/mobile-gov.css';

initNative();

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
