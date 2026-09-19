import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const fabricsDir = path.resolve(__dirname, '../public/fabrics');
const roomsDir = path.resolve(__dirname, '../public/rooms');

fs.mkdirSync(fabricsDir, { recursive: true });
fs.mkdirSync(roomsDir, { recursive: true });

// Helper to generate SVG pattern and convert to WebP using Sharp
async function createPatternWebp(width, height, svgContent, outputPath) {
  const svgBuffer = Buffer.from(svgContent);
  await sharp(svgBuffer)
    .resize(width, height)
    .webp({ quality: 95 })
    .toFile(outputPath);
  console.log(`Generated: ${outputPath}`);
}

async function run() {
  console.log('Generating procedural fabric textures...');

  // 1. Natural Beige Linen
  const linenSvg = `
  <svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <pattern id="linen" width="16" height="16" patternUnits="userSpaceOnUse">
        <rect width="16" height="16" fill="#D9CCA3"/>
        <line x1="0" y1="4" x2="16" y2="4" stroke="#C8BA8F" stroke-width="1.5" stroke-dasharray="2 1"/>
        <line x1="0" y1="12" x2="16" y2="12" stroke="#C8BA8F" stroke-width="1.5" stroke-dasharray="2 1"/>
        <line x1="4" y1="0" x2="4" y2="16" stroke="#B8AA7F" stroke-width="1.5" stroke-dasharray="2 1"/>
        <line x1="12" y1="0" x2="12" y2="16" stroke="#B8AA7F" stroke-width="1.5" stroke-dasharray="2 1"/>
        <circle cx="8" cy="8" r="1.5" fill="#E6D8B0"/>
      </pattern>
      <filter id="noise">
        <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="3" result="noise"/>
        <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.12 0"/>
        <feComposite in2="SourceGraphic" in="gl" operator="in"/>
      </filter>
    </defs>
    <rect width="512" height="512" fill="#DFD2A8"/>
    <rect width="512" height="512" fill="url(#linen)"/>
  </svg>`;
  await createPatternWebp(512, 512, linenSvg, path.join(fabricsDir, 'linen_natural.webp'));

  // 2. Royal Navy Velvet
  const velvetSvg = `
  <svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="velvetGrad" cx="50%" cy="50%" r="70%">
        <stop offset="0%" stop-color="#22365A"/>
        <stop offset="40%" stop-color="#192A47"/>
        <stop offset="80%" stop-color="#121D32"/>
        <stop offset="100%" stop-color="#0E1626"/>
      </radialGradient>
      <pattern id="pile" width="8" height="8" patternUnits="userSpaceOnUse">
        <circle cx="2" cy="2" r="1" fill="#304975" opacity="0.4"/>
        <circle cx="6" cy="6" r="1" fill="#142138" opacity="0.6"/>
      </pattern>
    </defs>
    <rect width="512" height="512" fill="url(#velvetGrad)"/>
    <rect width="512" height="512" fill="url(#pile)"/>
  </svg>`;
  await createPatternWebp(512, 512, velvetSvg, path.join(fabricsDir, 'velvet_navy.webp'));

  // 3. Charcoal Slub Weave
  const charcoalSvg = `
  <svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <pattern id="slub" width="12" height="12" patternUnits="userSpaceOnUse">
        <rect width="12" height="12" fill="#2E3236"/>
        <rect x="0" y="2" width="12" height="2" fill="#3F444A"/>
        <rect x="0" y="8" width="12" height="2" fill="#25282B"/>
        <rect x="3" y="0" width="2" height="12" fill="#4B5259" opacity="0.7"/>
        <rect x="9" y="0" width="2" height="12" fill="#1E2023" opacity="0.8"/>
      </pattern>
    </defs>
    <rect width="512" height="512" fill="#282B2E"/>
    <rect width="512" height="512" fill="url(#slub)"/>
  </svg>`;
  await createPatternWebp(512, 512, charcoalSvg, path.join(fabricsDir, 'cotton_charcoal.webp'));

  // 4. Champagne Shimmer Silk
  const silkSvg = `
  <svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="silkSheen" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#EFE6DA"/>
        <stop offset="25%" stop-color="#FAF6F0"/>
        <stop offset="50%" stop-color="#E3D7C5"/>
        <stop offset="75%" stop-color="#FCF9F5"/>
        <stop offset="100%" stop-color="#D9C9B4"/>
      </linearGradient>
      <pattern id="microWeave" width="6" height="6" patternUnits="userSpaceOnUse">
        <line x1="0" y1="0" x2="6" y2="6" stroke="#D3C3AD" stroke-width="0.7" opacity="0.4"/>
      </pattern>
    </defs>
    <rect width="512" height="512" fill="url(#silkSheen)"/>
    <rect width="512" height="512" fill="url(#microWeave)"/>
  </svg>`;
  await createPatternWebp(512, 512, silkSvg, path.join(fabricsDir, 'silk_champagne.webp'));

  // 5. Ivory Sheer Weave
  const sheerSvg = `
  <svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <pattern id="sheerMesh" width="10" height="10" patternUnits="userSpaceOnUse">
        <rect width="10" height="10" fill="#F8F7F4"/>
        <line x1="0" y1="5" x2="10" y2="5" stroke="#E5E0D5" stroke-width="1.2"/>
        <line x1="5" y1="0" x2="5" y2="10" stroke="#E5E0D5" stroke-width="1.2"/>
      </pattern>
    </defs>
    <rect width="512" height="512" fill="#FAF9F6"/>
    <rect width="512" height="512" fill="url(#sheerMesh)"/>
  </svg>`;
  await createPatternWebp(512, 512, sheerSvg, path.join(fabricsDir, 'sheer_ivory.webp'));

  // 6. Sage Herringbone Jacquard
  const sageSvg = `
  <svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <pattern id="herringbone" width="24" height="24" patternUnits="userSpaceOnUse">
        <rect width="24" height="24" fill="#6B7B6D"/>
        <path d="M0,0 L12,12 L0,24 M12,0 L24,12 L12,24" fill="none" stroke="#879989" stroke-width="2.5"/>
        <path d="M6,0 L18,12 L6,24" fill="none" stroke="#546356" stroke-width="1.5" opacity="0.6"/>
      </pattern>
    </defs>
    <rect width="512" height="512" fill="#6B7B6D"/>
    <rect width="512" height="512" fill="url(#herringbone)"/>
  </svg>`;
  await createPatternWebp(512, 512, sageSvg, path.join(fabricsDir, 'geo_sage.webp'));

  console.log('Generating sample room backgrounds...');

  // Sample Room 1: Modern Living Room with window
  const room1Svg = `
  <svg width="1280" height="960" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="wallGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#E8E4DF"/>
        <stop offset="70%" stop-color="#D5CFC8"/>
        <stop offset="100%" stop-color="#C2BCB4"/>
      </linearGradient>
      <linearGradient id="skyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#9BC2E6"/>
        <stop offset="70%" stop-color="#D7E8F7"/>
        <stop offset="100%" stop-color="#EAF3FC"/>
      </linearGradient>
      <linearGradient id="floorGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#A58362"/>
        <stop offset="100%" stop-color="#684D35"/>
      </linearGradient>
      <filter id="softShadow">
        <feGaussianBlur in="SourceAlpha" stdDeviation="10"/>
        <feOffset dx="0" dy="15" result="offsetblur"/>
        <feFlood flood-color="rgba(0,0,0,0.2)"/>
        <feComposite in2="offsetblur" operator="in"/>
        <feMerge>
          <feMergeNode/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
    </defs>

    <!-- Wall -->
    <rect width="1280" height="740" fill="url(#wallGrad)"/>

    <!-- Hardwood Floor -->
    <polygon points="0,740 1280,740 1280,960 0,960" fill="url(#floorGrad)"/>
    <line x1="0" y1="740" x2="1280" y2="740" stroke="#8E6F52" stroke-width="6"/>

    <!-- Window Opening -->
    <g filter="url(#softShadow)">
      <!-- Outer Window Frame -->
      <rect x="340" y="100" width="600" height="580" fill="#FFFFFF" rx="4" stroke="#D1CDC7" stroke-width="4"/>
      <!-- Window Glass View (Outdoor Garden / Sky) -->
      <rect x="360" y="120" width="560" height="540" fill="url(#skyGrad)"/>
      <!-- Tree Silhouette outside -->
      <path d="M420,660 Q450,480 520,440 Q590,400 660,460 Q720,510 780,660 Z" fill="#698A63" opacity="0.6"/>
      <!-- Window Muntins / Dividers -->
      <line x1="640" y1="120" x2="640" y2="660" stroke="#FFFFFF" stroke-width="12"/>
      <line x1="360" y1="390" x2="920" y2="390" stroke="#FFFFFF" stroke-width="12"/>
      <!-- Window Sill -->
      <rect x="310" y="675" width="660" height="24" fill="#F4F2EE" stroke="#D1CDC7" stroke-width="2" rx="3"/>
    </g>

    <!-- Baseboard Molding -->
    <rect x="0" y="720" width="1280" height="20" fill="#FFFFFF"/>
    <line x1="0" y1="720" x2="1280" y2="720" stroke="#D1CDC7" stroke-width="1"/>
  </svg>`;
  await createPatternWebp(1280, 960, room1Svg, path.join(roomsDir, 'modern_living.webp'));

  // Sample Room 2: Cozy Bedroom Window
  const room2Svg = `
  <svg width="1280" height="960" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="warmWall" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#F2EAE0"/>
        <stop offset="100%" stop-color="#E2D4C3"/>
      </linearGradient>
      <linearGradient id="sunSky" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#84B8E8"/>
        <stop offset="60%" stop-color="#FCE1BE"/>
        <stop offset="100%" stop-color="#FFFFFF"/>
      </linearGradient>
    </defs>
    <!-- Wall -->
    <rect width="1280" height="760" fill="url(#warmWall)"/>
    <!-- Floor -->
    <rect x="0" y="760" width="1280" height="200" fill="#544338"/>
    <rect x="0" y="744" width="1280" height="16" fill="#EDE4DA"/>

    <!-- Double Window -->
    <rect x="290" y="110" width="700" height="580" fill="#FFFFFF" rx="6"/>
    <rect x="310" y="130" width="320" height="520" fill="url(#sunSky)"/>
    <rect x="650" y="130" width="320" height="520" fill="url(#sunSky)"/>
    <line x1="310" y1="360" x2="630" y2="360" stroke="#FFFFFF" stroke-width="8"/>
    <line x1="650" y1="360" x2="970" y2="360" stroke="#FFFFFF" stroke-width="8"/>
    <!-- Sill -->
    <rect x="260" y="685" width="760" height="25" fill="#FAFAF8" rx="4"/>
  </svg>`;
  await createPatternWebp(1280, 960, room2Svg, path.join(roomsDir, 'bedroom_window.webp'));

  // Sample Room 3: Minimal Studio Window
  const room3Svg = `
  <svg width="1280" height="960" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="greyWall" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#ECEFF1"/>
        <stop offset="100%" stop-color="#CFD8DC"/>
      </linearGradient>
      <linearGradient id="clearDay" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#90CAF9"/>
        <stop offset="100%" stop-color="#E3F2FD"/>
      </linearGradient>
    </defs>
    <rect width="1280" height="780" fill="url(#greyWall)"/>
    <rect x="0" y="780" width="1280" height="180" fill="#37474F"/>

    <!-- Large Tall Minimalist Window -->
    <rect x="360" y="80" width="560" height="640" fill="#212121" rx="4"/>
    <rect x="372" y="92" width="536" height="616" fill="url(#clearDay)"/>
    <line x1="640" y1="92" x2="640" y2="708" stroke="#212121" stroke-width="12"/>
    <line x1="372" y1="400" x2="908" y2="400" stroke="#212121" stroke-width="10"/>
    <rect x="340" y="718" width="600" height="20" fill="#212121" rx="2"/>
  </svg>`;
  await createPatternWebp(1280, 960, room3Svg, path.join(roomsDir, 'minimalist_studio.webp'));

  console.log('All sample assets generated successfully!');
}

run().catch(console.error);
