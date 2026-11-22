import { createRef, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import {
  AssetSwatchGrid,
  type AssetSwatchItem,
  type AssetSwatchKind,
  type AssetSwatchKindMap,
  type AssetSwatchTone,
} from './index';

interface MockDataTransfer {
  effectAllowed: string;
  setData: ReturnType<typeof vi.fn>;
}

function createMockDataTransfer(): MockDataTransfer {
  return {
    effectAllowed: 'none',
    setData: vi.fn(),
  };
}

const ALL_VARIANTS_AND_TONES: ReadonlyArray<AssetSwatchItem> = [
  {
    id: 'aa', // charCode sum 194 (even -> variant 0)
    name: 'Brushed Steel Texture',
    kind: 'texture',
    meta: '4K PBR',
    tone: 'primary',
    tags: ['metal', 'pbr'],
  },
  {
    id: 'ab', // charCode sum 195 (odd -> variant 1)
    name: 'Crystal Lattice Texture',
    kind: 'texture',
    meta: '2K Normal',
    tone: 'secondary',
    tags: ['glass'],
  },
  {
    id: 'cc', // even -> variant 0
    name: 'Emerald SSS Orb',
    kind: 'preset',
    meta: 'SSS Shader',
    tone: 'emerald',
    tags: ['sss'],
  },
  {
    id: 'cd', // odd -> variant 1
    name: 'Amber Thin-Film Orb',
    kind: 'preset',
    meta: 'Thin-Film',
    tone: 'amber',
    tags: ['iridescent'],
  },
  {
    id: 'ee', // even -> variant 0
    name: 'Rose Sunset Ramp',
    kind: 'palette',
    meta: 'ACEScg',
    tone: 'rose',
    tags: ['lut'],
  },
  {
    id: 'ef', // odd -> variant 1
    name: 'Info Cobalt Ramp',
    kind: 'palette',
    meta: 'Linear sRGB',
    tone: 'info',
    tags: ['sky'],
  },
  {
    id: 'gg', // even -> variant 0
    name: 'Diamond Prism Icon',
    kind: 'icon',
    meta: 'SVG 24px',
    tone: 'primary',
    tags: ['vector'],
  },
  {
    id: 'gh', // odd -> variant 1
    name: 'Octahedron Wire Icon',
    kind: 'icon',
    meta: 'SVG 24px',
    tone: 'secondary',
    tags: ['3d'],
    draggable: false,
  },
];

describe('AssetSwatchGrid', () => {
  it('renders 8 default creative library items, PrismThemeProvider overrides, xstyle, React 19 ref, and AssetSwatchKindMap', () => {
    const ref = createRef<HTMLDivElement>();
    const kindMap: AssetSwatchKindMap = {
      texture: true,
      preset: true,
      palette: true,
      icon: true,
    };
    expect(Object.keys(kindMap)).toEqual(['texture', 'preset', 'palette', 'icon']);
    expect(AssetSwatchGrid.displayName).toBe('AssetSwatchGrid');

    render(
      <PrismThemeProvider
        theme={{
          components: {
            AssetSwatchGrid: {
              className: 'theme-swatch-grid',
              style: { letterSpacing: '0.1px' },
            },
          },
        }}
      >
        <AssetSwatchGrid
          ref={ref}
          className="custom-swatch-grid"
          xstyle={{ '--prism-blur-px': '20px' }}
          style={{ maxWidth: '720px' }}
          data-testid="swatch-grid"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('swatch-grid');
    expect(ref.current).toBe(root);
    expect(root).toHaveClass(
      'refractor-asset-swatch-grid',
      'prism-slab',
      'theme-swatch-grid',
      'custom-swatch-grid'
    );
    expect(root).toHaveAttribute('role', 'region');
    expect(root).toHaveAttribute('data-active-kind', 'all');
    expect(root).toHaveAttribute('data-count', '8');
    expect(root).toHaveAttribute('data-filtered-count', '8');
    expect(root).toHaveAttribute('data-has-selection', 'true');
    expect(root).not.toHaveAttribute('data-empty');
    expect(root).not.toHaveAttribute('data-searching');
    expect(root).toHaveStyle({ letterSpacing: '0.1px', maxWidth: '720px' });

    expect(screen.getByRole('heading', { name: 'Asset & Swatch Library' })).toBeInTheDocument();
    expect(screen.getByTestId('asset-total-count')).toHaveTextContent('8 / 8 assets');
    expect(screen.getByLabelText('Search assets and swatches')).toHaveAttribute('type', 'search');

    // Live category pill counts
    expect(screen.getByTestId('asset-filter-count-all')).toHaveTextContent('8');
    expect(screen.getByTestId('asset-filter-count-texture')).toHaveTextContent('2');
    expect(screen.getByTestId('asset-filter-count-preset')).toHaveTextContent('2');
    expect(screen.getByTestId('asset-filter-count-palette')).toHaveTextContent('2');
    expect(screen.getByTestId('asset-filter-count-icon')).toHaveTextContent('2');

    // Responsive thumbnail grid classes
    const grid = screen.getByTestId('asset-swatch-grid-list');
    expect(grid).toHaveClass('grid-cols-2', 'sm:grid-cols-3', 'md:grid-cols-4', 'gap-3');

    // Verify all 8 procedural SVGs have viewBox="0 0 96 64" and zero raw color literals
    const svgs = grid.querySelectorAll('svg[viewBox="0 0 96 64"]');
    expect(svgs).toHaveLength(8);
    for (const svg of svgs) {
      const markup = svg.outerHTML;
      expect(markup).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
      expect(markup).not.toMatch(/\b(?:rgba?|hsla?)\s*\(/i);
    }

    // First default tile is selected and reflected in Live Asset Preview Inspector
    const firstTile = screen.getByTestId('asset-tile-tex-anodized-brushed');
    expect(firstTile).toHaveAttribute('aria-pressed', 'true');
    expect(firstTile).toHaveAttribute('data-selected', 'true');

    const inspector = screen.getByTestId('asset-preview-inspector');
    expect(inspector).toHaveAttribute('aria-live', 'polite');
    expect(inspector).toHaveAttribute('data-preview-mode', 'selected');
    expect(screen.getByTestId('asset-inspector-mode')).toHaveTextContent('Selected');
    expect(screen.getByTestId('asset-inspector-name')).toHaveTextContent('Anodized Brushed Alloy');
    expect(screen.getByTestId('asset-inspector-kind')).toHaveTextContent('Texture');
    expect(screen.getByTestId('asset-inspector-tone')).toHaveTextContent('Primary');
    expect(screen.getByTestId('asset-inspector-meta')).toHaveTextContent('4K PBR · Roughness 0.28');
    expect(screen.getByTestId('asset-inspector-tags')).toHaveTextContent('pbr');
    expect(screen.getByTestId('asset-inspector-tags')).toHaveTextContent('metal');
    expect(screen.getByTestId('asset-inspector-tags')).toHaveTextContent('seamless');
    expect(
      screen.getByTestId('asset-inspector-swatch').querySelector('svg[viewBox="0 0 96 64"]')
    ).not.toBeNull();
  });

  it('renders both procedural SVG variants across all 4 kinds and all 6 semantic tones', () => {
    render(<AssetSwatchGrid items={ALL_VARIANTS_AND_TONES} title="Shader Vault" />);

    expect(screen.getByRole('heading', { name: 'Shader Vault' })).toBeInTheDocument();

    const expectedChecks: Array<{
      id: string;
      kind: AssetSwatchKind;
      tone: AssetSwatchTone;
      variant: string;
    }> = [
      { id: 'aa', kind: 'texture', tone: 'primary', variant: '0' },
      { id: 'ab', kind: 'texture', tone: 'secondary', variant: '1' },
      { id: 'cc', kind: 'preset', tone: 'emerald', variant: '0' },
      { id: 'cd', kind: 'preset', tone: 'amber', variant: '1' },
      { id: 'ee', kind: 'palette', tone: 'rose', variant: '0' },
      { id: 'ef', kind: 'palette', tone: 'info', variant: '1' },
      { id: 'gg', kind: 'icon', tone: 'primary', variant: '0' },
      { id: 'gh', kind: 'icon', tone: 'secondary', variant: '1' },
    ];

    for (const check of expectedChecks) {
      const tile = screen.getByTestId(`asset-tile-${check.id}`);
      const svg = tile.querySelector('svg[viewBox="0 0 96 64"]');
      expect(svg).not.toBeNull();
      expect(svg).toHaveAttribute('data-swatch-kind', check.kind);
      expect(svg).toHaveAttribute('data-swatch-tone', check.tone);
      expect(svg).toHaveAttribute('data-swatch-variant', check.variant);
      expect(svg?.outerHTML).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    }
  });

  it('filters by category pills and live search across name, kind, meta, and tags with IME-safe Escape clear and Reset Filters', () => {
    render(<AssetSwatchGrid data-testid="filter-grid" />);

    const searchInput = screen.getByLabelText('Search assets and swatches') as HTMLInputElement;

    // Filter by Textures pill
    fireEvent.click(screen.getByTestId('asset-filter-texture'));
    expect(screen.getByTestId('asset-filter-texture')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('filter-grid')).toHaveAttribute('data-active-kind', 'texture');
    expect(screen.getByTestId('filter-grid')).toHaveAttribute('data-filtered-count', '2');
    expect(screen.getByTestId('asset-tile-tex-anodized-brushed')).toBeInTheDocument();
    expect(screen.queryByTestId('asset-tile-pre-emerald-subsurface')).toBeNull();

    // Filter by Presets, Palettes, Icons, then All
    fireEvent.click(screen.getByTestId('asset-filter-preset'));
    expect(screen.getByTestId('asset-tile-pre-emerald-subsurface')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('asset-filter-palette'));
    expect(screen.getByTestId('asset-tile-pal-crimson-sunset')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('asset-filter-icon'));
    expect(screen.getByTestId('asset-tile-ico-prism-lens')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('asset-filter-all'));
    expect(screen.getByTestId('filter-grid')).toHaveAttribute('data-filtered-count', '8');

    // Search by name ('Brushed Alloy')
    fireEvent.change(searchInput, { target: { value: 'Brushed Alloy' } });
    expect(screen.getByTestId('asset-tile-tex-anodized-brushed')).toBeInTheDocument();
    expect(screen.getByTestId('asset-filter-count-all')).toHaveTextContent('1');

    // Search by tag-only keyword ('seamless') -> live category counts update to 1 texture
    fireEvent.change(searchInput, { target: { value: 'seamless' } });
    expect(screen.getByTestId('filter-grid')).toHaveAttribute('data-searching', 'true');
    expect(screen.getByTestId('asset-filter-count-all')).toHaveTextContent('1');
    expect(screen.getByTestId('asset-filter-count-texture')).toHaveTextContent('1');
    expect(screen.getByTestId('asset-filter-count-preset')).toHaveTextContent('0');
    expect(screen.getByTestId('asset-tile-tex-anodized-brushed')).toBeInTheDocument();

    // Clear search via button
    fireEvent.click(screen.getByTestId('asset-search-clear'));
    expect(searchInput.value).toBe('');
    expect(screen.getByTestId('asset-filter-count-all')).toHaveTextContent('8');

    // Search by meta ('ACEScg')
    fireEvent.change(searchInput, { target: { value: 'acescg' } });
    expect(screen.getByTestId('asset-tile-pal-crimson-sunset')).toBeInTheDocument();
    expect(screen.getByTestId('asset-filter-count-all')).toHaveTextContent('1');

    // Search by kind ('icon')
    fireEvent.change(searchInput, { target: { value: 'icon' } });
    expect(screen.getByTestId('asset-filter-count-icon')).toHaveTextContent('2');

    // IME composing Escape must NOT clear search
    const imeEsc = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
    Object.defineProperty(imeEsc, 'isComposing', { value: true });
    searchInput.dispatchEvent(imeEsc);
    expect(searchInput.value).toBe('icon');

    // Non-Escape key does not clear
    fireEvent.keyDown(searchInput, { key: 'a' });
    expect(searchInput.value).toBe('icon');

    // Non-composing Escape clears search
    fireEvent.keyDown(searchInput, { key: 'Escape' });
    expect(searchInput.value).toBe('');

    // Escape when already empty is a no-op
    fireEvent.keyDown(searchInput, { key: 'Escape' });
    expect(searchInput.value).toBe('');

    // No matches state + Reset Filters
    fireEvent.click(screen.getByTestId('asset-filter-texture'));
    fireEvent.change(searchInput, { target: { value: 'nonexistent-shader-xyz' } });
    const noMatch = screen.getByRole('status');
    expect(noMatch).toHaveAttribute('data-testid', 'asset-swatch-no-matches');
    expect(noMatch).toHaveTextContent('No matching swatches found');

    fireEvent.click(screen.getByTestId('asset-reset-filters'));
    expect(searchInput.value).toBe('');
    expect(screen.getByTestId('filter-grid')).toHaveAttribute('data-active-kind', 'all');
    expect(screen.getByTestId('filter-grid')).toHaveAttribute('data-filtered-count', '8');
  });

  it('supports click and IME-safe Enter/Space selection plus instant hover and keyboard-focus Live Asset Preview Inspector', () => {
    const onSelectAsset = vi.fn();
    render(<AssetSwatchGrid onSelectAsset={onSelectAsset} />);

    const secondTile = screen.getByTestId('asset-tile-tex-caustic-lens');
    const thirdTile = screen.getByTestId('asset-tile-pre-emerald-subsurface');

    // Hover switches inspector to Hover Preview without altering selection
    fireEvent.mouseEnter(thirdTile);
    expect(screen.getByTestId('asset-preview-inspector')).toHaveAttribute(
      'data-preview-mode',
      'hover'
    );
    expect(screen.getByTestId('asset-inspector-mode')).toHaveTextContent('Hover Preview');
    expect(screen.getByTestId('asset-inspector-name')).toHaveTextContent('Jade Subsurface Shader');
    expect(screen.getByTestId('asset-inspector-kind')).toHaveTextContent('Preset');
    expect(screen.getByTestId('asset-inspector-tone')).toHaveTextContent('Emerald');
    expect(thirdTile).toHaveAttribute('data-hovered', 'true');
    expect(onSelectAsset).not.toHaveBeenCalled();

    // Leaving a different tile while thirdTile is hovered keeps thirdTile hovered
    fireEvent.mouseLeave(secondTile);
    expect(screen.getByTestId('asset-inspector-name')).toHaveTextContent('Jade Subsurface Shader');

    // Leaving thirdTile restores selected asset
    fireEvent.mouseLeave(thirdTile);
    expect(screen.getByTestId('asset-preview-inspector')).toHaveAttribute(
      'data-preview-mode',
      'selected'
    );
    expect(screen.getByTestId('asset-inspector-name')).toHaveTextContent('Anodized Brushed Alloy');

    // Hovering a tile and then filtering its category out clears hovered preview cleanly
    fireEvent.mouseEnter(thirdTile);
    expect(screen.getByTestId('asset-preview-inspector')).toHaveAttribute(
      'data-preview-mode',
      'hover'
    );
    fireEvent.click(screen.getByTestId('asset-filter-texture'));
    expect(screen.getByTestId('asset-preview-inspector')).toHaveAttribute(
      'data-preview-mode',
      'selected'
    );
    fireEvent.click(screen.getByTestId('asset-filter-all'));
    const remountedThirdTile = screen.getByTestId('asset-tile-pre-emerald-subsurface');
    const remountedFourthTile = screen.getByTestId('asset-tile-pre-amber-iridescent');
    const remountedFifthTile = screen.getByTestId('asset-tile-pal-crimson-sunset');
    fireEvent.mouseLeave(remountedThirdTile);

    // Keyboard focus previews hovered asset; blur restores selected
    fireEvent.focus(remountedFourthTile);
    expect(screen.getByTestId('asset-inspector-name')).toHaveTextContent('Solar Prism Iridescence');
    fireEvent.blur(secondTile);
    expect(screen.getByTestId('asset-inspector-name')).toHaveTextContent('Solar Prism Iridescence');
    fireEvent.blur(remountedFourthTile);
    expect(screen.getByTestId('asset-inspector-name')).toHaveTextContent('Anodized Brushed Alloy');

    // Pointer click selects second tile
    fireEvent.click(secondTile);
    expect(onSelectAsset).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: 'tex-caustic-lens' })
    );
    expect(secondTile).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('asset-inspector-name')).toHaveTextContent('Frosted Caustic Glass');

    // Enter selects third tile
    fireEvent.keyDown(remountedThirdTile, { key: 'Enter' });
    expect(onSelectAsset).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: 'pre-emerald-subsurface' })
    );
    expect(remountedThirdTile).toHaveAttribute('aria-pressed', 'true');

    // Space selects fifth tile
    fireEvent.keyDown(remountedFifthTile, { key: ' ' });
    expect(onSelectAsset).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: 'pal-crimson-sunset' })
    );
    expect(remountedFifthTile).toHaveAttribute('aria-pressed', 'true');

    // Non-activation key does not trigger selection
    const callsBefore = onSelectAsset.mock.calls.length;
    fireEvent.keyDown(remountedFourthTile, { key: 'ArrowRight' });
    expect(onSelectAsset).toHaveBeenCalledTimes(callsBefore);

    // IME composing Enter is ignored safely
    const imeEnter = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
    Object.defineProperty(imeEnter, 'isComposing', { value: true });
    remountedFourthTile.dispatchEvent(imeEnter);
    expect(imeEnter.defaultPrevented).toBe(false);
    expect(onSelectAsset).toHaveBeenCalledTimes(callsBefore);
  });

  it('sets application/x-refractor-asset and text/plain transfer data on HTML5 drag start and guards draggable=false tiles', () => {
    const onDragAssetStart = vi.fn();
    render(
      <AssetSwatchGrid items={ALL_VARIANTS_AND_TONES} onDragAssetStart={onDragAssetStart} />
    );

    const draggableTile = screen.getByTestId('asset-tile-aa');
    expect(draggableTile).toHaveAttribute('draggable', 'true');
    expect(draggableTile).toHaveAttribute('data-draggable', 'true');

    const dt = createMockDataTransfer();
    fireEvent.dragStart(draggableTile, { dataTransfer: dt });

    expect(dt.effectAllowed).toBe('copy');
    expect(dt.setData).toHaveBeenCalledWith(
      'application/x-refractor-asset',
      JSON.stringify({
        id: 'aa',
        name: 'Brushed Steel Texture',
        kind: 'texture',
        meta: '4K PBR',
        tone: 'primary',
        tags: ['metal', 'pbr'],
      })
    );
    expect(dt.setData).toHaveBeenCalledWith('text/plain', 'Brushed Steel Texture');
    expect(draggableTile).toHaveAttribute('data-dragging', 'true');
    expect(onDragAssetStart).toHaveBeenCalledWith(expect.objectContaining({ id: 'aa' }));

    fireEvent.dragEnd(draggableTile);
    expect(draggableTile).not.toHaveAttribute('data-dragging');

    // Synthetic dragStart without dataTransfer still succeeds safely
    fireEvent.dragStart(draggableTile);
    expect(onDragAssetStart).toHaveBeenCalledTimes(2);
    fireEvent.dragEnd(draggableTile);

    // Non-draggable tile (`gh`) blocks dragStart and renders Drag Locked badge when inspected
    const lockedTile = screen.getByTestId('asset-tile-gh');
    expect(lockedTile).toHaveAttribute('draggable', 'false');
    expect(lockedTile).toHaveAttribute('data-draggable', 'false');

    fireEvent.click(lockedTile);
    expect(screen.getByTestId('asset-inspector-drag-locked')).toHaveTextContent('Drag Locked');

    const lockedDragEvent = new Event('dragstart', { bubbles: true, cancelable: true });
    lockedTile.dispatchEvent(lockedDragEvent);
    expect(lockedDragEvent.defaultPrevented).toBe(true);
    expect(onDragAssetStart).toHaveBeenCalledTimes(2);
  });

  it('renders clean role="status" empty state when items is [] and handles controlled/uncontrolled null and missing selections', () => {
    const { rerender } = render(<AssetSwatchGrid items={[]} data-testid="empty-grid" />);

    expect(screen.getByTestId('empty-grid')).toHaveAttribute('data-empty', 'true');
    expect(screen.getByTestId('asset-total-count')).toHaveTextContent('0 / 0 assets');
    const emptyStatus = screen.getByRole('status');
    expect(emptyStatus).toHaveAttribute('data-testid', 'asset-swatch-empty');
    expect(emptyStatus).toHaveTextContent('No assets in library');
    expect(screen.getByTestId('asset-inspector-empty')).toHaveTextContent(
      'Live preview inspector ready'
    );

    // Uncontrolled defaultSelectedId=null
    rerender(
      <AssetSwatchGrid key="null-uncontrolled" defaultSelectedId={null} data-testid="null-grid" />
    );
    expect(screen.getByTestId('null-grid')).not.toHaveAttribute('data-has-selection');
    expect(screen.getByTestId('asset-preview-inspector')).toHaveAttribute(
      'data-preview-mode',
      'idle'
    );
    expect(screen.getByTestId('asset-inspector-empty')).toHaveTextContent('No asset selected');

    // Uncontrolled missing defaultSelectedId falls back to first item
    rerender(
      <AssetSwatchGrid
        key="missing-uncontrolled"
        defaultSelectedId="missing-id"
        data-testid="fallback-grid"
      />
    );
    expect(screen.getByTestId('asset-tile-tex-anodized-brushed')).toHaveAttribute(
      'aria-pressed',
      'true'
    );

    // Uncontrolled missing defaultSelectedId with empty items
    rerender(
      <AssetSwatchGrid
        key="missing-empty"
        items={[]}
        defaultSelectedId="missing-id"
        data-testid="fallback-empty"
      />
    );
    expect(screen.getByTestId('asset-swatch-empty')).toBeInTheDocument();

    // Controlled harness
    function ControlledHarness() {
      const [selected, setSelected] = useState<string | null>(null);
      return (
        <div>
          <AssetSwatchGrid
            items={ALL_VARIANTS_AND_TONES.slice(0, 2)}
            selectedId={selected}
            onSelectAsset={(asset) => setSelected(asset.id)}
            data-testid="controlled-grid"
          />
          <button type="button" onClick={() => setSelected('missing-controlled')}>
            Set Missing
          </button>
        </div>
      );
    }

    rerender(<ControlledHarness />);
    expect(screen.getByTestId('asset-inspector-empty')).toHaveTextContent('No asset selected');
    fireEvent.click(screen.getByTestId('asset-tile-ab'));
    expect(screen.getByTestId('asset-tile-ab')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('asset-inspector-name')).toHaveTextContent('Crystal Lattice Texture');

    fireEvent.click(screen.getByRole('button', { name: 'Set Missing' }));
    expect(screen.getByTestId('asset-inspector-empty')).toHaveTextContent('No asset selected');
  });

  it('defends against XSS payloads, regex metacharacters, duplicate IDs/tags, blank names/titles, omitted optional fields, and passes through BaseProps', () => {
    const payload = '<script>window.__xss=1</script><img src=x onerror=alert(1)>';
    const onKeyDown = vi.fn();
    const onDragAssetStart = vi.fn();

    const adversarialItems: ReadonlyArray<AssetSwatchItem> = [
      {
        id: 'unsafe "id" <tag>',
        name: payload,
        kind: 'texture',
        tags: ['  safe-tag  ', '', 'safe-tag', payload],
      },
      {
        id: 'unsafe "id" <tag>',
        name: 'Duplicate Dropped',
        kind: 'icon',
      },
      {
        id: 'minimal-item',
        name: '   ',
        kind: 'preset',
        meta: '   ',
        tags: [],
      },
      {
        id: 'bare-item',
        name: 'Bare Icon Asset',
        kind: 'icon',
      },
    ];

    render(
      <AssetSwatchGrid
        title="   "
        items={adversarialItems}
        onKeyDown={onKeyDown}
        onDragAssetStart={onDragAssetStart}
        aria-label="Custom asset library landmark"
        data-testid="adversarial-grid"
      />
    );

    const root = screen.getByTestId('adversarial-grid');
    expect(root).toHaveAttribute('aria-label', 'Custom asset library landmark');
    expect(screen.getByRole('heading', { name: 'Asset & Swatch Library' })).toBeInTheDocument();
    expect(document.querySelector('script')).toBeNull();

    // Deduplicated to 3 unique items
    const grid = screen.getByTestId('asset-swatch-grid-list');
    expect(within(grid).getAllByRole('button')).toHaveLength(3);

    // XSS payload escaped as text; tags deduplicated to 2 ('safe-tag' and payload); omitted meta falls back to kind label on tile and fallback text in inspector
    expect(screen.getByTestId('asset-tile-name-unsafe "id" <tag>')).toHaveTextContent(payload);
    expect(screen.getByTestId('asset-tile-meta-unsafe "id" <tag>')).toHaveTextContent('Texture');
    expect(screen.getByTestId('asset-inspector-meta')).toHaveTextContent('No technical metadata');
    expect(screen.getByTestId('asset-inspector-tags').children).toHaveLength(2);

    // Minimal item with blank name/meta/empty tags and omitted tone falls back cleanly
    const minimalTile = screen.getByTestId('asset-tile-minimal-item');
    fireEvent.click(minimalTile);
    expect(screen.getByTestId('asset-tile-name-minimal-item')).toHaveTextContent('Untitled Asset');
    expect(screen.getByTestId('asset-inspector-name')).toHaveTextContent('Untitled Asset');
    expect(screen.getByTestId('asset-inspector-tone')).toHaveTextContent('Primary');
    expect(screen.getByTestId('asset-inspector-meta')).toHaveTextContent('No technical metadata');
    expect(screen.queryByTestId('asset-inspector-tags')).toBeNull();

    // Drag minimal item (no meta, no tone, empty tags) sets fallback transfer JSON cleanly
    const dt = createMockDataTransfer();
    fireEvent.dragStart(minimalTile, { dataTransfer: dt });
    expect(dt.setData).toHaveBeenCalledWith(
      'application/x-refractor-asset',
      JSON.stringify({
        id: 'minimal-item',
        name: 'Untitled Asset',
        kind: 'preset',
        meta: '',
        tone: 'primary',
        tags: [],
      })
    );

    // Drag bare item with undefined tags sets tags: [] cleanly
    const bareTile = screen.getByTestId('asset-tile-bare-item');
    const bareDt = createMockDataTransfer();
    fireEvent.dragStart(bareTile, { dataTransfer: bareDt });
    expect(bareDt.setData).toHaveBeenCalledWith(
      'application/x-refractor-asset',
      JSON.stringify({
        id: 'bare-item',
        name: 'Bare Icon Asset',
        kind: 'icon',
        meta: '',
        tone: 'primary',
        tags: [],
      })
    );
    // Regex metacharacters in search query do not throw
    const searchInput = screen.getByLabelText('Search assets and swatches');
    fireEvent.change(searchInput, { target: { value: '[.*+?^${}()|[\\]\\\\]' } });
    expect(screen.getByTestId('asset-swatch-no-matches')).toBeInTheDocument();

    // BaseProps event handler passthrough
    fireEvent.keyDown(root, { key: 'Escape' });
    expect(onKeyDown).toHaveBeenCalledTimes(1);
  });
});
