import { chromium } from 'playwright';
import fs from 'node:fs';
const [,, outDir, size, ...parts] = process.argv;
const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'],
});
const page = await (await browser.newContext({ viewport: { width: Number(size), height: Number(size) } })).newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
fs.mkdirSync(outDir, { recursive: true });
for (const part of parts) {
  const t0 = Date.now();
  await page.goto(`http://localhost:8765/render.html?part=${part}&size=${size}`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__png, null, { timeout: 180000 });
  const data = await page.evaluate(() => window.__png);
  fs.writeFileSync(`${outDir}/${part}.webp`, Buffer.from(data.split(',')[1], 'base64'));
  console.log(part, `${((Date.now() - t0) / 1000).toFixed(1)}s`, `${Math.round(fs.statSync(`${outDir}/${part}.webp`).size / 1024)}KB`);
}
console.log('errors:', errors.slice(0, 5).join(' || ') || 'none');
await browser.close();
