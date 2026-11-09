const fs = require('fs');
const path = require('path');
const { Resvg } = require('@resvg/resvg-js');
const sharp = require('sharp');

const rootDir = path.resolve(__dirname, '..');

// Helper to create genuine multi-size Windows .ico binary container from PNG buffers
function createIco(pngBuffers) {
  const count = pngBuffers.length;
  const headerSize = 6 + count * 16;
  let offset = headerSize;
  const header = Buffer.alloc(headerSize);

  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // ICO type: 1 = icon
  header.writeUInt16LE(count, 4); // count of images

  const imageBuffers = [];

  pngBuffers.forEach((item, index) => {
    const entryOffset = 6 + index * 16;
    header.writeUInt8(item.width >= 256 ? 0 : item.width, entryOffset);
    header.writeUInt8(item.height >= 256 ? 0 : item.height, entryOffset + 1);
    header.writeUInt8(0, entryOffset + 2); // color count (0 if >= 8bpp)
    header.writeUInt8(0, entryOffset + 3); // reserved
    header.writeUInt16LE(1, entryOffset + 4); // color planes
    header.writeUInt16LE(32, entryOffset + 6); // bits per pixel
    header.writeUInt32LE(item.buffer.length, entryOffset + 8); // size of image data
    header.writeUInt32LE(offset, entryOffset + 12); // offset of image data

    offset += item.buffer.length;
    imageBuffers.push(item.buffer);
  });

  return Buffer.concat([header, ...imageBuffers]);
}

// 1. Define Master Brand SVGs
const masterLogoSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 200" width="100%" height="100%">
  <defs>
    <!-- Brand Primary Theme #5728B2 for "Adhoc" -->
    <linearGradient id="brandGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#5728B2" />
      <stop offset="100%" stop-color="#431E8E" />
    </linearGradient>

    <!-- Vibrant Brand Theme Orange Gradient for "X" -->
    <linearGradient id="brandOrangeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FF5F09" />
      <stop offset="100%" stop-color="#FF4500" />
    </linearGradient>
  </defs>

  <!-- Clean White Background -->
  <rect width="600" height="200" rx="24" fill="#FFFFFF" />

  <!-- Natural Typography Wordmark -->
  <text
    x="300"
    y="126"
    text-anchor="middle"
    font-family="system-ui, -apple-system, 'Inter', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
    font-size="114"
    font-weight="900"
    letter-spacing="-1.5"
  ><tspan fill="url(#brandGrad)">Adhoc</tspan><tspan fill="url(#brandOrangeGrad)">X</tspan></text>
</svg>`;

const masterIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="100%" height="100%">
  <defs>
    <!-- Brand Primary Theme #5728B2 for "Adhoc" -->
    <linearGradient id="iconAdhocGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#5728B2" />
      <stop offset="100%" stop-color="#431E8E" />
    </linearGradient>

    <!-- Vibrant Brand Orange Gradient for "X" -->
    <linearGradient id="iconOrangeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FF5F09" />
      <stop offset="100%" stop-color="#FF4500" />
    </linearGradient>

    <!-- Clean Container Border/Shadow -->
    <filter id="iconCardShadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="6" stdDeviation="12" flood-color="#5728B2" flood-opacity="0.12" />
    </filter>
  </defs>

  <!-- Clean White Squircle Container -->
  <rect x="16" y="16" width="480" height="480" rx="108" fill="#FFFFFF" stroke="#E2E8F0" stroke-width="4" filter="url(#iconCardShadow)" />

  <!-- Natural Typography Wordmark Centered -->
  <text
    x="256"
    y="294"
    text-anchor="middle"
    font-family="system-ui, -apple-system, 'Inter', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
    font-size="114"
    font-weight="900"
    letter-spacing="-1.5"
  ><tspan fill="url(#iconAdhocGrad)">Adhoc</tspan><tspan fill="url(#iconOrangeGrad)">X</tspan></text>
</svg>`;

// High-Res 1024x1024 Master Square Logo SVG
const masterSquareLogoSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
  <defs>
    <linearGradient id="sqBrandGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#5728B2" />
      <stop offset="100%" stop-color="#431E8E" />
    </linearGradient>
    <linearGradient id="sqOrangeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FF5F09" />
      <stop offset="100%" stop-color="#FF4500" />
    </linearGradient>
  </defs>
  <rect width="1024" height="1024" fill="#FFFFFF" />
  <text
    x="512"
    y="570"
    text-anchor="middle"
    font-family="system-ui, -apple-system, 'Inter', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
    font-size="220"
    font-weight="900"
    letter-spacing="-3"
  ><tspan fill="url(#sqBrandGrad)">Adhoc</tspan><tspan fill="url(#sqOrangeGrad)">X</tspan></text>
</svg>`;

function renderSvg(svgStr, width) {
  const resvg = new Resvg(svgStr, {
    fitTo: { mode: 'width', value: width },
    font: {
      loadSystemFonts: true,
      defaultFontFamily: 'Inter',
    },
  });
  const pngData = resvg.render();
  return pngData.asPng();
}

async function main() {
  console.log('Rendering unified brand logo and icon assets...');

  // Render PNGs
  const icon512Png = renderSvg(masterIconSvg, 512);
  const icon192Png = renderSvg(masterIconSvg, 192);
  const icon180Png = renderSvg(masterIconSvg, 180); // apple-touch-icon
  const icon64Png = renderSvg(masterIconSvg, 64);
  const icon48Png = renderSvg(masterIconSvg, 48);
  const icon32Png = renderSvg(masterIconSvg, 32);
  const icon16Png = renderSvg(masterIconSvg, 16);

  // Generate valid binary Windows ICO file (16x16, 32x32, 48x48)
  const validIcoBinary = createIco([
    { width: 16, height: 16, buffer: icon16Png },
    { width: 32, height: 32, buffer: icon32Png },
    { width: 48, height: 48, buffer: icon48Png },
  ]);

  const logoPng = renderSvg(masterLogoSvg, 760);
  const masterLogo1024Png = renderSvg(masterSquareLogoSvg, 1024);

  // Define target directories
  const targetDirs = [
    path.join(rootDir, 'apps/admin/public'),
    path.join(rootDir, 'apps/corporate/public'),
    path.join(rootDir, 'apps/ops/public'),
    path.join(rootDir, 'apps/marketing/public'),
    path.join(rootDir, 'apps/mobile/assets/images'),
    path.join(rootDir, 'apps/mobile/web'),
    path.join(rootDir, 'apps/employee_app/assets/images'),
    path.join(rootDir, 'apps/employee_app/web'),
  ];

  // Also dist dirs if present
  const marketingDist = path.join(rootDir, 'apps/marketing/dist');
  if (fs.existsSync(marketingDist)) targetDirs.push(marketingDist);

  targetDirs.forEach((dir) => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  });

  // Mobile Web Icons dir
  const mobileWebIconsDir = path.join(rootDir, 'apps/mobile/web/icons');
  if (!fs.existsSync(mobileWebIconsDir)) fs.mkdirSync(mobileWebIconsDir, { recursive: true });

  // Write mobile web icons
  fs.writeFileSync(path.join(mobileWebIconsDir, 'Icon-192.png'), icon192Png);
  fs.writeFileSync(path.join(mobileWebIconsDir, 'Icon-512.png'), icon512Png);
  fs.writeFileSync(path.join(mobileWebIconsDir, 'Icon-maskable-192.png'), icon192Png);
  fs.writeFileSync(path.join(mobileWebIconsDir, 'Icon-maskable-512.png'), icon512Png);

  // Write all standard assets to target dirs
  for (const dir of targetDirs) {
    // 1. SVGs
    fs.writeFileSync(path.join(dir, 'adhocx_logo.svg'), masterLogoSvg, 'utf8');
    fs.writeFileSync(path.join(dir, 'adhocx_icon.svg'), masterIconSvg, 'utf8');
    fs.writeFileSync(path.join(dir, 'favicon.svg'), masterIconSvg, 'utf8');

    // 2. PNGs
    fs.writeFileSync(path.join(dir, 'adhocx_logo.png'), logoPng);
    fs.writeFileSync(path.join(dir, 'adhocx_icon.png'), icon512Png);
    fs.writeFileSync(path.join(dir, 'adhocx-logo.png'), masterLogo1024Png);
    fs.writeFileSync(path.join(dir, 'favicon.png'), icon64Png);
    fs.writeFileSync(path.join(dir, 'favicon-32x32.png'), icon32Png);
    fs.writeFileSync(path.join(dir, 'favicon-16x16.png'), icon16Png);
    fs.writeFileSync(path.join(dir, 'apple-touch-icon.png'), icon180Png);

    // 3. Genuine Windows ICO binary
    fs.writeFileSync(path.join(dir, 'favicon.ico'), validIcoBinary);

    console.log(`[Synced Assets] -> ${path.relative(rootDir, dir) || 'root'}`);
  }

  console.log('\n--- All Brand Assets & Favicons Successfully Synchronized to Official AdhocX #5728B2! ---');
}

main().catch((err) => {
  console.error('Asset generation failed:', err);
  process.exit(1);
});
