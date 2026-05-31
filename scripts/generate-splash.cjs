const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const LOGO_PATH = 'public/pocket-khata-logo.png';
const ANDROID_RES = 'android/app/src/main/res';

// Splash screen image sizes per density and orientation
// The logo should fill about 40-50% of the splash dimensions
const SPLASH_SIZES = [
  // Portrait
  { dir: 'drawable-port-mdpi',     width: 320,  height: 480  },
  { dir: 'drawable-port-hdpi',     width: 480,  height: 800  },
  { dir: 'drawable-port-xhdpi',    width: 720,  height: 1280 },
  { dir: 'drawable-port-xxhdpi',   width: 960,  height: 1600 },
  { dir: 'drawable-port-xxxhdpi',  width: 1280, height: 1920 },
  // Landscape
  { dir: 'drawable-land-mdpi',     width: 480,  height: 320  },
  { dir: 'drawable-land-hdpi',     width: 800,  height: 480  },
  { dir: 'drawable-land-xhdpi',    width: 1280, height: 720  },
  { dir: 'drawable-land-xxhdpi',   width: 1600, height: 960  },
  { dir: 'drawable-land-xxxhdpi',  width: 1920, height: 1280 },
  // Default (used as fallback)
  { dir: 'drawable',               width: 480,  height: 320  },
];

// Logo fills ~40% of the shortest dimension so it's prominent but not oversized
const LOGO_FILL_RATIO = 0.40;

async function generateSplashImages() {
  const logo = fs.readFileSync(LOGO_PATH);
  const meta = await sharp(logo).metadata();
  console.log(`Logo: ${meta.width}x${meta.height}, ${meta.channels} channels, alpha: ${meta.hasAlpha}\n`);

  for (const { dir, width, height } of SPLASH_SIZES) {
    const dirPath = path.join(ANDROID_RES, dir);
    fs.mkdirSync(dirPath, { recursive: true });

    // Calculate logo size based on the shortest dimension
    const shortestDim = Math.min(width, height);
    const logoPx = Math.round(shortestDim * LOGO_FILL_RATIO);

    // Resize logo maintaining aspect ratio
    const logoBuffer = await sharp(logo)
      .resize(logoPx, logoPx, { fit: 'inside', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();

    const sizedMeta = await sharp(logoBuffer).metadata();
    const left = Math.round((width - sizedMeta.width) / 2);
    const top = Math.round((height - sizedMeta.height) / 2);

    // Create transparent canvas and composite the logo centered
    await sharp({
      create: { width, height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } }
    })
      .composite([{ input: logoBuffer, top, left }])
      .png()
      .toFile(path.join(dirPath, 'splash.png'));

    console.log(`  ✓ splash.png (${width}x${height}, logo ${sizedMeta.width}x${sizedMeta.height}) → ${dir}`);
  }

  console.log('\n✅ All splash screen images generated successfully!');
}

generateSplashImages().catch(err => { console.error('FAILED:', err); process.exit(1); });
