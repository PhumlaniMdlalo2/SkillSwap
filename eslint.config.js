// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', '.expo/*', 'coverage/*', 'node_modules/*'],
  },
  {
    files: ['**/__tests__/**/*.{js,jsx}', '**/*.test.{js,jsx}'],
    languageOptions: {
      globals: {
        describe: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        jest: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
      },
    },
  },
  {
    rules: {
      // The app's copy leans on typographic apostrophes/quotes in JSX text.
      'react/no-unescaped-entities': 'off',
      // Local form state is routinely seeded from fetched data (onboarding
      // prefill, the weekly-hours editor) — a setState in an effect is the
      // intended pattern there, not a bug.
      'react-hooks/set-state-in-effect': 'off',
    },
  },
  {
    // Side-effect import for gesture-handler ordering + the value import.
    files: ['app/_layout.jsx'],
    rules: { 'import/no-duplicates': 'off' },
  },
]);
