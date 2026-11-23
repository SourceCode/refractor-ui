import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  base: process.env.VITE_BASE_PATH ?? '/',
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'prepare-github-pages-dist',
      apply: 'build',
      closeBundle(error?: Error): void {
        if (error) return;
        const distDir = path.resolve(import.meta.dirname, 'dist');
        const srcAssets = path.resolve(import.meta.dirname, 'src/assets');
        const distAssets = path.resolve(distDir, 'src/assets');
        if (fs.existsSync(distDir) && fs.existsSync(srcAssets)) {
          fs.cpSync(srcAssets, distAssets, { recursive: true, force: true });
        }
        if (fs.existsSync(distDir)) {
          fs.writeFileSync(path.join(distDir, '.nojekyll'), '', 'utf8');
          const indexHtml = path.join(distDir, 'index.html');
          if (fs.existsSync(indexHtml)) {
            fs.copyFileSync(indexHtml, path.join(distDir, '404.html'));
          }
        }
      },
    },
  ],
  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: {
      '@refractor-ui/core/reset.css': path.resolve(
        import.meta.dirname,
        '../../packages/core/src/reset.css'
      ),
      '@refractor-ui/core/refractor.css': path.resolve(
        import.meta.dirname,
        '../../packages/core/src/refractor.css'
      ),
      '@refractor-ui/core': path.resolve(import.meta.dirname, '../../packages/core/src/index.ts'),
      '@refractor-ui/theme-alabaster': path.resolve(
        import.meta.dirname,
        '../../packages/themes/alabaster/src/index.ts'
      ),
      '@refractor-ui/theme-obsidian': path.resolve(
        import.meta.dirname,
        '../../packages/themes/obsidian/src/index.ts'
      ),
      '@refractor-ui/theme-amethyst': path.resolve(
        import.meta.dirname,
        '../../packages/themes/amethyst/src/index.ts'
      ),
      '@refractor-ui/theme-emerald-tide': path.resolve(
        import.meta.dirname,
        '../../packages/themes/emerald-tide/src/index.ts'
      ),
      '@refractor-ui/theme-solar-prism': path.resolve(
        import.meta.dirname,
        '../../packages/themes/solar-prism/src/index.ts'
      ),
      '@refractor-ui/themes': path.resolve(
        import.meta.dirname,
        '../../packages/themes/collection/src/index.ts'
      ),
    },
  },
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            { name: 'vendor-react', test: /node_modules[\\/](?:react|react-dom|scheduler)[\\/]/, priority: 30 },
            { name: 'vendor-redux', test: /node_modules[\\/](?:@reduxjs|react-redux|redux|immer)[\\/]/, priority: 25 },
            { name: 'vendor-lucide', test: /node_modules[\\/]lucide-react[\\/]/, priority: 20 },
            { name: 'refractor-themes', test: /packages[\\/]themes[\\/]/, priority: 15 },
          ],
        },
      },
    },
  },
  server: {
    hmr: process.env.DISABLE_HMR !== 'true',
    watch: process.env.DISABLE_HMR === 'true' ? null : {},
  },
});
