import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const CORE_DIR = path.join(ROOT, 'packages', 'core');
const CORE_SRC = path.join(CORE_DIR, 'src');
const CORE_PKG_PATH = path.join(CORE_DIR, 'package.json');

const corePkg = JSON.parse(fs.readFileSync(CORE_PKG_PATH, 'utf8'));

const componentDirs = fs
  .readdirSync(CORE_SRC, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && /^[A-Z][A-Za-z0-9]+$/.test(entry.name))
  .map((entry) => entry.name)
  .sort();

const exportsMap = {
  '.': {
    source: './src/index.ts',
    types: './dist/index.d.ts',
    default: './dist/index.js',
  },
  './reset.css': './src/reset.css',
  './refractor.css': './src/refractor.css',
  './BaseProps': {
    source: './src/BaseProps.ts',
    types: './dist/BaseProps.d.ts',
    default: './dist/BaseProps.js',
  },
  './naming': {
    source: './src/naming.ts',
    types: './dist/naming.d.ts',
    default: './dist/naming.js',
  },
  './theme': {
    source: './src/theme/index.ts',
    types: './dist/theme/index.d.ts',
    default: './dist/theme/index.js',
  },
};

for (const comp of componentDirs) {
  exportsMap[`./${comp}`] = {
    source: `./src/${comp}/index.ts`,
    types: `./dist/${comp}/index.d.ts`,
    default: `./dist/${comp}/index.js`,
  };
}

corePkg.exports = exportsMap;
fs.writeFileSync(CORE_PKG_PATH, `${JSON.stringify(corePkg, null, 2)}\n`, 'utf8');

const indexLines = [
  "export type { BaseProps, OpticalStyleTokens } from './BaseProps';",
  "export { REFRACTOR_PREFIX, stableClassName } from './naming';",
  "export * from './hooks/useMergedRefs';",
  "export * from './hooks/useControllableState';",
  "export * from './utils/composeEventHandlers';",
  "export * from './utils/mergeProps';",
  "export * from './utils/themeProps';",
  "export * from './utils/colorMath';",
  "export * from './utils/sanitize';",
  "export * from './utils/diffAlgorithm';",
  "export * from './utils/dateGrid';",
  "export * from './theme';",
  ...componentDirs.map((comp) => `export * from './${comp}';`),
  '',
];

fs.writeFileSync(path.join(CORE_SRC, 'index.ts'), indexLines.join('\n'), 'utf8');
console.log(`[sync:exports] Synchronized ${componentDirs.length} component subpath exports and barrel.`);
