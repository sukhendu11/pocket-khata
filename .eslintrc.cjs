module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:react/jsx-runtime',
    'plugin:react-hooks/recommended',
  ],
  ignorePatterns: ['dist', 'coverage', 'android', '.eslintrc.cjs'],
  parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
  settings: { react: { version: '18.2' } },
  plugins: ['react-refresh'],
  rules: {
    'react-refresh/only-export-components': [
      'warn',
      { allowConstantExport: true },
    ],
    'no-console': ['error', { allow: ['warn', 'error'] }],
    'no-shadow': 'off',
  },
  overrides: [
    {
      // Main app source files: strict no-shadow with builtin globals
      files: ['src/**/*.js', 'src/**/*.jsx'],
      rules: {
        'no-shadow': ['error', { builtinGlobals: true, allow: ['name', 'screen'] }],
      },
    },
    {
      // Service worker: add worker env, declare SW-specific globals, allow `event` param
      files: ['public/sw.js'],
      env: { browser: true, es2020: true, worker: true },
      globals: {
        clients: 'readonly',
      },
      rules: {
        'no-shadow': ['error', { builtinGlobals: true, allow: ['name', 'screen', 'event'] }],
      },
    },
  ],
}
