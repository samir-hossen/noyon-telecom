// Minimal ESLint flat config — added as part of production-readiness audit
// (Phase 18: code quality). Intentionally conservative: catches real bugs
// (undefined vars, broken hooks rules, unreachable code) without imposing a
// house style, so it doesn't force a repo-wide reformat. Run with
// `npm run lint` from frontend/.
import js from '@eslint/js';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';

export default [
  js.configs.recommended,
  {
    files: ['src/**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: {
        window: 'readonly',
        document: 'readonly',
        console: 'readonly',
        fetch: 'readonly',
        localStorage: 'readonly',
        navigator: 'readonly',
        FormData: 'readonly',
        URLSearchParams: 'readonly',
        URL: 'readonly',
        Blob: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        confirm: 'readonly',
        prompt: 'readonly',
        alert: 'readonly',
        process: 'readonly',
      },
    },
    plugins: { react, 'react-hooks': reactHooks },
    rules: {
      ...react.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      'react/react-in-jsx-scope': 'off', // Vite's React 18 JSX runtime doesn't need this
      'react/prop-types': 'off', // not used anywhere in this codebase; not worth introducing now
      // Stylistic-only, flags plain apostrophes/quotes in JSX text (e.g. "don't").
      // Doesn't indicate a real bug and this codebase writes plain English text
      // throughout — enabling it would demand a repo-wide text rewrite, which
      // is explicitly out of scope for this pass.
      'react/no-unescaped-entities': 'off',
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
    settings: { react: { version: 'detect' } },
  },
  { ignores: ['dist/**', 'node_modules/**', 'dev-dist/**'] },
];
