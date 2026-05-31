const sharp = require('sharp');
const fs = require('fs');

const LOGO_PATH = 'public/pocket-khata-logo.png';
const SCALE_FACTOR = 3;

async function main() {
  const srcMeta = await sharp(LOGO_PATH).metadata();
  console.log(`Source logo: ${srcMeta.width}x${srcMeta.height} (${(srcMeta.size / 1024).toFixed(1)} KB)`);

  const upW = srcMeta.width * SCALE_FACTOR;
  const upH = srcMeta.height * SCALE_FACTOR;

  // Use lanczos3 (sharp's default) for high-quality upscale.
  // Lanczos3 preserves sharpness without creating visible pixel blocks.
  const upscaledBuffer = await sharp(LOGO_PATH)
    .resize(upW, upH)
    .png({ compressionLevel: 9 })
    .toBuffer();

  fs.writeFileSync(LOGO_PATH, upscaledBuffer);
  const finalKB = (upscaledBuffer.length / 1024).toFixed(1);
  console.log(`Upscaled logo saved: ${upW}x${upH} (${finalKB} KB)`);
  console.log('Done!');
}

main().catch(err => { console.error(err); process.exit(1); });
