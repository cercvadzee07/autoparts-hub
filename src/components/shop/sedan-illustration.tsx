/**
 * Stylized mid-size sedan profile used in the hero until a real photo is set
 * in `brand.heroImage`.
 */
export function SedanIllustration({ className }: { className?: string }) {
  const wheel = (cx: number) => (
    <g>
      <circle cx={cx} cy="322" r="68" fill="#0b0b0d" stroke="#2f2f36" strokeWidth="3" />
      <circle cx={cx} cy="322" r="46" fill="#141418" stroke="#55555f" strokeWidth="2" />
      {Array.from({ length: 10 }, (_, i) => {
        const a = (i * Math.PI) / 5;
        return (
          <line
            key={i}
            x1={cx + Math.cos(a) * 12}
            y1={322 + Math.sin(a) * 12}
            x2={cx + Math.cos(a) * 43}
            y2={322 + Math.sin(a) * 43}
            stroke="#6b6b75"
            strokeWidth="5"
            strokeLinecap="round"
          />
        );
      })}
      <circle cx={cx} cy="322" r="11" fill="#2a2a31" stroke="#8a8a94" strokeWidth="2" />
      <circle cx={cx + 22} cy="300" r="13" fill="var(--brand)" opacity=".85" />
    </g>
  );

  return (
    <svg viewBox="0 0 1200 420" className={className} role="img" aria-label="Toyota Camry">
      <defs>
        <linearGradient id="body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3a3a42" />
          <stop offset=".45" stopColor="#1d1d22" />
          <stop offset="1" stopColor="#0e0e11" />
        </linearGradient>
        <linearGradient id="glass" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2b3442" />
          <stop offset="1" stopColor="#0d1015" />
        </linearGradient>
        <linearGradient id="shine" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset=".5" stopColor="#fff" stopOpacity=".5" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <radialGradient id="shadow" cx=".5" cy=".5" r=".5">
          <stop offset="0" stopColor="#000" stopOpacity=".9" />
          <stop offset="1" stopColor="#000" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="glow" cx=".5" cy=".5" r=".5">
          <stop offset="0" stopColor="var(--brand)" stopOpacity=".55" />
          <stop offset="1" stopColor="var(--brand)" stopOpacity="0" />
        </radialGradient>
      </defs>

      <ellipse cx="600" cy="392" rx="560" ry="26" fill="url(#shadow)" />
      <ellipse cx="600" cy="380" rx="420" ry="40" fill="url(#glow)" />

      <path
        d="M70 320 C45 312 38 292 44 270 C50 252 70 242 120 234 L330 212 C380 206 410 203 440 196 C490 168 530 140 575 124 C640 104 720 102 790 110 C850 118 900 150 950 182 C1010 188 1060 192 1110 200 C1140 206 1158 222 1160 250 L1162 290 C1160 308 1150 318 1130 322 L1010 322 A80 80 0 0 0 850 322 L330 322 A80 80 0 0 0 170 322 Z"
        fill="url(#body)"
        stroke="#4a4a54"
        strokeWidth="1.5"
      />
      {/* Greenhouse */}
      <path
        d="M470 198 C515 168 550 146 590 133 C645 117 720 115 782 122 C832 128 870 152 906 182 C820 186 640 192 470 198 Z"
        fill="url(#glass)"
        stroke="#3d4654"
        strokeWidth="1.5"
      />
      <path d="M700 118 L690 194" stroke="#1a1a1f" strokeWidth="9" />
      {/* Character lines */}
      <path d="M140 258 C420 244 820 234 1150 228" fill="none" stroke="#5a5a64" strokeWidth="1.5" opacity=".8" />
      <path d="M200 292 C500 286 800 284 1100 286" fill="none" stroke="#000" strokeWidth="2" opacity=".5" />
      <path d="M560 130 C640 110 740 108 800 116" fill="none" stroke="url(#shine)" strokeWidth="2" />
      {/* Door seams & handles */}
      <path d="M470 200 L478 318 M700 196 L702 318" stroke="#0a0a0c" strokeWidth="2" opacity=".7" />
      <rect x="590" y="232" width="34" height="5" rx="2.5" fill="#6a6a74" />
      <rect x="812" y="228" width="34" height="5" rx="2.5" fill="#6a6a74" />
      {/* Mirror */}
      <path d="M470 196 l-26 -6 c-8 -2 -12 6 -6 12 l26 8 z" fill="#1d1d22" stroke="#4a4a54" />
      {/* Lights */}
      <path d="M58 258 C80 248 120 242 160 240 L150 252 C110 256 80 262 60 268 Z" fill="#e8eef7" opacity=".9" />
      <path d="M60 268 C90 262 120 258 150 254" stroke="#fff" strokeWidth="2" opacity=".9" />
      <path d="M1112 206 C1135 210 1152 220 1157 236 L1110 232 Z" fill="var(--brand)" />
      <path d="M1100 232 L1158 238" stroke="#ff3b52" strokeWidth="2" opacity=".8" />
      {/* Grille hint */}
      <path d="M46 290 C70 296 110 300 150 300" stroke="#000" strokeWidth="6" opacity=".6" strokeLinecap="round" />

      {wheel(250)}
      {wheel(930)}
    </svg>
  );
}
