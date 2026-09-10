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

      {/* The animation runs on this full-width "lane" wrapper via
          `transform`, not on the car itself via `left` — mobile browsers
          (especially Safari/WebKit) render `left`-based animation far less
          smoothly than GPU-composited `transform`, which on a phone could
          drop enough frames to look like it isn't moving at all. Percentage
          values in `transform: translateX()` are relative to the animated
          element's own box, so the lane has to be the full-width element
          for `translateX(100%)` to mean "the strip's full width" — the car
          itself just sits at a static offset inside it. */}
      <div className="cityscape-car-lane">
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
      </div>

      {/* Delivery cyclist — deliberately minimal, icon-style (closer to a
          map "bike share" pictogram than a detailed illustration). The
          previous version packed in a chainring, crank/pedals, a cap, and
          a delivery bag, which at this element's actual ~50px display
          size just merged into noise — impossible to tell it was a bike
          at all. Fewer, bolder strokes read far more clearly this small:
          wheel rings carrying just three thick spokes each, a single clean
          frame outline, and a simple rider silhouette (head + one back/arm
          curve + one leg). Ties into the "Fast Delivery" branding used
          elsewhere. */}
      {/* Drawn on a roughly 1-unit-per-cm grid (viewBox ~1.95m x 1.85m) so
          the parts are in real proportion to each other: 70cm wheels,
          105cm wheelbase, ~100cm saddle height, rider head at ~1.7m. The
          previous version was drawn freehand and, once rendered, came out
          nearly twice the car's height — a bicycle standing taller than a
          car. Sizing in CSS now scales this against the car's own length
          so the two stay in proportion on screen too. */}
      <div className="cityscape-cyclist-lane">
        <div className="cityscape-cyclist">
          <svg viewBox="0 0 195 185">
            {/* Each wheel is its own <g> so it can spin about its own centre
                while the lane carries it across. Three bold spokes, not a
                realistic spoke count — the wheel renders about 14px across,
                where a real lacing pattern is just grey mush, but three
                thick struts read clearly as a wheel turning. Without any
                spoke at all (the previous version) a plain ring is
                radially symmetric, so it can rotate all it likes and still
                look like a static disc sliding along the road — which is
                the main reason the whole strip read as two cut-outs being
                dragged past rather than a bike being ridden. */}
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

            {/* Diamond frame: rear triangle (chain stay, seat stay, seat
                tube) + front triangle (top tube, down tube), then the head
                tube/stem and fork. */}
            <path
              d="M45 145 L105 152 M105 152 L88 80 M45 145 L88 80 M105 152 L148 84 M88 80 L148 84 M148 84 L150 145 M148 84 L150 74"
              className="cityscape-bike-frame"
            />
            {/* Saddle and handlebar */}
            <path d="M76 78 L100 78 M138 72 L162 72" className="cityscape-bike-frame" />
            {/* Crank arm + pedal, on its own rotating group about the bottom
                bracket, so the foot visibly has something driving it round. */}
            <g className="cityscape-crank">
              <path d="M105 152 L105 164" className="cityscape-bike-frame" />
              <circle cx="105" cy="164" r="5" className="cityscape-bike-frame-fill" />
            </g>
            {/* Chainring at the bottom bracket */}
            <circle cx="105" cy="152" r="10" className="cityscape-bike-frame-fill" />

            {/* Rider — hip at the saddle, torso rising clear of the frame */}
            <circle cx="118" cy="18" r="15" className="cityscape-rider" />
            <path d="M88 76 L110 34" className="cityscape-rider" fill="none" strokeWidth="13" strokeLinecap="round" />
            <path d="M108 38 L148 78" className="cityscape-rider" fill="none" strokeWidth="10" strokeLinecap="round" />

            {/* The leg is rigged as two bones rather than one static
                polyline, because a cyclist coasting past with a rigid leg is
                exactly what made this read as a cut-out being dragged along
                instead of somebody riding. The shin group is nested INSIDE
                the thigh group, so the thigh's rotation carries the knee (and
                with it the shin's own rotation origin) along automatically —
                that nesting is what keeps the joint attached instead of the
                shin tearing away from the knee as the thigh swings.

                These coordinates are not eyeballed: hip (88,76), knee
                (116.5,119.5) and foot (105,164) are the rest pose solved by
                2-bone inverse kinematics for a foot sitting on the pedal at
                the bottom of a 12-unit crank, and the keyframe angles in the
                CSS come from the same solve run at 45-degree crank
                increments. The leg also had to grow (thigh 52, shin 46,
                against the previous 46.6/36.7): at the old lengths the foot
                only just reached the bottom bracket with the leg almost
                straight, so there was no slack left to pedal with at all —
                the first attempt at this animation moved the foot barely 2px
                and read as a twitch rather than a pedal stroke. */}
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

