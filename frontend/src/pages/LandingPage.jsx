import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../components/Icon.jsx';
import { useAuth, homeFor } from '../auth/AuthContext.jsx';
import { useI18n } from '../i18n/I18nContext.jsx';
import useHomeAnimations from '../hooks/useHomeAnimations.js';

const MSP_ROWS = [
  { en: 'Paddy (Common)', hi: 'धान (सामान्य)', msp: 2300 },
  { en: 'Wheat', hi: 'गेहूं', msp: 2425 },
  { en: 'Maize', hi: 'मक्का', msp: 2225 },
  { en: 'Moong (Green Gram)', hi: 'मूंग', msp: 8682 },
  { en: 'Mustard', hi: 'सरसों', msp: 5650 },
  { en: 'Cotton', hi: 'कपास', msp: 7121 },
];

const CENTRES = [
  { nameEn: 'Bhubaneswar Central Procurement Centre', nameHi: 'भुवनेश्वर केंद्रीय खरीद केंद्र', capacity: 8000, area: 'Bhubaneswar' },
  { nameEn: 'Jatni Mandi Procurement Centre', nameHi: 'जटणी मंडी खरीद केंद्र', capacity: 5000, area: 'Jatni' },
  { nameEn: 'Khordha Procurement Centre', nameHi: 'खोर्धा मंडी खरीद केंद्र', capacity: 6000, area: 'Khordha' },
  { nameEn: 'Balianta Procurement Centre', nameHi: 'बाळियंता खरीद केंद्र', capacity: 4000, area: 'Balianta' },
  { nameEn: 'Tangi Procurement Centre', nameHi: 'तंगी खरीद केंद्र', capacity: 4000, area: 'Tangi' },
  { nameEn: 'Pipili Procurement Centre', nameHi: 'पिपली खरीद केंद्र', capacity: 3500, area: 'Pipili' },
];

const FEATURES = [
  { key: 'token', icon: 'ticket', number: '01' },
  { key: 'queue', icon: 'list', number: '02' },
  { key: 'recommend', icon: 'target', number: '03' },
  { key: 'payment', icon: 'card', number: '04' },
  { key: 'sms', icon: 'mail', number: '05' },
  { key: 'assisted', icon: 'users', number: '06' },
];

const STATS = [
  { value: '12,400+', key: 'stat1', icon: 'user' },
  { value: '48,700+', key: 'stat2', icon: 'ticket' },
  { value: '6', key: 'stat3', icon: 'store' },
  { value: '₹52 Cr+', key: 'stat4', icon: 'rupee' },
];

export default function LandingPage() {
  const { t, lang, setLang } = useI18n();
  const { user } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const home = user ? homeFor(user.role) : '/login';
  const closeMenu = () => setMenuOpen(false);
  const pageRef = useRef(null);
  useHomeAnimations(pageRef);

  return (
    <div className="landing landing-v2" ref={pageRef}>
      <a className="home-skip-link" href="#home-main">{t('landing.skipToContent')}</a>

      <div className="home-tricolour" aria-hidden="true"><span /><span /><span /></div>

      <div className="home-scroll-progress" aria-hidden="true">
        <span className="home-scroll-progress-bar" />
      </div>

      <div className="home-utility-bar">
        <div className="home-container home-utility-inner">
          <div className="home-utility-copy">
            <span className="home-live-dot" aria-hidden="true" />
            <span>{t('landing.govStrip')}</span>
          </div>
          <div className="home-utility-actions">
            <span className="home-utility-label">{t('landing.portalLabel')}</span>
            <span className="home-utility-divider" aria-hidden="true" />
            <div className="home-language" role="group" aria-label={t('landing.languageLabel')}>
              <button type="button" className={lang === 'en' ? 'active' : ''} onClick={() => setLang('en')}>EN</button>
              <button type="button" className={lang === 'hi' ? 'active' : ''} onClick={() => setLang('hi')}>हिंदी</button>
            </div>
          </div>
        </div>
      </div>

      <header className="home-header">
        <div className="home-container home-header-inner">
          <a href="#top" className="home-brand" onClick={closeMenu} aria-label={t('landing.brand')}>
            <span className="home-brand-mark" aria-hidden="true">
              <Icon name="wheat" size={25} strokeWidth={1.9} />
            </span>
            <span className="home-brand-copy">
              <strong>{t('landing.brand')}</strong>
              <small>{t('landing.brandSub')}</small>
            </span>
          </a>

          <button
            type="button"
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
            <a href="#msp" onClick={closeMenu}>{t('landing.navMsp')}</a>
            <a href="#centres" onClick={closeMenu}>{t('landing.navCentres')}</a>
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
          <span className="home-announcement-separator" aria-hidden="true">•</span>
          <span className="home-announcement-message home-announcement-secondary">{t('landing.ticker2')}</span>
          <a href="tel:155266" className="home-announcement-phone"><Icon name="phone" size={14} /> 155266</a>
        </div>
      </div>

      <main id="home-main">
        <section className="home-hero" id="top">
          <div className="home-hero-glow home-hero-glow-one" aria-hidden="true" />
          <div className="home-hero-glow home-hero-glow-two" aria-hidden="true" />
          <div className="home-hero-spotlight" aria-hidden="true" />
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
                    <Link to="/login" className="home-button home-button-large home-button-quiet">{t('landing.heroTrackCta')} <Icon name="arrowUpRight" size={17} /></Link>
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
                <img src="/annadata-hero.jpg" alt={t('landing.heroImageAlt')} loading="eager" fetchpriority="high" decoding="async" />
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

        <section className="home-proof" aria-label={t('landing.statsLabel')}>
          <div className="home-container home-proof-inner">
            <div className="home-proof-intro">
              <span className="home-overline">{t('landing.proofEyebrow')}</span>
              <strong>{t('landing.proofTitle')}</strong>
            </div>
            <div className="home-proof-stats">
              {STATS.map((stat) => (
                <div className="home-proof-stat" key={stat.key}>
                  <span className="home-proof-icon"><Icon name={stat.icon} size={17} /></span>
                  <span><strong>{stat.value}</strong><small>{t(`landing.${stat.key}`)}</small></span>
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
                {MSP_ROWS.slice(0, 3).map((crop) => (
                  <div className="home-rate-highlight" key={crop.en}>
                    <span>{lang === 'hi' ? crop.hi : crop.en}</span>
                    <strong>₹{crop.msp.toLocaleString('en-IN')}</strong><small>/ {t('landing.perQuintal')}</small>
                  </div>
                ))}
              </div>
              <p className="home-rate-note"><Icon name="info" size={15} /> {t('landing.mspNote')}</p>
            </div>
            <div className="home-rates-card">
              <div className="home-rates-card-head">
                <div><span className="home-card-kicker">{t('landing.rateCardKicker')}</span><strong>{t('landing.rateCardTitle')}</strong></div>
                <span className="home-rate-year">2026</span>
              </div>
              <div className="home-rate-table" role="table" aria-label={t('landing.mspTitle')}>
                {MSP_ROWS.map((crop) => (
                  <div className="home-rate-row" role="row" key={crop.en}>
                    <span role="cell">{lang === 'hi' ? crop.hi : crop.en}</span>
                    <strong role="cell">₹{crop.msp.toLocaleString('en-IN')}</strong>
                    <small role="cell">/ {t('landing.perQuintal')}</small>
                  </div>
                ))}
              </div>
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
              {CENTRES.map((centre, index) => (
                <article className="home-centre-card" key={centre.nameEn}>
                  <div className="home-centre-top"><span className="home-centre-number">0{index + 1}</span><span className="home-open-badge"><span /> {t('landing.openNow')}</span></div>
                  <span className="home-centre-icon"><Icon name="store" size={20} /></span>
                  <h3>{lang === 'hi' ? centre.nameHi : centre.nameEn}</h3>
                  <div className="home-centre-meta"><span><Icon name="pin" size={14} /> {centre.area}</span><span>{t('landing.capacityCol')}: {centre.capacity.toLocaleString('en-IN')} q</span></div>
                </article>
              ))}
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
              <Link to={user ? home : '/register'} className="home-button home-button-large home-button-dark">{t('landing.assistCta')} <Icon name="arrowUpRight" size={17} /></Link>
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
            <a href="tel:155266" className="home-footer-contact"><Icon name="phone" size={17} /> {t('landing.getInTouch')} <Icon name="arrowUpRight" size={16} /></a>
          </div>
        </div>

        <div className="home-container home-footer-grid">
          <div className="home-footer-brand-col">
            <a href="#top" className="home-brand home-brand-footer">
              <span className="home-brand-mark" aria-hidden="true"><Icon name="wheat" size={25} strokeWidth={1.9} /></span>
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
            <a href="tel:155266"><Icon name="phone" size={14} /> {t('landing.fsHelpline')}</a>
            <a href="#help"><Icon name="users" size={14} /> {t('landing.fsAssisted')}</a>
            <a href="#features"><Icon name="mail" size={14} /> {t('landing.fsSms')}</a>
            <a href="#features"><Icon name="chat" size={14} /> {t('landing.fsHelp')}</a>
          </div>
        </div>

        <div className="home-footer-base">
          <div className="home-container home-footer-base-inner">
            <span><Icon name="phone" size={14} /> {t('landing.helpline')} <strong>155266</strong></span>
            <span>{t('landing.footerRights')}</span>
            <a href="#top">{t('landing.backToTop')} <Icon name="arrowUp" size={14} /></a>
          </div>
        </div>
      </footer>

      <a className="home-floating-help" href="tel:155266" aria-label={`${t('landing.helplineNote')}: 155266`}>
        <span className="home-floating-help-icon" aria-hidden="true"><Icon name="phone" size={22} /></span>
        <span className="home-floating-help-copy">
          <small>{t('landing.helplineNote')}</small>
          <strong>155266</strong>
        </span>
      </a>
    </div>
  );
}
