import React from 'react';

export default function CityscapeStrip() {
  const base = 180;

  return (
    <div className="cityscape-root" aria-hidden="true">
      <style>{`
        .cityscape-root {
          position: relative;
          width: 100%;
          height: 230px;
          overflow: hidden;
          background: #09060f;
        }
        .cityscape-svg {
          width: 100%;
          height: 100%;
          display: block;
        }
        
        /* Neon & Lighting Styles */
        .neon-brand-title {
          font-family: 'Poppins', system-ui, -apple-system, sans-serif;
          font-size: 13px;
          font-weight: 800;
          fill: #ffffff;
          letter-spacing: 1.8px;
        }
        .neon-shop-label {
          font-family: 'Poppins', system-ui, -apple-system, sans-serif;
          font-size: 9.5px;
          font-weight: 800;
          letter-spacing: 1.2px;
          fill: #ffffff;
        }

        /* Continuous Vehicle Movements */
        .cityscape-car-lane {
          position: absolute;
          bottom: 12px;
          left: 0;
          width: 100%;
          pointer-events: none;
          animation: carDrive 14s linear infinite;
        }
        .cityscape-car {
          width: 95px;
        }

        .cityscape-cyclist-lane {
          position: absolute;
          bottom: 10px;
          left: 0;
          width: 100%;
          pointer-events: none;
          animation: cyclistRide 24s linear infinite;
        }
        .cityscape-cyclist {
          width: 38px;
        }

        /* Bicycle Rig & Spin */
        .cityscape-wheel-roll {
          transform-origin: center;
          animation: wheelSpin 0.7s linear infinite;
        }
        .cityscape-crank {
          transform-origin: 105px 152px;
          animation: crankSpin 1.4s linear infinite;
        }
        .cityscape-wheel-ring {
          fill: none;
          stroke: #ffbb00;
          stroke-width: 6;
        }
        .cityscape-spoke {
          stroke: #ffbb00;
          stroke-width: 3.5;
        }
        .cityscape-bike-frame {
          fill: none;
          stroke: #f3f4f6;
          stroke-width: 7;
          stroke-linecap: round;
          stroke-linejoin: round;
        }
        .cityscape-bike-frame-fill {
          fill: #f3f4f6;
        }
        .cityscape-rider {
          stroke: #ffcc00;
          fill: #ffcc00;
        }

        @keyframes carDrive {
          0% { transform: translateX(110vw); }
          100% { transform: translateX(-180px); }
        }
        @keyframes cyclistRide {
          0% { transform: translateX(115vw); }
          100% { transform: translateX(-150px); }
        }
        @keyframes wheelSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(-360deg); }
        }
        @keyframes crankSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(-360deg); }
        }
      `}</style>

      <svg viewBox="0 0 1440 230" preserveAspectRatio="xMidYMax slice" className="cityscape-svg">
        <defs>
          {/* Sunset Dusk Sky */}
          <linearGradient id="sky-dusk" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0b0816" />
            <stop offset="35%" stopColor="#250e2b" />
            <stop offset="68%" stopColor="#5d1d36" />
            <stop offset="90%" stopColor="#ba4328" />
            <stop offset="100%" stopColor="#e8702b" />
          </linearGradient>

          {/* Distant Skyline Gradient */}
          <linearGradient id="skyline-far" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1f1124" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#110815" stopOpacity="0.95" />
          </linearGradient>

          {/* Noyon Telecom Interior Glow */}
          <linearGradient id="interior-gold-glow" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fff6df" stopOpacity="0.8" />
            <stop offset="50%" stopColor="#ffb944" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#ff7a18" stopOpacity="0.15" />
          </linearGradient>

          {/* Red Shop Interior Glow */}
          <linearGradient id="shop-red-glow" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ff8585" stopOpacity="0.75" />
            <stop offset="100%" stopColor="#c71b2d" stopOpacity="0.2" />
          </linearGradient>

          {/* Streetlamp Light Cone */}
          <linearGradient id="lamp-cone" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffd269" stopOpacity="0.9" />
            <stop offset="70%" stopColor="#ffae19" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#ff9900" stopOpacity="0" />
          </linearGradient>

          {/* Wet Road Ambient Ground Reflection */}
          <radialGradient id="wet-road-reflection" cx="50%" cy="10%" r="50%">
            <stop offset="0%" stopColor="#ff9e3b" stopOpacity="0.45" />
            <stop offset="60%" stopColor="#ff6200" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0" />
          </radialGradient>

          <radialGradient id="wet-red-reflection" cx="50%" cy="10%" r="50%">
            <stop offset="0%" stopColor="#ff334b" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0" />
          </radialGradient>

          {/* Soft Glow Filter */}
          <filter id="cinematic-blur" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="6" />
          </filter>
          <filter id="soft-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2" />
          </filter>
        </defs>

        {/* 1. Dramatic Sky Backdrop */}
        <rect x="0" y="0" width="1440" height="230" fill="url(#sky-dusk)" />

        {/* Soft Sunset Clouds */}
        <ellipse cx="280" cy="115" rx="190" ry="24" fill="#3f132a" opacity="0.45" filter="url(#cinematic-blur)" />
        <ellipse cx="850" cy="105" rx="260" ry="30" fill="#4a152e" opacity="0.4" filter="url(#cinematic-blur)" />
        <ellipse cx="1200" cy="95" rx="160" ry="20" fill="#360f26" opacity="0.5" filter="url(#cinematic-blur)" />

        {/* Glowing Crescent Moon */}
        <circle cx="1225" cy="46" r="16" fill="#fffbe8" filter="url(#soft-glow)" />
        <circle cx="1232" cy="42" r="14" fill="#140b1e" />

        {/* 2. Deep Skyline Silhouettes */}
        <rect x="40" y="70" width="65" height="120" rx="2" fill="url(#skyline-far)" />
        <rect x="115" y="55" width="80" height="135" rx="2" fill="url(#skyline-far)" />
        <rect x="260" y="65" width="70" height="125" rx="2" fill="url(#skyline-far)" />
        <rect x="360" y="45" width="95" height="145" rx="2" fill="url(#skyline-far)" />
        <rect x="740" y="50" width="85" height="140" rx="2" fill="url(#skyline-far)" />
        <rect x="980" y="40" width="90" height="150" rx="2" fill="url(#skyline-far)" />
        <rect x="1140" y="65" width="75" height="125" rx="2" fill="url(#skyline-far)" />
        <rect x="1290" y="50" width="85" height="140" rx="2" fill="url(#skyline-far)" />

        {/* Background Skyline Tiny Window Dots */}
        {[80, 140, 280, 390, 760, 1010, 1160, 1320].map((wx, i) => (
          <g key={i} opacity="0.45">
            <rect x={wx} y={80} width="2.5" height="4" fill="#ffd080" />
            <rect x={wx + 10} y={92} width="2.5" height="4" fill="#ffd080" />
            <rect x={wx + 5} y={110} width="2.5" height="4" fill="#ffd080" />
            <rect x={wx + 16} y={125} width="2.5" height="4" fill="#ffd080" />
          </g>
        ))}

        {/* 3. Left Cottage & Garden */}
        <path d={`M40,${base - 38} L75,${base - 62} L110,${base - 38} Z`} fill="#1c121d" stroke="#0e070f" strokeWidth="1.5" />
        <rect x="48" y={base - 38} width="54" height="34" rx="2" fill="#241825" />
        <rect x="64" y={base - 26} width="14" height="22" rx="1.5" fill="#ffb444" opacity="0.8" filter="url(#soft-glow)" />

        {/* Trees Left */}
        <circle cx="130" cy={base - 40} r="24" fill="#0d2417" />
        <circle cx="145" cy={base - 48} r="28" fill="#133621" />

        {/* Bench Left */}
        <rect x="180" y={base - 14} width="28" height="3" rx="1" fill="#321e16" />
        <rect x="180" y={base - 20} width="28" height="3" rx="1" fill="#321e16" />
        <rect x="183" y={base - 20} width="2.5" height="9" fill="#111" />
        <rect x="202" y={base - 20} width="2.5" height="9" fill="#111" />

        {/* 4. "EXPRESS SHOP" (Left Retail Hub) */}
        <g id="express-shop">
          <rect x="230" y={base - 84} width="150" height="80" rx="5" fill="#18131d" stroke="#2b1c2b" strokeWidth="2" />
          <rect x="238" y={base - 100} width="134" height="22" rx="4" fill="#b11a2a" stroke="#ff3850" strokeWidth="1.5" filter="url(#soft-glow)" />
          <text x="305" y={base - 85} textAnchor="middle" className="neon-shop-label">EXPRESS SHOP</text>
          {/* Glass display */}
          <rect x="242" y={base - 72} width="126" height="66" rx="3" fill="url(#shop-red-glow)" stroke="#ff4d63" strokeWidth="1" strokeOpacity="0.6" />
          {/* Interior frames */}
          <line x1="284" y1={base - 72} x2="284" y2={base - 6} stroke="#381d26" strokeWidth="1.5" />
          <line x1="326" y1={base - 72} x2="326" y2={base - 6} stroke="#381d26" strokeWidth="1.5" />
          <rect x="290" y={base - 58} width="30" height="52" rx="2" fill="#ffd470" opacity="0.45" filter="url(#soft-glow)" />
        </g>

        {/* Streetlamp 1 */}
        <g id="lamp-1">
          <line x1="405" y1={base - 4} x2="405" y2={base - 75} stroke="#2c2d38" strokeWidth="3" strokeLinecap="round" />
          <circle cx="405" cy={base - 76} r="4" fill="#fffcee" />
          <circle cx="405" cy={base - 76} r="14" fill="#ffa71a" opacity="0.75" filter="url(#cinematic-blur)" />
          <polygon points={`398,${base - 74} 412,${base - 74} 445,${base + 45} 365,${base + 45}`} fill="url(#lamp-cone)" opacity="0.4" />
        </g>

        {/* Trees & Bench mid */}
        <circle cx="445" cy={base - 44} r="26" fill="#11311f" />
        <circle cx="465" cy={base - 52} r="28" fill="#19472b" />

        {/* 5. CENTERPIECE: NOYON TELECOM SHOWROOM */}
        <g id="noyon-telecom-hq">
          {/* Exterior Glow Halo */}
          <ellipse cx="610" cy={base - 50} rx="160" ry="85" fill="#ff9900" opacity="0.22" filter="url(#cinematic-blur)" />

          {/* Building Architecture Frame */}
          <rect x="495" y={base - 128} width="230" height="124" rx="8" fill="#111219" stroke="#2e3142" strokeWidth="2.5" />

          {/* Glowing Facade Header Sign */}
          <rect x="508" y={base - 146} width="204" height="30" rx="6" fill="#090a10" stroke="#ff9000" strokeWidth="2" filter="url(#soft-glow)" />
          {/* Noyon Icon Logo */}
          <rect x="522" y={base - 138} width="15" height="15" rx="4" fill="#e60023" />
          <path d={`M526,${base - 127} L526,${base - 134} Q529.5,${base - 137} 533,${base - 134} L533,${base - 127}`} fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
          {/* Main Name */}
          <text x="618" y={base - 126} textAnchor="middle" className="neon-brand-title">Noyon Telecom</text>

          {/* Floor to Ceiling Architectural Glass Storefront */}
          <rect x="507" y={base - 96} width="206" height="92" rx="4" fill="url(#interior-gold-glow)" stroke="#ffb944" strokeWidth="1.5" strokeOpacity="0.6" />

          {/* Interior Elements: Display Screen / Mobile Parts Wall */}
          <rect x="520" y={base - 78} width="50" height="66" rx="3" fill="#181a24" stroke="#484b5c" strokeWidth="1" />
          <rect x="526" y={base - 72} width="38" height="50" rx="2" fill="#ff385c" opacity="0.85" filter="url(#soft-glow)" />

          {/* Glass Doors (Modern Twin Sliders) */}
          <line x1="610" y1={base - 96} x2="610" y2={base - 4} stroke="#44495c" strokeWidth="2" />
          <line x1="575" y1={base - 96} x2="575" y2={base - 4} stroke="#2c2f3d" strokeWidth="1.5" />
          <line x1="645" y1={base - 96} x2="645" y2={base - 4} stroke="#2c2f3d" strokeWidth="1.5" />

          {/* Right Display Counter */}
          <rect x="650" y={base - 78} width="50" height="66" rx="3" fill="#181a24" stroke="#484b5c" strokeWidth="1" />
          <circle cx="675" cy={base - 50} r="16" fill="#ffd066" opacity="0.8" filter="url(#soft-glow)" />

          {/* Front Entrance Light Flood onto Street */}
          <polygon points={`507,${base - 4} 713,${base - 4} 765,${base + 48} 455,${base + 48}`} fill="url(#lamp-cone)" opacity="0.45" />
        </g>

        {/* Mid-Right Tree & Lamp */}
        <circle cx="755" cy={base - 46} r="26" fill="#102e1d" />
        <circle cx="778" cy={base - 55} r="30" fill="#19472b" />

        {/* Streetlamp 2 */}
        <g id="lamp-2">
          <line x1="815" y1={base - 4} x2="815" y2={base - 75} stroke="#2c2d38" strokeWidth="3" strokeLinecap="round" />
          <circle cx="815" cy={base - 76} r="4" fill="#fffcee" />
          <circle cx="815" cy={base - 76} r="14" fill="#ffa71a" opacity="0.75" filter="url(#cinematic-blur)" />
          <polygon points={`808,${base - 74} 822,${base - 74} 855,${base + 45} 775,${base + 45}`} fill="url(#lamp-cone)" opacity="0.4" />
        </g>

        {/* 6. "PARTS HOUSE" (Right Wholesale Center) */}
        <g id="parts-house">
          <rect x="850" y={base - 84} width="150" height="80" rx="5" fill="#18131d" stroke="#2b1c2b" strokeWidth="2" />
          <rect x="858" y={base - 100} width="134" height="22" rx="4" fill="#b11a2a" stroke="#ff3850" strokeWidth="1.5" filter="url(#soft-glow)" />
          <text x="925" y={base - 85} textAnchor="middle" className="neon-shop-label">PARTS HOUSE</text>
          <rect x="862" y={base - 72} width="126" height="66" rx="3" fill="url(#shop-red-glow)" stroke="#ff4d63" strokeWidth="1" strokeOpacity="0.6" />
          <line x1="904" y1={base - 72} x2="904" y2={base - 6} stroke="#381d26" strokeWidth="1.5" />
          <line x1="946" y1={base - 72} x2="946" y2={base - 6} stroke="#381d26" strokeWidth="1.5" />
          <rect x="910" y={base - 58} width="30" height="52" rx="2" fill="#ffd470" opacity="0.45" filter="url(#soft-glow)" />
        </g>

        {/* Streetlamp 3 */}
        <g id="lamp-3">
          <line x1="1035" y1={base - 4} x2="1035" y2={base - 75} stroke="#2c2d38" strokeWidth="3" strokeLinecap="round" />
          <circle cx="1035" cy={base - 76} r="4" fill="#fffcee" />
          <circle cx="1035" cy={base - 76} r="14" fill="#ffa71a" opacity="0.75" filter="url(#cinematic-blur)" />
          <polygon points={`1028,${base - 74} 1042,${base - 74} 1075,${base + 45} 995,${base + 45}`} fill="url(#lamp-cone)" opacity="0.4" />
        </g>

        {/* Trees Right */}
        <circle cx="1075" cy={base - 44} r="25" fill="#123320" />
        <circle cx="1100" cy={base - 52} r="28" fill="#1b4b2e" />

        {/* Right Pavilion Cottage */}
        <path d={`M1135,${base - 38} L1170,${base - 62} L1205,${base - 38} Z`} fill="#1c121d" stroke="#0e070f" strokeWidth="1.5" />
        <rect x="1143" y={base - 38} width="54" height="34" rx="2" fill="#241825" />
        <rect x="1159" y={base - 26} width="14" height="22" rx="1.5" fill="#ffb444" opacity="0.8" filter="url(#soft-glow)" />

        {/* Streetlamp 4 */}
        <g id="lamp-4">
          <line x1="1235" y1={base - 4} x2="1235" y2={base - 75} stroke="#2c2d38" strokeWidth="3" strokeLinecap="round" />
          <circle cx="1235" cy={base - 76} r="4" fill="#fffcee" />
          <circle cx="1235" cy={base - 76} r="14" fill="#ffa71a" opacity="0.75" filter="url(#cinematic-blur)" />
          <polygon points={`1228,${base - 74} 1242,${base - 74} 1275,${base + 45} 1195,${base + 45}`} fill="url(#lamp-cone)" opacity="0.4" />
        </g>

        <circle cx="1285" cy={base - 44} r="25" fill="#123320" />
        <circle cx="1310" cy={base - 54} r="30" fill="#1b4b2e" />

        {/* 7. Sidewalk Curb */}
        <rect x="0" y={base - 5} width="1440" height="6" fill="#181a24" />
        <line x1="0" y1={base - 5} x2="1440" y2={base - 5} stroke="#3b3e52" strokeWidth="1.5" />

        {/* 8. Wet Asphalt Ground with Mirror Reflections */}
        <rect x="0" y={base + 1} width="1440" height="49" fill="#07080c" />
        
        {/* Soft Wet Pavement Glows directly under lit shops */}
        <rect x="230" y={base + 1} width="150" height="49" fill="url(#wet-red-reflection)" />
        <rect x="470" y={base + 1} width="280" height="49" fill="url(#wet-road-reflection)" />
        <rect x="850" y={base + 1} width="150" height="49" fill="url(#wet-red-reflection)" />

        {/* Polished Road Edge Light & Lane Marks */}
        <line x1="0" y1={base + 1} x2="1440" y2={base + 1} stroke="#ffd27d" strokeWidth="1.5" strokeOpacity="0.4" />
        <line x1="0" y1={base + 24} x2="1440" y2={base + 24} stroke="#2e3344" strokeWidth="2" strokeDasharray="30 20" />
      </svg>

      {/* 9. Car with Headlights & Taillights */}
      <div className="cityscape-car-lane">
        <div className="cityscape-car">
          <svg viewBox="0 0 130 40">
            {/* Front Headlight Light Beam */}
            <polygon points="20,24 0,14 0,34" fill="url(#lamp-cone)" opacity="0.6" />
            
            {/* Red Sedan Chassis */}
            <path d="M22 23 Q21 14 32 12 Q37 4 52 4 L72 4 Q84 4 88 12 Q100 14 98 23 Q98 26 94 26 L26 26 Q22 26 22 23 Z" fill="#d91829" />
            <path d="M35 12 Q39 7 52 7 L72 7 Q81 7 86 12 Z" fill="#180407" />
            
            {/* Wheels */}
            <circle cx="39" cy="26" r="6.5" fill="#0e0f14" stroke="#4b4d5a" strokeWidth="1.5" />
            <circle cx="81" cy="26" r="6.5" fill="#0e0f14" stroke="#4b4d5a" strokeWidth="1.5" />
            <circle cx="39" cy="26" r="2.5" fill="#ddd" />
            <circle cx="81" cy="26" r="2.5" fill="#ddd" />
            
            {/* Glowing Taillight */}
            <circle cx="97" cy="18" r="2.5" fill="#ff0022" filter="url(#soft-glow)" />
          </svg>
        </div>
      </div>

      {/* 10. Delivery Cyclist */}
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