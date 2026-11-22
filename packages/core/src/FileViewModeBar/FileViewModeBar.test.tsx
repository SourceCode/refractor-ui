import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import {
  FileViewModeBar as BarrelFileViewModeBar,
  type FileViewModeIdMap,
} from './index';
import {
  FileViewModeBar,
  type FileViewModeId,
  type FileViewSampleItem,
} from './FileViewModeBar';

const CUSTOM_ITEMS: ReadonlyArray<FileViewSampleItem> = [
  {
    id: 'poster',
    name: 'optical-poster.png',
    kind: 'image',
    sizeLabel: '3.2 MB',
    modifiedAt: 'Today, 10:15',
  },
  {
    id: 'shader',
    name: 'refraction.wgsl',
    kind: 'code',
    sizeLabel: '12.4 KB',
    modifiedAt: 'Yesterday',
  },
  {
    id: 'spec',
    name: 'glass-guide.pdf',
    kind: 'document',
    sizeLabel: '620 KB',
    modifiedAt: '3 days ago',
  },
  {
    id: 'chime',
    name: 'focus-chime.wav',
    kind: 'audio',
    sizeLabel: '1.8 MB',
    modifiedAt: 'Last week',
  },
];

describe('FileViewModeBar', () => {
  it('renders defaults with radiogroup, zoom slider, polite live status, React 19 ref, and theme overrides', () => {
    const ref = createRef<HTMLDivElement>();
    const modeMapCheck: FileViewModeIdMap = {
      grid: true,
      list: true,
      columns: true,
      gallery: true,
    };
    expect(modeMapCheck.grid).toBe(true);
    expect(modeMapCheck.gallery).toBe(true);

    render(
      <PrismThemeProvider
        theme={{
          components: {
            FileViewModeBar: {
              className: 'theme-view-mode-bar',
              style: { letterSpacing: '0.2px' },
            },
          },
        }}
      >
        <BarrelFileViewModeBar
          ref={ref}
          className="local-view-mode-bar"
          xstyle={{ '--prism-slab-blur-px': '20px' }}
          style={{ marginBottom: '8px' }}
          data-testid="default-bar"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('default-bar');
    expect(ref.current).toBe(root);
    expect(FileViewModeBar.displayName).toBe('FileViewModeBar');
    expect(root).toHaveAttribute('role', 'region');
    expect(root).toHaveAttribute('aria-label', 'File view mode controls');
    expect(root).toHaveClass(
      'refractor-file-view-mode-bar',
      'prism-slab',
      'theme-view-mode-bar',
      'local-view-mode-bar'
    );
    expect(root).toHaveStyle({ letterSpacing: '0.2px', marginBottom: '8px' });
    expect(root.style.getPropertyValue('--prism-slab-blur-px')).toBe('20px');
    expect(root).toHaveAttribute('data-view-mode', 'grid');
    expect(root).toHaveAttribute('data-zoom-px', '96');

    const radiogroup = screen.getByRole('radiogroup', { name: 'File view mode' });
    const radios = within(radiogroup).getAllByRole('radio');
    expect(radios).toHaveLength(4);

    const gridRadio = screen.getByRole('radio', { name: 'Icon Grid' });
    const listRadio = screen.getByRole('radio', { name: 'Compact List' });
    const columnsRadio = screen.getByRole('radio', { name: 'Detailed Columns' });
    const galleryRadio = screen.getByRole('radio', { name: 'Gallery' });

    expect(gridRadio).toHaveAttribute('aria-checked', 'true');
    expect(gridRadio).toHaveAttribute('tabindex', '0');
    expect(listRadio).toHaveAttribute('aria-checked', 'false');
    expect(listRadio).toHaveAttribute('tabindex', '-1');
    expect(columnsRadio).toHaveAttribute('aria-checked', 'false');
    expect(galleryRadio).toHaveAttribute('aria-checked', 'false');

    const slider = screen.getByRole('slider', { name: 'Thumbnail zoom size' });
    expect(slider).toHaveAttribute('min', '48');
    expect(slider).toHaveAttribute('max', '160');
    expect(slider).toHaveAttribute('step', '8');
    expect(slider).toHaveValue('96');
    expect(screen.getByTestId('file-view-zoom-badge')).toHaveTextContent('96px');

    expect(screen.queryByTestId('file-view-preview-stage')).toBeNull();

    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-live', 'polite');
    expect(status).toHaveTextContent('View mode: Icon Grid · Thumbnail size: 96px · 6 files');
  });

  it('switches across all 4 view modes with showPreviewStage enabled, including responsive columns table wrapper and gallery filmstrip selection', () => {
    const onViewModeChange = vi.fn();

    render(
      <FileViewModeBar
        showPreviewStage
        items={CUSTOM_ITEMS}
        aria-label="Workspace View Switcher"
        onViewModeChange={onViewModeChange}
        data-testid="stage-bar"
      />
    );

    expect(screen.getByTestId('stage-bar')).toHaveAttribute(
      'aria-label',
      'Workspace View Switcher'
    );

    // 1. Icon Grid mode: thumbnails scale with zoomPx
    expect(screen.getByTestId('file-view-stage-grid')).toBeInTheDocument();
    const posterThumb = screen.getByTestId('file-view-grid-thumb-poster');
    expect(posterThumb).toHaveStyle({ width: '96px', height: '96px' });

    fireEvent.click(screen.getByRole('button', { name: 'Zoom in' }));
    expect(screen.getByTestId('file-view-zoom-badge')).toHaveTextContent('104px');
    expect(posterThumb).toHaveStyle({ width: '104px', height: '104px' });

    // Clicking already-active radio is a clean no-op
    fireEvent.click(screen.getByRole('radio', { name: 'Icon Grid' }));
    expect(onViewModeChange).not.toHaveBeenCalled();

    // 2. Compact List mode
    fireEvent.click(screen.getByRole('radio', { name: 'Compact List' }));
    expect(onViewModeChange).toHaveBeenLastCalledWith('list');
    const listStage = screen.getByTestId('file-view-stage-list');
    expect(listStage.tagName).toBe('UL');
    expect(screen.getByTestId('file-view-list-row-shader')).toHaveTextContent('refraction.wgsl');
    expect(screen.getByTestId('file-view-list-row-shader')).toHaveTextContent('12.4 KB');
    expect(screen.getByRole('status')).toHaveTextContent(
      'View mode: Compact List · Thumbnail size: 104px · 4 files'
    );

    // 3. Detailed Columns mode: <table> with <thead> & <tbody> wrapped DIRECTLY in <div className="overflow-x-auto">
    fireEvent.click(screen.getByRole('radio', { name: 'Detailed Columns' }));
    expect(onViewModeChange).toHaveBeenLastCalledWith('columns');
    const table = screen.getByTestId('file-view-stage-columns');
    expect(table.tagName).toBe('TABLE');
    expect(table.parentElement?.tagName).toBe('DIV');
    expect(table.parentElement).toHaveClass('overflow-x-auto');
    expect(table.querySelector('thead')).not.toBeNull();
    expect(table.querySelector('tbody')).not.toBeNull();
    expect(within(table).getByRole('columnheader', { name: 'Name' })).toBeInTheDocument();
    expect(within(table).getByRole('columnheader', { name: 'Kind' })).toBeInTheDocument();
    expect(within(table).getByRole('columnheader', { name: 'Size' })).toBeInTheDocument();
    expect(within(table).getByRole('columnheader', { name: 'Modified' })).toBeInTheDocument();
    expect(screen.getByTestId('file-view-columns-row-spec')).toHaveTextContent('glass-guide.pdf');
    expect(screen.getByTestId('file-view-columns-row-spec')).toHaveTextContent('620 KB');

    // 4. Gallery mode: large spotlight + clickable horizontal filmstrip scaling with zoomPx
    fireEvent.click(screen.getByRole('radio', { name: 'Gallery' }));
    expect(onViewModeChange).toHaveBeenLastCalledWith('gallery');
    expect(screen.getByTestId('file-view-stage-gallery')).toBeInTheDocument();
    expect(screen.getByTestId('file-view-gallery-spotlight-name')).toHaveTextContent(
      'optical-poster.png'
    );
    expect(screen.getByTestId('file-view-gallery-spotlight-meta')).toHaveTextContent(
      '3.2 MB · Today, 10:15'
    );
    expect(screen.getByTestId('file-view-gallery-filmstrip')).toHaveClass('overflow-x-auto');
    expect(screen.getByTestId('file-view-gallery-thumb-poster')).toHaveStyle({
      width: '104px',
      height: '75px',
    });

    // Click another filmstrip item to update spotlight and live announcement
    const chimeFilmstripBtn = screen.getByTestId('file-view-gallery-item-chime');
    expect(chimeFilmstripBtn).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(chimeFilmstripBtn);
    expect(chimeFilmstripBtn).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('file-view-gallery-spotlight-name')).toHaveTextContent(
      'focus-chime.wav'
    );
    expect(screen.getByRole('status')).toHaveTextContent(
      'View mode: Gallery · Thumbnail size: 104px · Selected: focus-chime.wav'
    );

    // Zooming updates filmstrip thumbnail dimensions live
    fireEvent.change(screen.getByRole('slider', { name: 'Thumbnail zoom size' }), {
      target: { value: '128' },
    });
    expect(screen.getByTestId('file-view-gallery-thumb-chime')).toHaveStyle({
      width: '128px',
      height: '92px',
    });
  });

  it('supports IME-safe ArrowRight, ArrowLeft, Home, and End roving keyboard navigation across radios', () => {
    const onViewModeChange = vi.fn();

    render(<FileViewModeBar onViewModeChange={onViewModeChange} />);

    const gridRadio = screen.getByRole('radio', { name: 'Icon Grid' });
    const listRadio = screen.getByRole('radio', { name: 'Compact List' });
    const columnsRadio = screen.getByRole('radio', { name: 'Detailed Columns' });
    const galleryRadio = screen.getByRole('radio', { name: 'Gallery' });

    gridRadio.focus();

    // Active IME composition is strictly ignored
    fireEvent.keyDown(gridRadio, { key: 'ArrowRight', isComposing: true });
    fireEvent.keyDown(gridRadio, { key: 'End', isComposing: true });
    expect(onViewModeChange).not.toHaveBeenCalled();

    // Unrelated keys are ignored
    fireEvent.keyDown(gridRadio, { key: 'Tab' });
    expect(onViewModeChange).not.toHaveBeenCalled();

    // ArrowRight cycles grid -> list -> columns -> gallery -> grid
    fireEvent.keyDown(gridRadio, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(listRadio);
    expect(listRadio).toHaveAttribute('aria-checked', 'true');
    expect(onViewModeChange).toHaveBeenLastCalledWith('list');

    fireEvent.keyDown(listRadio, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(columnsRadio);
    expect(onViewModeChange).toHaveBeenLastCalledWith('columns');

    fireEvent.keyDown(columnsRadio, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(galleryRadio);
    expect(onViewModeChange).toHaveBeenLastCalledWith('gallery');

    fireEvent.keyDown(galleryRadio, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(gridRadio);
    expect(onViewModeChange).toHaveBeenLastCalledWith('grid');

    // ArrowLeft wraps backward from grid -> gallery -> columns
    fireEvent.keyDown(gridRadio, { key: 'ArrowLeft' });
    expect(document.activeElement).toBe(galleryRadio);
    expect(onViewModeChange).toHaveBeenLastCalledWith('gallery');

    fireEvent.keyDown(galleryRadio, { key: 'ArrowLeft' });
    expect(document.activeElement).toBe(columnsRadio);
    expect(onViewModeChange).toHaveBeenLastCalledWith('columns');

    // Home jumps to Icon Grid; End jumps to Gallery
    fireEvent.keyDown(columnsRadio, { key: 'Home' });
    expect(document.activeElement).toBe(gridRadio);
    expect(onViewModeChange).toHaveBeenLastCalledWith('grid');

    fireEvent.keyDown(gridRadio, { key: 'End' });
    expect(document.activeElement).toBe(galleryRadio);
    expect(onViewModeChange).toHaveBeenLastCalledWith('gallery');
  });

  it('handles zoom slider, +/- buttons, clamping at bounds, and non-redundant change guards', () => {
    const onZoomChange = vi.fn();

    render(
      <FileViewModeBar
        minZoomPx={64}
        maxZoomPx={80}
        stepZoomPx={10}
        defaultZoomPx={72}
        onZoomChange={onZoomChange}
      />
    );

    const zoomOutBtn = screen.getByRole('button', { name: 'Zoom out' });
    const zoomInBtn = screen.getByRole('button', { name: 'Zoom in' });
    const slider = screen.getByRole('slider', { name: 'Thumbnail zoom size' });

    expect(zoomOutBtn).not.toBeDisabled();
    expect(zoomInBtn).not.toBeDisabled();
    expect(screen.getByTestId('file-view-zoom-badge')).toHaveTextContent('72px');

    // Zoom in steps 72 + 10 = 82 -> clamps cleanly to 80 and disables Zoom in
    fireEvent.click(zoomInBtn);
    expect(onZoomChange).toHaveBeenLastCalledWith(80);
    expect(screen.getByTestId('file-view-zoom-badge')).toHaveTextContent('80px');
    expect(zoomInBtn).toBeDisabled();

    // Slider change that rounds/clamps to current value does not emit duplicate callback
    const callsBefore = onZoomChange.mock.calls.length;
    fireEvent.change(slider, { target: { value: '80.2' } });
    expect(onZoomChange).toHaveBeenCalledTimes(callsBefore);

    // Zoom out steps 80 - 10 = 70, then 70 - 10 = 60 -> clamps cleanly to 64 and disables Zoom out
    fireEvent.click(zoomOutBtn);
    expect(onZoomChange).toHaveBeenLastCalledWith(70);
    fireEvent.click(zoomOutBtn);
    expect(onZoomChange).toHaveBeenLastCalledWith(64);
    expect(zoomOutBtn).toBeDisabled();
    expect(slider).toHaveAttribute('aria-valuetext', '64px');
  });

  it('sanitizes NaN, Infinity, inverted bounds, extreme ranges, and equal bounds safely', () => {
    const { rerender } = render(
      <FileViewModeBar
        minZoomPx={Number.NaN}
        maxZoomPx={Number.POSITIVE_INFINITY}
        stepZoomPx={-12}
        defaultZoomPx={Number.NaN}
      />
    );

    const slider = screen.getByRole('slider', { name: 'Thumbnail zoom size' });
    expect(slider).toHaveAttribute('min', '48');
    expect(slider).toHaveAttribute('max', '160');
    expect(slider).toHaveAttribute('step', '8');
    expect(slider).toHaveValue('96');
    expect(screen.getByTestId('file-view-zoom-badge')).toHaveTextContent('96px');

    // Inverted bounds (min > max) and out-of-range zoom normalize cleanly
    rerender(
      <FileViewModeBar
        minZoomPx={180}
        maxZoomPx={64}
        stepZoomPx={0.2}
        zoomPx={500}
      />
    );
    expect(slider).toHaveAttribute('min', '64');
    expect(slider).toHaveAttribute('max', '180');
    expect(slider).toHaveAttribute('step', '1');
    expect(slider).toHaveValue('180');
    expect(screen.getByTestId('file-view-zoom-badge')).toHaveTextContent('180px');

    // Equal bounds disable both Zoom out and Zoom in buttons
    rerender(
      <FileViewModeBar
        minZoomPx={100}
        maxZoomPx={100}
        zoomPx={Number.NEGATIVE_INFINITY}
      />
    );
    expect(screen.getByTestId('file-view-zoom-badge')).toHaveTextContent('100px');
    expect(screen.getByRole('button', { name: 'Zoom out' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Zoom in' })).toBeDisabled();
  });

  it('supports controlled viewMode and controlled zoomPx without mutating internal display prematurely', () => {
    const onViewModeChange = vi.fn();
    const onZoomChange = vi.fn();

    const { rerender } = render(
      <FileViewModeBar
        viewMode="list"
        zoomPx={120}
        onViewModeChange={onViewModeChange}
        onZoomChange={onZoomChange}
      />
    );

    expect(screen.getByRole('radio', { name: 'Compact List' })).toHaveAttribute(
      'aria-checked',
      'true'
    );
    expect(screen.getByTestId('file-view-zoom-badge')).toHaveTextContent('120px');

    // Clicking another mode fires callback but keeps controlled viewMode until parent rerenders
    fireEvent.click(screen.getByRole('radio', { name: 'Gallery' }));
    expect(onViewModeChange).toHaveBeenCalledWith('gallery');
    expect(screen.getByRole('radio', { name: 'Compact List' })).toHaveAttribute(
      'aria-checked',
      'true'
    );

    // Zooming fires callback but keeps controlled zoomPx until parent rerenders
    fireEvent.click(screen.getByRole('button', { name: 'Zoom in' }));
    expect(onZoomChange).toHaveBeenCalledWith(128);
    expect(screen.getByTestId('file-view-zoom-badge')).toHaveTextContent('120px');

    // Parent updates controlled props
    const nextMode: FileViewModeId = 'gallery';
    rerender(
      <FileViewModeBar
        viewMode={nextMode}
        zoomPx={128}
        onViewModeChange={onViewModeChange}
        onZoomChange={onZoomChange}
      />
    );
    expect(screen.getByRole('radio', { name: 'Gallery' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByTestId('file-view-zoom-badge')).toHaveTextContent('128px');
  });

  it('enforces disabled state across radios, zoom controls, slider changes, and gallery filmstrip', () => {
    const onViewModeChange = vi.fn();
    const onZoomChange = vi.fn();

    render(
      <FileViewModeBar
        disabled
        showPreviewStage
        defaultViewMode="gallery"
        items={CUSTOM_ITEMS}
        onViewModeChange={onViewModeChange}
        onZoomChange={onZoomChange}
        data-testid="disabled-bar"
      />
    );

    const root = screen.getByTestId('disabled-bar');
    expect(root).toHaveAttribute('data-disabled', 'true');
    expect(root).toHaveAttribute('aria-disabled', 'true');

    const radiogroup = screen.getByRole('radiogroup', { name: 'File view mode' });
    expect(radiogroup).toHaveAttribute('aria-disabled', 'true');

    const galleryRadio = screen.getByRole('radio', { name: 'Gallery' });
    expect(galleryRadio).toBeDisabled();
    expect(galleryRadio).toHaveAttribute('tabindex', '-1');

    // Keyboard interaction on disabled radio and change event on disabled slider are blocked
    fireEvent.keyDown(galleryRadio, { key: 'ArrowLeft' });
    const slider = screen.getByRole('slider', { name: 'Thumbnail zoom size' });
    expect(slider).toBeDisabled();
    fireEvent.change(slider, { target: { value: '144' } });

    expect(screen.getByRole('button', { name: 'Zoom out' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Zoom in' })).toBeDisabled();
    expect(screen.getByTestId('file-view-gallery-item-shader')).toBeDisabled();

    expect(onViewModeChange).not.toHaveBeenCalled();
    expect(onZoomChange).not.toHaveBeenCalled();
  });

  it('renders empty state cleanly, handles singular count, neutralizes XSS/duplicate IDs, and recovers when gallery item is removed', () => {
    const xss = '<script>window.__viewBarXss=1</script><img src=x onerror=alert(1)>';
    const adversarialItems: ReadonlyArray<FileViewSampleItem> = [
      {
        id: '__proto__',
        name: xss,
        kind: 'image',
        sizeLabel: xss,
        modifiedAt: xss,
      },
      {
        id: '__proto__',
        name: 'duplicate-sibling.ts',
        kind: 'code',
        sizeLabel: '4 KB',
        modifiedAt: 'Today',
      },
    ];

    const { rerender } = render(
      <FileViewModeBar
        showPreviewStage
        defaultViewMode="gallery"
        items={adversarialItems}
      />
    );

    // XSS payload renders safely as literal text and duplicate __proto__ IDs disambiguate cleanly
    expect(screen.getByTestId('file-view-gallery-spotlight-name')).toHaveTextContent(xss);
    expect(document.querySelector('script')).toBeNull();
    expect(document.querySelector('img')).toBeNull();

    // Select second duplicate-ID item, then remove it via rerender -> falls back to new first item
    fireEvent.click(screen.getByTestId('file-view-gallery-item-__proto__~2'));
    expect(screen.getByTestId('file-view-gallery-spotlight-name')).toHaveTextContent(
      'duplicate-sibling.ts'
    );

    rerender(
      <FileViewModeBar
        showPreviewStage
        defaultViewMode="gallery"
        items={[CUSTOM_ITEMS[0]!]}
      />
    );
    expect(screen.getByTestId('file-view-gallery-spotlight-name')).toHaveTextContent(
      'optical-poster.png'
    );

    // Singular "1 file" status in non-gallery mode
    fireEvent.click(screen.getByRole('radio', { name: 'Icon Grid' }));
    expect(screen.getByRole('status')).toHaveTextContent('1 file');

    // Empty items list displays clean empty state without crashing (both on rerender and fresh mount)
    rerender(
      <FileViewModeBar
        showPreviewStage
        defaultViewMode="gallery"
        items={[]}
      />
    );
    expect(screen.getByTestId('file-view-preview-empty')).toHaveTextContent('No files to preview');
    expect(screen.getByRole('status')).toHaveTextContent('0 files');
  });

  it('mounts cleanly with an empty items array in gallery mode', () => {
    render(<FileViewModeBar showPreviewStage defaultViewMode="gallery" items={[]} />);
    expect(screen.getByTestId('file-view-preview-empty')).toHaveTextContent('No files to preview');
    expect(screen.getByRole('status')).toHaveTextContent(
      'View mode: Gallery · Thumbnail size: 96px · 0 files'
    );
  });
});
