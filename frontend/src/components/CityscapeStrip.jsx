// Decorative animated street scene for the footer — original artwork (not
// sourced from anywhere), styled after a flat-vector "city street" scene:
// soft rounded building silhouettes with small lit windows, a labeled
// "Noyon Telecom" office, a shop with an awning, houses, trees, a lamp
// post and bench, and a car + a pedaling delivery cyclist that loop
// continuously along the road — ties into the "Fast Delivery" branding
// used elsewhere (FeatureStrip, hero badges).

function Windows({ x, y, w, h, cols, rows }) {
  const pad = 9;
  const cellW = (w - pad * 2) / cols;
  const cellH = (h - pad * 2) / rows;
  const size = Math.min(cellW, cellH) * 0.4;
  const windows = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      // A few windows dark/dim rather than every one uniformly lit —
      // deterministic (not random) so the scene looks the same on every
      // render, but reads as a lived-in building instead of a grid.
      const seed = (r * 7 + c * 3) % 5;
      const dark = seed === 0;
      const dim = seed === 1;
      windows.push(
        <rect
          key={`${r}-${c}`}
          x={x + pad + c * cellW + (cellW - size) / 2}
          y={y + pad + r * cellH + (cellH - size) / 2}
          width={size}
          height={size}
          rx="1.5"
          className={dark ? 'cityscape-window-off' : 'cityscape-window'}
          opacity={dim ? 0.5 : undefined}
        />
      );
    }
  }
  return <>{windows}</>;
}

function OfficeBuilding({ x, w, h, base, cols, rows, label, accent }) {
  const y = base - h;
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx="6" className="cityscape-building" />
      {accent && <rect x={x} y={y} width={w} height={6} rx="3" className="cityscape-accent" />}
      <Windows x={x} y={y} w={w} h={h} cols={cols} rows={rows} />
      {label && (
        <text x={x + w / 2} y={y - 12} textAnchor="middle" className="cityscape-label">
          {label}
        </text>
      )}
    </g>
  );
}

function House({ x, w, h, base }) {
  const y = base - h;
  const roofH = h * 0.42;
  return (
    <g>
      <path
        d={`M${x - 6},${y + roofH} L${x + w / 2},${y - 4} L${x + w + 6},${y + roofH} Z`}
        className="cityscape-roof"
      />
      <rect x={x} y={y + roofH} width={w} height={h - roofH} rx="4" className="cityscape-building" />
      <rect x={x + w * 0.6} y={base - h * 0.4} width={w * 0.22} height={h * 0.4} rx="2" className="cityscape-door" />
      <rect x={x + w * 0.16} y={y + roofH + h * 0.18} width={w * 0.22} height={w * 0.22} rx="2" className="cityscape-window" />
    </g>
  );
}

function Shop({ x, w, h, base, label }) {
  const y = base - h;
  const awningH = h * 0.18;
  const stripes = 5;
  const stripeW = w / stripes;
  return (
    <g>
      <rect x={x} y={y + awningH} width={w} height={h - awningH} rx="4" className="cityscape-building" />
      <clipPath id={`awning-clip-${x}`}>
        <path d={`M${x - 4},${y + awningH} Q${x - 4},${y} ${x + 6},${y} L${x + w - 6},${y} Q${x + w + 4},${y} ${x + w + 4},${y + awningH} Z`} />
      </clipPath>
      <g clipPath={`url(#awning-clip-${x})`}>
        {Array.from({ length: stripes }).map((_, i) => (
          <rect
            key={i}
            x={x - 4 + i * stripeW}
            y={y}
            width={stripeW}
            height={awningH}
            className={i % 2 === 0 ? 'cityscape-awning-a' : 'cityscape-awning-b'}
          />
        ))}
      </g>
      <rect x={x + w * 0.32} y={base - h * 0.5} width={w * 0.36} height={h * 0.5} rx="2" className="cityscape-door" />
      <rect x={x + w * 0.08} y={y + awningH + h * 0.16} width={w * 0.18} height={w * 0.18} rx="2" className="cityscape-window" />
      <rect x={x + w * 0.74} y={y + awningH + h * 0.16} width={w * 0.18} height={w * 0.18} rx="2" className="cityscape-window" />
      <text x={x + w / 2} y={y + awningH - 7} textAnchor="middle" className="cityscape-shop-label">{label}</text>
    </g>
  );
}

function Tree({ x, base, big }) {
  const r = big ? 20 : 15;
  const cy = base - r * 1.5 - r * 0.6;
  return (
    <g>
      <rect x={x - 2.5} y={base - r * 1.5} width="5" height={r * 1.5} rx="2" className="cityscape-trunk" />
      {/* Three overlapping circles instead of one, for a fuller/organic
          canopy shape rather than a single perfect ball. */}
      <circle cx={x - r * 0.45} cy={cy + r * 0.25} r={r * 0.7} className="cityscape-foliage" />
      <circle cx={x + r * 0.45} cy={cy + r * 0.25} r={r * 0.7} className="cityscape-foliage" />
      <circle cx={x} cy={cy - r * 0.2} r={r * 0.8} className="cityscape-foliage" />
    </g>
  );
}

function Moon({ x, y }) {
  return (
    <g>
      <circle cx={x} cy={y} r="14" className="cityscape-moon" />
      {/* A crescent, made by overlapping a bg-colored circle offset to one
          side rather than a path — simplest way to get a clean crescent. */}
      <circle cx={x + 6} cy={y - 3} r="12" className="cityscape-moon-shadow" />
    </g>
  );
}

function Star({ x, y, r }) {
  return <circle cx={x} cy={y} r={r} className="cityscape-star" />;
}

function LampPost({ x, base }) {
  return (
    <g>
      <rect x={x - 2} y={base - 60} width="4" height="60" rx="2" className="cityscape-lamp-pole" />
      <circle cx={x} cy={base - 62} r="7" className="cityscape-lamp-glow" />
    </g>
  );
}

function Bench({ x, base }) {
  return (
    <g>
      <rect x={x} y={base - 16} width="34" height="4" rx="2" className="cityscape-bench" />
      <rect x={x} y={base - 24} width="34" height="4" rx="2" className="cityscape-bench" />
      <rect x={x + 2} y={base - 24} width="3" height="12" className="cityscape-bench" />
      <rect x={x + 29} y={base - 24} width="3" height="12" className="cityscape-bench" />
    </g>
  );
}

export default function CityscapeStrip() {
  const base = 190;

  return (
    <div className="cityscape-strip" aria-hidden="true">
      <svg viewBox="0 0 1400 210" preserveAspectRatio="xMidYMax slice" className="cityscape-skyline">
        <defs>
          {/* Subtle top-to-bottom shading on every building for a little
              depth, instead of flat single-tone silhouettes. */}
          <linearGradient id="cityscape-building-shade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3a1220" />
            <stop offset="100%" stopColor="#20090f" />
          </linearGradient>
        </defs>
        {/* Night sky — a moon + scattered stars above the skyline, filling
            the otherwise-empty upper half of the scene. */}
        <Moon x={1250} y={38} />
        <Star x={90} y={30} r="1.6" />
        <Star x={260} y={55} r="1.2" />
        <Star x={440} y={28} r="1.4" />
        <Star x={620} y={50} r="1.1" />
        <Star x={780} y={32} r="1.6" />
        <Star x={950} y={58} r="1.2" />
        <Star x={1100} y={26} r="1.4" />
        <Star x={1360} y={65} r="1.2" />

        <House x={20} w={80} h={70} base={base} />
        <Tree x={122} base={base} />
        <Shop x={146} w={132} h={94} base={base} label="EXPRESS SHOP" />
        <Bench x={296} base={base} />
        <OfficeBuilding x={352} w={100} h={118} base={base} cols={3} rows={4} />
        <LampPost x={470} base={base} />
        <OfficeBuilding x={492} w={156} h={170} base={base} cols={4} rows={6} label="NOYON TELECOM" accent />
        <Tree x={670} base={base} big />
        <OfficeBuilding x={696} w={92} h={104} base={base} cols={2} rows={4} />
        <House x={806} w={80} h={64} base={base} />
        <Tree x={904} base={base} />
        <Shop x={928} w={118} h={86} base={base} label="PARTS HOUSE" />
        <LampPost x={1064} base={base} />
        <OfficeBuilding x={1086} w={112} h={142} base={base} cols={3} rows={5} />
        <House x={1216} w={80} h={68} base={base} />
        <Tree x={1314} base={base} />

        <rect x="0" y={base - 6} width="1400" height="6" className="cityscape-sidewalk" />
        <rect x="0" y={base} width="1400" height="16" className="cityscape-road" />
        <line x1="0" y1={base + 8} x2="1400" y2={base + 8} className="cityscape-lane" strokeDasharray="18 14" />
      </svg>

      {/* Two-tone silhouette — a darker roof band over the body, plus
          hubcaps — instead of one flat block, for a bit more shape. */}
      <div className="cityscape-car">
        <svg viewBox="0 0 84 36">
          <path
            d="M4 24 Q3 15 14 13 Q19 5 34 5 L52 5 Q64 5 68 13 Q79 15 78 24 Q78 27 74 27 L8 27 Q4 27 4 24 Z"
            className="cityscape-car-body"
          />
          <path d="M17 13 Q21 8 34 8 L52 8 Q61 8 66 13 Z" className="cityscape-car-roof" />
          <circle cx="21" cy="28" r="7" className="cityscape-wheel" />
          <circle cx="61" cy="28" r="7" className="cityscape-wheel" />
          <circle cx="21" cy="28" r="3" className="cityscape-hubcap" />
          <circle cx="61" cy="28" r="3" className="cityscape-hubcap" />
        </svg>
      </div>

      {/* Delivery cyclist — a person pedaling a bicycle, single-tone
          silhouette (thin lines only for the bike frame/spokes, which
          reads correctly as a bike rather than the earlier scooter's
          scribble-like stroke outline). Ties into the "Fast Delivery"
          branding used elsewhere. */}
      <div className="cityscape-cyclist">
        <svg viewBox="0 0 68 46">
          <circle cx="12" cy="34" r="9" className="cityscape-wheel-ring" />
          <circle cx="50" cy="34" r="9" className="cityscape-wheel-ring" />
          {/* Spokes — three lines per wheel, at 60° apart, read as a wheel
              at this size far better than a bare ring did. */}
          <path d="M12 25 L12 43 M4 30 L20 38 M4 38 L20 30" className="cityscape-spoke" />
          <path d="M50 25 L50 43 M42 30 L58 38 M42 38 L58 30" className="cityscape-spoke" />
          <circle cx="12" cy="34" r="2" className="cityscape-wheel" />
          <circle cx="50" cy="34" r="2" className="cityscape-wheel" />
          <path d="M12 34 L30 34 L38 20 M30 34 L24 22 M38 20 L46 20 M46 20 L50 34" className="cityscape-bike-frame" />
          <circle cx="24" cy="22" r="2.4" className="cityscape-bike-frame-fill" />
          <path
            d="M24 22 Q22 10 30 6 L36 4"
            className="cityscape-bike-frame"
          />
          <circle cx="31" cy="8" r="5" className="cityscape-rider" />
          {/* Delivery cap — a small brim on the rider's head so the
              silhouette reads as "delivery rider" rather than a bare head. */}
          <path d="M26.5 6.5 Q31 3 35.5 6.5" className="cityscape-cap" fill="none" strokeWidth="2.4" strokeLinecap="round" />
          <path d="M28 13 Q24 20 24 22 L34 20 Q40 18 38 20 L46 20" className="cityscape-rider" fill="none" strokeWidth="4" strokeLinecap="round" />
          <path d="M24 22 Q26 30 20 34" className="cityscape-rider" fill="none" strokeWidth="4" strokeLinecap="round" />
        </svg>
      </div>
    </div>
  );
}
