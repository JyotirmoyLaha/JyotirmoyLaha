/**
 * Retheme the hand-maintained SVGs onto the unified token palette and strip
 * CSS that cannot work in GitHub's rendering context.
 *
 * GitHub embeds README images with <img>, where SVG is rendered in "secure
 * static" mode: no pointer events, so every :hover rule is dead code.
 *
 * Idempotent — no replacement target is also a replacement source, so it is
 * safe to re-run.
 *
 *   node tools/retheme.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const A = join(ROOT, 'assets');

const FILES = [
  'project_studyverse_flow.svg',
  'project_resume_flow.svg',
  'project_mess_flow.svg',
  'project_weather_flow.svg',
  'project_portfolio_flow.svg',
  'tech_stack.svg',
];

/** sakura + legacy surfaces -> unified violet/blue/cyan on GitHub surfaces */
const COLORS = [
  [/#FF6B8B/gi, '#8B5CF6'],
  [/#FFB7C5/gi, '#a78bfa'],
  [/#FF8DA1/gi, '#22d3ee'],
  [/#FFA5B5/gi, '#a78bfa'],
  [/#FFC0CB/gi, '#c4b5fd'],
  [/#E85A7A/gi, '#7c3aed'],
  [/#C73E5B/gi, '#4c1d95'],
  [/#0c0b16/gi, '#0d1117'],
  [/#0f0d1e/gi, '#0f1420'],
  [/#141226/gi, '#161b22'],
  [/#1b1836/gi, '#161b22'],
  [/#221e3f/gi, '#30363d'],
  [/rgba\(255,\s*107,\s*139,/gi, 'rgba(139, 92, 246,'],
  [/#ffffff/gi, '#e6edf3'],
];

/**
 * Per-file accent normalisation, so each flow diagram matches the accent of
 * the project card it sits under. Keyed by filename — these hexes collide
 * with unrelated brand pills in tech_stack.svg, so they must not be global.
 */
const PER_FILE = {
  'project_resume_flow.svg': [
    [/#33CCFF/gi, '#00F2FE'],
    [/#9D4EDE/gi, '#22d3ee'],
  ],
  'project_mess_flow.svg': [
    [/#10B981/gi, '#3B82F6'],
  ],
  'project_weather_flow.svg': [
    [/#38BDF8/gi, '#00F2FE'],
  ],
  'project_portfolio_flow.svg': [
    [/#6366F1/gi, '#8B5CF6'],
  ],
};

/** Remove any CSS rule whose selector mentions :hover. */
function stripHover(src) {
  return src.replace(/[^{}]*:hover[^{}]*\{[^}]*\}\s*/g, '');
}

/**
 * Drop the decorative particle overlay from the flow diagrams. They are
 * information graphics, and the particles drift outside the card bounds
 * where they read as smudges rather than atmosphere.
 */
function stripOverlay(src) {
  return src
    // the overlay group itself (last element before </svg>)
    .replace(/<g id="readme-theme-overlay[^"]*"[\s\S]*?<\/g>\s*(?=<\/svg>)/, '')
    // and the now-orphaned banner comment above it, whatever its casing
    .replace(/<!--[^\n]*?overlay[^\n]*?-->\s*(?=<\/svg>)/i, '');
}

/** Drop transition declarations — nothing can trigger them in <img> context. */
function stripTransitions(src) {
  return src.replace(/^\s*transition:[^;]*;\s*$/gm, '');
}

/** Collapse blank-line runs left behind by the strippers. */
function tidy(src) {
  return src.replace(/\n{3,}/g, '\n\n');
}

let changed = 0;
for (const f of FILES) {
  const p = join(A, f);
  const before = readFileSync(p, 'utf8');
  let out = before;
  for (const [re, to] of COLORS) out = out.replace(re, to);
  for (const [re, to] of PER_FILE[f] ?? []) out = out.replace(re, to);
  out = tidy(stripTransitions(stripHover(out)));
  // Flow diagrams and the stack table are information graphics — the drifting
  // particles cross their gridlines and read as artefacts, not atmosphere.
  if (f.endsWith('_flow.svg') || f === 'tech_stack.svg') out = stripOverlay(out);
  if (out !== before) {
    writeFileSync(p, out, 'utf8');
    changed++;
    console.log(`  retheme ${basename(p)}`);
  } else {
    console.log(`  = ${basename(p)} (already themed)`);
  }
}
console.log(`\ndone — ${changed} file(s) updated`);
