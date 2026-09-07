// Annadata Connect — institutional emblem kit.
//
// Design language: government-grade monoline emblems. Thin, precise strokes,
// geometric construction, a restrained deep-green / gold / slate palette and
// only purposeful motion (data sweeps, progress pulses) — no faces, no
// cartoon mascots, no bounce. Everything is inline SVG: no image assets,
// tiny APK, crisp at any density.
//
// Every export keeps its original name and props so pages need no changes.

const INK = '#0f3d22'; // forest ink — primary stroke
const INK_SOFT = '#5b6b5f'; // secondary stroke
const GOLD = '#c79a2e'; // muted institutional gold (was #fbbf24)
const GOLD_SOFT = '#f3e7c8';
const LEAF = '#e6efe8';
const LEAF_DEEP = '#cbdfd0';
const CREAM = '#fbfaf5';
const CLAY = '#a8683f';
const SKIN = '#e8d7c3';
const SKY = '#e4ecfc';
const SLATE = '#7c8b80';

const HAIR = 1.5; // hairline
const LINE = 2; // standard rule

/* Shared: a precise reference frame used across emblems. */
function Frame({ r = 46, cx = 50, cy = 50, dash = false }) {
  return (
    <>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={LEAF_DEEP} strokeWidth={HAIR} />
      {dash && (
        <circle
          cx={cx}
          cy={cy}
          r={r - 5}
          fill="none"
          stroke={GOLD}
          strokeWidth={HAIR}
          strokeDasharray="2 6"
          strokeLinecap="round"
          opacity="0.8"
        />
      )}
    </>
  );
}

/* ── Sunrise emblem (replaces the smiling sun) ───────────────────
   A horizon disc with graded rays — the "day / season" marker. */
export function ArtSun({ size = 72, className = '', sleepy = false, ...rest }) {
  const rays = Array.from({ length: 7 }, (_, i) => {
    const a = ((180 + 15 + i * 25) * Math.PI) / 180;
    return {
      k: i,
      x1: 50 + Math.cos(a) * 30,
      y1: 62 + Math.sin(a) * 30,
      x2: 50 + Math.cos(a) * (i % 2 === 0 ? 43 : 38),
      y2: 62 + Math.sin(a) * (i % 2 === 0 ? 43 : 38),
    };
  });
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className={className} aria-hidden="true" {...rest}>
      {rays.map((r) => (
        <line
          key={r.k}
          x1={r.x1}
          y1={r.y1}
          x2={r.x2}
          y2={r.y2}
          stroke={GOLD}
          strokeWidth={HAIR}
          strokeLinecap="round"
          opacity={sleepy ? 0.35 : 0.9}
        />
      ))}
      <path
        d="M28 62 a22 22 0 0 1 44 0"
        fill={sleepy ? 'none' : GOLD_SOFT}
        stroke={GOLD}
        strokeWidth={LINE}
        strokeLinejoin="round"
      />
      <line x1="18" y1="62" x2="82" y2="62" stroke={INK} strokeWidth={LINE} strokeLinecap="round" />
      <line x1="26" y1="70" x2="74" y2="70" stroke={INK_SOFT} strokeWidth={HAIR} strokeLinecap="round" opacity="0.6" />
      <line x1="34" y1="77" x2="66" y2="77" stroke={INK_SOFT} strokeWidth={HAIR} strokeLinecap="round" opacity="0.35" />
    </svg>
  );
}

/* ── Wheat stalk — symmetrical, engraved ─────────────────────────── */
export function ArtWheat({ size = 48, className = '', tone = GOLD, ...rest }) {
  const grains = [0, 1, 2, 3, 4].map((k) => {
    const y = 70 - k * 11;
    return (
      <g key={k}>
        <path d={`M30 ${y} q-13 -2 -15 -12 q12 1 15 8 z`} fill="none" stroke={tone} strokeWidth={HAIR} strokeLinejoin="round" />
        <path d={`M30 ${y} q13 -2 15 -12 q-12 1 -15 8 z`} fill="none" stroke={tone} strokeWidth={HAIR} strokeLinejoin="round" />
      </g>
    );
  });
  return (
    <svg width={size} height={size} viewBox="0 0 60 100" className={className} aria-hidden="true" {...rest}>
      <path d="M30 96 V16" fill="none" stroke={INK} strokeWidth={LINE} strokeLinecap="round" />
      {grains}
      <path d="M30 18 q-5 -8 0 -14 q5 6 0 14 z" fill={tone} stroke={tone} strokeWidth={HAIR} strokeLinejoin="round" />
      <path d="M30 90 q-11 1 -15 8" fill="none" stroke={INK_SOFT} strokeWidth={HAIR} strokeLinecap="round" />
    </svg>
  );
}

/* ── Registered farmer — an identity mark, not a mascot ──────────── */
export function ArtFarmer({ size = 96, className = '', ...rest }) {
  return (
    <svg width={size} height={size * (140 / 120)} viewBox="0 0 120 140" className={className} aria-hidden="true" {...rest}>
      <circle cx="60" cy="70" r="52" fill="none" stroke={LEAF_DEEP} strokeWidth={HAIR} />
      <circle cx="60" cy="70" r="45" fill="none" stroke={GOLD} strokeWidth={HAIR} strokeDasharray="2 7" strokeLinecap="round" opacity="0.75" />
      {/* shoulders */}
      <path d="M30 108 q6 -26 30 -26 q24 0 30 26" fill={LEAF} stroke={INK} strokeWidth={LINE} strokeLinejoin="round" />
      <path d="M60 82 v26" stroke={INK_SOFT} strokeWidth={HAIR} />
      {/* head */}
      <circle cx="60" cy="58" r="17" fill={SKIN} stroke={INK} strokeWidth={LINE} />
      {/* headwrap — flat geometric band, no face */}
      <path d="M42 54 q2 -18 18 -18 q16 0 18 18 q-18 6 -36 0 z" fill={CREAM} stroke={INK} strokeWidth={LINE} strokeLinejoin="round" />
      <path d="M44 50 h32" stroke={GOLD} strokeWidth={LINE} strokeLinecap="round" />
      {/* verified chip */}
      <circle cx="92" cy="98" r="13" fill={CREAM} stroke={INK} strokeWidth={LINE} />
      <path d="M86 98 l4.5 5 l9 -10" fill="none" stroke="#166534" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M20 128 h80" stroke={LEAF_DEEP} strokeWidth={LINE} strokeLinecap="round" />
    </svg>
  );
}

/* ── Livestock / rural asset mark ────────────────────────────────── */
export function ArtCow({ size = 90, className = '', ...rest }) {
  return (
    <svg width={size} height={size * (80 / 120)} viewBox="0 0 120 80" className={className} aria-hidden="true" {...rest}>
      <path d="M24 24 h54 q14 0 14 13 v13 q0 7 -7 7 h-62 q-7 0 -7 -7 v-13 q0 -13 8 -13 z" fill="none" stroke={INK} strokeWidth={LINE} strokeLinejoin="round" />
      <path d="M16 22 q-9 3 -9 12 q0 9 9 12 q7 2 9 -5 v-14 q-2 -7 -9 -5 z" fill={LEAF} stroke={INK} strokeWidth={LINE} strokeLinejoin="round" />
      <path d="M10 21 q-4 -7 2 -11 M22 21 q4 -7 -2 -11" fill="none" stroke={INK_SOFT} strokeWidth={HAIR} strokeLinecap="round" />
      <path d="M32 57 v15 M48 57 v15 M68 57 v15 M84 57 v15" stroke={INK} strokeWidth={LINE} strokeLinecap="round" />
      <path d="M92 27 q11 7 7 21" fill="none" stroke={INK_SOFT} strokeWidth={HAIR} strokeLinecap="round" />
      <rect x="40" y="34" width="26" height="14" rx="3" fill="none" stroke={GOLD} strokeWidth={HAIR} />
      <path d="M0 76 h120" stroke={LEAF_DEEP} strokeWidth={LINE} strokeLinecap="round" />
    </svg>
  );
}

/* ── Transport / logistics mark ──────────────────────────────────── */
export function ArtTractor({ size = 90, className = '', ...rest }) {
  return (
    <svg width={size} height={size * (72 / 120)} viewBox="0 0 120 72" className={className} aria-hidden="true" {...rest}>
      <path d="M20 36 h46 V20 h-14 l-6 -8 h-20 z" fill={LEAF} stroke={INK} strokeWidth={LINE} strokeLinejoin="round" />
      <path d="M66 48 V20 h18 q4 0 4 6 v22 z" fill="none" stroke={INK} strokeWidth={LINE} strokeLinejoin="round" />
      <path d="M66 30 h22" stroke={INK_SOFT} strokeWidth={HAIR} />
      <circle cx="34" cy="53" r="14" fill="none" stroke={INK} strokeWidth={LINE} />
      <circle cx="34" cy="53" r="6" fill="none" stroke={GOLD} strokeWidth={HAIR} />
      <circle cx="86" cy="56" r="10" fill="none" stroke={INK} strokeWidth={LINE} />
      <circle cx="86" cy="56" r="4" fill="none" stroke={GOLD} strokeWidth={HAIR} />
      <path d="M0 68 h120" stroke={LEAF_DEEP} strokeWidth={LINE} strokeLinecap="round" />
      {/* forward motion sweep */}
      <line x1="4" y1="26" x2="16" y2="26" stroke={SLATE} strokeWidth={HAIR} strokeLinecap="round" opacity="0.5">
        <animate attributeName="x1" values="4;-8;4" dur="2.4s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0;0.5;0" dur="2.4s" repeatCount="indefinite" />
      </line>
      <line x1="6" y1="34" x2="14" y2="34" stroke={SLATE} strokeWidth={HAIR} strokeLinecap="round" opacity="0.4">
        <animate attributeName="x1" values="6;-6;6" dur="2.4s" begin="0.5s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0;0.4;0" dur="2.4s" begin="0.5s" repeatCount="indefinite" />
      </line>
    </svg>
  );
}

/* ── Horizon rule (replaces flying birds) ────────────────────────── */
export function ArtBirds({ size = 84, className = '', ...rest }) {
  return (
    <svg width={size} height={size * (36 / 120)} viewBox="0 0 120 36" className={className} aria-hidden="true" {...rest}>
      <line x1="4" y1="18" x2="52" y2="18" stroke={GOLD} strokeWidth={HAIR} strokeLinecap="round" opacity="0.7" />
      <line x1="68" y1="18" x2="116" y2="18" stroke={GOLD} strokeWidth={HAIR} strokeLinecap="round" opacity="0.7" />
      <rect x="55" y="13" width="10" height="10" rx="2" transform="rotate(45 60 18)" fill="none" stroke={GOLD} strokeWidth={HAIR} />
      <line x1="14" y1="26" x2="42" y2="26" stroke={GOLD} strokeWidth={HAIR} strokeLinecap="round" opacity="0.3" />
      <line x1="78" y1="26" x2="106" y2="26" stroke={GOLD} strokeWidth={HAIR} strokeLinecap="round" opacity="0.3" />
    </svg>
  );
}

/* ── Surveyed field — contour plan, not a cartoon landscape ──────── */
export function ArtField({ size = 200, className = '', ...rest }) {
  return (
    <svg width={size} height={size * (96 / 200)} viewBox="0 0 200 96" className={className} aria-hidden="true" {...rest}>
      <path d="M0 46 q34 -12 66 -2 q34 11 66 -1 q34 -11 68 3" fill="none" stroke={LEAF_DEEP} strokeWidth={LINE} />
      <path d="M0 60 q40 -11 80 0 q40 10 120 -3" fill="none" stroke={LEAF_DEEP} strokeWidth={LINE} />
      <path d="M0 74 q46 -10 96 0 q46 9 104 -4" fill="none" stroke={LEAF_DEEP} strokeWidth={LINE} />
      <path d="M0 88 q52 -9 108 0 q46 8 92 -4" fill="none" stroke={LEAF_DEEP} strokeWidth={LINE} />
      {/* plot markers */}
      {[38, 74, 110, 146].map((x, i) => (
        <g key={x}>
          <line x1={x} y1={30 + i * 2} x2={x} y2="92" stroke={INK_SOFT} strokeWidth={HAIR} strokeDasharray="2 6" opacity="0.45" />
          <circle cx={x} cy={30 + i * 2} r="2.2" fill={GOLD} />
        </g>
      ))}
      <line x1="0" y1="22" x2="200" y2="22" stroke={INK} strokeWidth={HAIR} opacity="0.5" />
      <path d="M170 8 v10 M165 13 h10" stroke={GOLD} strokeWidth={HAIR} strokeLinecap="round" />
    </svg>
  );
}

/* ── Weighbridge / verified weight ───────────────────────────────── */
export function ArtScales({ size = 72, className = '', ...rest }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className={className} aria-hidden="true" {...rest}>
      <line x1="50" y1="18" x2="50" y2="82" stroke={INK} strokeWidth={LINE} strokeLinecap="round" />
      <line x1="20" y1="30" x2="80" y2="30" stroke={INK} strokeWidth={LINE} strokeLinecap="round" />
      <circle cx="50" cy="18" r="4" fill="none" stroke={GOLD} strokeWidth={LINE} />
      <path d="M8 42 h24 l-12 16 z" fill="none" stroke={INK} strokeWidth={HAIR} strokeLinejoin="round" />
      <path d="M68 42 h24 l-12 16 z" fill={GOLD_SOFT} stroke={INK} strokeWidth={HAIR} strokeLinejoin="round" />
      <line x1="20" y1="30" x2="20" y2="42" stroke={INK_SOFT} strokeWidth={HAIR} />
      <line x1="80" y1="30" x2="80" y2="42" stroke={INK_SOFT} strokeWidth={HAIR} />
      <path d="M32 82 h36" stroke={INK} strokeWidth={LINE} strokeLinecap="round" />
      <path d="M40 82 q10 -14 20 0" fill="none" stroke={INK_SOFT} strokeWidth={HAIR} />
    </svg>
  );
}

/* ── Payment / MSP settlement mark ───────────────────────────────── */
export function ArtRupeeSprout({ size = 64, className = '', ...rest }) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" className={className} aria-hidden="true" {...rest}>
      <circle cx="40" cy="42" r="26" fill="none" stroke={INK} strokeWidth={LINE} />
      <circle cx="40" cy="42" r="31" fill="none" stroke={GOLD} strokeWidth={HAIR} strokeDasharray="2 6" strokeLinecap="round" opacity="0.8" />
      <path d="M31 32 h18 M31 39 h15 q7 0 7 6 t-7 6 h-15 M33 53 l14 -12" fill="none" stroke={INK} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M40 16 q0 -8 7 -11" fill="none" stroke={GOLD} strokeWidth={HAIR} strokeLinecap="round" />
    </svg>
  );
}

/* ── Empty record set ────────────────────────────────────────────── */
export function ArtBasket({ size = 84, className = '', ...rest }) {
  return (
    <svg width={size} height={size * (88 / 120)} viewBox="0 0 120 88" className={className} aria-hidden="true" {...rest}>
      <rect x="26" y="20" width="68" height="54" rx="6" fill="none" stroke={INK} strokeWidth={LINE} />
      <line x1="26" y1="36" x2="94" y2="36" stroke={INK_SOFT} strokeWidth={HAIR} />
      <line x1="40" y1="50" x2="80" y2="50" stroke={LEAF_DEEP} strokeWidth={LINE} strokeLinecap="round" />
      <line x1="46" y1="60" x2="74" y2="60" stroke={LEAF_DEEP} strokeWidth={LINE} strokeLinecap="round" />
      <circle cx="34" cy="28" r="2" fill={GOLD} />
      <circle cx="42" cy="28" r="2" fill={LEAF_DEEP} />
      <path d="M8 80 h104" stroke={LEAF_DEEP} strokeWidth={HAIR} strokeDasharray="3 5" />
    </svg>
  );
}

/* ── Confirmation — a seal, with one measured ring animation ─────── */
export function ArtSuccess({ size = 120, className = '', ...rest }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" className={className} aria-hidden="true" {...rest}>
      <circle cx="60" cy="60" r="40" fill="none" stroke="#166534" strokeWidth={LINE} opacity="0.35">
        <animate attributeName="r" values="40;52" dur="2.2s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.35;0" dur="2.2s" repeatCount="indefinite" />
      </circle>
      <circle cx="60" cy="60" r="40" fill={CREAM} stroke={INK} strokeWidth={LINE} />
      <circle cx="60" cy="60" r="34" fill="none" stroke={GOLD} strokeWidth={HAIR} strokeDasharray="2 6" strokeLinecap="round" />
      <path d="M46 61 l10 10 l20 -22" fill="none" stroke="#166534" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
        <animate attributeName="stroke-dasharray" values="0 60;60 0" dur="0.5s" fill="freeze" />
      </path>
    </svg>
  );
}

/* ── Queue — a token flow diagram ────────────────────────────────── */
export function ArtQueue({ size = 110, className = '', ...rest }) {
  const node = (x, active, delay) => (
    <g key={x}>
      <rect x={x} y="14" width="22" height="26" rx="4" fill={active ? LEAF : 'none'} stroke={INK} strokeWidth={active ? LINE : HAIR} />
      <line x1={x + 6} y1="22" x2={x + 16} y2="22" stroke={INK_SOFT} strokeWidth={HAIR} />
      <line x1={x + 6} y1="28" x2={x + 16} y2="28" stroke={INK_SOFT} strokeWidth={HAIR} opacity="0.6" />
      <circle cx={x + 11} cy="46" r="2.4" fill={active ? GOLD : LEAF_DEEP}>
        {active && <animate attributeName="opacity" values="1;0.25;1" dur="1.8s" begin={`${delay}s`} repeatCount="indefinite" />}
      </circle>
    </g>
  );
  return (
    <svg width={size} height={size * (52 / 110)} viewBox="0 0 110 52" className={className} aria-hidden="true" {...rest}>
      <line x1="4" y1="46" x2="106" y2="46" stroke={LEAF_DEEP} strokeWidth={HAIR} />
      {node(8, true, 0)}
      {node(44, false, 0.3)}
      {node(80, false, 0.6)}
      <path d="M34 27 h8 M70 27 h8" stroke={GOLD} strokeWidth={HAIR} strokeLinecap="round" />
    </svg>
  );
}

/* ── App logo: wheat inside a state seal ─────────────────────────── */
export function ArtLogo({ size = 44, className = '', ring = true, ...rest }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} aria-hidden="true" {...rest}>
      {ring && <circle cx="32" cy="32" r="30" fill="#14532d" />}
      <circle cx="32" cy="32" r="26" fill="none" stroke={GOLD} strokeWidth="1" opacity="0.9" />
      <g stroke={CREAM} strokeWidth="1.6" fill="none" strokeLinecap="round">
        <line x1="32" y1="46" x2="32" y2="18" />
        {[0, 1, 2, 3].map((k) => {
          const y = 42 - k * 6;
          return (
            <g key={k}>
              <path d={`M32 ${y} q-7 -1 -8 -6 q7 1 8 5 z`} stroke={GOLD} />
              <path d={`M32 ${y} q7 -1 8 -6 q-7 1 -8 5 z`} stroke={GOLD} />
            </g>
          );
        })}
        <path d="M32 18 q-3 -5 0 -8 q3 5 0 8 z" stroke={GOLD} />
      </g>
      <path d="M20 50 h24" stroke={GOLD} strokeWidth="1" strokeLinecap="round" opacity="0.7" />
    </svg>
  );
}

/* ── Section rule ────────────────────────────────────────────────── */
export function ArtDivider({ className = '', ...rest }) {
  return (
    <svg width="140" height="12" viewBox="0 0 140 12" className={className} aria-hidden="true" {...rest}>
      <line x1="0" y1="6" x2="60" y2="6" stroke={LEAF_DEEP} strokeWidth={HAIR} />
      <line x1="80" y1="6" x2="140" y2="6" stroke={LEAF_DEEP} strokeWidth={HAIR} />
      <rect x="66" y="2" width="8" height="8" rx="1.5" transform="rotate(45 70 6)" fill="none" stroke={GOLD} strokeWidth={HAIR} />
    </svg>
  );
}

/* ── Procurement centre — a facility plan ────────────────────────── */
export function ArtMandi({ size = 96, className = '', ...rest }) {
  return (
    <svg width={size} height={size * (76 / 120)} viewBox="0 0 120 76" className={className} aria-hidden="true" {...rest}>
      <path d="M18 28 L60 10 L102 28" fill="none" stroke={INK} strokeWidth={LINE} strokeLinejoin="round" />
      <line x1="12" y1="28" x2="108" y2="28" stroke={INK} strokeWidth={LINE} strokeLinecap="round" />
      <path d="M24 28 v34 M96 28 v34" stroke={INK} strokeWidth={LINE} strokeLinecap="round" />
      <path d="M40 62 V40 h16 v22" fill={LEAF} stroke={INK} strokeWidth={HAIR} strokeLinejoin="round" />
      <rect x="66" y="40" width="18" height="14" rx="2" fill="none" stroke={INK_SOFT} strokeWidth={HAIR} />
      <line x1="8" y1="66" x2="112" y2="66" stroke={LEAF_DEEP} strokeWidth={LINE} strokeLinecap="round" />
      <circle cx="60" cy="20" r="3" fill={GOLD} />
    </svg>
  );
}

/* ── Leaf pair for section headers — reduced to a precise mark ───── */
export function ArtLeafPair({ size = 22, className = '', ...rest }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true" {...rest}>
      <line x1="12" y1="21" x2="12" y2="5" stroke={INK} strokeWidth={HAIR} strokeLinecap="round" />
      <path d="M12 14 q-6 -1 -7 -7 q6 1 7 7 z" fill="none" stroke={GOLD} strokeWidth={HAIR} strokeLinejoin="round" />
      <path d="M12 10 q6 -1 7 -7 q-6 1 -7 7 z" fill="none" stroke={GOLD} strokeWidth={HAIR} strokeLinejoin="round" />
    </svg>
  );
}

/* ── Secure message / OTP ────────────────────────────────────────── */
export function ArtLetter({ size = 64, className = '', ...rest }) {
  return (
    <svg width={size} height={size * (56 / 84)} viewBox="0 0 84 56" className={className} aria-hidden="true" {...rest}>
      <rect x="8" y="8" width="68" height="42" rx="4" fill={CREAM} stroke={INK} strokeWidth={LINE} />
      <path d="M10 13 l32 21 l32 -21" fill="none" stroke={INK} strokeWidth={HAIR} strokeLinejoin="round" />
      <circle cx="70" cy="14" r="8" fill={CREAM} stroke={GOLD} strokeWidth={LINE} />
      <path d="M66 14 l3 3 l5 -6" fill="none" stroke={INK} strokeWidth={HAIR} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ── Identity card ───────────────────────────────────────────────── */
export function ArtIdBadge({ size = 72, className = '', ...rest }) {
  return (
    <svg width={size} height={size * (80 / 72)} viewBox="0 0 72 80" className={className} aria-hidden="true" {...rest}>
      <path d="M32 2 h8 v12 h-8 z" fill="none" stroke={INK_SOFT} strokeWidth={HAIR} />
      <rect x="8" y="14" width="56" height="60" rx="5" fill={CREAM} stroke={INK} strokeWidth={LINE} />
      <rect x="8" y="14" width="56" height="13" rx="5" fill="#14532d" />
      <rect x="16" y="36" width="18" height="22" rx="2" fill="none" stroke={INK_SOFT} strokeWidth={HAIR} />
      <circle cx="25" cy="43" r="4" fill="none" stroke={INK_SOFT} strokeWidth={HAIR} />
      <path d="M19 54 q6 -7 12 0" fill="none" stroke={INK_SOFT} strokeWidth={HAIR} />
      <path d="M40 38 h16 M40 45 h16 M40 52 h10" stroke={INK} strokeWidth={HAIR} strokeLinecap="round" />
      <path d="M16 64 h40" stroke={GOLD} strokeWidth={HAIR} strokeDasharray="2 4" />
    </svg>
  );
}

export const ART_COLORS = { INK, INK_SOFT, GOLD, GOLD_SOFT, LEAF, LEAF_DEEP, CREAM, CLAY, SKIN, SKY, SLATE };
export { Frame as ArtFrame };

/* ── Service notice — used for error and not-found states ────────── */
export function ArtNotice({ size = 72, className = '', tone = 'warn', ...rest }) {
  const c = tone === 'error' ? '#a5271c' : GOLD;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className={className} aria-hidden="true" {...rest}>
      <rect x="18" y="14" width="64" height="72" rx="4" fill={CREAM} stroke={INK} strokeWidth={LINE} />
      <line x1="18" y1="28" x2="82" y2="28" stroke={INK} strokeWidth={HAIR} />
      <line x1="30" y1="70" x2="70" y2="70" stroke={LEAF_DEEP} strokeWidth={LINE} strokeLinecap="round" />
      <line x1="36" y1="78" x2="64" y2="78" stroke={LEAF_DEEP} strokeWidth={LINE} strokeLinecap="round" />
      <circle cx="50" cy="48" r="15" fill="none" stroke={c} strokeWidth={LINE} />
      <line x1="50" y1="41" x2="50" y2="51" stroke={c} strokeWidth="2.6" strokeLinecap="round" />
      <circle cx="50" cy="56" r="1.6" fill={c} />
    </svg>
  );
}

/* ── Wayfinding mark — 404 / off-route screens ───────────────────── */
export function ArtWayfind({ size = 96, className = '', ...rest }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className={className} aria-hidden="true" {...rest}>
      <circle cx="50" cy="50" r="34" fill="none" stroke={INK} strokeWidth={LINE} />
      <circle cx="50" cy="50" r="28" fill="none" stroke={LEAF_DEEP} strokeWidth={HAIR} strokeDasharray="2 6" />
      <path d="M50 12 v6 M50 82 v6 M12 50 h6 M82 50 h6" stroke={INK_SOFT} strokeWidth={HAIR} strokeLinecap="round" />
      <path d="M62 38 L44 46 L38 62 L56 54 Z" fill={GOLD_SOFT} stroke={INK} strokeWidth={LINE} strokeLinejoin="round" />
      <circle cx="50" cy="50" r="2" fill={INK} />
    </svg>
  );
}
