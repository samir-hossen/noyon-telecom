// Procedural 3D product renders of phone parts (our own models — no
// third-party images). render.html?part=display -> window.__png (WebP data URL).
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const Q = new URLSearchParams(location.search);
const SIZE = Number(Q.get('size') || 900);
const PART = Q.get('part') || 'display';

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.setSize(SIZE, SIZE);
renderer.setClearColor(0x000000, 0);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.VSMShadowMap;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.03).texture;

// ---------- textures ----------
function canvasTexture(w, h, draw, repeat = [1, 1]) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(...repeat);
  t.anisotropy = 8;
  return t;
}
const meshTex = canvasTexture(64, 64, (g, w, h) => {
  g.fillStyle = '#1c1d21'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#050506';
  for (let y = 4; y < h; y += 8) for (let x = (y / 8) % 2 ? 8 : 4; x < w; x += 8) { g.beginPath(); g.arc(x, y, 2.6, 0, Math.PI * 2); g.fill(); }
}, [10, 6]);
const flexTex = canvasTexture(256, 64, (g, w, h) => {
  g.fillStyle = '#c47a26'; g.fillRect(0, 0, w, h);
  g.strokeStyle = 'rgba(255, 214, 120, 0.55)'; g.lineWidth = 2;
  for (let y = 8; y < h; y += 7) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
}, [1, 1]);
const pcbTex = canvasTexture(256, 256, (g, w, h) => {
  g.fillStyle = '#1b5a35'; g.fillRect(0, 0, w, h);
  g.strokeStyle = 'rgba(120, 200, 140, 0.35)'; g.lineWidth = 2;
  for (let i = 0; i < 26; i++) {
    const x = (i * 37) % w, y = (i * 53) % h;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + 40, y); g.lineTo(x + 40, y + 30); g.stroke();
  }
  g.fillStyle = 'rgba(210, 180, 90, 0.8)';
  for (let i = 0; i < 40; i++) g.fillRect((i * 29) % w, (i * 71) % h, 4, 4);
}, [2, 1]);
const darkPcbTex = canvasTexture(256, 256, (g, w, h) => {
  g.fillStyle = '#12261b'; g.fillRect(0, 0, w, h);
  g.strokeStyle = 'rgba(110, 170, 120, 0.25)'; g.lineWidth = 2;
  for (let i = 0; i < 30; i++) { const x = (i * 41) % w, y = (i * 59) % h; g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 36); g.lineTo(x + 28, y + 36); g.stroke(); }
}, [2, 2]);

// ---------- materials ----------
const M = {
  screen: new THREE.MeshPhysicalMaterial({ color: 0x06070a, roughness: 0.05, metalness: 0.1, clearcoat: 1, clearcoatRoughness: 0.02 }),
  bezel: new THREE.MeshPhysicalMaterial({ color: 0x111215, roughness: 0.38, metalness: 0.35 }),
  shield: new THREE.MeshStandardMaterial({ color: 0xc3c7cd, metalness: 1, roughness: 0.36 }),
  alu: new THREE.MeshStandardMaterial({ color: 0xd6d9de, metalness: 1, roughness: 0.22 }),
  darkAlu: new THREE.MeshStandardMaterial({ color: 0x5e636c, metalness: 1, roughness: 0.32 }),
  gold: new THREE.MeshStandardMaterial({ color: 0xe2b650, metalness: 1, roughness: 0.2 }),
  flex: new THREE.MeshPhysicalMaterial({ map: flexTex, roughness: 0.35, metalness: 0.05, clearcoat: 0.7, clearcoatRoughness: 0.2 }),
  pcb: new THREE.MeshStandardMaterial({ map: pcbTex, roughness: 0.5, metalness: 0.1 }),
  pcbDark: new THREE.MeshStandardMaterial({ map: darkPcbTex, roughness: 0.45, metalness: 0.15 }),
  chip: new THREE.MeshPhysicalMaterial({ color: 0x141518, roughness: 0.3, metalness: 0.1, clearcoat: 0.5 }),
  plastic: new THREE.MeshStandardMaterial({ color: 0x18191d, roughness: 0.55, metalness: 0.05 }),
  speakerMesh: new THREE.MeshStandardMaterial({ map: meshTex, roughness: 0.7, metalness: 0.2 }),
  lensGlass: new THREE.MeshPhysicalMaterial({ color: 0x04060c, roughness: 0.02, metalness: 0.1, clearcoat: 1, clearcoatRoughness: 0.01, iridescence: 0.7, iridescenceIOR: 1.5 }),
  lensCore: new THREE.MeshPhysicalMaterial({ color: 0x0d1d44, roughness: 0.04, metalness: 0.4, clearcoat: 1 }),
  clearGlass: new THREE.MeshPhysicalMaterial({ color: 0xdcecf7, roughness: 0.04, metalness: 0, transparent: true, opacity: 0.32, clearcoat: 1, clearcoatRoughness: 0.02, side: THREE.DoubleSide }),
  ink: new THREE.MeshPhysicalMaterial({ color: 0x08080a, roughness: 0.25, clearcoat: 1 }),
  backGlass: new THREE.MeshPhysicalMaterial({ color: 0x27354f, roughness: 0.07, metalness: 0.4, clearcoat: 1, clearcoatRoughness: 0.02 }),
  island: new THREE.MeshPhysicalMaterial({ color: 0x1b2234, roughness: 0.12, metalness: 0.45, clearcoat: 1 }),
  label: new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.6 }),
  brown: new THREE.MeshStandardMaterial({ color: 0x7a4a24, roughness: 0.5 }),
  flash: new THREE.MeshPhysicalMaterial({ color: 0xfff1bf, roughness: 0.2, emissive: 0x6a5a20, emissiveIntensity: 0.25, clearcoat: 1 }),
};

// ---------- geometry helpers ----------
function rrShape(w, h, r, cx = 0, cy = 0, Ctor = THREE.Shape) {
  const s = new Ctor();
  const x = cx - w / 2, y = cy - h / 2;
  r = Math.min(r, w / 2, h / 2);
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  return s;
}
function shadowed(m) { m.castShadow = true; m.receiveShadow = true; return m; }
// Rounded-rectangle slab in the XY plane, `d` thick along Z, centered.
function slab(w, h, d, r, material, bevel = 0.015, holes = []) {
  const b = Math.min(bevel, d / 2 - 0.0005, w / 4, h / 4);
  const shape = rrShape(w - 2 * b, h - 2 * b, Math.max(0.004, r - b));
  for (const hole of holes) shape.holes.push(hole);
  const g = new THREE.ExtrudeGeometry(shape, { depth: Math.max(0.001, d - 2 * b), bevelEnabled: b > 0.0005, bevelThickness: b, bevelSize: b, bevelSegments: 3, curveSegments: 36 });
  g.translate(0, 0, -(d - 2 * b) / 2);
  return shadowed(new THREE.Mesh(g, material));
}
function frameRing(w, h, r, wi, hi, ri, d, material, bevel = 0.02) {
  const shape = rrShape(w, h, r);
  shape.holes.push(rrShape(wi, hi, ri, 0, 0, THREE.Path));
  const g = new THREE.ExtrudeGeometry(shape, { depth: d - 2 * bevel, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel * 0.6, bevelSegments: 3, curveSegments: 36 });
  g.translate(0, 0, -(d - 2 * bevel) / 2);
  return shadowed(new THREE.Mesh(g, material));
}
function box(w, h, d, material, radius = 0.02) {
  const r = Math.max(0.0005, Math.min(radius, Math.min(w, h, d) / 2 - 0.0005));
  return shadowed(new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, r), material));
}
// Cylinder whose axis points along +Z (faces the camera like a lens).
function disc(r, d, material, seg = 64) {
  const m = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(r, r, d, seg), material));
  m.rotation.x = Math.PI / 2;
  return m;
}
function torusZ(r, tube, material) {
  return shadowed(new THREE.Mesh(new THREE.TorusGeometry(r, tube, 24, 72), material));
}
// Flat ribbon (flex cable) along a path. The flat side faces `normal` (for
// a ribbon lying on a board) unless `widthAxis` is given (a ribbon bending
// around an edge keeps its width along that axis).
function ribbon(points, width, thickness, material, { normal = new THREE.Vector3(0, 0, 1), widthAxis = null } = {}) {
  const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal');
  const n = 140;
  const pos = [], idx = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const P = curve.getPointAt(t);
    const T = curve.getTangentAt(t).normalize();
    let W;
    if (widthAxis) W = widthAxis.clone().sub(T.clone().multiplyScalar(widthAxis.dot(T))).normalize();
    else W = new THREE.Vector3().crossVectors(T, normal).normalize();
    const N = new THREE.Vector3().crossVectors(W, T).normalize();
    for (const [sw, sn] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      const v = P.clone().add(W.clone().multiplyScalar(sw * width / 2)).add(N.clone().multiplyScalar(sn * thickness / 2));
      pos.push(v.x, v.y, v.z);
    }
  }
  for (let i = 0; i < n; i++) {
    const a = i * 4, b = (i + 1) * 4;
    for (let k = 0; k < 4; k++) {
      const k2 = (k + 1) % 4;
      idx.push(a + k, b + k, b + k2, a + k, b + k2, a + k2);
    }
  }
  idx.push(0, 1, 2, 0, 2, 3, n * 4 + 0, n * 4 + 2, n * 4 + 1, n * 4 + 0, n * 4 + 3, n * 4 + 2);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  // simple UVs for the trace texture
  const uv = [];
  for (let i = 0; i <= n; i++) uv.push(i / n, 0, i / n, 1, i / n, 1, i / n, 0);
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  return shadowed(new THREE.Mesh(g, material));
}
function lens(r, h = 0.16) {
  const g = new THREE.Group();
  const outer = disc(r, h, M.alu); outer.position.z = 0;
  const glass = disc(r * 0.8, h + 0.012, M.lensGlass);
  const core = disc(r * 0.38, h + 0.02, M.lensCore);
  const glint = disc(r * 0.12, h + 0.024, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55 }));
  glint.position.set(-r * 0.3, r * 0.3, 0);
  g.add(outer, glass, core, glint);
  return g;
}
function connector(w = 0.7, h = 0.34) {
  const g = new THREE.Group();
  const body = box(w, h, 0.1, M.plastic, 0.02);
  const stiff = box(w * 1.15, h * 1.3, 0.025, M.shield, 0.01); stiff.position.z = -0.06;
  g.add(body, stiff);
  for (let i = 0; i < 8; i++) {
    const pin = box(0.035, h * 0.55, 0.02, M.gold, 0.005);
    pin.position.set(-w / 2 + 0.08 + i * ((w - 0.16) / 7), 0, 0.055);
    g.add(pin);
  }
  return g;
}

// ---------- parts ----------
function phoneFront() {
  const g = new THREE.Group();
  g.add(slab(3.7, 7.8, 0.16, 0.52, M.bezel, 0.035));
  const screen = slab(3.58, 7.68, 0.02, 0.46, M.screen, 0.008); screen.position.z = 0.09; g.add(screen);
  const punch = disc(0.07, 0.01, M.plastic); punch.position.set(0, 3.55, 0.102); g.add(punch);
  return g;
}
function displayBack() {
  const g = new THREE.Group();
  g.add(slab(3.7, 7.8, 0.16, 0.52, M.bezel, 0.035));
  const plate = slab(3.36, 7.2, 0.025, 0.36, M.shield, 0.008); plate.position.set(0, 0.15, 0.09); g.add(plate);
  const label = slab(1.5, 0.55, 0.006, 0.05, M.label, 0.002); label.position.set(-0.55, 2.6, 0.106); g.add(label);
  const qr = slab(0.4, 0.4, 0.004, 0.02, M.plastic, 0.001); qr.position.set(-1.0, 2.6, 0.11); g.add(qr);
  const flex = ribbon([new THREE.Vector3(0.7, -3.75, -0.02), new THREE.Vector3(0.7, -4.05, 0.07), new THREE.Vector3(0.7, -3.7, 0.125), new THREE.Vector3(0.75, -2.4, 0.13), new THREE.Vector3(0.95, -1.2, 0.14)], 0.62, 0.016, M.flex, { widthAxis: new THREE.Vector3(1, 0, 0) });
  g.add(flex);
  const conn = connector(0.75, 0.36); conn.position.set(0.95, -1.0, 0.2); g.add(conn);
  return g;
}
const PARTS = {
  display: {
    view: { elev: 8, azim: 0, fov: 26, fill: 0.86 },
    build() {
      const g = new THREE.Group();
      const back = displayBack(); back.position.set(1.55, 0.1, -1.2); back.rotation.y = -0.32;
      const front = phoneFront(); front.position.set(-1.15, 0, 0.45); front.rotation.y = 0.22;
      g.add(back, front);
      return g;
    },
  },
  'upper-glass': {
    view: { elev: 8, azim: 0, fov: 26, fill: 0.86 },
    build() {
      const g = new THREE.Group();
      for (const [x, z, ry] of [[1.45, -1.0, -0.3], [-1.1, 0.35, 0.2]]) {
        const p = new THREE.Group();
        p.add(slab(3.7, 7.8, 0.06, 0.52, M.clearGlass, 0.02));
        const border = frameRing(3.66, 7.76, 0.5, 3.36, 7.42, 0.38, 0.006, M.ink, 0.002); border.position.z = -0.028; p.add(border);
        const slot = slab(0.75, 0.08, 0.008, 0.04, M.plastic, 0.002); slot.position.set(0, 3.68, -0.02); p.add(slot);
        p.position.set(x, 0, z); p.rotation.y = ry;
        g.add(p);
      }
      return g;
    },
  },
  'back-glass': {
    view: { elev: 10, azim: 0, fov: 26, fill: 0.84 },
    build() {
      const g = new THREE.Group();
      g.add(slab(3.7, 7.8, 0.08, 0.52, M.backGlass, 0.03));
      const island = slab(1.62, 2.1, 0.06, 0.42, M.island, 0.02); island.position.set(-0.83, 2.6, 0.07); g.add(island);
      for (const [x, y, r] of [[-1.17, 3.15, 0.3], [-1.17, 2.05, 0.3], [-0.5, 2.6, 0.24]]) {
        const ring = torusZ(r, 0.035, M.alu); ring.position.set(x, y, 0.11); g.add(ring);
        const win = disc(r - 0.02, 0.012, M.lensGlass); win.position.set(x, y, 0.1); g.add(win);
      }
      const fl = disc(0.09, 0.02, M.flash); fl.position.set(-0.45, 3.35, 0.105); g.add(fl);
      g.rotation.y = -0.42; g.rotation.x = 0.06;
      return g;
    },
  },
  camera: {
    view: { elev: 32, azim: -18, fov: 26, fill: 0.8 },
    build() {
      const g = new THREE.Group();
      const bracket = box(2.3, 2.3, 0.14, M.shield, 0.08); bracket.position.z = -0.32; g.add(bracket);
      g.add(box(2.1, 2.1, 0.55, M.plastic, 0.12));
      for (const [x, y, r] of [[-0.5, 0.5, 0.36], [0.5, 0.5, 0.36], [-0.5, -0.5, 0.36]]) {
        const l = lens(r, 0.32); l.position.set(x, y, 0.3); g.add(l);
      }
      const ir = disc(0.12, 0.05, M.flash); ir.position.set(0.5, -0.5, 0.3); g.add(ir);
      const flex = ribbon([new THREE.Vector3(0.6, -1.0, -0.2), new THREE.Vector3(0.9, -1.8, -0.25), new THREE.Vector3(1.6, -2.4, -0.25), new THREE.Vector3(2.5, -2.6, -0.25)], 0.5, 0.016, M.flex);
      g.add(flex);
      const conn = connector(0.6, 0.34); conn.position.set(2.75, -2.62, -0.2); conn.rotation.z = 0.0; g.add(conn);
      return g;
    },
  },
  'front-camera': {
    view: { elev: 30, azim: -20, fov: 26, fill: 0.72 },
    build() {
      const g = new THREE.Group();
      g.add(box(1.0, 1.0, 0.45, M.plastic, 0.1));
      const l = lens(0.32, 0.26); l.position.set(0, 0, 0.22); g.add(l);
      const flex = ribbon([new THREE.Vector3(0, -0.45, -0.1), new THREE.Vector3(0.1, -1.2, -0.12), new THREE.Vector3(0.7, -1.7, -0.12), new THREE.Vector3(1.5, -1.8, -0.12)], 0.42, 0.014, M.flex);
      g.add(flex);
      const conn = connector(0.55, 0.3); conn.position.set(1.72, -1.8, -0.08); g.add(conn);
      return g;
    },
  },
  'camera-glass': {
    view: { elev: 34, azim: -16, fov: 26, fill: 0.74 },
    build() {
      const g = new THREE.Group();
      const holes = [[-0.48, 0.48], [0.48, 0.48], [-0.48, -0.48]].map(([x, y]) => { const p = new THREE.Path(); p.absarc(x, y, 0.34, 0, Math.PI * 2, false); return p; });
      g.add(slab(2.0, 2.0, 0.09, 0.5, M.darkAlu, 0.025, holes));
      for (const [x, y] of [[-0.48, 0.48], [0.48, 0.48], [-0.48, -0.48]]) {
        const ring = torusZ(0.36, 0.04, M.alu); ring.position.set(x, y, 0.05); g.add(ring);
        const glass = disc(0.34, 0.03, M.clearGlass); glass.position.set(x, y, 0.03); g.add(glass);
      }
      const fl = disc(0.12, 0.03, M.flash); fl.position.set(0.48, -0.48, 0.05); g.add(fl);
      return g;
    },
  },
  'charging-port': {
    lie: true,
    view: { elev: 42, azim: -24, fov: 26, fill: 0.84 },
    build() {
      const g = new THREE.Group();
      g.add(slab(3.4, 1.6, 0.06, 0.14, M.pcb, 0.01));
      // USB-C receptacle on the front edge
      const port = box(0.98, 0.36, 0.34, M.alu, 0.15); port.rotation.x = Math.PI / 2; port.position.set(0, -0.72, 0.15); g.add(port);
      const mouth = box(0.84, 0.24, 0.05, M.plastic, 0.1); mouth.rotation.x = Math.PI / 2; mouth.position.set(0, -0.89, 0.15); g.add(mouth);
      // parts on the board
      const mic = disc(0.13, 0.12, M.alu); mic.position.set(-1.2, 0.1, 0.09); g.add(mic);
      for (let i = 0; i < 9; i++) {
        const c = box(0.14, 0.08, 0.06, i % 3 === 0 ? M.brown : i % 3 === 1 ? M.chip : M.shield, 0.01);
        c.position.set(-0.75 + (i % 5) * 0.32, 0.25 + Math.floor(i / 5) * 0.28, 0.06); g.add(c);
      }
      const ic = box(0.42, 0.42, 0.07, M.chip, 0.02); ic.position.set(0.95, 0.2, 0.065); g.add(ic);
      for (let i = 0; i < 6; i++) { const pad = box(0.16, 0.24, 0.012, M.gold, 0.004); pad.position.set(-1.45 + i * 0.22, -0.55, 0.034); if (i < 3) g.add(pad); }
      // flex to the main board
      const flex = ribbon([new THREE.Vector3(1.2, 0.75, 0.0), new THREE.Vector3(1.25, 1.4, 0.0), new THREE.Vector3(1.0, 2.3, 0.0), new THREE.Vector3(0.4, 3.0, 0.0)], 0.48, 0.016, M.flex);
      g.add(flex);
      const conn = connector(0.6, 0.32); conn.position.set(0.25, 3.2, 0.05); conn.rotation.z = 0.5; g.add(conn);
      return g;
    },
  },
  'sim-tray': {
    lie: true,
    view: { elev: 46, azim: -22, fov: 26, fill: 0.82 },
    build() {
      const g = new THREE.Group();
      const pocket = (cx, cy) => {
        const p = new THREE.Path();
        const w = 1.0, h = 1.36, c = 0.2;
        p.moveTo(cx - w / 2, cy - h / 2); p.lineTo(cx + w / 2, cy - h / 2); p.lineTo(cx + w / 2, cy + h / 2 - c); p.lineTo(cx + w / 2 - c, cy + h / 2); p.lineTo(cx - w / 2, cy + h / 2); p.lineTo(cx - w / 2, cy - h / 2);
        return p;
      };
      const tray = slab(1.32, 4.6, 0.07, 0.12, M.alu, 0.012, [pocket(0, 1.1), pocket(0, -0.6)]);
      g.add(tray);
      const floor = slab(1.24, 4.5, 0.02, 0.1, M.darkAlu, 0.004); floor.position.z = -0.045; g.add(floor);
      const cap = box(1.4, 0.34, 0.16, M.alu, 0.06); cap.position.set(0, -2.45, 0.02); g.add(cap);
      const pin = disc(0.05, 0.02, M.plastic); pin.rotation.x = 0; pin.position.set(0.32, -2.63, 0.02); g.add(pin);
      const gasket = box(1.3, 0.05, 0.13, M.plastic, 0.02); gasket.position.set(0, -2.27, 0.02); g.add(gasket);
      return g;
    },
  },
  speaker: {
    lie: true,
    view: { elev: 42, azim: -24, fov: 26, fill: 0.76 },
    build() {
      const g = new THREE.Group();
      g.add(box(2.5, 1.6, 0.42, M.plastic, 0.14));
      const grill = slab(1.9, 1.0, 0.02, 0.12, M.speakerMesh, 0.004); grill.position.set(-0.1, 0.05, 0.215); g.add(grill);
      const rim = frameRing(2.0, 1.1, 0.16, 1.9, 1.0, 0.12, 0.03, M.darkAlu, 0.006); rim.position.set(-0.1, 0.05, 0.215); g.add(rim);
      for (const y of [0.32, -0.32]) { const c = box(0.22, 0.16, 0.08, M.gold, 0.02); c.position.set(1.1, y, 0.22); g.add(c); }
      return g;
    },
  },
  'ear-speaker': {
    lie: true,
    view: { elev: 40, azim: -22, fov: 26, fill: 0.72 },
    build() {
      const g = new THREE.Group();
      g.add(box(1.9, 0.56, 0.28, M.plastic, 0.12));
      const grill = slab(1.5, 0.24, 0.012, 0.11, M.speakerMesh, 0.003); grill.position.set(0, 0.04, 0.142); g.add(grill);
      const flex = ribbon([new THREE.Vector3(0.6, -0.25, 0.0), new THREE.Vector3(0.75, -0.8, 0.0), new THREE.Vector3(1.1, -1.25, 0.0)], 0.3, 0.012, M.flex);
      g.add(flex);
      for (const x of [-0.3, 0.3]) { const c = box(0.16, 0.12, 0.05, M.gold, 0.01); c.position.set(x, -0.28, 0.12); g.add(c); }
      return g;
    },
  },
  flex: {
    lie: true,
    view: { elev: 48, azim: -18, fov: 26, fill: 0.84 },
    build() {
      const g = new THREE.Group();
      const flex = ribbon([new THREE.Vector3(-2.2, 1.1, 0), new THREE.Vector3(-0.9, 1.1, 0), new THREE.Vector3(0.1, 0.2, 0), new THREE.Vector3(0.9, -0.8, 0), new THREE.Vector3(2.2, -0.9, 0)], 0.55, 0.016, M.flex);
      g.add(flex);
      const a = connector(0.8, 0.4); a.position.set(-2.45, 1.1, 0.05); a.rotation.z = Math.PI / 2; g.add(a);
      const b = connector(0.8, 0.4); b.position.set(2.45, -0.9, 0.05); b.rotation.z = Math.PI / 2; g.add(b);
      const stiff = box(0.5, 0.62, 0.03, M.shield, 0.01); stiff.position.set(0.1, 0.2, 0.025); g.add(stiff);
      return g;
    },
  },
  frame: {
    view: { elev: 14, azim: 0, fov: 26, fill: 0.84 },
    build() {
      const g = new THREE.Group();
      g.add(frameRing(3.8, 7.9, 0.56, 3.52, 7.62, 0.44, 0.7, M.alu, 0.04));
      const mid = slab(3.54, 7.64, 0.06, 0.44, M.darkAlu, 0.01); g.add(mid);
      const bay = slab(2.9, 4.2, 0.03, 0.2, new THREE.MeshStandardMaterial({ color: 0x41454d, metalness: 1, roughness: 0.4 }), 0.006); bay.position.set(0, -0.9, 0.04); g.add(bay);
      for (const y of [3.0, -3.0]) for (const x of [-1.9, 1.9]) { const a = box(0.06, 0.12, 0.72, M.plastic, 0.01); a.position.set(x, y, 0); g.add(a); }
      for (const [y, h] of [[1.9, 0.5], [1.1, 0.9]]) { const b = box(0.08, h, 0.24, M.alu, 0.03); b.position.set(1.93, y, 0); g.add(b); }
      g.rotation.y = -0.5; g.rotation.x = 0.05;
      return g;
    },
  },
  'logic-board': {
    lie: true,
    view: { elev: 46, azim: -20, fov: 26, fill: 0.84 },
    build() {
      const g = new THREE.Group();
      const s = new THREE.Shape();
      s.moveTo(-1.6, -2.6); s.lineTo(1.6, -2.6); s.lineTo(1.6, 2.6); s.lineTo(0.2, 2.6); s.lineTo(0.2, 1.2); s.lineTo(-1.6, 1.2); s.lineTo(-1.6, -2.6);
      const geo = new THREE.ExtrudeGeometry(s, { depth: 0.06, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.01, bevelSegments: 2 });
      geo.translate(0, 0, -0.03);
      g.add(shadowed(new THREE.Mesh(geo, M.pcbDark)));
      const sh1 = box(2.6, 1.7, 0.16, M.shield, 0.04); sh1.position.set(0, -1.4, 0.1); g.add(sh1);
      const sh2 = box(1.1, 1.6, 0.14, M.shield, 0.04); sh2.position.set(0.9, 1.6, 0.09); g.add(sh2);
      const soc = box(0.9, 0.9, 0.08, M.chip, 0.03); soc.position.set(-0.7, 0.3, 0.07); g.add(soc);
      const mem = box(0.6, 0.45, 0.07, M.chip, 0.02); mem.position.set(0.5, 0.3, 0.065); g.add(mem);
      for (let i = 0; i < 12; i++) { const c = box(0.12, 0.07, 0.05, i % 2 ? M.brown : M.chip, 0.01); c.position.set(-1.35 + (i % 6) * 0.22, 0.95 - Math.floor(i / 6) * 0.2, 0.055); g.add(c); }
      const conn = connector(0.7, 0.3); conn.position.set(-0.9, -2.35, 0.08); g.add(conn);
      const conn2 = connector(0.6, 0.28); conn2.position.set(1.15, 0.3, 0.08); conn2.rotation.z = Math.PI / 2; g.add(conn2);
      return g;
    },
  },
  default: {
    view: { elev: 8, azim: 0, fov: 26, fill: 0.8 },
    build() { const f = phoneFront(); f.rotation.y = 0.35; return f; },
  },
};

// ---------- stage ----------
const spec = PARTS[PART] || PARTS.default;
const subject = spec.build();
if (spec.lie) subject.rotation.x -= Math.PI / 2;
const holder = new THREE.Group(); holder.add(subject); scene.add(holder);
subject.updateMatrixWorld(true);
const bbox = new THREE.Box3().setFromObject(subject);
const center = bbox.getCenter(new THREE.Vector3());
subject.position.sub(new THREE.Vector3(center.x, bbox.min.y, center.z)); // stand on y = 0, centered
holder.updateMatrixWorld(true);
const bb = new THREE.Box3().setFromObject(holder);
const sphere = bb.getBoundingSphere(new THREE.Sphere());

const ground = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.ShadowMaterial({ opacity: 0.2 }));
ground.rotation.x = -Math.PI / 2; ground.position.y = -0.005; ground.receiveShadow = true; scene.add(ground);

const key = new THREE.DirectionalLight(0xffffff, 2.2);
key.position.set(sphere.center.x - 4, sphere.center.y + 14, sphere.center.z + 8);
key.target.position.copy(sphere.center); scene.add(key.target);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
key.shadow.radius = 14; key.shadow.blurSamples = 24; key.shadow.bias = -0.0004;
const sc = key.shadow.camera; const ext = sphere.radius * 2.2;
sc.left = -ext; sc.right = ext; sc.top = ext; sc.bottom = -ext; sc.near = 0.5; sc.far = 60;
scene.add(key);
const rim = new THREE.DirectionalLight(0xdfe8ff, 0.9); rim.position.set(sphere.center.x + 8, sphere.center.y + 6, sphere.center.z - 10); scene.add(rim);
scene.add(new THREE.AmbientLight(0xffffff, 0.25));

const { elev, azim, fov, fill } = spec.view;
const camera = new THREE.PerspectiveCamera(fov, 1, 0.1, 200);
const dist = sphere.radius / Math.sin(THREE.MathUtils.degToRad(fov / 2)) / fill;
const e = THREE.MathUtils.degToRad(elev), a = THREE.MathUtils.degToRad(azim);
camera.position.set(sphere.center.x + dist * Math.cos(e) * Math.sin(a), sphere.center.y + dist * Math.sin(e), sphere.center.z + dist * Math.cos(e) * Math.cos(a));
camera.lookAt(sphere.center);

// Crop to the object (and its shadow) with a little padding, into a square.
function trimmed(src, out = Number(Q.get('out') || 640), pad = 0.06) {
  const w = src.width, h = src.height;
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'); g.drawImage(src, 0, 0);
  const px = g.getImageData(0, 0, w, h).data;
  let x0 = w, y0 = h, x1 = 0, y1 = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (px[(y * w + x) * 4 + 3] > 10) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  }
  const side = Math.max(x1 - x0, y1 - y0) * (1 + pad * 2);
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  const o = document.createElement('canvas'); o.width = out; o.height = out;
  o.getContext('2d').drawImage(c, cx - side / 2, cy - side / 2, side, side, 0, 0, out, out);
  return o.toDataURL('image/webp', 0.9);
}
renderer.render(scene, camera);
requestAnimationFrame(() => {
  renderer.render(scene, camera);
  window.__png = trimmed(renderer.domElement);
});
