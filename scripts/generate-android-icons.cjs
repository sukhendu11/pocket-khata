const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const LOGO_PATH = 'public/pocket-khata-logo.png';
const ANDROID_RES = 'android/app/src/main/res';

// Standard launcher icon sizes per density bucket
const ICON_SIZES = [
  { density: 'mipmap-mdpi', icon: 48, adaptive: 108 },
  { density: 'mipmap-hdpi', icon: 72, adaptive: 162 },
  { density: 'mipmap-xhdpi', icon: 96, adaptive: 216 },
  { density: 'mipmap-xxhdpi', icon: 144, adaptive: 324 },
  { density: 'mipmap-xxxhdpi', icon: 192, adaptive: 432 },
];

async function generateIcons() {
  const logo = fs.readFileSync(LOGO_PATH);
  const meta = await sharp(logo).metadata();
  console.log(`Logo: ${meta.width}x${meta.height}, ${meta.channels} channels, alpha: ${meta.hasAlpha}\n`);

  for (const { density, icon, adaptive } of ICON_SIZES) {
    const dir = path.join(ANDROID_RES, density);
    fs.mkdirSync(dir, { recursive: true });

    // --- Regular launcher icon ---
    await sharp(logo).resize(icon, icon, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toFile(path.join(dir, 'ic_launcher.png'));
    await sharp(logo).resize(icon, icon, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toFile(path.join(dir, 'ic_launcher_round.png'));
    console.log(`  ✓ ic_launcher.png / round  (${icon}x${icon}) → ${density}`);

    // --- Adaptive icon foreground ---
    // Adaptive icons use a 108dp viewport; the safe zone is the inner 72dp (66.7%).
    // We resize the logo to 50% of the full adaptive size so it fits comfortably inside the mask.
    const fgSize = Math.round(adaptive * 0.50);
    const fg = await sharp(logo).resize(fgSize, fgSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();

    // Extract dominant edge color for background
    const edge = await sharp(logo).resize(20, 20, { fit: 'cover' }).raw().toBuffer();
    let r = 0, g = 0, b = 0, count = 0;
    for (let i = 0; i < edge.length; i += 4) {
      r += edge[i]; g += edge[i+1]; b += edge[i+2]; count++;
    }
    const bgR = Math.round(r / count), bgG = Math.round(g / count), bgB = Math.round(b / count);

    // Foreground: logo centered on transparent canvas
    const left = Math.round((adaptive - fgSize) / 2);
    const top = Math.round((adaptive - fgSize) / 2);
    await sharp({ create: { width: adaptive, height: adaptive, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
      .composite([{ input: fg, left, top }])
      .png()
      .toFile(path.join(dir, 'ic_launcher_foreground.png'));

    // Background: solid color derived from logo edges (or white fallback)
    await sharp({ create: { width: adaptive, height: adaptive, channels: 4, background: { r: bgR, g: bgG, b: bgB, alpha: 255 } } })
      .png()
      .toFile(path.join(dir, 'ic_launcher_background.png'));

    console.log(`  ✓ foreground/background (${adaptive}x${adaptive}) → ${density}  (bg: rgb(${bgR},${bgG},${bgB}))`);
  }

  // --- Adaptive icon XML (API 26+) ---
  const anydpi = path.join(ANDROID_RES, 'mipmap-anydpi-v26');
  fs.mkdirSync(anydpi, { recursive: true });
  const xml = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@mipmap/ic_launcher_background"/>
    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>
</adaptive-icon>`;
  fs.writeFileSync(path.join(anydpi, 'ic_launcher.xml'), xml);
  fs.writeFileSync(path.join(anydpi, 'ic_launcher_round.xml'), xml);
  console.log('  ✓ Adaptive XML → mipmap-anydpi-v26\n');

  console.log('✅ All Android launcher icons generated from pocket-khata-logo.png');
}

generateIcons().catch(err => { console.error('FAILED:', err); process.exit(1); });
