import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { getBuildVersion } from './scripts/get-build-version.cjs';

export default defineConfig({
  plugins: [react()],
  define: {
    __BUILD_VERSION__: JSON.stringify(getBuildVersion()),
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
