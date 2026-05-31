const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const LOGO_PATH = 'public/pocket-khata-logo.png';
const ANDROID_RES = 'android/app/src/main/res';

// Brand background color (from colors.xml: splashBackground)
const BRAND_BG = { r: 229, g: 234, b: 242, alpha: 255 }; // #E5EAF2

// Adaptive icon viewport: 108dp × 108dp
// Safe zone: inner 66dp × 66dp (content guaranteed NOT to be clipped)
// Logo sized to 60% of viewport = ~65dp (close to safe-zone edge, minimal padding)
const ADAPTIVE_FILL = 0.60;

// Fallback (pre-API-26) icon: logo fills 75% of icon canvas
const FALLBACK_FILL = 0.75;

const ICON_SIZES = [
  { density: 'mipmap-mdpi',     icon: 48,  adaptive: 108 },
  { density: 'mipmap-hdpi',     icon: 72,  adaptive: 162 },
  { density: 'mipmap-xhdpi',    icon: 96,  adaptive: 216 },
  { density: 'mipmap-xxhdpi',   icon: 144, adaptive: 324 },
  { density: 'mipmap-xxxhdpi',  icon: 192, adaptive: 432 },
];

/**
 * Resize logo to target pixel size (fit='contain', transparent bg), centered on a canvas.
 * Returns { buffer, meta } where meta has width/height of the resized logo.
 */
async function resizeLogo(targetPx) {
  const logo = fs.readFileSync(LOGO_PATH);
  const resized = await sharp(logo)
    .resize(targetPx, targetPx, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  const meta = await sharp(resized).metadata();
  return { buffer: resized, meta };
}

/**
 * Composite resized logo centered onto a canvas of given size + color.
 */
async function compositeLogo(logoBuffer, logoMeta, canvasSize, bgColor) {
  const left = Math.round((canvasSize - logoMeta.width) / 2);
  const top = Math.round((canvasSize - logoMeta.height) / 2);
  return await sharp({
    create: { width: canvasSize, height: canvasSize, channels: 4, background: bgColor }
  })
    .composite([{ input: logoBuffer, top, left }])
    .png()
    .toBuffer();
}

async function generateIcons() {
  const logo = fs.readFileSync(LOGO_PATH);
  const meta = await sharp(logo).metadata();
  console.log(`Logo: ${meta.width}x${meta.height}, ${meta.channels} channels, alpha: ${meta.hasAlpha}\n`);

  // ================================================================
  // 1. LAUNCHER ICONS — per density bucket
  // ================================================================
  for (const { density, icon, adaptive } of ICON_SIZES) {
    const dir = path.join(ANDROID_RES, density);
    fs.mkdirSync(dir, { recursive: true });

    // --- Fallback icon (pre-API-26): logo on brand bg at icon size ---
    const fallbackPx = Math.round(icon * FALLBACK_FILL);
    const fallback = await resizeLogo(fallbackPx);
    const fallbackResult = await compositeLogo(fallback.buffer, fallback.meta, icon, BRAND_BG);
    fs.writeFileSync(path.join(dir, 'ic_launcher.png'), fallbackResult);
    // Round version identical for pre-API-26
    fs.copyFileSync(path.join(dir, 'ic_launcher.png'), path.join(dir, 'ic_launcher_round.png'));
    console.log(`  ✓ ic_launcher.png/round  (${icon}x${icon}, logo ${fallback.meta.width}x${fallback.meta.height}) → ${density}`);

    // --- Adaptive foreground: logo on transparent at adaptive size ---
    const fgPx = Math.round(adaptive * ADAPTIVE_FILL);
    const fg = await resizeLogo(fgPx);
    const transparent = { r: 0, g: 0, b: 0, alpha: 0 };
    const fgResult = await compositeLogo(fg.buffer, fg.meta, adaptive, transparent);
    fs.writeFileSync(path.join(dir, 'ic_launcher_foreground.png'), fgResult);

    // --- Adaptive background: solid brand color at adaptive size ---
    const bgResult = await sharp({
      create: { width: adaptive, height: adaptive, channels: 4, background: BRAND_BG }
    }).png().toBuffer();
    fs.writeFileSync(path.join(dir, 'ic_launcher_background.png'), bgResult);

    console.log(`  ✓ foreground/background  (${adaptive}x${adaptive}, logo ${fg.meta.width}x${fg.meta.height}) → ${density}`);
  }

  // ================================================================
  // 2. PLAY STORE ICON (512×512)
  // ================================================================
  const psLogo = await resizeLogo(360);
  const psResult = await compositeLogo(psLogo.buffer, psLogo.meta, 512, BRAND_BG);
  fs.writeFileSync(path.join(ANDROID_RES, 'mipmap-xxxhdpi', 'ic_launcher_play_store.png'), psResult);
  console.log(`  ✓ ic_launcher_play_store.png  (512×512, logo ${psLogo.meta.width}x${psLogo.meta.height}) → mipmap-xxxhdpi`);

  // ================================================================
  // 3. ADAPTIVE ICON XML (API 26+)
  // ================================================================
  const anydpi = path.join(ANDROID_RES, 'mipmap-anydpi-v26');
  fs.mkdirSync(anydpi, { recursive: true });
  const adaptiveXml = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@mipmap/ic_launcher_background"/>
    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>
</adaptive-icon>`;
  fs.writeFileSync(path.join(anydpi, 'ic_launcher.xml'), adaptiveXml);
  fs.writeFileSync(path.join(anydpi, 'ic_launcher_round.xml'), adaptiveXml);
  console.log('  ✓ Adaptive icon XML → mipmap-anydpi-v26');

  // ================================================================
  // 4. COLOR DEFINITION for background
  // ================================================================
  const valuesDir = path.join(ANDROID_RES, 'values');
  fs.mkdirSync(valuesDir, { recursive: true });
  const colorFile = path.join(valuesDir, 'ic_launcher_background.xml');
  const colorXml = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">#E5EAF2</color>
</resources>`;
  if (!fs.existsSync(colorFile) || fs.readFileSync(colorFile, 'utf-8').trim() !== colorXml.trim()) {
    fs.writeFileSync(colorFile, colorXml);
    console.log('  ✓ ic_launcher_background color (#E5EAF2) → values/');
  } else {
    console.log('  ~ ic_launcher_background color unchanged → values/');
  }

  // ================================================================
  // 5. CLEAN UP OLD DEAD VECTOR DRAWABLES + SPLASH FILES
  //    - Capacitor default smiley vectors (no longer referenced)
  //    - Custom splash icon PNGs (no system splash icon desired)
  //    - Custom splash drawable XML + density PNGs (CSS splash removed)
  // ================================================================
  const deadFiles = [
    path.join(ANDROID_RES, 'drawable', 'ic_launcher_background.xml'),
    path.join(ANDROID_RES, 'drawable-v24', 'ic_launcher_foreground.xml'),
    // Splash icon files (no longer used — system splash uses solid color only)
    path.join(ANDROID_RES, 'drawable', 'splash_background.xml'),
    path.join(ANDROID_RES, 'drawable', 'splash.png'),
  ];
  for (const df of deadFiles) {
    if (fs.existsSync(df)) {
      fs.unlinkSync(df);
      console.log(`  ✓ Removed old dead file: ${path.relative(ANDROID_RES, df)}`);
    }
  }

  // Remove splash icon PNGs from all density-specific drawable directories
  const drawableDirs = ['drawable-mdpi', 'drawable-hdpi', 'drawable-xhdpi', 'drawable-xxhdpi', 'drawable-xxxhdpi',
    'drawable-land-mdpi', 'drawable-land-hdpi', 'drawable-land-xhdpi', 'drawable-land-xxhdpi', 'drawable-land-xxxhdpi',
    'drawable-port-mdpi', 'drawable-port-hdpi', 'drawable-port-xhdpi', 'drawable-port-xxhdpi', 'drawable-port-xxxhdpi'];
  for (const dirName of drawableDirs) {
    const splashFile = path.join(ANDROID_RES, dirName, 'splash.png');
    if (fs.existsSync(splashFile)) {
      fs.unlinkSync(splashFile);
      console.log(`  ✓ Removed splash.png → ${dirName}`);
    }
    const splashIconFile = path.join(ANDROID_RES, dirName, 'ic_splash_foreground.png');
    if (fs.existsSync(splashIconFile)) {
      fs.unlinkSync(splashIconFile);
      console.log(`  ✓ Removed ic_splash_foreground.png → ${dirName}`);
    }
  }

  console.log('\n✅ All Android icon assets generated successfully!');
}

generateIcons().catch(err => { console.error('FAILED:', err); process.exit(1); });
