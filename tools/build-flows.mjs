/**
 * Generates the assets/project_*_flow.svg architecture diagrams.
 *
 * The previous hand-authored diagrams had drifted from reality (they showed
 * FastAPI + NLTK for a backend that is actually Flask + pdfplumber, and
 * "Sakura particles" as an architecture step). Every step below is taken
 * from the repository source — see tools/build-cards.mjs for the same note.
 *
 *   node tools/build-flows.mjs
 */
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'assets');

const C = {
  bg: '#0d1117',
  bgAlt: '#0f1420',
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
const H = 152;
const NODE_W = 180;
const NODE_H = 74;
const NODE_Y = 50;
const XS = [28, 232, 436, 640]; // 4 columns, 24px gutters, right edge 820

const esc = (s) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// rough advance widths; enough to catch overflow before it ships
const fits = (s, px, size) => s.length * size * 0.52 <= px;

function node(step, i, accent, uid) {
  const x = XS[i];
  const n = String(i + 1).padStart(2, '0');

  if (!fits(step.title, NODE_W - 46, 11)) console.warn(`  ! title too long: ${step.title}`);
  for (const l of step.lines) {
    if (!fits(l, NODE_W - 24, 8.5)) console.warn(`  ! desc too long: ${l}`);
  }

  return `  <g>
    <rect x="${x}" y="${NODE_Y}" width="${NODE_W}" height="${NODE_H}" rx="10" fill="url(#${uid}-node)" stroke="${C.border}" stroke-width="1.2"/>
    <rect x="${x + 12}" y="${NODE_Y + 11}" width="19" height="17" rx="4" fill="${accent}" fill-opacity="0.16" stroke="${accent}" stroke-opacity="0.4" stroke-width="1"/>
    <text x="${x + 21.5}" y="${NODE_Y + 23}" text-anchor="middle" font-family="${MONO}" font-size="9" font-weight="700" fill="${accent}">${n}</text>
    <text x="${x + 38}" y="${NODE_Y + 24}" font-family="${SANS}" font-size="11" font-weight="700" fill="${C.hi}">${esc(step.title)}</text>
    <text x="${x + 12}" y="${NODE_Y + 46}" font-family="${SANS}" font-size="8.5" fill="${C.lo}">${esc(step.lines[0])}</text>
    <text x="${x + 12}" y="${NODE_Y + 58}" font-family="${SANS}" font-size="8.5" fill="${C.lo}">${esc(step.lines[1] ?? '')}</text>
  </g>`;
}

/** Dashed connector with a travelling dot — the only motion in the diagram. */
function connector(i, accent) {
  const x1 = XS[i] + NODE_W;
  const x2 = XS[i + 1];
  const y = NODE_Y + NODE_H / 2;
  return `  <g>
    <line x1="${x1 + 2}" y1="${y}" x2="${x2 - 2}" y2="${y}" stroke="${C.border}" stroke-width="1.6" stroke-dasharray="3 4"/>
    <path d="M${x2 - 8},${y - 3.5} L${x2 - 2},${y} L${x2 - 8},${y + 3.5}" fill="none" stroke="${accent}" stroke-opacity="0.7" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cy="${y}" r="2.6" fill="${accent}">
      <animate attributeName="cx" values="${x1 + 2};${x2 - 4}" dur="2.2s" begin="${i * 0.5}s" repeatCount="indefinite"/>
      <animate attributeName="opacity" values="0;1;1;0" dur="2.2s" begin="${i * 0.5}s" repeatCount="indefinite"/>
    </circle>
  </g>`;
}

function flow(p) {
  const uid = p.id;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${esc(p.aria)}">
  <defs>
    <linearGradient id="${uid}-bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${C.bg}"/>
      <stop offset="100%" stop-color="${C.bgAlt}"/>
    </linearGradient>
    <linearGradient id="${uid}-node" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="${C.elev}"/>
      <stop offset="100%" stop-color="${C.bgAlt}"/>
    </linearGradient>
    <linearGradient id="${uid}-spine" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="${p.accent}" stop-opacity="0.15"/>
      <stop offset="50%" stop-color="${p.accent}" stop-opacity="1"/>
      <stop offset="100%" stop-color="${p.accent}" stop-opacity="0.15"/>
    </linearGradient>
  </defs>

  <rect x="0.75" y="0.75" width="${W - 1.5}" height="${H - 1.5}" rx="14" fill="url(#${uid}-bg)" stroke="${C.border}" stroke-width="1.5"/>
  <rect x="0.75" y="16" width="3" height="${H - 32}" rx="1.5" fill="url(#${uid}-spine)"/>

  <text x="28" y="30" font-family="${MONO}" font-size="9.5" font-weight="700" letter-spacing="1.6" fill="${p.accent}">${esc(p.label)}</text>
  <text x="822" y="30" text-anchor="end" font-family="${MONO}" font-size="9" letter-spacing="1.2" fill="${C.lo}">${esc(p.runtime)}</text>

${[0, 1, 2].map((i) => connector(i, p.accent)).join('\n')}

${p.steps.map((s, i) => node(s, i, p.accent, uid)).join('\n')}
</svg>
`;
}

/* ─────────────── flows, derived from repo source ─────────────── */

const flows = [
  {
    id: 'svf',
    file: 'project_studyverse_flow.svg',
    accent: C.violet,
    label: 'STUDYVERSE · ARCHITECTURE',
    runtime: 'FIREBASE / SERVERLESS',
    aria:
      'StudyVerse architecture: Google sign-in via Firebase Auth, Canvas-based image ' +
      'compression, writes to Cloud Firestore, then streak and stat computation on read.',
    steps: [
      {
        title: 'Google Sign-In',
        lines: ['signInWithPopup via Firebase', 'Auth compat SDK.'],
      },
      {
        title: 'Compose Entry',
        lines: ['Study or life log captured', 'in the browser.'],
      },
      {
        title: 'Canvas Compress',
        lines: ['Attachments downscaled with', 'the Canvas API before upload.'],
      },
      {
        title: 'Firestore Write',
        lines: ['Entries persisted per user;', 'streaks derived on read.'],
      },
    ],
  },
  {
    id: 'raf',
    file: 'project_resume_flow.svg',
    accent: C.cyan,
    label: 'AI RESUME ANALYZER · ARCHITECTURE',
    runtime: 'FLASK / PYTHON',
    aria:
      'AI Resume Analyzer architecture: the browser posts a PDF and target role to a Flask ' +
      'API, pdfplumber extracts the text, skill_gap scores it against the role, and the ' +
      'response carries matched skills, gaps and a learning roadmap.',
    steps: [
      {
        title: 'Upload + Role',
        lines: ['Tailwind UI posts the PDF', 'and target role to /analyze.'],
      },
      {
        title: 'Extract Text',
        lines: ['resume_parser reads the PDF', 'using pdfplumber.'],
      },
      {
        title: 'Skill Gap Scan',
        lines: ['skill_gap compares skills', 'against the selected role.'],
      },
      {
        title: 'Roadmap Out',
        lines: ['Returns matches, gaps and', 'an ordered learning path.'],
      },
    ],
  },
  {
    id: 'mmf',
    file: 'project_mess_flow.svg',
    accent: C.blue,
    label: 'MESS MANAGER · ARCHITECTURE',
    runtime: 'FIRESTORE / EXPO',
    aria:
      'Mess Manager architecture: Google sign-in gated by Firestore security rules, expenses ' +
      'written to a shared ledger, onSnapshot listeners fan changes out to every client, and ' +
      'the Expo app exports statements as PDF.',
    steps: [
      {
        title: 'Google Sign-In',
        lines: ['Access gated by', 'firestore.rules.'],
      },
      {
        title: 'Log Expense',
        lines: ['Meals and costs written to', 'the shared Firestore ledger.'],
      },
      {
        title: 'Live Sync',
        lines: ['onSnapshot listeners push', 'updates to every client.'],
      },
      {
        title: 'Split + Export',
        lines: ['Balances split per member;', 'expo-print emits a PDF.'],
      },
    ],
  },
  {
    id: 'wxf',
    file: 'project_weather_flow.svg',
    accent: C.cyan,
    label: 'J.SKYCAST · ARCHITECTURE',
    runtime: 'WEATHERAPI / CLIENT-SIDE',
    aria:
      'J.SkyCast architecture: a city search or browser geolocation lookup resolves a query, ' +
      'weatherapi.com returns forecast, air quality and astronomy data, which is parsed and ' +
      'rendered into a backdrop that reflects the current conditions.',
    steps: [
      {
        title: 'Resolve Location',
        lines: ['City search or navigator', 'geolocation lookup.'],
      },
      {
        title: 'WeatherAPI Fetch',
        lines: ['Async request to', 'api.weatherapi.com.'],
      },
      {
        title: 'Parse Metrics',
        lines: ['Forecast, AQI, UV index', 'and astronomy extracted.'],
      },
      {
        title: 'Render Scene',
        lines: ['UI and backdrop swap to', 'match live conditions.'],
      },
    ],
  },
  {
    id: 'pff',
    file: 'project_portfolio_flow.svg',
    accent: C.violet,
    label: 'PORTFOLIO · ARCHITECTURE',
    runtime: 'VITE / FASTAPI / GROQ',
    aria:
      'Portfolio architecture: a React and Vite single-page app renders Three.js and Spline 3D ' +
      'scenes, a FastAPI backend scrapes site content with BeautifulSoup, and Groq LLM ' +
      'completions stream back into the in-page assistant.',
    steps: [
      {
        title: 'Vite SPA',
        lines: ['React + TypeScript bundle', 'styled with Tailwind.'],
      },
      {
        title: '3D Scenes',
        lines: ['Three.js via react-three-', 'fiber, plus Spline runtime.'],
      },
      {
        title: 'FastAPI Layer',
        lines: ['Backend scrapes context', 'with BeautifulSoup.'],
      },
      {
        title: 'Groq Assistant',
        lines: ['LLM completions answer', 'questions about the site.'],
      },
    ],
  },
];

for (const f of flows) {
  console.log(`building ${f.file}`);
  writeFileSync(join(OUT, f.file), flow(f), 'utf8');
}
console.log(`\ndone — ${flows.length} flow diagrams written`);
