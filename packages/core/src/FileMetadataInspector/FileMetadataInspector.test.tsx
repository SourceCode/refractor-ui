import { createRef } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import {
  FileMetadataInspector,
  type FileInspectorKind,
  type FileInspectorKindMap,
  type FileInspectorTagColor,
  type FileInspectorTagColorMap,
  type FileMetadataRecord,
  type FileMetadataTag,
} from './index';

interface MockClipboard {
  writeText: (text: string) => Promise<void>;
}

interface NavigatorWithClipboard {
  clipboard?: MockClipboard;
}

interface DocumentWithExecCommand {
  execCommand?: (commandId: string) => boolean;
}

const originalClipboardDescriptor = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
const originalExecCommandDescriptor = Object.getOwnPropertyDescriptor(document, 'execCommand');

function setNavigatorClipboard(value: MockClipboard | undefined): void {
  Object.defineProperty(navigator as NavigatorWithClipboard, 'clipboard', {
    configurable: true,
    writable: true,
    value,
  });
}

function setDocumentExecCommand(value: ((commandId: string) => boolean) | undefined): void {
  Object.defineProperty(document as DocumentWithExecCommand, 'execCommand', {
    configurable: true,
    writable: true,
    value,
  });
}

function restoreClipboardApis(): void {
  if (originalClipboardDescriptor) {
    Object.defineProperty(navigator, 'clipboard', originalClipboardDescriptor);
  } else {
    delete (navigator as NavigatorWithClipboard).clipboard;
  }

  if (originalExecCommandDescriptor) {
    Object.defineProperty(document, 'execCommand', originalExecCommandDescriptor);
  } else {
    delete (document as DocumentWithExecCommand).execCommand;
  }
}

const SAMPLE_CODE_FILE: FileMetadataRecord = {
  name: 'opticalEngine.ts',
  kind: 'code',
  mimeType: 'application/typescript',
  sizeLabel: '18.4 KB',
  location: '/packages/core/src/theme/opticalEngine.ts',
  createdAt: '2026-09-10 11:00 UTC',
  modifiedAt: '2026-11-21 15:45 UTC',
  checksumSha256: '3a7bd3e2360a3d29eea436fcfb7e44c735d117c42d1c1835420b6b9942dd4f1b',
  exifSpecs: [
    { label: 'Encoding', value: 'UTF-8' },
    { label: 'Line Count', value: '412' },
  ],
  tags: [
    { id: 'file-tag-1', label: 'Core Engine', color: 'info' },
    { id: 'tag-ts', label: 'Strict TS', color: 'secondary' },
  ],
};

afterEach(() => {
  restoreClipboardApis();
  vi.useRealTimers();
});

describe('FileMetadataInspector', () => {
  it('satisfies Astryx contracts, forwards React 19 ref, applies theme overrides, and renders default optical metadata and EXIF specs', () => {
    const ref = createRef<HTMLDivElement>();
    const kindMap: FileInspectorKindMap = {
      image: true,
      code: true,
      audio: true,
      document: true,
      archive: true,
    };
    const colorMap: FileInspectorTagColorMap = {
      primary: true,
      rose: true,
      emerald: true,
      info: true,
      amber: true,
      secondary: true,
    };
    expect(
      kindMap.image &&
        kindMap.code &&
        kindMap.audio &&
        kindMap.document &&
        kindMap.archive &&
        colorMap.primary &&
        colorMap.rose &&
        colorMap.emerald &&
        colorMap.info &&
        colorMap.amber &&
        colorMap.secondary
    ).toBe(true);

    const { rerender } = render(
      <PrismThemeProvider
        theme={{
          components: {
            FileMetadataInspector: {
              className: 'theme-inspector-override',
              style: { maxWidth: '420px' },
            },
          },
        }}
      >
        <FileMetadataInspector
          ref={ref}
          className="local-inspector-class"
          xstyle={{ '--prism-blur-px': '20px' }}
          style={{ marginTop: '6px' }}
          data-testid="inspector-root"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('inspector-root');
    expect(ref.current).toBe(root);
    expect(FileMetadataInspector.displayName).toBe('FileMetadataInspector');
    expect(root).toHaveAttribute('role', 'region');
    expect(root).toHaveClass(
      'refractor-file-metadata-inspector',
      'prism-slab',
      'theme-inspector-override',
      'local-inspector-class'
    );
    expect(root).toHaveAttribute('data-open', 'true');
    expect(root).toHaveAttribute('data-kind', 'image');
    expect(root).not.toHaveAttribute('data-empty');
    expect(root).toHaveStyle({ maxWidth: '420px', marginTop: '6px' });

    // Header filename, MIME badge, metadata <dl>, and EXIF specs
    expect(screen.getByTestId('file-inspector-title')).toHaveTextContent(
      'Optical_Refraction_Hero.png'
    );
    expect(screen.getByTestId('file-inspector-mime')).toHaveTextContent('image/png');

    const dl = screen.getByTestId('file-inspector-metadata');
    expect(dl.tagName.toLowerCase()).toBe('dl');
    expect(dl).toHaveTextContent('14.6 MB');
    expect(dl).toHaveTextContent('/workspace/assets/renders');
    expect(dl).toHaveTextContent('2026-10-14 09:42 UTC');
    expect(dl).toHaveTextContent('2026-11-18 16:20 UTC');
    expect(screen.getByTestId('file-inspector-checksum-value')).toHaveTextContent(
      '8f4e2a9c7d1b6053e4a92f1c8d7b3a5061e2f4c9d8b7a6e5f4c3d2b1a0987654'
    );

    const exifSection = screen.getByTestId('file-inspector-exif-section');
    expect(exifSection).toHaveTextContent('Dimensions');
    expect(exifSection).toHaveTextContent('3840 × 2160');
    expect(exifSection).toHaveTextContent('Color Profile');
    expect(exifSection).toHaveTextContent('Display P3');
    expect(exifSection).toHaveTextContent('Aperture');
    expect(exifSection).toHaveTextContent('f/2.0');
    expect(exifSection).toHaveTextContent('ISO');
    expect(exifSection).toHaveTextContent('100');
    expect(exifSection).toHaveTextContent('Camera');
    expect(exifSection).toHaveTextContent('Optical Lab MK-II');

    // Custom aria-label overrides aria-labelledby
    rerender(<FileMetadataInspector aria-label="Workspace Inspector" data-testid="inspector-root" />);
    const updatedRoot = screen.getByTestId('inspector-root');
    expect(updatedRoot).toHaveAttribute('aria-label', 'Workspace Inspector');
    expect(updatedRoot).not.toHaveAttribute('aria-labelledby');
  });

  it('renders tailored procedural SVG optical previews with viewBox="0 0 240 132" and zero raw colors for all 5 kinds', () => {
    const kinds: ReadonlyArray<{ kind: FileInspectorKind; mime: string; name: string }> = [
      { kind: 'image', mime: 'image/png', name: 'prism.png' },
      { kind: 'code', mime: 'application/typescript', name: 'engine.ts' },
      { kind: 'audio', mime: 'audio/wav', name: 'ambient.wav' },
      { kind: 'document', mime: 'application/pdf', name: 'spec.pdf' },
      { kind: 'archive', mime: 'application/zip', name: 'bundle.zip' },
    ];

    const rawColorRegex = /(?:#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b|\b(?:rgba?|hsla?)\s*\()/;

    const { rerender } = render(<FileMetadataInspector />);

    for (const item of kinds) {
      const record: FileMetadataRecord = {
        ...SAMPLE_CODE_FILE,
        name: item.name,
        kind: item.kind,
        mimeType: item.mime,
      };
      rerender(<FileMetadataInspector file={record} data-testid="kind-root" />);

      const root = screen.getByTestId('kind-root');
      expect(root).toHaveAttribute('data-kind', item.kind);

      const svg = screen.getByTestId('file-inspector-preview-svg');
      expect(svg).toHaveAttribute('viewBox', '0 0 240 132');
      expect(svg).toHaveAttribute('data-preview-kind', item.kind);
      expect(svg).toHaveAttribute('role', 'img');
      expect(screen.getByTestId(`file-inspector-artwork-${item.kind}`)).toBeInTheDocument();
      expect(rawColorRegex.test(svg.outerHTML)).toBe(false);
    }
  });

  it('supports uncontrolled and controlled collapse/expand toggling with aria-expanded', () => {
    const onOpenChange = vi.fn<(nextOpen: boolean) => void>();

    const { rerender } = render(
      <FileMetadataInspector
        file={SAMPLE_CODE_FILE}
        defaultOpen={false}
        onOpenChange={onOpenChange}
        data-testid="toggle-root"
      />
    );

    const toggleBtn = screen.getByTestId('file-inspector-toggle');
    expect(toggleBtn).toHaveAttribute('aria-expanded', 'false');
    expect(toggleBtn).toHaveAccessibleName('Expand inspector');
    expect(screen.queryByTestId('file-inspector-preview-svg')).toBeNull();

    // Uncontrolled expand
    fireEvent.click(toggleBtn);
    expect(onOpenChange).toHaveBeenLastCalledWith(true);
    expect(toggleBtn).toHaveAttribute('aria-expanded', 'true');
    expect(toggleBtn).toHaveAccessibleName('Collapse inspector');
    expect(screen.getByTestId('file-inspector-preview-svg')).toBeInTheDocument();

    // Uncontrolled collapse
    fireEvent.click(toggleBtn);
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
    expect(toggleBtn).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByTestId('file-inspector-preview-svg')).toBeNull();

    // Controlled mode: clicking toggle notifies parent without mutating until prop changes
    rerender(
      <FileMetadataInspector
        file={SAMPLE_CODE_FILE}
        open={false}
        onOpenChange={onOpenChange}
        data-testid="toggle-root"
      />
    );
    fireEvent.click(screen.getByTestId('file-inspector-toggle'));
    expect(onOpenChange).toHaveBeenLastCalledWith(true);
    expect(screen.getByTestId('file-inspector-toggle')).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByTestId('file-inspector-preview-svg')).toBeNull();

    rerender(
      <FileMetadataInspector
        file={SAMPLE_CODE_FILE}
        open={true}
        onOpenChange={onOpenChange}
        data-testid="toggle-root"
      />
    );
    expect(screen.getByTestId('file-inspector-toggle')).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByTestId('file-inspector-preview-svg')).toBeInTheDocument();
  });

  it('copies SHA-256 checksum via navigator.clipboard with polite live announcement and auto-reset timer', async () => {
    vi.useFakeTimers();
    const writeText = vi.fn<(text: string) => Promise<void>>().mockResolvedValue(undefined);
    setNavigatorClipboard({ writeText });

    render(<FileMetadataInspector file={SAMPLE_CODE_FILE} />);

    const copyBtn = screen.getByRole('button', { name: /copy sha-256/i });
    await act(async () => {
      fireEvent.click(copyBtn);
      await Promise.resolve();
    });

    expect(writeText).toHaveBeenCalledWith(SAMPLE_CODE_FILE.checksumSha256);
    expect(copyBtn).toHaveAttribute('data-copied', 'true');
    expect(copyBtn).toHaveTextContent('Copied SHA-256');
    expect(screen.getByTestId('file-inspector-live-region')).toHaveTextContent(
      'SHA-256 checksum copied to clipboard.'
    );

    act(() => {
      vi.advanceTimersByTime(1900);
    });

    expect(copyBtn).not.toHaveAttribute('data-copied');
    expect(copyBtn).toHaveTextContent('Copy SHA-256');
  });

  it('handles SHA-256 clipboard fallback, unavailable environments, stale attempts, and unmount safety', async () => {
    // 1. navigator.clipboard rejects -> document.execCommand('copy') succeeds
    const rejectingWrite = vi
      .fn<(text: string) => Promise<void>>()
      .mockRejectedValue(new Error('Clipboard denied'));
    const execCopyTrue = vi.fn<(cmd: string) => boolean>().mockReturnValue(true);
    setNavigatorClipboard({ writeText: rejectingWrite });
    setDocumentExecCommand(execCopyTrue);

    const { rerender, unmount } = render(<FileMetadataInspector file={SAMPLE_CODE_FILE} />);

    await act(async () => {
      fireEvent.click(screen.getByTestId('file-inspector-copy-sha'));
      await Promise.resolve();
    });

    expect(rejectingWrite).toHaveBeenCalledTimes(1);
    expect(execCopyTrue).toHaveBeenCalledWith('copy');
    expect(screen.getByTestId('file-inspector-copy-sha')).toHaveAttribute('data-copied', 'true');
    expect(screen.getByTestId('file-inspector-live-region')).toHaveTextContent(
      'SHA-256 checksum copied to clipboard.'
    );

    // 2. Clipboard missing & execCommand returns false -> graceful unavailable notice
    setNavigatorClipboard(undefined);
    setDocumentExecCommand(vi.fn<(cmd: string) => boolean>().mockReturnValue(false));

    await act(async () => {
      fireEvent.click(screen.getByTestId('file-inspector-copy-sha'));
      await Promise.resolve();
    });

    expect(screen.getByTestId('file-inspector-copy-sha')).not.toHaveAttribute('data-copied');
    expect(screen.getByTestId('file-inspector-live-region')).toHaveTextContent(
      'Clipboard unavailable. Select the SHA-256 checksum to copy manually.'
    );

    // 3. Clipboard missing & execCommand throws -> graceful unavailable notice without throwing
    setDocumentExecCommand(
      vi.fn<(cmd: string) => boolean>(() => {
        throw new Error('Not supported');
      })
    );

    await act(async () => {
      fireEvent.click(screen.getByTestId('file-inspector-copy-sha'));
      await Promise.resolve();
    });

    expect(screen.getByTestId('file-inspector-live-region')).toHaveTextContent(
      'Clipboard unavailable. Select the SHA-256 checksum to copy manually.'
    );

    // 4. Clipboard missing & execCommand undefined -> graceful unavailable notice
    setDocumentExecCommand(undefined);

    await act(async () => {
      fireEvent.click(screen.getByTestId('file-inspector-copy-sha'));
      await Promise.resolve();
    });

    expect(screen.getByTestId('file-inspector-live-region')).toHaveTextContent(
      'Clipboard unavailable. Select the SHA-256 checksum to copy manually.'
    );

    // 5. Stale overlapping copy attempt is ignored, and unmounting while pending does not crash
    let resolveFirst: (() => void) | undefined;
    let resolveSecond: (() => void) | undefined;
    let callCount = 0;
    setNavigatorClipboard({
      writeText: () =>
        new Promise<void>((resolve) => {
          callCount += 1;
          if (callCount === 1) {
            resolveFirst = resolve;
          } else {
            resolveSecond = resolve;
          }
        }),
    });

    fireEvent.click(screen.getByTestId('file-inspector-copy-sha'));
    fireEvent.click(screen.getByTestId('file-inspector-copy-sha'));

    await act(async () => {
      resolveFirst?.();
      await Promise.resolve();
    });
    expect(screen.getByTestId('file-inspector-copy-sha')).not.toHaveAttribute('data-copied');

    unmount();
    await act(async () => {
      resolveSecond?.();
      await Promise.resolve();
    });

    // Omit checksum and EXIF when absent/blank
    const minimalFile: FileMetadataRecord = {
      name: 'notes.txt',
      kind: 'document',
      mimeType: 'text/plain',
      sizeLabel: '1.2 KB',
      location: '/notes',
      createdAt: '2026-11-01',
      modifiedAt: '2026-11-02',
      checksumSha256: '   ',
      exifSpecs: [],
      tags: [],
    };
    const minimalRender = render(<FileMetadataInspector file={minimalFile} />);
    expect(screen.queryByTestId('file-inspector-checksum-row')).toBeNull();
    expect(screen.queryByTestId('file-inspector-exif-section')).toBeNull();
    expect(screen.getByTestId('file-inspector-no-tags')).toHaveTextContent('No tags applied yet.');
    minimalRender.unmount();

    // Prevent unused rerender lint error by exercising rerender cleanly
    expect(typeof rerender).toBe('function');
  });

  it('supports selecting all 6 color swatches, adding/removing tags, trimming, deduplication, ID collision avoidance, and IME-safe Enter', () => {
    const onTagsChange = vi.fn<(nextTags: ReadonlyArray<FileMetadataTag>) => void>();

    render(<FileMetadataInspector file={SAMPLE_CODE_FILE} onTagsChange={onTagsChange} />);

    const swatches: ReadonlyArray<FileInspectorTagColor> = [
      'primary',
      'rose',
      'emerald',
      'info',
      'amber',
      'secondary',
    ];

    // Primary swatch active initially
    expect(screen.getByTestId('file-inspector-swatch-primary')).toHaveAttribute(
      'aria-pressed',
      'true'
    );

    const input = screen.getByRole('textbox', { name: 'Add file tag' });
    const addBtn = screen.getByRole('button', { name: 'Add Tag' });

    // Reject blank / whitespace-only tag
    fireEvent.change(input, { target: { value: '    ' } });
    fireEvent.click(addBtn);
    expect(onTagsChange).not.toHaveBeenCalled();
    expect(screen.getByTestId('file-inspector-live-region')).toHaveTextContent(
      'Enter a tag label before adding.'
    );

    // Reject case-insensitive duplicate tag
    fireEvent.change(input, { target: { value: '  core engine  ' } });
    fireEvent.click(addBtn);
    expect(onTagsChange).not.toHaveBeenCalled();
    expect(screen.getByTestId('file-inspector-live-region')).toHaveTextContent(
      'Tag "core engine" already exists.'
    );

    // IME composition guard ignores Enter while composing
    fireEvent.change(input, { target: { value: 'Draft IME' } });
    fireEvent.keyDown(input, { key: 'Enter', isComposing: true });
    expect(onTagsChange).not.toHaveBeenCalled();

    // Non-Enter key does not add tag
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(onTagsChange).not.toHaveBeenCalled();

    // Add a tag with each swatch color (tests all 6 swatches & skips colliding file-tag-1 ID)
    for (const color of swatches) {
      const swatchBtn = screen.getByTestId(`file-inspector-swatch-${color}`);
      fireEvent.click(swatchBtn);
      expect(swatchBtn).toHaveAttribute('aria-pressed', 'true');

      const label = `Tag ${color}`;
      fireEvent.change(input, { target: { value: `  ${label}  ` } });
      if (color === 'rose') {
        fireEvent.keyDown(input, { key: 'Enter' });
      } else {
        fireEvent.click(addBtn);
      }

      const lastCallTags = onTagsChange.mock.calls[onTagsChange.mock.calls.length - 1]?.[0];
      expect(lastCallTags).toBeDefined();
      const added = lastCallTags?.[lastCallTags.length - 1];
      expect(added?.label).toBe(label);
      expect(added?.color).toBe(color);
      expect(input).toHaveValue('');
    }

    // Because SAMPLE_CODE_FILE already had id 'file-tag-1', first newly added tag skipped to 'file-tag-2'
    expect(screen.getByTestId('file-inspector-tag-file-tag-2')).toHaveAttribute(
      'data-tag-color',
      'primary'
    );

    // Remove a tag using accessible name "Remove tag <label>"
    const removeCoreBtn = screen.getByRole('button', { name: 'Remove tag Core Engine' });
    fireEvent.click(removeCoreBtn);
    expect(screen.queryByRole('button', { name: 'Remove tag Core Engine' })).toBeNull();
    expect(screen.getByTestId('file-inspector-live-region')).toHaveTextContent(
      'Removed tag "Core Engine".'
    );
  });

  it('renders clean role="status" empty state when file is null and resets draft state on file switch', () => {
    const { rerender } = render(
      <FileMetadataInspector file={SAMPLE_CODE_FILE} data-testid="switch-root" />
    );

    const input = screen.getByRole('textbox', { name: 'Add file tag' });
    fireEvent.change(input, { target: { value: 'Unsaved Draft' } });
    expect(input).toHaveValue('Unsaved Draft');

    // Switch to file={null}
    rerender(<FileMetadataInspector file={null} data-testid="switch-root" />);

    const root = screen.getByTestId('switch-root');
    expect(root).toHaveAttribute('data-empty', 'true');
    expect(screen.getByTestId('file-inspector-title')).toHaveTextContent('No file selected');
    expect(screen.queryByTestId('file-inspector-mime')).toBeNull();
    expect(screen.queryByTestId('file-inspector-preview-svg')).toBeNull();

    const emptyStatus = screen.getByRole('status');
    expect(emptyStatus).toBe(screen.getByTestId('file-inspector-empty'));
    expect(emptyStatus).toHaveTextContent('No file selected');

    // Switch back to a file -> draft was cleared cleanly
    rerender(<FileMetadataInspector file={SAMPLE_CODE_FILE} data-testid="switch-root" />);
    expect(screen.getByRole('textbox', { name: 'Add file tag' })).toHaveValue('');
  });

  it('renders XSS payloads strictly as literal text, handles duplicate EXIF entries, and enforces disabled state', () => {
    const xss = '<script>window.__inspectorXss=1</script><img src=x onerror=alert(1)>';
    const adversarialFile: FileMetadataRecord = {
      name: xss,
      kind: 'archive',
      mimeType: `application/${xss}`,
      sizeLabel: '42 KB',
      location: `/unsafe/${xss}`,
      createdAt: '2026-11-10',
      modifiedAt: '2026-11-11',
      checksumSha256: 'deadbeef0123456789',
      exifSpecs: [
        { label: 'Codec', value: xss },
        { label: 'Codec', value: xss },
      ],
      tags: [{ id: 'xss-tag', label: xss, color: 'rose' }],
    };

    const { rerender } = render(<FileMetadataInspector file={adversarialFile} />);

    expect(document.querySelector('script')).toBeNull();
    expect(document.querySelector('img')).toBeNull();
    expect(screen.getByTestId('file-inspector-title')).toHaveTextContent(xss);
    expect(screen.getByTestId('file-inspector-exif-section')).toHaveTextContent(xss);
    expect(screen.getByTestId('file-inspector-tag-xss-tag')).toHaveTextContent(xss);

    // Disabled state disables all interactive controls
    rerender(
      <FileMetadataInspector file={adversarialFile} disabled data-testid="disabled-root" />
    );

    expect(screen.getByTestId('disabled-root')).toHaveAttribute('data-disabled', 'true');
    expect(screen.getByTestId('file-inspector-toggle')).toBeDisabled();
    expect(screen.getByTestId('file-inspector-copy-sha')).toBeDisabled();
    expect(screen.getByTestId('file-inspector-swatch-primary')).toBeDisabled();
    expect(screen.getByRole('button', { name: `Remove tag ${xss}` })).toBeDisabled();
    expect(screen.getByRole('textbox', { name: 'Add file tag' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Add Tag' })).toBeDisabled();
  });
});
