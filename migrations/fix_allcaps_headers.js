/**
 * Migration: strip all-caps OCR title headers glued to the start of paragraph
 * text. e.g. "TAKETHERODAND GATHERTHEPEOPLE Thanks to..." → "Thanks to..."
 *
 * Usage:
 *   node migrations/fix_allcaps_headers.js            # dry run (no changes)
 *   node migrations/fix_allcaps_headers.js --apply    # apply changes
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const readEnv = () => {
  const p = path.join(__dirname, '..', '.env');
  if (!fs.existsSync(p)) return {};
  return fs.readFileSync(p, 'utf8').split(/\r?\n/).reduce((o, l) => {
    const i = l.indexOf('=');
    if (i > 0) o[l.slice(0, i)] = l.slice(i + 1);
    return o;
  }, {});
};

const env = readEnv();
const URL = env.SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_ROLE || env.SUPABASE_ANON_KEY;
const headers = { apikey: KEY, Authorization: 'Bearer ' + KEY };

async function getJson(p) {
  const r = await fetch(URL + '/rest/v1/' + p, { headers });
  return r.json();
}

function normalizeText(text) {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/[\u00A0\u00AD]/g, ' ')
    .replace(/[\u2018\u2019\u201C\u201D]/g, '')
    .replace(/\u2026/g, '')
    .replace(/[\u2013\u2014]/g, ' ')
    .replace(/[.,!?;:"'()\[\]{}\-_+=*&^%$#@~`|/\\<>]/g, '')
    .trim()
    .replace(/\s+/g, ' ');
}

// Splits "<ALL CAPS HEADER> <rest>" where rest keeps its first word's case.
function splitHeader(text) {
  if (!text) return null;
  const firstLower = text.search(/[a-z]/);
  if (firstLower < 8) return null;
  let k = firstLower;
  while (k > 0 && !/\s/.test(text[k - 1])) k--;
  const header = text.slice(0, k).trim();
  const letters = (header.match(/[A-Z]/g) || []).length;
  if (letters < 6) return null;
  const rest = text.slice(k).trim();
  if (rest.length < 3) return null;
  return { header, content: rest };
}

const apply = process.argv.includes('--apply');

let all = [];
let from = 0;
const page = 500;
while (true) {
  const rows = await getJson(`paragraphs?select=id,book_id,paragraph_no,text&limit=${page}&offset=${from}`);
  if (!Array.isArray(rows) || rows.length === 0) break;
  all = all.concat(rows);
  from += page;
  console.log('fetched', all.length, 'rows');
  if (rows.length < page) break;
}
console.log('total paragraphs:', all.length);

const fixes = [];
for (const r of all) {
  const s = splitHeader(r.text);
  if (s) fixes.push({ id: r.id, book_id: r.book_id, para: r.paragraph_no, ...s, normalized: normalizeText(s.content) });
}
console.log('candidates to fix:', fixes.length);

const byHeader = {};
fixes.forEach(f => (byHeader[f.header] = (byHeader[f.header] || 0) + 1));
console.log('\nunique headers:', Object.keys(byHeader).length);
Object.entries(byHeader).slice(0, 40).forEach(([h, n]) => console.log('  x' + n, JSON.stringify(h).slice(0, 60)));

console.log('\nsamples (old → new):');
fixes.slice(0, 10).forEach(f => {
  console.log('  book', f.book_id, '#', f.para);
  console.log('    header:', JSON.stringify(f.header));
  console.log('    new  :', JSON.stringify(f.content.slice(0, 90)));
});

if (!apply) {
  console.log('\n[dry run] no changes made. Re-run with --apply to write.');
  process.exit(0);
}

let ok = 0, err = 0;
for (const f of fixes) {
  const r = await fetch(URL + '/rest/v1/paragraphs?id=eq.' + f.id, {
    method: 'PATCH',
    headers: { ...headers, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify({ text: f.content, normalized_text: f.normalized }),
  });
  if (r.ok) ok++; else { err++; console.log('  update failed', f.id, r.status, await r.text().catch(() => '')); }
}
console.log('\ndone. updated:', ok, 'errors:', err);