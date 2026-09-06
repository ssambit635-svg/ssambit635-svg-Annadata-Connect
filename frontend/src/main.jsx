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
import './pwa/register.js';
import { initNative } from './pwa/native.js';

initNative();

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
