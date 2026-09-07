// Launch splash — the brand mark assembling itself, centred on screen.
//
// Choreography (≈1.6s, all CSS, GPU-composited transforms/opacity only):
//   0.00s  ring draws itself clockwise
//   0.35s  sun rises with a soft breathing glow
//   0.55s  farmer + wheat fade up
//   0.75s  fields slide in, one contour after another
//   0.95s  leaf unfurls out of the ring, nodes light up
//   1.10s  wordmark settles under the mark
//   1.65s  whole scene lifts and dissolves into the app
//
// Shown once per app launch (not on every route change). Respects
// prefers-reduced-motion — the mark simply fades in and out.
import { useEffect, useState } from 'react';
import { useI18n } from '../i18n/I18nContext.jsx';
import { BrandLogo, BrandWordmark } from './BrandLogo.jsx';

const SESSION_KEY = 'anc-splash-shown';
const DURATION = 1900;
const FADE = 520;

function alreadyShown() {
  try { return sessionStorage.getItem(SESSION_KEY) === '1'; } catch { return false; }
}
function markShown() {
  try { sessionStorage.setItem(SESSION_KEY, '1'); } catch { /* private mode */ }
}

export function SplashScreen({ force = false }) {
  const { t } = useI18n();
  const [phase, setPhase] = useState(() => (force || !alreadyShown() ? 'in' : 'done'));

  useEffect(() => {
    if (phase === 'done') return undefined;
    markShown();
    const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const hold = reduce ? 900 : DURATION;
    const t1 = setTimeout(() => setPhase('out'), hold);
    const t2 = setTimeout(() => setPhase('done'), hold + FADE);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [phase]);

  if (phase === 'done') return null;

  return (
    <div className={`anc-splash${phase === 'out' ? ' is-leaving' : ''}`} role="status" aria-label={t('saathi.name')}>
      <div className="anc-splash-glow" aria-hidden="true" />
      <div className="anc-splash-mark">
        <BrandLogo size={148} animate />
      </div>
      <div className="anc-splash-word">
        <BrandWordmark size={30} first={t('saathi.brandFirst')} second={t('saathi.brandSecond')} />
        <span className="anc-splash-tag">{t('app.tagline')}</span>
      </div>
      <div className="anc-splash-foot" aria-hidden="true">
        <span className="anc-splash-dot" /> {t('saathi.govChip')}
      </div>
    </div>
  );
}

export default SplashScreen;
