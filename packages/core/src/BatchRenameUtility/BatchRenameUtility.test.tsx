import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import {
  BatchRenameUtility as BarrelBatchRenameUtility,
  type BatchRenameCaseModeMap,
  type BatchRenamePatternPresetMap,
} from './index';
import { BatchRenameUtility, type BatchRenamePreviewRow } from './BatchRenameUtility';

describe('BatchRenameUtility', () => {
  it('renders default 5 files, responsive overflow-x-auto table wrapper, ref, theme override, and barrel exports', () => {
    const ref = createRef<HTMLDivElement>();
    const caseMapCheck: BatchRenameCaseModeMap = {
      preserve: true,
      lower: true,
      upper: true,
      title: true,
      kebab: true,
      snake: true,
    };
    const presetMapCheck: BatchRenamePatternPresetMap = {
      none: true,
      'strip-spaces': true,
      'remove-brackets': true,
      'digits-only-prefix': true,
    };
    expect(BarrelBatchRenameUtility).toBe(BatchRenameUtility);
    expect(caseMapCheck.snake).toBe(true);
    expect(presetMapCheck['digits-only-prefix']).toBe(true);

    render(
      <PrismThemeProvider
        theme={{
          components: {
            BatchRenameUtility: {
              className: 'theme-batch-rename',
              style: { letterSpacing: '0.25px' },
            },
          },
        }}
      >
        <BatchRenameUtility
          ref={ref}
          className="local-batch-rename"
          xstyle={{ '--prism-slab-blur-px': '20px' }}
          style={{ marginTop: '10px' }}
          data-testid="batch-rename-root"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('batch-rename-root');
    expect(ref.current).toBe(root);
    expect(BatchRenameUtility.displayName).toBe('BatchRenameUtility');
    expect(root).toHaveAttribute('role', 'region');
    expect(root).toHaveAttribute('aria-labelledby');
    expect(root).toHaveClass(
      'refractor-batch-rename-utility',
      'prism-slab',
      'theme-batch-rename',
      'local-batch-rename'
    );
    expect(root).toHaveStyle({ letterSpacing: '0.25px', marginTop: '10px' });
    expect(root.style.getPropertyValue('--prism-slab-blur-px')).toBe('20px');

    expect(screen.getByRole('heading', { name: 'Batch Rename Utility' })).toBeInTheDocument();
    expect(screen.getByTestId('batch-rename-file-count')).toHaveTextContent('5 files');

    // Table with <thead> and <tbody> wrapped DIRECTLY inside <div className="overflow-x-auto">
    const table = screen.getByRole('table', { name: 'Batch rename before and after preview' });
    expect(table.parentElement).not.toBeNull();
    expect(table.parentElement?.tagName).toBe('DIV');
    expect(table.parentElement).toHaveClass('overflow-x-auto');
    expect(table.querySelector('thead')).not.toBeNull();
    expect(table.querySelector('tbody')).not.toBeNull();

    const headers = within(table)
      .getAllByRole('columnheader')
      .map((th) => th.textContent);
    expect(headers).toEqual(['#', 'Before', 'After', 'Status']);

    for (let i = 0; i < 5; i += 1) {
      const row = screen.getByTestId(`batch-rename-row-${i}`);
      expect(row).toHaveAttribute('data-status', 'unchanged');
      expect(row).toHaveTextContent('Unchanged');
    }

    expect(screen.getByTestId('batch-rename-summary')).toHaveTextContent(
      '0 modified · 0 conflicts'
    );
    expect(screen.getByRole('button', { name: 'Apply Rename' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Reset Rules' })).toBeEnabled();
    expect(screen.getByTestId('batch-rename-status')).toHaveAttribute('aria-live', 'polite');
  });

  it('supports custom aria-label, blank title fallback, and singular file count + confirmation', () => {
    const onApplyRename = vi.fn();
    render(
      <BatchRenameUtility
        title="   "
        aria-label="Custom Rename Workbench"
        files={['single-asset.png']}
        onApplyRename={onApplyRename}
        data-testid="singular-root"
      />
    );

    const root = screen.getByTestId('singular-root');
    expect(root).toHaveAttribute('aria-label', 'Custom Rename Workbench');
    expect(root).not.toHaveAttribute('aria-labelledby');
    expect(screen.getByRole('heading', { name: 'Batch Rename Utility' })).toBeInTheDocument();
    expect(screen.getByTestId('batch-rename-file-count')).toHaveTextContent('1 file');

    fireEvent.change(screen.getByLabelText('Find'), { target: { value: 'single' } });
    fireEvent.change(screen.getByLabelText('Replace'), { target: { value: 'hero' } });

    const applyBtn = screen.getByRole('button', { name: 'Apply Rename' });
    expect(applyBtn).toBeEnabled();
    fireEvent.click(applyBtn);

    expect(onApplyRename).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('batch-rename-status')).toHaveTextContent(
      'Applied batch rename to 1 file.'
    );
  });

  it('performs linear-time literal Find & Replace in case-insensitive and Match Case modes and invokes onApplyRename', () => {
    const onApplyRename = vi.fn();
    render(
      <BatchRenameUtility
        files={['raw_Hero_RAW.png', 'Studio_RAW.png', 'clean.png']}
        onApplyRename={onApplyRename}
      />
    );

    const findInput = screen.getByLabelText('Find');
    const replaceInput = screen.getByLabelText('Replace');
    const matchCaseCheckbox = screen.getByLabelText('Match Case');

    // Case-insensitive by default (matches start, middle, and end occurrences)
    fireEvent.change(findInput, { target: { value: 'raw' } });
    fireEvent.change(replaceInput, { target: { value: 'MASTER' } });

    expect(screen.getByTestId('batch-rename-after-0')).toHaveTextContent('MASTER_Hero_MASTER.png');
    expect(screen.getByTestId('batch-rename-after-1')).toHaveTextContent('Studio_MASTER.png');
    expect(screen.getByTestId('batch-rename-after-2')).toHaveTextContent('clean.png');
    expect(screen.getByTestId('batch-rename-row-0')).toHaveAttribute('data-status', 'renamed');
    expect(screen.getByTestId('batch-rename-row-2')).toHaveAttribute('data-status', 'unchanged');
    expect(screen.getByTestId('batch-rename-summary')).toHaveTextContent(
      '2 modified · 0 conflicts'
    );

    // Enable Match Case -> lowercase 'raw' only matches first token in row 0
    fireEvent.click(matchCaseCheckbox);
    expect(screen.getByTestId('batch-rename-after-0')).toHaveTextContent('MASTER_Hero_RAW.png');
    expect(screen.getByTestId('batch-rename-after-1')).toHaveTextContent('Studio_RAW.png');
    expect(screen.getByTestId('batch-rename-summary')).toHaveTextContent(
      '1 modified · 0 conflicts'
    );

    // Switch back to case-insensitive and apply rename
    fireEvent.click(matchCaseCheckbox);
    fireEvent.click(screen.getByRole('button', { name: 'Apply Rename' }));

    expect(onApplyRename).toHaveBeenCalledTimes(1);
    const payload = onApplyRename.mock.calls[0]?.[0] as ReadonlyArray<BatchRenamePreviewRow>;
    expect(payload).toEqual([
      {
        id: 'rename-row-0',
        before: 'raw_Hero_RAW.png',
        after: 'MASTER_Hero_MASTER.png',
        changed: true,
        conflict: false,
        invalid: false,
      },
      {
        id: 'rename-row-1',
        before: 'Studio_RAW.png',
        after: 'Studio_MASTER.png',
        changed: true,
        conflict: false,
        invalid: false,
      },
      {
        id: 'rename-row-2',
        before: 'clean.png',
        after: 'clean.png',
        changed: false,
        conflict: false,
        invalid: false,
      },
    ]);
    expect(screen.getByTestId('batch-rename-status')).toHaveTextContent(
      'Applied batch rename to 2 files.'
    );
  });

  it('applies all 4 curated deterministic Pattern Presets cleanly', () => {
    render(
      <BatchRenameUtility
        files={[
          '  001 [RAW [v1]] Studio  Hero  Shot.png',
          '002 [FINAL] Deck ] Note.pdf',
          'readme\tnotes.md',
        ]}
      />
    );

    const presetSelect = screen.getByLabelText('Pattern preset');

    // 1. strip-spaces (normalizes spaces and tabs into single hyphens)
    fireEvent.change(presetSelect, { target: { value: 'strip-spaces' } });
    expect(screen.getByTestId('batch-rename-after-0')).toHaveTextContent(
      '001-[RAW-[v1]]-Studio-Hero-Shot.png'
    );
    expect(screen.getByTestId('batch-rename-after-2')).toHaveTextContent('readme-notes.md');
    expect(screen.getByTestId('batch-rename-row-2')).toHaveAttribute('data-status', 'renamed');

    // 2. remove-brackets (handles nested brackets + stray closing bracket)
    fireEvent.change(presetSelect, { target: { value: 'remove-brackets' } });
    expect(screen.getByTestId('batch-rename-after-0')).toHaveTextContent('001 Studio Hero Shot.png');
    expect(screen.getByTestId('batch-rename-after-1')).toHaveTextContent('002 Deck ] Note.pdf');
    expect(screen.getByTestId('batch-rename-after-2')).toHaveTextContent('readme notes.md');

    // 3. digits-only-prefix (extracts leading numeric tag, preserves non-numeric filenames)
    fireEvent.change(presetSelect, { target: { value: 'digits-only-prefix' } });
    expect(screen.getByTestId('batch-rename-after-0')).toHaveTextContent('001.png');
    expect(screen.getByTestId('batch-rename-after-1')).toHaveTextContent('002.pdf');
    expect(screen.getByTestId('batch-rename-after-2')).toHaveTextContent('readme notes.md');

    // 4. none (restores original)
    fireEvent.change(presetSelect, { target: { value: 'none' } });
    expect(screen.getByTestId('batch-rename-after-0')).toHaveTextContent(
      '001 [RAW [v1]] Studio Hero Shot.png'
    );
    expect(screen.getByTestId('batch-rename-row-0')).toHaveAttribute('data-status', 'unchanged');
    // Control char '\t' in row 2 is flagged invalid when left unsanitized
    expect(screen.getByTestId('batch-rename-row-2')).toHaveAttribute('data-status', 'invalid');
  });

  it('applies all 6 Case Formatting modes including camelCase, acronyms, trailing uppercase, and digits', () => {
    render(
      <BatchRenameUtility
        files={['myCamelCase_v2Name.tsx', 'HTMLParser Spec [RAW].md', 'SpecAPI.json']}
      />
    );

    const caseSelect = screen.getByLabelText('Case formatting');

    // lower
    fireEvent.change(caseSelect, { target: { value: 'lower' } });
    expect(screen.getByTestId('batch-rename-after-0')).toHaveTextContent('mycamelcase_v2name.tsx');
    expect(screen.getByTestId('batch-rename-after-1')).toHaveTextContent('htmlparser spec [raw].md');

    // upper
    fireEvent.change(caseSelect, { target: { value: 'upper' } });
    expect(screen.getByTestId('batch-rename-after-0')).toHaveTextContent('MYCAMELCASE_V2NAME.tsx');
    expect(screen.getByTestId('batch-rename-after-1')).toHaveTextContent('HTMLPARSER SPEC [RAW].md');

    // title
    fireEvent.change(caseSelect, { target: { value: 'title' } });
    expect(screen.getByTestId('batch-rename-after-0')).toHaveTextContent('Mycamelcase_V2name.tsx');
    expect(screen.getByTestId('batch-rename-after-1')).toHaveTextContent('Htmlparser Spec [Raw].md');

    // kebab
    fireEvent.change(caseSelect, { target: { value: 'kebab' } });
    expect(screen.getByTestId('batch-rename-after-0')).toHaveTextContent('my-camel-case-v2-name.tsx');
    expect(screen.getByTestId('batch-rename-after-1')).toHaveTextContent('html-parser-spec-raw.md');
    expect(screen.getByTestId('batch-rename-after-2')).toHaveTextContent('spec-api.json');

    // snake
    fireEvent.change(caseSelect, { target: { value: 'snake' } });
    expect(screen.getByTestId('batch-rename-after-0')).toHaveTextContent('my_camel_case_v2_name.tsx');
    expect(screen.getByTestId('batch-rename-after-1')).toHaveTextContent('html_parser_spec_raw.md');
    expect(screen.getByTestId('batch-rename-after-2')).toHaveTextContent('spec_api.json');

    // preserve
    fireEvent.change(caseSelect, { target: { value: 'preserve' } });
    expect(screen.getByTestId('batch-rename-after-0')).toHaveTextContent('myCamelCase_v2Name.tsx');
    expect(screen.getByTestId('batch-rename-row-0')).toHaveAttribute('data-status', 'unchanged');
  });

  it('supports sequential numbering with prefix, suffix, sanitized start index, sanitized zero pad (1..5), and empty stem', () => {
    render(<BatchRenameUtility files={['alpha.png', 'beta.png']} />);

    const enableNumbering = screen.getByLabelText('Enable Numbering');
    const prefixInput = screen.getByLabelText('Prefix');
    const suffixInput = screen.getByLabelText('Suffix');
    const startIndexInput = screen.getByLabelText('Start Index');
    const zeroPadInput = screen.getByLabelText('Zero Pad');

    // Start Index & Zero Pad disabled until Enable Numbering is checked
    expect(startIndexInput).toBeDisabled();
    expect(zeroPadInput).toBeDisabled();

    fireEvent.click(enableNumbering);
    expect(startIndexInput).toBeEnabled();
    expect(zeroPadInput).toBeEnabled();

    fireEvent.change(prefixInput, { target: { value: 'shot_' } });
    fireEvent.change(suffixInput, { target: { value: '_web' } });
    fireEvent.change(startIndexInput, { target: { value: '10' } });
    fireEvent.change(zeroPadInput, { target: { value: '3' } });

    expect(screen.getByTestId('batch-rename-after-0')).toHaveTextContent('shot_alpha-010_web.png');
    expect(screen.getByTestId('batch-rename-after-1')).toHaveTextContent('shot_beta-011_web.png');

    // Sanitize negative start index -> 0 and excessive zero pad -> 5
    fireEvent.change(startIndexInput, { target: { value: '-8' } });
    fireEvent.change(zeroPadInput, { target: { value: '99' } });
    expect(screen.getByTestId('batch-rename-after-0')).toHaveTextContent('shot_alpha-00000_web.png');
    expect(screen.getByTestId('batch-rename-after-1')).toHaveTextContent('shot_beta-00001_web.png');

    // Sanitize NaN start index -> fallback 1 and zero pad 0 -> min 1
    fireEvent.change(startIndexInput, { target: { value: '' } });
    fireEvent.change(zeroPadInput, { target: { value: '0' } });
    expect(screen.getByTestId('batch-rename-after-0')).toHaveTextContent('shot_alpha-1_web.png');
    expect(screen.getByTestId('batch-rename-after-1')).toHaveTextContent('shot_beta-2_web.png');

    // Empty stem with numbering still yields valid numbered filename (no leading hyphen)
    fireEvent.change(screen.getByLabelText('Find'), { target: { value: 'alpha' } });
    fireEvent.change(screen.getByLabelText('Replace'), { target: { value: '' } });
    expect(screen.getByTestId('batch-rename-after-0')).toHaveTextContent('shot_1_web.png');
    expect(screen.getByTestId('batch-rename-row-0')).toHaveAttribute('data-status', 'renamed');
  });

  it('toggles Preserve Extension cleanly including dotfiles, extensionless, and trailing-dot filenames', () => {
    render(
      <BatchRenameUtility files={['hero.png', '.gitignore', 'Makefile', 'draft.']} />
    );

    const caseSelect = screen.getByLabelText('Case formatting');
    const preserveExtCheckbox = screen.getByLabelText('Preserve Extension');

    expect(preserveExtCheckbox).toBeChecked();
    fireEvent.change(caseSelect, { target: { value: 'upper' } });

    expect(screen.getByTestId('batch-rename-after-0')).toHaveTextContent('HERO.png');
    expect(screen.getByTestId('batch-rename-after-1')).toHaveTextContent('.GITIGNORE');
    expect(screen.getByTestId('batch-rename-after-2')).toHaveTextContent('MAKEFILE');
    expect(screen.getByTestId('batch-rename-after-3')).toHaveTextContent('DRAFT.');

    // Uncheck Preserve Extension -> extension also uppercased
    fireEvent.click(preserveExtCheckbox);
    expect(preserveExtCheckbox).not.toBeChecked();
    expect(screen.getByTestId('batch-rename-after-0')).toHaveTextContent('HERO.PNG');
  });

  it('detects duplicate target filename collisions, blocks Apply Rename, and unblocks when numbering resolves them', () => {
    const onApplyRename = vi.fn();
    render(<BatchRenameUtility files={['alpha.png', 'beta.png']} onApplyRename={onApplyRename} />);

    fireEvent.change(screen.getByLabelText('Find'), { target: { value: 'alpha' } });
    fireEvent.change(screen.getByLabelText('Replace'), { target: { value: 'beta' } });

    expect(screen.getByTestId('batch-rename-row-0')).toHaveAttribute('data-status', 'duplicate');
    expect(screen.getByTestId('batch-rename-row-1')).toHaveAttribute('data-status', 'duplicate');
    expect(screen.getByTestId('batch-rename-row-0')).toHaveTextContent('Duplicate');
    expect(screen.getByTestId('batch-rename-summary')).toHaveTextContent(
      '1 modified · 2 conflicts'
    );

    const applyBtn = screen.getByRole('button', { name: 'Apply Rename' });
    expect(applyBtn).toBeDisabled();
    fireEvent.click(applyBtn);
    expect(onApplyRename).not.toHaveBeenCalled();

    // Enabling sequential numbering resolves the duplicate targets
    fireEvent.click(screen.getByLabelText('Enable Numbering'));
    expect(screen.getByTestId('batch-rename-after-0')).toHaveTextContent('beta-01.png');
    expect(screen.getByTestId('batch-rename-after-1')).toHaveTextContent('beta-02.png');
    expect(screen.getByTestId('batch-rename-summary')).toHaveTextContent(
      '2 modified · 0 conflicts'
    );
    expect(applyBtn).toBeEnabled();
  });

  it('blocks Apply Rename for empty targets, wiped stems, path traversal (/, \\, ..), and control chars', () => {
    const onApplyRename = vi.fn();
    render(<BatchRenameUtility files={['report.txt', 'notes.txt']} onApplyRename={onApplyRename} />);

    const findInput = screen.getByLabelText('Find');
    const replaceInput = screen.getByLabelText('Replace');
    const applyBtn = screen.getByRole('button', { name: 'Apply Rename' });

    // 1. Stem wiped while Preserve Extension is on -> invalid
    fireEvent.change(findInput, { target: { value: 'report' } });
    fireEvent.change(replaceInput, { target: { value: '' } });
    expect(screen.getByTestId('batch-rename-row-0')).toHaveAttribute('data-status', 'invalid');
    expect(screen.getByTestId('batch-rename-row-0')).toHaveTextContent('Invalid');
    expect(screen.getByTestId('batch-rename-summary')).toHaveTextContent(
      '1 modified · 0 conflicts · 1 invalid'
    );
    expect(applyBtn).toBeDisabled();

    // 2. Full empty target when Preserve Extension is off -> renders '(empty)' and invalid
    fireEvent.click(screen.getByLabelText('Preserve Extension'));
    fireEvent.change(findInput, { target: { value: 'report.txt' } });
    fireEvent.change(replaceInput, { target: { value: '' } });
    expect(screen.getByTestId('batch-rename-after-0')).toHaveTextContent('(empty)');
    expect(screen.getByTestId('batch-rename-row-0')).toHaveAttribute('data-status', 'invalid');
    expect(applyBtn).toBeDisabled();

    // 3. Path traversal '../'
    fireEvent.change(replaceInput, { target: { value: '../etc/passwd' } });
    expect(screen.getByTestId('batch-rename-row-0')).toHaveAttribute('data-status', 'invalid');
    expect(applyBtn).toBeDisabled();

    // 4. Forward slash '/'
    fireEvent.change(replaceInput, { target: { value: 'subdir/report.txt' } });
    expect(screen.getByTestId('batch-rename-row-0')).toHaveAttribute('data-status', 'invalid');
    expect(applyBtn).toBeDisabled();

    // 5. Backslash '\\'
    fireEvent.change(replaceInput, { target: { value: 'subdir\\report.txt' } });
    expect(screen.getByTestId('batch-rename-row-0')).toHaveAttribute('data-status', 'invalid');
    expect(applyBtn).toBeDisabled();

    // 6. Double dot '..' without slash
    fireEvent.change(replaceInput, { target: { value: 'bad..name.txt' } });
    expect(screen.getByTestId('batch-rename-row-0')).toHaveAttribute('data-status', 'invalid');
    expect(applyBtn).toBeDisabled();

    // 7. Single dot '.'
    fireEvent.change(replaceInput, { target: { value: '.' } });
    expect(screen.getByTestId('batch-rename-row-0')).toHaveAttribute('data-status', 'invalid');
    expect(applyBtn).toBeDisabled();

    // 8. Control character '\u0007'
    fireEvent.change(replaceInput, { target: { value: 'bad\u0007name.txt' } });
    expect(screen.getByTestId('batch-rename-row-0')).toHaveAttribute('data-status', 'invalid');
    expect(applyBtn).toBeDisabled();
    expect(onApplyRename).not.toHaveBeenCalled();
  });

  it('stays immune to ReDoS metacharacters (< 50ms), __proto__ filenames, and XSS script payloads', () => {
    const longReDosFile = `${'a'.repeat(5000)}!.txt`;
    const literalMetaFile = 'file_((((a+)+)+$.txt';
    const xssFile = '<script>alert(1)</script>.txt';

    const { container } = render(
      <BatchRenameUtility
        files={['__proto__', 'constructor', 'prototype', longReDosFile, literalMetaFile, xssFile]}
      />
    );

    // Zero script injection in DOM
    expect(container.querySelector('script')).toBeNull();
    expect(screen.getByTestId('batch-rename-row-5')).toHaveTextContent(xssFile);

    // Object.prototype remains unpolluted
    expect(Object.prototype).not.toHaveProperty('__proto__.txt');
    expect(screen.getByTestId('batch-rename-row-0')).toHaveAttribute('data-status', 'unchanged');

    // ReDoS metacharacter Find input completes in linear time well under 50ms
    const findInput = screen.getByLabelText('Find');
    const replaceInput = screen.getByLabelText('Replace');

    const start = performance.now();
    fireEvent.change(findInput, { target: { value: '((((a+)+)+$' } });
    fireEvent.change(replaceInput, { target: { value: 'safe' } });
    const elapsedMs = performance.now() - start;

    expect(elapsedMs).toBeLessThan(50);
    expect(screen.getByTestId('batch-rename-after-4')).toHaveTextContent('file_safe.txt');
    expect(screen.getByTestId('batch-rename-after-3')).toHaveTextContent(longReDosFile);

    // Duplicate collision specifically on '__proto__' via ES Map (never prototype pollution)
    fireEvent.change(findInput, { target: { value: 'constructor' } });
    fireEvent.change(replaceInput, { target: { value: '__proto__' } });
    expect(screen.getByTestId('batch-rename-row-0')).toHaveAttribute('data-status', 'duplicate');
    expect(screen.getByTestId('batch-rename-row-1')).toHaveAttribute('data-status', 'duplicate');
    expect(screen.getByRole('button', { name: 'Apply Rename' })).toBeDisabled();
  });

  it('handles empty files={[]} gracefully with empty table state and disabled Apply Rename', () => {
    render(<BatchRenameUtility files={[]} />);

    expect(screen.getByTestId('batch-rename-file-count')).toHaveTextContent('0 files');
    expect(screen.getByTestId('batch-rename-empty')).toHaveTextContent(
      'No files queued for batch rename.'
    );
    expect(screen.getByTestId('batch-rename-summary')).toHaveTextContent(
      '0 modified · 0 conflicts'
    );
    expect(screen.getByRole('button', { name: 'Apply Rename' })).toBeDisabled();
  });

  it('resets all rules via Reset Rules and guards Enter keydown during IME composition', () => {
    render(<BatchRenameUtility />);

    const findInput = screen.getByLabelText('Find');
    const replaceInput = screen.getByLabelText('Replace');
    const matchCase = screen.getByLabelText('Match Case');
    const presetSelect = screen.getByLabelText('Pattern preset');
    const caseSelect = screen.getByLabelText('Case formatting');
    const enableNumbering = screen.getByLabelText('Enable Numbering');
    const preserveExt = screen.getByLabelText('Preserve Extension');
    const prefixInput = screen.getByLabelText('Prefix');
    const suffixInput = screen.getByLabelText('Suffix');
    const startIndexInput = screen.getByLabelText('Start Index');
    const zeroPadInput = screen.getByLabelText('Zero Pad');

    // IME composition Enter must NOT be prevented
    const composingEnter = new KeyboardEvent('keydown', {
      key: 'Enter',
      bubbles: true,
      cancelable: true,
    });
    Object.defineProperty(composingEnter, 'isComposing', { value: true });
    findInput.dispatchEvent(composingEnter);
    expect(composingEnter.defaultPrevented).toBe(false);

    // Non-composing Enter IS prevented
    const plainEnter = new KeyboardEvent('keydown', {
      key: 'Enter',
      bubbles: true,
      cancelable: true,
    });
    findInput.dispatchEvent(plainEnter);
    expect(plainEnter.defaultPrevented).toBe(true);

    // Other keys are not prevented
    const otherKey = new KeyboardEvent('keydown', {
      key: 'a',
      bubbles: true,
      cancelable: true,
    });
    findInput.dispatchEvent(otherKey);
    expect(otherKey.defaultPrevented).toBe(false);

    // Modify every rule
    fireEvent.change(findInput, { target: { value: 'RAW' } });
    fireEvent.change(replaceInput, { target: { value: 'FINAL' } });
    fireEvent.click(matchCase);
    fireEvent.change(presetSelect, { target: { value: 'remove-brackets' } });
    fireEvent.change(caseSelect, { target: { value: 'kebab' } });
    fireEvent.click(enableNumbering);
    fireEvent.click(preserveExt);
    fireEvent.change(prefixInput, { target: { value: 'pre_' } });
    fireEvent.change(suffixInput, { target: { value: '_suf' } });
    fireEvent.change(startIndexInput, { target: { value: '5' } });
    fireEvent.change(zeroPadInput, { target: { value: '4' } });

    // Click Reset Rules
    fireEvent.click(screen.getByRole('button', { name: 'Reset Rules' }));

    expect(findInput).toHaveValue('');
    expect(replaceInput).toHaveValue('');
    expect(matchCase).not.toBeChecked();
    expect(presetSelect).toHaveValue('none');
    expect(caseSelect).toHaveValue('preserve');
    expect(enableNumbering).not.toBeChecked();
    expect(preserveExt).toBeChecked();
    expect(prefixInput).toHaveValue('');
    expect(suffixInput).toHaveValue('');
    expect(startIndexInput).toHaveValue(1);
    expect(zeroPadInput).toHaveValue(2);
    expect(screen.getByTestId('batch-rename-status')).toHaveTextContent(
      'Rename rules reset to defaults.'
    );
    expect(screen.getByTestId('batch-rename-summary')).toHaveTextContent(
      '0 modified · 0 conflicts'
    );
  });

  it('disables all controls and ignores synthetic change events when disabled={true}', () => {
    const onApplyRename = vi.fn();
    render(
      <BatchRenameUtility
        disabled
        onApplyRename={onApplyRename}
        data-testid="disabled-batch-rename"
      />
    );

    const root = screen.getByTestId('disabled-batch-rename');
    expect(root).toHaveAttribute('data-disabled', 'true');

    const findInput = screen.getByLabelText('Find');
    const replaceInput = screen.getByLabelText('Replace');
    const matchCase = screen.getByLabelText('Match Case');
    const presetSelect = screen.getByLabelText('Pattern preset');
    const caseSelect = screen.getByLabelText('Case formatting');
    const enableNumbering = screen.getByLabelText('Enable Numbering');
    const preserveExt = screen.getByLabelText('Preserve Extension');
    const prefixInput = screen.getByLabelText('Prefix');
    const suffixInput = screen.getByLabelText('Suffix');
    const startIndexInput = screen.getByLabelText('Start Index');
    const zeroPadInput = screen.getByLabelText('Zero Pad');
    const resetBtn = screen.getByRole('button', { name: 'Reset Rules' });
    const applyBtn = screen.getByRole('button', { name: 'Apply Rename' });

    for (const control of [
      findInput,
      replaceInput,
      matchCase,
      presetSelect,
      caseSelect,
      enableNumbering,
      preserveExt,
      prefixInput,
      suffixInput,
      startIndexInput,
      zeroPadInput,
      resetBtn,
      applyBtn,
    ]) {
      expect(control).toBeDisabled();
    }

    // Synthetic change/click events must remain inert while disabled
    fireEvent.change(findInput, { target: { value: 'RAW' } });
    fireEvent.change(replaceInput, { target: { value: 'NEW' } });
    fireEvent.click(matchCase);
    fireEvent.change(presetSelect, { target: { value: 'strip-spaces' } });
    fireEvent.change(caseSelect, { target: { value: 'kebab' } });
    fireEvent.click(enableNumbering);
    fireEvent.click(preserveExt);
    fireEvent.change(prefixInput, { target: { value: 'p_' } });
    fireEvent.change(suffixInput, { target: { value: '_s' } });
    fireEvent.change(startIndexInput, { target: { value: '9' } });
    fireEvent.change(zeroPadInput, { target: { value: '4' } });
    fireEvent.click(resetBtn);
    fireEvent.click(applyBtn);

    expect(findInput).toHaveValue('');
    expect(replaceInput).toHaveValue('');
    expect(matchCase).not.toBeChecked();
    expect(presetSelect).toHaveValue('none');
    expect(caseSelect).toHaveValue('preserve');
    expect(enableNumbering).not.toBeChecked();
    expect(preserveExt).toBeChecked();
    expect(prefixInput).toHaveValue('');
    expect(suffixInput).toHaveValue('');
    expect(startIndexInput).toHaveValue(1);
    expect(zeroPadInput).toHaveValue(2);
    expect(onApplyRename).not.toHaveBeenCalled();
  });
});
