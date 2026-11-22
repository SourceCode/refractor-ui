import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import {
  ArchiveInspector,
  isSafeArchiveEntryPath,
  type ArchiveFormatKind,
  type ArchiveFormatKindMap,
  type ArchiveVirtualEntry,
} from './index';

const MIXED_SECURITY_ENTRIES: ReadonlyArray<ArchiveVirtualEntry> = [
  {
    id: 'safe-folder',
    path: 'configs/',
    kind: 'folder',
    uncompressedBytes: 0,
    compressedBytes: 0,
    modifiedAt: '2026-11-20 10:00 UTC',
  },
  {
    id: 'safe-file',
    path: 'configs/optics.json',
    kind: 'file',
    uncompressedBytes: 2_048,
    compressedBytes: 512,
    modifiedAt: '2026-11-20 10:05 UTC',
    previewText: '{"refraction":"standard","blurPx":18}',
  },
  {
    id: 'unsafe-traversal',
    path: '../../etc/passwd',
    kind: 'file',
    uncompressedBytes: 1_024,
    compressedBytes: 512,
    modifiedAt: '2026-11-20 10:06 UTC',
    previewText: 'root:x:0:0:root:/root:/bin/sh',
  },
  {
    id: 'unsafe-abs-unix',
    path: '/abs/path/secret.key',
    kind: 'file',
    uncompressedBytes: 512,
    compressedBytes: 256,
    modifiedAt: '2026-11-20 10:07 UTC',
  },
  {
    id: 'unsafe-win-drive',
    path: 'C:\\win\\system.ini',
    kind: 'file',
    uncompressedBytes: 768,
    compressedBytes: 384,
    modifiedAt: '2026-11-20 10:08 UTC',
  },
  {
    id: 'unsafe-leading-backslash',
    path: '\\unc\\share\\payload.bin',
    kind: 'file',
    uncompressedBytes: 256,
    compressedBytes: 128,
    modifiedAt: '2026-11-20 10:09 UTC',
  },
  {
    id: 'unsafe-null-byte',
    path: 'shaders/evil\0.wgsl',
    kind: 'file',
    uncompressedBytes: 512,
    compressedBytes: 256,
    modifiedAt: '2026-11-20 10:10 UTC',
  },
];

describe('isSafeArchiveEntryPath', () => {
  it('accepts valid relative archive paths including filenames with internal dots or timestamps', () => {
    expect(isSafeArchiveEntryPath('manifest.json')).toBe(true);
    expect(isSafeArchiveEntryPath('shaders/')).toBe(true);
    expect(isSafeArchiveEntryPath('shaders/caustics.wgsl')).toBe(true);
    expect(isSafeArchiveEntryPath('docs/release..v2.md')).toBe(true);
    expect(isSafeArchiveEntryPath('logs/2026-11-22_14:30.log')).toBe(true);
  });

  it('rejects Zip-Slip traversal, leading slashes, Windows drive letters, null bytes, and blank paths', () => {
    expect(isSafeArchiveEntryPath('')).toBe(false);
    expect(isSafeArchiveEntryPath('   ')).toBe(false);
    expect(isSafeArchiveEntryPath('../../etc/passwd')).toBe(false);
    expect(isSafeArchiveEntryPath('assets/../secret.env')).toBe(false);
    expect(isSafeArchiveEntryPath('..\\..\\windows\\win.ini')).toBe(false);
    expect(isSafeArchiveEntryPath('..')).toBe(false);
    expect(isSafeArchiveEntryPath('dir/..')).toBe(false);
    expect(isSafeArchiveEntryPath('/abs/path')).toBe(false);
    expect(isSafeArchiveEntryPath('\\abs\\path')).toBe(false);
    expect(isSafeArchiveEntryPath('\\\\server\\share\\file.txt')).toBe(false);
    expect(isSafeArchiveEntryPath('C:\\win')).toBe(false);
    expect(isSafeArchiveEntryPath('c:/Users/admin/id_rsa')).toBe(false);
    expect(isSafeArchiveEntryPath('D:relative.txt')).toBe(false);
    expect(isSafeArchiveEntryPath('nested/C:/evil.txt')).toBe(false);
    expect(isSafeArchiveEntryPath('shaders/caustics\0.wgsl')).toBe(false);
  });
});

describe('ArchiveInspector', () => {
  it('satisfies Astryx contracts, forwards React 19 ref, applies theme overrides, renders default .zip archive, and wraps table directly in overflow-x-auto', () => {
    const ref = createRef<HTMLDivElement>();
    const formatMap: ArchiveFormatKindMap = {
      zip: true,
      tar: true,
      '7z': true,
    };
    expect(formatMap.zip && formatMap.tar && formatMap['7z']).toBe(true);

    const { rerender } = render(
      <PrismThemeProvider
        theme={{
          components: {
            ArchiveInspector: {
              className: 'theme-archive-override',
              style: { maxWidth: '880px' },
            },
          },
        }}
      >
        <ArchiveInspector
          ref={ref}
          className="local-archive-class"
          xstyle={{ '--prism-blur-px': '20px' }}
          style={{ marginTop: '8px' }}
          data-testid="archive-root"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('archive-root');
    expect(ref.current).toBe(root);
    expect(ArchiveInspector.displayName).toBe('ArchiveInspector');
    expect(root).toHaveAttribute('role', 'region');
    expect(root).toHaveClass(
      'refractor-archive-inspector',
      'prism-slab',
      'theme-archive-override',
      'local-archive-class'
    );
    expect(root).toHaveAttribute('data-format', 'zip');
    expect(root).not.toHaveAttribute('data-empty');
    expect(root).not.toHaveAttribute('data-has-unsafe');
    expect(root).toHaveStyle({ maxWidth: '880px', marginTop: '8px' });

    // Default header name, .zip badge, telemetry, and live compression ratio pill
    expect(screen.getByTestId('archive-inspector-name')).toHaveTextContent(
      'refractor-optical-assets.zip'
    );
    expect(screen.getByTestId('archive-inspector-format')).toHaveTextContent('.zip');
    expect(screen.getByTestId('archive-inspector-telemetry')).toHaveTextContent('104.0 KB → 33.5 KB');
    expect(screen.getByTestId('archive-inspector-ratio')).toHaveTextContent('68% saved');

    // Table is wrapped DIRECTLY inside <div className="overflow-x-auto">
    const table = screen.getByTestId('archive-inspector-table');
    expect(table.parentElement).not.toBeNull();
    expect(table.parentElement?.tagName.toLowerCase()).toBe('div');
    expect(table.parentElement).toHaveClass('overflow-x-auto');
    expect(table.querySelector('thead')).not.toBeNull();
    expect(table.querySelector('tbody')).not.toBeNull();

    // Extract Selected (0) is disabled initially while Extract All Safe is enabled
    expect(screen.getByTestId('archive-extract-selected')).toBeDisabled();
    expect(screen.getByTestId('archive-extract-selected')).toHaveTextContent(
      'Extract Selected (0)'
    );
    expect(screen.getByTestId('archive-extract-all-safe')).toBeEnabled();

    // Custom aria-label overrides aria-labelledby, blank archiveName falls back cleanly, and .tar / .7z formats render properly
    const formats: ReadonlyArray<{ kind: ArchiveFormatKind; ext: string; name: string }> = [
      { kind: 'tar', ext: '.tar', name: 'studio-masters.tar' },
      { kind: '7z', ext: '.7z', name: '   ' },
    ];

    for (const fmt of formats) {
      rerender(
        <ArchiveInspector
          archiveName={fmt.name}
          format={fmt.kind}
          aria-label="Custom Archive Region"
          data-testid="archive-root"
        />
      );
      const updated = screen.getByTestId('archive-root');
      expect(updated).toHaveAttribute('data-format', fmt.kind);
      expect(updated).toHaveAttribute('aria-label', 'Custom Archive Region');
      expect(updated).not.toHaveAttribute('aria-labelledby');
      expect(screen.getByTestId('archive-inspector-format')).toHaveTextContent(fmt.ext);
      expect(screen.getByTestId('archive-inspector-name')).toHaveTextContent(
        fmt.name.trim() || 'refractor-optical-assets.zip'
      );
    }
  });

  it('filters entries in linear time, clears search with IME-safe Escape or Clear buttons, and shows role="status" empty search state', () => {
    render(<ArchiveInspector />);

    const searchInput = screen.getByRole('searchbox', { name: 'Search archive entries' });

    // Non-Escape key and Escape on empty query are safe no-ops
    fireEvent.keyDown(searchInput, { key: 'Escape' });
    fireEvent.keyDown(searchInput, { key: 'a' });
    expect(searchInput).toHaveValue('');

    // Substring filter narrows rows
    fireEvent.change(searchInput, { target: { value: 'caustics' } });
    expect(screen.getByTestId('archive-row-entry-caustics-wgsl')).toBeInTheDocument();
    expect(screen.queryByTestId('archive-row-entry-manifest-json')).toBeNull();

    // IME composition guard ignores Escape while composing
    fireEvent.keyDown(searchInput, { key: 'Escape', isComposing: true });
    expect(searchInput).toHaveValue('caustics');

    // Non-composing Escape clears the search query and announces
    fireEvent.keyDown(searchInput, { key: 'Escape' });
    expect(searchInput).toHaveValue('');
    expect(screen.getByTestId('archive-row-entry-manifest-json')).toBeInTheDocument();
    expect(screen.getByTestId('archive-inspector-announcement')).toHaveTextContent(
      'Cleared archive search filter.'
    );

    // Clear button inside input works
    fireEvent.change(searchInput, { target: { value: 'manifest' } });
    fireEvent.click(screen.getByTestId('archive-inspector-clear-search'));
    expect(searchInput).toHaveValue('');

    // Hostile ReDoS / regex metacharacter query executes safely and renders role="status" empty state
    const hostileQuery = '((((((((a+)+)+)+)+$ [invalid===';
    fireEvent.change(searchInput, { target: { value: hostileQuery } });
    const emptyStatus = screen.getByRole('status');
    expect(emptyStatus).toBe(screen.getByTestId('archive-inspector-empty'));
    expect(emptyStatus).toHaveTextContent('No matching archive entries');
    expect(emptyStatus).toHaveTextContent(hostileQuery);

    // Empty-state Clear Search button restores entries
    fireEvent.click(screen.getByTestId('archive-empty-clear-search'));
    expect(searchInput).toHaveValue('');
    expect(screen.getByTestId('archive-row-entry-readme-md')).toBeInTheDocument();
  });

  it('supports individual selection, indeterminate Select All Safe toggling, Preview pane inspection/close, and Extract Selected / Extract All Safe callbacks', () => {
    const onExtract = vi.fn<(extracted: ReadonlyArray<ArchiveVirtualEntry>) => void>();
    render(<ArchiveInspector onExtract={onExtract} />);

    const selectAllCheckbox = screen.getByRole('checkbox', {
      name: 'Select All Safe',
    }) as HTMLInputElement;
    const manifestCheckbox = screen.getByTestId(
      'archive-checkbox-entry-manifest-json'
    ) as HTMLInputElement;
    const readmeCheckbox = screen.getByTestId(
      'archive-checkbox-entry-readme-md'
    ) as HTMLInputElement;

    // Individual selection sets indeterminate state on Select All Safe
    fireEvent.click(manifestCheckbox);
    expect(manifestCheckbox.checked).toBe(true);
    expect(selectAllCheckbox.checked).toBe(false);
    expect(selectAllCheckbox.indeterminate).toBe(true);
    expect(screen.getByTestId('archive-inspector-selected-count')).toHaveTextContent('1 selected');
    expect(screen.getByTestId('archive-extract-selected')).toHaveTextContent(
      'Extract Selected (1)'
    );

    // Extract Selected invokes onExtract with the 1 selected entry and polite announcement
    fireEvent.click(screen.getByTestId('archive-extract-selected'));
    expect(onExtract).toHaveBeenCalledTimes(1);
    expect(onExtract.mock.calls[0]?.[0].map((e) => e.id)).toEqual(['entry-manifest-json']);
    expect(screen.getByTestId('archive-inspector-announcement')).toHaveTextContent(
      'Extracted 1 entry selected from refractor-optical-assets.zip.'
    );

    // Toggle individual row back off
    fireEvent.click(manifestCheckbox);
    expect(manifestCheckbox.checked).toBe(false);
    expect(selectAllCheckbox.indeterminate).toBe(false);
    expect(screen.getByTestId('archive-extract-selected')).toBeDisabled();

    // Select All Safe selects all 6 default entries; clicking again deselects them
    fireEvent.click(selectAllCheckbox);
    expect(selectAllCheckbox.checked).toBe(true);
    expect(readmeCheckbox.checked).toBe(true);
    expect(screen.getByTestId('archive-extract-selected')).toHaveTextContent(
      'Extract Selected (6)'
    );
    expect(screen.getByTestId('archive-inspector-announcement')).toHaveTextContent(
      'Selected 6 entries safe for extraction.'
    );

    fireEvent.click(selectAllCheckbox);
    expect(selectAllCheckbox.checked).toBe(false);
    expect(screen.getByTestId('archive-extract-selected')).toHaveTextContent(
      'Extract Selected (0)'
    );
    expect(screen.getByTestId('archive-inspector-announcement')).toHaveTextContent(
      'Deselected 6 entries.'
    );

    // Extract All Safe invokes callback with all 6 safe entries
    fireEvent.click(screen.getByTestId('archive-extract-all-safe'));
    expect(onExtract).toHaveBeenCalledTimes(2);
    expect(onExtract.mock.calls[1]?.[0]).toHaveLength(6);
    expect(screen.getByTestId('archive-inspector-announcement')).toHaveTextContent(
      'Extracted all 6 entries safe from refractor-optical-assets.zip.'
    );

    // Virtual Entry Preview Pane starts with placeholder and updates when clicking Preview
    expect(screen.getByTestId('archive-preview-placeholder')).toBeInTheDocument();

    const causticsRow = screen.getByTestId('archive-row-entry-caustics-wgsl');
    const previewBtn = within(causticsRow).getByRole('button', { name: /preview/i });
    fireEvent.click(previewBtn);

    expect(previewBtn).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('archive-preview-path')).toHaveTextContent('shaders/caustics.wgsl');
    expect(screen.getByTestId('archive-preview-stats')).toHaveTextContent('Uncompressed: 18.0 KB');
    expect(screen.getByTestId('archive-preview-stats')).toHaveTextContent('Compressed: 5.0 KB');
    expect(screen.getByTestId('archive-preview-stats')).toHaveTextContent('Ratio: 72% saved');
    expect(screen.getByTestId('archive-preview-content')).toHaveTextContent('fn fs_caustics');

    // Previewing a zero-byte folder displays "Ratio: —"
    fireEvent.click(screen.getByTestId('archive-preview-btn-entry-shaders-dir'));
    expect(screen.getByTestId('archive-preview-stats')).toHaveTextContent('Ratio: —');

    // Closing preview restores placeholder
    fireEvent.click(screen.getByTestId('archive-preview-close'));
    expect(screen.getByTestId('archive-preview-placeholder')).toBeInTheDocument();
    expect(screen.getByTestId('archive-inspector-announcement')).toHaveTextContent(
      'Closed virtual entry preview.'
    );
  });

  it('blocks Zip-Slip traversal, absolute Unix paths, Windows drive letters, backslashes, and null-byte paths from selection and extraction', () => {
    const onExtract = vi.fn<(extracted: ReadonlyArray<ArchiveVirtualEntry>) => void>();

    const { rerender } = render(
      <ArchiveInspector
        archiveName="untrusted-upload.zip"
        entries={MIXED_SECURITY_ENTRIES}
        onExtract={onExtract}
        data-testid="security-root"
      />
    );

    const root = screen.getByTestId('security-root');
    expect(root).toHaveAttribute('data-has-unsafe', 'true');
    expect(screen.getByTestId('archive-inspector-unsafe-summary')).toHaveTextContent(
      '5 unsafe blocked'
    );

    // Unsafe rows render visibly with Unsafe Path badge and disabled checkboxes
    const unsafeIds = [
      'unsafe-traversal',
      'unsafe-abs-unix',
      'unsafe-win-drive',
      'unsafe-leading-backslash',
      'unsafe-null-byte',
    ];
    for (const id of unsafeIds) {
      expect(screen.getByTestId(`archive-row-${id}`)).toHaveAttribute('data-safe', 'false');
      expect(screen.getByTestId(`archive-unsafe-badge-${id}`)).toHaveTextContent('Unsafe Path');
      const checkbox = screen.getByTestId(`archive-checkbox-${id}`) as HTMLInputElement;
      expect(checkbox).toBeDisabled();
      expect(checkbox.checked).toBe(false);
    }

    // Previewing an unsafe entry shows the Unsafe Path warning and literal preview text safely
    fireEvent.click(screen.getByTestId('archive-preview-btn-unsafe-traversal'));
    expect(screen.getByTestId('archive-preview-unsafe-warning')).toHaveTextContent(
      'Unsafe Path — Extraction Blocked'
    );
    expect(screen.getByTestId('archive-preview-content')).toHaveTextContent('root:x:0:0');

    // Previewing an entry without previewText displays fallback message
    fireEvent.click(screen.getByTestId('archive-preview-btn-unsafe-abs-unix'));
    expect(screen.getByTestId('archive-preview-content')).toHaveTextContent(
      'No virtual text preview available for this entry.'
    );

    // Select All Safe selects ONLY the 2 safe entries and never any unsafe entry
    const selectAll = screen.getByRole('checkbox', { name: 'Select All Safe' });
    fireEvent.click(selectAll);
    expect(screen.getByTestId('archive-extract-selected')).toHaveTextContent(
      'Extract Selected (2)'
    );
    for (const id of unsafeIds) {
      expect((screen.getByTestId(`archive-checkbox-${id}`) as HTMLInputElement).checked).toBe(
        false
      );
    }

    // Extract Selected emits ONLY safe entries
    fireEvent.click(screen.getByTestId('archive-extract-selected'));
    expect(onExtract).toHaveBeenCalledTimes(1);
    expect(onExtract.mock.calls[0]?.[0].map((e) => e.id)).toEqual(['safe-folder', 'safe-file']);

    // Extract All Safe emits ONLY safe entries and reports skipped unsafe paths (plural)
    fireEvent.click(screen.getByTestId('archive-extract-all-safe'));
    expect(onExtract).toHaveBeenCalledTimes(2);
    expect(onExtract.mock.calls[1]?.[0].map((e) => e.id)).toEqual(['safe-folder', 'safe-file']);
    expect(screen.getByTestId('archive-inspector-announcement')).toHaveTextContent(
      'Extracted all 2 entries safe from untrusted-upload.zip (5 unsafe paths skipped).'
    );

    // Test singular "1 unsafe path skipped" announcement branch
    rerender(
      <ArchiveInspector
        archiveName="one-unsafe.zip"
        entries={[MIXED_SECURITY_ENTRIES[1]!, MIXED_SECURITY_ENTRIES[2]!]}
        onExtract={onExtract}
      />
    );
    fireEvent.click(screen.getByTestId('archive-extract-all-safe'));
    expect(screen.getByTestId('archive-inspector-announcement')).toHaveTextContent(
      'Extracted all 1 entry safe from one-unsafe.zip (1 unsafe path skipped).'
    );

    // Archive with ONLY unsafe entries disables Select All Safe and Extract All Safe
    rerender(
      <ArchiveInspector
        archiveName="all-unsafe.zip"
        entries={[MIXED_SECURITY_ENTRIES[2]!, MIXED_SECURITY_ENTRIES[4]!]}
        onExtract={onExtract}
      />
    );
    expect(screen.getByTestId('archive-select-all-safe')).toBeDisabled();
    expect(screen.getByTestId('archive-extract-all-safe')).toBeDisabled();
    expect(screen.getByTestId('archive-extract-selected')).toBeDisabled();
  });

  it('escapes XSS payloads in archiveName, path, and previewText strictly as literal text and handles prototype-hostile and duplicate IDs', () => {
    const baselineProtoKeys = Object.getOwnPropertyNames(Object.prototype).sort();
    const xss = '<script>window.__archiveXss=1</script><img src=x onerror=alert(1)>';

    const adversarialEntries: ReadonlyArray<ArchiveVirtualEntry> = [
      {
        id: '__proto__',
        path: `safe/${xss}.txt`,
        kind: 'file',
        uncompressedBytes: 512,
        compressedBytes: 256,
        modifiedAt: '2026-11-22',
        previewText: xss,
      },
      {
        id: '__proto__',
        path: 'safe/duplicate-id.txt',
        kind: 'file',
        uncompressedBytes: 2_621_440,
        compressedBytes: 1_048_576,
        modifiedAt: '2026-11-22',
      },
      {
        id: 'constructor',
        path: 'safe/huge-archive-blob.bin',
        kind: 'file',
        uncompressedBytes: 1_610_612_736,
        compressedBytes: 1_073_741_824,
        modifiedAt: '2026-11-22',
      },
    ];

    render(<ArchiveInspector archiveName={xss} entries={adversarialEntries} />);

    expect(document.querySelector('script')).toBeNull();
    expect(document.querySelector('img')).toBeNull();
    expect(screen.getByTestId('archive-inspector-name')).toHaveTextContent(xss);
    expect(screen.getByTestId('archive-uncompressed-constructor')).toHaveTextContent('1.50 GB');
    expect(screen.getByTestId('archive-compressed-constructor')).toHaveTextContent('1.00 GB');

    // Preview the XSS entry and confirm literal rendering without script/img execution
    const previewBtns = screen.getAllByTestId('archive-preview-btn-__proto__');
    fireEvent.click(previewBtns[0]!);
    expect(document.querySelector('script')).toBeNull();
    expect(document.querySelector('img')).toBeNull();
    expect(screen.getByTestId('archive-preview-path')).toHaveTextContent(`safe/${xss}.txt`);
    expect(screen.getByTestId('archive-preview-content')).toHaveTextContent(xss);

    // Object.prototype remains completely unpolluted
    expect(Object.getOwnPropertyNames(Object.prototype).sort()).toEqual(baselineProtoKeys);
  });

  it('sanitizes zero, negative, NaN, Infinity, and inflated byte ratios safely without NaN or Infinity output', () => {
    const edgeByteEntries: ReadonlyArray<ArchiveVirtualEntry> = [
      {
        id: 'zero-file',
        path: 'empty.txt',
        kind: 'file',
        uncompressedBytes: 0,
        compressedBytes: 0,
        modifiedAt: '2026-11-22',
      },
      {
        id: 'nan-file',
        path: 'corrupt-nan.bin',
        kind: 'file',
        uncompressedBytes: Number.NaN,
        compressedBytes: Number.NaN,
        modifiedAt: '2026-11-22',
      },
      {
        id: 'inf-file',
        path: 'corrupt-inf.bin',
        kind: 'file',
        uncompressedBytes: Number.POSITIVE_INFINITY,
        compressedBytes: -50,
        modifiedAt: '2026-11-22',
      },
      {
        id: 'inflated-file',
        path: 'already-compressed.png',
        kind: 'file',
        uncompressedBytes: 500,
        compressedBytes: 620,
        modifiedAt: '2026-11-22',
      },
    ];

    render(<ArchiveInspector entries={edgeByteEntries} />);

    expect(screen.getByTestId('archive-inspector-ratio')).toHaveTextContent('0% saved');
    expect(screen.getByTestId('archive-inspector-ratio').textContent).not.toMatch(/NaN|Infinity/);
    expect(screen.getByTestId('archive-ratio-zero-file')).toHaveTextContent('0% saved');
    expect(screen.getByTestId('archive-ratio-nan-file')).toHaveTextContent('0% saved');
    expect(screen.getByTestId('archive-ratio-inf-file')).toHaveTextContent('0% saved');
    expect(screen.getByTestId('archive-ratio-inflated-file')).toHaveTextContent('0% saved');
    expect(screen.getByTestId('archive-uncompressed-zero-file')).toHaveTextContent('0 B');
    expect(screen.getByTestId('archive-uncompressed-nan-file')).toHaveTextContent('0 B');
    expect(screen.getByTestId('archive-uncompressed-inflated-file')).toHaveTextContent('500 B');
  });

  it('renders clean role="status" empty state for entries={[]} and enforces disabled state across all controls', () => {
    const onExtract = vi.fn<(extracted: ReadonlyArray<ArchiveVirtualEntry>) => void>();

    const { rerender } = render(
      <ArchiveInspector
        archiveName="empty-archive.zip"
        entries={[]}
        onExtract={onExtract}
        data-testid="empty-root"
      />
    );

    const root = screen.getByTestId('empty-root');
    expect(root).toHaveAttribute('data-empty', 'true');
    expect(screen.getByTestId('archive-inspector-telemetry')).toHaveTextContent('0 B → 0 B');
    expect(screen.getByTestId('archive-inspector-ratio')).toHaveTextContent('0% saved');
    expect(screen.getByTestId('archive-select-all-safe')).toBeDisabled();
    expect(screen.getByTestId('archive-extract-selected')).toBeDisabled();
    expect(screen.getByTestId('archive-extract-all-safe')).toBeDisabled();

    const emptyStatus = screen.getByRole('status');
    expect(emptyStatus).toBe(screen.getByTestId('archive-inspector-empty'));
    expect(emptyStatus).toHaveTextContent('Archive is empty');
    expect(emptyStatus).toHaveTextContent('empty-archive.zip');

    // Open a preview, then switch to disabled={true} to verify every interactive control is disabled
    rerender(<ArchiveInspector onExtract={onExtract} data-testid="disabled-root" />);
    fireEvent.click(screen.getByTestId('archive-preview-btn-entry-manifest-json'));
    expect(screen.getByTestId('archive-preview-close')).toBeEnabled();

    rerender(<ArchiveInspector onExtract={onExtract} disabled data-testid="disabled-root" />);

    const disabledRoot = screen.getByTestId('disabled-root');
    expect(disabledRoot).toHaveAttribute('data-disabled', 'true');
    expect(disabledRoot).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByTestId('archive-inspector-search')).toBeDisabled();
    expect(screen.getByTestId('archive-select-all-safe')).toBeDisabled();
    expect(screen.getByTestId('archive-checkbox-entry-manifest-json')).toBeDisabled();
    expect(screen.getByTestId('archive-preview-btn-entry-manifest-json')).toBeDisabled();
    expect(screen.getByTestId('archive-preview-close')).toBeDisabled();
    expect(screen.getByTestId('archive-extract-selected')).toBeDisabled();
    expect(screen.getByTestId('archive-extract-all-safe')).toBeDisabled();
    expect(onExtract).not.toHaveBeenCalled();
  });
});
