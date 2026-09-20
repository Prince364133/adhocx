const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const MASTER_LOGO = path.resolve(__dirname, '../apps/admin/public/adhocx-logo.png');
const SQUIRCLE_ICON = path.resolve(__dirname, '../apps/mobile/assets/images/adhocx_icon.png');

async function main() {
  console.log('--- Generating AdhocX Professional App Icons ---');

  // --------------------------------------------------------------------------
  // 1. iOS AppIcon Catalog (Solid RGB, NO alpha channel)
  // --------------------------------------------------------------------------
  const iosDir = path.resolve(__dirname, '../apps/mobile/ios/Runner/Assets.xcassets/AppIcon.appiconset');
  const iosSizes = [
    { name: 'Icon-App-20x20@1x.png', size: 20 },
    { name: 'Icon-App-20x20@2x.png', size: 40 },
    { name: 'Icon-App-20x20@3x.png', size: 60 },
    { name: 'Icon-App-29x29@1x.png', size: 29 },
    { name: 'Icon-App-29x29@2x.png', size: 58 },
    { name: 'Icon-App-29x29@3x.png', size: 87 },
    { name: 'Icon-App-40x40@1x.png', size: 40 },
    { name: 'Icon-App-40x40@2x.png', size: 80 },
    { name: 'Icon-App-40x40@3x.png', size: 120 },
    { name: 'Icon-App-60x60@2x.png', size: 120 },
    { name: 'Icon-App-60x60@3x.png', size: 180 },
    { name: 'Icon-App-76x76@1x.png', size: 76 },
    { name: 'Icon-App-76x76@2x.png', size: 152 },
    { name: 'Icon-App-83.5x83.5@2x.png', size: 167 },
    { name: 'Icon-App-1024x1024@1x.png', size: 1024 },
  ];

  for (const item of iosSizes) {
    const outPath = path.join(iosDir, item.name);
    // iOS icons MUST be 3-channel RGB without alpha
    await sharp(MASTER_LOGO)
      .flatten({ background: '#FFFFFF' })
      .resize(item.size, item.size, {
        kernel: sharp.kernel.lanczos3,
        fit: 'contain',
        background: '#FFFFFF'
      })
      .removeAlpha()
      .png()
      .toFile(outPath);
    console.log(`[iOS] Generated ${item.name} (${item.size}x${item.size})`);
  }

  // --------------------------------------------------------------------------
  // 2. Android Legacy Mipmap Launcher Icons
  // --------------------------------------------------------------------------
  const androidResDir = path.resolve(__dirname, '../apps/mobile/android/app/src/main/res');
  const mipmapSizes = [
    { folder: 'mipmap-mdpi', size: 48 },
    { folder: 'mipmap-hdpi', size: 72 },
    { folder: 'mipmap-xhdpi', size: 96 },
    { folder: 'mipmap-xxhdpi', size: 144 },
    { folder: 'mipmap-xxxhdpi', size: 192 },
  ];

  for (const item of mipmapSizes) {
    const outPath = path.join(androidResDir, item.folder, 'ic_launcher.png');
    await sharp(SQUIRCLE_ICON)
      .resize(item.size, item.size, {
        kernel: sharp.kernel.lanczos3,
        fit: 'contain'
      })
      .png()
      .toFile(outPath);
    console.log(`[Android Legacy] Generated ${item.folder}/ic_launcher.png (${item.size}x${item.size})`);
  }

  // --------------------------------------------------------------------------
  // 3. Android Adaptive Foreground Drawables
  // --------------------------------------------------------------------------
  const drawableSizes = [
    { folder: 'drawable-mdpi', size: 108 },
    { folder: 'drawable-hdpi', size: 162 },
    { folder: 'drawable-xhdpi', size: 216 },
    { folder: 'drawable-xxhdpi', size: 324 },
    { folder: 'drawable-xxxhdpi', size: 432 },
  ];

  for (const item of drawableSizes) {
    const outPath = path.join(androidResDir, item.folder, 'ic_launcher_foreground.png');
    await sharp(MASTER_LOGO)
      .flatten({ background: '#FFFFFF' })
      .resize(item.size, item.size, {
        kernel: sharp.kernel.lanczos3,
        fit: 'contain',
        background: '#FFFFFF'
      })
      .png()
      .toFile(outPath);
    console.log(`[Android Adaptive] Generated ${item.folder}/ic_launcher_foreground.png (${item.size}x${item.size})`);
  }

  // --------------------------------------------------------------------------
  // 4. Mobile Web Icons & Favicon
  // --------------------------------------------------------------------------
  const webDir = path.resolve(__dirname, '../apps/mobile/web');
  const webIconsDir = path.join(webDir, 'icons');
  if (!fs.existsSync(webIconsDir)) {
    fs.mkdirSync(webIconsDir, { recursive: true });
  }

  await sharp(SQUIRCLE_ICON)
    .resize(192, 192, { kernel: sharp.kernel.lanczos3 })
    .png()
    .toFile(path.join(webIconsDir, 'Icon-192.png'));

  await sharp(SQUIRCLE_ICON)
    .resize(512, 512, { kernel: sharp.kernel.lanczos3 })
    .png()
    .toFile(path.join(webIconsDir, 'Icon-512.png'));

  await sharp(SQUIRCLE_ICON)
    .resize(192, 192, { kernel: sharp.kernel.lanczos3 })
    .png()
    .toFile(path.join(webIconsDir, 'Icon-maskable-192.png'));

  await sharp(SQUIRCLE_ICON)
    .resize(512, 512, { kernel: sharp.kernel.lanczos3 })
    .png()
    .toFile(path.join(webIconsDir, 'Icon-maskable-512.png'));

  await sharp(SQUIRCLE_ICON)
    .resize(64, 64, { kernel: sharp.kernel.lanczos3 })
    .png()
    .toFile(path.join(webDir, 'favicon.png'));

  console.log('[Mobile Web] Updated web icons and favicon.png');

  // --------------------------------------------------------------------------
  // 5. Marketing Portal Public Assets
  // --------------------------------------------------------------------------
  const marketingPublicDir = path.resolve(__dirname, '../apps/marketing/public');
  if (fs.existsSync(marketingPublicDir)) {
    fs.copyFileSync(
      path.resolve(__dirname, '../apps/admin/public/adhocx_icon.svg'),
      path.join(marketingPublicDir, 'favicon.svg')
    );
    fs.copyFileSync(MASTER_LOGO, path.join(marketingPublicDir, 'adhocx-logo.png'));
    fs.copyFileSync(SQUIRCLE_ICON, path.join(marketingPublicDir, 'adhocx_icon.png'));
    
    await sharp(SQUIRCLE_ICON)
      .resize(64, 64, { kernel: sharp.kernel.lanczos3 })
      .png()
      .toFile(path.join(marketingPublicDir, 'favicon.png'));

    console.log('[Marketing] Updated favicon.svg, favicon.png, adhocx-logo.png, and adhocx_icon.png');
  }

  console.log('--- All App Icons Successfully Generated! ---');
}

main().catch(err => {
  console.error('Failed to generate icons:', err);
  process.exit(1);
});
