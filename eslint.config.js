import { defineConfig } from 'eslint/config';
import { includeIgnoreFile } from '@eslint/compat';
import path from 'node:path';
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import eslintReact from '@eslint-react/eslint-plugin';
import refractorPlugin from './internal/eslint-plugin-refractor/index.js';

/**
 * Refractor Optical Glass UI Kit — Two-Tier Open-Internals ESLint Configuration
 *
 * - Humans (local default): `pnpm lint` (recommended mode — advisory warnings, hard soundness/security errors)
 * - Agents & CI: `pnpm lint:strict` or `CI=true` / `REFRACTOR_STRICT_LINT=1` (strict mode — all errors)
 */

const isStrictMode =
  process.env.REFRACTOR_STRICT_LINT === '1' || process.env.CI === 'true';

const refractorConfig = isStrictMode
  ? refractorPlugin.configs.strict
  : refractorPlugin.configs.recommended;

const reactSeverity = isStrictMode ? 'error' : 'warn';

export default defineConfig(
  includeIgnoreFile(path.join(import.meta.dirname, '.gitignore'), 'root .gitignore'),
  {
    ignores: [
      '**/dist/**',
      '**/coverage/**',
      '**/node_modules/**',
      'internal/eslint-plugin-refractor/**',
      'scripts/**',
      'packages/cli/**',
      'packages/**/*.doc.mjs',
      'eslint.config.js',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    plugins: {
      '@eslint-react': eslintReact,
      '@refractor': refractorPlugin,
    },
    rules: {
      ...refractorConfig.rules,
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-imports': [
        reactSeverity,
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      '@eslint-react/no-forward-ref': 'error',
      '@eslint-react/no-array-index-key': reactSeverity,
      '@eslint-react/no-duplicate-key': 'error',
      '@eslint-react/no-missing-key': 'error',
      'no-console': ['error', { allow: ['warn', 'error'] }],
    },
  },
  {
    files: ['**/*.test.{ts,tsx}', '**/__tests__/**/*.{ts,tsx}'],
    rules: {
      '@refractor/no-raw-color': 'off',
      '@refractor/require-base-props': 'off',
      '@refractor/require-baseprops-passthrough': 'off',
      '@eslint-react/no-array-index-key': 'off',
    },
  }
);
