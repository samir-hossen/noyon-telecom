// Decorative animated skyline strip for the footer — a simple original
// illustration (not sourced from anywhere), tying into the "Fast Delivery"
// branding already used elsewhere (FeatureStrip, hero badges): a delivery
// scooter loops continuously along a road in front of a building skyline.
// Pure inline SVG + CSS animation, no images/network requests.
export default function CityscapeStrip() {
  const buildings = [
    { x: 0, w: 46, h: 70 }, { x: 50, w: 30, h: 46 }, { x: 84, w: 54, h: 92 },
    { x: 142, w: 34, h: 58 }, { x: 180, w: 60, h: 40 }, { x: 244, w: 40, h: 78 },
    { x: 288, w: 28, h: 50 }, { x: 320, w: 58, h: 100 }, { x: 382, w: 36, h: 62 },
    { x: 422, w: 44, h: 46 }, { x: 470, w: 60, h: 86 }, { x: 534, w: 32, h: 56 },
    { x: 570, w: 50, h: 72 }, { x: 624, w: 40, h: 44 }, { x: 668, w: 56, h: 96 },
    { x: 728, w: 34, h: 60 }, { x: 766, w: 46, h: 40 }, { x: 816, w: 44, h: 80 },
    { x: 864, w: 60, h: 52 }, { x: 928, w: 32, h: 68 }, { x: 964, w: 36, h: 40 },
  ];

  return (
    <div className="cityscape-strip" aria-hidden="true">
      <svg viewBox="0 0 1000 110" preserveAspectRatio="none" className="cityscape-skyline">
        {buildings.map((b, i) => (
          <rect key={i} x={b.x} y={110 - b.h} width={b.w} height={b.h} rx="2" />
        ))}
        <line x1="0" y1="109" x2="1000" y2="109" strokeWidth="2" />
      </svg>
      <div className="cityscape-scooter">
        <svg viewBox="0 0 64 40" width="56" height="35" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="32" r="6" />
          <circle cx="48" cy="32" r="6" />
          <path d="M12 32h10l6-14h10" />
          <path d="M28 18h9" />
          <path d="M38 18l6 14h4" />
          <path d="M18 10h8l3 5" strokeLinecap="round" />
          <rect x="44" y="9" width="10" height="7" rx="1.5" />
        </svg>
      </div>
    </div>
  );
}
