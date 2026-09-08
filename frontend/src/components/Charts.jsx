// Dependency-free SVG chart kit for the authority State Command Centre.
// Same design tokens as the rest of the portal (green/gold/cream) so the
// graphs read as part of the app rather than a bolted-on library.
import { useId } from 'react';

const GREEN = '#166534';
const GREEN_DEEP = '#0f3d22';
const GOLD = '#c79a2e';
const AMBER = '#92600a';
const RED = '#b42318';
const BLUE = '#1d4ed8';
const CLAY = '#e0784f';
const LINE = '#e5e9dd';
const INK_SOFT = '#52635a';
const INK_FAINT = '#6b7a70';

const PALETTE = [GREEN, GOLD, BLUE, CLAY, AMBER, '#7c5cbf', RED];

/* ── 7-day trend: area line (quintals) + bars (farmers) ────────────── */
export function TrendChart({ points, height = 250, ariaLabel }) {
  const gradientId = `tc${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  if (!points || points.length < 2) return null;
  const w = 720;
  const h = height;
  const pad = { top: 16, right: 14, bottom: 30, left: 46 };
  const iw = w - pad.left - pad.right;
  const ih = h - pad.top - pad.bottom;

  const maxQ = Math.max(...points.map((p) => p.quintals), 1) * 1.15;
  const maxF = Math.max(...points.map((p) => p.farmers), 1) * 1.25;
  const x = (i) => pad.left + (i / (points.length - 1)) * iw;
  const yQ = (v) => pad.top + ih - (v / maxQ) * ih;

  const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${yQ(p.quintals).toFixed(1)}`).join(' ');
  const area = `${line} L${x(points.length - 1).toFixed(1)},${(pad.top + ih).toFixed(1)} L${pad.left},${(pad.top + ih).toFixed(1)} Z`;
  const ticks = Array.from({ length: 5 }, (_, i) => {
    const v = (maxQ * i) / 4;
    return { v: Math.round(v), y: yQ(v) };
  });
  const barW = Math.min(34, iw / points.length - 10);

  return (
    <svg viewBox={`0 0 ${w} ${h}`} role="img" aria-label={ariaLabel || 'Procurement trend'} style={{ width: '100%', height: 'auto', display: 'block' }}>
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={GREEN} stopOpacity="0.24" />
          <stop offset="100%" stopColor={GREEN} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {ticks.map((t) => (
        <g key={t.v}>
          <line x1={pad.left} x2={w - pad.right} y1={t.y} y2={t.y} stroke={LINE} strokeWidth="1" />
          <text x={pad.left - 8} y={t.y + 4} textAnchor="end" fontSize="10.5" fill={INK_FAINT}>{t.v}</text>
        </g>
      ))}
      {points.map((p, i) => (
        <g key={p.date}>
          <rect
            x={x(i) - barW / 2}
            y={pad.top + ih - (p.farmers / maxF) * ih}
            width={barW}
            height={(p.farmers / maxF) * ih}
            rx={3}
            fill={p.isToday ? GOLD : '#b9d9c2'}
            opacity={p.isToday ? 1 : 0.75}
          >
            <title>{`${p.label}: ${p.farmers} farmers, ${p.quintals} quintals, ₹${p.valueInr.toLocaleString('en-IN')}`}</title>
          </rect>
        </g>
      ))}
      <path d={area} fill={`url(#${gradientId})`} />
      <path d={line} fill="none" stroke={GREEN} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {points.map((p, i) => (
        <circle key={p.date} cx={x(i)} cy={yQ(p.quintals)} r={p.isToday ? 4.5 : 3} fill="#fff" stroke={p.isToday ? GOLD : GREEN} strokeWidth="2.2">
          <title>{`${p.label}: ${p.quintals} quintals procured`}</title>
        </circle>
      ))}
      {points.map((p, i) =>
        i % 2 === 0 || i === points.length - 1 ? (
          <text key={`x${p.date}`} x={x(i)} y={h - 8} textAnchor="middle" fontSize="10.5" fill={INK_SOFT} fontWeight={p.isToday ? 800 : 500}>
            {p.label}
          </text>
        ) : null
      )}
    </svg>
  );
}

/* ── Horizontal comparison bars (districts / centres) ──────────────── */
export function HBars({ items, valueFor = (i) => i.value, labelFor = (i) => i.label, height = 26, colorFor = () => GREEN, pctFor, ariaLabel }) {
  if (!items || items.length === 0) return null;
  const max = Math.max(...items.map(valueFor), 1);
  return (
    <div role="img" aria-label={ariaLabel || 'Comparison bars'} style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
      {items.map((item, i) => {
        const v = valueFor(item);
        const w = Math.max(4, (v / max) * 100);
        return (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: 'minmax(90px, 150px) 1fr auto', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 12.5, fontWeight: 650, color: 'var(--m-ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {labelFor(item)}
            </span>
            <div style={{ background: 'var(--m-cream)', borderRadius: 999, height, overflow: 'hidden', border: '1px solid var(--m-line)' }}>
              <div
                style={{
                  width: `${w}%`,
                  height: '100%',
                  borderRadius: 999,
                  background: colorFor(item, i),
                  transition: 'width 0.5s var(--m-ease)',
                }}
                title={`${labelFor(item)}: ${v}`}
              />
            </div>
            <span style={{ fontSize: 12.5, fontWeight: 750, color: 'var(--m-ink-soft)', fontVariantNumeric: 'tabular-nums', minWidth: 64, textAlign: 'right' }}>
              {pctFor ? pctFor(item) : v.toLocaleString('en-IN')}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* ── Donut for the crop mix ─────────────────────────────────────────── */
export function Donut({ segments, size = 168, thickness = 22, formatValue, ariaLabel }) {
  const total = segments.reduce((a, s) => a + s.value, 0) || 1;
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div style={{ display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap' }}>
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} role="img" aria-label={ariaLabel || 'Crop mix'}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={LINE} strokeWidth={thickness} />
        {segments.map((s, i) => {
          const frac = s.value / total;
          const dash = frac * c;
          const el = (
            <circle
              key={i}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={s.color || PALETTE[i % PALETTE.length]}
              strokeWidth={thickness}
              strokeDasharray={`${Math.max(dash - 3, 0.5)} ${c - Math.max(dash - 3, 0.5)}`}
              strokeDashoffset={-offset}
              strokeLinecap="butt"
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
            >
              <title>{`${s.label}: ${formatValue ? formatValue(s.value) : s.value}`}</title>
            </circle>
          );
          offset += dash;
          return el;
        })}
        <text x="50%" y="47%" textAnchor="middle" fontSize="20" fontWeight="800" fill={GREEN_DEEP} fontFamily="var(--m-f-display)">
          {formatValue ? formatValue(total) : total}
        </text>
        <text x="50%" y="58%" textAnchor="middle" fontSize="10" fill={INK_FAINT} fontWeight="700" letterSpacing="0.06em">
          {'QUINTALS'}
        </text>
      </svg>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 7, flex: 1, minWidth: 180 }}>
        {segments.map((s, i) => (
          <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5 }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: s.color || PALETTE[i % PALETTE.length], flexShrink: 0 }} />
            <span style={{ flex: 1, fontWeight: 600, color: 'var(--m-ink)' }}>{s.label}</span>
            <strong style={{ color: 'var(--m-ink-soft)', fontVariantNumeric: 'tabular-nums' }}>
              {formatValue ? formatValue(s.value) : s.value} · {Math.round((s.value / total) * 100)}%
            </strong>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ── Horizontal procurement pipeline flowchart ──────────────────────── */
export function PipelineFlow({ stages, ariaLabel }) {
  // stages: [{ key, label, count, tone }] — tone: green | gold | blue | red | slate
  const toneColor = { green: GREEN, gold: GOLD, blue: BLUE, red: RED, slate: INK_FAINT } ;
  const max = Math.max(...stages.map((s) => s.count), 1);
  return (
    <div role="img" aria-label={ariaLabel || 'Procurement pipeline'} className="pipeline-flow">
      {stages.map((s, i) => (
        <div key={s.key} className="pipeline-stage">
          <div
            className="pipeline-stage-box"
            style={{
              flex: 1,
              minWidth: 0,
              background: 'var(--m-paper)',
              border: '1.5px solid var(--m-line)',
              borderRadius: 14,
              padding: '12px 12px 10px',
              borderTop: `4px solid ${toneColor[s.tone] || GREEN}`,
            }}
          >
            <div style={{ fontSize: 24, fontWeight: 800, color: toneColor[s.tone] || GREEN, fontVariantNumeric: 'tabular-nums' }}>{s.count}</div>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--m-ink-soft)', letterSpacing: '0.02em' }}>{s.label}</div>
            <div style={{ marginTop: 6, height: 5, borderRadius: 999, background: 'var(--m-cream)', overflow: 'hidden' }}>
              <div style={{ width: `${(s.count / max) * 100}%`, height: '100%', background: toneColor[s.tone] || GREEN, borderRadius: 999 }} />
            </div>
          </div>
          {i < stages.length - 1 && (
            <svg className="pipeline-arrow" width="18" height="18" viewBox="0 0 18 18" style={{ flexShrink: 0, color: 'var(--m-ink-faint)' }} aria-hidden="true">
              <path d="M4 9h9m-3-3.5L14.5 9 10 12.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>
      ))}
    </div>
  );
}
