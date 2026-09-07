// Annadata Connect brand mark — a faithful vector rebuild of the supplied
// logo: a turbaned farmer in profile before a rising sun, a golden wheat ear,
// contour fields, all inside a green ring that opens into network nodes and
// a leaf breaking free of the circle.
//
// Pure inline SVG (no bitmap): crisp at any density, tiny in the APK, and
// every part is a named group so the splash screen can animate it.
import { useId } from 'react';

export function BrandLogo({ size = 48, className = '', animate = false, title, ...rest }) {
  // Unique gradient ids so several logos can live on one page.
  const uid = useId().replace(/:/g, '');
  const id = (k) => `${k}-${uid}`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 240 240"
      className={`brand-logo${animate ? ' is-animated' : ''}${className ? ` ${className}` : ''}`}
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      {...rest}
    >
      <defs>
        <radialGradient id={id('sun')} cx="40%" cy="36%" r="72%">
          <stop offset="0" stopColor="#ffedb0" />
          <stop offset="0.5" stopColor="#f9c22e" />
          <stop offset="1" stopColor="#ea9410" />
        </radialGradient>
        <linearGradient id={id('turban')} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffd662" />
          <stop offset="1" stopColor="#ee9f14" />
        </linearGradient>
        <linearGradient id={id('grain')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffd35a" />
          <stop offset="1" stopColor="#ef9f14" />
        </linearGradient>
        <linearGradient id={id('fa')} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#57b346" /><stop offset="1" stopColor="#2f9440" /></linearGradient>
        <linearGradient id={id('fb')} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#2f8f3f" /><stop offset="1" stopColor="#1e7a3a" /></linearGradient>
        <linearGradient id={id('fc')} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#1c6f36" /><stop offset="1" stopColor="#14532d" /></linearGradient>
        <linearGradient id={id('leaf')} x1="0" y1="1" x2="1" y2="0"><stop offset="0" stopColor="#1e7a3a" /><stop offset="1" stopColor="#4fae3f" /></linearGradient>
        <clipPath id={id('disc')}><circle cx="120" cy="124" r="91" /></clipPath>
      </defs>

      {/* ring — open at the top-right node and where the leaf breaks out */}
      <path className="bl-ring" d="M 208.6 98.4 A 96 96 0 1 0 186.2 200.6" fill="none" stroke="#1f7d3c" strokeWidth="9" strokeLinecap="round" pathLength="1" />

      {/* network nodes */}
      <g className="bl-nodes">
        <circle cx="177" cy="46.5" r="8.5" fill="#fbfaf5" stroke="#1f7d3c" strokeWidth="5.5" />
        <path d="M 200.5 61.5 L 214 48 M 208 55.5 L 222.5 67.5" fill="none" stroke="#1f7d3c" strokeWidth="5.5" strokeLinecap="round" />
        <circle cx="218.5" cy="43.5" r="7" fill="#1f7d3c" />
        <circle cx="226.5" cy="71.5" r="7" fill="#1f7d3c" />
      </g>

      <g clipPath={`url(#${id('disc')})`}>
        {/* sun */}
        <circle className="bl-sun" cx="134" cy="106" r="56" fill={`url(#${id('sun')})`} />

        {/* wheat */}
        <g className="bl-wheat">
          <path d="M 176 160 C 178 136, 181 112, 184 86" fill="none" stroke="#e59a12" strokeWidth="3.8" strokeLinecap="round" />
          <g fill={`url(#${id('grain')})`} stroke="#fbfaf5" strokeWidth="1.8" strokeLinejoin="round">
            <path d="M 182 98 C 168 98, 159 88, 160 75 C 173 77, 181 86, 182 98 Z" />
            <path d="M 184 98 C 198 98, 207 88, 206 75 C 193 77, 185 86, 184 98 Z" />
            <path d="M 180.5 116 C 166 116, 157 106, 158 93 C 171 95, 179.5 104, 180.5 116 Z" />
            <path d="M 182.5 116 C 197 116, 206 106, 205 93 C 192 95, 183.5 104, 182.5 116 Z" />
            <path d="M 179 134 C 164 134, 155 124, 156 111 C 169 113, 178 122, 179 134 Z" />
            <path d="M 181 134 C 196 134, 205 124, 204 111 C 191 113, 182 122, 181 134 Z" />
            <path d="M 177.5 152 C 162 152, 153 142, 154 129 C 167 131, 176.5 140, 177.5 152 Z" />
            <path d="M 179.5 152 C 195 152, 204 142, 203 129 C 190 131, 180.5 140, 179.5 152 Z" />
            <path d="M 185 84 C 178 76, 178 63, 185.5 54 C 193 63, 193 76, 185 84 Z" />
          </g>
        </g>

        {/* farmer */}
        <g className="bl-farmer">
          <path d="M 38 204 C 42 168, 74 150, 112 150 C 150 150, 176 170, 180 204 Z" fill="#14532d" stroke="#fbfaf5" strokeWidth="3" />
          <path d="M 100 124 L 97 158 L 131 158 L 124 124 Z" fill="#14532d" />
          <path
            d="M 95 86 C 90 98, 91 114, 97 125 C 102 133, 113 138, 123 133 C 129 130, 132 125, 133 120 C 138 119, 138 114, 134 113 C 137 111, 138 108, 134 106 C 141 104, 144 99, 139 95 C 136 93, 135 90, 134 88 C 128 80, 110 78, 95 86 Z"
            fill="#14532d"
            stroke="#fbfaf5"
            strokeWidth="3"
            strokeLinejoin="round"
          />
          <path d="M 104 106 C 98 103, 96 112, 103 115" fill="none" stroke="#3a9a48" strokeWidth="2.6" strokeLinecap="round" />
          <path d="M 124 111 C 129 108, 135 108.5, 138 111.5" fill="none" stroke="#3a9a48" strokeWidth="3" strokeLinecap="round" />
          <g className="bl-turban">
            <path d="M 84 92 C 68 104, 64 126, 74 140 C 79 124, 88 110, 100 102 Z" fill="#e59a12" stroke="#fbfaf5" strokeWidth="3" strokeLinejoin="round" />
            <path d="M 86 92 C 80 62, 110 40, 138 48 C 156 54, 162 74, 154 92 C 136 80, 110 80, 86 92 Z" fill={`url(#${id('turban')})`} stroke="#fbfaf5" strokeWidth="3" strokeLinejoin="round" />
            <path d="M 94 76 C 110 62, 134 60, 150 72" fill="none" stroke="#fbfaf5" strokeWidth="2.4" strokeLinecap="round" />
            <path d="M 102 64 C 116 56, 132 56, 146 62" fill="none" stroke="#fbfaf5" strokeWidth="2.2" strokeLinecap="round" />
            <path d="M 90 90 C 106 80, 130 78, 152 88" fill="none" stroke="#fbfaf5" strokeWidth="2.2" strokeLinecap="round" />
          </g>
        </g>

        {/* fields */}
        <g className="bl-fields">
          <path d="M 20 190 C 60 172, 100 168, 146 176 C 168 180, 190 186, 222 196 L 222 242 L 20 242 Z" fill={`url(#${id('fa')})`} stroke="#fbfaf5" strokeWidth="3" />
          <path d="M 20 208 C 60 190, 104 186, 150 194 C 172 198, 196 204, 222 214 L 222 242 L 20 242 Z" fill={`url(#${id('fb')})`} stroke="#fbfaf5" strokeWidth="3" />
          <path d="M 20 226 C 64 206, 108 204, 154 212 C 176 216, 200 222, 222 230 L 222 242 L 20 242 Z" fill={`url(#${id('fc')})`} stroke="#fbfaf5" strokeWidth="3" />
        </g>
      </g>

      {/* leaf breaking out of the ring */}
      <g className="bl-leaf">
        <path d="M 154 216 C 158 178, 194 150, 238 150 C 238 196, 204 224, 154 216 Z" fill={`url(#${id('leaf')})`} stroke="#fbfaf5" strokeWidth="3" strokeLinejoin="round" />
        <path d="M 160 212 C 182 190, 206 172, 230 158" fill="none" stroke="#fbfaf5" strokeWidth="2.4" strokeLinecap="round" />
      </g>
    </svg>
  );
}

/* Wordmark: "Annadata" in forest green, "Connect" in harvest gold. */
export function BrandWordmark({ size = 22, className = '', stacked = false, light = false, first = 'Annadata', second = 'Connect' }) {
  return (
    <span
      className={`brand-wordmark${stacked ? ' stacked' : ''}${light ? ' light' : ''}${className ? ` ${className}` : ''}`}
      style={{ fontSize: size }}
    >
      <span className="bw-a">{first}</span>
      <span className="bw-c">{second}</span>
    </span>
  );
}

export default BrandLogo;
