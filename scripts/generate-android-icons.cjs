const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const LOGO_PATH = 'public/pocket-khata-logo.png';
const ANDROID_RES = 'android/app/src/main/res';

// Launcher icon size per density bucket (pixels)
const ICON_SIZES = [
  { density: 'mipmap-mdpi',     icon: 48,  adaptive: 108 },
  { density: 'mipmap-hdpi',     icon: 72,  adaptive: 162 },
  { density: 'mipmap-xhdpi',    icon: 96,  adaptive: 216 },
  { density: 'mipmap-xxhdpi',   icon: 144, adaptive: 324 },
  { density: 'mipmap-xxxhdpi',  icon: 192, adaptive: 432 },
];

// Logo fills this % of the target icon size for fallback icons
const FALLBACK_FILL = 0.75;
// Logo fills this % of the adaptive viewport (safe zone is 66.7% of 108dp = 72dp)
// 55% = ~59dp — well within the safe zone, no clipping by device masks
const ADAPTIVE_FILL = 0.55;

async function generateIcons() {
  const logo = fs.readFileSync(LOGO_PATH);
  const meta = await sharp(logo).metadata();
  console.log(`Logo: ${meta.width}x${meta.height}, ${meta.channels} channels, alpha: ${meta.hasAlpha}\n`);

  for (const { density, icon, adaptive } of ICON_SIZES) {
    const dir = path.join(ANDROID_RES, density);
    fs.mkdirSync(dir, { recursive: true });

    // Calculate logo dimensions for fallback icon (80% fill)
    const fallbackPx = Math.round(icon * FALLBACK_FILL);
    const logoFallback = await sharp(logo)
      .resize(fallbackPx, fallbackPx, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();
    const fallbackMeta = await sharp(logoFallback).metadata();
    const fallbackLeft = Math.round((icon - fallbackMeta.width) / 2);
    const fallbackTop = Math.round((icon - fallbackMeta.height) / 2);

    // --- Fallback icon (pre-API-26): logo on white background ---
    const whiteCanvas = await sharp({
      create: { width: icon, height: icon, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 255 } }
    }).png().toBuffer();
    const fallbackResult = await sharp(whiteCanvas)
      .composite([{ input: logoFallback, top: fallbackTop, left: fallbackLeft }])
      .png()
      .toFile(path.join(dir, 'ic_launcher.png'));
    // Round version is identical for pre-API-26
    fs.copyFileSync(path.join(dir, 'ic_launcher.png'), path.join(dir, 'ic_launcher_round.png'));
    console.log(`  ✓ ic_launcher.png / round  (${icon}x${icon}, logo ${fallbackMeta.width}x${fallbackMeta.height}) → ${density}`);

    // --- Adaptive icon foreground: logo on transparent at adaptive size ---
    const fgPx = Math.round(adaptive * ADAPTIVE_FILL);
    const logoFg = await sharp(logo)
      .resize(fgPx, fgPx, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();
    const fgMeta = await sharp(logoFg).metadata();
    const fgLeft = Math.round((adaptive - fgMeta.width) / 2);
    const fgTop = Math.round((adaptive - fgMeta.height) / 2);

    // Foreground: logo centered on transparent canvas
    await sharp({
      create: { width: adaptive, height: adaptive, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } }
    })
      .composite([{ input: logoFg, top: fgTop, left: fgLeft }])
      .png()
      .toFile(path.join(dir, 'ic_launcher_foreground.png'));

    // Background: solid white at adaptive size
    await sharp({
      create: { width: adaptive, height: adaptive, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 255 } }
    })
      .png()
      .toFile(path.join(dir, 'ic_launcher_background.png'));

    console.log(`  ✓ foreground/background (${adaptive}x${adaptive}, logo ${fgMeta.width}x${fgMeta.height}) → ${density}`);
  }

  // --- Play Store icon (512×512 PNG) ---
  const playStoreLogo = await sharp(logo)
    .resize(360, 360, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  const psMeta = await sharp(playStoreLogo).metadata();
  const psLeft = Math.round((512 - psMeta.width) / 2);
  const psTop = Math.round((512 - psMeta.height) / 2);
  await sharp({
    create: { width: 512, height: 512, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 255 } }
  })
    .composite([{ input: playStoreLogo, top: psTop, left: psLeft }])
    .png()
    .toFile(path.join(ANDROID_RES, 'mipmap-xxxhdpi', 'ic_launcher_play_store.png'));
  console.log(`  ✓ ic_launcher_play_store.png (512×512, logo ${psMeta.width}x${psMeta.height}) → mipmap-xxxhdpi`);

  // --- Adaptive icon XML (API 26+) ---
  const anydpi = path.join(ANDROID_RES, 'mipmap-anydpi-v26');
  fs.mkdirSync(anydpi, { recursive: true });
  const xmlContent = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@mipmap/ic_launcher_background"/>
    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>
</adaptive-icon>`;
  fs.writeFileSync(path.join(anydpi, 'ic_launcher.xml'), xmlContent);
  fs.writeFileSync(path.join(anydpi, 'ic_launcher_round.xml'), xmlContent);
  console.log('  ✓ Adaptive icon XML → mipmap-anydpi-v26');

  // --- Color definition for ic_launcher_background (white) ---
  const valuesDir = path.join(ANDROID_RES, 'values');
  fs.mkdirSync(valuesDir, { recursive: true });
  // Only write if not already defined (check existing file)
  const colorFile = path.join(valuesDir, 'ic_launcher_background.xml');
  const colorXml = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">#FFFFFF</color>
</resources>`;
  if (!fs.existsSync(colorFile) || fs.readFileSync(colorFile, 'utf-8').trim() !== colorXml.trim()) {
    fs.writeFileSync(colorFile, colorXml);
    console.log('  ✓ ic_launcher_background color → values/');
  }

  console.log('\n✅ All Android launcher icons generated successfully!');
}

generateIcons().catch(err => { console.error('FAILED:', err); process.exit(1); });
