import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  DEFAULT_REPO_ROOT,
  listComponentDirectories,
  rewriteSwizzledImports,
  runCli,
  validateSafeOutputDir,
} from './cli.mjs';

const tempDirs = [];

function createTempDir() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'refractor-cli-test-'));
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir && fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }
});

describe('@refractor-ui/cli', () => {
  it('prints usage help for empty args, help, and --help', async () => {
    for (const args of [[], ['help'], ['--help'], ['-h']]) {
      const res = await runCli(args);
      expect(res.exitCode).toBe(0);
      expect(res.stdout).toContain('Refractor Optical Glass UI Kit CLI');
      expect(res.stdout).toContain('refractor swizzle <Name> --out <dir>');
    }
  });

  it('serves docs topics in standard, dense, and list modes and rejects unknown topics', async () => {
    const listRes = await runCli(['docs', '--list']);
    expect(listRes.exitCode).toBe(0);
    expect(listRes.stdout).toContain('principles');
    expect(listRes.stdout).toContain('tokens');
    expect(listRes.stdout).toContain('theme');
    expect(listRes.stdout).toContain('architecture');

    const defaultRes = await runCli(['docs']);
    expect(defaultRes.exitCode).toBe(0);
    expect(defaultRes.stdout).toContain('Astryx Architectural Parity');

    const denseRes = await runCli(['docs', 'theme', '--dense']);
    expect(denseRes.exitCode).toBe(0);
    expect(denseRes.stdout).toContain('createPrismTheme');

    const fullRes = await runCli(['docs', 'tokens']);
    expect(fullRes.exitCode).toBe(0);
    expect(fullRes.stdout).toContain('--prism-caustic-opacity');

    const badRes = await runCli(['docs', 'nonexistent']);
    expect(badRes.exitCode).toBe(1);
    expect(badRes.stderr).toContain('Unknown docs topic');
  });

  it('lists all components grouped across canonical categories', async () => {
    const totalCount = listComponentDirectories(DEFAULT_REPO_ROOT).length;
    expect(totalCount).toBeGreaterThanOrEqual(179);
    const res = await runCli(['component', '--list']);
    expect(res.exitCode).toBe(0);
    expect(res.stdout).toContain(`${totalCount} Components across`);
    expect(res.stdout).toContain('Buttons & Actions (6):');
    expect(res.stdout).toContain('Layout & Workspace Controls (6):');
    expect(res.stdout).toContain('Advanced Data & Visualization (6):');
    expect(res.stdout).toContain('Advanced Search & Filtering (4):');
    expect(res.stdout).toContain('Rich Input & Content Creation (6):');
    expect(res.stdout).toContain('Interactive & Drag-and-Drop (3):');
    expect(res.stdout).toContain('Collaboration & Guidance (4):');
    expect(res.stdout).toContain('AI & Conversational Interfaces (6):');
    expect(res.stdout).toContain('Media, Audio & Spatial Controls (6):');
    expect(res.stdout).toContain('Security, Auth & Account Management (5):');
    expect(res.stdout).toContain('Commerce, Billing & Conversion (5):');
    expect(res.stdout).toContain('Mobile, Touch & System Utilities (5):');
    expect(res.stdout).toContain('CLI & Terminal Surfaces (7):');
    expect(res.stdout).toContain('AI Agent Execution & Control (7):');
    expect(res.stdout).toContain('AI Context, Memory & Configuration (6):');
    expect(res.stdout).toContain('Multi-Agent & Orchestration (4):');
    expect(res.stdout).toContain('Date, Time & Scheduling Fields (6):');
    expect(res.stdout).toContain('Number, Currency & Formatted Type Fields (6):');
    expect(res.stdout).toContain('Complex Button & Action Variations (5):');
    expect(res.stdout).toContain('Complex Variations of Common Controls (7):');
    expect(res.stdout).toContain('Core & Trend Charts (5):');
    expect(res.stdout).toContain('Part-to-Whole & Hierarchical Visuals (5):');
    expect(res.stdout).toContain('Statistical & Distribution Visuals (5):');
    expect(res.stdout).toContain('Relational & Flow Visuals (3):');
    expect(res.stdout).toContain('KPI, Progress & Telemetry Visuals (4):');
    expect(res.stdout).toContain('Geospatial & Map Visuals (3):');
    expect(res.stdout).toContain('Chart Chrome & Interactive Controls (4):');
    expect(res.stdout).toContain('PrimaryButton');
    expect(res.stdout).toContain('ProductTour');
    expect(res.stdout).toContain('ChatMessageStream');
    expect(res.stdout).toContain('ParallelComparisonView');
    expect(res.stdout).toContain('DateRangePicker');
    expect(res.stdout).toContain('SankeyDiagram');
    expect(res.stdout).toContain('ChartThresholdMarker');
  }, 15_000);

  it('inspects individual components in standard, dense, and full modes and handles unknown components', async () => {
    const standard = await runCli(['component', 'PrimaryButton']);
    expect(standard.exitCode).toBe(0);
    expect(standard.stdout).toContain("import { PrimaryButton } from '@refractor-ui/core/PrimaryButton';");
    expect(standard.stdout).toContain('Example:');

    const dense = await runCli(['component', 'primarybutton', '--dense']);
    expect(dense.exitCode).toBe(0);
    expect(dense.stdout).toContain('Props (');
    expect(dense.stdout).not.toContain('Best Practices:');

    const full = await runCli(['component', 'TransferList', '--detail', 'full']);
    expect(full.exitCode).toBe(0);
    expect(full.stdout).toContain('Keywords:');
    expect(full.stdout).toContain('Best Practices:');
    expect(full.stdout).toContain('Accessibility:');

    const missingArg = await runCli(['component']);
    expect(missingArg.exitCode).toBe(1);
    expect(missingArg.stderr).toContain('Missing component name');

    const unknownWithSuggestion = await runCli(['component', 'Button']);
    expect(unknownWithSuggestion.exitCode).toBe(1);
    expect(unknownWithSuggestion.stderr).toContain('Did you mean:');

    const unknownTotal = await runCli(['component', 'ZzzQuantumFlux']);
    expect(unknownTotal.exitCode).toBe(1);
    expect(unknownTotal.stderr).toContain('Unknown component');
  });

  it('lists and inspects all 5 official optical theme presets and rejects invalid theme queries', async () => {
    const listRes = await runCli(['theme', 'list']);
    expect(listRes.exitCode).toBe(0);
    expect(listRes.stdout).toContain('Refractor Official Optical Theme Presets (5):');
    expect(listRes.stdout).toContain('alabaster');
    expect(listRes.stdout).toContain('obsidian');
    expect(listRes.stdout).toContain('amethyst');
    expect(listRes.stdout).toContain('emerald-tide');
    expect(listRes.stdout).toContain('solar-prism');

    const inspectRes = await runCli(['theme', 'inspect', 'amethyst']);
    expect(inspectRes.exitCode).toBe(0);
    expect(inspectRes.stdout).toContain('@refractor-ui/theme-amethyst');
    expect(inspectRes.stdout).toContain('defineTheme');

    const badInspect = await runCli(['theme', 'inspect', 'invalid-theme']);
    expect(badInspect.exitCode).toBe(1);
    expect(badInspect.stderr).toContain('Unknown theme preset');

    const badSub = await runCli(['theme', 'delete']);
    expect(badSub.exitCode).toBe(1);
    expect(badSub.stderr).toContain('Unknown theme subcommand');
  });

  it('swizzles a component cleanly and rewrites relative imports to @refractor-ui/core', async () => {
    const tmp = createTempDir();
    const res = await runCli(['swizzle', 'PrimaryButton', '--out', 'ejected'], {
      cwd: tmp,
      repoRoot: DEFAULT_REPO_ROOT,
    });
    expect(res.exitCode).toBe(0);
    expect(res.stdout).toContain('Swizzled PrimaryButton');

    const tsxPath = path.join(tmp, 'ejected', 'PrimaryButton', 'PrimaryButton.tsx');
    const indexPath = path.join(tmp, 'ejected', 'PrimaryButton', 'index.ts');
    expect(fs.existsSync(tsxPath)).toBe(true);
    expect(fs.existsSync(indexPath)).toBe(true);

    const tsxContent = fs.readFileSync(tsxPath, 'utf8');
    expect(tsxContent).toContain("from '@refractor-ui/core'");
    expect(tsxContent).not.toContain("from '../BaseProps'");
    expect(tsxContent).not.toContain("from '../utils/mergeProps'");

    const rewrittenSibling = rewriteSwizzledImports(
      "import { PrimaryButton } from '../PrimaryButton';\nimport { cx } from '../utils/mergeProps';"
    );
    expect(rewrittenSibling).toContain("from '@refractor-ui/core/PrimaryButton'");
    expect(rewrittenSibling).toContain("from '@refractor-ui/core'");
  });

  it('blocks adversarial path traversal, null bytes, missing args, and unknown names in swizzle', async () => {
    const tmp = createTempDir();

    const traversalName = await runCli(['swizzle', '../../etc/passwd', '--out', 'out'], { cwd: tmp });
    expect(traversalName.exitCode).toBe(1);
    expect(traversalName.stderr).toContain('Invalid component name');

    const traversalOut = await runCli(['swizzle', 'PrimaryButton', '--out', '../../escape'], {
      cwd: tmp,
    });
    expect(traversalOut.exitCode).toBe(1);
    expect(traversalOut.stderr).toContain('Rejected path traversal');

    const nullByteOut = validateSafeOutputDir('safe\0evil', tmp);
    expect(nullByteOut.ok).toBe(false);

    const missingOut = await runCli(['swizzle', 'PrimaryButton'], { cwd: tmp });
    expect(missingOut.exitCode).toBe(1);
    expect(missingOut.stderr).toContain('Missing required --out');

    const missingName = await runCli(['swizzle'], { cwd: tmp });
    expect(missingName.exitCode).toBe(1);
    expect(missingName.stderr).toContain('Usage:');

    const unknownComp = await runCli(['swizzle', 'NonExistentWidget', '--out', 'out'], { cwd: tmp });
    expect(unknownComp.exitCode).toBe(1);
    expect(unknownComp.stderr).toContain('not found');
  });

  it('runs check --strict and rejects unknown top-level commands', async () => {
    const checkRes = await runCli(['check', '--strict']);
    expect(checkRes.exitCode).toBe(0);
    expect(checkRes.stdout).toContain('[check:repo] PASSED');
    expect(checkRes.stdout).toContain('Strict verification passed');

    const checkMissing = await runCli(['check'], { repoRoot: createTempDir() });
    expect(checkMissing.exitCode).toBe(1);
    expect(checkMissing.stderr).toContain('Missing repository check script');

    const badCmd = await runCli(['unknown-subcommand']);
    expect(badCmd.exitCode).toBe(1);
    expect(badCmd.stderr).toContain('Unknown command');
  });
});
