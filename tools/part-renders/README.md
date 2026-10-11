# Part renders

The product-tile images in `frontend/public/images/parts/*.webp` are our own
3D renders (three.js), shown for products that don't have a real photo yet.
No third-party images are used.

Re-render (e.g. after changing a model in `parts.js`):

```bash
cd tools/part-renders
npm init -y && npm install three@0.169.0 playwright@1.48.2
python3 -m http.server 8765 --bind 127.0.0.1 &   # serves render.html + node_modules
npx playwright install chromium
node render-parts.mjs ../../frontend/public/images/parts 1000 \
  display back-glass camera front-camera charging-port sim-tray speaker ear-speaker flex frame logic-board default
```

`render.html?part=<name>` shows a single render in a browser. Each part is
built from code in `parts.js` (shapes, materials, lights, soft shadow) and
cropped to a 640×640 WebP with a transparent background.
