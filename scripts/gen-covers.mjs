/**
 * 커버 이미지 생성기.
 * 사진 자산이 준비되기 전까지 쓰는 추상 SVG 커버를 만든다.
 * 사용법: node scripts/gen-covers.mjs
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = resolve(root, 'public/assets');
mkdirSync(outDir, { recursive: true });

const covers = [
  { file: 'cover-fit-plus.svg', from: '#2b1b4d', to: '#7b2d6b', accent: '#ff9f68', label: 'FIT PLUS', motif: 'stick' },
  { file: 'cover-extreme-pro.svg', from: '#0c2a3a', to: '#0f6d63', accent: '#ffd166', label: 'EXTREME PRO', motif: 'slab' },
  { file: 'cover-revodock.svg', from: '#141a2e', to: '#3a3f6b', accent: '#7ad1ff', label: 'REVODOCK', motif: 'ports' },
  { file: 'cover-usb4.svg', from: '#2c1414', to: '#7a2a20', accent: '#ffb4a2', label: 'USB4 40Gbps', motif: 'cable' },
  { file: 'cover-prime160.svg', from: '#1c1c1c', to: '#4d4237', accent: '#ffcf5c', label: '160W GaN', motif: 'slab' },
  { file: 'cover-guide.svg', from: '#152a1f', to: '#2f6b47', accent: '#c9f299', label: 'GUIDE 2026', motif: 'ports' },
  { file: 'cover-dtmax.svg', from: '#1b1430', to: '#4a2b7a', accent: '#b79bff', label: 'DT MAX 1TB', motif: 'stick' },
  { file: 'cover-orico.svg', from: '#0f1f2b', to: '#26586e', accent: '#8ee6d0', label: 'NVME USB4', motif: 'slab' },
  { file: 'cover-adapter.svg', from: '#2a1c0d', to: '#6b3f14', accent: '#ffc46b', label: 'ADAPTER RISK', motif: 'cable' },
  { file: 'hero-default.svg', from: '#101014', to: '#3b2740', accent: '#ff6f61', label: 'USB.KR', motif: 'ports' },
];

const motifs = {
  stick: (a) => `
    <g opacity="0.92">
      <rect x="520" y="360" width="420" height="180" rx="26" fill="${a}" opacity="0.16"/>
      <rect x="560" y="400" width="340" height="100" rx="14" fill="${a}" opacity="0.5"/>
      <rect x="900" y="418" width="180" height="64" rx="8" fill="#e8e8ec" opacity="0.85"/>
      <rect x="928" y="436" width="124" height="12" rx="4" fill="${a}"/>
      <rect x="928" y="458" width="86" height="12" rx="4" fill="${a}" opacity="0.6"/>
    </g>`,
  slab: (a) => `
    <g opacity="0.92">
      <rect x="470" y="300" width="560" height="300" rx="38" fill="${a}" opacity="0.14"/>
      <rect x="510" y="340" width="480" height="220" rx="28" fill="${a}" opacity="0.42"/>
      <circle cx="590" cy="450" r="34" fill="#0b0b0d" opacity="0.55"/>
      <rect x="660" y="424" width="270" height="16" rx="8" fill="#f2efe8" opacity="0.9"/>
      <rect x="660" y="460" width="180" height="16" rx="8" fill="#f2efe8" opacity="0.5"/>
    </g>`,
  ports: (a) => `
    <g opacity="0.9">
      <rect x="430" y="330" width="640" height="240" rx="20" fill="${a}" opacity="0.13"/>
      ${[0, 1, 2, 3]
        .map(
          (i) => `<g transform="translate(${480 + i * 150} 400)">
        <rect width="110" height="70" rx="10" fill="#0b0b0d" opacity="0.6"/>
        <rect x="16" y="26" width="78" height="18" rx="9" fill="${a}" opacity="${0.9 - i * 0.15}"/>
      </g>`,
        )
        .join('')}
    </g>`,
  cable: (a) => `
    <g fill="none" stroke="${a}" stroke-linecap="round">
      <path d="M180 620 C 460 620 420 300 700 300 S 940 560 1320 470" stroke-width="26" opacity="0.35"/>
      <path d="M180 680 C 500 680 470 380 760 370 S 1000 620 1340 540" stroke-width="14" opacity="0.6"/>
    </g>
    <g>
      <rect x="640" y="250" width="150" height="66" rx="14" fill="#e8e8ec" opacity="0.9"/>
      <rect x="668" y="272" width="94" height="22" rx="11" fill="${a}"/>
    </g>`,
};

function svg({ from, to, accent, label, motif }) {
  const id = label.replace(/[^A-Za-z0-9]/g, '') || 'c';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" width="1600" height="900" role="img" aria-label="${label}">
  <defs>
    <linearGradient id="g${id}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${from}"/>
      <stop offset="1" stop-color="${to}"/>
    </linearGradient>
    <radialGradient id="v${id}" cx="0.28" cy="0.24" r="0.9">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.18"/>
      <stop offset="1" stop-color="#000000" stop-opacity="0.45"/>
    </radialGradient>
    <pattern id="p${id}" width="46" height="46" patternUnits="userSpaceOnUse">
      <path d="M46 0H0V46" fill="none" stroke="#ffffff" stroke-opacity="0.05" stroke-width="1"/>
    </pattern>
  </defs>
  <rect width="1600" height="900" fill="url(#g${id})"/>
  <rect width="1600" height="900" fill="url(#p${id})"/>
  ${motifs[motif](accent)}
  <rect width="1600" height="900" fill="url(#v${id})"/>
  <text x="96" y="812" font-family="Georgia, serif" font-size="46" font-weight="700" fill="#ffffff" fill-opacity="0.9" letter-spacing="6">${label}</text>
  <rect x="96" y="742" width="86" height="6" fill="${accent}"/>
</svg>
`;
}

for (const cover of covers) {
  writeFileSync(resolve(outDir, cover.file), svg(cover));
}

const favicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <rect width="64" height="64" rx="14" fill="#16150f"/>
  <rect x="26" y="12" width="12" height="26" rx="3" fill="#f7f4ef"/>
  <rect x="20" y="38" width="24" height="14" rx="4" fill="#c2261f"/>
  <circle cx="32" cy="9" r="4" fill="#c2261f"/>
</svg>
`;
writeFileSync(resolve(outDir, 'favicon.svg'), favicon);

console.log(`generated ${covers.length + 1} assets in public/assets`);
