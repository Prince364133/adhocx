const fs = require('fs');
const path = require('path');
const { Resvg } = require('@resvg/resvg-js');
const sharp = require('sharp');

const rootDir = path.resolve(__dirname, '..');
const iconSvgPath = path.join(rootDir, 'apps/mobile/assets/images/adhocx_icon.svg');
const logoSvgPath = path.join(rootDir, 'apps/mobile/assets/images/adhocx_logo.svg');

const iconSvg = fs.readFileSync(iconSvgPath, 'utf-8');
const logoSvg = fs.readFileSync(logoSvgPath, 'utf-8');

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
  console.log('Generating brand asset PNGs...');

  // Ensure directories exist
  const mobileImagesDir = path.join(rootDir, 'apps/mobile/assets/images');
  const mobileWebDir = path.join(rootDir, 'apps/mobile/web');
  const mobileWebIconsDir = path.join(rootDir, 'apps/mobile/web/icons');
  const adminPublicDir = path.join(rootDir, 'apps/admin/public');

  [mobileImagesDir, mobileWebDir, mobileWebIconsDir, adminPublicDir].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  });

  // Render Icon at multiple resolutions
  const icon512 = renderSvg(iconSvg, 512);
  const icon192 = renderSvg(iconSvg, 192);
  const icon64 = renderSvg(iconSvg, 64);
  const icon32 = renderSvg(iconSvg, 32);

  // Render Logo at High-Res
  const logoPng = renderSvg(logoSvg, 1520);
  const logoMediumPng = renderSvg(logoSvg, 760);

  // 1. Mobile assets
  fs.writeFileSync(path.join(mobileImagesDir, 'adhocx_icon.png'), icon512);
  fs.writeFileSync(path.join(mobileImagesDir, 'adhocx_logo.png'), logoPng);

  // 2. Mobile web favicons & PWA icons
  fs.writeFileSync(path.join(mobileWebDir, 'favicon.png'), icon64);
  fs.writeFileSync(path.join(mobileWebIconsDir, 'Icon-192.png'), icon192);
  fs.writeFileSync(path.join(mobileWebIconsDir, 'Icon-512.png'), icon512);
  fs.writeFileSync(path.join(mobileWebIconsDir, 'Icon-maskable-192.png'), icon192);
  fs.writeFileSync(path.join(mobileWebIconsDir, 'Icon-maskable-512.png'), icon512);

  // 3. Admin public assets
  fs.copyFileSync(iconSvgPath, path.join(adminPublicDir, 'favicon.svg'));
  fs.copyFileSync(iconSvgPath, path.join(adminPublicDir, 'adhocx_icon.svg'));
  fs.copyFileSync(logoSvgPath, path.join(adminPublicDir, 'adhocx_logo.svg'));
  fs.writeFileSync(path.join(adminPublicDir, 'favicon.png'), icon64);
  fs.writeFileSync(path.join(adminPublicDir, 'adhocx_icon.png'), icon512);
  fs.writeFileSync(path.join(adminPublicDir, 'adhocx_logo.png'), logoMediumPng);

  // Create favicon.ico using sharp
  await sharp(icon64).toFormat('png').toFile(path.join(adminPublicDir, 'favicon.ico'));

  console.log('Successfully generated all brand SVG and PNG assets across Mobile and Admin!');
}

main().catch(err => {
  console.error('Error generating assets:', err);
  process.exit(1);
});
