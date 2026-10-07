/**
 * Generates assets/hero.svg (the neofetch-style banner with the ASCII
 * portrait) and assets/outro.svg (the closing `exit` terminal).
 *
 * The portrait comes from tools/portrait.json, a box-downsampled colour grid
 * of the GitHub avatar (one cell per character). Each cell becomes a glyph
 * chosen by luminance and a colour from the token palette, so every colour
 * here has a pair in build-light.mjs MAP and the light twin works for free.
 *
 * Animation follows the README rule: every element's STATIC value is its
 * final state, and SMIL only overrides it. A renderer that ignores animation
 * still shows the full portrait and every line.
 *
 *   node tools/build-hero.mjs
 *   node tools/build-light.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const A = join(ROOT, 'assets');
const P = JSON.parse(readFileSync(join(ROOT, 'tools', 'portrait.json'), 'utf8'));

const C = {
  bg: '#0d1117',
  bg2: '#0f1420',
  elev: '#161b22',
  border: '#30363d',
  hi: '#e6edf3',
  mid: '#c9d1d9',
  lo: '#8b949e',
  violet: '#8B5CF6',
  violetHi: '#a78bfa',
  lilac: '#c4b5fd',
  blue: '#3B82F6',
  blueHi: '#60a5fa',
  cyan: '#22d3ee',
  aqua: '#00F2FE',
};

const SANS = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const MONO = "ui-monospace,'Cascadia Code',Consolas,monospace";

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const f = (n) => +n.toFixed(2);

/* ── window chrome shared by both terminals ── */
function chrome(W, H, title, id) {
  return `
  <defs>
    <linearGradient id="${id}-ground" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${C.bg}"/>
      <stop offset="100%" stop-color="${C.bg2}"/>
    </linearGradient>
    <radialGradient id="${id}-wash" cx="22%" cy="55%" r="55%">
      <stop offset="0%" stop-color="${C.violet}" stop-opacity="0.07"/>
      <stop offset="100%" stop-color="${C.violet}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect x="0.75" y="0.75" width="${W - 1.5}" height="${H - 1.5}" rx="14" fill="url(#${id}-ground)" stroke="${C.border}" stroke-width="1.5"/>
  <rect x="0.75" y="0.75" width="${W - 1.5}" height="${H - 1.5}" rx="14" fill="url(#${id}-wash)"/>
  <rect x="1.5" y="34" width="${W - 3}" height="1" fill="${C.border}"/>
  <circle cx="22" cy="18" r="5.5" fill="#ff5f57"/>
  <circle cx="40" cy="18" r="5.5" fill="#febc2e"/>
  <circle cx="58" cy="18" r="5.5" fill="#28c840"/>
  <text x="${W / 2}" y="22" text-anchor="middle" font-family="${MONO}" font-size="11" letter-spacing="0.6" fill="${C.lo}">${esc(title)}</text>`;
}

/**
 * prompt + a command typed one character at a time. Each glyph animates its
 * own fill-opacity; static value is 1. (An animated clipPath was tried first:
 * Chrome does not repaint a clip whose animation ends in fill="freeze".)
 */
function promptLine(x, y, cmd, t0, t1, total, loop) {
  const cmdX = x + 141;
  const step = (t1 - t0) / cmd.length;
  const chars = [...cmd].map((ch, i) => {
    const at = t0 + i * step;
    const a = f(at / total), b = f((at + 0.01) / total);
    const anim = loop
      ? `<animate attributeName="fill-opacity" values="0;0;1;1;0" keyTimes="0;${a};${b};0.95;1" dur="${total}s" repeatCount="indefinite"/>`
      : `<animate attributeName="fill-opacity" values="0;0;1" keyTimes="0;${f(at / (at + 0.01))};1" dur="${f(at + 0.01)}s" fill="freeze"/>`;
    return `<tspan>${esc(ch)}${anim}</tspan>`;
  }).join('');
  return `
  <text x="${x}" y="${y}" font-family="${MONO}" font-size="13" font-weight="600"><tspan fill="${C.cyan}">jyotirmoy@laha</tspan><tspan fill="${C.lo}">:</tspan><tspan fill="${C.violetHi}">~</tspan><tspan fill="${C.lo}">$</tspan></text>
  <text x="${cmdX}" y="${y}" font-family="${MONO}" font-size="13" fill="${C.hi}" xml:space="preserve">${chars}</text>`;
}

/** opacity 0 until `at` seconds, then fade in; static value stays 1 */
function fadeIn(at, total, loop, outAt) {
  if (loop) {
    const a = f(at / total), b = f((at + 0.35) / total), o = f(outAt / total);
    return `<animate attributeName="opacity" values="0;0;1;1;0" keyTimes="0;${a};${b};${o};1" dur="${total}s" repeatCount="indefinite"/>`;
  }
  const end = at + 0.35;
  return `<animate attributeName="opacity" values="0;0;1" keyTimes="0;${f(at / end)};1" dur="${f(end)}s" fill="freeze"/>`;
}

/* ═════════════════════════  HERO  ═════════════════════════ */

const W = 850, H = 452;
const FS = 8;              // portrait font size
const CW = 4.8;            // cell advance (0.6em monospace)
const LH = 8.4;            // line height
const PX = 34, PY = 78;    // portrait origin (top-left of first cell)
const PW = P.cols * CW, PH = P.rows * LH;

/**
 * Glyph + colour per tone tier. On a dark terminal a glyph's visual weight is
 * density x colour, so every foreground tier gets textured glyphs (never '-',
 * which merges into rules once textLength stretches the row) and colour does
 * most of the shading. Within a tier, brighter cells take denser glyphs.
 */
const TIERS = [
  { max: 0.16, glyphs: '+*#', top: C.violet, low: C.blue },      // hair, hoodie, eyes
  { max: 0.4, glyphs: '*#%', top: C.violetHi, low: C.blueHi },   // hair sheen, hoodie folds
  { max: 0.56, glyphs: '#%&', top: C.lilac, low: C.lilac },      // skin in shadow
  { max: 0.7, glyphs: '%&@', top: C.mid, low: C.mid },           // skin
  { max: 1.01, glyphs: '&@@', top: C.hi, low: C.hi },            // highlights
];

function cell(hex, bgNib, row) {
  const bg = parseInt(bgNib, 16) / 15;
  if (bg > 0.62) return null;
  const r = parseInt(hex.slice(0, 2), 16), g = parseInt(hex.slice(2, 4), 16), b = parseInt(hex.slice(4, 6), 16);
  const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  const low = row >= 25; // below the jaw: the hoodie
  // soft silhouette: cells that straddle the background get light glyphs
  if (bg > 0.3) return { ch: bg > 0.48 ? '.' : ':', fill: low ? C.blue : C.violet };

  let lo = 0;
  for (const t of TIERS) {
    if (lum < t.max) {
      const k = Math.min(t.glyphs.length - 1, Math.floor(((lum - lo) / (t.max - lo)) * t.glyphs.length));
      return { ch: t.glyphs[k], fill: low ? t.low : t.top };
    }
    lo = t.max;
  }
}

function portraitRows() {
  const out = [];
  for (let y = 0; y < P.rows; y++) {
    const row = P.rgb[y], bgr = P.bg[y];
    const runs = [];
    for (let x = 0; x < P.cols; x++) {
      const c = cell(row.slice(x * 6, x * 6 + 6), bgr[x], y);
      const ch = c ? c.ch : ' ';
      const fill = c ? c.fill : null;
      const last = runs[runs.length - 1];
      if (last && (last.fill === fill || !c)) last.s += ch;
      else runs.push({ fill, s: ch });
    }
    // trim fully blank rows/edges: leading spaces still count toward textLength
    const body = runs
      .map((r) => (r.fill ? `<tspan fill="${r.fill}">${esc(r.s)}</tspan>` : r.s))
      .join('');
    const at = T_SCAN0 + (y / P.rows) * T_SCAN;
    out.push(
      `<text opacity="1" x="${PX}" y="${f(PY + (y + 1) * LH - 1.6)}" textLength="${f(PW)}" lengthAdjust="spacingAndGlyphs" xml:space="preserve"><animate attributeName="opacity" values="0;0;1" keyTimes="0;${f(at / (at + 0.06))};1" dur="${f(at + 0.06)}s" fill="freeze"/>${body}</text>`
    );
  }
  return out.join('\n    ');
}

const INFO = [
  ['Role', 'Web Developer'],
  ['Focus', 'AI / ML · Web'],
  ['Study', 'BCA · Year 3'],
  ['Motto', 'build → break → rebuild'],
];

const RX = 418;            // right column
const T_CMD0 = 0.35, T_CMD1 = 1.1;
const T_SCAN0 = 1.25, T_SCAN = 2.4;
const T_INFO = 1.6;

function hero() {
  const scanEnd = T_SCAN0 + T_SCAN;
  const kS0 = f(T_SCAN0 / scanEnd);

  const info = INFO.map(([k, v], i) => {
    const y = 206 + i * 34;
    return `<g opacity="1">${fadeIn(T_INFO + i * 0.16)}
    <text x="${RX}" y="${y}" font-family="${MONO}" font-size="12" font-weight="700" fill="${C.cyan}">${esc(k)}</text>
    <text x="${RX + 84}" y="${y}" font-family="${SANS}" font-size="15" font-weight="500" fill="${C.hi}">${esc(v)}</text>
  </g>`;
  }).join('\n  ');

  const swatches = [C.violet, C.violetHi, C.lilac, C.blue, C.blueHi, C.cyan, C.aqua, C.hi];
  const sw = swatches
    .map((c, i) => `<rect x="${RX + i * 26}" y="382" width="22" height="12" rx="2.5" fill="${c}"/>`)
    .join('');
  const tSw = T_INFO + INFO.length * 0.16 + 0.1;
  const tPrompt = tSw + 0.35;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Terminal running neofetch for Jyotirmoy Laha: an ASCII-art portrait beside his profile — Web Developer, focus AI/ML and web, BCA year 3. Motto: build, break, rebuild.">
  ${chrome(W, H, 'jyotirmoy@laha: ~ — neofetch', 'hr')}
  <defs>
        <linearGradient id="hr-beam" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${C.aqua}" stop-opacity="0"/>
      <stop offset="85%" stop-color="${C.aqua}" stop-opacity="0.22"/>
      <stop offset="100%" stop-color="${C.aqua}" stop-opacity="0.9"/>
    </linearGradient>
    <linearGradient id="hr-sweep" gradientUnits="userSpaceOnUse" x1="${RX}" y1="0" x2="${RX + 380}" y2="0">
      <stop offset="0" stop-color="${C.hi}"/>
      <stop offset="0.40" stop-color="${C.hi}">
        <animate attributeName="offset" values="-0.35;1.00;1.00" keyTimes="0;0.55;1" dur="9s" repeatCount="indefinite"/>
      </stop>
      <stop offset="0.50" stop-color="${C.violetHi}">
        <animate attributeName="offset" values="-0.25;1.10;1.10" keyTimes="0;0.55;1" dur="9s" repeatCount="indefinite"/>
      </stop>
      <stop offset="0.60" stop-color="${C.hi}">
        <animate attributeName="offset" values="-0.15;1.20;1.20" keyTimes="0;0.55;1" dur="9s" repeatCount="indefinite"/>
      </stop>
      <stop offset="1" stop-color="${C.hi}"/>
    </linearGradient>
  </defs>
  ${promptLine(24, 60, 'neofetch --human', T_CMD0, T_CMD1, T_CMD1 + 0.1, false)}

  <!-- ── ASCII portrait ── -->
  <g font-family="${MONO}" font-size="${FS}" font-weight="700">
    ${portraitRows()}
  </g>

  <!-- print head: rides the reveal edge once, then idles as a slow rescan.
       Static opacity 0, so it never shows without SMIL. -->
  <rect x="${PX - 4}" y="${PY - 26}" width="${f(PW + 8)}" height="26" fill="url(#hr-beam)" opacity="0">
    <animate attributeName="y" values="${PY - 26};${PY - 26};${f(PY + PH - 26)}" keyTimes="0;${kS0};1" dur="${f(scanEnd)}s" fill="freeze"/>
    <animate attributeName="opacity" values="0;0;1;1;0" keyTimes="0;${kS0};${f((T_SCAN0 + 0.1) / scanEnd)};0.97;1" dur="${f(scanEnd)}s" fill="freeze"/>
  </rect>
  <rect x="${PX - 4}" y="${PY - 26}" width="${f(PW + 8)}" height="26" fill="url(#hr-beam)" opacity="0">
    <animate attributeName="y" values="${PY - 26};${f(PY + PH - 26)}" dur="3.2s" begin="${f(scanEnd + 4)}s" repeatCount="indefinite"/>
    <animate attributeName="opacity" values="0;0.35;0.35;0" keyTimes="0;0.1;0.85;1" dur="3.2s" begin="${f(scanEnd + 4)}s" repeatCount="indefinite"/>
  </rect>

  <!-- ── identity ── -->
  <g>${fadeIn(T_INFO - 0.35)}
    <text x="${RX}" y="98" font-family="${MONO}" font-size="12" font-weight="700"><tspan fill="${C.cyan}">jyotirmoy</tspan><tspan fill="${C.lo}">@</tspan><tspan fill="${C.violetHi}">laha</tspan></text>
    <text x="${RX - 2}" y="140" font-family="${SANS}" font-size="38" font-weight="900" letter-spacing="-1.5" fill="url(#hr-sweep)">JYOTIRMOY LAHA</text>
    <rect x="${RX}" y="158" width="396" height="1" fill="${C.border}"/>
    <rect x="${RX}" y="158" width="64" height="1.6" fill="${C.violet}"/>
  </g>

  <!-- ── neofetch fields ── -->
  ${info}

  <g>${fadeIn(tSw)}${sw}</g>

  <g>${fadeIn(tPrompt)}
    <text x="${RX}" y="428" font-family="${MONO}" font-size="13" font-weight="600"><tspan fill="${C.cyan}">jyotirmoy@laha</tspan><tspan fill="${C.lo}">:</tspan><tspan fill="${C.violetHi}">~</tspan><tspan fill="${C.lo}">$</tspan></text>
    <rect x="${RX + 141}" y="417" width="8" height="14" rx="1" fill="${C.aqua}">
      <animate attributeName="opacity" values="1;1;0;0" keyTimes="0;0.5;0.5;1" dur="1.1s" repeatCount="indefinite"/>
    </rect>
  </g>
</svg>
`;
}

/* ═════════════════════════  OUTRO  ═════════════════════════ */

function outro() {
  const W = 850, H = 128, T = 12;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Terminal sign-off: exit — logout. Thanks for scrolling all the way down. Connection to jyotirmoy@laha closed.">
  ${chrome(W, H, 'jyotirmoy@laha: ~ — exit', 'ot')}
  ${promptLine(24, 62, 'exit', 0.6, 1.0, T, true)}
  <g>${fadeIn(1.4, T, true, 11.4)}
    <text x="24" y="86" font-family="${MONO}" font-size="12.5" fill="${C.lo}">logout — thanks for scrolling all the way down <tspan fill="${C.violetHi}">✦</tspan></text>
  </g>
  <g>${fadeIn(2.0, T, true, 11.4)}
    <text x="24" y="108" font-family="${MONO}" font-size="12.5" fill="${C.lo}">Connection to <tspan fill="${C.cyan}">jyotirmoy@laha</tspan> closed. Come back soon.</text>
  </g>
</svg>
`;
}

writeFileSync(join(A, 'hero.svg'), hero(), 'utf8');
writeFileSync(join(A, 'outro.svg'), outro(), 'utf8');
console.log('  hero.svg, outro.svg written');
