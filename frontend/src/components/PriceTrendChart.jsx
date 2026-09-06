import { useId, useMemo, useState } from 'react';
import { useI18n } from '../i18n/I18nContext.jsx';

// Dependency-free SVG chart for the historical mandi series.
// Draws the min-max band, the modal-price line and (optionally) monthly
// arrivals as faint bars. Hovering a point shows the underlying CSV values.
export function PriceTrendChart({ points, showBand = true, showArrivals = true, height = 240, labelFor, ariaLabel }) {
  // useId() contains colons, which are awkward inside url(#...) references.
  const gradientId = `pt${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const [hover, setHover] = useState(null);

  const geom = useMemo(() => {
    if (!points || points.length === 0) return null;
    const w = 720;
    const h = height;
    const pad = { top: 14, right: 14, bottom: 26, left: 52 };
    const iw = w - pad.left - pad.right;
    const ih = h - pad.top - pad.bottom;

    const lows = points.map((p) => (showBand ? Math.min(p.minPrice ?? p.modalPrice, p.modalPrice) : p.modalPrice));
    const highs = points.map((p) => (showBand ? Math.max(p.maxPrice ?? p.modalPrice, p.modalPrice) : p.modalPrice));
    let lo = Math.min(...lows);
    let hi = Math.max(...highs);
    if (hi === lo) { hi += 1; lo -= 1; }
    const padY = (hi - lo) * 0.08;
    lo = Math.max(0, lo - padY);
    hi += padY;

    const x = (i) => pad.left + (points.length === 1 ? iw / 2 : (i / (points.length - 1)) * iw);
    const y = (v) => pad.top + ih - ((v - lo) / (hi - lo)) * ih;

    const maxArrivals = Math.max(...points.map((p) => p.arrivalsMt || 0), 1);
    const barW = Math.max(1.5, iw / points.length - 1.5);

    const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.modalPrice).toFixed(1)}`).join(' ');
    const bandTop = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.maxPrice ?? p.modalPrice).toFixed(1)}`).join(' ');
    const bandBottom = [...points]
      .map((p, i) => ({ p, i }))
      .reverse()
      .map(({ p, i }) => `L${x(i).toFixed(1)},${y(p.minPrice ?? p.modalPrice).toFixed(1)}`)
      .join(' ');

    const ticks = 4;
    const gridLines = Array.from({ length: ticks + 1 }, (_, i) => {
      const v = lo + ((hi - lo) * i) / ticks;
      return { v: Math.round(v), y: y(v) };
    });

    // Show at most ~8 x labels so they stay readable on a phone.
    const step = Math.max(1, Math.ceil(points.length / 8));
    const xLabels = points
      .map((p, i) => ({ p, i }))
      .filter(({ i }) => i % step === 0 || i === points.length - 1);

    return { w, h, pad, iw, ih, x, y, line, band: `${bandTop} ${bandBottom} Z`, gridLines, xLabels, maxArrivals, barW };
  }, [points, height, showBand]);

  if (!geom) return null;
  const { w, h, pad, ih, x, y, line, band, gridLines, xLabels, maxArrivals, barW } = geom;
  const fmtX = labelFor || ((p) => `${p.monthEn} ${String(p.year).slice(2)}`);

  return (
    <div className="price-chart">
      <svg
        viewBox={`0 0 ${w} ${h}`}
        role="img"
        aria-label={ariaLabel || 'Historical modal price trend'}
        onMouseLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#166534" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#166534" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {gridLines.map((g) => (
          <g key={g.v}>
            <line x1={pad.left} x2={w - pad.right} y1={g.y} y2={g.y} stroke="#e2e8e4" strokeWidth="1" />
            <text x={pad.left - 8} y={g.y + 4} textAnchor="end" fontSize="10" fill="#6b7c70">
              {g.v.toLocaleString('en-IN')}
            </text>
          </g>
        ))}

        {showArrivals &&
          points.map((p, i) => {
            const bh = ((p.arrivalsMt || 0) / maxArrivals) * (ih * 0.28);
            return (
              <rect
                key={`a-${p.period}`}
                x={x(i) - barW / 2}
                y={pad.top + ih - bh}
                width={barW}
                height={Math.max(bh, 0)}
                fill="#94a3b8"
                opacity="0.28"
              />
            );
          })}

        {showBand && <path d={band} fill={`url(#${gradientId})`} />}
        <path d={line} fill="none" stroke="#166534" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" />

        {points.map((p, i) => (
          <circle
            key={p.period}
            cx={x(i)}
            cy={y(p.modalPrice)}
            r={hover === i ? 4.5 : 2.2}
            fill={hover === i ? '#b45309' : '#166534'}
          />
        ))}

        {points.map((p, i) => (
          <rect
            key={`hit-${p.period}`}
            x={x(i) - barW / 2 - 1}
            y={pad.top}
            width={barW + 2}
            height={ih}
            fill="transparent"
            onMouseEnter={() => setHover(i)}
            onFocus={() => setHover(i)}
            tabIndex={-1}
          />
        ))}

        {xLabels.map(({ p, i }) => (
          <text key={`x-${p.period}`} x={x(i)} y={h - 8} textAnchor="middle" fontSize="10" fill="#6b7c70">
            {fmtX(p)}
          </text>
        ))}
      </svg>

      <div className="price-chart-readout" aria-live="polite">
        {hover !== null && points[hover] ? (
          <>
            <strong>{fmtX(points[hover])}</strong>
            <span>₹{points[hover].modalPrice.toLocaleString('en-IN')}/q</span>
            {points[hover].minPrice !== null && points[hover].minPrice !== undefined && (
              <span className="soft">
                ₹{points[hover].minPrice?.toLocaleString('en-IN')}–₹{points[hover].maxPrice?.toLocaleString('en-IN')}
              </span>
            )}
            {points[hover].sdPrice !== null && points[hover].sdPrice !== undefined && (
              <span className="soft">±₹{Number(points[hover].sdPrice).toLocaleString('en-IN')}</span>
            )}
            {(points[hover].arrivalsMt > 0 || points[hover].nObs > 0) && (
              <span className="soft">{points[hover].arrivalsMt?.toLocaleString('en-IN')} MT</span>
            )}
            {points[hover].nObs > 0 && <span className="soft">n={points[hover].nObs}</span>}
            {points[hover].nMandis > 0 && (
              <span className="soft">
                {points[hover].nMandis} mandi{points[hover].nMandis === 1 ? '' : 's'}
              </span>
            )}
          </>
        ) : (
          <span className="soft">{ariaLabel}</span>
        )}
      </div>
    </div>
  );
}

// Small horizontal bar list used for the month-of-year seasonality view.
export function SeasonalityBars({ months, currency = '₹', bestMonth }) {
  const { pick } = useI18n();
  const values = months.filter((m) => m.averagePrice !== null).map((m) => m.averagePrice);
  if (!values.length) return null;
  const max = Math.max(...values);
  const min = Math.min(...values);
  return (
    <div className="season-bars">
      {months.map((m) => {
        const has = m.averagePrice !== null;
        const pct = has && max > min ? 12 + ((m.averagePrice - min) / (max - min)) * 88 : has ? 60 : 0;
        const best = bestMonth && m.month === bestMonth;
        return (
          <div className={`season-row${best ? ' best' : ''}`} key={m.month}>
            <span className="m">{pick(m, 'name')}</span>
            <span className="track"><span className="fill" style={{ width: `${pct}%` }} /></span>
            <span className="v">{has ? `${currency}${Math.round(m.averagePrice).toLocaleString('en-IN')}` : '—'}</span>
          </div>
        );
      })}
    </div>
  );
}
