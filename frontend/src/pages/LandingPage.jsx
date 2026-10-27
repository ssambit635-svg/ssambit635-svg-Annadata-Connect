import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../components/Icon.jsx';
import { BrandLogo } from '../components/BrandLogo.jsx';
import { useAuth, homeFor } from '../auth/AuthContext.jsx';
import { useI18n } from '../i18n/I18nContext.jsx';
import { LanguageToggle } from '../components/LanguageToggle.jsx';
import { api } from '../services/api/client.js';
import { formatDate, formatInr } from '../utils/format.js';
import '../styles/home-polish.css';
import '../styles/polish-v3.css';
import '../styles/polish-v4.css';

// Indicative pilot MSP reference — must stay in sync with backend seed crops
// (backend/src/data/seed-data.js). Labels include Odia (pilot's first language).
const MSP_ROWS = [
  { en: 'Paddy (Common)', hi: 'धान (सामान्य)', or: 'ଧାନ (ସାଧାରଣ)', msp: 2300 },
  { en: 'Wheat', hi: 'गेहूं', or: 'ଗହମ', msp: 2425 },
  { en: 'Maize', hi: 'मक्का', or: 'ମକା', msp: 2225 },
  { en: 'Moong (Green Gram)', hi: 'मूंग', or: 'ମୁଗ', msp: 8682 },
  { en: 'Mustard', hi: 'सरसों', or: 'ସୋରିଷ', msp: 5650 },
  { en: 'Cotton', hi: 'कपास', or: 'କପା', msp: 7121 },
];

// Khordha pilot centres — fallback mirror of backend seed centres. When the
// API is reachable, live status/queue from /api/public/centres is merged in
// (by id); these constants remain the offline fallback.
const CENTRES = [
  { id: 'centre-bbsr-central', nameEn: 'Bhubaneswar Central Procurement Centre', nameHi: 'भुवनेश्वर केंद्रीय खरीद केंद्र', nameOr: 'ଭୁବନେଶ୍ୱର କେନ୍ଦ୍ରୀୟ କ୍ରୟ କେନ୍ଦ୍ର', capacity: 8000, area: 'Bhubaneswar' },
  { id: 'centre-jatni', nameEn: 'Jatni Mandi Procurement Centre', nameHi: 'जटणी मंडी खरीद केंद्र', nameOr: 'ଜଟଣୀ ମଣ୍ଡି କ୍ରୟ କେନ୍ଦ୍ର', capacity: 5000, area: 'Jatni' },
  { id: 'centre-khordha', nameEn: 'Khordha Procurement Centre', nameHi: 'खोर्धा खरीद केंद्र', nameOr: 'ଖୋର୍ଦ୍ଧା କ୍ରୟ କେନ୍ଦ୍ର', capacity: 6000, area: 'Khordha' },
  { id: 'centre-balianta', nameEn: 'Balianta Procurement Centre', nameHi: 'बाळियंता खरीद केंद्र', nameOr: 'ବାଲିଆନ୍ତା କ୍ରୟ କେନ୍ଦ୍ର', capacity: 4000, area: 'Balianta' },
  { id: 'centre-tangi', nameEn: 'Tangi Procurement Centre', nameHi: 'तंगी खरीद केंद्र', nameOr: 'ଟାଙ୍ଗୀ କ୍ରୟ କେନ୍ଦ୍ର', capacity: 3500, area: 'Tangi' },
  { id: 'centre-pipili', nameEn: 'Pipili Procurement Centre', nameHi: 'पिपली खरीद केंद्र', nameOr: 'ପିପିଲି କ୍ରୟ କେନ୍ଦ୍ର', capacity: 4500, area: 'Puri' },
];

const FEATURES = [
  { key: 'token', icon: 'ticket', number: '01' },
  { key: 'queue', icon: 'list', number: '02' },
  { key: 'recommend', icon: 'target', number: '03' },
  { key: 'payment', icon: 'card', number: '04' },
  { key: 'sms', icon: 'mail', number: '05' },
  { key: 'assisted', icon: 'users', number: '06' },
];

// Proof bar: the farmer journey (no invented portal statistics).
const PROOF_ITEMS = [
  { key: '1', icon: 'user' },
  { key: '2', icon: 'ticket' },
  { key: '3', icon: 'store' },
  { key: '4', icon: 'rupee' },
];

// Free Android APK download — a rolling "latest" release asset published by the
// Android APK GitHub Action (see .github/workflows/android-apk.yml). Keep this
// URL in sync if the repository is renamed or the app is hosted elsewhere.
const ANDROID_APK_URL =
  'https://github.com/ssambit635-svg/ssambit635-svg-Annadata-Connect/releases/download/latest-apk/annadata-connect-latest.apk';
const ANDROID_RELEASES_URL =
  'https://github.com/ssambit635-svg/ssambit635-svg-Annadata-Connect/releases';

export default function LandingPage() {
  const { t, lang, pick } = useI18n();
  const { user } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const home = user ? homeFor(user.role) : '/login';
  const closeMenu = () => setMenuOpen(false);
  const menuBtnRef = useRef(null);

  // Close the mobile menu on Escape and return focus to its button.
  useEffect(() => {
    if (!menuOpen) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') { setMenuOpen(false); menuBtnRef.current?.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  // Live MSP + centre status from the public API, with the bundled mirror
  // above as the offline/server-down fallback (never blocks first paint).
  const [liveCrops, setLiveCrops] = useState(null);
  const [liveCentres, setLiveCentres] = useState(null);
  useEffect(() => {
    let cancelled = false;
    api('/api/reference/crops').then((d) => { if (!cancelled && d?.crops?.length) setLiveCrops(d.crops); }).catch(() => {});
    api('/api/public/centres').then((d) => {
      if (!cancelled && d?.centres?.length) setLiveCentres(Object.fromEntries(d.centres.map((c) => [c.id, c])));
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);
  const mspRows = liveCrops
    ? liveCrops.map((c) => ({ en: c.nameEn, hi: c.nameHi, or: c.nameOr, msp: c.mspPerQuintal }))
    : MSP_ROWS;

  // Keep the service announcement stable instead of cycling copy while the
  // visitor is trying to read or interact with the page.
  // Public token tracking (no account): token number + registered mobile.
  const [trackForm, setTrackForm] = useState({ tokenNumber: '', phone: '' });
  const [trackState, setTrackState] = useState({ phase: 'idle', data: null });
  async function onTrack(e) {
    e.preventDefault();
    setTrackState({ phase: 'busy', data: null });
    try {
      const d = await api('/api/public/track', {
        method: 'POST',
        body: { tokenNumber: trackForm.tokenNumber.trim(), phone: trackForm.phone.trim() },
      });
      setTrackState({ phase: 'done', data: d.track });
    } catch (err) {
      setTrackState({ phase: err.status === 404 ? 'notfound' : 'error', data: null });
    }
  }
  const track = trackState.data;

  // APK link is direct: a cross-origin HEAD check to GitHub always failed
  // (302 to storage without CORS), leaving the button stuck on "pending".

  return (
    <div className="landing landing-v2">
      <a className="home-skip-link" href="#home-main">{t('landing.skipToContent')}</a>

      <div className="home-tricolour" aria-hidden="true"><span /><span /><span /></div>

      <div className="home-utility-bar">
        <div className="home-container home-utility-inner">
          <div className="home-utility-copy">
            <span className="home-live-dot" aria-hidden="true" />
            <span>{t('landing.govStrip')}</span>
          </div>
          <div className="home-utility-actions">
            <span className="home-utility-label">{t('landing.portalLabel')}</span>
            <span className="home-utility-divider" aria-hidden="true" />
            <LanguageToggle className="home-language" />
          </div>
        </div>
      </div>

      <div className="home-prototype-banner" role="note">
        <div className="home-container home-prototype-inner">
          <Icon name="info" size={16} />
          <span>{t('landing.prototypeBanner')}</span>
        </div>
      </div>

      <header className="home-header">
        <div className="home-container home-header-inner">
          <a href="#top" className="home-brand" onClick={closeMenu} aria-label={t('landing.brand')}>
            <span className="home-brand-mark" aria-hidden="true">
              <BrandLogo size={46} />
            </span>
            <span className="home-brand-copy">
              <strong>{t('landing.brand')}</strong>
              <small>{t('landing.brandSub')}</small>
            </span>
          </a>

          <button
            type="button"
            ref={menuBtnRef}
            className="home-menu-toggle"
            aria-expanded={menuOpen}
            aria-controls="public-home-nav"
            onClick={() => setMenuOpen((open) => !open)}
          >
            <Icon name={menuOpen ? 'x' : 'grid'} size={18} />
            <span>{menuOpen ? t('landing.closeMenu') : t('landing.menu')}</span>
          </button>

          <nav id="public-home-nav" className={`home-nav${menuOpen ? ' is-open' : ''}`} aria-label={t('landing.primaryNav')}>
            <a href="#features" onClick={closeMenu}>{t('landing.navFeatures')}</a>
            <a href="#how" onClick={closeMenu}>{t('landing.navHow')}</a>
            <a href="#track" onClick={closeMenu}>{t('landing.navTrack')}</a>
            <a href="#msp" onClick={closeMenu}>{t('landing.navMsp')}</a>
            <a href="#centres" onClick={closeMenu}>{t('landing.navCentres')}</a>
            <a href="#app" onClick={closeMenu}>{t('landing.navApp')}</a>
          </nav>

          <div className="home-header-actions">
            {user ? (
              <Link to={home} className="home-button home-button-solid">{t('landing.openDashboard')} <Icon name="arrowUpRight" size={16} /></Link>
            ) : (
              <>
                <Link to="/register" className="home-button home-button-outline home-register-link">{t('landing.register')}</Link>
                <Link to="/login" className="home-button home-button-primary"><Icon name="key" size={16} /> {t('landing.login')}</Link>
              </>
            )}
          </div>
        </div>
      </header>

      <div className="home-announcement" aria-label={t('landing.tickerLabel')}>
        <div className="home-container home-announcement-inner">
          <span className="home-announcement-label"><Icon name="megaphone" size={15} /> {t('landing.tickerLabel')}</span>
          <span className="home-announcement-message">{t('landing.ticker1')}</span>
          <a href="tel:155261" className="home-announcement-phone"><Icon name="phone" size={14} /> 155261</a>
        </div>
      </div>

      <main id="home-main">
        <section className="home-hero" id="top">
          <div className="home-hero-glow home-hero-glow-one" aria-hidden="true" />
          <div className="home-hero-glow home-hero-glow-two" aria-hidden="true" />
          <div className="home-container home-hero-grid">
            <div className="home-hero-copy">
              <div className="home-eyebrow"><span className="home-eyebrow-line" /> {t('landing.heroKicker')}</div>
              <h1>{t('landing.heroTitle')}</h1>
              <p className="home-hero-sub">{t('landing.heroSub')}</p>

              <div className="home-hero-actions">
                {user ? (
                  <Link to={home} className="home-button home-button-large home-button-primary">{t('landing.openDashboard')} <Icon name="arrowUpRight" size={18} /></Link>
                ) : (
                  <>
                    <Link to="/register" className="home-button home-button-large home-button-primary">{t('landing.heroCtaRegister')} <Icon name="arrowUpRight" size={18} /></Link>
                    <a href="#track" className="home-button home-button-large home-button-quiet">{t('landing.heroTrackCta')} <Icon name="arrowUpRight" size={17} /></a>
                  </>
                )}
              </div>

              <div className="home-hero-trust">
                <span><Icon name="checkCircle" size={17} /> {t('landing.heroTrustOne')}</span>
                <span><Icon name="checkCircle" size={17} /> {t('landing.heroTrustTwo')}</span>
              </div>
            </div>

            <div className="home-hero-visual">
              <div className="home-visual-backdrop" aria-hidden="true" />
              <div className="home-image-frame">
                <img src="/annadata-hero.jpg" alt={t('landing.heroImageAlt')} width="1672" height="941" loading="eager" fetchpriority="high" decoding="async" />
                <div className="home-image-shade" aria-hidden="true" />
                <div className="home-image-caption">
                  <span className="home-caption-dot" />
                  <span><strong>{t('landing.visualLive')}</strong><small>{t('landing.visualLiveSub')}</small></span>
                </div>
              </div>
              <div className="home-token-float">
                <div className="home-token-float-top"><span>{t('landing.visualTokenLabel')}</span><Icon name="checkCircle" size={17} /></div>
                <strong>ANC-112</strong>
                <span className="home-token-float-status"><span /> {t('landing.visualTokenStatus')}</span>
              </div>
              <div className="home-payment-float">
                <span className="home-payment-icon"><Icon name="rupee" size={16} /></span>
                <span><small>{t('landing.visualPaymentLabel')}</small><strong>₹12,075</strong></span>
              </div>
            </div>
          </div>
        </section>

        <section className="home-proof" aria-label={t('landing.howTitle')}>
          <div className="home-container home-proof-inner">
            <div className="home-proof-intro">
              <span className="home-overline">{t('landing.proofEyebrow')}</span>
              <strong>{t('landing.proofTitle')}</strong>
            </div>
            <div className="home-proof-stats">
              {PROOF_ITEMS.map((item) => (
                <div className="home-proof-stat" key={item.key}>
                  <span className="home-proof-icon"><Icon name={item.icon} size={17} /></span>
                  <span><strong>{t(`landing.step${item.key}t`)}</strong><small>{t(`landing.step${item.key}d`)}</small></span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="features" className="home-section home-features-section">
          <div className="home-container">
            <div className="home-section-heading">
              <div>
                <span className="home-overline">{t('landing.featuresEyebrow')}</span>
                <h2>{t('landing.featuresTitle')}</h2>
                <p>{t('landing.featuresSub')}</p>
              </div>
              <span className="home-heading-badge"><Icon name="checkCircle" size={16} /> {t('landing.featuresBadge')}</span>
            </div>

            <div className="home-feature-layout">
              <div className="home-feature-lead">
                <div className="home-feature-lead-top"><span className="home-lead-index">00</span><span>{t('landing.featureLeadLabel')}</span></div>
                <h3>{t('landing.featureLeadTitle')}</h3>
                <p>{t('landing.featureLeadDesc')}</p>
                <div className="home-mini-route" aria-hidden="true">
                  <div><span className="home-route-node is-done"><Icon name="check" size={13} /></span><small>{t('landing.routeOne')}</small></div>
                  <span className="home-route-line" />
                  <div><span className="home-route-node is-done"><Icon name="check" size={13} /></span><small>{t('landing.routeTwo')}</small></div>
                  <span className="home-route-line" />
                  <div><span className="home-route-node is-active"><Icon name="rupee" size={13} /></span><small>{t('landing.routeThree')}</small></div>
                </div>
                <Link to={user ? home : '/register'} className="home-inline-link">{t('landing.featureLeadCta')} <Icon name="arrowUpRight" size={16} /></Link>
              </div>

              <div className="home-feature-grid">
                {FEATURES.map((feature) => (
                  <article className="home-feature-card" key={feature.key}>
                    <div className="home-feature-card-head">
                      <span className="home-feature-number">{feature.number}</span>
                      <span className="home-feature-icon"><Icon name={feature.icon} size={21} /></span>
                    </div>
                    <h3>{t(`landing.f_${feature.key}_t`)}</h3>
                    <p>{t(`landing.f_${feature.key}_d`)}</p>
                    <span className="home-card-arrow" aria-hidden="true"><Icon name="arrowUpRight" size={16} /></span>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="how" className="home-section home-how-section">
          <div className="home-container">
            <div className="home-section-heading home-section-heading-centered">
              <div>
                <span className="home-overline">{t('landing.howEyebrow')}</span>
                <h2>{t('landing.howTitle')}</h2>
                <p>{t('landing.howSub')}</p>
              </div>
            </div>
            <div className="home-steps">
              {['1', '2', '3', '4'].map((number, index) => (
                <div className="home-step" key={number}>
                  <div className="home-step-number">{number}</div>
                  {index < 3 && <span className="home-step-connector" aria-hidden="true" />}
                  <span className="home-step-label">{t(`landing.step${number}t`)}</span>
                  <p>{t(`landing.step${number}d`)}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="msp" className="home-section home-rates-section">
          <div className="home-container home-rates-grid">
            <div className="home-rates-copy">
              <span className="home-overline">{t('landing.ratesEyebrow')}</span>
              <h2>{t('landing.mspTitle')}</h2>
              <p>{t('landing.mspSub')}</p>
              <div className="home-rate-highlights">
                {mspRows.slice(0, 3).map((crop) => (
                  <div className="home-rate-highlight" key={crop.en}>
                    <span>{crop[lang] || crop.en}</span>
                    <strong>₹{crop.msp.toLocaleString('en-IN')}</strong><small>/ {t('landing.perQuintal')}</small>
                  </div>
                ))}
              </div>
              <p className="home-rate-note"><Icon name="info" size={15} /> {t('landing.mspNote')}</p>
            </div>
            <div className="home-rates-card">
              <div className="home-rates-card-head">
                <div><span className="home-card-kicker">{t('landing.rateCardKicker')}</span><strong>{t('landing.rateCardTitle')}</strong></div>
                <span className="home-rate-year">MSP</span>
              </div>
              <table className="home-rate-table">
                <caption className="sr-only">{t('landing.mspTitle')}</caption>
                <tbody>
                  {mspRows.map((crop) => (
                    <tr className="home-rate-row" key={crop.en}>
                      <th scope="row">{crop[lang] || crop.en}</th>
                      <td><strong>₹{crop.msp.toLocaleString('en-IN')}</strong></td>
                      <td><small>/ {t('landing.perQuintal')}</small></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="home-rate-footer"><Icon name="checkCircle" size={15} /> {t('landing.rateCardFooter')}</div>
            </div>
          </div>
        </section>

        <section id="centres" className="home-section home-centres-section">
          <div className="home-container">
            <div className="home-section-heading home-centres-heading">
              <div>
                <span className="home-overline">{t('landing.centresEyebrow')}</span>
                <h2>{t('landing.centresTitle')}</h2>
                <p>{t('landing.centresSub')}</p>
              </div>
              <span className="home-heading-badge home-heading-badge-warm"><Icon name="store" size={16} /> {t('landing.centresBadge')}</span>
            </div>
            <div className="home-centre-grid">
              {CENTRES.map((centre, index) => {
                const live = liveCentres?.[centre.id];
                return (
                  <article className="home-centre-card" key={centre.id}>
                    <div className="home-centre-top">
                      <span className="home-centre-number">0{index + 1}</span>
                      {live ? (
                        <span className={`home-open-badge is-${live.status.toLowerCase()}`}><span aria-hidden="true" />{t(`status.${live.status}`)}</span>
                      ) : (
                        <span className="home-open-badge">{centre.area}</span>
                      )}
                    </div>
                    <span className="home-centre-icon"><Icon name="store" size={20} /></span>
                    <h3>{pick(live || centre, 'name')}</h3>
                    <div className="home-centre-meta">
                      <span><Icon name="pin" size={14} /> {centre.area}</span>
                      <span>{t('landing.capacityCol')}: {(live?.capacityQuintals ?? centre.capacity).toLocaleString('en-IN')} q</span>
                      {live && <span><Icon name="users" size={14} /> {live.queue.waiting} {t('landing.centreWaiting')}</span>}
                    </div>
                  </article>
                );
              })}
            </div>
            <p className="home-centres-note"><Icon name="info" size={15} /> {t('landing.centresStatusNote')}</p>
          </div>
        </section>

        <section id="track" className="home-section home-track-section">
          <div className="home-container">
            <div className="home-section-heading home-section-heading-centered">
              <div>
                <span className="home-overline">{t('landing.trackEyebrow')}</span>
                <h2>{t('landing.trackTitle')}</h2>
                <p>{t('landing.trackSub')}</p>
              </div>
            </div>

            <form className="home-track-form" onSubmit={onTrack}>
              <div className="home-track-field">
                <label htmlFor="track-token">{t('landing.trackTokenLabel')}</label>
                <input
                  id="track-token"
                  value={trackForm.tokenNumber}
                  onChange={(e) => setTrackForm({ ...trackForm, tokenNumber: e.target.value })}
                  placeholder={t('landing.trackTokenPlaceholder')}
                  autoComplete="off"
                  required
                />
              </div>
              <div className="home-track-field">
                <label htmlFor="track-phone">{t('landing.trackPhoneLabel')}</label>
                <input
                  id="track-phone"
                  type="tel"
                  inputMode="numeric"
                  value={trackForm.phone}
                  onChange={(e) => setTrackForm({ ...trackForm, phone: e.target.value })}
                  placeholder={t('landing.trackPhonePlaceholder')}
                  autoComplete="tel"
                  required
                />
              </div>
              <button type="submit" className="home-button home-button-large home-button-primary" disabled={trackState.phase === 'busy'}>
                <Icon name="search" size={17} /> {trackState.phase === 'busy' ? t('landing.trackSearching') : t('landing.trackBtn')}
              </button>
            </form>

            {trackState.phase === 'notfound' && (
              <div className="home-track-alert" role="alert"><Icon name="alertTriangle" size={17} /> {t('landing.trackNotFound')}</div>
            )}
            {trackState.phase === 'error' && (
              <div className="home-track-alert" role="alert"><Icon name="alertTriangle" size={17} /> {t('landing.trackError')}</div>
            )}

            {trackState.phase === 'done' && track && (
              <div className="home-track-result" role="status">
                <div className="home-track-result-head">
                  <div>
                    <span className="home-card-kicker">{t('landing.trackTokenLabel')}</span>
                    <strong className="home-track-number">{track.tokenNumber}</strong>
                  </div>
                  <span className="home-open-badge is-open"><span aria-hidden="true" />{t(`status.${track.status}`)}</span>
                </div>
                <div className="home-track-grid">
                  <span><Icon name="wheat" size={16} /> {pick(track.crop, 'name')} · {track.quantityQuintals} {t('common.quintal')}</span>
                  <span><Icon name="store" size={16} /> {pick(track.centre, 'name')}</span>
                  <span><Icon name="rupee" size={16} /> {formatInr(track.estimatedValueInr)}</span>
                  {track.queue.inQueue && (
                    <>
                      <span><Icon name="list" size={16} /> {t('landing.trackPosition')}: {track.queue.position} ({track.queue.aheadCount} {t('landing.trackAhead')})</span>
                      <span><Icon name="clock" size={16} /> {t('landing.trackEstWait')}: ~{track.queue.estimatedWaitMinutes} {t('common.minutes')}</span>
                    </>
                  )}
                  <span>
                    <Icon name="card" size={16} /> {t('landing.trackPayment')}:{' '}
                    {track.payment
                      ? track.payment.status === 'PENDING'
                        ? t('farmer.payment.processing')
                        : `${t('farmer.payment.paidOn')}: ${formatDate(track.payment.paidAt, lang)} · ${formatInr(track.payment.amountInr)}`
                      : t('farmer.payment.none')}
                  </span>
                </div>
                {track.timeline?.length > 0 && (
                  <div className="home-track-journey">
                    <strong>{t('landing.trackJourney')}</strong>
                    <ol>
                      {track.timeline.map((step, i) => (
                        <li key={`${step.status}-${i}`}>
                          <span className="home-track-dot" aria-hidden="true" />
                          <span>{t(`status.${step.status}`)}</span>
                          <small>{formatDate(step.at, lang)}</small>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
                <p className="home-track-note"><Icon name="info" size={14} /> {t('landing.trackLiveNote')}</p>
              </div>
            )}
          </div>
        </section>

        <section id="faq" className="home-section home-faq-section">
          <div className="home-container">
            <div className="home-section-heading home-section-heading-centered">
              <div>
                <span className="home-overline">{t('landing.faqEyebrow')}</span>
                <h2>{t('landing.faqTitle')}</h2>
              </div>
            </div>
            <div className="home-faq-list">
              {[1, 2, 3, 4].map((n) => (
                <details className="home-faq-item" key={n}>
                  <summary>{t(`landing.faqQ${n}`)}</summary>
                  <p>{t(`landing.faqA${n}`)}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section id="app" className="home-section home-app-section">
          <div className="home-container">
            <div className="home-app-band">
              <div className="home-app-band-head">
                <span className="home-overline">{t('landing.downloadEyebrow')}</span>
                <h2>{t('landing.downloadTitle')}</h2>
                <p>{t('landing.downloadSub')}</p>
              </div>
              <div className="home-app-options">
                <a
                  className="home-app-option"
                  href={ANDROID_APK_URL}
                >
                  <span className="home-app-ico"><Icon name="smartphone" size={25} /></span>
                  <span className="home-app-copy">
                    <strong>{t('landing.downloadAndroidTitle')}</strong>
                    <small>{t('landing.downloadAndroidSub')}</small>
                  </span>
                  <span className="home-app-btn">
                    <Icon name="download" size={16} />
                    {t('landing.downloadAndroidBtn')}
                  </span>
                </a>
                <Link className="home-app-option" to={user ? home : '/login'}>
                  <span className="home-app-ico"><Icon name="monitor" size={25} /></span>
                  <span className="home-app-copy">
                    <strong>{t('landing.downloadBrowserTitle')}</strong>
                    <small>{t('landing.downloadBrowserSub')}</small>
                  </span>
                  <span className="home-app-btn home-app-btn-quiet"><Icon name="arrowUpRight" size={16} /> {t('landing.downloadBrowserBtn')}</span>
                </Link>
              </div>
              <p className="home-app-note"><Icon name="shield" size={15} /> {t('landing.downloadNote')}</p>
              <div className="home-install-guide">
                <strong>{t('landing.installTitle')}</strong>
                <ol>
                  <li>{t('landing.install1')}</li>
                  <li>{t('landing.install2')}</li>
                  <li>{t('landing.install3')}</li>
                </ol>
                <a href={ANDROID_RELEASES_URL} target="_blank" rel="noreferrer" className="home-inline-link">{t('landing.releasesLink')} <Icon name="arrowUpRight" size={14} /></a>
              </div>
            </div>
          </div>
        </section>

        <section id="help" className="home-section home-assist-section">
          <div className="home-container">
            <div className="home-assist-card">
              <div className="home-assist-pattern" aria-hidden="true" />
              <div className="home-assist-icon"><Icon name="users" size={27} /></div>
              <div className="home-assist-copy">
                <span className="home-overline">{t('landing.assistEyebrow')}</span>
                <h2>{t('landing.assistTitle')}</h2>
                <p>{t('landing.assistDesc')}</p>
              </div>
              <a href="#faq" className="home-button home-button-large home-button-dark">{t('landing.assistCta')} <Icon name="arrowUpRight" size={17} /></a>
            </div>
          </div>
        </section>
      </main>

      <footer className="home-footer">
        <div className="home-footer-support">
          <div className="home-footer-watermark" aria-hidden="true">ANC</div>
          <div className="home-container home-footer-support-inner">
            <div>
              <span className="home-overline home-overline-light">{t('landing.supportEyebrow')}</span>
              <h2>{t('landing.needHelp')}</h2>
              <p>{t('landing.needHelpSub')}</p>
            </div>
            <a href="tel:155261" className="home-footer-contact"><Icon name="phone" size={17} /> {t('landing.getInTouch')} <Icon name="arrowUpRight" size={16} /></a>
          </div>
        </div>

        <div className="home-container home-footer-grid">
          <div className="home-footer-brand-col">
            <a href="#top" className="home-brand home-brand-footer">
              <span className="home-brand-mark" aria-hidden="true"><BrandLogo size={46} /></span>
              <span className="home-brand-copy"><strong>{t('landing.brand')}</strong><small>{t('landing.brandSub')}</small></span>
            </a>
            <p>{t('landing.footerTag')}</p>
            <span className="home-footer-pilot"><Icon name="checkCircle" size={14} /> {t('landing.footerPilot')}</span>
          </div>
          <div className="home-footer-column">
            <h3>{t('landing.fGetStarted')}</h3>
            <Link to="/login">{t('landing.login')}</Link>
            <Link to="/register">{t('landing.register')}</Link>
            {user && <Link to={home}>{t('landing.openDashboard')}</Link>}
            <a href="#how">{t('landing.navHow')}</a>
            <a href="#app">{t('landing.navApp')}</a>
          </div>
          <div className="home-footer-column">
            <h3>{t('landing.fPortal')}</h3>
            <a href="#features">{t('landing.navFeatures')}</a>
            <a href="#msp">{t('landing.navMsp')}</a>
            <a href="#centres">{t('landing.navCentres')}</a>
            <a href="#help">{t('landing.fAssistedLink')}</a>
          </div>
          <div className="home-footer-column home-footer-contact-col">
            <h3>{t('landing.fSupport')}</h3>
            <a href="tel:155261"><Icon name="phone" size={14} /> {t('landing.fsHelpline')}</a>
            <a href="#help"><Icon name="users" size={14} /> {t('landing.fsAssisted')}</a>
            <a href="#how"><Icon name="mail" size={14} /> {t('landing.fsSms')}</a>
            <a href="#help"><Icon name="chat" size={14} /> {t('landing.fsHelp')}</a>
          </div>
        </div>

        <div className="home-footer-base">
          <div className="home-container home-footer-base-inner">
            <span><Icon name="phone" size={14} /> {t('landing.helpline')} <strong>155261</strong></span>
            <span>{t('landing.footerRights')}</span>
            <a href="#top">{t('landing.backToTop')} <Icon name="arrowUp" size={14} /></a>
          </div>
        </div>
      </footer>

      <div className="home-mobile-cta">
        {user ? (
          <Link to={home} className="home-button home-button-primary">{t('landing.openDashboard')}</Link>
        ) : (
          <Link to="/register" className="home-button home-button-primary">{t('landing.register')}</Link>
        )}
        <a href="tel:155261" className="home-button home-button-outline"><Icon name="phone" size={16} /> 155261</a>
      </div>

      <a className="home-floating-help" href="tel:155261" aria-label={`${t('landing.helplineNote')}: 155261`}>
        <span className="home-floating-help-icon" aria-hidden="true"><Icon name="phone" size={22} /></span>
        <span className="home-floating-help-copy">
          <small>{t('landing.helplineNote')}</small>
          <strong>155261</strong>
        </span>
      </a>
    </div>
  );
}
