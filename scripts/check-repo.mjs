import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const CORE_DIR = path.join(ROOT, 'packages', 'core');
const CORE_SRC = path.join(CORE_DIR, 'src');

const errors = [];

// 1. Validate SemVer 2.0.0 across all workspace packages
const SEMVER_RE =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*)?(?:\+[0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*)?$/;

const rootPkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
if (!SEMVER_RE.test(rootPkg.version)) {
  errors.push(`Root package.json version "${rootPkg.version}" is not valid SemVer 2.0.0.`);
}

const versionedManifests = [
  'packages/core/package.json',
  'packages/cli/package.json',
  'apps/docs/package.json',
  'internal/eslint-plugin-refractor/package.json',
];
const themesDir = path.join(ROOT, 'packages', 'themes');
if (fs.existsSync(themesDir)) {
  for (const dir of fs.readdirSync(themesDir)) {
    const manifestPath = path.join('packages', 'themes', dir, 'package.json');
    if (fs.existsSync(path.join(ROOT, manifestPath))) {
      versionedManifests.push(manifestPath);
    }
  }
}

for (const relPath of versionedManifests) {
  const full = path.join(ROOT, relPath);
  if (!fs.existsSync(full)) {
    errors.push(`Missing workspace manifest: ${relPath}`);
    continue;
  }
  const pkg = JSON.parse(fs.readFileSync(full, 'utf8'));
  if (pkg.version !== rootPkg.version) {
    errors.push(`Version drift in ${relPath}: expected ${rootPkg.version}, found ${pkg.version}`);
  }
}

// 2. Verify required GitHub governance files & ADRs
const requiredFiles = [
  'README.md',
  'LICENSE',
  'NOTICE',
  'CHANGELOG.md',
  'CONTRIBUTING.md',
  'CODE_OF_CONDUCT.md',
  'SECURITY.md',
  'AGENTS.md',
  'packages/core/README.md',
  'packages/cli/README.md',
  '.github/SUPPORT.md',
  '.github/ci-templates/ci.yml',
  '.github/ci-templates/release.yml',
  '.github/ci-templates/pages.yml',
  '.github/PULL_REQUEST_TEMPLATE.md',
  '.github/CODEOWNERS',
  '.github/dependabot.yml',
  'docs/adr/README.md',
];
for (const rel of requiredFiles) {
  if (!fs.existsSync(path.join(ROOT, rel))) {
    errors.push(`Missing governance file: ${rel}`);
  }
}

// 3. Verify Refractor component folder structure & subpath export parity
const corePkg = JSON.parse(fs.readFileSync(path.join(CORE_DIR, 'package.json'), 'utf8'));
const coreIndex = fs.existsSync(path.join(CORE_SRC, 'index.ts'))
  ? fs.readFileSync(path.join(CORE_SRC, 'index.ts'), 'utf8')
  : '';

const componentDirs = fs
  .readdirSync(CORE_SRC, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && /^[A-Z][A-Za-z0-9]+$/.test(entry.name))
  .map((entry) => entry.name)
  .sort();

for (const comp of componentDirs) {
  const dir = path.join(CORE_SRC, comp);
  const expected = [`${comp}.tsx`, `${comp}.doc.mjs`, `${comp}.test.tsx`, 'index.ts'];
  for (const file of expected) {
    if (!fs.existsSync(path.join(dir, file))) {
      errors.push(`Refractor structure drift: packages/core/src/${comp}/ missing ${file}`);
    }
  }
  const exportKey = `./${comp}`;
  if (!corePkg.exports || !corePkg.exports[exportKey]) {
    errors.push(`Export map drift: packages/core/package.json missing subpath export "${exportKey}"`);
  }
  if (!coreIndex.includes(`./${comp}`)) {
    errors.push(`Barrel drift: packages/core/src/index.ts does not re-export "./${comp}"`);
  }
}

// 4. Verify zero `any` and zero `unknown` tokens in all TypeScript source files
function walkTs(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === 'coverage') {
      continue;
    }
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkTs(full));
    } else if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) {
      results.push(full);
    }
  }
  return results;
}

const tsFiles = [
  ...walkTs(path.join(ROOT, 'packages')),
  ...walkTs(path.join(ROOT, 'apps')),
];

const FORBIDDEN_TYPE_RE = /(?::\s*(?:any|unknown)\b|\bas\s+(?:any|unknown)\b|<\s*(?:any|unknown)\s*>)/;

for (const file of tsFiles) {
  const rel = path.relative(ROOT, file).replace(/\\/g, '/');
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) {
      return;
    }
    if (FORBIDDEN_TYPE_RE.test(line)) {
      errors.push(`Forbidden any/unknown type in ${rel}:${idx + 1} -> ${trimmed}`);
    }
  });
}

// 5. Verify CHANGELOG.md documents current version
const changelog = fs.existsSync(path.join(ROOT, 'CHANGELOG.md'))
  ? fs.readFileSync(path.join(ROOT, 'CHANGELOG.md'), 'utf8')
  : '';
if (!changelog.includes(`## [${rootPkg.version}]`)) {
  errors.push(`CHANGELOG.md missing section "## [${rootPkg.version}]"`);
}

if (errors.length > 0) {
  console.error(`\n[check:repo] FAILED with ${errors.length} violation(s):\n`);
  for (const err of errors) {
    console.error(`  - ${err}`);
  }
  process.exit(1);
}

console.log(
  `[check:repo] PASSED: SemVer v${rootPkg.version}, ${componentDirs.length} Refractor component directories, ${tsFiles.length} TypeScript files checked (zero any/unknown).`
);
