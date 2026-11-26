import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const docsDir = path.join(ROOT, 'apps', 'docs');
const viteBin = path.join(ROOT, 'node_modules', 'vite', 'bin', 'vite.js');
const basePath = process.env.VITE_BASE_PATH ?? '/refractor-ui/';

const build = spawnSync(process.execPath, [viteBin, 'build'], {
  cwd: docsDir,
  stdio: 'inherit',
  env: {
    ...process.env,
    VITE_BASE_PATH: basePath,
  },
});

if (build.status !== 0) {
  process.exit(build.status ?? 1);
}

const distDir = path.join(docsDir, 'dist');
const requiredArtifacts = [
  'index.html',
  '404.html',
  '.nojekyll',
  'favicon.svg',
  path.join('assets', 'refractor-specimen.png'),
  path.join('src', 'assets', 'images', 'avatar_product_lead_1795197572008.jpg'),
];

for (const rel of requiredArtifacts) {
  const full = path.join(distDir, rel);
  if (!fs.existsSync(full)) {
    console.error(`[build:pages] Missing required GitHub Pages artifact: ${rel}`);
    process.exit(1);
  }
}

console.log(`[build:pages] GitHub Pages bundle ready in apps/docs/dist (base: "${basePath}").`);
