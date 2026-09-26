/**
 * Generates assets/activity.svg — the 31-day contribution graph.
 *
 * This replaces github-readme-activity-graph.vercel.app, whose public
 * deployment went down (HTTP 402 DEPLOYMENT_DISABLED) and left a broken
 * image in the README. Rendering it here and committing the result means
 * the README only ever points at files in this repo; if the fetch fails,
 * the script exits without writing and the last good graph stays up.
 *
 * Needs a token with public read access (the Action passes GITHUB_TOKEN):
 *
 *   GITHUB_TOKEN=$(gh auth token) node tools/build-activity.mjs
 *   node tools/build-light.mjs     # derives activity-light.svg
 */
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'assets', 'activity.svg');

const LOGIN = 'JyotirmoyLaha';
const DAYS = 31;

// Every colour here has a pair in build-light.mjs MAP.
const C = {
  bg: '#0d1117',
  elev: '#161b22',
  border: '#30363d',
  hi: '#e6edf3',
  lo: '#8b949e',
  violet: '#8B5CF6',
  blue: '#3B82F6',
  cyan: '#00F2FE',
};

const SANS = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const MONO = "ui-monospace,'Cascadia Code',Consolas,monospace";

const W = 850;
const H = 300;
const PLOT = { l: 52, r: 822, t: 70, b: 246 };

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const fmtDay = (iso) => {
  const [, m, d] = iso.split('-').map(Number);
  return `${MONTHS[m - 1]} ${d}`;
};

async function fetchDays() {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error('GITHUB_TOKEN is not set');

  const to = new Date();
  const from = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate() - (DAYS - 1)));

  const query = `query($login: String!, $from: DateTime!, $to: DateTime!) {
    user(login: $login) {
      contributionsCollection(from: $from, to: $to) {
        contributionCalendar { weeks { contributionDays { date contributionCount } } }
      }
    }
  }`;

  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: { Authorization: `bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables: { login: LOGIN, from: from.toISOString(), to: to.toISOString() } }),
  });
  if (!res.ok) throw new Error(`GitHub API ${res.status}: ${await res.text()}`);
  const json = await res.json();
  if (json.errors) throw new Error(JSON.stringify(json.errors));

  const days = json.data.user.contributionsCollection.contributionCalendar.weeks
    .flatMap((w) => w.contributionDays)
    .map((d) => ({ date: d.date, count: d.contributionCount }));
  // The calendar pads to whole weeks; keep exactly the requested window.
  return days.slice(-DAYS);
}

/** Round the axis top up to 1/2/5 x 10^n, split into 4 bands. */
function niceMax(max) {
  if (max <= 4) return 4;
  const raw = max / 4;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 5, 10].map((s) => s * mag).find((s) => s >= raw);
  return step * 4;
}

function render(days) {
  const total = days.reduce((s, d) => s + d.count, 0);
  const max = Math.max(...days.map((d) => d.count));
  const top = niceMax(max);

  const x = (i) => PLOT.l + (i * (PLOT.r - PLOT.l)) / (days.length - 1);
  const y = (v) => PLOT.b - (v / top) * (PLOT.b - PLOT.t);
  const pts = days.map((d, i) => [x(i), y(d.count)]);
  const f = (n) => n.toFixed(1);

  const line = pts.map(([px, py], i) => `${i ? 'L' : 'M'}${f(px)} ${f(py)}`).join(' ');
  const area = `${line} L${f(PLOT.r)} ${PLOT.b} L${PLOT.l} ${PLOT.b} Z`;

  const grid = [0, 1, 2, 3, 4]
    .map((k) => {
      const v = (top / 4) * k;
      const gy = f(y(v));
      return `  <line x1="${PLOT.l}" y1="${gy}" x2="${PLOT.r}" y2="${gy}" stroke="${C.border}" stroke-width="1"${k ? ' stroke-dasharray="3 5"' : ''} />
  <text x="${PLOT.l - 12}" y="${gy}" dy="3.5" text-anchor="end" font-family="${MONO}" font-size="10" fill="${C.lo}">${v}</text>`;
    })
    .join('\n');

  // Label every 5th day from the right edge, so "today" is always labelled.
  const ticks = days
    .map((d, i) => ({ d, i }))
    .filter(({ i }) => (days.length - 1 - i) % 5 === 0)
    .map(
      ({ d, i }) =>
        `  <text x="${f(x(i))}" y="${PLOT.b + 20}" text-anchor="middle" font-family="${MONO}" font-size="10" fill="${C.lo}">${fmtDay(d.date)}</text>`
    )
    .join('\n');

  const dots = pts
    .map(([px, py], i) => {
      const peak = days[i].count === max && max > 0;
      return `  <circle cx="${f(px)}" cy="${f(py)}" r="${peak ? 4 : 2.6}" fill="${peak ? C.cyan : C.bg}" stroke="${C.cyan}" stroke-width="1.6" />`;
    })
    .join('\n');

  // Annotate the latest peak day, nudged inward at the plot edges.
  const pi = days.map((d) => d.count).lastIndexOf(max);
  const [px, py] = pts[pi];
  const anchor = pi < 3 ? 'start' : pi > days.length - 4 ? 'end' : 'middle';
  const peak = max > 0
    ? `  <text x="${f(px)}" y="${f(py - 12)}" text-anchor="${anchor}" font-family="${MONO}" font-size="10.5" font-weight="700" fill="${C.hi}">${max} · ${fmtDay(days[pi].date)}</text>`
    : '';

  const updated = new Date().toISOString().slice(0, 10);

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${total} contributions by ${LOGIN} in the last ${DAYS} days">
  <defs>
    <linearGradient id="ac-area" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${C.violet}" stop-opacity="0.38" />
      <stop offset="100%" stop-color="${C.violet}" stop-opacity="0" />
    </linearGradient>
    <linearGradient id="ac-line" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="${C.violet}" />
      <stop offset="60%" stop-color="${C.blue}" />
      <stop offset="100%" stop-color="${C.cyan}" />
    </linearGradient>
  </defs>

  <rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="12" fill="${C.bg}" stroke="${C.border}" />

  <text x="24" y="36" font-family="${SANS}" font-size="16" font-weight="700" fill="${C.hi}">Contribution Activity</text>
  <text x="${W - 24}" y="35" text-anchor="end" font-family="${MONO}" font-size="10.5" letter-spacing="1.6" fill="${C.lo}">${total} CONTRIBUTIONS · LAST ${DAYS} DAYS</text>

${grid}
${ticks}

  <path d="${area}" fill="url(#ac-area)" />
  <path d="${line}" fill="none" stroke="url(#ac-line)" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round" pathLength="1" stroke-dasharray="1" stroke-dashoffset="0">
    <animate attributeName="stroke-dashoffset" from="1" to="0" dur="1.6s" fill="freeze" />
  </path>
${dots}
${peak}

  <text x="${W - 24}" y="${H - 14}" text-anchor="end" font-family="${MONO}" font-size="9.5" fill="${C.lo}">updated ${updated} UTC</text>
</svg>
`;
}

const days = await fetchDays();
if (days.length < 2) throw new Error(`expected ${DAYS} days, got ${days.length}`);
writeFileSync(OUT, render(days), 'utf8');
console.log(`  wrote assets/activity.svg  (${days[0].date} .. ${days.at(-1).date})`);
