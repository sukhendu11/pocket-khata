import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import { getBuildVersion } from './scripts/get-build-version.cjs';

function readProperties(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const props = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('!')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    props[trimmed.slice(0, eqIdx).trim()] = trimmed.slice(eqIdx + 1).trim();
  }
  return props;
}

const versionProps = readProperties('version.properties');
const APP_VERSION = versionProps.versionName || '2.4.0';

export default defineConfig({
  plugins: [react()],
  define: {
    __BUILD_VERSION__: JSON.stringify(getBuildVersion()),
    __APP_VERSION__: JSON.stringify(APP_VERSION),
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/tests/setup.js',
    css: true,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{js,jsx}'],
      exclude: [
        'src/tests/**',
        'src/main.jsx',
        '**/*.test.{js,jsx}',
        'src/tests/setup.js',
        'src/index.css',
      ],
      reportsDirectory: './coverage',
      reporter: ['text', 'html', 'lcov', 'clover'],
      all: true,
    },
  },
});
