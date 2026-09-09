import React from "react";

/**
 * NOYON TELECOM — CINEMATIC PREMIUM FOOTER CITY
 * ------------------------------------------------
 * Full replacement for CityscapeStrip.jsx
 *
 * Desktop and mobile use separate compositions automatically:
 * - Desktop: wide cinematic city scene
 * - Mobile: compact centered scene, no tiny unreadable objects
 *
 * No external libraries required.
 */

const Glow = ({ id = "g", color = "#ffbf55", std = 4 }) => (
  <filter id={id} x="-120%" y="-120%" width="340%" height="340%">
    <feGaussianBlur stdDeviation={std} result="blur" />
    <feMerge>
      <feMergeNode in="blur" />
      <feMergeNode in="SourceGraphic" />
    </feMerge>
  </filter>
);

function WindowGrid({ x, y, w, h, cols = 3, rows = 4, size = 11 }) {
  const items = [];
  const gapX = (w - size * cols) / (cols + 1);
  const gapY = (h - size * rows) / (rows + 1);

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      if ((row * 7 + col * 3) % 8 === 0) continue;
      items.push(
        <rect
          key={`${row}-${col}`}
          x={x + gapX + col * (size + gapX)}
          y={y + gapY + row * (size + gapY)}
          width={size}
          height={size * 0.8}
          rx="1.5"
          fill="#ffbd4c"
          opacity={0.55 + (((row + col) % 3) * 0.18)}
          filter="url(#windowGlow)"
        />
      );
    }
  }
  return items;
}

function Skyline({ mobile = false }) {
  const bars = mobile
    ? [[0,112,42],[42,94,34],[76,126,30],[106,82,44],[150,106,34],[184,66,48],[232,114,32],[264,86,44],[308,122,35],[343,96,47]]
    : [[0,140,70],[68,108,45],[112,82,62],[174,118,48],[225,62,68],[292,94,52],[348,45,70],[420,102,50],[478,76,68],[550,118,48],[610,50,72],[686,88,56],[748,38,75],[826,105,58],[890,70,62],[954,98,52],[1010,42,74],[1090,86,62],[1154,62,76],[1238,104,50],[1290,48,74],[1370,90,66],[1440,60,72],[1510,112,90]]
    ;
  const width = mobile ? 390 : 1600;
  const ground = mobile ? 260 : 292;

  return (
    <g opacity=".88">
      {bars.map(([x, top, w], i) => (
        <g key={i}>
          <rect x={x} y={top} width={w} height={ground - top} fill={i % 3 === 0 ? "#15192b" : "#111626"} />
          <WindowGrid
            x={x + 5}
            y={top + 7}
            w={Math.max(20, w - 10)}
            h={Math.max(20, ground - top - 10)}
            cols={Math.max(2, Math.floor(w / 20))}
            rows={Math.max(2, Math.floor((ground - top) / 22))}
            size={mobile ? 3.5 : 5}
          />
        </g>
      ))}
      <rect x="0" y={ground - 7} width={width} height="7" fill="#11151d" />
    </g>
  );
}

function Tree({ x, base, scale = 1 }) {
  return (
    <g transform={`translate(${x} ${base}) scale(${scale})`}>
      <rect x="-4" y="-52" width="8" height="52" rx="3" fill="#34271f" />
      <circle cx="-16" cy="-49" r="21" fill="#102c25" />
      <circle cx="13" cy="-51" r="23" fill="#15352c" />
      <circle cx="-2" cy="-72" r="25" fill="#1b4336" />
      <circle cx="-11" cy="-81" r="10" fill="#2c604a" opacity=".55" />
    </g>
  );
}

function Lamp({ x, base, scale = 1 }) {
  return (
    <g transform={`translate(${x} ${base}) scale(${scale})`}>
      <circle cx="0" cy="-96" r="28" fill="#ffb942" opacity=".13" filter="url(#softGlow)" />
      <circle cx="0" cy="-96" r="13" fill="#ffb942" opacity=".22" filter="url(#lampGlow)" />
      <circle cx="0" cy="-96" r="5" fill="#ffe2a1" filter="url(#lampGlow)" />
      <rect x="-2.5" y="-92" width="5" height="92" rx="2" fill="#34343c" />
      <rect x="-11" y="-101" width="22" height="3" rx="1.5" fill="#4a4648" />
    </g>
  );
}

function House({ x, base, scale = 1 }) {
  return (
    <g transform={`translate(${x} ${base}) scale(${scale})`}>
      <path d="M0 -66 L43 -103 L86 -66 Z" fill="#311321" stroke="#632238" />
      <rect x="7" y="-66" width="72" height="66" rx="3" fill="#22141b" />
      <rect x="20" y="-48" width="17" height="18" rx="2" fill="#ffc047" filter="url(#windowGlow)" />
      <rect x="49" y="-48" width="17" height="18" rx="2" fill="#ffc047" filter="url(#windowGlow)" />
      <rect x="34" y="-28" width="18" height="28" rx="2" fill="#160f15" />
    </g>
  );
}

function Shop({ x, base, title = "SHOP", scale = 1 }) {
  return (
    <g transform={`translate(${x} ${base}) scale(${scale})`}>
      <rect x="0" y="-112" width="148" height="112" rx="6" fill="#261821" stroke="#8b263c" strokeWidth="1.5" />
      <rect x="-7" y="-120" width="162" height="20" rx="4" fill="#ee1638" filter="url(#redGlow)" />
      <rect x="6" y="-115" width="136" height="10" rx="2" fill="#ff5a6e" opacity=".45" />
      <text x="74" y="-106" textAnchor="middle" fill="#fff4f5" fontSize="11" fontWeight="800" letterSpacing="1.5">
        {title}
      </text>
      <rect x="15" y="-88" width="50" height="72" rx="3" fill="#f9bf75" opacity=".9" filter="url(#windowGlow)" />
      <rect x="83" y="-88" width="50" height="72" rx="3" fill="#f9bf75" opacity=".9" filter="url(#windowGlow)" />
      <rect x="20" y="-83" width="40" height="61" fill="#ffe2a8" opacity=".65" />
      <rect x="88" y="-83" width="40" height="61" fill="#ffe2a8" opacity=".65" />
      <path d="M74 -96 V0" stroke="#3c2428" strokeWidth="3" />
      <rect x="0" y="-5" width="148" height="5" fill="#3b1b24" />
    </g>
  );
}

function MainStore({ x, base, scale = 1 }) {
  return (
    <g transform={`translate(${x} ${base}) scale(${scale})`}>
      <rect x="0" y="-178" width="230" height="178" rx="10" fill="#171a22" stroke="#d5a948" strokeWidth="1.5" />
      <rect x="7" y="-171" width="216" height="11" rx="5" fill="#f0b63d" opacity=".85" filter="url(#goldGlow)" />
      <rect x="28" y="-205" width="174" height="35" rx="10" fill="#151820" stroke="#e8c164" strokeWidth="1.5" />
      <text x="115" y="-183" textAnchor="middle" fill="#f6e1a1" fontSize="18" fontWeight="800" letterSpacing=".8">
        Noyon Telecom
      </text>
      <path d="M48 -192 q0 -13 13 -13 h10 v21 h-7 v-11 h-5 v11 h-7z" fill="#f2cf74" />
      <rect x="22" y="-151" width="186" height="135" rx="3" fill="#d99a54" opacity=".25" />
      <rect x="29" y="-145" width="80" height="112" fill="#ffe1a6" opacity=".9" filter="url(#windowGlow)" />
      <rect x="121" y="-145" width="80" height="112" fill="#ffe1a6" opacity=".9" filter="url(#windowGlow)" />
      <rect x="35" y="-138" width="68" height="96" fill="#fff0c7" opacity=".65" />
      <rect x="127" y="-138" width="68" height="96" fill="#fff0c7" opacity=".65" />
      <rect x="108" y="-145" width="13" height="129" fill="#2a2223" />
      <rect x="84" y="-34" width="60" height="18" rx="2" fill="#1e1c22" />
      <rect x="43" y="-88" width="24" height="34" rx="2" fill="#ec4160" opacity=".7" />
      <rect x="72" y="-98" width="24" height="44" rx="2" fill="#7168e8" opacity=".55" />
      <rect x="141" y="-91" width="24" height="37" rx="2" fill="#d22b52" opacity=".65" />
      <rect x="170" y="-102" width="20" height="48" rx="2" fill="#f5aa3d" opacity=".65" />
      <rect x="0" y="-5" width="230" height="5" fill="#4b3a2c" />
    </g>
  );
}

function Car({ x, y, scale = 1 }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`} className="car-anim">
      <ellipse cx="64" cy="38" rx="60" ry="8" fill="#000" opacity=".45" />
      <path d="M8 29 Q8 18 23 16 L39 4 Q45 0 61 0 H91 Q102 1 111 17 Q124 18 127 29 Q127 36 117 36 H18 Q8 36 8 29Z" fill="#c91434" stroke="#ff5d73" strokeWidth="1.5" />
      <path d="M40 15 L49 5 H87 Q96 5 102 15Z" fill="#1d2630" stroke="#6d7780" />
      <circle cx="36" cy="36" r="10" fill="#090a0d" stroke="#575b61" strokeWidth="2" />
      <circle cx="102" cy="36" r="10" fill="#090a0d" stroke="#575b61" strokeWidth="2" />
      <circle cx="36" cy="36" r="4" fill="#bbb" />
      <circle cx="102" cy="36" r="4" fill="#bbb" />
      <rect x="116" y="22" width="7" height="5" rx="2" fill="#ffe1a1" filter="url(#lampGlow)" />
    </g>
  );
}

function Bicycle({ x, y, scale = 1 }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`} className="bike-anim">
      <ellipse cx="48" cy="46" rx="45" ry="7" fill="#000" opacity=".38" />
      <g className="wheel wheel-a">
        <circle cx="17" cy="25" r="16" fill="none" stroke="#ffc43d" strokeWidth="3" />
        <path d="M17 9V41 M2 25H32 M6 14L28 36 M28 14L6 36" stroke="#d7901a" strokeWidth="1.5" />
      </g>
      <g className="wheel wheel-b">
        <circle cx="73" cy="25" r="16" fill="none" stroke="#ffc43d" strokeWidth="3" />
        <path d="M73 9V41 M58 25H88 M62 14L84 36 M84 14L62 36" stroke="#d7901a" strokeWidth="1.5" />
      </g>
      <path d="M17 25 L47 27 L37 7 L17 25 M37 7 L70 9 L47 27 M70 9 L73 25 M70 9 L76 2" fill="none" stroke="#ffc43d" strokeWidth="3.5" strokeLinejoin="round" />
      <circle cx="48" cy="-19" r="8" fill="#ffc43d" />
      <path d="M39 -11 L49 5 L68 9" fill="none" stroke="#ffc43d" strokeWidth="7" strokeLinecap="round" />
      <path d="M49 5 L37 22" fill="none" stroke="#ffc43d" strokeWidth="6" strokeLinecap="round" className="leg-a" />
      <path d="M49 5 L57 24" fill="none" stroke="#ffc43d" strokeWidth="6" strokeLinecap="round" className="leg-b" />
      <path d="M48 -8 L65 4" fill="none" stroke="#ffc43d" strokeWidth="5" strokeLinecap="round" />
    </g>
  );
}

function Road({ width, y }) {
  return (
    <g>
      <rect x="0" y={y} width={width} height="56" fill="#0a0e16" />
      <rect x="0" y={y} width={width} height="4" fill="#37353a" />
      <line x1="0" y1={y + 31} x2={width} y2={y + 31} stroke="#c68d32" strokeWidth="2.5" strokeDasharray="30 23" opacity=".7" />
      <path d={`M0 ${y+43} H${width}`} stroke="#222b38" strokeWidth="1" />
      <g opacity=".24" filter="url(#softGlow)">
        <rect x={width*.22} y={y+7} width={width*.13} height="24" fill="#ffb64b" />
        <rect x={width*.44} y={y+8} width={width*.15} height="22" fill="#ff263f" />
        <rect x={width*.72} y={y+8} width={width*.11} height="22" fill="#ffb64b" />
      </g>
    </g>
  );
}

function DesktopScene() {
  const base = 350;
  return (
    <svg className="city-svg desktop-city" viewBox="0 0 1600 420" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="desktopSky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#161226" />
          <stop offset="38%" stopColor="#7d3750" />
          <stop offset="62%" stopColor="#ef7956" />
          <stop offset="78%" stopColor="#342143" />
          <stop offset="100%" stopColor="#0c1018" />
        </linearGradient>
        <radialGradient id="sunGlow" cx="48%" cy="58%" r="42%">
          <stop offset="0%" stopColor="#ffbd73" stopOpacity=".34" />
          <stop offset="100%" stopColor="#ffbd73" stopOpacity="0" />
        </radialGradient>
        <Glow id="windowGlow" std={3}/>
        <Glow id="lampGlow" std={5}/>
        <Glow id="goldGlow" std={4}/>
        <Glow id="redGlow" color="#ef1738" std={4}/>
        <Glow id="softGlow" std={10}/>
      </defs>

      <rect width="1600" height="420" fill="url(#desktopSky)" />
      <rect width="1600" height="420" fill="url(#sunGlow)" />

      <g opacity=".45">
        <path d="M0 68 C120 18 205 96 330 58 S550 30 690 68 S920 23 1070 65 S1320 25 1600 72" fill="none" stroke="#5c466a" strokeWidth="18" />
        <path d="M0 108 C170 72 280 124 440 93 S700 71 850 109 S1110 73 1280 108 S1470 80 1600 100" fill="none" stroke="#b65a63" strokeWidth="10" opacity=".7" />
      </g>

      <Skyline />

      <circle cx="1390" cy="72" r="19" fill="#ffe8a3" filter="url(#lampGlow)" />
      <circle cx="1400" cy="64" r="18" fill="#20172b" />

      <g transform="translate(0 0)">
        <House x={70} base={base} scale={1.1} />
        <Tree x={155} base={base} scale={1.1} />
        <Lamp x={225} base={base} />
        <Shop x={305} base={base} title="EXPRESS SHOP" scale={1.08} />
        <Tree x={470} base={base} scale={1.05} />
        <Lamp x={510} base={base} />
        <MainStore x={610} base={base} scale={1} />
        <Tree x={590} base={base} scale={.9} />
        <Tree x={850} base={base} scale={1.05} />
        <Shop x={1015} base={base} title="PARTS HOUSE" scale={1.08} />
        <Lamp x={1195} base={base} />
        <Tree x={1270} base={base} scale={1.05} />
        <House x={1320} base={base} scale={1.05} />
        <Lamp x={1510} base={base} />
        <Tree x={1570} base={base} scale={1.2} />
      </g>

      <Bicycle x={510} y={322} scale={1.15} />
      <Car x={900} y={317} scale={1.1} />

      <Road width={1600} y={350} />
    </svg>
  );
}

function MobileScene() {
  const base = 385;
  return (
    <svg className="city-svg mobile-city" viewBox="0 0 390 460" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="mobileSky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#171226" />
          <stop offset="38%" stopColor="#873b52" />
          <stop offset="62%" stopColor="#ec7a58" />
          <stop offset="82%" stopColor="#24203b" />
          <stop offset="100%" stopColor="#090d15" />
        </linearGradient>
        <Glow id="windowGlow" std={2.5}/>
        <Glow id="lampGlow" std={4}/>
        <Glow id="goldGlow" std={3.5}/>
        <Glow id="redGlow" std={3}/>
        <Glow id="softGlow" std={8}/>
      </defs>

      <rect width="390" height="460" fill="url(#mobileSky)" />
      <Skyline mobile />

      <circle cx="344" cy="55" r="13" fill="#ffe8a3" filter="url(#lampGlow)" />
      <circle cx="351" cy="50" r="13" fill="#21172a" />

      <House x={4} base={base} scale={.65} />
      <Tree x={48} base={base} scale={.65} />
      <Shop x={70} base={base} title="SHOP" scale={.62} />
      <MainStore x={143} base={base} scale={.58} />
      <Shop x={282} base={base} title="PARTS" scale={.62} />
      <Tree x={370} base={base} scale={.68} />
      <Lamp x={58} base={base} scale={.65} />
      <Lamp x={344} base={base} scale={.65} />

      <Bicycle x={50} y={360} scale={.65} />
      <Car x={244} y={360} scale={.68} />

      <Road width={390} y={385} />
    </svg>
  );
}

export default function CityscapeStrip() {
  return (
    <section className="noyon-premium-city" aria-label="Noyon Telecom city animation">
      <style>{`
        .noyon-premium-city{
          position:relative;
          width:100%;
          height:clamp(205px,17vw,330px);
          overflow:hidden;
          background:#0b0e16;
          border-top:1px solid rgba(255,255,255,.08);
          box-shadow:
            inset 0 25px 40px rgba(0,0,0,.18),
            0 -10px 35px rgba(0,0,0,.15);
        }
        .city-svg{
          position:absolute;
          inset:0;
          width:100%;
          height:100%;
          display:block;
        }
        .mobile-city{display:none}

        .car-anim{
          transform-box:fill-box;
          transform-origin:center;
          animation:carFloat 2.4s ease-in-out infinite;
          filter:drop-shadow(0 5px 5px rgba(0,0,0,.45));
        }
        .bike-anim{
          transform-box:fill-box;
          transform-origin:center;
          animation:bikeFloat 1.1s ease-in-out infinite;
        }
        .wheel{
          transform-box:fill-box;
          transform-origin:center;
          animation:wheelSpin .8s linear infinite;
        }
        .wheel-b{animation-delay:-.4s}
        .leg-a{animation:legMove .8s ease-in-out infinite alternate}
        .leg-b{animation:legMove .8s ease-in-out infinite alternate-reverse}

        @keyframes wheelSpin{to{transform:rotate(360deg)}}
        @keyframes carFloat{
          0%,100%{transform:translateY(0)}
          50%{transform:translateY(-1.5px)}
        }
        @keyframes bikeFloat{
          0%,100%{transform:translateY(0)}
          50%{transform:translateY(-2px)}
        }
        @keyframes legMove{
          from{transform:rotate(-8deg)}
          to{transform:rotate(10deg)}
        }

        /* MOBILE: separate compact composition, automatically selected */
        @media (max-width:700px){
          .noyon-premium-city{
            height:220px;
            min-height:220px;
          }
          .desktop-city{display:none}
          .mobile-city{display:block}
        }

        @media (max-width:390px){
          .noyon-premium-city{
            height:205px;
            min-height:205px;
          }
        }

        @media (prefers-reduced-motion:reduce){
          .noyon-premium-city *,
          .noyon-premium-city *::before,
          .noyon-premium-city *::after{
            animation:none!important;
          }
        }
      `}</style>

      <DesktopScene />
      <MobileScene />
    </section>
  );
}
