// Annadata Saathi — folk-art illustration kit.
//
// Hand-drawn, Indian folk-inspired line art (Madhubani / handloom poster
// style): bold forest-ink outlines, warm flat fills, dotted details.
// Everything is inline SVG — no image assets, tiny APK, scales crisply.
// The palette matches the Annadata Connect theme: green + gold + cream.

const INK = '#0f3d22';
const GOLD = '#fbbf24';
const GOLD_SOFT = '#fde9b8';
const LEAF = '#dff0e2';
const LEAF_DEEP = '#bcdcc4';
const CREAM = '#fbfaf5';
const CLAY = '#e0784f';
const SKIN = '#ffdfbe';
const SKY = '#e4ecfc';

/* ── The smiling sun ─────────────────────────────────────────────── */
export function ArtSun({ size = 72, className = '', sleepy = false }) {
  const rays = Array.from({ length: 12 }, (_, i) => {
    const a = (i * 30 * Math.PI) / 180;
    const inner = 30;
    const outer = i % 2 === 0 ? 42 : 38;
    const x1 = 50 + Math.cos(a) * inner;
    const y1 = 50 + Math.sin(a) * inner;
    const x2 = 50 + Math.cos(a) * outer;
    const y2 = 50 + Math.sin(a) * outer;
    return { x1, y1, x2, y2, key: i };
  });
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className={className} aria-hidden="true">
      {rays.map((r) => (
        <line key={r.key} x1={r.x1} y1={r.y1} x2={r.x2} y2={r.y2} stroke={GOLD} strokeWidth={r.key % 2 === 0 ? 6 : 4} strokeLinecap="round" />
      ))}
      <circle cx="50" cy="50" r="24" fill={GOLD} stroke={INK} strokeWidth="3" />
      {sleepy ? (
        <>
          <path d="M39 50q4 4 8 0" fill="none" stroke={INK} strokeWidth="2.6" strokeLinecap="round" />
          <path d="M53 50q4 4 8 0" fill="none" stroke={INK} strokeWidth="2.6" strokeLinecap="round" />
        </>
      ) : (
        <>
          <circle cx="42" cy="48" r="2.6" fill={INK} />
          <circle cx="58" cy="48" r="2.6" fill={INK} />
        </>
      )}
      <path d="M41 57q9 8 18 0" fill="none" stroke={INK} strokeWidth="2.6" strokeLinecap="round" />
      <circle cx="35" cy="55" r="3.4" fill={CLAY} opacity="0.5" />
      <circle cx="65" cy="55" r="3.4" fill={CLAY} opacity="0.5" />
    </svg>
  );
}

/* ── Wheat stalk ─────────────────────────────────────────────────── */
export function ArtWheat({ size = 48, className = '', tone = GOLD }) {
  const grains = [0, 1, 2, 3].map((k) => {
    const y = 68 - k * 13;
    return (
      <g key={k}>
        <path d={`M30 ${y} q-15 -3 -17 -15 q13 1 17 9 z`} fill={tone} stroke={INK} strokeWidth="2.2" strokeLinejoin="round" />
        <path d={`M30 ${y} q15 -3 17 -15 q-13 1 -17 9 z`} fill={tone} stroke={INK} strokeWidth="2.2" strokeLinejoin="round" />
      </g>
    );
  });
  return (
    <svg width={size} height={size} viewBox="0 0 60 100" className={className} aria-hidden="true">
      <path d="M30 96 C30 70 30 40 30 18" fill="none" stroke={INK} strokeWidth="3" strokeLinecap="round" />
      {grains}
      <path d="M30 20 q-6 -9 0 -17 q6 8 0 17 z" fill={tone} stroke={INK} strokeWidth="2.2" strokeLinejoin="round" />
      <path d="M30 88 q-10 2 -14 10" fill="none" stroke={INK} strokeWidth="2.4" strokeLinecap="round" />
      <path d="M30 88 q10 2 14 10" fill="none" stroke={INK} strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

/* ── Farmer with turban, waving ──────────────────────────────────── */
export function ArtFarmer({ size = 96, className = '' }) {
  return (
    <svg width={size} height={size * (140 / 120)} viewBox="0 0 120 140" className={className} aria-hidden="true">
      {/* waving arm (behind body) */}
      <path d="M76 66 q22 -8 26 -28 l-9 -4 q-7 16 -21 22 z" fill="#fff" stroke={INK} strokeWidth="2.6" strokeLinejoin="round" />
      <circle cx="99" cy="33" r="6.5" fill={SKIN} stroke={INK} strokeWidth="2.6" />
      {/* kurta */}
      <path d="M40 60 L80 60 L88 112 Q60 120 32 112 Z" fill="#fff" stroke={INK} strokeWidth="2.8" strokeLinejoin="round" />
      <path d="M60 60 L60 110" stroke={INK} strokeWidth="2" strokeDasharray="1 5" strokeLinecap="round" />
      {/* pocket + button dots */}
      <path d="M46 76 h10 v9 h-10 z" fill={LEAF} stroke={INK} strokeWidth="2" strokeLinejoin="round" />
      <circle cx="68" cy="82" r="1.6" fill={INK} />
      <circle cx="68" cy="92" r="1.6" fill={INK} />
      {/* head */}
      <circle cx="60" cy="42" r="18" fill={SKIN} stroke={INK} strokeWidth="2.8" />
      <circle cx="53" cy="41" r="2.2" fill={INK} />
      <circle cx="67" cy="41" r="2.2" fill={INK} />
      <path d="M52 49 q8 7 16 0" fill="none" stroke={INK} strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="46" cy="47" r="2.8" fill={CLAY} opacity="0.5" />
      <circle cx="74" cy="47" r="2.8" fill={CLAY} opacity="0.5" />
      {/* turban */}
      <path d="M40 34 q4 -14 20 -14 q16 0 20 14 q-8 5 -20 5 q-12 0 -20 -5 z" fill="#fff" stroke={INK} strokeWidth="2.8" strokeLinejoin="round" />
      <path d="M43 30 q17 -8 34 0" fill="none" stroke={GOLD} strokeWidth="4" strokeLinecap="round" />
      <circle cx="84" cy="27" r="5" fill={GOLD} stroke={INK} strokeWidth="2.4" />
      {/* dhoti */}
      <path d="M40 110 Q60 118 80 110 L78 128 Q60 134 42 128 Z" fill={GOLD_SOFT} stroke={INK} strokeWidth="2.8" strokeLinejoin="round" />
      <ellipse cx="50" cy="133" rx="6" ry="3.4" fill={SKIN} stroke={INK} strokeWidth="2.2" />
      <ellipse cx="70" cy="133" rx="6" ry="3.4" fill={SKIN} stroke={INK} strokeWidth="2.2" />
    </svg>
  );
}

/* ── Cow with a bell ─────────────────────────────────────────────── */
export function ArtCow({ size = 90, className = '' }) {
  return (
    <svg width={size} height={size * (80 / 120)} viewBox="0 0 120 80" className={className} aria-hidden="true">
      {/* tail */}
      <path d="M96 26 q12 6 8 22" fill="none" stroke={INK} strokeWidth="2.6" strokeLinecap="round" />
      <circle cx="103" cy="51" r="3.4" fill={INK} />
      {/* body */}
      <path d="M22 22 h56 q16 0 16 14 v14 q0 8 -8 8 h-64 q-8 0 -8 -8 v-14 q0 -14 8 -14 z" fill="#fff" stroke={INK} strokeWidth="2.8" strokeLinejoin="round" />
      {/* spots */}
      <path d="M38 26 q10 -3 13 6 q-8 6 -14 2 q-3 -4 1 -8 z" fill={LEAF} stroke={INK} strokeWidth="2" strokeLinejoin="round" />
      <path d="M66 38 q9 -2 11 5 q-6 6 -12 2 q-2 -4 1 -7 z" fill={GOLD_SOFT} stroke={INK} strokeWidth="2" strokeLinejoin="round" />
      {/* head */}
      <path d="M14 20 q-10 2 -10 12 q0 10 10 12 q8 2 10 -6 v-12 q-2 -8 -10 -6 z" fill="#fff" stroke={INK} strokeWidth="2.8" strokeLinejoin="round" />
      {/* horns + ears */}
      <path d="M8 20 q-4 -8 2 -12" fill="none" stroke={INK} strokeWidth="2.6" strokeLinecap="round" />
      <path d="M20 20 q4 -8 -2 -12" fill="none" stroke={INK} strokeWidth="2.6" strokeLinecap="round" />
      {/* face */}
      <circle cx="9" cy="28" r="2" fill={INK} />
      <path d="M5 35 q4 3 8 0" fill="none" stroke={INK} strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="7" cy="33" r="1.4" fill={INK} />
      <circle cx="11" cy="33" r="1.4" fill={INK} />
      {/* legs */}
      <path d="M30 58 v14 M46 58 v14 M66 58 v14 M82 58 v14" stroke={INK} strokeWidth="3.4" strokeLinecap="round" />
      {/* bell */}
      <path d="M26 44 l7 -4 l7 4 l-3.5 8 h-7 z" fill={GOLD} stroke={INK} strokeWidth="2.2" strokeLinejoin="round" />
      <circle cx="33" cy="55" r="1.6" fill={INK} />
    </svg>
  );
}

/* ── Little tractor ──────────────────────────────────────────────── */
export function ArtTractor({ size = 90, className = '' }) {
  return (
    <svg width={size} height={size * (72 / 120)} viewBox="0 0 120 72" className={className} aria-hidden="true">
      {/* exhaust puff */}
      <circle cx="30" cy="8" r="3" fill="none" stroke={INK} strokeWidth="2" />
      <circle cx="36" cy="4" r="4.4" fill="none" stroke={INK} strokeWidth="2" />
      {/* body */}
      <path d="M20 34 h46 v-14 h-14 l-6 -8 h-20 z" fill={GOLD} stroke={INK} strokeWidth="2.8" strokeLinejoin="round" />
      <path d="M52 20 v14" stroke={INK} strokeWidth="2.2" />
      <path d="M27 34 v-8 h10" fill="none" stroke={INK} strokeWidth="2.6" strokeLinecap="round" />
      {/* cabin */}
      <path d="M66 46 v-26 h18 q4 0 4 6 v20 z" fill={LEAF} stroke={INK} strokeWidth="2.8" strokeLinejoin="round" />
      <path d="M66 30 h22" stroke={INK} strokeWidth="2" />
      {/* wheels */}
      <circle cx="34" cy="52" r="15" fill={INK} />
      <circle cx="34" cy="52" r="7" fill={GOLD} stroke={INK} strokeWidth="2.4" />
      <circle cx="34" cy="52" r="2.2" fill={INK} />
      <circle cx="86" cy="55" r="11" fill={INK} />
      <circle cx="86" cy="55" r="5" fill={CREAM} stroke={INK} strokeWidth="2" />
      {/* crop load */}
      <path d="M20 34 q4 -10 10 -12" fill="none" stroke={INK} strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

/* ── Birds ───────────────────────────────────────────────────────── */
export function ArtBirds({ size = 84, className = '' }) {
  return (
    <svg width={size} height={size * (36 / 120)} viewBox="0 0 120 36" className={className} aria-hidden="true">
      <path d="M8 24 q9 -13 18 0 q9 -13 18 0" fill="none" stroke={INK} strokeWidth="2.6" strokeLinecap="round" />
      <path d="M62 18 q7 -10 14 0 q7 -10 14 0" fill="none" stroke={INK} strokeWidth="2.4" strokeLinecap="round" />
      <path d="M98 26 q5 -7 10 0 q5 -7 10 0" fill="none" stroke={INK} strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

/* ── Rolling field under a sun ───────────────────────────────────── */
export function ArtField({ size = 200, className = '' }) {
  return (
    <svg width={size} height={size * (96 / 200)} viewBox="0 0 200 96" className={className} aria-hidden="true">
      <circle cx="168" cy="20" r="11" fill={GOLD} stroke={INK} strokeWidth="2.6" />
      <path d="M0 52 q30 -14 58 -2 q30 12 62 0 q34 -13 80 2 v44 h-200 z" fill={LEAF} stroke={INK} strokeWidth="2.6" strokeLinejoin="round" />
      <path d="M0 70 q36 -12 74 0 q36 11 126 -2 v28 h-200 z" fill="#cfe8d4" stroke={INK} strokeWidth="2.6" strokeLinejoin="round" />
      <path d="M0 88 q50 -10 104 0 q50 9 96 -4 v12 h-200 z" fill={GOLD_SOFT} stroke={INK} strokeWidth="2.6" strokeLinejoin="round" />
      <circle cx="40" cy="62" r="1.8" fill={INK} />
      <circle cx="60" cy="58" r="1.8" fill={INK} />
      <circle cx="84" cy="63" r="1.8" fill={INK} />
      <circle cx="30" cy="79" r="1.8" fill={INK} />
      <circle cx="58" cy="76" r="1.8" fill={INK} />
      <circle cx="90" cy="80" r="1.8" fill={INK} />
      <path d="M20 34 q5 -8 10 0 q5 -8 10 0" fill="none" stroke={INK} strokeWidth="2.2" strokeLinecap="round" />
      <path d="M60 26 q4 -6 8 0 q4 -6 8 0" fill="none" stroke={INK} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/* ── Weighing scales with grain ──────────────────────────────────── */
export function ArtScales({ size = 72, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className={className} aria-hidden="true">
      <path d="M50 10 v58" stroke={INK} strokeWidth="3" strokeLinecap="round" />
      <path d="M36 90 h28" stroke={INK} strokeWidth="3.4" strokeLinecap="round" />
      <path d="M42 90 q8 -26 16 0" fill="none" stroke={INK} strokeWidth="2.6" strokeLinecap="round" />
      <path d="M14 22 h72" stroke={INK} strokeWidth="3" strokeLinecap="round" />
      <circle cx="50" cy="22" r="5" fill={GOLD} stroke={INK} strokeWidth="2.6" />
      {/* left pan: grain heap */}
      <path d="M14 22 l-8 22 h16 z" fill="none" stroke={INK} strokeWidth="2.2" strokeLinejoin="round" />
      <path d="M8 44 a8 5 0 0 0 12 0" fill="none" stroke={INK} strokeWidth="2.2" strokeLinecap="round" />
      <path d="M9 43 q3 -7 6 -7 q3 0 6 7 q-6 3 -12 0 z" fill={GOLD} stroke={INK} strokeWidth="2" strokeLinejoin="round" />
      {/* right pan: coin */}
      <path d="M86 22 l-8 22 h16 z" fill="none" stroke={INK} strokeWidth="2.2" strokeLinejoin="round" />
      <path d="M80 44 a8 5 0 0 0 12 0" fill="none" stroke={INK} strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="86" cy="38" r="5.4" fill={GOLD} stroke={INK} strokeWidth="2.2" />
      <path d="M84 36 h4 M84 38 h4 M85 35 v6" stroke={INK} strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

/* ── Rupee coin with a sprout ────────────────────────────────────── */
export function ArtRupeeSprout({ size = 64, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" className={className} aria-hidden="true">
      <circle cx="40" cy="46" r="24" fill={GOLD} stroke={INK} strokeWidth="2.8" />
      <path d="M32 38 h16 M32 44 h14 q6 0 6 6 t-6 6 h-14 M33 56 l12 -12" fill="none" stroke={INK} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M40 22 q-1 -10 8 -14 q3 9 -4 15 z" fill={LEAF} stroke={INK} strokeWidth="2.4" strokeLinejoin="round" />
      <path d="M40 22 q-8 -8 -6 -16 q9 3 8 15 z" fill="#cfe8d4" stroke={INK} strokeWidth="2.4" strokeLinejoin="round" />
    </svg>
  );
}

/* ── Empty basket (empty states) ─────────────────────────────────── */
export function ArtBasket({ size = 84, className = '' }) {
  return (
    <svg width={size} height={size * (88 / 120)} viewBox="0 0 120 88" className={className} aria-hidden="true">
      <path d="M30 34 q30 -18 60 0" fill="none" stroke={INK} strokeWidth="2.8" strokeLinecap="round" />
      <path d="M26 36 h68 l-8 40 q-26 8 -52 0 z" fill={GOLD_SOFT} stroke={INK} strokeWidth="2.8" strokeLinejoin="round" />
      <path d="M32 46 q28 8 56 0 M34 58 q24 7 52 0" fill="none" stroke={INK} strokeWidth="2.2" />
      <path d="M44 36 q4 -10 12 -12 M66 36 q0 -10 8 -13" fill="none" stroke={INK} strokeWidth="2.4" strokeLinecap="round" />
      <path d="M50 22 q4 -6 8 0 q4 -6 8 0" fill="none" stroke={INK} strokeWidth="2" strokeLinecap="round" />
      <circle cx="98" cy="64" r="5" fill="#fff" stroke={INK} strokeWidth="2.2" />
      <path d="M92 64 q6 -8 12 0" fill="none" stroke={INK} strokeWidth="2.2" strokeLinecap="round" />
      <path d="M14 66 q5 -6 10 0 q5 -6 10 0" fill="none" stroke={INK} strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

/* ── Success burst with a check ──────────────────────────────────── */
export function ArtSuccess({ size = 120, className = '' }) {
  const rays = Array.from({ length: 16 }, (_, i) => {
    const a = (i * 22.5 * Math.PI) / 180;
    const r1 = 36;
    const r2 = i % 2 === 0 ? 48 : 42;
    return { x1: 60 + Math.cos(a) * r1, y1: 60 + Math.sin(a) * r1, x2: 60 + Math.cos(a) * r2, y2: 60 + Math.sin(a) * r2, k: i };
  });
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" className={className} aria-hidden="true">
      {rays.map((r) => (
        <line key={r.k} x1={r.x1} y1={r.y1} x2={r.x2} y2={r.y2} stroke={GOLD} strokeWidth={r.k % 2 === 0 ? 5 : 3.4} strokeLinecap="round" />
      ))}
      <circle cx="60" cy="60" r="32" fill="#fff" stroke={INK} strokeWidth="3" />
      <circle cx="60" cy="60" r="37" fill="none" stroke={GOLD} strokeWidth="2.4" strokeDasharray="1 7" strokeLinecap="round" />
      <path d="M46 61 l10 10 l20 -22" fill="none" stroke="#166534" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ── Queue of three farmers (waiting illustration) ───────────────── */
export function ArtQueue({ size = 110, className = '' }) {
  const person = (x, y, fill, delay) => (
    <g key={x} opacity="0.97">
      <circle cx={x + 10} cy={y + 10} r="9" fill={SKIN} stroke={INK} strokeWidth="2.4" />
      <path d={`M${x + 1} ${y + 9} q9 -8 18 0 q-2 -10 -9 -10 q-7 0 -9 10 z`} fill={fill} stroke={INK} strokeWidth="2.4" strokeLinejoin="round" />
      <path d={`M${x} ${y + 22} h20 l2 22 h-24 z`} fill={fill} stroke={INK} strokeWidth="2.4" strokeLinejoin="round" />
      <circle cx={x + 6.5} cy={y + 10.5} r="1.5" fill={INK} />
      <circle cx={x + 13.5} cy={y + 10.5} r="1.5" fill={INK} />
      <path d={`M${x + 6} ${y + 15} q4 3 8 0`} fill="none" stroke={INK} strokeWidth="1.8" strokeLinecap="round" />
      <animateTransform attributeName="transform" type="translate" values="0 0; 0 -1.5; 0 0" dur="2.6s" begin={`${delay}s`} repeatCount="indefinite" />
    </g>
  );
  return (
    <svg width={size} height={size * (52 / 110)} viewBox="0 0 110 52" className={className} aria-hidden="true">
      {person(2, 6, '#fff', 0)}
      {person(38, 10, GOLD_SOFT, 0.4)}
      {person(74, 6, '#fff', 0.8)}
      <path d="M96 28 q6 -8 12 0 q6 -8 12 0" fill="none" stroke={INK} strokeWidth="1.8" />
    </svg>
  );
}

/* ── App logo badge: wheat + sun ring ────────────────────────────── */
export function ArtLogo({ size = 44, className = '', ring = true }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} aria-hidden="true">
      {ring && <circle cx="32" cy="32" r="29" fill="#14532d" />}
      <circle cx="32" cy="32" r="29" fill="none" stroke={GOLD} strokeWidth="2" strokeDasharray="1 5.5" strokeLinecap="round" />
      <g transform="translate(20 8) scale(0.4)">
        <path d="M30 118 C30 90 30 55 30 30" fill="none" stroke={CREAM} strokeWidth="6" strokeLinecap="round" />
        {[0, 1, 2, 3].map((k) => {
          const y = 82 - k * 15;
          return (
            <g key={k}>
              <path d={`M30 ${y} q-17 -3 -19 -17 q14 1 19 10 z`} fill={GOLD} stroke={CREAM} strokeWidth="4" strokeLinejoin="round" />
              <path d={`M30 ${y} q17 -3 19 -17 q-14 1 -19 10 z`} fill={GOLD} stroke={CREAM} strokeWidth="4" strokeLinejoin="round" />
            </g>
          );
        })}
        <path d="M30 30 q-7 -10 0 -20 q7 10 0 20 z" fill={GOLD} stroke={CREAM} strokeWidth="4" strokeLinejoin="round" />
      </g>
    </svg>
  );
}

/* ── Decorative dotted divider row with a tiny wheat ─────────────── */
export function ArtDivider({ className = '' }) {
  return (
    <svg width="140" height="18" viewBox="0 0 140 18" className={className} aria-hidden="true">
      <line x1="4" y1="9" x2="52" y2="9" stroke={GOLD} strokeWidth="2.4" strokeDasharray="1 6" strokeLinecap="round" />
      <line x1="88" y1="9" x2="136" y2="9" stroke={GOLD} strokeWidth="2.4" strokeDasharray="1 6" strokeLinecap="round" />
      <path d="M70 3 q-5 6 0 12 q5 -6 0 -12 z" fill={GOLD} stroke={INK} strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M66 5 q-6 1 -7 6 q6 0 8 -5 z M74 5 q6 1 7 6 q-6 0 -8 -5 z" fill={LEAF} stroke={INK} strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  );
}

/* ── Mandi market scene: awning + sacks ──────────────────────────── */
export function ArtMandi({ size = 96, className = '' }) {
  return (
    <svg width={size} height={size * (76 / 120)} viewBox="0 0 120 76" className={className} aria-hidden="true">
      {/* awning */}
      <path d="M14 16 h92 l-6 12 h-80 z" fill={GOLD} stroke={INK} strokeWidth="2.6" strokeLinejoin="round" />
      <path d="M26 28 l-4 -12 M44 28 l-2 -12 M62 28 l0 -12 M80 28 l2 -12 M98 28 l4 -12" stroke={INK} strokeWidth="2" />
      <path d="M20 12 h80" stroke={INK} strokeWidth="3" strokeLinecap="round" />
      {/* sacks */}
      <path d="M30 34 h24 q4 0 4 6 v18 q0 4 -4 4 h-24 q-4 0 -4 -4 v-18 q0 -6 4 -6 z" fill={GOLD_SOFT} stroke={INK} strokeWidth="2.6" strokeLinejoin="round" />
      <path d="M34 34 q8 -8 16 0" fill="none" stroke={INK} strokeWidth="2.2" strokeLinecap="round" />
      <path d="M62 44 h22 q4 0 4 5 v13 q0 4 -4 4 h-22 q-4 0 -4 -4 v-13 q0 -5 4 -5 z" fill={LEAF} stroke={INK} strokeWidth="2.6" strokeLinejoin="round" />
      <path d="M66 44 q7 -7 14 0" fill="none" stroke={INK} strokeWidth="2.2" strokeLinecap="round" />
      {/* grain heap + scale */}
      <circle cx="102" cy="62" r="9" fill={GOLD} stroke={INK} strokeWidth="2.4" />
      <path d="M96 70 q6 4 12 0" fill="none" stroke={INK} strokeWidth="2.2" strokeLinecap="round" />
      <path d="M8 40 q4 -6 8 0 q4 -6 8 0" fill="none" stroke={INK} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/* ── Tiny helper: leaf pair for cards / section headers ──────────── */
export function ArtLeafPair({ size = 22, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="M12 21 q-1 -8 0 -18" fill="none" stroke={INK} strokeWidth="2" strokeLinecap="round" />
      <path d="M12 13 q-7 -1 -8 -8 q7 0 8 8 z" fill={LEAF} stroke={INK} strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M12 9 q7 -1 8 -8 q-7 0 -8 8 z" fill="#cfe8d4" stroke={INK} strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
}

/* ── Envelope with a seal (SMS/email OTP art) ────────────────────── */
export function ArtLetter({ size = 64, className = '' }) {
  return (
    <svg width={size} height={size * (56 / 84)} viewBox="0 0 84 56" className={className} aria-hidden="true">
      <rect x="8" y="8" width="68" height="42" rx="6" fill="#fff" stroke={INK} strokeWidth="2.8" />
      <path d="M10 12 l32 22 l32 -22" fill="none" stroke={INK} strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="68" cy="14" r="9" fill={GOLD} stroke={INK} strokeWidth="2.4" />
      <path d="M64 14 l3 3 l5 -6" fill="none" stroke={INK} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ── ID card with lanyard ────────────────────────────────────────── */
export function ArtIdBadge({ size = 72, className = '' }) {
  return (
    <svg width={size} height={size * (80 / 72)} viewBox="0 0 72 80" className={className} aria-hidden="true">
      <path d="M30 2 q6 8 12 0 l4 14 h-20 z" fill={GOLD} stroke={INK} strokeWidth="2.4" strokeLinejoin="round" />
      <rect x="8" y="16" width="56" height="58" rx="8" fill="#fff" stroke={INK} strokeWidth="2.8" />
      <rect x="8" y="16" width="56" height="14" rx="8" fill="#14532d" />
      <circle cx="22" cy="48" r="8" fill={SKIN} stroke={INK} strokeWidth="2.2" />
      <path d="M34 40 h22 M34 47 h22 M34 54 h14" stroke={INK} strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="52" cy="62" r="7" fill="none" stroke={GOLD} strokeWidth="2.4" />
      <path d="M49 62 h6 M51 60 v4 M53 60 v4" stroke={GOLD} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export const ART_COLORS = { INK, GOLD, GOLD_SOFT, LEAF, LEAF_DEEP, CREAM, CLAY, SKIN, SKY };
