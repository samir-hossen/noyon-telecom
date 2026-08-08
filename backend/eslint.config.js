// Minimal ESLint flat config — added as part of production-readiness audit
// (Phase 18: code quality). Run with `npm run lint` from backend/.
import js from '@eslint/js';
import globals from 'globals';

export default [
  js.configs.recommended,
  {
    files: ['src/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.node },
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }],
    },
  },
  { ignores: ['node_modules/**', 'uploads/**'] },
];
