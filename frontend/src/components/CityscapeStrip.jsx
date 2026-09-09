import React from 'react';

export default function CityscapeStrip() {
  const roadY = 186;

  return (
    <div className="cityscape-wrap" aria-hidden="true">
      <style>{`
        .cityscape-wrap {
          position: relative;
          width: 100%;
          height: 220px;
          overflow: hidden;
          background: #08060e;
        }

        .cityscape-svg {
          width: 100%;
          height: 100%;
          display: block;
        }

        /* -------------------------------------------
           মোবাইল এবং ট্যাবলেট রেসপনসিভ অ্যাডজাস্টমেন্ট
        ------------------------------------------- */
        @media (max-width: 768px) {
          .cityscape-wrap {
            height: 140px;
          }
        }

        /* -------------------------------------------
           চলন্ত গাড়ির অ্যানিমেশন (ডান থেকে বামে)
        ------------------------------------------- */
        .traffic-car-lane {
          position: absolute;
          bottom: 14px;
          left: 0;
          width: 100%;
          pointer-events: none;
          animation: runTrafficLeft 15s linear infinite;
        }
        .traffic-car {
          width: 88px;
          filter: drop-shadow(0 4px 6px rgba(0,0,0,0.8));
        }

        /* -------------------------------------------
           চলন্ত সাইকেলের অ্যানিমেশন (ধীর গতিতে বামে)
        ------------------------------------------- */
        .traffic-bike-lane {
          position: absolute;
          bottom: 11px;
          left: 0;
          width: 100%;
          pointer-events: none;
          animation: runTrafficLeft 25s linear infinite;
        }
        .traffic-bike {
          width: 36px;
          filter: drop-shadow(0 3px 5px rgba(0,0,0,0.8));
        }

        @media (max-width: 768px) {
          .traffic-car { width: 66px; }
          .traffic-bike { width: 26px; }
          .traffic-car-lane { bottom: 9px; animation-duration: 11s; }
          .traffic-bike-lane { bottom: 7px; animation-duration: 18s; }
        }

        @keyframes runTrafficLeft {
          0%   { transform: translateX(105vw); }
          100% { transform: translateX(-180px); }
        }

        /* চাকা ও প্যাডেল ঘোরার অ্যানিমেশন (বাম দিকে চলার জন্য কাউন্টার-ক্লকওয়াইজ) */
        .bike-wheel-spin {
          transform-origin: center;
          animation: spinCounterClockwise 0.65s linear infinite;
        }
        .bike-pedal-spin {
          transform-origin: 32px 30px;
          animation: spinCounterClockwise 1.3s linear infinite;
        }

        @keyframes spinCounterClockwise {
          from { transform: rotate(0deg); }
          to   { transform: rotate(-360deg); }
        }

        /* টাইপোগ্রাফি ও গ্লো */
        .brand-heading {
          font-family: 'Poppins', system-ui, -apple-system, sans-serif;
          font-weight: 800;
          fill: #ffffff;
          letter-spacing: 1.6px;
        }
        .shop-heading {
          font-family: 'Poppins', system-ui, -apple-system, sans-serif;
          font-weight: 800;
          letter-spacing: 1.2px;
          fill: #ffffff;
        }
      `}</style>

      {/* ====================================================
          মূল সিনেমাটিক আর্টওয়ার্ক (HIGH-DETAIL SCENE)
      ==================================================== */}
      <svg viewBox="0 0 1600 240" preserveAspectRatio="xMidYMax slice" className="cityscape-svg">
        <defs>
          {/* গোধূলি আকাশের সমৃদ্ধ গ্রেডিয়েন্ট */}
          <linearGradient id="twilight-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0b0818" />
            <stop offset="30%" stopColor="#1e0c28" />
            <stop offset="60%" stopColor="#4f1533" />
            <stop offset="85%" stopColor="#aa3926" />
            <stop offset="100%" stopColor="#df6422" />
          </linearGradient>

          {/* পেছনের বহুতল ভবনের জন্য সিলুয়েট গ্রেডিয়েন্ট */}
          <linearGradient id="distant-skyline" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1a0e23" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#0d0612" stopOpacity="0.95" />
          </linearGradient>

          {/* শোরুমের অভ্যন্তরীণ সোনালী আলোর আভা */}
          <linearGradient id="interior-gold" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fff7e0" stopOpacity="0.9" />
            <stop offset="40%" stopColor="#ffb944" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#ff7b18" stopOpacity="0.15" />
          </linearGradient>

          {/* লাল দোকানের ভেতরের আলো */}
          <linearGradient id="interior-red" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ff9999" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#b31224" stopOpacity="0.25" />
          </linearGradient>

          {/* স্ট্রিট ল্যাম্পের আলোর কোণ */}
          <linearGradient id="light-beam-cone" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffe28a" stopOpacity="0.85" />
            <stop offset="60%" stopColor="#ffae19" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#ff9900" stopOpacity="0" />
          </linearGradient>

          {/* ভেজা রাস্তার রিফ্লেকশন গ্রেডিয়েন্ট */}
          <linearGradient id="road-gold-refl" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffb53b" stopOpacity="0.55" />
            <stop offset="45%" stopColor="#ff7a00" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#08060e" stopOpacity="0" />
          </linearGradient>

          <linearGradient id="road-red-refl" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ff2a44" stopOpacity="0.45" />
            <stop offset="50%" stopColor="#b30018" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#08060e" stopOpacity="0" />
          </linearGradient>

          {/* সফট ব্লার ফিল্টার */}
          <filter id="cinematic-glow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="5" />
          </filter>
          <filter id="subtle-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="1.8" />
          </filter>
        </defs>

        {/* ১. আকাশ ও সূর্যাস্তের মেঘ */}
        <rect x="0" y="0" width="1600" height="240" fill="url(#twilight-sky)" />
        <ellipse cx="280" cy="120" rx="180" ry="24" fill="#3a1127" opacity="0.4" filter="url(#cinematic-glow)" />
        <ellipse cx="880" cy="110" rx="260" ry="30" fill="#46132c" opacity="0.38" filter="url(#cinematic-glow)" />
        <ellipse cx="1320" cy="100" rx="160" ry="22" fill="#330d24" opacity="0.45" filter="url(#cinematic-glow)" />

        {/* ক্রিসেন্ট চাঁদ */}
        <circle cx="1360" cy="46" r="15" fill="#fffbe6" filter="url(#subtle-glow)" />
        <circle cx="1367" cy="42" r="13" fill="#130a1c" />

        {/* ২. দূরবর্তী শহরের স্কাইলাইন (Distant Skyline) */}
        <rect x="50" y="70" width="60" height="120" rx="2" fill="url(#distant-skyline)" />
        <rect x="120" y="55" width="80" height="135" rx="2" fill="url(#distant-skyline)" />
        <rect x="270" y="65" width="65" height="125" rx="2" fill="url(#distant-skyline)" />
        <rect x="365" y="45" width="90" height="145" rx="2" fill="url(#distant-skyline)" />
        <rect x="800" y="50" width="85" height="140" rx="2" fill="url(#distant-skyline)" />
        <rect x="1040" y="40" width="90" height="150" rx="2" fill="url(#distant-skyline)" />
        <rect x="1210" y="65" width="75" height="125" rx="2" fill="url(#distant-skyline)" />
        <rect x="1390" y="50" width="85" height="140" rx="2" fill="url(#distant-skyline)" />

        {/* টেলিকম নেটওয়ার্ক টাওয়ার */}
        <line x1="1470" y1="50" x2="1470" y2="12" stroke="#2c142b" strokeWidth="2" />
        <circle cx="1470" cy="12" r="2.5" fill="#ff2233" filter="url(#subtle-glow)" />

        {/* ৩. বাম পাশের কটেজ ও গাছপালা */}
        <path d={`M40,${roadY - 38} L75,${roadY - 62} L110,${roadY - 38} Z`} fill="#1a111c" stroke="#0e0710" strokeWidth="1.5" />
        <rect x="48" y={roadY - 38} width="54" height="34" rx="2" fill="#221624" />
        <rect x="64" y={roadY - 26} width="14" height="20" rx="1.5" fill="#ffb03a" opacity="0.85" filter="url(#subtle-glow)" />

        <circle cx="135" cy={roadY - 42} r="25" fill="#0d2417" />
        <circle cx="155" cy={roadY - 50} r="28" fill="#133621" />
        <rect x="195" y={roadY - 14} width="28" height="3" rx="1" fill="#321e16" />
        <rect x="195" y={roadY - 20} width="28" height="3" rx="1" fill="#321e16" />

        {/* স্ট্রিট ল্যাম্প ১ */}
        <line x1="240" y1={roadY - 4} x2="240" y2={roadY - 78} stroke="#2a2c38" strokeWidth="3" strokeLinecap="round" />
        <circle cx="240" cy={roadY - 79} r="4" fill="#fffbee" />
        <circle cx="240" cy={roadY - 79} r="14" fill="#ffa71a" opacity="0.75" filter="url(#cinematic-glow)" />
        <polygon points={`234,${roadY - 77} 246,${roadY - 77} 275,${roadY + 54} 205,${roadY + 54}`} fill="url(#light-beam-cone)" opacity="0.38" />

        {/* ৪. EXPRESS SHOP (বাম পাশের দোকান) */}
        <rect x="275" y={roadY - 84} width="155" height="80" rx="5" fill="#16121b" stroke="#2a1a29" strokeWidth="2" />
        <rect x="283" y={roadY - 100} width="139" height="22" rx="4" fill="#b01828" stroke="#ff364e" strokeWidth="1.5" filter="url(#subtle-glow)" />
        <text x="352" y={roadY - 85} textAnchor="middle" fontSize="10" className="shop-heading">EXPRESS SHOP</text>
        <rect x="287" y={roadY - 72} width="131" height="66" rx="3" fill="url(#interior-red)" stroke="#ff4d63" strokeWidth="1" strokeOpacity="0.5" />
        <line x1="330" y1={roadY - 72} x2="330" y2={roadY - 6} stroke="#381d26" strokeWidth="1.5" />
        <line x1="375" y1={roadY - 72} x2="375" y2={roadY - 6} stroke="#381d26" strokeWidth="1.5" />
        <rect x="338" y={roadY - 58} width="30" height="52" rx="2" fill="#ffd470" opacity="0.45" filter="url(#subtle-glow)" />

        {/* স্ট্রিট ল্যাম্প ২ ও গাছ */}
        <circle cx="465" cy={roadY - 44} r="25" fill="#102f1e" />
        <circle cx="488" cy={roadY - 52} r="29" fill="#18462b" />
        <line x1="535" y1={roadY - 4} x2="535" y2={roadY - 78} stroke="#2a2c38" strokeWidth="3" strokeLinecap="round" />
        <circle cx="535" cy={roadY - 79} r="4" fill="#fffbee" />
        <circle cx="535" cy={roadY - 79} r="14" fill="#ffa71a" opacity="0.75" filter="url(#cinematic-glow)" />
        <polygon points={`529,${roadY - 77} 541,${roadY - 77} 570,${roadY + 54} 500,${roadY + 54}`} fill="url(#light-beam-cone)" opacity="0.38" />

        {/* ৫. মূল কেন্দ্রবিন্দু: NOYON TELECOM SHOWROOM */}
        <g id="noyon-flagship">
          <ellipse cx="690" cy={roadY - 50} rx="180" ry="90" fill="#ff9900" opacity="0.2" filter="url(#cinematic-glow)" />
          {/* মূল ভবন ফ্রেম */}
          <rect x="580" y={roadY - 130} width="235" height="126" rx="8" fill="#0f1118" stroke="#2c2f40" strokeWidth="2.5" />
          {/* ছাদের আলোকিত নিয়ন সাইনবোর্ড */}
          <rect x="592" y={roadY - 150} width="211" height="32" rx="6" fill="#08090f" stroke="#ff9400" strokeWidth="2" filter="url(#subtle-glow)" />
          <rect x="608" y={roadY - 141} width="16" height="16" rx="4" fill="#e60023" />
          <path d={`M612,${roadY - 130} L612,${roadY - 137} Q616,${roadY - 140} 620,${roadY - 137} L620,${roadY - 130}`} fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
          <text x="704" y={roadY - 128} textAnchor="middle" fontSize="13.5" className="brand-heading">NOYON TELECOM</text>
          
          {/* বড় আধুনিক গ্লাস ফ্রন্ট */}
          <rect x="592" y={roadY - 96} width="211" height="92" rx="4" fill="url(#interior-gold)" stroke="#ffb944" strokeWidth="1.5" strokeOpacity="0.6" />
          {/* ডিসপ্লে ওয়াল স্ক্রিন ও শোরুম ইন্টারিয়র */}
          <rect x="606" y={roadY - 78} width="52" height="66" rx="3" fill="#181a24" stroke="#484b5c" strokeWidth="1" />
          <rect x="612" y={roadY - 72} width="40" height="50" rx="2" fill="#ff385c" opacity="0.85" filter="url(#subtle-glow)" />
          {/* মাঝখানের স্লাইডিং কাঁচের দরজা */}
          <line x1="697" y1={roadY - 96} x2="697" y2={roadY - 4} stroke="#44495c" strokeWidth="2" />
          <line x1="660" y1={roadY - 96} x2="660" y2={roadY - 4} stroke="#2c2f3d" strokeWidth="1.5" />
          <line x1="734" y1={roadY - 96} x2="734" y2={roadY - 4} stroke="#2c2f3d" strokeWidth="1.5" />
          {/* ডানপাশের ডিসপ্লে কাউন্টার */}
          <rect x="739" y={roadY - 78} width="52" height="66" rx="3" fill="#181a24" stroke="#484b5c" strokeWidth="1" />
          <circle cx="765" cy={roadY - 50} r="16" fill="#ffd066" opacity="0.8" filter="url(#subtle-glow)" />
          {/* রাস্তায় আলোর প্লাবন */}
          <polygon points={`592,${roadY - 4} 803,${roadY - 4} 855,${roadY + 54} 540,${roadY + 54}`} fill="url(#light-beam-cone)" opacity="0.48" />
        </g>

        {/* স্ট্রিট ল্যাম্প ৩ ও গাছ */}
        <circle cx="850" cy={roadY - 46} r="25" fill="#102f1e" />
        <circle cx="875" cy={roadY - 55} r="29" fill="#18462b" />
        <line x1="920" y1={roadY - 4} x2="920" y2={roadY - 78} stroke="#2a2c38" strokeWidth="3" strokeLinecap="round" />
        <circle cx="920" cy={roadY - 79} r="4" fill="#fffbee" />
        <circle cx="920" cy={roadY - 79} r="14" fill="#ffa71a" opacity="0.75" filter="url(#cinematic-glow)" />
        <polygon points={`914,${roadY - 77} 926,${roadY - 77} 955,${roadY + 54} 885,${roadY + 54}`} fill="url(#light-beam-cone)" opacity="0.38" />

        {/* ৬. PARTS HOUSE (ডান পাশের পাইকারি হাব) */}
        <rect x="960" y={roadY - 84} width="155" height="80" rx="5" fill="#16121b" stroke="#2a1a29" strokeWidth="2" />
        <rect x="968" y={roadY - 100} width="139" height="22" rx="4" fill="#b01828" stroke="#ff364e" strokeWidth="1.5" filter="url(#subtle-glow)" />
        <text x="1037" y={roadY - 85} textAnchor="middle" fontSize="10" className="shop-heading">PARTS HOUSE</text>
        <rect x="972" y={roadY - 72} width="131" height="66" rx="3" fill="url(#interior-red)" stroke="#ff4d63" strokeWidth="1" strokeOpacity="0.5" />
        <line x1="1015" y1={roadY - 72} x2="1015" y2={roadY - 6} stroke="#381d26" strokeWidth="1.5" />
        <line x1="1060" y1={roadY - 72} x2="1060" y2={roadY - 6} stroke="#381d26" strokeWidth="1.5" />
        <rect x="1023" y={roadY - 58} width="30" height="52" rx="2" fill="#ffd470" opacity="0.45" filter="url(#subtle-glow)" />

        {/* স্ট্রিট ল্যাম্প ৪ ও ডানপাশের ঘর */}
        <line x1="1150" y1={roadY - 4} x2="1150" y2={roadY - 78} stroke="#2a2c38" strokeWidth="3" strokeLinecap="round" />
        <circle cx="1150" cy={roadY - 79} r="4" fill="#fffbee" />
        <circle cx="1150" cy={roadY - 79} r="14" fill="#ffa71a" opacity="0.75" filter="url(#cinematic-glow)" />
        <polygon points={`1144,${roadY - 77} 1156,${roadY - 77} 1185,${roadY + 54} 1115,${roadY + 54}`} fill="url(#light-beam-cone)" opacity="0.38" />

        <path d={`M1195,${roadY - 38} L1230,${roadY - 62} L1265,${roadY - 38} Z`} fill="#1a111c" stroke="#0e0710" strokeWidth="1.5" />
        <rect x="1203" y={roadY - 38} width="54" height="34" rx="2" fill="#221624" />
        <rect x="1219" y={roadY - 26} width="14" height="20" rx="1.5" fill="#ffb03a" opacity="0.85" filter="url(#subtle-glow)" />

        {/* ৭. ফুটপাত কার্ব */}
        <rect x="0" y={roadY - 5} width="1600" height="6" fill="#161822" />
        <line x1="0" y1={roadY - 5} x2="1600" y2={roadY - 5} stroke="#383c4e" strokeWidth="1.5" />

        {/* ৮. ভেজা পিচঢালা রাস্তা ও রিয়েলিস্টিক আলোর প্রতিফলন (WET ROAD REFLECTIONS) */}
        <rect x="0" y={roadY + 1} width="1600" height="54" fill="#06070a" />

        {/* দোকানের নিচের চকচকে ভার্টিক্যাল রিফ্লেকশন পুল */}
        <rect x="275" y={roadY + 1} width="155" height="53" fill="url(#road-red-refl)" />
        <rect x="560" y={roadY + 1} width="290" height="53" fill="url(#road-gold-refl)" />
        <rect x="960" y={roadY + 1} width="155" height="53" fill="url(#road-red-refl)" />

        {/* প্রতিটি ল্যাম্পের নিচের চিকচিক করা আলোর রিফ্লেকশন পিলার */}
        {[240, 535, 920, 1150].map((lx) => (
          <ellipse key={lx} cx={lx} cy={roadY + 16} rx="14" ry="12" fill="#ffe28a" opacity="0.3" filter="url(#subtle-glow)" />
        ))}

        {/* রাস্তার লেন মার্কিং */}
        <line x1="0" y1={roadY + 1} x2="1600" y2={roadY + 1} stroke="#ffd27d" strokeWidth="1" strokeOpacity="0.35" />
        <line x1="0" y1={roadY + 26} x2="1600" y2={roadY + 26} stroke="#282d3c" strokeWidth="2" strokeDasharray="32 22" />
      </svg>

      {/* ====================================================
          সঠিক দিকে (বামে মুখ করে) চলন্ত লাল গাড়ি
      ==================================================== */}
      <div className="traffic-car-lane">
        <div className="traffic-car">
          <svg viewBox="0 0 140 42">
            {/* হেডলাইটের আলো (সামনে বামে ছড়াচ্ছে) */}
            <polygon points="20,24 -25,12 -25,38" fill="url(#light-beam-cone)" opacity="0.75" />
            {/* গাড়ির লাল বডি (বামে মুখ করা) */}
            <path d="M18 24 Q18 16 30 14 Q38 5 56 5 L82 5 Q98 5 106 14 Q122 16 122 24 Q122 28 116 28 L24 28 Q18 28 18 24 Z" fill="#b81423" />
            <path d="M34 14 Q40 8 56 8 L82 8 Q94 8 102 14 Z" fill="#0d0305" />
            {/* চাকা দুটি */}
            <circle cx="38" cy="28" r="7" fill="#0a0a0c" stroke="#444" strokeWidth="1.5" />
            <circle cx="98" cy="28" r="7" fill="#0a0a0c" stroke="#444" strokeWidth="1.5" />
            <circle cx="38" cy="28" r="2.8" fill="#bbb" />
            <circle cx="98" cy="28" r="2.8" fill="#bbb" />
            {/* পেছনের ডানপাশের লাল টেললাইট */}
            <circle cx="121" cy="20" r="2.5" fill="#ff1133" filter="drop-shadow(0 0 3px #ff1133)" />
          </svg>
        </div>
      </div>

      {/* ====================================================
          সঠিক দিকে (বামে মুখ করে) চলন্ত সাইকেল ও রাইডার
      ==================================================== */}
      <div className="traffic-bike-lane">
        <div className="traffic-bike">
          <svg viewBox="0 0 65 60">
            {/* সামনের চাকা (বামে) */}
            <g className="bike-wheel-spin" style={{ transformOrigin: '14px 44px' }}>
              <circle cx="14" cy="44" r="11" fill="none" stroke="#ffb300" strokeWidth="2" />
              <line x1="14" y1="33" x2="14" y2="55" stroke="#ffb300" strokeWidth="1.2" />
              <line x1="3" y1="44" x2="25" y2="44" stroke="#ffb300" strokeWidth="1.2" />
            </g>
            {/* পেছনের চাকা (ডানে) */}
            <g className="bike-wheel-spin" style={{ transformOrigin: '48px 44px' }}>
              <circle cx="48" cy="44" r="11" fill="none" stroke="#ffb300" strokeWidth="2" />
              <line x1="48" y1="33" x2="48" y2="55" stroke="#ffb300" strokeWidth="1.2" />
              <line x1="37" y1="44" x2="59" y2="44" stroke="#ffb300" strokeWidth="1.2" />
            </g>

            {/* সাইকেলের সাদা ফ্রেম */}
            <path d="M14 44 L26 26 L48 44 L32 44 L22 30" fill="none" stroke="#f3f4f6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            <line x1="26" y1="26" x2="22" y2="22" stroke="#f3f4f6" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="19" y1="22" x2="25" y2="22" stroke="#f3f4f6" strokeWidth="2" strokeLinecap="round" />
            <line x1="36" y1="28" x2="44" y2="28" stroke="#111" strokeWidth="2.5" strokeLinecap="round" />

            {/* সাইক্লিস্ট রাইডার (বামে ঝুঁকে প্যাডেল করছে) */}
            <circle cx="28" cy="11" r="4.5" fill="#ffcc00" />
            {/* শরীর ও পিঠের ডেলিভারি ব্যাগ */}
            <path d="M40 28 L30 16 L22 23" fill="none" stroke="#ffcc00" strokeWidth="3.5" strokeLinecap="round" />
            <rect x="33" y="16" width="6" height="8" rx="2" fill="#e60023" />
            {/* পা ও প্যাডেল */}
            <path d="M40 28 L34 37 L32 44" fill="none" stroke="#ffcc00" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>
    </div>
  );
}