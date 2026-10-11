// Re-runs the kit's own match_prices.py (unchanged — the owner's pricing rule
// lives in pricing_rule.py next to it) on the CLEANED product names from
// name-fixes.json. The kit's name splitter can't read shop shorthand like
// "INF HOT 40 / HOT 40 PRO" (it becomes "Hot Hot 40 Pro" and matches
// nothing); with full model names it matches more products to market prices.
//
// Usage (from website/backend, after buildImportFiles.js --phases 4):
//   node src/scripts/noyonUpgrade/rematchCleanNames.js --kit ../../noyon-telecom-kit --out ../../import
// Writes <out>/price-reference-clean-names.csv
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : fallback;
}

const KIT = path.resolve(arg('kit', '../../noyon-telecom-kit'));
const OUT = path.resolve(arg('out', '../../import'));
const WORK = path.resolve(arg('work', fs.mkdtempSync(path.join(os.tmpdir(), 'noyon-rematch-'))));

fs.mkdirSync(path.join(WORK, 'scripts'), { recursive: true });
fs.mkdirSync(path.join(WORK, 'data'), { recursive: true });
for (const f of ['match_prices.py', 'pricing_rule.py']) {
  fs.copyFileSync(path.join(KIT, 'scripts', f), path.join(WORK, 'scripts', f));
}
for (const f of ['etel_all_products.csv', 'etel_all_variations.csv']) {
  const target = path.join(WORK, 'data', f);
  if (!fs.existsSync(target)) fs.symlinkSync(path.join(KIT, 'data', f), target);
}

const products = JSON.parse(fs.readFileSync(path.join(KIT, 'data', 'noyon_products.json'), 'utf8'));
const fixes = new Map(JSON.parse(fs.readFileSync(path.join(OUT, 'name-fixes.json'), 'utf8')).map((f) => [f.id, f]));
const cleaned = products.map((p) => {
  const f = fixes.get(p.id);
  if (!f || !['auto-fix', 'unchanged'].includes(f.status) || !f.compatibleModels?.length) return p;
  // Full model names joined, so the kit's splitter keeps each one whole.
  return { ...p, name: `${f.compatibleModels.join(' / ')} — ${p.category}`, brand: f.brand || p.brand };
});
fs.writeFileSync(path.join(WORK, 'data', 'noyon_products.json'), JSON.stringify(cleaned));

const output = execFileSync('python3', ['-I', path.join(WORK, 'scripts', 'match_prices.py')], { encoding: 'utf8' });
process.stdout.write(output);
fs.copyFileSync(path.join(WORK, 'data', 'noyon_price_reference_all.csv'), path.join(OUT, 'price-reference-clean-names.csv'));
console.log(`-> ${path.join(OUT, 'price-reference-clean-names.csv')}`);
