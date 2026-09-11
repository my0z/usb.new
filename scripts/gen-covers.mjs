/**
 * 커버 이미지 생성기.
 * 사진 자산이 준비되기 전까지 쓰는 편집형 SVG 커버를 만든다.
 * 사용법: node scripts/gen-covers.mjs
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = resolve(root, 'public/assets');
mkdirSync(outDir, { recursive: true });

const covers = [
  { file: 'cover-fit-plus.svg', from: '#1a0f3a', mid: '#5b2a6e', to: '#c2452f', glow: '#ff9f68', accent: '#ffd8b8', label: 'FIT PLUS', num: '01', motif: 'stick' },
  { file: 'cover-extreme-pro.svg', from: '#03131f', mid: '#0b4a55', to: '#1fa98f', glow: '#ffd166', accent: '#e9fff8', label: 'EXTREME PRO', num: '02', motif: 'slab' },
  { file: 'cover-revodock.svg', from: '#0a0d1f', mid: '#22285c', to: '#4c62c9', glow: '#7ad1ff', accent: '#dff3ff', label: 'REVODOCK', num: '03', motif: 'ports' },
  { file: 'cover-usb4.svg', from: '#1c0707', mid: '#6b1a14', to: '#e0533a', glow: '#ffb4a2', accent: '#ffe6df', label: 'USB4 40GBPS', num: '04', motif: 'cable' },
  { file: 'cover-prime160.svg', from: '#0b0b0b', mid: '#3a2f22', to: '#a8783a', glow: '#ffcf5c', accent: '#fff1cc', label: '160W GAN', num: '05', motif: 'slab' },
  { file: 'cover-guide.svg', from: '#07160e', mid: '#1c5a37', to: '#5fb56f', glow: '#c9f299', accent: '#ecffd9', label: 'GUIDE 2026', num: '06', motif: 'ports' },
  { file: 'cover-dtmax.svg', from: '#0d0820', mid: '#3a1f75', to: '#8a5cf0', glow: '#b79bff', accent: '#ece3ff', label: 'DT MAX 1TB', num: '07', motif: 'stick' },
  { file: 'cover-orico.svg', from: '#03121b', mid: '#154a63', to: '#36a2b8', glow: '#8ee6d0', accent: '#dcfff6', label: 'NVME USB4', num: '08', motif: 'slab' },
  { file: 'cover-adapter.svg', from: '#1b1004', mid: '#5c3a0f', to: '#d08a2b', glow: '#ffc46b', accent: '#fff0d6', label: 'ADAPTER RISK', num: '09', motif: 'cable' },
  { file: 'hero-default.svg', from: '#0a0a0e', mid: '#2d1a34', to: '#b0413a', glow: '#ff6f61', accent: '#ffe0dc', label: 'USB.KR', num: '00', motif: 'ports' },
];

const motifs = {
  stick: (a, g) => `
    <g filter="url(#soft)">
      <rect x="500" y="352" width="470" height="196" rx="30" fill="#000" opacity="0.28"/>
    </g>
    <rect x="500" y="340" width="470" height="196" rx="30" fill="url(#body)"/>
    <rect x="520" y="356" width="430" height="8" rx="4" fill="#fff" opacity="0.28"/>
    <rect x="560" y="404" width="260" height="70" rx="14" fill="#000" opacity="0.32"/>
    <rect x="580" y="424" width="180" height="10" rx="5" fill="${a}" opacity="0.9"/>
    <rect x="580" y="446" width="110" height="10" rx="5" fill="${a}" opacity="0.5"/>
    <rect x="960" y="386" width="190" height="104" rx="10" fill="#dcdde3"/>
    <rect x="960" y="386" width="190" height="52" rx="10" fill="#f4f5f8"/>
    <rect x="988" y="420" width="134" height="14" rx="4" fill="${g}"/>
    <rect x="988" y="446" width="90" height="14" rx="4" fill="${g}" opacity="0.55"/>`,
  slab: (a, g) => `
    <g filter="url(#soft)">
      <rect x="450" y="300" width="600" height="320" rx="46" fill="#000" opacity="0.32"/>
    </g>
    <rect x="450" y="284" width="600" height="320" rx="46" fill="url(#body)"/>
    <rect x="474" y="304" width="552" height="10" rx="5" fill="#fff" opacity="0.24"/>
    <circle cx="560" cy="444" r="46" fill="#000" opacity="0.5"/>
    <circle cx="560" cy="444" r="26" fill="${g}" opacity="0.9"/>
    <rect x="650" y="410" width="300" height="18" rx="9" fill="${a}" opacity="0.95"/>
    <rect x="650" y="452" width="200" height="18" rx="9" fill="${a}" opacity="0.5"/>
    <rect x="890" y="540" width="120" height="22" rx="6" fill="#000" opacity="0.4"/>`,
  ports: (a, g) => `
    <g filter="url(#soft)">
      <rect x="400" y="320" width="700" height="260" rx="30" fill="#000" opacity="0.32"/>
    </g>
    <rect x="400" y="304" width="700" height="260" rx="30" fill="url(#body)"/>
    <rect x="420" y="322" width="660" height="8" rx="4" fill="#fff" opacity="0.22"/>
    ${[0, 1, 2, 3]
      .map(
        (i) => `<g transform="translate(${450 + i * 160} 386)">
      <rect width="120" height="86" rx="12" fill="#000" opacity="0.62"/>
      <rect x="14" y="30" width="92" height="26" rx="13" fill="${g}" opacity="${0.95 - i * 0.18}"/>
      <rect x="26" y="40" width="68" height="6" rx="3" fill="#000" opacity="0.4"/>
    </g>`,
      )
      .join('')}
    <circle cx="1040" cy="330" r="10" fill="${a}"/>`,
  cable: (a, g) => `
    <g fill="none" stroke-linecap="round">
      <path d="M120 660 C 420 660 400 280 700 280 S 960 580 1420 470" stroke="#000" stroke-width="42" opacity="0.28" filter="url(#soft)"/>
      <path d="M120 640 C 420 640 400 260 700 260 S 960 560 1420 450" stroke="url(#cable)" stroke-width="30"/>
      <path d="M120 640 C 420 640 400 260 700 260 S 960 560 1420 450" stroke="#fff" stroke-width="6" opacity="0.35" transform="translate(0 -8)"/>
    </g>
    <rect x="630" y="200" width="170" height="80" rx="16" fill="#dcdde3"/>
    <rect x="630" y="200" width="170" height="40" rx="16" fill="#f4f5f8"/>
    <rect x="662" y="228" width="106" height="26" rx="13" fill="${g}"/>
    <circle cx="1400" cy="450" r="14" fill="${a}"/>`,
};

function svg({ from, mid, to, glow, accent, label, num, motif }) {
  const id = label.replace(/[^A-Za-z0-9]/g, '') || 'c';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" width="1600" height="900" role="img" aria-label="${label}">
  <defs>
    <linearGradient id="bg${id}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${from}"/>
      <stop offset="0.55" stop-color="${mid}"/>
      <stop offset="1" stop-color="${to}"/>
    </linearGradient>
    <radialGradient id="glow${id}" cx="0.78" cy="0.22" r="0.55">
      <stop offset="0" stop-color="${glow}" stop-opacity="0.75"/>
      <stop offset="1" stop-color="${glow}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="glow2${id}" cx="0.15" cy="0.9" r="0.5">
      <stop offset="0" stop-color="${to}" stop-opacity="0.6"/>
      <stop offset="1" stop-color="${to}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="body" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.34"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0.08"/>
    </linearGradient>
    <linearGradient id="cable" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="${glow}" stop-opacity="0.35"/>
      <stop offset="0.5" stop-color="${glow}"/>
      <stop offset="1" stop-color="${accent}"/>
    </linearGradient>
    <linearGradient id="streak${id}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#fff" stop-opacity="0"/>
      <stop offset="0.5" stop-color="#fff" stop-opacity="0.14"/>
      <stop offset="1" stop-color="#fff" stop-opacity="0"/>
    </linearGradient>
    <pattern id="grid${id}" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M40 0H0V40" fill="none" stroke="#fff" stroke-opacity="0.06" stroke-width="1"/>
    </pattern>
    <filter id="soft" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="18"/>
    </filter>
    <filter id="grain${id}">
      <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch"/>
      <feColorMatrix type="saturate" values="0"/>
      <feComponentTransfer><feFuncA type="table" tableValues="0 0.12"/></feComponentTransfer>
    </filter>
  </defs>
  <rect width="1600" height="900" fill="url(#bg${id})"/>
  <rect width="1600" height="900" fill="url(#glow${id})"/>
  <rect width="1600" height="900" fill="url(#glow2${id})"/>
  <rect width="1600" height="900" fill="url(#grid${id})"/>
  <polygon points="900,0 1600,0 1600,420" fill="url(#streak${id})"/>
  <text x="1560" y="250" text-anchor="end" font-family="Georgia, 'Times New Roman', serif" font-size="360" font-weight="700" fill="#fff" fill-opacity="0.06" letter-spacing="-20">${num}</text>
  ${motifs[motif](accent, glow)}
  <rect width="1600" height="900" filter="url(#grain${id})" opacity="0.7"/>
  <rect x="96" y="730" width="72" height="6" fill="${glow}"/>
  <text x="96" y="806" font-family="Georgia, 'Times New Roman', serif" font-size="52" font-weight="700" fill="#fff" fill-opacity="0.94" letter-spacing="6">${label}</text>
  <text x="1504" y="806" text-anchor="end" font-family="'Helvetica Neue', Arial, sans-serif" font-size="18" fill="#fff" fill-opacity="0.55" letter-spacing="6">USB.KR LAB</text>
</svg>
`;
}

for (const cover of covers) {
  writeFileSync(resolve(outDir, cover.file), svg(cover));
}

const favicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <defs>
    <linearGradient id="f" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#1a1a1f"/>
      <stop offset="1" stop-color="#3a1d24"/>
    </linearGradient>
  </defs>
  <rect width="64" height="64" rx="16" fill="url(#f)"/>
  <rect x="26" y="12" width="12" height="26" rx="3" fill="#f7f4ef"/>
  <rect x="20" y="38" width="24" height="14" rx="4" fill="#e3402f"/>
  <circle cx="32" cy="9" r="4" fill="#e3402f"/>
</svg>
`;
writeFileSync(resolve(outDir, 'favicon.svg'), favicon);

console.log(`generated ${covers.length + 1} assets in public/assets`);
