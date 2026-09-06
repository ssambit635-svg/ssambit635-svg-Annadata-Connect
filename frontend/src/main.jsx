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
// Annadata Saathi (Android app) typography — rounded Devanagari display face
// plus a warm Indian body face; both ship in the APK bundle (no Google Fonts).
import '@fontsource/baloo-2/500.css';
import '@fontsource/baloo-2/600.css';
import '@fontsource/baloo-2/700.css';
import '@fontsource/baloo-2/800.css';
import '@fontsource/mukta/400.css';
import '@fontsource/mukta/500.css';
import '@fontsource/mukta/600.css';
import '@fontsource/mukta/700.css';
import './pwa/register.js';
import { initNative } from './pwa/native.js';
import './styles/mobile.css';

initNative();

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
