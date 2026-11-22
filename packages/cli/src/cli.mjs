import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));
export const DEFAULT_REPO_ROOT = path.resolve(MODULE_DIR, '..', '..', '..');

const CANONICAL_CATEGORY_ORDER = [
  'Buttons & Actions',
  'Form Inputs & Selection Controls',
  'Navigation',
  'Data Display & Content',
  'Feedback & System Status',
  'Overlays & Popups',
  'Layout & Workspace Controls',
  'Advanced Data & Visualization',
  'Advanced Search & Filtering',
  'Rich Input & Content Creation',
  'Interactive & Drag-and-Drop',
  'Collaboration & Guidance',
  'AI & Conversational Interfaces',
  'Media, Audio & Spatial Controls',
  'Security, Auth & Account Management',
  'Commerce, Billing & Conversion',
  'Mobile, Touch & System Utilities',
  'CLI & Terminal Surfaces',
  'AI Agent Execution & Control',
  'AI Context, Memory & Configuration',
  'Multi-Agent & Orchestration',
  'Date, Time & Scheduling Fields',
  'Number, Currency & Formatted Type Fields',
  'Complex Button & Action Variations',
  'Complex Variations of Common Controls',
  'Core & Trend Charts',
  'Part-to-Whole & Hierarchical Visuals',
  'Statistical & Distribution Visuals',
  'Relational & Flow Visuals',
  'KPI, Progress & Telemetry Visuals',
  'Geospatial & Map Visuals',
  'Chart Chrome & Interactive Controls',
  'Transport & Playback Controls',
  'Timeline & Sequencing',
  'Photo & Color Grading Controls',
  'Audio Mixing & Signal Processing',
  'Viewport & Export Utilities',
  'Financial & Market Visualizations',
  'Scientific, Statistical & High-Dimensional Visuals',
  'System, DevOps & Observability Widgets',
  'Comparison, Ranking & Storytelling Visuals',
  'Foundational Primitives & Micro-Utilities',
  'Desktop OS & Windowing Metaphors',
  'Document, Knowledge & Spreadsheet Tools',
  'Design, 3D & Shader Inspector Controls',
  'Enterprise Workflows, Data Ops & API Tooling',
  'Hardware, IoT & Tactile Surfaces',
];

const DOC_TOPICS = {
  principles: {
    title: 'Refractor Optical Glass Design Principles',
    dense: [
      '- Refractive Clarity: Every surface separates foreground content with >= 4.5:1 WCAG AA contrast.',
      '- Astryx Component Contracts: React 19 ref-as-prop, BaseProps<Element>, themeProps(), mergeProps(), displayName.',
      '- Open Internals Escalation: Props -> Theme Tokens -> Theme Overrides -> refractor-* classes/xstyle -> Swizzle.',
      '- Strict Soundness: Zero any, zero unknown, zero raw color literals in JSX, zero dangerouslySetInnerHTML.',
    ].join('\n'),
    full: [
      '1. Optical Glass Realism without Legibility Loss',
      '   - Primary actions use warm refractive tangerine capsules (--prism-primary-*).',
      '   - Secondary actions and floating slabs use cool frosted crystal glass with top specular meniscus highlights.',
      '   - Recessed frosted input wells (.prism-well) guarantee crisp typing contrast in both Alabaster and Obsidian modes.',
      '',
      '2. Astryx Architectural Parity (ADR-0001)',
      '   - Every component resides in packages/core/src/<Name>/{<Name>.tsx,<Name>.doc.mjs,<Name>.test.tsx,index.ts}.',
      '   - Every component forwards React 19 ref directly via props (no forwardRef) and sets displayName.',
      '   - Every interactive control uses keyboard-only focus rings (.prism-focus-ring) and IME-safe Enter handlers.',
      '',
      '3. Five-Step Open Internals Escalation Path',
      '   1) Typed Props  2) Theme Tokens  3) Theme Component Overrides  4) Stable refractor-* classes & xstyle  5) CLI Swizzle.',
    ].join('\n'),
  },
  tokens: {
    title: 'Optical Glass CSS Custom Property Tokens (--prism-*)',
    dense: [
      '- Palette: --prism-primary-{main,light,dark,contrast,rgb}, --prism-secondary-*, --prism-info-*, --prism-success-*, --prism-warning-*, --prism-error-*',
      '- Surfaces: --prism-bg-{start,mid,end}, --prism-crystal-{top,mid,bottom}, --prism-slab-{top,bottom}, --prism-well-{start,end,border}',
      '- Optics: --prism-blur-px, --prism-slab-blur-px, --prism-caustic-opacity, --prism-caustic-{warm,cool}-rgb, --prism-specular-opacity',
      '- Shape & Typography: --prism-radius-{control,pill,slab}, --prism-font-{sans,mono}',
    ].join('\n'),
    full: [
      'All optical physics in packages/core/src/refractor.css read exclusively from --prism-* CSS custom properties',
      'scoped inside @layer components so Tailwind v4 utilities compose cleanly without cascade collisions.',
      '',
      'Key Token Groups:',
      '  - Palette Ramps: --prism-primary-main / light / dark / contrast / rgb (plus secondary, info, success, warning, error)',
      '  - Text & Dividers: --prism-text-primary, --prism-text-secondary, --prism-text-disabled, --prism-divider, --prism-focus-ring',
      '  - Refractive Physics: --prism-caustic-opacity (0.45 subtle | 1 standard | 1.35 vivid), --prism-blur-px, --prism-specular-opacity',
      '  - Shape Geometry: --prism-radius-control (16px), --prism-radius-pill (9999px), --prism-radius-slab (24px)',
    ].join('\n'),
  },
  theme: {
    title: 'Dual MUI + Astryx Optical Theme Engine (ADR-0003)',
    dense: [
      '- MUI Ergonomics: createPrismTheme({ palette: { mode, primary: { main }, secondary: { main } }, shape, optics })',
      '- Astryx Cascade: defineTheme({ name, extends, palette, tokens: { "--prism-x": [light, dark] }, components })',
      '- Provider: <PrismThemeProvider theme={theme} mode="light|dark" refraction="subtle|standard|vivid" scope="root|local" />',
      '- 5 Official Presets: alabaster, obsidian, amethyst, emerald-tide, solar-prism.',
    ].join('\n'),
    full: [
      'Refractor unifies MUI palette ergonomics with Astryx CSS cascade theming:',
      '',
      '  import { createPrismTheme, PrismThemeProvider } from "@refractor-ui/core";',
      '  const theme = createPrismTheme({',
      '    palette: { mode: "dark", primary: { main: "#7C3AED" }, secondary: { main: "#06B6D4" } },',
      '    shape: { slabRadius: 24 },',
      '    optics: { refraction: "vivid", blurPx: 20, specularHighlight: true },',
      '  });',
      '',
      'Passing a single hex color automatically derives light, dark, WCAG >= 4.5:1 contrastText, and RGB caustic channels.',
      'Use defineTheme({ extends: alabasterTheme, components: { PrimaryButton: { className: "..." } } }) for cascading overrides.',
    ].join('\n'),
  },
  architecture: {
    title: 'Refractor Monorepo Architecture & ADRs',
    dense: [
      '- packages/core (@refractor-ui/core): 270 React 19 components, theme engine, utils, refractor.css, reset.css.',
      '- packages/themes/*: alabaster, obsidian, amethyst, emerald-tide, solar-prism.',
      '- packages/cli (@refractor-ui/cli): docs, component, theme, swizzle, check.',
      '- internal/eslint-plugin-refractor: 17 two-tier Astryx + zero-any/unknown rules.',
      '- ADRs: docs/adr/ADR-0001 through ADR-0006.',
    ].join('\n'),
    full: [
      'Monorepo Workspace Layout:',
      '  - packages/core       : 270 Astryx-standard components across 47 categories with subpath exports',
      '  - packages/themes/*   : 5 official optical theme presets',
      '  - packages/cli        : Agent-ready CLI (@refractor-ui/cli)',
      '  - apps/docs           : Interactive Optical Workbench & MUI+Astryx Theme Studio',
      '  - internal/eslint-plugin-refractor : Custom 17-rule AST ESLint governance plugin',
      '  - docs/adr/           : ADR-0001 (Astryx layout) through ADR-0006 (Security & A11y)',
    ].join('\n'),
  },
};

const VALID_COMPONENT_NAME_RE = /^[A-Z][A-Za-z0-9]+$/;

export function formatHelpText() {
  return [
    'Refractor Optical Glass UI Kit CLI (@refractor-ui/cli)',
    '',
    'Usage:',
    '  refractor help',
    '  refractor docs [--list | <topic>] [--dense]',
    '  refractor component --list',
    '  refractor component <Name> [--dense | --detail full]',
    '  refractor theme list',
    '  refractor theme inspect <preset>',
    '  refractor swizzle <Name> --out <dir>',
    '  refractor check [--strict]',
    '',
    'Topics for `docs`: principles, tokens, theme, architecture',
  ].join('\n');
}

export function listComponentDirectories(repoRoot = DEFAULT_REPO_ROOT) {
  const coreSrc = path.join(repoRoot, 'packages', 'core', 'src');
  if (!fs.existsSync(coreSrc)) {
    return [];
  }
  return fs
    .readdirSync(coreSrc, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && VALID_COMPONENT_NAME_RE.test(entry.name))
    .map((entry) => entry.name)
    .sort();
}

export async function loadComponentDoc(componentName, repoRoot = DEFAULT_REPO_ROOT) {
  const docPath = path.join(repoRoot, 'packages', 'core', 'src', componentName, `${componentName}.doc.mjs`);
  if (!fs.existsSync(docPath)) {
    return null;
  }
  const mod = await import(pathToFileURL(docPath).href);
  return mod.docs ?? mod.default ?? null;
}

export function rewriteSwizzledImports(sourceText) {
  return sourceText
    .replace(/from\s+['"]\.\.\/(?:BaseProps|naming|theme(?:\/[^'"]+)?|utils\/[^'"]+|hooks\/[^'"]+)['"]/g, "from '@refractor-ui/core'")
    .replace(/from\s+['"]\.\.\/([A-Z][A-Za-z0-9]+)(?:\/[^'"]+)?['"]/g, "from '@refractor-ui/core/$1'");
}

export function validateSafeOutputDir(rawOutDir, baseCwd) {
  if (!rawOutDir || typeof rawOutDir !== 'string') {
    return { ok: false, error: 'Missing required --out <dir> target path.' };
  }
  if (rawOutDir.includes('\0')) {
    return { ok: false, error: 'Rejected --out path containing null byte.' };
  }
  const normalizedSegments = rawOutDir.replace(/\\/g, '/').split('/');
  if (normalizedSegments.includes('..')) {
    return {
      ok: false,
      error: `Rejected path traversal in --out "${rawOutDir}". Parent directory segments ("..") are forbidden.`,
    };
  }
  const resolved = path.resolve(baseCwd, rawOutDir);
  return { ok: true, resolved };
}

function getFlagValue(args, flagName) {
  const idx = args.indexOf(flagName);
  if (idx === -1) return null;
  const val = args[idx + 1];
  if (!val || val.startsWith('--')) return null;
  return val;
}

function formatComponentDoc(doc, mode) {
  const lines = [];
  const header = `${doc.name} (${doc.displayName ?? doc.name}) — ${doc.group ?? 'Core'}`;
  lines.push(header);
  lines.push(`Import: import { ${doc.name} } from '@refractor-ui/core/${doc.name}';`);
  if (doc.usage?.description) {
    lines.push(`Summary: ${doc.usage.description}`);
  }

  const props = Array.isArray(doc.props) ? doc.props : [];
  if (mode === 'dense') {
    lines.push(`Props (${props.length}):`);
    for (const p of props) {
      lines.push(`  - ${p.name}: ${p.type} = ${p.defaultValue} — ${p.description}`);
    }
    return lines.join('\n');
  }

  lines.push('');
  lines.push(`Props (${props.length}):`);
  for (const p of props) {
    lines.push(`  - ${p.name} (${p.type}, default: ${p.defaultValue}): ${p.description}`);
  }

  if (mode === 'full') {
    if (Array.isArray(doc.keywords) && doc.keywords.length > 0) {
      lines.push('');
      lines.push(`Keywords: ${doc.keywords.join(', ')}`);
    }
    if (Array.isArray(doc.usage?.bestPractices) && doc.usage.bestPractices.length > 0) {
      lines.push('');
      lines.push('Best Practices:');
      for (const bp of doc.usage.bestPractices) {
        lines.push(`  [${bp.guidance ? 'DO' : 'AVOID'}] ${bp.description}`);
      }
    }
    if (Array.isArray(doc.usage?.accessibility) && doc.usage.accessibility.length > 0) {
      lines.push('');
      lines.push('Accessibility:');
      for (const a11y of doc.usage.accessibility) {
        lines.push(`  - ${a11y.name} (${a11y.criterion ?? 'WCAG'}): ${a11y.requirement ?? ''} ${a11y.description ?? ''}`.trim());
      }
    }
  }

  if (Array.isArray(doc.examples) && doc.examples.length > 0) {
    lines.push('');
    lines.push('Example:');
    lines.push(doc.examples[0]);
  }
  return lines.join('\n');
}

export function listThemes(repoRoot = DEFAULT_REPO_ROOT) {
  const themesDir = path.join(repoRoot, 'packages', 'themes');
  if (!fs.existsSync(themesDir)) return [];
  const entries = fs
    .readdirSync(themesDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();

  const themes = [];
  for (const dirName of entries) {
    const pkgPath = path.join(themesDir, dirName, 'package.json');
    if (!fs.existsSync(pkgPath)) continue;
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    themes.push({
      id: dirName,
      packageName: pkg.name,
      version: pkg.version,
      description: pkg.description ?? '',
    });
  }
  return themes;
}

export async function runCli(argv, options = {}) {
  const repoRoot = options.repoRoot ?? DEFAULT_REPO_ROOT;
  const cwd = options.cwd ?? process.cwd();
  const stdoutLines = [];
  const stderrLines = [];
  const out = (line) => stdoutLines.push(line);
  const err = (line) => stderrLines.push(line);

  const args = Array.isArray(argv) ? argv : [];
  const cmd = args[0];

  if (!cmd || cmd === 'help' || cmd === '--help' || cmd === '-h') {
    out(formatHelpText());
    return { exitCode: 0, stdout: stdoutLines.join('\n'), stderr: '' };
  }

  if (cmd === 'docs') {
    const rest = args.slice(1);
    const dense = rest.includes('--dense');
    const listFlag = rest.includes('--list');
    const topicArg = rest.find((token) => !token.startsWith('--'));

    if (listFlag || !topicArg) {
      out('Refractor Documentation Topics:');
      for (const [key, topic] of Object.entries(DOC_TOPICS)) {
        out(`  - ${key}: ${topic.title}`);
      }
      if (!listFlag) {
        out('');
        out(dense ? DOC_TOPICS.principles.dense : DOC_TOPICS.principles.full);
      }
      return { exitCode: 0, stdout: stdoutLines.join('\n'), stderr: '' };
    }

    const topicKey = topicArg.toLowerCase();
    const topic = Object.prototype.hasOwnProperty.call(DOC_TOPICS, topicKey)
      ? DOC_TOPICS[topicKey]
      : null;

    if (!topic) {
      err(`Unknown docs topic "${topicArg}". Available topics: ${Object.keys(DOC_TOPICS).join(', ')}.`);
      return { exitCode: 1, stdout: '', stderr: stderrLines.join('\n') };
    }

    out(topic.title);
    out(dense ? topic.dense : topic.full);
    return { exitCode: 0, stdout: stdoutLines.join('\n'), stderr: '' };
  }

  if (cmd === 'component') {
    const rest = args.slice(1);
    const componentDirs = listComponentDirectories(repoRoot);

    if (rest.includes('--list')) {
      const grouped = new Map();
      for (const groupName of CANONICAL_CATEGORY_ORDER) {
        grouped.set(groupName, []);
      }

      const loadedDocs = await Promise.all(
        componentDirs.map(async (dirName) => ({
          dirName,
          doc: await loadComponentDoc(dirName, repoRoot),
        }))
      );

      for (const { dirName, doc } of loadedDocs) {
        const groupName = doc?.group ?? 'Other';
        if (!grouped.has(groupName)) {
          grouped.set(groupName, []);
        }
        grouped.get(groupName).push({
          name: dirName,
          displayName: doc?.displayName ?? dirName,
        });
      }

      const nonEmptyGroups = [...grouped.entries()].filter(([, items]) => items.length > 0);
      out(
        `Refractor Optical Glass UI Kit — ${componentDirs.length} Components across ${nonEmptyGroups.length} Categories`
      );
      out('');
      for (const [groupName, items] of nonEmptyGroups) {
        out(`${groupName} (${items.length}):`);
        for (const item of items) {
          out(`  - ${item.name} — ${item.displayName}`);
        }
        out('');
      }
      return { exitCode: 0, stdout: stdoutLines.join('\n').trimEnd(), stderr: '' };
    }

    const targetArg = rest.find((token) => !token.startsWith('--'));
    if (!targetArg) {
      err('Missing component name. Run `refractor component --list` to view all components.');
      return { exitCode: 1, stdout: '', stderr: stderrLines.join('\n') };
    }

    const exactMatch = componentDirs.find((name) => name.toLowerCase() === targetArg.toLowerCase());
    if (!exactMatch) {
      const suggestions = componentDirs
        .filter((name) => name.toLowerCase().includes(targetArg.toLowerCase()))
        .slice(0, 5);
      const hint =
        suggestions.length > 0
          ? ` Did you mean: ${suggestions.join(', ')}?`
          : ' Run `refractor component --list` to see all available components.';
      err(`Unknown component "${targetArg}".${hint}`);
      return { exitCode: 1, stdout: '', stderr: stderrLines.join('\n') };
    }

    const doc = await loadComponentDoc(exactMatch, repoRoot);
    if (!doc) {
      err(`Component documentation missing for "${exactMatch}".`);
      return { exitCode: 1, stdout: '', stderr: stderrLines.join('\n') };
    }

    const dense = rest.includes('--dense');
    const detailVal = getFlagValue(rest, '--detail');
    const mode = dense ? 'dense' : detailVal === 'full' ? 'full' : 'standard';
    out(formatComponentDoc(doc, mode));
    return { exitCode: 0, stdout: stdoutLines.join('\n'), stderr: '' };
  }

  if (cmd === 'theme') {
    const sub = args[1];
    const themes = listThemes(repoRoot);

    if (sub === 'list' || !sub) {
      out(`Refractor Official Optical Theme Presets (${themes.length}):`);
      for (const theme of themes) {
        out(`  - ${theme.id} (${theme.packageName}@${theme.version}): ${theme.description}`);
      }
      return { exitCode: 0, stdout: stdoutLines.join('\n'), stderr: '' };
    }

    if (sub === 'inspect') {
      const target = args[2];
      const match = target ? themes.find((t) => t.id === target.toLowerCase()) : null;
      if (!match) {
        err(
          `Unknown theme preset "${target ?? ''}". Available presets: ${themes.map((t) => t.id).join(', ')}.`
        );
        return { exitCode: 1, stdout: '', stderr: stderrLines.join('\n') };
      }
      const srcPath = path.join(repoRoot, 'packages', 'themes', match.id, 'src', 'index.ts');
      const source = fs.existsSync(srcPath) ? fs.readFileSync(srcPath, 'utf8') : '';
      out(`${match.packageName} (v${match.version})`);
      out(match.description);
      out('');
      out(source.trim());
      return { exitCode: 0, stdout: stdoutLines.join('\n'), stderr: '' };
    }

    err(`Unknown theme subcommand "${sub}". Use "theme list" or "theme inspect <preset>".`);
    return { exitCode: 1, stdout: '', stderr: stderrLines.join('\n') };
  }

  if (cmd === 'swizzle') {
    const rest = args.slice(1);
    const outFlagVal = getFlagValue(rest, '--out');
    const componentName = rest.find((token, i) => {
      if (token.startsWith('--')) return false;
      if (i > 0 && rest[i - 1] === '--out') return false;
      return true;
    });

    if (!componentName) {
      err('Usage: refractor swizzle <ComponentName> --out <dir>');
      return { exitCode: 1, stdout: '', stderr: stderrLines.join('\n') };
    }

    if (!VALID_COMPONENT_NAME_RE.test(componentName)) {
      err(
        `Invalid component name "${componentName}". Component names must be PascalCase identifiers with zero path separators or traversal characters.`
      );
      return { exitCode: 1, stdout: '', stderr: stderrLines.join('\n') };
    }

    const allowedComponents = new Set(listComponentDirectories(repoRoot));
    if (!allowedComponents.has(componentName)) {
      err(`Component "${componentName}" not found in @refractor-ui/core.`);
      return { exitCode: 1, stdout: '', stderr: stderrLines.join('\n') };
    }

    const outCheck = validateSafeOutputDir(outFlagVal, cwd);
    if (!outCheck.ok) {
      err(outCheck.error);
      return { exitCode: 1, stdout: '', stderr: stderrLines.join('\n') };
    }

    const sourceDir = path.join(repoRoot, 'packages', 'core', 'src', componentName);
    const targetDir = path.join(outCheck.resolved, componentName);
    fs.mkdirSync(targetDir, { recursive: true });

    const filesToCopy = [`${componentName}.tsx`, 'index.ts'];
    const writtenFiles = [];
    for (const fileName of filesToCopy) {
      const srcFile = path.join(sourceDir, fileName);
      if (!fs.existsSync(srcFile)) continue;
      const raw = fs.readFileSync(srcFile, 'utf8');
      const rewritten = rewriteSwizzledImports(raw);
      const destFile = path.join(targetDir, fileName);
      fs.writeFileSync(destFile, rewritten, 'utf8');
      writtenFiles.push(destFile);
    }

    out(`Swizzled ${componentName} -> ${targetDir}`);
    for (const file of writtenFiles) {
      out(`  - ${file}`);
    }
    return { exitCode: 0, stdout: stdoutLines.join('\n'), stderr: '' };
  }

  if (cmd === 'check') {
    const strict = args.includes('--strict');
    const checkScript = path.join(repoRoot, 'scripts', 'check-repo.mjs');
    if (!fs.existsSync(checkScript)) {
      err(`Missing repository check script at ${checkScript}`);
      return { exitCode: 1, stdout: '', stderr: stderrLines.join('\n') };
    }
    const result = spawnSync(process.execPath, [checkScript], {
      cwd: repoRoot,
      encoding: 'utf8',
      env: {
        ...process.env,
        ...(strict ? { REFRACTOR_STRICT_LINT: '1' } : {}),
      },
    });
    const outText = (result.stdout ?? '').trim();
    const errText = (result.stderr ?? '').trim();
    if (outText) out(outText);
    if (result.status !== 0) {
      err(errText || 'Repository check failed.');
      return { exitCode: result.status ?? 1, stdout: stdoutLines.join('\n'), stderr: stderrLines.join('\n') };
    }
    out(strict ? '[refractor check] Strict verification passed.' : '[refractor check] Passed.');
    return { exitCode: 0, stdout: stdoutLines.join('\n'), stderr: '' };
  }

  err(`Unknown command "${cmd}". Run \`refractor help\` for available commands.`);
  return { exitCode: 1, stdout: '', stderr: stderrLines.join('\n') };
}
