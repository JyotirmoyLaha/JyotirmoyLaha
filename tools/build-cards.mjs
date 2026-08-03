/**
 * Generates assets/project_*.svg from a single template.
 *
 * Why a generator: the cards must use native <text>/<rect> (GitHub's image
 * proxy does not render <foreignObject>), which means every pill width and
 * text baseline is hand-positioned. Deriving all five from one spec keeps
 * them pixel-consistent and makes copy edits a one-line change.
 *
 *   node tools/build-cards.mjs
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
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
const H = 180;
const PAD = 28;
const COL = 600; // left column right edge

const esc = (s) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Pill row: <rect>+<text> pairs, widths derived from label length. */
function pills(labels, x0, y) {
  let x = x0;
  const out = [];
  for (const label of labels) {
    const w = Math.round(label.length * 6.6) + 20;
    out.push(
      `    <g transform="translate(${x}, ${y})">\n` +
        `      <rect width="${w}" height="22" rx="5" fill="${C.elev}" stroke="${C.border}" stroke-width="1"/>\n` +
        `      <text x="${w / 2}" y="14.5" text-anchor="middle" font-family="${SANS}" font-size="10" font-weight="700" letter-spacing="0.4" fill="#c9d1d9">${esc(label)}</text>\n` +
        `    </g>`
    );
    x += w + 7;
  }
  if (x - 7 > COL) {
    console.warn(`  ! pill row overflows column (${Math.round(x - 7)} > ${COL})`);
  }
  return out.join('\n');
}

function card(p) {
  const uid = p.id;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${esc(p.name)} — ${esc(p.aria)}">
  <defs>
    <linearGradient id="${uid}-bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${C.bg}"/>
      <stop offset="100%" stop-color="${C.bgAlt}"/>
    </linearGradient>
    <linearGradient id="${uid}-spine" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="${p.accent}" stop-opacity="0.15"/>
      <stop offset="50%" stop-color="${p.accent}" stop-opacity="1"/>
      <stop offset="100%" stop-color="${p.accent}" stop-opacity="0.15"/>
    </linearGradient>
    <linearGradient id="${uid}-rule" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="${p.accent}" stop-opacity="0.55"/>
      <stop offset="100%" stop-color="${p.accent}" stop-opacity="0"/>
    </linearGradient>
    <filter id="${uid}-soft" x="-60%" y="-60%" width="220%" height="220%">
      <feGaussianBlur stdDeviation="26"/>
    </filter>
  </defs>

  <!-- card -->
  <rect x="0.75" y="0.75" width="${W - 1.5}" height="${H - 1.5}" rx="14" fill="url(#${uid}-bg)" stroke="${C.border}" stroke-width="1.5"/>

  <!-- ambient wash behind the artwork -->
  <circle cx="726" cy="90" r="70" fill="${p.accent}" opacity="0.10" filter="url(#${uid}-soft)"/>

  <!-- accent spine -->
  <rect x="0.75" y="18" width="3" height="${H - 36}" rx="1.5" fill="url(#${uid}-spine)"/>

  <!-- title -->
  <rect x="${PAD}" y="34" width="8" height="8" rx="1.6" fill="${p.accent}" transform="rotate(45 ${PAD + 4} 38)"/>
  <text x="${PAD + 20}" y="43" font-family="${SANS}" font-size="20" font-weight="800" letter-spacing="0.1" fill="${C.hi}">${esc(p.name)}</text>

  <!-- status pill — kept inside the text column so it can never collide
       with the artwork panel on the right -->
  <g transform="translate(${COL - 78}, 27)">
    <rect width="78" height="21" rx="10.5" fill="${C.elev}" stroke="${p.accent}" stroke-opacity="0.5" stroke-width="1"/>
    <circle cx="14" cy="10.5" r="3.2" fill="#3fb950">
      <animate attributeName="opacity" values="1;0.3;1" dur="2.4s" repeatCount="indefinite"/>
    </circle>
    <text x="25" y="14.5" font-family="${MONO}" font-size="9.5" font-weight="700" letter-spacing="1.1" fill="#8b949e">LIVE</text>
  </g>

  <!-- rule -->
  <rect x="${PAD}" y="57" width="${COL - PAD}" height="1.1" fill="url(#${uid}-rule)"/>

  <!-- column separator -->
  <line x1="626" y1="30" x2="626" y2="${H - 30}" stroke="${C.border}" stroke-width="1" stroke-dasharray="3 5" opacity="0.8"/>

  <!-- description -->
  <text x="${PAD}" y="83" font-family="${SANS}" font-size="13" fill="${C.lo}">${esc(p.desc[0])}</text>
  <text x="${PAD}" y="103" font-family="${SANS}" font-size="13" fill="${C.lo}">${esc(p.desc[1])}</text>

  <!-- tech pills -->
${pills(p.tech, PAD, 120)}

  <!-- artwork -->
${p.art}
</svg>
`;
}

/* ─────────────── artwork motifs (local box ≈ 190×130 at 630,25) ─────────────── */

const artStudyverse = `  <g transform="translate(672, 40)">
    <ellipse cx="56" cy="112" rx="40" ry="5.5" fill="#000000" opacity="0.35"/>
    <g>
      <animateTransform attributeName="transform" type="translate" values="0,0; 0,-7; 0,0" dur="5.5s" repeatCount="indefinite"/>
      <polygon points="56,52 16,30 16,70 56,92" fill="#4c1d95"/>
      <polygon points="56,52 96,30 96,70 56,92" fill="#5b21b6"/>
      <polygon points="53,48 18,28 18,66 53,86" fill="#a78bfa"/>
      <polygon points="59,48 94,28 94,66 59,86" fill="#c4b5fd"/>
      <line x1="56" y1="48" x2="56" y2="88" stroke="#8B5CF6" stroke-width="2"/>
      <g stroke="#6d28d9" stroke-width="1.2" opacity="0.75">
        <line x1="24" y1="40" x2="47" y2="53"/>
        <line x1="24" y1="48" x2="47" y2="61"/>
        <line x1="65" y1="53" x2="88" y2="40"/>
        <line x1="65" y1="61" x2="88" y2="48"/>
      </g>
    </g>
    <path d="M18,14 A11,11 0 0,0 35,27 A12,12 0 0,1 18,14" fill="#c4b5fd" opacity="0.9"/>
    <polygon points="88,6 89.6,10 94,10 90.4,12.8 91.8,17 88,14.4 84.2,17 85.6,12.8 82,10 86.4,10" fill="#00F2FE" opacity="0.8">
      <animate attributeName="opacity" values="0.25;0.95;0.25" dur="3s" repeatCount="indefinite"/>
    </polygon>
    <polygon points="70,20 71.2,23 74.4,23 71.8,25 72.8,28 70,26.2 67.2,28 68.2,25 65.6,23 68.8,23" fill="#a78bfa" opacity="0.7">
      <animate attributeName="opacity" values="0.9;0.2;0.9" dur="3.6s" repeatCount="indefinite"/>
    </polygon>
  </g>`;

const artResume = `  <g transform="translate(684, 30)">
    <rect x="10" y="6" width="86" height="112" rx="8" fill="#161b22" stroke="#30363d" stroke-width="1.4"/>
    <rect x="24" y="22" width="42" height="5" rx="2.5" fill="#3B82F6"/>
    <g fill="#30363d">
      <rect x="24" y="38" width="58" height="4" rx="2"/>
      <rect x="24" y="50" width="48" height="4" rx="2"/>
      <rect x="24" y="62" width="58" height="4" rx="2"/>
      <rect x="24" y="74" width="38" height="4" rx="2"/>
      <rect x="24" y="86" width="52" height="4" rx="2"/>
      <rect x="24" y="98" width="30" height="4" rx="2"/>
    </g>
    <!-- scan beam -->
    <g>
      <animateTransform attributeName="transform" type="translate" values="0,0; 0,96; 0,0" dur="4.5s" repeatCount="indefinite"/>
      <rect x="12" y="14" width="82" height="14" fill="#00F2FE" opacity="0.16"/>
      <rect x="12" y="27" width="82" height="1.6" fill="#00F2FE" opacity="0.95"/>
    </g>
    <!-- score ring -->
    <g transform="translate(84, 96)">
      <circle r="20" fill="#0d1117" stroke="#30363d" stroke-width="3"/>
      <circle r="20" fill="none" stroke="#3fb950" stroke-width="3" stroke-linecap="round" stroke-dasharray="126" stroke-dashoffset="126" transform="rotate(-90)">
        <animate attributeName="stroke-dashoffset" values="126;28;28;126" keyTimes="0;0.35;0.85;1" dur="4.5s" repeatCount="indefinite"/>
      </circle>
      <text y="4.5" text-anchor="middle" font-family="${MONO}" font-size="13" font-weight="700" fill="#3fb950">AI</text>
    </g>
  </g>`;

const artMess = `  <g transform="translate(668, 32)">
    <!-- attendance calendar -->
    <rect x="8" y="12" width="96" height="86" rx="8" fill="#161b22" stroke="#30363d" stroke-width="1.4"/>
    <path d="M8,20 A8,8 0 0,1 16,12 L96,12 A8,8 0 0,1 104,20 L104,32 L8,32 Z" fill="#3B82F6" opacity="0.9"/>
    <rect x="26" y="5" width="5" height="13" rx="2.5" fill="#8b949e"/>
    <rect x="81" y="5" width="5" height="13" rx="2.5" fill="#8b949e"/>
    <!-- day cells -->
    <g fill="#0d1117" stroke="#30363d" stroke-width="0.9">
      <rect x="17" y="40" width="13" height="12" rx="2.5"/>
      <rect x="34" y="40" width="13" height="12" rx="2.5"/>
      <rect x="51" y="40" width="13" height="12" rx="2.5"/>
      <rect x="68" y="40" width="13" height="12" rx="2.5"/>
      <rect x="85" y="40" width="13" height="12" rx="2.5"/>
      <rect x="17" y="57" width="13" height="12" rx="2.5"/>
      <rect x="34" y="57" width="13" height="12" rx="2.5"/>
      <rect x="51" y="57" width="13" height="12" rx="2.5"/>
      <rect x="68" y="57" width="13" height="12" rx="2.5"/>
      <rect x="85" y="57" width="13" height="12" rx="2.5"/>
      <rect x="17" y="74" width="13" height="12" rx="2.5"/>
      <rect x="34" y="74" width="13" height="12" rx="2.5"/>
      <rect x="51" y="74" width="13" height="12" rx="2.5"/>
    </g>
    <!-- marked-present cells -->
    <g fill="#3fb950" opacity="0.85">
      <rect x="17" y="40" width="13" height="12" rx="2.5"/>
      <rect x="34" y="40" width="13" height="12" rx="2.5"/>
      <rect x="68" y="40" width="13" height="12" rx="2.5"/>
      <rect x="17" y="57" width="13" height="12" rx="2.5"/>
      <rect x="51" y="57" width="13" height="12" rx="2.5"/>
      <rect x="85" y="57" width="13" height="12" rx="2.5"/>
      <rect x="34" y="74" width="13" height="12" rx="2.5">
        <animate attributeName="opacity" values="0;0;1;1" keyTimes="0;0.45;0.55;1" dur="5s" repeatCount="indefinite"/>
      </rect>
    </g>
    <!-- running total -->
    <g transform="translate(96, 88)">
      <circle r="17" fill="#0d1117" stroke="#3B82F6" stroke-width="1.6"/>
      <text y="4.5" text-anchor="middle" font-family="${MONO}" font-size="12" font-weight="700" fill="#38bdf8">₹</text>
    </g>
  </g>`;

const artWeather = `  <g transform="translate(676, 38)">
    <!-- sun -->
    <g transform="translate(30, 26)">
      <circle r="15" fill="#fbbf24" opacity="0.95"/>
      <g stroke="#fbbf24" stroke-width="2.2" stroke-linecap="round" opacity="0.8">
        <animateTransform attributeName="transform" type="rotate" values="0;360" dur="26s" repeatCount="indefinite"/>
        <line x1="0" y1="-22" x2="0" y2="-27"/>
        <line x1="0" y1="22" x2="0" y2="27"/>
        <line x1="-22" y1="0" x2="-27" y2="0"/>
        <line x1="22" y1="0" x2="27" y2="0"/>
        <line x1="-15.5" y1="-15.5" x2="-19" y2="-19"/>
        <line x1="15.5" y1="15.5" x2="19" y2="19"/>
        <line x1="-15.5" y1="15.5" x2="-19" y2="19"/>
        <line x1="15.5" y1="-15.5" x2="19" y2="-19"/>
      </g>
    </g>
    <!-- cloud -->
    <g>
      <animateTransform attributeName="transform" type="translate" values="0,0; 5,-4; 0,0" dur="6s" repeatCount="indefinite"/>
      <path d="M40,74 A17,17 0 0,1 57,57 A21,21 0 0,1 96,52 A16,16 0 0,1 100,74 Z" fill="#38bdf8" opacity="0.28"/>
      <path d="M40,74 A17,17 0 0,1 57,57 A21,21 0 0,1 96,52 A16,16 0 0,1 100,74 Z" fill="none" stroke="#38bdf8" stroke-width="1.6" opacity="0.9"/>
    </g>
    <!-- rain -->
    <g stroke="#00F2FE" stroke-width="2.2" stroke-linecap="round">
      <line x1="54" y1="82" x2="50" y2="94" opacity="0.8">
        <animate attributeName="opacity" values="0;0.9;0" dur="1.5s" repeatCount="indefinite"/>
      </line>
      <line x1="70" y1="82" x2="66" y2="94" opacity="0.8">
        <animate attributeName="opacity" values="0;0.9;0" dur="1.5s" begin="-0.5s" repeatCount="indefinite"/>
      </line>
      <line x1="86" y1="82" x2="82" y2="94" opacity="0.8">
        <animate attributeName="opacity" values="0;0.9;0" dur="1.5s" begin="-1s" repeatCount="indefinite"/>
      </line>
    </g>
    <!-- temp readout -->
    <text x="70" y="118" text-anchor="middle" font-family="${MONO}" font-size="15" font-weight="700" fill="#e6edf3">28°C</text>
  </g>`;

const artPortfolio = `  <g transform="translate(668, 34)">
    <rect x="0" y="0" width="112" height="86" rx="8" fill="#161b22" stroke="#30363d" stroke-width="1.4"/>
    <path d="M0,8 A8,8 0 0,1 8,0 L104,0 A8,8 0 0,1 112,8 L112,18 L0,18 Z" fill="#0d1117"/>
    <line x1="0" y1="18" x2="112" y2="18" stroke="#30363d" stroke-width="1"/>
    <circle cx="12" cy="9" r="2.6" fill="#FF5F56"/>
    <circle cx="21" cy="9" r="2.6" fill="#FFBD2E"/>
    <circle cx="30" cy="9" r="2.6" fill="#27C93F"/>
    <rect x="44" y="6" width="56" height="6" rx="3" fill="#30363d"/>
    <!-- hero block -->
    <rect x="10" y="26" width="44" height="26" rx="4" fill="#8B5CF6" opacity="0.75">
      <animate attributeName="opacity" values="0.45;0.85;0.45" dur="4s" repeatCount="indefinite"/>
    </rect>
    <g fill="#30363d">
      <rect x="60" y="26" width="42" height="4" rx="2"/>
      <rect x="60" y="35" width="34" height="4" rx="2"/>
      <rect x="60" y="44" width="42" height="4" rx="2"/>
    </g>
    <!-- grid -->
    <g fill="#0d1117" stroke="#30363d" stroke-width="1">
      <rect x="10" y="60" width="28" height="16" rx="3"/>
      <rect x="42" y="60" width="28" height="16" rx="3"/>
      <rect x="74" y="60" width="28" height="16" rx="3"/>
    </g>
    <!-- cursor -->
    <g>
      <animateTransform attributeName="transform" type="translate" values="0,0; 46,26; 12,34; 0,0" dur="9s" repeatCount="indefinite"/>
      <path d="M56,52 L56,70 L61,65 L64,72 L67,70 L64,63 L70,63 Z" fill="#e6edf3" stroke="#0d1117" stroke-width="1.2"/>
    </g>
  </g>`;

/* ─────────────── project data ─────────────── */

const projects = [
  {
    id: 'sv',
    file: 'project_studyverse.svg',
    name: 'StudyVerse',
    accent: C.violet,
    aria: 'zen study and life journal with real-time sync',
    desc: [
      'Zen-inspired daily study & life journal with real-time Firestore sync,',
      'streak tracking, image attachments and full light/dark theming.',
    ],
    tech: ['HTML5', 'CSS3', 'JavaScript', 'Firebase', 'Firestore', 'Google Auth', 'Canvas API'],
    art: artStudyverse,
  },
  {
    id: 'ra',
    file: 'project_resume.svg',
    name: 'AI Resume Analyzer',
    accent: C.cyan,
    aria: 'AI-powered resume scoring and feedback tool',
    desc: [
      'Upload a resume and get AI-scored feedback on structure, keywords and',
      'role fit — parsed server-side, rendered as an actionable report.',
    ],
    tech: ['React', 'Node.js', 'Express', 'Python', 'NLP', 'REST API', 'Tailwind'],
    art: artResume,
  },
  {
    id: 'mm',
    file: 'project_mess.svg',
    name: 'Mess Manager',
    accent: C.blue,
    aria: 'hostel mess billing and attendance manager',
    desc: [
      'Tracks hostel mess attendance, per-member consumption and monthly dues,',
      'with automated bill splitting and an exportable ledger.',
    ],
    tech: ['HTML5', 'CSS3', 'JavaScript', 'Node.js', 'Express', 'MongoDB'],
    art: artMess,
  },
  {
    id: 'wx',
    file: 'project_weather.svg',
    name: 'J.SkyCast Weather',
    accent: C.cyan,
    aria: 'live weather forecast app with geolocation',
    desc: [
      'Live conditions and multi-day forecasts from geolocation or search,',
      'with dynamic backdrops that respond to the current weather state.',
    ],
    tech: ['HTML5', 'CSS3', 'JavaScript', 'Weather API', 'Geolocation'],
    art: artWeather,
  },
  {
    id: 'pf',
    file: 'project_portfolio.svg',
    name: 'Personal Portfolio',
    accent: C.violet,
    aria: 'responsive personal portfolio site',
    desc: [
      'Responsive single-page portfolio with scroll-driven animation, project',
      'showcase and a working contact pipeline.',
    ],
    tech: ['HTML5', 'CSS3', 'JavaScript', 'GSAP', 'Responsive'],
    art: artPortfolio,
  },
];

mkdirSync(OUT, { recursive: true });
for (const p of projects) {
  console.log(`building ${p.file}`);
  writeFileSync(join(OUT, p.file), card(p), 'utf8');
}
console.log(`\ndone — ${projects.length} cards written to assets/`);
