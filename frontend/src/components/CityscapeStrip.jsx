// Decorative animated street scene for the footer — original artwork (not
// sourced from anywhere), styled as a city-at-dusk skyline: dark building
// silhouettes with small lit (gold) windows against the footer's near-black
// background, a labeled "Noyon Telecom" building, a shop with an awning, a
// couple of houses and trees for variety, and a car + delivery scooter that
// loop continuously along the road — ties into the "Fast Delivery" branding
// used elsewhere (FeatureStrip, hero badges).

function Windows({ x, y, w, h, cols, rows }) {
  const pad = 8;
  const cellW = (w - pad * 2) / cols;
  const cellH = (h - pad * 2) / rows;
  const size = Math.min(cellW, cellH) * 0.42;
  const windows = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      windows.push(
        <rect
          key={`${r}-${c}`}
          x={x + pad + c * cellW + (cellW - size) / 2}
          y={y + pad + r * cellH + (cellH - size) / 2}
          width={size}
          height={size}
          rx="1"
          className="cityscape-window"
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
      <rect x={x} y={y} width={w} height={h} className="cityscape-building" />
      {accent && <rect x={x} y={y} width={w} height={5} className="cityscape-accent" />}
      <Windows x={x} y={y} w={w} h={h} cols={cols} rows={rows} />
      {label && (
        <text x={x + w / 2} y={y - 10} textAnchor="middle" className="cityscape-label">
          {label}
        </text>
      )}
    </g>
  );
}

function House({ x, w, h, base }) {
  const y = base - h;
  const roofH = h * 0.4;
  return (
    <g>
      <polygon points={`${x - 4},${y + roofH} ${x + w / 2},${y - 2} ${x + w + 4},${y + roofH}`} className="cityscape-roof" />
      <rect x={x} y={y + roofH} width={w} height={h - roofH} className="cityscape-building" />
      <rect x={x + w * 0.6} y={base - h * 0.42} width={w * 0.22} height={h * 0.42} className="cityscape-door" />
      <rect x={x + w * 0.16} y={y + roofH + h * 0.16} width={w * 0.22} height={w * 0.22} rx="1" className="cityscape-window" />
    </g>
  );
}

function Shop({ x, w, h, base, label }) {
  const y = base - h;
  const awningH = h * 0.16;
  const stripes = 5;
  const stripeW = w / stripes;
  return (
    <g>
      <rect x={x} y={y + awningH} width={w} height={h - awningH} className="cityscape-building" />
      {Array.from({ length: stripes }).map((_, i) => (
        <rect
          key={i}
          x={x + i * stripeW}
          y={y}
          width={stripeW}
          height={awningH}
          className={i % 2 === 0 ? 'cityscape-awning-a' : 'cityscape-awning-b'}
        />
      ))}
      <rect x={x + w * 0.32} y={base - h * 0.5} width={w * 0.36} height={h * 0.5} className="cityscape-door" />
      <rect x={x + w * 0.08} y={y + awningH + h * 0.14} width={w * 0.18} height={w * 0.18} rx="1" className="cityscape-window" />
      <rect x={x + w * 0.74} y={y + awningH + h * 0.14} width={w * 0.18} height={w * 0.18} rx="1" className="cityscape-window" />
      <text x={x + w / 2} y={y + awningH - 6} textAnchor="middle" className="cityscape-shop-label">{label}</text>
    </g>
  );
}

function Tree({ x, base }) {
  return (
    <g>
      <rect x={x - 2.5} y={base - 26} width="5" height="26" className="cityscape-trunk" />
      <circle cx={x} cy={base - 34} r="16" className="cityscape-foliage" />
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
            <stop offset="0%" stopColor="#2b303e" />
            <stop offset="100%" stopColor="#1c1f28" />
          </linearGradient>
        </defs>
        <House x={20} w={78} h={70} base={base} />
        <Tree x={118} base={base} />
        <Shop x={140} w={130} h={92} base={base} label="EXPRESS SHOP" />
        <OfficeBuilding x={290} w={100} h={120} base={base} cols={3} rows={4} />
        <OfficeBuilding x={410} w={150} h={168} base={base} cols={4} rows={6} label="NOYON TELECOM" accent />
        <Tree x={580} base={base} />
        <OfficeBuilding x={600} w={90} h={104} base={base} cols={2} rows={4} />
        <House x={710} w={78} h={64} base={base} />
        <Tree x={806} base={base} />
        <Shop x={826} w={116} h={84} base={base} label="PARTS HOUSE" />
        <OfficeBuilding x={960} w={110} h={140} base={base} cols={3} rows={5} />
        <House x={1090} w={78} h={68} base={base} />
        <Tree x={1188} base={base} />
        <OfficeBuilding x={1208} w={130} h={110} base={base} cols={4} rows={4} />

        <rect x="0" y={base} width="1400" height="16" className="cityscape-road" />
        <line x1="0" y1={base + 8} x2="1400" y2={base + 8} className="cityscape-lane" strokeDasharray="18 14" />
      </svg>

      <div className="cityscape-car">
        <svg viewBox="0 0 80 34" width="66" height="28">
          <path d="M6 26 Q4 12 20 10 L30 4 L58 4 L66 10 L74 10 Q78 12 76 22 L76 26 Z" className="cityscape-car-body" />
          <rect x="30" y="6" width="24" height="10" rx="2" className="cityscape-car-glass" />
          <circle cx="20" cy="27" r="6" className="cityscape-wheel" />
          <circle cx="62" cy="27" r="6" className="cityscape-wheel" />
        </svg>
      </div>

      {/* Delivery scooter — filled silhouettes rather than thin stroked
          lines, which read as scribbles rather than a bike at this size.
          Includes a delivery box on the back and a rider, tying into the
          "Fast Delivery" branding used elsewhere. */}
      <div className="cityscape-scooter">
        <svg viewBox="0 0 70 42">
          <circle cx="14" cy="34" r="6.5" className="cityscape-wheel" />
          <circle cx="54" cy="34" r="6.5" className="cityscape-wheel" />
          <path d="M12 30 Q10 24 18 23 L46 23 Q52 23 55 29 L55 31 L12 31 Z" className="cityscape-scooter-body" />
          <rect x="46" y="11" width="4" height="14" rx="1.5" className="cityscape-scooter-body" />
          <rect x="41" y="9" width="14" height="3.5" rx="1.5" className="cityscape-scooter-body" />
          <rect x="9" y="14" width="14" height="13" rx="2.5" className="cityscape-scooter-box" />
          <circle cx="34" cy="8" r="4.5" className="cityscape-rider" />
          <path d="M27 26 Q28 15 36 13 L44 11 L44 15 L38 17 Q32 19 31 26 Z" className="cityscape-rider" />
        </svg>
      </div>
    </div>
  );
}
