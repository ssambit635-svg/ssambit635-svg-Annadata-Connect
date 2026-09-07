// Inline SVG icon set for Annadata Connect — stroke icons, government-portal style.
// Usage: <Icon name="ticket" size={20} />  (aria-hidden by default; pass label for semantics)

const ICONS = {
  home: (
    <>
      <path d="M3 10.2 12 3l9 7.2V20a2 2 0 0 1-2 2h-4.5v-6.5h-5V22H5a2 2 0 0 1-2-2z" />
    </>
  ),
  plus: (
    <>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </>
  ),
  chevronDown: <path d="m6 9 6 6 6-6" />,
  arrowLeft: (
    <>
      <path d="M19 12H5" />
      <path d="m12 19-7-7 7-7" />
    </>
  ),
  more: (
    <>
      <circle cx="5" cy="12" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="19" cy="12" r="1.6" fill="currentColor" stroke="none" />
    </>
  ),
  wifiOff: (
    <>
      <path d="M2 2l20 20" />
      <path d="M8.5 16.5a5 5 0 0 1 7 0" />
      <path d="M5 12.5a10 10 0 0 1 3.4-2.2" />
      <path d="M12 8.5c3.7 0 7 1.5 9.5 4" />
      <path d="M2 8.5C4 6.8 6.8 5.6 10 5.6" />
      <path d="M12 19h.01" />
    </>
  ),
  arrowUpRight: (
    <>
      <path d="M7 17 17 7" />
      <path d="M8 7h9v9" />
    </>
  ),
  arrowUp: (
    <>
      <path d="M12 19V5" />
      <path d="m5 12 7-7 7 7" />
    </>
  ),
  idCard: (
    <>
      <rect x="2" y="4" width="20" height="16" rx="2.5" />
      <circle cx="8" cy="10.5" r="2.2" />
      <path d="M4.8 16.2a3.4 3.4 0 0 1 6.4 0" />
      <path d="M14 9h6" />
      <path d="M14 12.5h6" />
      <path d="M14 16h4" />
    </>
  ),
  print: (
    <>
      <path d="M6 9V3h12v6" />
      <rect x="3" y="9" width="18" height="8" rx="2" />
      <path d="M6 14h12v7H6z" />
    </>
  ),
  wheat: (
    <>
      <path d="M12 21v-9" />
      <path d="M12 12c0-3 2-5 5-5 0 3-2 5-5 5z" />
      <path d="M12 12c0-3-2-5-5-5 0 3 2 5 5 5z" />
      <path d="M12 7c0-3 2-5 5-5 0 3-2 5-5 5z" />
      <path d="M12 7C12 4 10 2 7 2c0 3 2 5 5 5z" />
      <path d="M12 17c0-3 2-5 5-5 0 3-2 5-5 5z" />
      <path d="M12 17c0-3-2-5-5-5 0 3 2 5 5 5z" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m16.6 16.6 4.9 4.9" />
    </>
  ),
  phone: (
    <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.4 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z" />
  ),
  bell: (
    <>
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.7 21a2 2 0 0 1-3.4 0" />
    </>
  ),
  megaphone: (
    <>
      <path d="M3 11v2l14 6V5L3 11z" />
      <path d="M11 15.4a3.5 3.5 0 0 1-6 1.1" />
      <path d="M17 8a4 4 0 0 1 0 4" />
    </>
  ),
  mail: (
    <>
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-10 6L2 7" />
    </>
  ),
  lock: (
    <>
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </>
  ),
  key: (
    <>
      <circle cx="7.5" cy="15.5" r="4.5" />
      <path d="m10.5 12.5 10-10" />
      <path d="m15 8 3 3" />
      <path d="m18 5 2.5 2.5" />
    </>
  ),
  eye: (
    <>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  eyeOff: (
    <>
      <path d="M9.9 4.2A9.1 9.1 0 0 1 12 4c6.5 0 10 8 10 8a13.2 13.2 0 0 1-1.7 2.7" />
      <path d="M6.6 6.6A13.5 13.5 0 0 0 2 12s3.5 8 10 8a9.7 9.7 0 0 0 5.4-1.6" />
      <path d="M2 2l20 20" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
    </>
  ),
  check: <path d="M20 6 9 17l-5-5" />,
  x: <path d="M18 6 6 18M6 6l12 12" />,
  checkCircle: (
    <>
      <circle cx="12" cy="12" r="9.5" />
      <path d="m8 12.5 2.5 2.5L16.5 9" />
    </>
  ),
  alertTriangle: (
    <>
      <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </>
  ),
  alertOctagon: (
    <>
      <path d="M7.9 2h8.2L21 7.9v8.2L16.1 22H7.9L3 16.1V7.9L7.9 2z" />
      <path d="M12 8v5" />
      <path d="M12 17h.01" />
    </>
  ),
  star: <path d="m12 2.5 2.9 6.1 6.6.9-4.8 4.6 1.2 6.6-5.9-3.2-5.9 3.2 1.2-6.6L2.5 9.5l6.6-.9L12 2.5z" />,
  scales: (
    <>
      <path d="M12 3v18" />
      <path d="M8 21h8" />
      <path d="M5 6h14" />
      <path d="m5 6-3 7h6l-3-7z" />
      <path d="m19 6-3 7h6l-3-7z" />
    </>
  ),
  pin: (
    <>
      <path d="M12 22s-7-5.5-7-12a7 7 0 0 1 14 0c0 6.5-7 12-7 12z" />
      <circle cx="12" cy="10" r="2.5" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9.5" />
      <path d="M12 6.5V12l4 2" />
    </>
  ),
  ticket: (
    <>
      <path d="M3 9V7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a3 3 0 0 0 0 6v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a3 3 0 0 0 0-6z" />
      <path d="M13.5 5v2" />
      <path d="M13.5 11v2" />
      <path d="M13.5 17v2" />
    </>
  ),
  clipboard: (
    <>
      <rect x="8" y="2" width="8" height="4" rx="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <path d="M9 12h6" />
      <path d="M9 16h4" />
    </>
  ),
  fileText: (
    <>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" />
      <path d="M14 2v6h6" />
      <path d="M16 13H8" />
      <path d="M16 17H8" />
    </>
  ),
  folder: <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2v11z" />,
  store: (
    <>
      <path d="M4 4h16l1 5H3l1-5z" />
      <path d="M5 9v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9" />
      <path d="M9.5 21v-6h5v6" />
    </>
  ),
  chart: (
    <>
      <path d="M3 3v18h18" />
      <path d="M8.5 17V9" />
      <path d="M13.5 17V5" />
      <path d="M18.5 17v-6" />
    </>
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="9.5" />
      <circle cx="12" cy="12" r="5.5" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
    </>
  ),
  list: (
    <>
      <path d="M8.5 6.5h12" />
      <path d="M8.5 12h12" />
      <path d="M8.5 17.5h12" />
      <path d="M3.5 6.5h.01" />
      <path d="M3.5 12h.01" />
      <path d="M3.5 17.5h.01" />
    </>
  ),
  card: (
    <>
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path d="M2 10h20" />
      <path d="M6 15h4" />
    </>
  ),
  users: (
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.9" />
      <path d="M16 3.1a4 4 0 0 1 0 7.8" />
    </>
  ),
  chat: (
    <>
      <path d="M21 15a2 2 0 0 1-2 2H8L3 21V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10z" />
      <path d="M8 9h8" />
      <path d="M8 12.5h5" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9.5" />
      <path d="M12 16v-4.5" />
      <path d="M12 8h.01" />
    </>
  ),
  ban: (
    <>
      <circle cx="12" cy="12" r="9.5" />
      <path d="m5.2 5.2 13.6 13.6" />
    </>
  ),
  refresh: (
    <>
      <path d="M21 12a9 9 0 1 1-2.6-6.4" />
      <path d="M21 3v6h-6" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M20 21v-1.5a5 5 0 0 0-5-5H9a5 5 0 0 0-5 5V21" />
    </>
  ),
  send: (
    <>
      <path d="m22 2-7 20-4-9-9-4 20-7z" />
      <path d="M22 2 11 13" />
    </>
  ),
  rupee: (
    <>
      <path d="M6 3h12" />
      <path d="M6 8h12" />
      <path d="M6 3c7 0 9 3 9 5s-2 5-9 5l7 8" />
    </>
  ),
  flag: (
    <>
      <path d="M5 22V4c2.5-1.5 4.5-1.5 7 0s4.5 1.5 7 0v9c-2.5 1.5-4.5 1.5-7 0s-4.5-1.5-7 0" />
    </>
  ),
  grid: (
    <>
      <rect x="3" y="3" width="7.5" height="7.5" rx="1" />
      <rect x="13.5" y="3" width="7.5" height="7.5" rx="1" />
      <rect x="3" y="13.5" width="7.5" height="7.5" rx="1" />
      <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1" />
    </>
  ),
  logout: (
    <>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="m16 17 5-5-5-5" />
      <path d="M21 12H9" />
    </>
  ),
  download: (
    <>
      <path d="M12 3v12" />
      <path d="m7 10 5 5 5-5" />
      <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
    </>
  ),
  smartphone: (
    <>
      <rect x="6" y="2.5" width="12" height="19" rx="2.5" />
      <path d="M10.5 18.5h3" />
    </>
  ),
  monitor: (
    <>
      <rect x="2.5" y="4" width="19" height="13" rx="2" />
      <path d="M8 21h8" />
      <path d="M12 17v4" />
    </>
  ),
  shield: (
    <>
      <path d="M12 2.8 4.5 5.6v5.6c0 4.9 3.3 8.2 7.5 9.9 4.2-1.7 7.5-5 7.5-9.9V5.6z" />
      <path d="m9 11.6 2.2 2.2L15.4 9.4" />
    </>
  ),
  activity: (
    <>
      <path d="M3 12h4l2.5-6.5L14 18l2.5-6H21" />
    </>
  ),
};

export default function Icon({ name, size = 18, strokeWidth = 1.8, label, className = '' }) {
  const body = ICONS[name];
  if (!body) return null;
  return (
    <svg
      className={`icon icon-${name} ${className}`.trim()}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={label ? undefined : true}
      role={label ? 'img' : undefined}
      aria-label={label}
    >
      {body}
    </svg>
  );
}
