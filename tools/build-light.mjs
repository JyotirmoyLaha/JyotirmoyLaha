/**
 * Derives assets/<name>-light.svg from every dark source SVG.
 *
 * GitHub honours prefers-color-scheme via <picture>/<source> in READMEs, but
 * an SVG cannot see the page theme itself — so each asset needs a real light
 * twin. Generating them means the dark file stays the single source of truth:
 * edit the dark asset, re-run this, and both stay in sync.
 *
 *   node tools/build-light.mjs
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const A = join(ROOT, 'assets');

/**
 * Dark -> light. Applied as ONE simultaneous pass (see remap below), so a
 * value that is both a source and someone else's target is never re-mapped.
 * Anything absent here is deliberately theme-invariant: brand pill fills,
 * macOS window dots, status greens, and the dark purples used as artwork
 * ink, which already read correctly on white.
 */
const MAP = {
  // surfaces
  '#0d1117': '#ffffff',
  '#0f1420': '#f6f8fa',
  '#161b22': '#f6f8fa',
  // borders
  '#30363d': '#d0d7de',
  // text
  '#e6edf3': '#1f2328',
  '#c9d1d9': '#3d444d',
  '#8b949e': '#59636e',
  // accents — darkened so they hold contrast on white
  '#00f2fe': '#0891b2',
  '#8b5cf6': '#7c3aed',
  '#3b82f6': '#2563eb',
  '#a78bfa': '#7c3aed',
  '#22d3ee': '#0e7490',
  '#38bdf8': '#0284c7',
  '#60a5fa': '#2563eb',
  '#c4b5fd': '#a78bfa',
  // header badge discs — dark tinted circles behind each logo
  '#1e1c10': '#fffbeb',
  '#1e1a10': '#fffbeb',
  '#10141e': '#eff6ff',
  '#10131e': '#eff6ff',
  '#0f1c20': '#ecfeff',
  '#0f1a1d': '#ecfeff',
  '#0f1c1a': '#f0fdfa',
  '#1e1210': '#fff1f0',
  '#1e1110': '#fff1f0',
};

/**
 * Colours to leave alone in specific files.
 * tech_stack paints pill labels on saturated brand fills — that text must
 * stay light or it becomes unreadable on red/blue/orange pills.
 */
const KEEP = {
  'tech_stack.svg': new Set(['#e6edf3']),
};

const SOURCES = Object.keys(MAP);
const RE = new RegExp(SOURCES.join('|'), 'gi');

/** Single simultaneous pass: a produced target is never re-matched. */
function remap(src, keep) {
  return src.replace(RE, (m) => {
    const k = m.toLowerCase();
    if (keep?.has(k)) return m;
    return MAP[k] ?? m;
  });
}

const files = readdirSync(A).filter(
  (f) => f.endsWith('.svg') && !f.endsWith('-light.svg')
);

for (const f of files) {
  // base64-embedded brand logos must be untouched; they contain no bare hex
  // in the outer document, but guard anyway by only remapping outside them.
  const src = readFileSync(join(A, f), 'utf8');
  const parts = src.split(/(base64,[A-Za-z0-9+/=]+)/);
  const out = parts
    .map((p, i) => (i % 2 === 1 ? p : remap(p, KEEP[f])))
    .join('');

  const dest = f.replace(/\.svg$/, '-light.svg');
  writeFileSync(join(A, dest), out, 'utf8');
  console.log(`  ${f}  ->  ${dest}`);
}
console.log(`\ndone — ${files.length} light variant(s) written`);
