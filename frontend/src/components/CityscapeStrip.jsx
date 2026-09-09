import React from "react";

/**
 * Noyon Telecom — Premium Animated City Footer
 * Drop-in React component. No external animation library required.
 *
 * Features:
 * - Premium dark/cinematic skyline
 * - Warm gold + Noyon-red accent lighting
 * - Moving car with headlight glow
 * - Pedaling delivery cyclist
 * - Twinkling stars + signal pulse
 * - Moon, clouds, building depth and window glow
 * - Road reflections
 * - Respects prefers-reduced-motion
 */

function Windows({ x, y, w, h, cols, rows, variant = "warm" }) {
  const pad = 10;
  const cellW = (w - pad * 2) / cols;
  const cellH = (h - pad * 2) / rows;
  const size = Math.max(3, Math.min(cellW, cellH) * 0.34);
  const windows = [];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const seed = (r * 11 + c * 7 + cols) % 9;
      if (seed === 0 || seed === 1) continue;

      windows.push(
        <rect
          key={`${r}-${c}`}
          x={x + pad + c * cellW + (cellW - size) / 2}
          y={y + pad + r * cellH + (cellH - size) / 2}
          width={size}
          height={size * 1.12}
          rx="1.5"
          className={`city-window ${variant}`}
          opacity={seed === 2 ? 0.45 : seed === 3 ? 0.7 : 1}
        />
      );
    }
  }

  return <>{windows}</>;
}

function Building({ x, w, h, base, cols = 3, rows = 5, label, main = false }) {
  const y = base - h;

  return (
    <g className={main ? "building-main" : ""}>
      <rect x={x} y={y} width={w} height={h} rx="7" className="building" />

      {main && (
        <>
          <rect x={x} y={y} width={w} height="5" rx="2.5" className="gold-bar" />
          <rect x={x + 8} y={y + 8} width={w - 16} height="1" className="building-edge" />
        </>
      )}

      <Windows
        x={x}
        y={y}
        w={w}
        h={h}
        cols={cols}
        rows={rows}
        variant={main ? "main" : "warm"}
      />

      {label && (
        <g>
          <text x={x + w / 2} y={y - 13} textAnchor="middle" className="building-label">
            {label}
          </text>
          {main && (
            <circle cx={x + w / 2} cy={y - 24} r="2.5" className="signal-dot" />
          )}
        </g>
      )}
    </g>
  );
}

function House({ x, w, h, base }) {
  const y = base - h;
  const roofH = h * 0.43;

  return (
    <g>
      <path
        d={`M${x - 8},${y + roofH} L${x + w / 2},${y - 7} L${x + w + 8},${y + roofH} Z`}
        className="house-roof"
      />
      <rect x={x} y={y + roofH} width={w} height={h - roofH} rx="5" className="building house" />
      <rect
        x={x + w * 0.62}
        y={base - h * 0.42}
        width={w * 0.2}
        height={h * 0.42}
        rx="2"
        className="door"
      />
      <rect
        x={x + w * 0.14}
        y={y + roofH + h * 0.17}
        width={w * 0.22}
        height={w * 0.22}
        rx="2"
        className="city-window warm"
      />
      <rect
        x={x + w * 0.42}
        y={y + roofH + h * 0.17}
        width={w * 0.22}
        height={w * 0.22}
        rx="2"
        className="city-window dim"
      />
    </g>
  );
}

function Shop({ x, w, h, base, label }) {
  const y = base - h;
  const awningH = h * 0.18;

  return (
    <g>
      <rect x={x} y={y + awningH} width={w} height={h - awningH} rx="6" className="building shop" />
      <rect x={x - 3} y={y} width={w + 6} height={awningH} rx="4" className="shop-awning" />
      <rect x={x + 8} y={y + 7} width={w - 16} height="2" className="shop-light" />
      <text x={x + w / 2} y={y + awningH - 7} textAnchor="middle" className="shop-label">
        {label}
      </text>
      <rect x={x + w * 0.31} y={base - h * 0.48} width={w * 0.38} height={h * 0.48} rx="3" className="door" />
      <rect x={x + w * 0.08} y={y + awningH + h * 0.15} width={w * 0.18} height={w * 0.18} rx="2" className="city-window warm" />
      <rect x={x + w * 0.74} y={y + awningH + h * 0.15} width={w * 0.18} height={w * 0.18} rx="2" className="city-window warm" />
    </g>
  );
}

function Tree({ x, base, big = false }) {
  const r = big ? 21 : 15;
  const cy = base - r * 1.85;

  return (
    <g>
      <rect x={x - 2.5} y={base - r * 1.5} width="5" height={r * 1.5} rx="2" className="trunk" />
      <circle cx={x - r * 0.48} cy={cy + r * 0.22} r={r * 0.7} className="foliage back" />
      <circle cx={x + r * 0.48} cy={cy + r * 0.22} r={r * 0.7} className="foliage back" />
      <circle cx={x} cy={cy - r * 0.2} r={r * 0.82} className="foliage" />
      <circle cx={x - r * 0.18} cy={cy - r * 0.42} r={r * 0.22} className="leaf-highlight" />
    </g>
  );
}

function LampPost({ x, base }) {
  return (
    <g>
      <rect x={x - 1.8} y={base - 62} width="3.6" height="62" rx="2" className="lamp-pole" />
      <rect x={x - 6} y={base - 63} width="12" height="2" rx="1" className="lamp-arm" />
      <circle cx={x} cy={base - 65} r="5" className="lamp-core" />
      <circle cx={x} cy={base - 65} r="14" className="lamp-halo" />
    </g>
  );
}

function Bench({ x, base }) {
  return (
    <g className="bench">
      <rect x={x} y={base - 17} width="34" height="4" rx="2" />
      <rect x={x} y={base - 25} width="34" height="4" rx="2" />
      <rect x={x + 3} y={base - 24} width="3" height="12" />
      <rect x={x + 28} y={base - 24} width="3" height="12" />
    </g>
  );
}

function Cloud({ x, y, scale = 1 }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`} className="cloud">
      <ellipse cx="50" cy="24" rx="50" ry="17" />
      <circle cx="26" cy="18" r="19" />
      <circle cx="48" cy="12" r="24" />
      <circle cx="72" cy="19" r="18" />
    </g>
  );
}

function Moon({ x, y }) {
  return (
    <g className="moon">
      <circle cx={x} cy={y} r="18" />
      <circle cx={x + 8} cy={y - 5} r="16" className="moon-cutout" />
    </g>
  );
}

function Stars() {
  const stars = [
    [70, 34, 1.4], [145, 61, 1], [230, 30, 1.5], [320, 49, 1],
    [410, 25, 1.2], [535, 43, 1.3], [640, 24, 1], [760, 58, 1.5],
    [870, 29, 1.2], [980, 51, 1], [1080, 25, 1.4], [1180, 54, 1],
    [1320, 31, 1.3], [1370, 67, 1]
  ];

  return (
    <>
      {stars.map(([cx, cy, r], i) => (
        <circle key={i} cx={cx} cy={cy} r={r} className={`star star-${i % 4}`} />
      ))}
    </>
  );
}

function SignalPulse({ x, y }) {
  return (
    <g className="signal">
      <circle cx={x} cy={y} r="3" />
      <path d={`M${x - 9} ${y - 7} Q${x} ${y - 14} ${x + 9} ${y - 7}`} />
      <path d={`M${x - 15} ${y - 12} Q${x} ${y - 24} ${x + 15} ${y - 12}`} />
    </g>
  );
}

function Car() {
  return (
    <div className="car-lane">
      <div className="car">
        <div className="car-headlight" />
        <svg viewBox="0 0 120 52" aria-hidden="true">
          <path
            d="M8 35 Q7 23 21 20 L31 9 Q35 5 46 5 H77 Q89 5 96 20 Q110 22 112 34 Q112 40 104 40 H14 Q8 40 8 35Z"
            className="car-body"
          />
          <path d="M33 19 L42 9 H75 Q85 9 91 19Z" className="car-window" />
          <path d="M61 10 V19" className="car-window-line" />
          <circle cx="31" cy="40" r="9" className="car-wheel" />
          <circle cx="91" cy="40" r="9" className="car-wheel" />
          <circle cx="31" cy="40" r="4" className="car-hub" />
          <circle cx="91" cy="40" r="4" className="car-hub" />
          <rect x="99" y="27" width="5" height="4" rx="1" className="car-light" />
        </svg>
      </div>
    </div>
  );
}

function Cyclist() {
  return (
    <div className="cyclist-lane">
      <div className="cyclist">
        <svg viewBox="0 0 195 185" aria-hidden="true">
          <g className="bike-wheel-roll">
            <circle cx="45" cy="145" r="35" className="bike-wheel" />
            <path d="M45 145 L45 110 M45 145 L75 162.5 M45 145 L15 162.5" className="bike-spoke" />
            <circle cx="45" cy="145" r="4" className="bike-hub" />
          </g>
          <g className="bike-wheel-roll">
            <circle cx="150" cy="145" r="35" className="bike-wheel" />
            <path d="M150 145 L150 110 M150 145 L180 162.5 M150 145 L120 162.5" className="bike-spoke" />
            <circle cx="150" cy="145" r="4" className="bike-hub" />
          </g>

          <path
            d="M45 145 L105 152 L88 80 L45 145 M88 80 L148 84 L105 152 M148 84 L150 145 M148 84 L150 73"
            className="bike-frame"
          />
          <path d="M76 78 L100 78 M138 72 L163 72" className="bike-frame" />

          <g className="crank">
            <path d="M105 152 L105 164" className="bike-frame" />
            <circle cx="105" cy="164" r="5" className="bike-hub" />
          </g>
          <circle cx="105" cy="152" r="9" className="bike-chainring" />

          <circle cx="118" cy="18" r="15" className="rider" />
          <path d="M88 76 L110 34" className="rider-body" />
          <path d="M108 38 L148 78" className="rider-arm" />

          <g className="thigh">
            <path d="M88 76 L116.5 119.5" className="rider-leg" />
            <g className="shin">
              <path d="M116.5 119.5 L105 164" className="rider-leg" />
            </g>
          </g>
        </svg>
      </div>
    </div>
  );
}

export default function CityscapeStrip() {
  const base = 190;

  return (
    <div className="cityscape-strip" aria-hidden="true">
      <style>{`
        .cityscape-strip{
          --bg:#090b10;
          --gold:#f4b83f;
          --gold2:#ffd77a;
          --red:#ef1738;
          --red2:#ff5368;
          --road:#10151b;
          position:relative;
          width:100%;
          height:clamp(185px,20vw,235px);
          overflow:hidden;
          isolation:isolate;
          background:
            radial-gradient(ellipse at 50% 82%,rgba(239,23,56,.10),transparent 35%),
            linear-gradient(180deg,#080b11 0%,#0b1018 55%,#090c11 100%);
          border-top:1px solid rgba(255,255,255,.045);
          border-bottom:1px solid rgba(255,255,255,.055);
          box-shadow:inset 0 18px 45px rgba(0,0,0,.28);
        }

        .cityscape-skyline{
          position:absolute;
          inset:0;
          width:100%;
          height:100%;
          display:block;
        }

        .building{
          fill:url(#buildingGradient);
          stroke:rgba(255,255,255,.075);
          stroke-width:1;
        }
        .building-main .building{
          fill:url(#mainBuildingGradient);
          stroke:rgba(244,184,63,.22);
        }
        .building-edge{fill:rgba(255,255,255,.12)}
        .gold-bar{fill:var(--gold)}
        .city-window{
          fill:#ffbd42;
          filter:url(#windowGlow);
        }
        .city-window.main{fill:#ffd873}
        .city-window.dim{fill:#8c5c20;filter:none}
        .city-window.warm{fill:#ffb62e}
        .house-roof{fill:#321321;stroke:rgba(255,255,255,.06);stroke-width:1}
        .door{fill:#1a1118;stroke:rgba(255,190,70,.1);stroke-width:1}
        .building-label{
          fill:#f4f5f7;
          font:600 12px/1 system-ui,sans-serif;
          letter-spacing:.9px;
        }
        .shop-label{
          fill:white;
          font:700 8px/1 system-ui,sans-serif;
          letter-spacing:.45px;
        }
        .shop-awning{fill:var(--red);filter:url(#redGlow)}
        .shop-light{fill:rgba(255,215,122,.55)}
        .foliage{fill:#173b31}
        .foliage.back{fill:#102d26}
        .leaf-highlight{fill:#2c604d}
        .trunk{fill:#2a2019}
        .lamp-pole{fill:#31373d}
        .lamp-arm{fill:#3b4147}
        .lamp-core{fill:#ffd778;filter:url(#lampGlow)}
        .lamp-halo{fill:#ffb52e;opacity:.11;filter:url(#lampBlur)}
        .bench rect,.bench{fill:#3b3029}
        .cloud{fill:#111722;opacity:.45}
        .moon circle:first-child{fill:#ffe7a5;filter:url(#moonGlow)}
        .moon-cutout{fill:#090c12!important;filter:none!important}
        .star{fill:#fff4cf;animation:twinkle 3.8s ease-in-out infinite}
        .star-1{animation-delay:.8s}.star-2{animation-delay:1.7s}.star-3{animation-delay:2.5s}
        .signal circle{fill:var(--red);filter:url(#redGlow)}
        .signal path{fill:none;stroke:var(--red);stroke-width:2;stroke-linecap:round;opacity:.8}
        .signal{animation:signalPulse 2.8s ease-out infinite;transform-origin:center}

        .road{
          fill:var(--road);
          stroke:#242a31;
          stroke-width:1;
        }
        .road-line{
          stroke:#b68130;
          stroke-width:2;
          stroke-dasharray:18 14;
          opacity:.65;
        }
        .road-edge{stroke:#383c42;stroke-width:2}
        .reflection{fill:url(#reflectionGradient);opacity:.22}
        .reflection-red{fill:var(--red);opacity:.13;filter:url(#softBlur)}

        .car-lane,.cyclist-lane{
          position:absolute;
          inset:0;
          pointer-events:none;
        }
        .car{
          position:absolute;
          width:78px;
          left:-100px;
          top:61%;
          animation:drive 15s linear infinite;
          filter:drop-shadow(0 5px 7px rgba(0,0,0,.55));
        }
        .car svg{display:block;width:100%;height:auto}
        .car-body{fill:#e6193a;stroke:#ff6375;stroke-width:1}
        .car-window{fill:#1c2832;stroke:#73808a;stroke-width:1}
        .car-window-line{stroke:#65717a;stroke-width:1}
        .car-wheel{fill:#080a0d;stroke:#4b5258;stroke-width:2}
        .car-hub{fill:#aab0b5}
        .car-light{fill:#ffdd8a;filter:url(#lampGlow)}
        .car-headlight{
          position:absolute;
          right:-15px;
          top:34px;
          width:32px;
          height:10px;
          background:linear-gradient(90deg,transparent,rgba(255,224,145,.25));
          filter:blur(5px);
        }

        .cyclist{
          position:absolute;
          width:55px;
          left:-75px;
          top:48%;
          animation:ride 19s linear infinite;
          filter:drop-shadow(0 4px 4px rgba(0,0,0,.45));
        }
        .cyclist svg{display:block;width:100%;height:auto}
        .bike-wheel{fill:none;stroke:#f5b52e;stroke-width:4}
        .bike-spoke{fill:none;stroke:#d99018;stroke-width:3;stroke-linecap:round}
        .bike-hub,.bike-chainring{fill:#f5b52e}
        .bike-frame{fill:none;stroke:#f5b52e;stroke-width:5;stroke-linecap:round;stroke-linejoin:round}
        .bike-frame-roll{}
        .rider{fill:#f5b52e}
        .rider-body,.rider-arm,.rider-leg{fill:none;stroke:#f5b52e;stroke-linecap:round}
        .rider-body{stroke-width:13}.rider-arm{stroke-width:10}.rider-leg{stroke-width:11}
        .bike-wheel-roll{transform-box:fill-box;transform-origin:center;animation:wheelSpin .75s linear infinite}
        .crank{transform-box:fill-box;transform-origin:105px 152px;animation:crankSpin .8s linear infinite}
        .thigh{transform-box:fill-box;transform-origin:88px 76px;animation:pedalThigh .8s ease-in-out infinite}
        .shin{transform-box:fill-box;transform-origin:116.5px 119.5px;animation:pedalShin .8s ease-in-out infinite}

        @keyframes drive{
          0%{transform:translateX(-110px)}
          100%{transform:translateX(calc(100vw + 150px))}
        }
        @keyframes ride{
          0%{transform:translateX(-100px)}
          100%{transform:translateX(calc(100vw + 130px))}
        }
        @keyframes wheelSpin{to{transform:rotate(360deg)}}
        @keyframes crankSpin{to{transform:rotate(360deg)}}
        @keyframes pedalThigh{
          0%,100%{transform:rotate(17deg)}
          50%{transform:rotate(-23deg)}
        }
        @keyframes pedalShin{
          0%,100%{transform:rotate(-18deg)}
          50%{transform:rotate(24deg)}
        }
        @keyframes twinkle{
          0%,100%{opacity:.35;transform:scale(.8)}
          50%{opacity:1;transform:scale(1.35)}
        }
        @keyframes signalPulse{
          0%{opacity:.2;transform:scale(.8)}
          35%,70%{opacity:1;transform:scale(1)}
          100%{opacity:.2;transform:scale(1.08)}
        }

        @media (max-width:700px){
          .cityscape-strip{height:180px}
          .building-label{font-size:9px}
          .car{width:65px}
          .cyclist{width:45px}
        }

        @media (prefers-reduced-motion:reduce){
          .cityscape-strip *{
            animation:none!important;
            scroll-behavior:auto!important;
          }
        }
      `}</style>

      <svg
        viewBox="0 0 1400 210"
        preserveAspectRatio="xMidYMax slice"
        className="cityscape-skyline"
      >
        <defs>
          <linearGradient id="skyGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#070a10"/>
            <stop offset="62%" stopColor="#0d121a"/>
            <stop offset="100%" stopColor="#12161d"/>
          </linearGradient>

          <linearGradient id="buildingGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#28121b"/>
            <stop offset="100%" stopColor="#130c12"/>
          </linearGradient>

          <linearGradient id="mainBuildingGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#34151d"/>
            <stop offset="100%" stopColor="#170b11"/>
          </linearGradient>

          <linearGradient id="reflectionGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f7bb47"/>
            <stop offset="100%" stopColor="transparent"/>
          </linearGradient>

          <filter id="windowGlow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="1.8" result="b"/>
            <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <filter id="lampGlow" x="-300%" y="-300%" width="600%" height="600%">
            <feGaussianBlur stdDeviation="3" result="b"/>
            <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <filter id="lampBlur"><feGaussianBlur stdDeviation="7"/></filter>
          <filter id="redGlow"><feGaussianBlur stdDeviation="2.4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
          <filter id="moonGlow"><feGaussianBlur stdDeviation="1.2"/></filter>
          <filter id="softBlur"><feGaussianBlur stdDeviation="4"/></filter>
        </defs>

        <rect width="1400" height="210" fill="url(#skyGradient)"/>

        <Cloud x={70} y={76} scale={0.75}/>
        <Cloud x={760} y={82} scale={0.65}/>
        <Cloud x={1110} y={70} scale={0.8}/>

        <Stars/>
        <Moon x={1260} y={42}/>

        {/* Distant skyline */}
        <g opacity=".34" fill="#171c25">
          <rect x="0" y="104" width="65" height="86"/>
          <rect x="76" y="121" width="42" height="69"/>
          <rect x="130" y="96" width="55" height="94"/>
          <rect x="200" y="118" width="60" height="72"/>
          <rect x="276" y="90" width="45" height="100"/>
          <rect x="338" y="112" width="70" height="78"/>
          <rect x="425" y="92" width="42" height="98"/>
          <rect x="480" y="113" width="62" height="77"/>
          <rect x="560" y="84" width="47" height="106"/>
          <rect x="622" y="103" width="60" height="87"/>
          <rect x="700" y="91" width="50" height="99"/>
          <rect x="768" y="116" width="62" height="74"/>
          <rect x="846" y="89" width="47" height="101"/>
          <rect x="905" y="111" width="65" height="79"/>
          <rect x="985" y="92" width="52" height="98"/>
          <rect x="1054" y="109" width="70" height="81"/>
          <rect x="1140" y="85" width="45" height="105"/>
          <rect x="1200" y="112" width="65" height="78"/>
          <rect x="1280" y="92" width="52" height="98"/>
          <rect x="1344" y="115" width="56" height="75"/>
        </g>

        {/* Foreground neighborhood */}
        <House x={20} w={78} h={70} base={base}/>
        <Tree x={119} base={base}/>
        <Shop x={145} w={132} h={94} base={base} label="EXPRESS SHOP"/>
        <Bench x={296} base={base}/>

        <Building x={350} w={100} h={116} base={base} cols={3} rows={4}/>
        <LampPost x={470} base={base}/>

        <Building
          x={492}
          w={156}
          h={170}
          base={base}
          cols={4}
          rows={6}
          label="NOYON TELECOM"
          main
        />
        <SignalPulse x={570} y={-4}/>

        <Tree x={670} base={base} big/>
        <Building x={696} w={92} h={104} base={base} cols={2} rows={4}/>
        <House x={806} w={80} h={64} base={base}/>
        <Tree x={904} base={base}/>
        <Shop x={928} w={118} h={86} base={base} label="PARTS HOUSE"/>
        <LampPost x={1064} base={base}/>
        <Building x={1086} w={112} h={142} base={base} cols={3} rows={5}/>
        <House x={1216} w={80} h={68} base={base}/>
        <Tree x={1314} base={base}/>

        {/* Ground */}
        <rect x="0" y={base - 7} width="1400" height="7" fill="#171b20"/>
        <line x1="0" y1={base - 7} x2="1400" y2={base - 7} className="road-edge"/>

        <rect x="0" y={base} width="1400" height="20" className="road"/>
        <line x1="0" y1={base + 10} x2="1400" y2={base + 10} className="road-line"/>

        <rect x="500" y={base + 21} width="170" height="14" className="reflection"/>
        <rect x="760" y={base + 21} width="105" height="10" className="reflection-red"/>
      </svg>

      <Car/>
      <Cyclist/>
    </div>
  );
}
