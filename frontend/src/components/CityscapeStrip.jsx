import React from "react";

/**
 * NOYON TELECOM — CINEMATIC CITYSCAPE FOOTER
 * Full replacement for CityscapeStrip.jsx
 *
 * Desktop and mobile use separate compositions so the scene stays premium
 * instead of simply shrinking/cropping the desktop SVG.
 *
 * No external libraries required.
 */

const Stars = ({ mobile = false }) => {
  const desktop = [
    [54, 28, 1.1], [110, 44, 0.7], [182, 20, 1], [254, 39, 0.8],
    [340, 26, 1.1], [430, 48, 0.8], [522, 23, 0.7], [608, 41, 1],
    [704, 18, 1], [786, 44, 0.7], [875, 26, 1.1], [962, 39, 0.8],
    [1040, 20, 0.9], [1148, 43, 1], [1240, 28, 0.7], [1350, 46, 1],
  ];
  const mob = [
    [24, 18, 0.8], [62, 34, 0.6], [104, 15, 0.8], [145, 29, 0.6],
    [193, 18, 0.8], [236, 37, 0.6], [285, 17, 0.8], [332, 29, 0.6],
  ];
  return (mobile ? mob : desktop).map(([cx, cy, r], i) => (
    <circle key={i} cx={cx} cy={cy} r={r} className={`nt-star nt-star-${i % 4}`} />
  ));
};

function Moon({ x, y, scale = 1 }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <circle cx="0" cy="0" r="17" className="nt-moon" />
      <circle cx="8" cy="-5" r="15" className="nt-moon-cut" />
    </g>
  );
}

function Cloud({ x, y, scale = 1, className = "" }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`} className={`nt-cloud ${className}`}>
      <ellipse cx="42" cy="18" rx="42" ry="13" />
      <circle cx="19" cy="14" r="15" />
      <circle cx="39" cy="6" r="20" />
      <circle cx="61" cy="14" r="16" />
    </g>
  );
}

function BackgroundSkyline({ mobile = false }) {
  const bars = mobile
    ? [
        [0, 79, 19], [22, 69, 22], [47, 82, 16], [66, 60, 22],
        [91, 72, 20], [114, 53, 28], [145, 77, 20], [169, 63, 25],
        [198, 80, 18], [220, 55, 27], [250, 70, 22], [278, 59, 29],
        [310, 78, 18], [332, 62, 26], [361, 72, 19],
      ]
    : [
        [0, 104, 44], [50, 89, 35], [91, 101, 44], [141, 67, 48],
        [195, 94, 31], [232, 78, 44], [282, 110, 37], [326, 61, 56],
        [389, 87, 33], [430, 73, 50], [486, 101, 38], [530, 57, 49],
        [585, 91, 35], [626, 69, 57], [690, 104, 39], [735, 64, 48],
        [790, 88, 34], [831, 54, 56], [893, 98, 44], [943, 69, 50],
        [1000, 91, 36], [1043, 61, 58], [1108, 100, 39], [1153, 70, 52],
        [1211, 91, 38], [1256, 57, 47], [1310, 82, 40], [1357, 69, 43],
      ];

  return (
    <g className="nt-distant-city">
      {bars.map(([x, y, w], i) => (
        <g key={i}>
          <rect x={x} y={y} width={w} height={190 - y} rx="1" />
          {i % 2 === 0 && (
            <>
              <rect x={x + w * 0.18} y={y + 13} width="3" height="3" className="nt-far-window" />
              <rect x={x + w * 0.57} y={y + 23} width="3" height="3" className="nt-far-window dim" />
              <rect x={x + w * 0.33} y={y + 39} width="3" height="3" className="nt-far-window" />
            </>
          )}
        </g>
      ))}
    </g>
  );
}

function Tree({ x, base, scale = 1, delay = 0 }) {
  return (
    <g transform={`translate(${x} ${base}) scale(${scale})`} className="nt-tree">
      <rect x="-2.5" y="-38" width="5" height="38" rx="2" className="nt-trunk" />
      <circle cx="-14" cy="-41" r="17" className="nt-tree-dark" />
      <circle cx="13" cy="-43" r="18" className="nt-tree-dark" />
      <circle cx="0" cy="-57" r="22" className="nt-tree-main" style={{ animationDelay: `${delay}s` }} />
      <circle cx="-11" cy="-62" r="13" className="nt-tree-light" />
      <circle cx="12" cy="-58" r="11" className="nt-tree-light subtle" />
    </g>
  );
}

function Lamp({ x, base, scale = 1 }) {
  return (
    <g transform={`translate(${x} ${base}) scale(${scale})`} className="nt-lamp">
      <rect x="-1.5" y="-83" width="3" height="83" rx="2" className="nt-lamp-pole" />
      <rect x="-5" y="-84" width="10" height="2" rx="1" className="nt-lamp-cap" />
      <circle cx="0" cy="-88" r="20" className="nt-lamp-aura" />
      <circle cx="0" cy="-88" r="8" className="nt-lamp-glow" />
      <circle cx="0" cy="-88" r="3.5" className="nt-lamp-core" />
    </g>
  );
}

function Bench({ x, base, scale = 1 }) {
  return (
    <g transform={`translate(${x} ${base}) scale(${scale})`} className="nt-bench">
      <rect x="-22" y="-20" width="44" height="4" rx="2" />
      <rect x="-22" y="-27" width="44" height="4" rx="2" />
      <rect x="-18" y="-24" width="3" height="14" />
      <rect x="15" y="-24" width="3" height="14" />
    </g>
  );
}

function Windows({ x, y, w, h, cols, rows, seed = 0, bright = false }) {
  const nodes = [];
  const padX = Math.max(8, w * 0.12);
  const padY = Math.max(9, h * 0.12);
  const gapX = (w - padX * 2) / Math.max(cols - 1, 1);
  const gapY = (h - padY * 2) / Math.max(rows - 1, 1);
  const ww = Math.min(9, w / (cols * 3.2));
  const wh = Math.min(13, h / (rows * 2.8));

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const n = (r * 7 + c * 13 + seed) % 10;
      if (n === 0 || n === 1) continue;
      nodes.push(
        <rect
          key={`${r}-${c}`}
          x={x + padX + c * gapX - ww / 2}
          y={y + padY + r * gapY - wh / 2}
          width={ww}
          height={wh}
          rx="1.5"
          className={`nt-window ${bright ? "bright" : ""}`}
          opacity={n === 2 ? 0.45 : n === 3 ? 0.68 : 1}
        />
      );
    }
  }
  return <>{nodes}</>;
}

function House({ x, base, w = 100, h = 70 }) {
  const y = base - h;
  return (
    <g className="nt-house">
      <path d={`M${x - 9} ${y + 31} L${x + w / 2} ${y - 5} L${x + w + 9} ${y + 31} Z`} className="nt-house-roof" />
      <rect x={x} y={y + 29} width={w} height={h - 29} rx="3" className="nt-house-body" />
      <rect x={x + w * 0.17} y={y + 42} width={w * 0.18} height={w * 0.16} rx="1" className="nt-house-window" />
      <rect x={x + w * 0.66} y={y + 42} width={w * 0.18} height={w * 0.16} rx="1" className="nt-house-window" />
      <rect x={x + w * 0.43} y={base - h * 0.43} width={w * 0.18} height={h * 0.43} rx="2" className="nt-house-door" />
    </g>
  );
}

function Shop({ x, base, w, h, title }) {
  const y = base - h;
  return (
    <g className="nt-shop">
      <rect x={x - 3} y={y} width={w + 6} height="23" rx="3" className="nt-shop-sign" />
      <rect x={x} y={y + 20} width={w} height={h - 20} rx="2" className="nt-shop-building" />
      <rect x={x + 5} y={y + 27} width={w - 10} height={h - 33} rx="2" className="nt-shop-glass" />
      <rect x={x + 5} y={y + 27} width={(w - 10) / 2 - 1} height={h - 33} className="nt-shop-interior left" />
      <rect x={x + 6 + (w - 10) / 2} y={y + 27} width={(w - 10) / 2 - 1} height={h - 33} className="nt-shop-interior" />
      <line x1={x + w / 2} y1={y + 27} x2={x + w / 2} y2={base - 5} className="nt-shop-divider" />
      <rect x={x + 13} y={y + 44} width={w * 0.18} height={h * 0.34} className="nt-shelf" />
      <rect x={x + w * 0.69} y={y + 44} width={w * 0.16} height={h * 0.34} className="nt-shelf" />
      <text x={x + w / 2} y={y + 15} textAnchor="middle" className="nt-shop-title">{title}</text>
      <rect x={x + 8} y={base - 5} width={w - 16} height="3" rx="1.5" className="nt-shop-step" />
    </g>
  );
}

function Showroom({ x, base, scale = 1 }) {
  const w = 250 * scale;
  const h = 132 * scale;
  const y = base - h;
  const sx = (v) => x + v * scale;
  const sy = (v) => y + v * scale;

  return (
    <g className="nt-showroom">
      <ellipse cx={x + w / 2} cy={base + 5} rx={w * 0.56} ry="12" className="nt-showroom-reflection" />
      <rect x={x} y={y + 16 * scale} width={w} height={116 * scale} rx={5 * scale} className="nt-showroom-body" />
      <rect x={x - 7 * scale} y={y} width={w + 14 * scale} height={35 * scale} rx={6 * scale} className="nt-showroom-sign" />
      <rect x={x + 10 * scale} y={y + 42 * scale} width={w - 20 * scale} height={78 * scale} rx={2 * scale} className="nt-showroom-glass" />

      <rect x={sx(25)} y={sy(53)} width={55 * scale} height={56 * scale} className="nt-showroom-inside" />
      <rect x={sx(85)} y={sy(53)} width={80 * scale} height={56 * scale} className="nt-showroom-inside warm" />
      <rect x={sx(170)} y={sy(53)} width={55 * scale} height={56 * scale} className="nt-showroom-inside" />

      <rect x={sx(34)} y={sy(62)} width={35 * scale} height={22 * scale} rx={2} className="nt-display-screen pink" />
      <rect x={sx(97)} y={sy(60)} width={23 * scale} height={39 * scale} rx={2} className="nt-phone-display" />
      <rect x={sx(127)} y={sy(60)} width={23 * scale} height={39 * scale} rx={2} className="nt-phone-display second" />
      <rect x={sx(182)} y={sy(63)} width={31 * scale} height={35 * scale} rx={2} className="nt-display-screen" />

      <path d={`M${sx(21)} ${sy(44)}H${sx(229)}`} className="nt-ceiling-light" />
      <path d={`M${sx(45)} ${sy(49)}V${sy(112)}M${sx(84)} ${sy(49)}V${sy(112)}M${sx(166)} ${sy(49)}V${sy(112)}M${sx(205)} ${sy(49)}V${sy(112)}`} className="nt-glass-frame" />

      <g className="nt-person person-a">
        <circle cx={sx(74)} cy={sy(82)} r={4 * scale} />
        <path d={`M${sx(74)} ${sy(86)}V${sy(108)}`} />
      </g>
      <g className="nt-person person-b">
        <circle cx={sx(190)} cy={sy(82)} r={4 * scale} />
        <path d={`M${sx(190)} ${sy(86)}V${sy(108)}`} />
      </g>

      <g transform={`translate(${sx(27)} ${sy(8)}) scale(${scale})`}>
        <path d="M0 15V5C0 1 3 0 6 0H17C20 0 23 3 23 6V17H17V8H6V17H0Z" className="nt-logo-mark" />
      </g>
      <text x={sx(58)} y={sy(22)} className="nt-showroom-title">Noyon Telecom</text>
      <rect x={sx(16)} y={sy(31)} width={218 * scale} height={2 * scale} className="nt-sign-line" />
      <rect x={sx(16)} y={base - 4} width={218 * scale} height={4 * scale} rx={2} className="nt-showroom-step" />
    </g>
  );
}

function Road({ width, base }) {
  return (
    <g>
      <rect x="0" y={base - 4} width={width} height="4" className="nt-sidewalk" />
      <rect x="0" y={base} width={width} height="52" className="nt-road" />
      <line x1="0" y1={base + 27} x2={width} y2={base + 27} className="nt-road-line" />
      <line x1="0" y1={base + 3} x2={width} y2={base + 3} className="nt-road-edge" />
      <ellipse cx={width * 0.49} cy={base + 35} rx={width * 0.16} ry="6" className="nt-road-shine" />
      <ellipse cx={width * 0.71} cy={base + 35} rx={width * 0.09} ry="4" className="nt-road-red-shine" />
    </g>
  );
}

function Car() {
  return (
    <div className="nt-car-track" aria-hidden="true">
      <div className="nt-car">
        <div className="nt-car-light-beam" />
        <svg viewBox="0 0 160 75">
          <path d="M12 49Q10 34 27 31L43 13Q49 7 62 7H103Q117 7 126 30Q145 32 149 46Q151 56 139 57H21Q13 57 12 49Z" className="nt-car-body" />
          <path d="M47 30L60 13H101Q111 13 119 30Z" className="nt-car-glass" />
          <path d="M80 14V30" className="nt-car-glass-line" />
          <path d="M23 42H143" className="nt-car-detail" />
          <circle cx="43" cy="57" r="12" className="nt-car-tire" />
          <circle cx="122" cy="57" r="12" className="nt-car-tire" />
          <circle cx="43" cy="57" r="5" className="nt-car-rim" />
          <circle cx="122" cy="57" r="5" className="nt-car-rim" />
          <rect x="139" y="37" width="7" height="5" rx="2" className="nt-car-headlight" />
          <rect x="15" y="38" width="5" height="5" rx="2" className="nt-car-tail" />
        </svg>
      </div>
    </div>
  );
}

function Cyclist() {
  return (
    <div className="nt-cycle-track" aria-hidden="true">
      <div className="nt-cyclist">
        <svg viewBox="0 0 220 180">
          <g className="nt-wheel-spin">
            <circle cx="47" cy="139" r="35" className="nt-bike-wheel" />
            <path d="M47 104V174M12 139H82M22 114L72 164M72 114L22 164" className="nt-bike-spokes" />
          </g>
          <g className="nt-wheel-spin">
            <circle cx="162" cy="139" r="35" className="nt-bike-wheel" />
            <path d="M162 104V174M127 139H197M137 114L187 164M187 114L137 164" className="nt-bike-spokes" />
          </g>
          <path d="M47 139L105 146L84 82L47 139M84 82L157 88L105 146M157 88L162 139M157 88L162 74M75 78H98" className="nt-bike-frame" />
          <circle cx="105" cy="146" r="9" className="nt-bike-gear" />
          <g className="nt-crank"><path d="M105 146L118 157" className="nt-bike-frame" /></g>

          <circle cx="113" cy="19" r="15" className="nt-rider-head" />
          <path d="M86 80L107 38" className="nt-rider-body" />
          <path d="M107 40L151 82" className="nt-rider-arm" />
          <g className="nt-rider-leg-group">
            <path d="M86 80L122 112L117 157" className="nt-rider-leg" />
          </g>
        </svg>
      </div>
    </div>
  );
}

function DesktopScene() {
  const base = 175;
  return (
    <svg viewBox="0 0 1400 230" preserveAspectRatio="none" className="nt-scene nt-desktop-scene">
      <defs>
        <linearGradient id="nt-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0a0b1b" />
          <stop offset=".38" stopColor="#2a1830" />
          <stop offset=".68" stopColor="#b15d50" />
          <stop offset=".82" stopColor="#f08b57" />
          <stop offset="1" stopColor="#171726" />
        </linearGradient>
        <radialGradient id="nt-sunset" cx=".48" cy=".64" r=".72">
          <stop offset="0" stopColor="#ffb061" stopOpacity=".76" />
          <stop offset=".42" stopColor="#bd5870" stopOpacity=".28" />
          <stop offset="1" stopColor="#160d20" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="nt-road-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#161a26" />
          <stop offset="1" stopColor="#080b12" />
        </linearGradient>
        <linearGradient id="nt-shop-glass-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffd780" />
          <stop offset=".35" stopColor="#f8a84f" />
          <stop offset="1" stopColor="#3a1b22" />
        </linearGradient>
        <linearGradient id="nt-showroom-glass-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff0b4" />
          <stop offset=".32" stopColor="#ffc96d" />
          <stop offset="1" stopColor="#272031" />
        </linearGradient>
        <filter id="nt-glow"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        <filter id="nt-soft"><feGaussianBlur stdDeviation="12"/></filter>
        <filter id="nt-red-glow"><feGaussianBlur stdDeviation="5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs>

      <rect width="1400" height="230" fill="url(#nt-sky)" />
      <rect width="1400" height="230" fill="url(#nt-sunset)" />
      <Cloud x={90} y={37} scale={1.1} className="cloud-one" />
      <Cloud x={390} y={58} scale={.85} className="cloud-two" />
      <Cloud x={990} y={39} scale={1.15} className="cloud-three" />
      <Cloud x={1210} y={76} scale={.72} className="cloud-four" />
      <Stars />
      <Moon x={1285} y={41} />
      <BackgroundSkyline />

      <path d="M0 145Q170 111 330 142T650 136T960 144T1240 126T1400 139V178H0Z" className="nt-hill-layer" />
      <rect x="0" y="143" width="1400" height="38" className="nt-tree-line" />

      <House x={18} base={base} w={108} h={67} />
      <Tree x={142} base={base} scale={.9} delay={.2} />
      <Bench x={186} base={base} />
      <Shop x={220} base={base} w={154} h={91} title="EXPRESS SHOP" />
      <Lamp x={205} base={base} scale={.9} />
      <Tree x={396} base={base} scale={1.02} delay={.5} />
      <Bench x={431} base={base} />
      <Showroom x={480} base={base} scale={1} />
      <Tree x={770} base={base} scale={.92} delay={.1} />
      <Shop x={868} base={base} w={143} h={85} title="PARTS HOUSE" />
      <Lamp x={842} base={base} scale={.92} />
      <Tree x={1032} base={base} scale={.92} delay={.6} />
      <Lamp x={1130} base={base} scale={.95} />
      <House x={1178} base={base} w={104} h={70} />
      <Bench x={1320} base={base} />
      <Tree x={1360} base={base} scale={1.02} delay={.3} />

      <Road width={1400} base={base} />
    </svg>
  );
}

function MobileScene() {
  const base = 158;
  return (
    <svg viewBox="0 0 390 210" preserveAspectRatio="xMidYMid slice" className="nt-scene nt-mobile-scene">
      <defs>
        <linearGradient id="nt-msky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#090b19" />
          <stop offset=".36" stopColor="#332039" />
          <stop offset=".7" stopColor="#d56b59" />
          <stop offset="1" stopColor="#171624" />
        </linearGradient>
        <radialGradient id="nt-msun" cx=".48" cy=".62" r=".7">
          <stop offset="0" stopColor="#ffbd6f" stopOpacity=".72" />
          <stop offset="1" stopColor="#351b2b" stopOpacity="0" />
        </radialGradient>
        <filter id="nt-mglow"><feGaussianBlur stdDeviation="2.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs>

      <rect width="390" height="210" fill="url(#nt-msky)" />
      <rect width="390" height="210" fill="url(#nt-msun)" />
      <Cloud x={15} y={34} scale={.7} />
      <Cloud x={245} y={49} scale={.68} />
      <Stars mobile />
      <Moon x={344} y={38} scale={.7} />
      <BackgroundSkyline mobile />

      <rect x="0" y="123" width="390" height="38" className="nt-tree-line" />
      <House x={-18} base={base} w={64} h={47} />
      <Tree x={48} base={base} scale={.58} />
      <Shop x={61} base={base} w={70} h={57} title="EXPRESS" />
      <Lamp x={53} base={base} scale={.55} />
      <Showroom x={141} base={base} scale={.78} />
      <Shop x={337} base={base} w={55} h={52} title="PARTS" />
      <Tree x={327} base={base} scale={.56} />
      <Road width={390} base={base} />
    </svg>
  );
}

export default function CityscapeStrip() {
  return (
    <section className="noyon-cityscape" aria-label="Noyon Telecom cityscape">
      <style>{`
        .noyon-cityscape{
          --red:#f01b3f;
          --red2:#ff536b;
          --gold:#ffc447;
          --cream:#ffe5a3;
          position:relative;
          width:100%;
          height:clamp(205px,18vw,290px);
          overflow:hidden;
          isolation:isolate;
          background:#0b0d15;
          border-top:1px solid rgba(255,255,255,.06);
          border-bottom:1px solid rgba(255,255,255,.06);
        }

        .nt-scene{position:absolute;inset:0;width:100%;height:100%;display:block}
        .nt-mobile-scene{display:none}

        /* SKY */
        .nt-cloud{fill:#1a1729;opacity:.55}
        .nt-cloud-one{animation:ntCloudOne 25s ease-in-out infinite alternate}
        .nt-cloud-two{animation:ntCloudTwo 32s ease-in-out infinite alternate}
        .nt-cloud-three{animation:ntCloudOne 28s ease-in-out infinite alternate-reverse}
        .nt-cloud-four{animation:ntCloudTwo 22s ease-in-out infinite alternate}
        .nt-star{fill:#fff4d4;opacity:.8;animation:ntTwinkle 4s ease-in-out infinite}
        .nt-star-1{animation-delay:.8s}.nt-star-2{animation-delay:1.6s}.nt-star-3{animation-delay:2.5s}
        .nt-moon{fill:#fff1bd;filter:drop-shadow(0 0 7px rgba(255,220,125,.5))}
        .nt-moon-cut{fill:#151323}

        .nt-distant-city{fill:#151728;opacity:.88}
        .nt-far-window{fill:#f6b24d;opacity:.48}
        .nt-far-window.dim{opacity:.2}
        .nt-hill-layer{fill:#111722;opacity:.78}
        .nt-tree-line{fill:#0b1518}

        /* ENVIRONMENT */
        .nt-trunk{fill:#35251e}
        .nt-tree-dark{fill:#102a26}
        .nt-tree-main{fill:#173c33;filter:drop-shadow(0 0 6px rgba(55,119,91,.12));animation:ntTree 4.8s ease-in-out infinite}
        .nt-tree-light{fill:#255443;opacity:.75}
        .nt-tree-light.subtle{opacity:.45}
        .nt-bench rect{fill:#3b2a25;opacity:.85}

        .nt-lamp-pole{fill:#262b34}
        .nt-lamp-cap{fill:#424852}
        .nt-lamp-aura{fill:#ffb83c;opacity:.12;filter:url(#nt-soft)}
        .nt-lamp-glow{fill:#ffc34e;opacity:.72;filter:url(#nt-glow);animation:ntLamp 3.2s ease-in-out infinite}
        .nt-lamp-core{fill:#fff0ad}

        /* HOUSES */
        .nt-house-roof{fill:#251421;stroke:rgba(255,255,255,.08);stroke-width:1}
        .nt-house-body{fill:#1a1822;stroke:#312c37;stroke-width:1}
        .nt-house-window{fill:#ffbd43;filter:url(#nt-glow)}
        .nt-house-door{fill:#100f16}

        /* SHOPS */
        .nt-shop-sign{fill:#b80f30;stroke:#ff6075;stroke-opacity:.4;filter:url(#nt-red-glow)}
        .nt-shop-building{fill:#27131d}
        .nt-shop-glass{fill:url(#nt-shop-glass-grad);stroke:#ffe2a1;stroke-opacity:.38}
        .nt-shop-interior{fill:#f6a73f;opacity:.16}
        .nt-shop-interior.left{fill:#ffe3a2;opacity:.22}
        .nt-shop-divider{stroke:#4c2926;stroke-width:2}
        .nt-shelf{fill:#7b4329;opacity:.58}
        .nt-shop-title{fill:#fff5de;font:700 10px/1 system-ui,-apple-system,sans-serif;letter-spacing:.8px}
        .nt-shop-step{fill:#2b2528}

        /* SHOWROOM */
        .nt-showroom-body{fill:#161720;stroke:#4a4140;stroke-width:1}
        .nt-showroom-sign{fill:#11131a;stroke:#f3b63e;stroke-opacity:.65;filter:drop-shadow(0 0 10px rgba(255,181,49,.12))}
        .nt-showroom-glass{fill:url(#nt-showroom-glass-grad);stroke:#ffe9af;stroke-opacity:.72}
        .nt-showroom-inside{fill:#d58d4a;opacity:.3}
        .nt-showroom-inside.warm{fill:#ffe3a3;opacity:.28}
        .nt-display-screen{fill:#4ea2e9;filter:drop-shadow(0 0 3px rgba(65,163,255,.35))}
        .nt-display-screen.pink{fill:#ff6b9b}
        .nt-phone-display{fill:#d8f0ff;stroke:#79a7d1;stroke-width:1}
        .nt-phone-display.second{fill:#f3e0ff;stroke:#b785ce}
        .nt-ceiling-light{stroke:#fff0ae;stroke-width:3;filter:url(#nt-glow)}
        .nt-glass-frame{stroke:#5c5147;stroke-width:1.5}
        .nt-person circle{fill:#2b2220}
        .nt-person path{stroke:#2b2220;stroke-width:4;stroke-linecap:round}
        .nt-logo-mark{fill:#ffd262;filter:drop-shadow(0 0 4px rgba(255,205,98,.55))}
        .nt-showroom-title{fill:#f7f7f8;font:600 17px/1 system-ui,-apple-system,sans-serif;letter-spacing:.15px}
        .nt-sign-line{fill:#ffc447;opacity:.65}
        .nt-showroom-step{fill:#393238}
        .nt-showroom-reflection{fill:#ffbb4e;opacity:.14;filter:url(#nt-soft)}

        /* ROAD */
        .nt-sidewalk{fill:#262a30}
        .nt-road{fill:url(#nt-road-grad)}
        .nt-road-line{stroke:#b77e34;stroke-width:2;stroke-dasharray:20 15;opacity:.8}
        .nt-road-edge{stroke:#424750;stroke-width:1}
        .nt-road-shine{fill:#ffbd68;opacity:.16;filter:url(#nt-soft)}
        .nt-road-red-shine{fill:#ef2343;opacity:.18;filter:url(#nt-soft)}

        /* CAR */
        .nt-car-track{position:absolute;inset:0;pointer-events:none;overflow:hidden}
        .nt-car{
          position:absolute;
          width:clamp(72px,8vw,108px);
          left:-150px;
          top:62%;
          z-index:4;
          animation:ntDrive 17s linear infinite;
          filter:drop-shadow(0 7px 5px rgba(0,0,0,.55));
        }
        .nt-car svg{width:100%;height:auto;display:block}
        .nt-car-body{fill:#c91632;stroke:#ff5870;stroke-width:1.5}
        .nt-car-glass{fill:#151e2a;stroke:#7790a1;stroke-width:1}
        .nt-car-glass-line{stroke:#66798a;stroke-width:1}
        .nt-car-detail{stroke:#ff5d72;stroke-width:1;opacity:.5}
        .nt-car-tire{fill:#07090d;stroke:#3f4750;stroke-width:2}
        .nt-car-rim{fill:#b7bec5}
        .nt-car-headlight{fill:#ffe09a;filter:drop-shadow(0 0 4px #ffca68)}
        .nt-car-tail{fill:#ff304c}
        .nt-car-light-beam{
          position:absolute;right:-16%;top:51%;
          width:34%;height:13%;
          background:linear-gradient(90deg,rgba(255,230,160,.28),transparent);
          filter:blur(5px);transform:skewY(-4deg)
        }

        /* CYCLIST */
        .nt-cycle-track{position:absolute;inset:0;pointer-events:none;overflow:hidden}
        .nt-cyclist{
          position:absolute;
          width:clamp(46px,5vw,68px);
          left:-100px;
          top:51%;
          z-index:5;
          animation:ntRide 22s linear infinite;
          filter:drop-shadow(0 6px 4px rgba(0,0,0,.55));
        }
        .nt-cyclist svg{width:100%;height:auto;display:block}
        .nt-bike-wheel{fill:none;stroke:#f4b631;stroke-width:4}
        .nt-bike-spokes{stroke:#cf891b;stroke-width:2.5}
        .nt-bike-frame{fill:none;stroke:#f4b631;stroke-width:5;stroke-linecap:round;stroke-linejoin:round}
        .nt-bike-gear{fill:#f4b631}
        .nt-rider-head{fill:#f4b631}
        .nt-rider-body,.nt-rider-arm,.nt-rider-leg{fill:none;stroke:#f4b631;stroke-linecap:round}
        .nt-rider-body{stroke-width:13}.nt-rider-arm{stroke-width:10}.nt-rider-leg{stroke-width:11}
        .nt-wheel-spin{transform-box:fill-box;transform-origin:center;animation:ntWheel .8s linear infinite}
        .nt-crank{transform-box:fill-box;transform-origin:center;animation:ntWheel .8s linear infinite}
        .nt-rider-leg-group{transform-box:fill-box;transform-origin:86px 80px;animation:ntPedal .8s ease-in-out infinite}

        @keyframes ntDrive{
          0%{transform:translateX(0)}
          100%{transform:translateX(calc(100vw + 180px))}
        }
        @keyframes ntRide{
          0%{transform:translateX(0)}
          100%{transform:translateX(calc(100vw + 140px))}
        }
        @keyframes ntWheel{to{transform:rotate(360deg)}}
        @keyframes ntPedal{0%,100%{transform:rotate(18deg)}50%{transform:rotate(-24deg)}}
        @keyframes ntTwinkle{0%,100%{opacity:.3}50%{opacity:1}}
        @keyframes ntTree{0%,100%{transform:translateX(0) rotate(0)}50%{transform:translateX(1px) rotate(.5deg)}}
        @keyframes ntLamp{0%,100%{opacity:.62}50%{opacity:1}}
        @keyframes ntCloudOne{to{transform:translateX(25px)}}
        @keyframes ntCloudTwo{to{transform:translateX(-20px)}}

        /* MOBILE: different composition, not a squeezed desktop */
        @media (max-width:640px){
          .noyon-cityscape{height:225px}
          .nt-desktop-scene{display:none}
          .nt-mobile-scene{display:block}
          .nt-car{width:74px;top:68%;animation-duration:13s}
          .nt-cyclist{width:45px;top:57%;animation-duration:17s}
        }

        @media (min-width:641px) and (max-width:900px){
          .noyon-cityscape{height:240px}
          .nt-car{top:64%}
          .nt-cyclist{top:53%}
        }

        @media (prefers-reduced-motion:reduce){
          .noyon-cityscape *{animation:none!important}
        }
      `}</style>

      <DesktopScene />
      <MobileScene />
      <Cyclist />
      <Car />
    </section>
  );
}
