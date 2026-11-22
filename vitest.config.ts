import path from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@refractor-ui/core/reset.css': path.resolve(import.meta.dirname, 'packages/core/src/reset.css'),
      '@refractor-ui/core/refractor.css': path.resolve(import.meta.dirname, 'packages/core/src/refractor.css'),
      '@refractor-ui/core': path.resolve(import.meta.dirname, 'packages/core/src/index.ts'),
      '@refractor-ui/theme-alabaster': path.resolve(
        import.meta.dirname,
        'packages/themes/alabaster/src/index.ts'
      ),
      '@refractor-ui/theme-obsidian': path.resolve(
        import.meta.dirname,
        'packages/themes/obsidian/src/index.ts'
      ),
      '@refractor-ui/theme-amethyst': path.resolve(
        import.meta.dirname,
        'packages/themes/amethyst/src/index.ts'
      ),
      '@refractor-ui/theme-emerald-tide': path.resolve(
        import.meta.dirname,
        'packages/themes/emerald-tide/src/index.ts'
      ),
      '@refractor-ui/theme-solar-prism': path.resolve(
        import.meta.dirname,
        'packages/themes/solar-prism/src/index.ts'
      ),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    maxWorkers: 6,
    setupFiles: ['./vitest.setup.ts'],
    include: [
      'packages/**/*.test.{ts,tsx,mjs}',
      'apps/**/*.test.{ts,tsx}',
    ],
    exclude: ['**/node_modules/**', '**/dist/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'lcov'],
      include: [
        'packages/core/src/**/*.{ts,tsx}',
        'packages/themes/*/src/**/*.ts',
        'packages/cli/src/**/*.mjs',
      ],
      exclude: [
        '**/*.test.{ts,tsx,mjs}',
        '**/*.doc.mjs',
        '**/index.ts',
        '**/types.ts',
        'packages/core/src/BaseProps.ts',
        'packages/core/src/__tests__/**',
      ],
      thresholds: {
        statements: 93,
        branches: 93,
        functions: 93,
        lines: 93,
      },
    },
  },
});
