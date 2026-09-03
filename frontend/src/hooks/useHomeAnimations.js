import { useEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/**
 * Motion layer for the public homepage only.
 * Purely presentational: it never changes copy, data or markup structure —
 * it only animates elements that are already on the page.
 * Fully disabled when the visitor prefers reduced motion (accessibility /
 * GIGW compliance for government portals).
 */
export default function useHomeAnimations(root) {
  useEffect(() => {
    const scope = root?.current;
    if (!scope) return undefined;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      scope.classList.add('home-motion-off');
      return undefined;
    }

    const ctx = gsap.context((self) => {
      const q = self.selector;
      const ease = 'power3.out';

      /* ---------------- Top chrome ---------------- */
      gsap.from(q('.home-tricolour span'), {
        scaleX: 0, transformOrigin: 'left center', duration: 0.75, stagger: 0.08, ease: 'power2.out',
      });
      gsap.from(q('.home-utility-inner > *'), {
        y: -12, opacity: 0, duration: 0.5, stagger: 0.08, ease, delay: 0.15,
      });
      gsap.from(q('.home-header-inner > *'), {
        y: -18, opacity: 0, duration: 0.6, stagger: 0.07, ease, delay: 0.2,
      });
      gsap.from(q('.home-announcement-inner'), {
        opacity: 0, duration: 0.7, ease, delay: 0.45,
      });

      /* ---------------- Hero ---------------- */
      const heroTl = gsap.timeline({ defaults: { ease, duration: 0.9 }, delay: 0.25 });
      heroTl
        .from(q('.home-eyebrow'), { y: 18, opacity: 0, duration: 0.6 })
        .from(q('.home-hero h1'), { y: 46, opacity: 0, duration: 1 }, '-=0.32')
        .from(q('.home-hero-sub'), { y: 26, opacity: 0 }, '-=0.68')
        .from(q('.home-hero-actions .home-button'), { y: 22, opacity: 0, stagger: 0.09, duration: 0.65 }, '-=0.6')
        .from(q('.home-hero-trust span'), { y: 14, opacity: 0, stagger: 0.09, duration: 0.55 }, '-=0.45')
        .from(q('.home-visual-backdrop'), { scale: 0.9, rotate: 8, opacity: 0, duration: 1.1 }, '-=1.25')
        .from(q('.home-image-frame'), { y: 54, opacity: 0, scale: 0.97, duration: 1.1 }, '-=0.95')
        .from(q('.home-image-frame img'), { scale: 1.16, duration: 1.6, ease: 'power2.out' }, '-=1.1')
        .from(q('.home-image-caption'), { y: 22, opacity: 0, duration: 0.6 }, '-=0.7')
        .from(q('.home-token-float'), { x: 40, y: -18, opacity: 0, duration: 0.7 }, '-=0.55')
        .from(q('.home-payment-float'), { x: 34, y: 18, opacity: 0, duration: 0.7 }, '-=0.5');

      /* Gentle idle float on the hero cards — keeps the farmer hero alive. */
      gsap.to(q('.home-token-float'), {
        y: -10, duration: 3.1, ease: 'sine.inOut', yoyo: true, repeat: -1, delay: 1.6,
      });
      gsap.to(q('.home-payment-float'), {
        y: 10, duration: 3.6, ease: 'sine.inOut', yoyo: true, repeat: -1, delay: 2,
      });
      gsap.to(q('.home-hero-glow-one'), {
        y: 40, x: -30, scale: 1.12, duration: 9, ease: 'sine.inOut', yoyo: true, repeat: -1,
      });
      gsap.to(q('.home-hero-glow-two'), {
        y: -34, x: 26, scale: 1.16, duration: 11, ease: 'sine.inOut', yoyo: true, repeat: -1,
      });

      /* Hero parallax on scroll (desktop only). */
      if (window.matchMedia('(min-width: 821px)').matches) {
        gsap.to(q('.home-hero-visual'), {
          y: -60, ease: 'none',
          scrollTrigger: { trigger: '.home-hero', start: 'top top', end: 'bottom top', scrub: 0.6 },
        });
        gsap.to(q('.home-hero-copy'), {
          y: 34, opacity: 0.55, ease: 'none',
          scrollTrigger: { trigger: '.home-hero', start: 'center top', end: 'bottom top', scrub: 0.6 },
        });
      }

      /* ---------------- Sticky header state ---------------- */
      const header = scope.querySelector('.home-header');
      if (header) {
        ScrollTrigger.create({
          start: 'top -80',
          onUpdate: (st) => header.classList.toggle('is-stuck', st.scroll() > 80),
          onRefresh: (st) => header.classList.toggle('is-stuck', st.scroll() > 80),
        });
      }

      /* ---------------- Stat counters ---------------- */
      q('.home-proof-stat strong').forEach((el) => {
        const raw = el.textContent.trim();
        const match = raw.match(/[\d,.]+/);
        if (!match) return;
        const target = parseFloat(match[0].replace(/,/g, ''));
        if (!Number.isFinite(target) || target === 0) return;
        const prefix = raw.slice(0, match.index);
        const suffix = raw.slice(match.index + match[0].length);
        const decimals = (match[0].split('.')[1] || '').length;
        const obj = { v: 0 };
        gsap.to(obj, {
          v: target,
          duration: 1.8,
          ease: 'power2.out',
          scrollTrigger: { trigger: el, start: 'top 92%', once: true },
          onUpdate: () => {
            el.textContent = prefix + obj.v.toLocaleString('en-IN', {
              minimumFractionDigits: decimals, maximumFractionDigits: decimals,
            }) + suffix;
          },
          onComplete: () => { el.textContent = raw; },
        });
      });

      gsap.from(q('.home-proof-intro'), {
        x: -26, opacity: 0, duration: 0.8, ease,
        scrollTrigger: { trigger: '.home-proof', start: 'top 88%', once: true },
      });
      gsap.from(q('.home-proof-stat'), {
        y: 26, opacity: 0, duration: 0.7, stagger: 0.1, ease,
        scrollTrigger: { trigger: '.home-proof', start: 'top 88%', once: true },
      });

      /* ---------------- Section headings ---------------- */
      q('.home-section-heading').forEach((el) => {
        gsap.from(el.children, {
          y: 34, opacity: 0, duration: 0.8, stagger: 0.12, ease,
          scrollTrigger: { trigger: el, start: 'top 86%', once: true },
        });
      });

      /* ---------------- Cards & grids ---------------- */
      const batches = [
        ['.home-feature-lead', { x: -34 }],
        ['.home-feature-card', { y: 40, scale: 0.97 }],
        ['.home-step', { y: 40 }],
        ['.home-centre-card', { y: 40, scale: 0.97 }],
        ['.home-rate-highlight', { y: 22 }],
        ['.home-rate-row', { x: 22 }],
      ];
      batches.forEach(([selector, vars]) => {
        const items = q(selector);
        if (!items.length) return;
        gsap.from(items, {
          ...vars,
          opacity: 0,
          duration: 0.75,
          ease,
          stagger: 0.08,
          scrollTrigger: { trigger: items[0].parentElement || items[0], start: 'top 88%', once: true },
        });
      });

      gsap.from(q('.home-rates-copy > *'), {
        y: 28, opacity: 0, duration: 0.75, stagger: 0.1, ease,
        scrollTrigger: { trigger: '.home-rates-section', start: 'top 82%', once: true },
      });
      gsap.from(q('.home-rates-card'), {
        y: 48, opacity: 0, duration: 0.9, ease,
        scrollTrigger: { trigger: '.home-rates-section', start: 'top 82%', once: true },
      });

      /* Step connectors draw themselves in. */
      const connectors = q('.home-step-connector');
      if (connectors.length) {
        gsap.from(connectors, {
          scaleX: 0, transformOrigin: 'left center', duration: 0.7, stagger: 0.12, ease: 'power2.out',
          scrollTrigger: { trigger: '.home-steps', start: 'top 82%', once: true },
        });
      }

      /* ---------------- Assist banner + footer ---------------- */
      gsap.from(q('.home-assist-card'), {
        y: 46, opacity: 0, duration: 0.9, ease,
        scrollTrigger: { trigger: '.home-assist-section', start: 'top 86%', once: true },
      });
      gsap.from(q('.home-footer-support-inner > *'), {
        y: 30, opacity: 0, duration: 0.8, stagger: 0.12, ease,
        scrollTrigger: { trigger: '.home-footer-support', start: 'top 88%', once: true },
      });
      gsap.from(q('.home-footer-grid > *'), {
        y: 26, opacity: 0, duration: 0.7, stagger: 0.09, ease,
        scrollTrigger: { trigger: '.home-footer-grid', start: 'top 92%', once: true },
      });

      /* ---------------- Floating helpline pill ---------------- */
      gsap.from(q('.home-floating-help'), {
        scale: 0.6, opacity: 0, duration: 0.6, ease: 'back.out(1.8)', delay: 1.4,
      });

      /* ---------------- Pointer-reactive tilt on hero frame ---------------- */
      const frame = scope.querySelector('.home-image-frame');
      const heroSection = scope.querySelector('.home-hero');
      let onMove;
      let onLeave;
      if (frame && heroSection && window.matchMedia('(min-width: 1051px)').matches) {
        const rotX = gsap.quickTo(frame, 'rotationX', { duration: 0.6, ease: 'power3.out' });
        const rotY = gsap.quickTo(frame, 'rotationY', { duration: 0.6, ease: 'power3.out' });
        gsap.set(frame, { transformPerspective: 1000, transformOrigin: 'center' });
        onMove = (e) => {
          const r = heroSection.getBoundingClientRect();
          const px = (e.clientX - r.left) / r.width - 0.5;
          const py = (e.clientY - r.top) / r.height - 0.5;
          rotY(px * 7);
          rotX(-py * 5);
        };
        onLeave = () => { rotX(0); rotY(0); };
        heroSection.addEventListener('mousemove', onMove);
        heroSection.addEventListener('mouseleave', onLeave);
      }

      self.add(() => {
        if (heroSection && onMove) {
          heroSection.removeEventListener('mousemove', onMove);
          heroSection.removeEventListener('mouseleave', onLeave);
        }
      });
    }, scope);

    const refresh = () => ScrollTrigger.refresh();
    window.addEventListener('load', refresh);
    const timer = window.setTimeout(refresh, 600);

    return () => {
      window.removeEventListener('load', refresh);
      window.clearTimeout(timer);
      ctx.revert();
    };
  }, [root]);
}
