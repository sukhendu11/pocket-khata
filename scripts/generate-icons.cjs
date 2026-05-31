const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const BG_COLOR = { r: 255, g: 255, b: 255 }; // white (was blue #3867d6)
const LOGO_PATH = 'public/pocket-khata-logo.png';

// Android density icon sizes
const sizes = [
  { dir: 'mipmap-mdpi',     px: 48  },
  { dir: 'mipmap-hdpi',     px: 72  },
  { dir: 'mipmap-xhdpi',    px: 96  },
  { dir: 'mipmap-xxhdpi',   px: 144 },
  { dir: 'mipmap-xxxhdpi',  px: 192 },
];

async function main() {
  for (const { dir, px } of sizes) {
    const baseDir = path.join('android/app/src/main/res', dir);

    // Logo occupies 55% of icon size → 22.5% padding on each side (well within 66.67% safe zone)
    const logoPx = Math.round(px * 0.55);
    const logoBuffer = await sharp(LOGO_PATH)
      .resize(logoPx, logoPx, { fit: 'inside', withoutEnlargement: true })
      .png()
      .toBuffer();
    const meta = await sharp(logoBuffer).metadata();
    const left = Math.round((px - meta.width) / 2);
    const top = Math.round((px - meta.height) / 2);

    // 1. Foreground: logo on transparent background
    const fgCanvas = await sharp({
      create: { width: px, height: px, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } }
    }).png().toBuffer();
    const fgResult = await sharp(fgCanvas)
      .composite([{ input: logoBuffer, top, left }])
      .png()
      .toBuffer();
    fs.writeFileSync(path.join(baseDir, 'ic_launcher_foreground.png'), fgResult);
    console.log(`  foreground (${dir}): ${px}x${px}, logo ${meta.width}x${meta.height}`);

    // 2. Background: solid white
    const bgBuffer = await sharp({
      create: { width: px, height: px, channels: 4, background: BG_COLOR }
    }).png().toBuffer();
    fs.writeFileSync(path.join(baseDir, 'ic_launcher_background.png'), bgBuffer);
    console.log(`  background (${dir}): ${px}x${px}`);

    // 3. Fallback (pre-API-26): logo on white background
    const fallbackResult = await sharp(bgBuffer)
      .composite([{ input: logoBuffer, top, left }])
      .png()
      .toBuffer();
    fs.writeFileSync(path.join(baseDir, 'ic_launcher.png'), fallbackResult);
    console.log(`  fallback   (${dir}): ${px}x${px}`);
  }
  console.log('All icons generated successfully!');
}

main().catch(err => { console.error(err); process.exit(1); });
