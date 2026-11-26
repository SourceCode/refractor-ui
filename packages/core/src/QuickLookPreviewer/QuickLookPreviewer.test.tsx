import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import {
  QuickLookPreviewer,
  type QuickLookFileItem,
  type QuickLookMediaKindMap,
} from './index';

const SAFE_DATA_PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

describe('QuickLookPreviewer', () => {
  it('satisfies Open-Internals contracts, forwards React 19 ref, applies theme overrides, and renders 4 default sample files', () => {
    const ref = createRef<HTMLDivElement>();
    const kindMapCheck: QuickLookMediaKindMap = {
      image: true,
      pdf: true,
      audio: true,
      code: true,
    };
    expect(
      kindMapCheck.image && kindMapCheck.pdf && kindMapCheck.audio && kindMapCheck.code
    ).toBe(true);

    render(
      <PrismThemeProvider
        theme={{
          components: {
            QuickLookPreviewer: {
              className: 'theme-quicklook-override',
              style: { maxWidth: '920px' },
            },
          },
        }}
      >
        <QuickLookPreviewer
          ref={ref}
          className="local-quicklook-class"
          xstyle={{ '--prism-blur-px': '20px' }}
          style={{ marginTop: '8px' }}
          data-testid="ql-root"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('ql-root');
    expect(ref.current).toBe(root);
    expect(QuickLookPreviewer.displayName).toBe('QuickLookPreviewer');
    expect(root).toHaveClass(
      'refractor-quick-look-previewer',
      'theme-quicklook-override',
      'local-quicklook-class'
    );
    expect(root).toHaveAttribute('data-mode', 'modal');
    expect(root).toHaveAttribute('data-kind', 'image');
    expect(root).not.toHaveAttribute('data-open');
    expect(root).toHaveStyle({ maxWidth: '920px', marginTop: '8px' });

    // Modal closed by default
    expect(screen.queryByRole('dialog')).toBeNull();

    // All 4 default sample assets are visible in the file strip
    expect(screen.getByTestId('quicklook-card-ql-prism-poster')).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(screen.getByTestId('quicklook-card-ql-architecture-spec')).toHaveTextContent(
      'Architecture_Spec.pdf'
    );
    expect(screen.getByTestId('quicklook-card-ql-ambient-master')).toHaveTextContent(
      'Ambient_Master.wav'
    );
    expect(screen.getByTestId('quicklook-card-ql-theme-engine')).toHaveTextContent(
      'themeEngine.ts'
    );
  });

  it('opens centered modal dialog via Spacebar, Quick Look button, or card double-click, and dismisses via Escape, Space, Close button, or backdrop', () => {
    const onOpenChange = vi.fn<(open: boolean) => void>();
    const onActiveIndexChange = vi.fn<(index: number, file: QuickLookFileItem) => void>();

    render(
      <QuickLookPreviewer
        onOpenChange={onOpenChange}
        onActiveIndexChange={onActiveIndexChange}
        data-testid="ql-root"
      />
    );

    const pdfCard = screen.getByTestId('quicklook-card-ql-architecture-spec');
    const posterCard = screen.getByTestId('quicklook-card-ql-prism-poster');

    // Clicking already-selected card does not redundantly fire onActiveIndexChange
    fireEvent.click(posterCard);
    expect(onActiveIndexChange).not.toHaveBeenCalled();

    // Clicking another card selects it
    fireEvent.click(pdfCard);
    expect(onActiveIndexChange).toHaveBeenCalledTimes(1);
    expect(onActiveIndexChange).toHaveBeenLastCalledWith(
      1,
      expect.objectContaining({ id: 'ql-architecture-spec', kind: 'pdf' })
    );

    // Spacebar on focused card opens centered modal dialog
    fireEvent.keyDown(pdfCard, { key: ' ' });
    expect(onOpenChange).toHaveBeenLastCalledWith(true);
    const dialog = screen.getByRole('dialog', { name: 'Architecture_Spec.pdf' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveClass('prism-slab');
    expect(screen.getByTestId('quicklook-metadata')).toHaveAttribute('aria-live', 'polite');
    expect(screen.getByTestId('quicklook-metadata')).toHaveTextContent(
      'Architecture_Spec.pdf · 1.4 MB · 12 pages · PDF/A-2b'
    );

    // Clicking inside dialog does NOT close it
    fireEvent.click(dialog);
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    // Clicking backdrop closes it
    fireEvent.click(screen.getByTestId('quicklook-backdrop'));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(onOpenChange).toHaveBeenLastCalledWith(false);

    // Clicking Quick Look trigger button opens dialog
    fireEvent.click(screen.getByTestId('quicklook-trigger'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    // Escape dismisses dialog
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();

    // Spacebar on root container (non-button) opens dialog
    fireEvent.keyDown(screen.getByTestId('ql-root'), { key: 'Spacebar' });
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    // Spacebar on dialog container dismisses dialog
    fireEvent.keyDown(screen.getByTestId('quicklook-dialog'), { key: ' ' });
    expect(screen.queryByRole('dialog')).toBeNull();

    // Double-clicking a card selects & opens it, then Close button dismisses it
    fireEvent.doubleClick(screen.getByTestId('quicklook-card-ql-theme-engine'));
    expect(screen.getByRole('dialog', { name: 'themeEngine.ts' })).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('quicklook-close'));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('cycles across all 4 tailored optical previews (image, pdf, audio, code) with Prev/Next, arrows, zoom toggle, audio Play/Pause, and Open in Editor', () => {
    const onOpenExternal = vi.fn<(file: QuickLookFileItem) => void>();
    const onActiveIndexChange = vi.fn<(index: number, file: QuickLookFileItem) => void>();

    render(
      <QuickLookPreviewer
        defaultOpen
        onOpenExternal={onOpenExternal}
        onActiveIndexChange={onActiveIndexChange}
      />
    );

    // 1. Image fallback preview + Fit / 100% zoom toggle
    expect(screen.getByTestId('quicklook-counter')).toHaveTextContent('1 / 4');
    expect(screen.getByTestId('quicklook-image-fallback')).toHaveAttribute(
      'data-zoom-mode',
      'fit'
    );
    const zoomToggle = screen.getByTestId('quicklook-zoom-toggle');
    expect(zoomToggle).toHaveAttribute('aria-pressed', 'false');
    expect(zoomToggle).toHaveTextContent('Fit');

    fireEvent.click(zoomToggle);
    expect(zoomToggle).toHaveAttribute('aria-pressed', 'true');
    expect(zoomToggle).toHaveTextContent('100%');
    expect(screen.getByTestId('quicklook-image-fallback')).toHaveAttribute(
      'data-zoom-mode',
      '100%'
    );

    // 2. Navigate Next -> PDF preview with page badge
    fireEvent.click(screen.getByTestId('quicklook-next'));
    expect(screen.getByTestId('quicklook-counter')).toHaveTextContent('2 / 4');
    expect(screen.getByTestId('quicklook-pdf-preview')).toBeInTheDocument();
    expect(screen.getByTestId('quicklook-pdf-badge')).toHaveTextContent('Page 1 of 12');

    // 3. Navigate ArrowRight -> Audio preview with SVG waveform + Play/Pause toggle
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(screen.getByTestId('quicklook-counter')).toHaveTextContent('3 / 4');
    const waveform = screen.getByTestId('quicklook-audio-waveform');
    expect(waveform).toHaveAttribute('viewBox', '0 0 480 120');
    expect(waveform.querySelectorAll('rect').length).toBe(32);

    const audioToggle = screen.getByTestId('quicklook-audio-toggle');
    expect(audioToggle).toHaveAttribute('aria-pressed', 'false');
    expect(audioToggle).toHaveTextContent('Play');

    // Spacebar on focused Play button inside dialog does NOT dismiss the dialog
    fireEvent.keyDown(audioToggle, { key: ' ' });
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    fireEvent.click(audioToggle);
    expect(audioToggle).toHaveAttribute('aria-pressed', 'true');
    expect(audioToggle).toHaveTextContent('Pause');
    expect(screen.getByTestId('quicklook-audio-preview')).toHaveTextContent('Playing');

    // 4. Navigate Next -> Code preview with syntax frame & monospace <pre><code>
    fireEvent.click(screen.getByTestId('quicklook-next'));
    expect(screen.getByTestId('quicklook-counter')).toHaveTextContent('4 / 4');
    expect(screen.getByTestId('quicklook-code-language')).toHaveTextContent('typescript');
    const codeEl = screen.getByTestId('quicklook-code-content');
    expect(codeEl.tagName.toLowerCase()).toBe('code');
    expect(codeEl.closest('pre')).not.toBeNull();
    expect(codeEl).toHaveTextContent('buildOpticalPreset');

    // Open in Editor invokes callback with active file
    fireEvent.click(screen.getByTestId('quicklook-open-external'));
    expect(onOpenExternal).toHaveBeenCalledTimes(1);
    expect(onOpenExternal).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: 'ql-theme-engine', name: 'themeEngine.ts' })
    );

    // Wrap-around Next -> back to 1 / 4 (zoom reset to Fit)
    fireEvent.click(screen.getByTestId('quicklook-next'));
    expect(screen.getByTestId('quicklook-counter')).toHaveTextContent('1 / 4');
    expect(screen.getByTestId('quicklook-zoom-toggle')).toHaveAttribute('aria-pressed', 'false');

    // Wrap-around ArrowLeft -> jumps from 0 to 3 (4 / 4)
    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    expect(screen.getByTestId('quicklook-counter')).toHaveTextContent('4 / 4');
    expect(onActiveIndexChange).toHaveBeenLastCalledWith(
      3,
      expect.objectContaining({ id: 'ql-theme-engine' })
    );

    // Prev button returns to Audio with playing state reset to false
    fireEvent.click(screen.getByTestId('quicklook-prev'));
    expect(screen.getByTestId('quicklook-audio-toggle')).toHaveAttribute('aria-pressed', 'false');
  });

  it('renders Quick Look panel directly in inline mode with keyboard arrow navigation', () => {
    const onActiveIndexChange = vi.fn<(index: number, file: QuickLookFileItem) => void>();

    render(
      <QuickLookPreviewer
        mode="inline"
        defaultActiveIndex={0}
        onActiveIndexChange={onActiveIndexChange}
        data-testid="ql-inline"
      />
    );

    const root = screen.getByTestId('ql-inline');
    expect(root).toHaveAttribute('role', 'region');
    expect(root).toHaveAttribute('data-mode', 'inline');
    expect(root).toHaveAttribute('data-open', 'true');
    expect(root).toHaveClass('prism-slab');

    // No modal dialog, backdrop, file strip, or close button in inline mode
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.queryByTestId('quicklook-file-strip')).toBeNull();
    expect(screen.queryByTestId('quicklook-close')).toBeNull();

    // Inline ArrowRight / ArrowLeft cycles files
    fireEvent.keyDown(root, { key: 'ArrowRight' });
    expect(screen.getByTestId('quicklook-title')).toHaveTextContent('Architecture_Spec.pdf');
    expect(onActiveIndexChange).toHaveBeenLastCalledWith(
      1,
      expect.objectContaining({ id: 'ql-architecture-spec' })
    );

    fireEvent.keyDown(root, { key: 'ArrowLeft' });
    expect(screen.getByTestId('quicklook-title')).toHaveTextContent('Prism_Poster.png');

    // Unrelated key does nothing
    fireEvent.keyDown(root, { key: 'Tab' });
    expect(screen.getByTestId('quicklook-title')).toHaveTextContent('Prism_Poster.png');
  });

  it('sanitizes image src URLs, renders valid raster images with Fit/100% zoom, and blocks unsafe protocols', () => {
    const customFiles: ReadonlyArray<QuickLookFileItem> = [
      {
        id: 'safe-img',
        name: 'Studio_Render.png',
        kind: 'image',
        sizeLabel: '2.1 MB',
        src: SAFE_DATA_PNG,
      },
      {
        id: 'evil-img',
        name: 'Untrusted_Link.png',
        kind: 'image',
        sizeLabel: '512 KB',
        src: 'javascript:alert(1)',
      },
      {
        id: 'svg-xss-img',
        name: 'Vector_Xss.png',
        kind: 'image',
        sizeLabel: '98 KB',
        src: 'data:image/svg+xml;base64,PHN2Zz48c2NyaXB0PmFsZXJ0KDEpPC9zY3JpcHQ+PC9zdmc+',
      },
    ];

    render(<QuickLookPreviewer mode="inline" files={customFiles} />);

    // Valid raster data URI renders <img> with Fit -> 100% toggle
    const img = screen.getByTestId('quicklook-image');
    expect(img).toHaveAttribute('src', SAFE_DATA_PNG);
    expect(img).toHaveAttribute('alt', 'Studio_Render.png');
    expect(img).toHaveAttribute('data-zoom-mode', 'fit');
    // Metadata omits optional dimensionsOrMeta cleanly
    expect(screen.getByTestId('quicklook-metadata')).toHaveTextContent('Studio_Render.png · 2.1 MB');

    fireEvent.click(screen.getByTestId('quicklook-zoom-toggle'));
    expect(img).toHaveAttribute('data-zoom-mode', '100%');

    // javascript: URL is blocked -> zero <img> rendered, optical vector fallback + status alert shown
    fireEvent.click(screen.getByTestId('quicklook-next'));
    expect(screen.queryByTestId('quicklook-image')).toBeNull();
    expect(screen.getByTestId('quicklook-image-fallback')).toBeInTheDocument();
    expect(screen.getByTestId('quicklook-image-blocked')).toHaveTextContent(
      'Untrusted image URL blocked'
    );

    // data:image/svg+xml is also blocked by sanitizeUrl(src, true)
    fireEvent.click(screen.getByTestId('quicklook-next'));
    expect(screen.queryByTestId('quicklook-image')).toBeNull();
    expect(screen.getByTestId('quicklook-image-blocked')).toBeInTheDocument();
  });

  it('renders literal XSS payloads safely in code, PDF, and metadata without HTML injection, and supports fallback content', () => {
    const xssPayload = '<script>window.__qlXss=1</script><img src=x onerror=alert(1)>';
    const customFiles: ReadonlyArray<QuickLookFileItem> = [
      {
        id: 'xss-code',
        name: xssPayload,
        kind: 'code',
        sizeLabel: '1.1 KB',
        dimensionsOrMeta: xssPayload,
        content: `const payload = "${xssPayload}";`,
      },
      {
        id: 'minimal-code',
        name: 'empty.txt',
        kind: 'code',
        sizeLabel: '0 B',
      },
      {
        id: 'minimal-pdf',
        name: 'Brief.pdf',
        kind: 'pdf',
        sizeLabel: '240 KB',
      },
      {
        id: 'xss-pdf',
        name: 'Audit.pdf',
        kind: 'pdf',
        sizeLabel: '320 KB',
        dimensionsOrMeta: 'A4 portrait',
        content: `${xssPayload}\nSecond line literal`,
      },
    ];

    render(<QuickLookPreviewer mode="inline" files={customFiles} />);

    expect(document.querySelector('script')).toBeNull();
    expect(document.querySelector('img')).toBeNull();
    expect(screen.getByTestId('quicklook-code-language')).toHaveTextContent('plaintext');
    expect(screen.getByTestId('quicklook-code-content')).toHaveTextContent(xssPayload);
    expect(screen.getByTestId('quicklook-metadata')).toHaveTextContent(xssPayload);

    // Fallback code content when content is omitted
    fireEvent.click(screen.getByTestId('quicklook-next'));
    expect(screen.getByTestId('quicklook-code-content')).toHaveTextContent(
      '// No source text supplied for this file preview.'
    );

    // Minimal PDF fallback content & Page 1 badge when dimensionsOrMeta omitted
    fireEvent.click(screen.getByTestId('quicklook-next'));
    expect(screen.getByTestId('quicklook-pdf-badge')).toHaveTextContent('Page 1');
    expect(screen.getByTestId('quicklook-pdf-preview')).toHaveTextContent(
      'Optical Document Preview'
    );

    // PDF with non-page dimensionsOrMeta + XSS payload rendered as literal text
    fireEvent.click(screen.getByTestId('quicklook-next'));
    expect(screen.getByTestId('quicklook-pdf-badge')).toHaveTextContent('Page 1');
    expect(screen.getByTestId('quicklook-pdf-preview')).toHaveTextContent(xssPayload);
    expect(document.querySelector('script')).toBeNull();
  });

  it('guards all keyboard shortcuts against IME composition and respects consumer onKeyDown preventDefault', () => {
    const onOpenChange = vi.fn<(open: boolean) => void>();
    const onActiveIndexChange = vi.fn<(index: number, file: QuickLookFileItem) => void>();

    render(
      <QuickLookPreviewer
        onOpenChange={onOpenChange}
        onActiveIndexChange={onActiveIndexChange}
        data-testid="ql-ime"
      />
    );

    const root = screen.getByTestId('ql-ime');
    const card = screen.getByTestId('quicklook-card-ql-prism-poster');

    // Card Spacebar / arrows while composing are ignored; unrelated key is ignored
    fireEvent.keyDown(card, { key: ' ', isComposing: true });
    fireEvent.keyDown(card, { key: 'ArrowRight', isComposing: true });
    fireEvent.keyDown(card, { key: 'Tab' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(onActiveIndexChange).not.toHaveBeenCalled();

    // Card ArrowRight / ArrowLeft while NOT composing cycle selection
    fireEvent.keyDown(card, { key: 'ArrowRight' });
    expect(onActiveIndexChange).toHaveBeenLastCalledWith(
      1,
      expect.objectContaining({ id: 'ql-architecture-spec' })
    );
    fireEvent.keyDown(card, { key: 'ArrowLeft' });
    expect(onActiveIndexChange).toHaveBeenLastCalledWith(
      0,
      expect.objectContaining({ id: 'ql-prism-poster' })
    );

    // Root ArrowRight / ArrowLeft while closed cycle selection, unrelated key & IME composing ignored
    fireEvent.keyDown(root, { key: ' ', isComposing: true });
    fireEvent.keyDown(root, { key: 'Tab' });
    expect(screen.queryByRole('dialog')).toBeNull();
    fireEvent.keyDown(root, { key: 'ArrowRight' });
    expect(onActiveIndexChange).toHaveBeenLastCalledWith(
      1,
      expect.objectContaining({ id: 'ql-architecture-spec' })
    );
    fireEvent.keyDown(root, { key: 'ArrowLeft' });
    expect(onActiveIndexChange).toHaveBeenLastCalledWith(
      0,
      expect.objectContaining({ id: 'ql-prism-poster' })
    );

    // Open modal, then verify IME composing & unrelated keys on window are ignored
    fireEvent.click(screen.getByTestId('quicklook-trigger'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'Escape', isComposing: true });
    fireEvent.keyDown(window, { key: ' ', isComposing: true });
    fireEvent.keyDown(window, { key: 'ArrowRight', isComposing: true });
    fireEvent.keyDown(window, { key: 'Tab' });
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByTestId('quicklook-counter')).toHaveTextContent('1 / 4');

    // Spacebar on Quick Look trigger button while closed should not double-trigger root Spacebar
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    fireEvent.keyDown(screen.getByTestId('quicklook-trigger'), { key: ' ' });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('respects consumer onKeyDown preventDefault and supports controlled open/activeIndex and clamping', () => {
    const onOpenChange = vi.fn<(open: boolean) => void>();
    const onActiveIndexChange = vi.fn<(index: number, file: QuickLookFileItem) => void>();
    const onKeyDown = vi.fn((e: { preventDefault: () => void }) => e.preventDefault());

    const { rerender } = render(
      <QuickLookPreviewer
        open={false}
        activeIndex={99}
        onOpenChange={onOpenChange}
        onActiveIndexChange={onActiveIndexChange}
        onKeyDown={onKeyDown}
        data-testid="ql-controlled"
      />
    );

    // Out-of-bounds activeIndex=99 clamps to index 3 (themeEngine.ts)
    expect(screen.getByTestId('quicklook-card-ql-theme-engine')).toHaveAttribute(
      'aria-pressed',
      'true'
    );

    // Consumer onKeyDown called preventDefault -> Spacebar does not trigger onOpenChange
    fireEvent.keyDown(screen.getByTestId('ql-controlled'), { key: ' ' });
    expect(onKeyDown).toHaveBeenCalledTimes(1);
    expect(onOpenChange).not.toHaveBeenCalled();

    // Clicking trigger notifies controlled parent but remains closed until parent updates open
    fireEvent.click(screen.getByTestId('quicklook-trigger'));
    expect(onOpenChange).toHaveBeenLastCalledWith(true);
    expect(screen.queryByRole('dialog')).toBeNull();

    // Rerender with open={true} and NaN activeIndex (clamps to 0)
    rerender(
      <QuickLookPreviewer
        open={true}
        activeIndex={Number.NaN}
        onOpenChange={onOpenChange}
        onActiveIndexChange={onActiveIndexChange}
        data-testid="ql-controlled"
      />
    );

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByTestId('quicklook-title')).toHaveTextContent('Prism_Poster.png');

    // Request next notifies parent with index 1 while remaining at 0 until controlled prop updates
    fireEvent.click(screen.getByTestId('quicklook-next'));
    expect(onActiveIndexChange).toHaveBeenLastCalledWith(
      1,
      expect.objectContaining({ id: 'ql-architecture-spec' })
    );
  });

  it('handles single-file arrays and clean role="status" empty state gracefully', () => {
    const onActiveIndexChange = vi.fn<(index: number, file: QuickLookFileItem) => void>();
    const singleFile: ReadonlyArray<QuickLookFileItem> = [
      {
        id: 'solo-audio',
        name: 'Solo_Cue.wav',
        kind: 'audio',
        sizeLabel: '9.4 MB',
      },
    ];

    const { rerender } = render(
      <QuickLookPreviewer
        files={singleFile}
        defaultOpen
        onActiveIndexChange={onActiveIndexChange}
        data-testid="ql-edge"
      />
    );

    // Singular "1 file" badge and disabled Prev/Next controls
    expect(screen.getByTestId('ql-edge')).toHaveTextContent('1 file');
    const prevBtn = screen.getByTestId('quicklook-prev');
    const nextBtn = screen.getByTestId('quicklook-next');
    expect(prevBtn).toBeDisabled();
    expect(nextBtn).toBeDisabled();

    // Arrow navigation is a clean no-op with a single file
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    expect(onActiveIndexChange).not.toHaveBeenCalled();

    // Empty files array renders clean role="status" empty state and never mounts dialog
    rerender(<QuickLookPreviewer files={[]} open data-testid="ql-edge" />);
    const root = screen.getByTestId('ql-edge');
    expect(root).toHaveAttribute('data-empty', 'true');
    expect(screen.queryByRole('dialog')).toBeNull();
    const emptyStatus = screen.getByTestId('quicklook-empty');
    expect(emptyStatus).toHaveAttribute('role', 'status');
    expect(emptyStatus).toHaveTextContent('No files to preview');

    // Keydown on empty root does not throw
    fireEvent.keyDown(root, { key: ' ' });
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
