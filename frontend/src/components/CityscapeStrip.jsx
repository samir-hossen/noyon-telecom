import React from 'react';

// ==========================================
// Building & Environment Components
// ==========================================
function Windows({ x, y, w, h, cols, rows }) {
  const pad = 8;
  const cellW = (w - pad * 2) / cols;
  const cellH = (h - pad * 2) / rows;
  const size = Math.min(cellW, cellH) * 0.45;
  const windows = [];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const seed = (r * 7 + c * 3) % 5;
      const dark = seed === 0;
      const dim = seed === 1;
      windows.push(
        <rect
          key={`${r}-${c}`}
          x={x + pad + c * cellW + (cellW - size) / 2}
          y={y + pad + r * cellH + (cellH - size) / 2}
          width={size}
          height={size * 1.3}
          rx="1"
          fill={dark ? '#14111d' : dim ? '#ffaa44' : '#ffd276'}
          opacity={dim ? 0.35 : 1}
          filter={!dark && !dim ? 'url(#glow-blur-subtle)' : ''}
        />
      );
    }
  }
  return <g>{windows}</g>;
}

function ModernShowroom({ x, base }) {
  const w = 180;
  const h = 135;
  const y = base - h;
  return (
    <g className="city-showroom">
      <circle cx={x + w / 2} cy={y + h * 0.6} r="100" fill="url(#warm-interior-glow)" opacity="0.45" />
      <rect x={x} y={y} width={w} height={h} rx="8" fill="#14141c" stroke="#2a2b38" strokeWidth="2" />
      
      {/* Brand Header */}
      <rect x={x + 10} y={y - 20} width={w - 20} height="28" rx="6" fill="#0b0b10" stroke="#ff8c00" strokeWidth="1.5" />
      <text x={x + w / 2} y={y - 2} textAnchor="middle" className="city-brand-text">NOYON TELECOM</text>
      
      {/* Glass Storefront */}
      <rect x={x + 8} y={y + 16} width={w - 16} height={h - 22} rx="4" fill="url(#glass-gradient)" stroke="#ffaa44" strokeWidth="1" strokeOpacity="0.4" />
      
      {/* Interior Displays */}
      <rect x={x + 18} y={y + 35} width="40" height="60" rx="3" fill="#1b1c26" stroke="#444" strokeWidth="1" />
      <rect x={x + 23} y={y + 42} width="30" height="45" rx="2" fill="#ff4422" opacity="0.8" filter="url(#glow-blur)" />
      
      <line x1={x + w / 2} y1={y + 16} x2={x + w / 2} y2={base - 6} stroke="#555" strokeWidth="1.5" />
      <line x1={x + 65} y1={y + 16} x2={x + 65} y2={base - 6} stroke="#333" strokeWidth="1" />
      <line x1={x + w - 65} y1={y + 16} x2={x + w - 65} y2={base - 6} stroke="#333" strokeWidth="1" />
      
      <rect x={x + w - 58} y={y + 35} width="40" height="60" rx="3" fill="#1b1c26" stroke="#444" strokeWidth="1" />
      <circle cx={x + w - 38} cy={y + 60} r="12" fill="#ffd066" opacity="0.7" filter="url(#glow-blur)" />
      
      <polygon points={`${x + 15},${base - 6} ${x + w - 15},${base - 6} ${x + w + 35},${base + 16} ${x - 35},${base + 16}`} fill="url(#entrance-light-beam)" opacity="0.3" />
    </g>
  );
}

function Highrise({ x, w, h, base, cols, rows }) {
  const y = base - h;
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx="4" fill="url(#highrise-gradient)" />
      <Windows x={x} y={y} w={w} h={h} cols={cols} rows={rows} />
    </g>
  );
}

function ExpressHub({ x, w, h, base, label, color = '#e60023' }) {
  const y = base - h;
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx="4" fill="#161720" stroke="#252633" strokeWidth="1.5" />
      <rect x={x + 8} y={y + 8} width={w - 16} height="18" rx="3" fill="#0c0d12" stroke={color} strokeWidth="1" />
      <text x={x + w / 2} y={y + 21} textAnchor="middle" fill={color} fontSize="9" fontWeight="800" letterSpacing="0.8" filter="url(#glow-blur-subtle)">
        {label}
      </text>
      <rect x={x + 10} y={y + 34} width={w - 20} height={h - 40} rx="3" fill="#ffb852" fillOpacity="0.25" stroke="#ffaa33" strokeWidth="0.8" />
      <line x1={x + w / 2} y1={y + 34} x2={x + w / 2} y2={base - 6} stroke="#333" strokeWidth="1" />
    </g>
  );
}

function CinematicTree({ x, base }) {
  return (
    <g>
      <rect x={x - 2} y={base - 32} width="4" height="26" rx="2" fill="#120a06" />
      <circle cx={x - 10} cy={base - 40} r="18" fill="#0d2818" opacity="0.9" />
      <circle cx={x + 10} cy={base - 40} r="18" fill="#143722" opacity="0.9" />
      <circle cx={x} cy={base - 52} r="22" fill="#1c472c" opacity="0.95" />
    </g>
  );
}

function LuxuryLamp({ x, base }) {
  return (
    <g>
      <line x1={x} y1={base - 6} x2={x} y2={base - 72} stroke="#3c3f50" strokeWidth="2.5" strokeLinecap="round" />
      <path d={`M${x - 8},${base - 72} Q${x},${base - 80} ${x + 8},${base - 72}`} fill="none" stroke="#555a70" strokeWidth="2" />
      <circle cx={x} cy={base - 71} r="3" fill="#fff" />
      <circle cx={x} cy={base - 71} r="9" fill="#ffb43a" opacity="0.75" filter="url(#glow-blur)" />
      <polygon points={`${x - 4},${base - 68} ${x + 4},${base - 68} ${x + 28},${base + 16} ${x - 28},${base + 16}`} fill="url(#lamp-light-cone)" opacity="0.22" />
    </g>
  );
}

// ==========================================
// Main Export Component
// ==========================================
export default function CityscapeStrip() {
  const base = 185;

  return (
    <div className="cityscape-strip" aria-hidden="true">
      <style>{`
        .cityscape-strip {
          position: relative;
          width: 100%;
          height: 230px;
          overflow: hidden;
          background: #08070d;
        }
        
        .cityscape-skyline {
          width: 100%;
          height: 100%;
          display: block;
        }

        @media (max-width: 768px) {
          .cityscape-strip { height: 160px; }
        }

        .city-brand-text {
          fill: #ffffff;
          font-size: 12px;
          font-weight: 900;
          letter-spacing: 1.5px;
          font-family: 'Poppins', sans-serif;
          filter: drop-shadow(0 0 5px rgba(255, 140, 0, 0.8));
        }

        /* Traffic Lanes */
        .cityscape-car-lane {
          position: absolute;
          bottom: 12px;
          left: 0;
          width: 100%;
          pointer-events: none;
          animation: driveLeft 14s linear infinite;
        }
        .cityscape-car {
          width: 85px;
          transform: scaleX(-1); /* গাড়ি বামে ঘুরানো */
          filter: drop-shadow(0 4px 6px rgba(0,0,0,0.6));
        }

        .cityscape-cyclist-lane {
          position: absolute;
          bottom: 10px;
          left: 0;
          width: 100%;
          pointer-events: none;
          animation: driveLeft 22s linear infinite;
        }
        .cityscape-cyclist {
          width: 35px;
          transform: scaleX(-1); /* সাইকেল বামে ঘুরানো */
          filter: drop-shadow(0 3px 5px rgba(0,0,0,0.6));
        }

        @media (max-width: 768px) {
          .cityscape-car { width: 70px; }
          .cityscape-cyclist { width: 28px; }
          .cityscape-car-lane { bottom: 8px; animation-duration: 10s; }
          .cityscape-cyclist-lane { bottom: 6px; animation-duration: 16s; }
        }

        /* Animation Keyframes (ডান থেকে বামে) */
        @keyframes driveLeft {
          0% { transform: translateX(110vw); }
          100% { transform: translateX(-150px); }
        }

        /* চাকা ঘোরার অ্যানিমেশন (বাম দিকে চলার জন্য উল্টো ঘুরবে) */
        .cityscape-wheel-roll {
          transform-origin: center;
          animation: wheelSpin 0.7s linear infinite;
        }
        .cityscape-crank {
          transform-origin: 105px 152px;
          animation: crankSpin 1.4s linear infinite;
        }
        @keyframes wheelSpin { 
          from { transform: rotate(0deg); } 
          to { transform: rotate(-360deg); } 
        }
        @keyframes crankSpin { 
          from { transform: rotate(0deg); } 
          to { transform: rotate(-360deg); } 
        }

        /* সাইকেলের এসভিজি স্টাইলিং */
        .cityscape-wheel-ring { fill: none; stroke: #ffcc00; stroke-width: 6; }
        .cityscape-spoke { stroke: #ffcc00; stroke-width: 3.5; }
        .cityscape-bike-frame { fill: none; stroke: #ffffff; stroke-width: 7; stroke-linecap: round; stroke-linejoin: round; }
        .cityscape-bike-frame-fill { fill: #ffffff; }
        .cityscape-rider { stroke: #ffcc00; fill: #ffcc00; }
      `}</style>

      {/* ==========================================
          BACKGROUND SVG GRAPHICS
      ========================================== */}
      <svg viewBox="0 0 1400 220" preserveAspectRatio="xMidYMax slice" className="cityscape-skyline">
        <defs>
          <linearGradient id="sky-cinema" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0a0814" />
            <stop offset="60%" stopColor="#221124" />
            <stop offset="100%" stopColor="#431b2c" />
          </linearGradient>
          <linearGradient id="highrise-gradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1e1829" />
            <stop offset="100%" stopColor="#0d0914" />
          </linearGradient>
          <linearGradient id="glass-gradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fff2cc" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#ff9922" stopOpacity="0.15" />
          </linearGradient>
          <radialGradient id="warm-interior-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffb347" stopOpacity="1" />
            <stop offset="100%" stopColor="#ffb347" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="lamp-light-cone" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffc04d" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#ffc04d" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="entrance-light-beam" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffc766" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#ffc766" stopOpacity="0" />
          </linearGradient>
          <filter id="glow-blur" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="5" />
          </filter>
          <filter id="glow-blur-subtle" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="1.5" />
          </filter>
        </defs>

        <rect x="0" y="0" width="1400" height="220" fill="url(#sky-cinema)" />

        {/* Moon */}
        <circle cx="1220" cy="42" r="16" fill="#fff5dd" filter="url(#glow-blur-subtle)" />
        <circle cx="1228" cy="38" r="14" fill="#130d1c" />

        {/* Back Skyline */}
        <rect x="50" y="70" width="70" height="120" fill="#120c1a" opacity="0.6" />
        <rect x="190" y="55" width="80" height="135" fill="#140e1c" opacity="0.5" />
        <rect x="380" y="45" width="90" height="145" fill="#120c1a" opacity="0.5" />
        <rect x="760" y="60" width="85" height="130" fill="#150f20" opacity="0.6" />
        <rect x="990" y="50" width="75" height="140" fill="#120c1a" opacity="0.5" />
        <rect x="1150" y="75" width="90" height="115" fill="#171022" opacity="0.6" />

        {/* Midground */}
        <Highrise x="40" w="95" h="120" base={base} cols={3} rows={5} />
        <CinematicTree x="160" base={base} />
        <ExpressHub x="190" w="130" h="95" base={base} label="EXPRESS SHOP" color="#ff334b" />
        <LuxuryLamp x="350" base={base} />

        {/* Noyon Telecom Headquarters */}
        <ModernShowroom x="410" base={base} />

        <LuxuryLamp x="625" base={base} />
        <CinematicTree x="670" base={base} />
        <Highrise x="705" w="110" h="140" base={base} cols={3} rows={6} />
        <ExpressHub x="840" w="125" h="95" base={base} label="PARTS HOUSE" color="#ff4422" />
        <LuxuryLamp x="995" base={base} />
        <Highrise x="1035" w="120" h="150" base={base} cols={4} rows={6} />
        <CinematicTree x="1190" base={base} />
        <Highrise x="1230" w="90" h="115" base={base} cols={2} rows={5} />

        {/* Wet Road Highlights */}
        <rect x="0" y={base - 6} width="1400" height="6" fill="#1a1c24" />
        <line x1="0" y1={base - 6} x2="1400" y2={base - 6} stroke="#3b3f4f" strokeWidth="1" />
        <rect x="0" y={base} width="1400" height="35" fill="#08090d" />
        <rect x="0" y={base} width="1400" height="2" fill="#ffb43a" opacity="0.25" />
        <line x1="0" y1={base + 15} x2="1400" y2={base + 15} stroke="#333845" strokeWidth="2" strokeDasharray="24 18" />
      </svg>

      {/* ==========================================
          ANIMATED TRAFFIC (CAR)
      ========================================== */}
      <div className="cityscape-car-lane">
        <div className="cityscape-car">
          <svg viewBox="0 0 130 40">
            <polygon points="18,24 0,16 0,34" fill="url(#lamp-light-cone)" opacity="0.45" />
            <path d="M22 23 Q21 14 32 12 Q37 4 52 4 L72 4 Q84 4 88 12 Q100 14 98 23 Q98 26 94 26 L26 26 Q22 26 22 23 Z" fill="#d91b2b" />
            <path d="M35 12 Q39 7 52 7 L72 7 Q81 7 86 12 Z" fill="#1a0407" />
            <circle cx="39" cy="26" r="6.5" fill="#0d0e12" stroke="#444" strokeWidth="1.5" />
            <circle cx="81" cy="26" r="6.5" fill="#0d0e12" stroke="#444" strokeWidth="1.5" />
            <circle cx="39" cy="26" r="2.5" fill="#bbb" />
            <circle cx="81" cy="26" r="2.5" fill="#bbb" />
            <circle cx="97" cy="18" r="2" fill="#ff0000" />
          </svg>
        </div>
      </div>

      {/* ==========================================
          ANIMATED TRAFFIC (CYCLIST)
      ========================================== */}
      <div className="cityscape-cyclist-lane">
        <div className="cityscape-cyclist">
          <svg viewBox="0 0 195 185">
            <g className="cityscape-wheel-roll">
              <circle cx="45" cy="145" r="35" className="cityscape-wheel-ring" />
              <path d="M45 145 L45 110 M45 145 L75.3 162.5 M45 145 L14.7 162.5" className="cityscape-spoke" />
              <circle cx="45" cy="145" r="5" className="cityscape-bike-frame-fill" />
            </g>
            <g className="cityscape-wheel-roll">
              <circle cx="150" cy="145" r="35" className="cityscape-wheel-ring" />
              <path d="M150 145 L150 110 M150 145 L180.3 162.5 M150 145 L119.7 162.5" className="cityscape-spoke" />
              <circle cx="150" cy="145" r="5" className="cityscape-bike-frame-fill" />
            </g>
            <path d="M45 145 L105 152 M105 152 L88 80 M45 145 L88 80 M105 152 L148 84 M88 80 L148 84 M148 84 L150 145 M148 84 L150 74" className="cityscape-bike-frame" />
            <path d="M76 78 L100 78 M138 72 L162 72" className="cityscape-bike-frame" />
            <g className="cityscape-crank">
              <path d="M105 152 L105 164" className="cityscape-bike-frame" />
              <circle cx="105" cy="164" r="5" className="cityscape-bike-frame-fill" />
            </g>
            <circle cx="105" cy="152" r="10" className="cityscape-bike-frame-fill" />
            <circle cx="118" cy="18" r="15" className="cityscape-rider" />
            <path d="M88 76 L110 34" className="cityscape-rider" fill="none" strokeWidth="13" strokeLinecap="round" />
            <path d="M108 38 L148 78" className="cityscape-rider" fill="none" strokeWidth="10" strokeLinecap="round" />
            <g className="cityscape-thigh">
              <path d="M88 76 L116.5 119.5" className="cityscape-rider" fill="none" strokeWidth="11" strokeLinecap="round" />
              <g className="cityscape-shin">
                <path d="M116.5 119.5 L105 164" className="cityscape-rider" fill="none" strokeWidth="10" strokeLinecap="round" />
              </g>
            </g>
          </svg>
        </div>
      </div>
    </div>
  );
}