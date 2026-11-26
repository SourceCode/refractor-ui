import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import {
  DocumentPageViewer,
  type DocumentViewerPage,
  type DocumentZoomPresetMap,
} from './index';

describe('DocumentPageViewer', () => {
  it('satisfies Open-Internals contracts, forwards React 19 ref, applies theme overrides, and renders 4 default optical spec pages', () => {
    const ref = createRef<HTMLDivElement>();
    const zoomMapCheck: DocumentZoomPresetMap = {
      75: true,
      100: true,
      125: true,
      150: true,
    };
    expect(
      zoomMapCheck[75] && zoomMapCheck[100] && zoomMapCheck[125] && zoomMapCheck[150]
    ).toBe(true);

    render(
      <PrismThemeProvider
        theme={{
          components: {
            DocumentPageViewer: {
              className: 'theme-doc-viewer-override',
              style: { maxWidth: '960px' },
            },
          },
        }}
      >
        <DocumentPageViewer
          ref={ref}
          className="local-doc-viewer-class"
          xstyle={{ '--prism-blur-px': '20px' }}
          style={{ marginTop: '12px' }}
          data-testid="doc-root"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('doc-root');
    expect(ref.current).toBe(root);
    expect(DocumentPageViewer.displayName).toBe('DocumentPageViewer');
    expect(root).toHaveClass(
      'refractor-document-page-viewer',
      'prism-slab',
      'theme-doc-viewer-override',
      'local-doc-viewer-class'
    );
    expect(root).toHaveAttribute('data-page', '1');
    expect(root).toHaveAttribute('data-zoom', '100');
    expect(root).toHaveAttribute('data-thumbnails', 'true');
    expect(root).not.toHaveAttribute('data-searching');
    expect(root).not.toHaveAttribute('data-empty');
    expect(root).toHaveStyle({ maxWidth: '960px', marginTop: '12px' });

    expect(screen.getByTestId('document-viewer-title')).toHaveTextContent(
      'Refractor_Optical_Spec_v2.pdf'
    );
    expect(screen.getByTestId('document-viewer-page-total')).toHaveTextContent('/ 4');
    expect(screen.getByTestId('document-viewer-page-heading')).toHaveTextContent(
      'Optical Glass Design System Architecture'
    );
    expect(screen.getByTestId('document-viewer-section')).toHaveTextContent(
      'Section 1.0 · Overview'
    );
    expect(screen.getByTestId('document-viewer-page-badge')).toHaveTextContent('Page 1 / 4');

    // All 4 miniature thumbnails are mounted and Page 1 is active
    expect(screen.getByTestId('document-viewer-thumb-1')).toHaveAttribute('aria-current', 'page');
    expect(screen.getByTestId('document-viewer-thumb-2')).not.toHaveAttribute('aria-current');
    expect(screen.getByTestId('document-viewer-thumb-3')).toBeInTheDocument();
    expect(screen.getByTestId('document-viewer-thumb-4')).toBeInTheDocument();

    // Polite live status region announces active page & zoom
    const status = screen.getByTestId('document-viewer-status');
    expect(status).toHaveAttribute('aria-live', 'polite');
    expect(status).toHaveTextContent(
      'Page 1 of 4 · Optical Glass Design System Architecture · 100%'
    );
  });

  it('toggles collapsible miniature thumbnails rail via aria-pressed and navigates by thumbnail click', () => {
    const onPageChange = vi.fn<(pageNumber: number) => void>();

    const { rerender } = render(
      <DocumentPageViewer onPageChange={onPageChange} data-testid="doc-thumbs" />
    );

    const toggleBtn = screen.getByTestId('document-viewer-thumbnails-toggle');
    expect(toggleBtn).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('document-viewer-thumbnails')).toBeInTheDocument();

    // Clicking Page 3 thumbnail navigates and fires onPageChange
    fireEvent.click(screen.getByTestId('document-viewer-thumb-3'));
    expect(onPageChange).toHaveBeenCalledTimes(1);
    expect(onPageChange).toHaveBeenLastCalledWith(3);
    expect(screen.getByTestId('document-viewer-thumb-3')).toHaveAttribute('aria-current', 'page');
    expect(screen.getByTestId('document-viewer-page-heading')).toHaveTextContent(
      'Open-Internals & Keyboard Ergonomics'
    );

    // Clicking already-active Page 3 thumbnail does not fire redundant callback
    fireEvent.click(screen.getByTestId('document-viewer-thumb-3'));
    expect(onPageChange).toHaveBeenCalledTimes(1);

    // Collapse thumbnails rail
    fireEvent.click(toggleBtn);
    expect(toggleBtn).toHaveAttribute('aria-pressed', 'false');
    expect(screen.queryByTestId('document-viewer-thumbnails')).toBeNull();
    expect(screen.getByTestId('doc-thumbs')).not.toHaveAttribute('data-thumbnails');

    // Expand thumbnails rail again
    fireEvent.click(toggleBtn);
    expect(toggleBtn).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('document-viewer-thumbnails')).toBeInTheDocument();

    // Separate instance honoring defaultShowThumbnails={false}
    rerender(<DocumentPageViewer key="collapsed-default" defaultShowThumbnails={false} />);
    expect(screen.getByTestId('document-viewer-thumbnails-toggle')).toHaveAttribute(
      'aria-pressed',
      'false'
    );
    expect(screen.queryByTestId('document-viewer-thumbnails')).toBeNull();
  });

  it('supports Prev/Next buttons, IME-safe numeric page jump input, clamping, and invalid input reset', () => {
    const onPageChange = vi.fn<(pageNumber: number) => void>();

    render(<DocumentPageViewer onPageChange={onPageChange} />);

    const prevBtn = screen.getByTestId('document-viewer-prev');
    const nextBtn = screen.getByTestId('document-viewer-next');
    const jumpInput = screen.getByLabelText('Jump to page') as HTMLInputElement;

    expect(prevBtn).toBeDisabled();
    expect(nextBtn).not.toBeDisabled();
    expect(jumpInput.value).toBe('1');

    // Next -> Page 2, Prev -> Page 1
    fireEvent.click(nextBtn);
    expect(onPageChange).toHaveBeenLastCalledWith(2);
    expect(jumpInput.value).toBe('2');
    expect(prevBtn).not.toBeDisabled();

    fireEvent.click(prevBtn);
    expect(onPageChange).toHaveBeenLastCalledWith(1);
    expect(jumpInput.value).toBe('1');
    expect(prevBtn).toBeDisabled();

    // Enter while IME composing MUST be ignored
    fireEvent.change(jumpInput, { target: { value: '4' } });
    fireEvent.keyDown(jumpInput, { key: 'Enter', isComposing: true });
    expect(screen.getByTestId('document-viewer-page-badge')).toHaveTextContent('Page 1 / 4');
    expect(onPageChange).toHaveBeenCalledTimes(2);

    // Non-Enter key does not commit
    fireEvent.keyDown(jumpInput, { key: 'Escape' });
    expect(screen.getByTestId('document-viewer-page-badge')).toHaveTextContent('Page 1 / 4');

    // Non-composing Enter commits jump to Page 4
    fireEvent.keyDown(jumpInput, { key: 'Enter' });
    expect(onPageChange).toHaveBeenLastCalledWith(4);
    expect(screen.getByTestId('document-viewer-page-badge')).toHaveTextContent('Page 4 / 4');
    expect(nextBtn).toBeDisabled();

    // Out-of-bounds high number clamps to 4 and snaps input back to "4"
    fireEvent.change(jumpInput, { target: { value: '99' } });
    fireEvent.keyDown(jumpInput, { key: 'Enter' });
    expect(jumpInput.value).toBe('4');
    expect(onPageChange).toHaveBeenCalledTimes(3);

    // Out-of-bounds low number clamps to 1
    fireEvent.change(jumpInput, { target: { value: '0' } });
    fireEvent.keyDown(jumpInput, { key: 'Enter' });
    expect(jumpInput.value).toBe('1');
    expect(onPageChange).toHaveBeenLastCalledWith(1);

    // Empty / invalid input on blur snaps back to current page without firing onPageChange
    fireEvent.change(jumpInput, { target: { value: '' } });
    fireEvent.blur(jumpInput);
    expect(jumpInput.value).toBe('1');
    expect(onPageChange).toHaveBeenCalledTimes(4);
  });

  it('scales the optical paper-glass reading canvas smoothly across 75%, 100%, 125%, and 150% zoom presets and +/- steps', () => {
    render(<DocumentPageViewer defaultZoomPct={125} data-testid="doc-zoom" />);

    const root = screen.getByTestId('doc-zoom');
    const canvas = screen.getByTestId('document-viewer-canvas');
    const zoomOutBtn = screen.getByTestId('document-viewer-zoom-out');
    const zoomInBtn = screen.getByTestId('document-viewer-zoom-in');

    // Starts at defaultZoomPct=125
    expect(root).toHaveAttribute('data-zoom', '125');
    expect(canvas).toHaveAttribute('data-zoom-pct', '125');
    expect(canvas).toHaveStyle({ width: '775px', fontSize: '20px' });
    expect(canvas.style.maxWidth).toBe('none');
    expect(screen.getByTestId('document-viewer-zoom-125')).toHaveAttribute('aria-pressed', 'true');

    // Step in: 125 -> 150 (Zoom in becomes disabled)
    fireEvent.click(zoomInBtn);
    expect(canvas).toHaveAttribute('data-zoom-pct', '150');
    expect(canvas).toHaveStyle({ width: '930px', fontSize: '24px' });
    expect(canvas.style.maxWidth).toBe('none');
    expect(zoomInBtn).toBeDisabled();

    // Step out: 150 -> 125 -> 100 -> 75 (Zoom out becomes disabled)
    fireEvent.click(zoomOutBtn);
    expect(canvas).toHaveAttribute('data-zoom-pct', '125');

    fireEvent.click(zoomOutBtn);
    expect(canvas).toHaveAttribute('data-zoom-pct', '100');
    expect(canvas).toHaveStyle({ width: '620px', fontSize: '16px' });
    expect(canvas.style.maxWidth).toBe('100%');

    fireEvent.click(zoomOutBtn);
    expect(canvas).toHaveAttribute('data-zoom-pct', '75');
    expect(canvas).toHaveStyle({ width: '465px', fontSize: '12px' });
    expect(canvas.style.maxWidth).toBe('100%');
    expect(zoomOutBtn).toBeDisabled();

    // Step back up from 75 -> 100 -> 125 -> 150 via Zoom in
    fireEvent.click(zoomInBtn);
    expect(canvas).toHaveAttribute('data-zoom-pct', '100');
    fireEvent.click(zoomInBtn);
    expect(canvas).toHaveAttribute('data-zoom-pct', '125');
    fireEvent.click(zoomInBtn);
    expect(canvas).toHaveAttribute('data-zoom-pct', '150');

    // Direct preset pill selection
    fireEvent.click(screen.getByTestId('document-viewer-zoom-75'));
    expect(screen.getByTestId('document-viewer-zoom-75')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('document-viewer-zoom-150')).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByTestId('document-viewer-status')).toHaveTextContent('75%');
  });

  it('highlights literal search matches with <mark> spans, announces live match counts, jumps across pages, and guards IME search keys', () => {
    const onPageChange = vi.fn<(pageNumber: number) => void>();

    render(<DocumentPageViewer onPageChange={onPageChange} data-testid="doc-search" />);

    const searchInput = screen.getByLabelText('Search document text') as HTMLInputElement;
    expect(searchInput.type).toBe('search');

    // Pressing Escape when empty is a clean no-op
    fireEvent.keyDown(searchInput, { key: 'Escape' });
    expect(screen.queryByTestId('document-viewer-search-meta')).toBeNull();

    // Search "caustic" (appears on Page 1 and Page 2 across title + paragraphs)
    fireEvent.change(searchInput, { target: { value: 'caustic' } });
    expect(screen.getByTestId('doc-search')).toHaveAttribute('data-searching', 'true');
    expect(screen.getByTestId('document-viewer-match-count')).toHaveTextContent('3 matches');
    expect(screen.getByTestId('document-viewer-status')).toHaveTextContent('3 matches (1 of 3)');

    // Thumbnail match badges reflect per-page match counts
    expect(screen.getByTestId('document-viewer-thumb-matches-1')).toHaveTextContent('1');
    expect(screen.getByTestId('document-viewer-thumb-matches-2')).toHaveTextContent('2');
    expect(screen.queryByTestId('document-viewer-thumb-matches-3')).toBeNull();

    // Page 1 renders literal <mark> with active match highlight
    const page1Marks = screen.getByTestId('document-viewer-canvas').querySelectorAll('mark');
    expect(page1Marks.length).toBe(1);
    expect(page1Marks[0]).toHaveAttribute('data-active-match', 'true');
    expect(page1Marks[0]?.textContent?.toLowerCase()).toBe('caustic');

    // IME composing Enter & non-matching keys in search input are ignored
    fireEvent.keyDown(searchInput, { key: 'Enter', isComposing: true });
    fireEvent.keyDown(searchInput, { key: 'Tab' });
    expect(screen.getByTestId('document-viewer-page-badge')).toHaveTextContent('Page 1 / 4');

    // Click "jump to next match" -> advances to Match 2 on Page 2
    const nextMatchBtn = screen.getByTestId('document-viewer-next-match');
    fireEvent.click(nextMatchBtn);
    expect(onPageChange).toHaveBeenLastCalledWith(2);
    expect(screen.getByTestId('document-viewer-page-badge')).toHaveTextContent('Page 2 / 4');
    expect(screen.getByTestId('document-viewer-status')).toHaveTextContent('3 matches (2 of 3)');

    const page2Marks = screen.getByTestId('document-viewer-canvas').querySelectorAll('mark');
    expect(page2Marks.length).toBe(2);
    expect(page2Marks[0]).toHaveAttribute('data-active-match', 'true');
    expect(page2Marks[1]).not.toHaveAttribute('data-active-match');

    // Pressing Enter in search input advances to Match 3 (still on Page 2)
    fireEvent.keyDown(searchInput, { key: 'Enter' });
    expect(screen.getByTestId('document-viewer-status')).toHaveTextContent('3 matches (3 of 3)');
    expect(page2Marks[1]).toHaveAttribute('data-active-match', 'true');

    // Clicking "jump to next match" wraps around back to Match 1 on Page 1
    fireEvent.click(nextMatchBtn);
    expect(onPageChange).toHaveBeenLastCalledWith(1);
    expect(screen.getByTestId('document-viewer-status')).toHaveTextContent('3 matches (1 of 3)');

    // Search a term present ONLY on Page 4 while viewing Page 1 -> jumps straight to Page 4
    fireEvent.change(searchInput, { target: { value: 'ReDoS' } });
    expect(screen.getByTestId('document-viewer-match-count')).toHaveTextContent('1 match');
    expect(screen.getByTestId('document-viewer-status')).toHaveTextContent('1 match (1 of 1)');
    fireEvent.click(screen.getByTestId('document-viewer-next-match'));
    expect(onPageChange).toHaveBeenLastCalledWith(4);
    expect(screen.getByTestId('document-viewer-page-badge')).toHaveTextContent('Page 4 / 4');

    // Zero matches state disables jump button and handles Enter cleanly
    fireEvent.change(searchInput, { target: { value: 'nonexistent-optical-token' } });
    expect(screen.getByTestId('document-viewer-match-count')).toHaveTextContent('0 matches');
    expect(screen.getByTestId('document-viewer-next-match')).toBeDisabled();
    expect(screen.getByTestId('document-viewer-status')).toHaveTextContent('0 matches');
    fireEvent.keyDown(searchInput, { key: 'Enter' });
    expect(screen.getByTestId('document-viewer-page-badge')).toHaveTextContent('Page 4 / 4');

    // Escape clears search query and removes highlights
    fireEvent.keyDown(searchInput, { key: 'Escape' });
    expect(searchInput.value).toBe('');
    expect(screen.queryByTestId('document-viewer-search-meta')).toBeNull();
    expect(screen.getByTestId('document-viewer-canvas').querySelectorAll('mark').length).toBe(0);

    // Clear button also resets search query
    fireEvent.change(searchInput, { target: { value: 'Refractor' } });
    fireEvent.click(screen.getByTestId('document-viewer-search-clear'));
    expect(searchInput.value).toBe('');
    expect(screen.queryByTestId('document-viewer-search-clear')).toBeNull();
  });

  it('supports controlled page prop with clamping for out-of-range and NaN values', () => {
    const onPageChange = vi.fn<(pageNumber: number) => void>();

    const { rerender } = render(
      <DocumentPageViewer page={1} onPageChange={onPageChange} data-testid="doc-ctrl" />
    );

    const jumpInput = screen.getByLabelText('Jump to page') as HTMLInputElement;

    // Requesting page 3 in controlled mode notifies parent without mutating until parent updates prop
    fireEvent.change(jumpInput, { target: { value: '3' } });
    fireEvent.keyDown(jumpInput, { key: 'Enter' });
    expect(onPageChange).toHaveBeenLastCalledWith(3);
    expect(screen.getByTestId('document-viewer-page-badge')).toHaveTextContent('Page 1 / 4');
    expect(jumpInput.value).toBe('1');

    // Parent updates controlled page to 99 -> clamps safely to Page 4
    rerender(<DocumentPageViewer page={99} onPageChange={onPageChange} data-testid="doc-ctrl" />);
    expect(screen.getByTestId('document-viewer-page-badge')).toHaveTextContent('Page 4 / 4');
    expect(jumpInput.value).toBe('4');

    // Parent passes NaN -> clamps safely to Page 1
    rerender(
      <DocumentPageViewer page={Number.NaN} onPageChange={onPageChange} data-testid="doc-ctrl" />
    );
    expect(screen.getByTestId('document-viewer-page-badge')).toHaveTextContent('Page 1 / 4');
    expect(jumpInput.value).toBe('1');
  });

  it('defends against XSS payloads and regex metacharacters/ReDoS, handles sparse pages, and renders role="status" empty state for []', () => {
    const xssPayload = '<script>window.__docXss=1</script><img src=x onerror=alert(1)>';
    const redosPayload = '(a+)+$';
    const customPages: ReadonlyArray<DocumentViewerPage> = [
      {
        pageNumber: 10,
        section: `Audit ${redosPayload}`,
        title: `Security ${xssPayload}`,
        paragraphs: [
          `Literal expression ${redosPayload} and ${xssPayload} must never execute or trigger ReDoS.`,
        ],
      },
      {
        pageNumber: 11,
        title: 'Blank Appendix Sheet',
        paragraphs: [],
      },
    ];

    const { rerender } = render(
      <DocumentPageViewer
        pages={customPages}
        documentTitle={`Report_${xssPayload}.pdf`}
        data-testid="doc-sec"
      />
    );

    // Zero injected <script> or <img> DOM elements
    expect(document.querySelector('script')).toBeNull();
    expect(document.querySelector('img')).toBeNull();
    expect(screen.getByTestId('document-viewer-title')).toHaveTextContent(xssPayload);
    expect(screen.getByTestId('document-viewer-page-badge')).toHaveTextContent('Page 10 / 2');

    // Literal search for regex metacharacters / ReDoS completes safely and highlights <mark>
    const searchInput = screen.getByLabelText('Search document text');
    const startMs = performance.now();
    fireEvent.change(searchInput, { target: { value: redosPayload } });
    const elapsedMs = performance.now() - startMs;
    expect(elapsedMs).toBeLessThan(200);
    expect(screen.getByTestId('document-viewer-match-count')).toHaveTextContent('2 matches');
    const marks = screen.getByTestId('document-viewer-canvas').querySelectorAll('mark');
    expect(marks.length).toBe(2);
    expect(marks[0]).toHaveTextContent(redosPayload);

    // Navigate to sparse page (no section, empty paragraphs)
    fireEvent.click(screen.getByTestId('document-viewer-next'));
    expect(screen.queryByTestId('document-viewer-section')).toBeNull();
    expect(screen.getByTestId('document-viewer-blank-page')).toHaveTextContent(
      'This page contains no body text.'
    );
    expect(screen.getByTestId('document-viewer-thumb-2')).toHaveTextContent('Blank Appendix Sheet');

    // Empty pages=[] renders clean role="status" empty state
    rerender(
      <DocumentPageViewer
        pages={[]}
        documentTitle="Empty_Spec.pdf"
        data-testid="doc-sec"
      />
    );
    const root = screen.getByTestId('doc-sec');
    expect(root).toHaveAttribute('data-empty', 'true');
    expect(root).not.toHaveAttribute('data-page');
    const emptyStatus = screen.getByTestId('document-viewer-empty');
    expect(emptyStatus).toHaveAttribute('role', 'status');
    expect(emptyStatus).toHaveTextContent('No document pages available');
    expect(emptyStatus).toHaveTextContent('Empty_Spec.pdf');
    expect(screen.queryByRole('toolbar')).toBeNull();
  });
});
