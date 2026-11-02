// Monorepo ESLint flat config (ESLint 10 + typescript-eslint 8).
// Lints the TypeScript backend (apps/api), the shared packages and the admin panel.
// Run from the repo root: `pnpm lint`, or per package via each package's `lint` script.
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/.next/**',
      '**/coverage/**',
      '**/.turbo/**',
      '**/*.d.ts',
      'apps/mobile/**', // Flutter, linted by `flutter analyze`
      'apps/marketing/**',
      'apps/api/load-test/.out/**',
      'scratch/**',
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  {
    files: ['**/*.{ts,tsx,mts,cts}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.node },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off', // the codebase is Prisma/Nest-heavy; tsc strictNullChecks guards instead
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_', ignoreRestSiblings: true },
      ],
      // Nest DI uses empty constructors and decorated classes; namespaces come from generated types.
      '@typescript-eslint/no-empty-function': 'off',
      '@typescript-eslint/no-namespace': 'off',
      // tsc already reports these more precisely.
      'no-undef': 'off',
      'no-redeclare': 'off',
      // Best-effort cleanup (`catch {}`) is a deliberate pattern here; other empty blocks are not.
      'no-empty': ['error', { allowEmptyCatch: true }],
      // `interface A extends B {}` names a DTO/contract type on purpose.
      '@typescript-eslint/no-empty-object-type': ['error', { allowInterfaces: 'with-single-extends' }],
    },
  },

  // Tests and scripts
  {
    files: ['**/test/**/*.{ts,tsx}', '**/*.spec.ts', '**/*.int-spec.ts'],
    languageOptions: { globals: { ...globals.node, ...globals.jest } },
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
    },
  },
  {
    files: ['**/*.{js,cjs,mjs}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.node },
    },
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }],
      'no-empty': ['error', { allowEmptyCatch: true }],
      // `const crypto = require('crypto')` in CommonJS scripts is fine.
      'no-redeclare': ['error', { builtinGlobals: false }],
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },
  {
    files: ['**/*.cjs', 'apps/api/scripts/**/*.js', 'scripts/**/*.js'],
    languageOptions: { sourceType: 'commonjs' },
  },

  // Admin panel (Next.js / React)
  {
    files: ['apps/admin/**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks },
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
);
