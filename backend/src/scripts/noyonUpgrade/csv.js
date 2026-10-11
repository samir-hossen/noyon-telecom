// Minimal RFC 4180 CSV reader/writer (quoted fields, embedded commas,
// quotes and newlines) — enough for the kit's CSV files without adding a
// dependency to the backend.
import fs from 'node:fs';

export function parseCsv(text) {
  const src = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text; // strip UTF-8 BOM
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (inQuotes) {
      if (c === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += c;
    }
  }
  if (field !== '' || row.length) {
    row.push(field);
    rows.push(row);
  }
  const [header, ...body] = rows.filter((r) => r.length > 1 || r[0] !== '');
  return body.map((r) => Object.fromEntries(header.map((h, i) => [h, r[i] ?? ''])));
}

export function readCsv(path) {
  return parseCsv(fs.readFileSync(path, 'utf8'));
}

function csvField(value) {
  const s = value === null || value === undefined ? '' : Array.isArray(value) ? value.join(' | ') : String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// Writes with a BOM so Excel opens the Bangla/৳ text correctly.
export function writeCsv(path, rows, columns) {
  const cols = columns || Object.keys(rows[0] || {});
  const lines = [cols.join(','), ...rows.map((r) => cols.map((c) => csvField(r[c])).join(','))];
  fs.writeFileSync(path, `\ufeff${lines.join('\n')}\n`, 'utf8');
}
