import { createRef, useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import {
  DEFAULT_DESKTOP_ICONS,
  DesktopIconCanvas,
  type DesktopIconItem,
  type DesktopIconKindMap,
  type DesktopWallpaperPreset,
  type DesktopWallpaperPresetMap,
} from './index';

function mockElementRect(
  el: HTMLElement,
  left: number,
  top: number,
  width: number,
  height: number
) {
  Object.defineProperty(el, 'getBoundingClientRect', {
    configurable: true,
    value: () => ({
      left,
      top,
      right: left + width,
      bottom: top + height,
      width,
      height,
      x: left,
      y: top,
      toJSON: () => ({}),
    }),
  });
}

function dispatchComposingKeyDown(
  target: Element,
  key: string,
  extra: KeyboardEventInit = {}
): KeyboardEvent {
  const event = new KeyboardEvent('keydown', {
    key,
    bubbles: true,
    cancelable: true,
    ...extra,
  });
  Object.defineProperty(event, 'isComposing', { value: true });
  target.dispatchEvent(event);
  return event;
}

describe('DesktopIconCanvas', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders prism-slab desktop canvas with 6 default icons, theme overrides, xstyle, ref, and zero raw color literals', () => {
    const ref = createRef<HTMLDivElement>();

    const wallpaperKeys: ReadonlyArray<keyof DesktopWallpaperPresetMap> = [
      'prism-aurora',
      'alabaster-mist',
      'obsidian-grid',
      'solar-refraction',
    ];
    const iconKinds: ReadonlyArray<keyof DesktopIconKindMap> = [
      'folder',
      'app',
      'document',
      'archive',
      'image',
      'drive',
    ];
    expect(wallpaperKeys).toHaveLength(4);
    expect(iconKinds).toHaveLength(6);
    expect(DEFAULT_DESKTOP_ICONS).toHaveLength(6);
    expect(DesktopIconCanvas.displayName).toBe('DesktopIconCanvas');

    const { container } = render(
      <PrismThemeProvider
        theme={{
          components: {
            DesktopIconCanvas: {
              className: 'theme-desktop-override',
              style: { opacity: '0.98' },
            },
          },
        }}
      >
        <DesktopIconCanvas
          ref={ref}
          className="local-desktop-class"
          style={{ maxWidth: '920px' }}
          xstyle={{ '--prism-blur-px': '20px' }}
          data-testid="desktop-root"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('desktop-root');
    expect(ref.current).toBe(root);
    expect(root).toHaveClass(
      'refractor-desktop-icon-canvas',
      'prism-slab',
      'theme-desktop-override',
      'local-desktop-class'
    );
    expect(root).toHaveStyle({ opacity: '0.98', maxWidth: '920px' });
    expect(root).toHaveAttribute('data-wallpaper', 'prism-aurora');
    expect(root).toHaveAttribute('data-snap', 'true');
    expect(root).not.toHaveAttribute('data-disabled');

    const stage = screen.getByRole('region', { name: 'Desktop icon canvas' });
    expect(stage).toBe(screen.getByTestId('desktop-canvas-stage'));
    expect(stage).toHaveAttribute('data-grid-cols', '6');
    expect(stage).toHaveAttribute('data-grid-rows', '4');
    expect(screen.getByTestId('desktop-grid-guide')).toBeInTheDocument();

    const expectedNames = [
      'Projects',
      'Refractor Studio',
      'Q4 Spec.pdf',
      'Release Assets.zip',
      'Glass Study.png',
      'Macintosh HD',
    ];
    for (const name of expectedNames) {
      expect(screen.getByText(name)).toBeInTheDocument();
    }

    expect(screen.getByTestId('desktop-icon-pin-projects')).toBeInTheDocument();
    expect(
      screen.getByTestId('desktop-icon-badge-macintosh-hd')
    ).toHaveTextContent('NVMe');
    expect(screen.getByTestId('desktop-selection-count')).toHaveTextContent(
      '0 selected'
    );
    expect(screen.queryByTestId('desktop-open-selected')).toBeNull();
    expect(screen.getByTestId('desktop-clear-selection')).toBeDisabled();

    // Strictly zero raw color literals in DOM
    expect(container.innerHTML).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(container.innerHTML).not.toMatch(/\b(?:rgba?|hsla?)\s*\(/);
  });

  it('switches all 4 optical wallpaper presets, toggles Snap to Grid, and auto-arranges by Name, Kind, and Grid', () => {
    const onWallpaperChange = vi.fn<(preset: DesktopWallpaperPreset) => void>();
    const onItemsChange = vi.fn<(items: DesktopIconItem[]) => void>();

    const { container } = render(
      <DesktopIconCanvas
        onWallpaperChange={onWallpaperChange}
        onItemsChange={onItemsChange}
      />
    );

    const stage = screen.getByTestId('desktop-canvas-stage');

    // Clicking active wallpaper emits no duplicate callback
    fireEvent.click(screen.getByTestId('desktop-wallpaper-prism-aurora'));
    expect(onWallpaperChange).not.toHaveBeenCalled();

    // Switch through Mist, Obsidian, Solar, and back to Aurora
    const presets: ReadonlyArray<{
      id: DesktopWallpaperPreset;
      label: string;
    }> = [
      { id: 'alabaster-mist', label: 'Mist' },
      { id: 'obsidian-grid', label: 'Obsidian' },
      { id: 'solar-refraction', label: 'Solar' },
      { id: 'prism-aurora', label: 'Aurora' },
    ];

    for (const preset of presets) {
      const btn = screen.getByTestId(`desktop-wallpaper-${preset.id}`);
      fireEvent.click(btn);
      expect(btn).toHaveAttribute('aria-pressed', 'true');
      expect(stage).toHaveAttribute('data-wallpaper', preset.id);
      expect(onWallpaperChange).toHaveBeenLastCalledWith(preset.id);
      expect(screen.getByTestId('desktop-status-live')).toHaveTextContent(
        `Wallpaper changed to ${preset.label}.`
      );
      expect(container.innerHTML).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
      expect(container.innerHTML).not.toMatch(/\b(?:rgba?|hsla?)\s*\(/);
    }

    // Toggle Snap to Grid off and back on
    const snapBtn = screen.getByTestId('desktop-snap-toggle');
    expect(snapBtn).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(snapBtn);
    expect(snapBtn).toHaveAttribute('aria-pressed', 'false');
    expect(stage).toHaveAttribute('data-snap-to-grid', 'false');
    expect(screen.queryByTestId('desktop-grid-guide')).toBeNull();
    expect(screen.getByTestId('desktop-status-live')).toHaveTextContent(
      'Snap to grid disabled.'
    );

    fireEvent.click(snapBtn);
    expect(snapBtn).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('desktop-grid-guide')).toBeInTheDocument();
    expect(screen.getByTestId('desktop-status-live')).toHaveTextContent(
      'Snap to grid enabled.'
    );

    // Auto-Arrange by Name -> alphabetical order packed in row 0 (cols 0..5)
    fireEvent.click(screen.getByTestId('desktop-sort-name'));
    expect(screen.getByTestId('desktop-sort-name')).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    const byName = onItemsChange.mock.calls.at(-1)?.[0] ?? [];
    expect(byName.map((item) => item.name)).toEqual([
      'Glass Study.png',
      'Macintosh HD',
      'Projects',
      'Q4 Spec.pdf',
      'Release Assets.zip',
      'Refractor Studio',
    ].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' })));
    expect(byName.map((item) => `${item.col}:${item.row}`)).toEqual([
      '0:0',
      '1:0',
      '2:0',
      '3:0',
      '4:0',
      '5:0',
    ]);

    // Auto-Arrange by Kind
    fireEvent.click(screen.getByTestId('desktop-sort-kind'));
    const byKind = onItemsChange.mock.calls.at(-1)?.[0] ?? [];
    expect(byKind.map((item) => item.kind)).toEqual([
      'app',
      'archive',
      'document',
      'drive',
      'folder',
      'image',
    ]);

    // Auto-Arrange by Grid (position)
    fireEvent.click(screen.getByTestId('desktop-sort-position'));
    const byGrid = onItemsChange.mock.calls.at(-1)?.[0] ?? [];
    expect(byGrid).toHaveLength(6);
    expect(new Set(byGrid.map((i) => `${i.col}:${i.row}`)).size).toBe(6);
  });

  it('breaks ties cleanly on Kind and Grid sort and clamps packed rows when icons exceed grid capacity', () => {
    const onItemsChange = vi.fn<(items: DesktopIconItem[]) => void>();
    const overlappingItems: ReadonlyArray<DesktopIconItem> = [
      { id: 'b-doc', name: 'Beta.txt', kind: 'document', col: 1, row: 0 },
      { id: 'a-doc', name: 'Alpha.txt', kind: 'document', col: 1, row: 0 },
      { id: 'c-doc', name: 'Gamma.txt', kind: 'document', col: 0, row: 1 },
      { id: 'd-app', name: 'Delta', kind: 'app', col: 0, row: 0 },
      { id: 'e-img', name: 'Echo.png', kind: 'image', col: 2, row: 1 },
      { id: 'f-zip', name: 'Foxtrot.zip', kind: 'archive', col: 2, row: 0 },
      { id: 'g-drv', name: 'Golf HD', kind: 'drive', col: 1, row: 1 },
    ];

    render(
      <DesktopIconCanvas
        defaultItems={overlappingItems}
        gridCols={3}
        gridRows={2}
        onItemsChange={onItemsChange}
      />
    );

    // Sort by Kind: two documents break tie alphabetically (Alpha before Beta before Gamma)
    fireEvent.click(screen.getByTestId('desktop-sort-kind'));
    const kindSorted = onItemsChange.mock.calls.at(-1)?.[0] ?? [];
    expect(kindSorted.filter((i) => i.kind === 'document').map((i) => i.name)).toEqual([
      'Alpha.txt',
      'Beta.txt',
      'Gamma.txt',
    ]);
    // 7th item clamped to maxRow = 1 on 3x2 grid
    expect(kindSorted[6]?.row).toBe(1);

    // Sort by Grid with duplicate coordinates triggers row, col, and name tie-breakers
    const { unmount } = render(
      <DesktopIconCanvas
        defaultItems={[
          { id: 'p2', name: 'Zeta', kind: 'folder', col: 0, row: 0 },
          { id: 'p1', name: 'Alpha', kind: 'folder', col: 0, row: 0 },
          { id: 'p3', name: 'Mid', kind: 'folder', col: 2, row: 0 },
          { id: 'p4', name: 'Bottom', kind: 'folder', col: 0, row: 1 },
        ]}
        onItemsChange={onItemsChange}
      />
    );
    const sortGridBtns = screen.getAllByTestId('desktop-sort-position');
    const p2Tile = screen.getByTestId('desktop-icon-p2');
    const p1Tile = screen.getByTestId('desktop-icon-p1');
    p2Tile.focus();
    fireEvent.keyDown(p2Tile, { key: 'Home' });
    expect(document.activeElement).toBe(p1Tile);
    fireEvent.click(sortGridBtns[1]!);
    const posSorted = onItemsChange.mock.calls.at(-1)?.[0] ?? [];
    expect(posSorted.map((i) => i.id)).toEqual(['p1', 'p2', 'p3', 'p4']);
    unmount();
  });

  it('supports single-click, Shift+Click range extend, Ctrl/Meta+Click toggle, double-click open, and toolbar Open/Clear actions', () => {
    const onSelectionChange = vi.fn<(ids: string[]) => void>();
    const onOpenItem = vi.fn<(item: DesktopIconItem) => void>();

    render(
      <DesktopIconCanvas
        onSelectionChange={onSelectionChange}
        onOpenItem={onOpenItem}
      />
    );

    const projects = screen.getByTestId('desktop-icon-projects');
    const releaseAssets = screen.getByTestId('desktop-icon-release-assets');
    const macHd = screen.getByTestId('desktop-icon-macintosh-hd');
    const studio = screen.getByTestId('desktop-icon-refractor-studio');

    // Shift+Click with no prior selection selects the clicked icon
    fireEvent.click(projects, { shiftKey: true });
    expect(onSelectionChange).toHaveBeenLastCalledWith(['projects']);
    expect(projects).toHaveAttribute('aria-pressed', 'true');
    expect(projects).toHaveAttribute('data-selected', 'true');

    // Repeating plain click on the same sole selected icon emits no duplicate callback
    const callsAfterFirst = onSelectionChange.mock.calls.length;
    fireEvent.click(projects);
    expect(onSelectionChange).toHaveBeenCalledTimes(callsAfterFirst);

    // Plain click on another icon replaces single selection cleanly
    fireEvent.click(studio);
    expect(onSelectionChange).toHaveBeenLastCalledWith(['refractor-studio']);
    fireEvent.click(projects);
    expect(onSelectionChange).toHaveBeenLastCalledWith(['projects']);

    // Open single selected icon via toolbar Open button
    fireEvent.click(screen.getByTestId('desktop-open-selected'));
    expect(onOpenItem).toHaveBeenCalledTimes(1);
    expect(onOpenItem).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: 'projects', name: 'Projects' })
    );
    expect(screen.getByTestId('desktop-status-live')).toHaveTextContent(
      'Opened "Projects".'
    );

    // Shift+Click Macintosh HD (same row 0, col 5) extends across reading order: Projects, Release Assets.zip, Macintosh HD
    fireEvent.click(macHd, { shiftKey: true });
    expect(onSelectionChange).toHaveBeenLastCalledWith([
      'projects',
      'release-assets',
      'macintosh-hd',
    ]);
    expect(screen.getByTestId('desktop-selection-count')).toHaveTextContent(
      '3 selected'
    );

    // Ctrl+Click toggles Refractory Studio on, Meta+Click toggles Release Assets off
    fireEvent.click(studio, { ctrlKey: true });
    expect(onSelectionChange).toHaveBeenLastCalledWith([
      'projects',
      'refractor-studio',
      'release-assets',
      'macintosh-hd',
    ]);

    fireEvent.click(releaseAssets, { metaKey: true });
    expect(onSelectionChange).toHaveBeenLastCalledWith([
      'projects',
      'refractor-studio',
      'macintosh-hd',
    ]);

    // Open multiple selected icons via toolbar Open button
    onOpenItem.mockClear();
    fireEvent.click(screen.getByTestId('desktop-open-selected'));
    expect(onOpenItem).toHaveBeenCalledTimes(3);
    expect(screen.getByTestId('desktop-status-live')).toHaveTextContent(
      'Opened 3 items: Projects, Refractor Studio, Macintosh HD.'
    );

    // Clear button clears selection
    fireEvent.click(screen.getByTestId('desktop-clear-selection'));
    expect(onSelectionChange).toHaveBeenLastCalledWith([]);
    expect(screen.getByTestId('desktop-selection-count')).toHaveTextContent(
      '0 selected'
    );
    expect(screen.queryByTestId('desktop-open-selected')).toBeNull();

    // Double-click opens item and updates polite live status
    onOpenItem.mockClear();
    fireEvent.doubleClick(studio);
    expect(onOpenItem).toHaveBeenCalledTimes(1);
    expect(onOpenItem).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: 'refractor-studio' })
    );
    expect(screen.getByTestId('desktop-status-live')).toHaveTextContent(
      'Opened "Refractor Studio".'
    );

    // Shift+Click using defaultSelectedIds fallback (no prior anchorId set)
    const { unmount } = render(
      <DesktopIconCanvas
        defaultSelectedIds={['projects']}
        onSelectionChange={onSelectionChange}
      />
    );
    const allMacHd = screen.getAllByTestId('desktop-icon-macintosh-hd');
    fireEvent.click(allMacHd[1]!, { shiftKey: true });
    expect(onSelectionChange).toHaveBeenLastCalledWith([
      'projects',
      'release-assets',
      'macintosh-hd',
    ]);
    unmount();
  });

  it('drags icons with snap-to-grid, collision resolution, free-floating mode, zero-rect fallback, pointercancel, and unmount cleanup', () => {
    const addSpy = vi.spyOn(window, 'addEventListener');
    const removeSpy = vi.spyOn(window, 'removeEventListener');
    const onItemsChange = vi.fn<(items: DesktopIconItem[]) => void>();
    const onSelectionChange = vi.fn<(ids: string[]) => void>();

    const { unmount } = render(
      <DesktopIconCanvas
        onItemsChange={onItemsChange}
        onSelectionChange={onSelectionChange}
      />
    );

    const stage = screen.getByTestId('desktop-canvas-stage');
    // 600x400 stage on 6x4 grid => exact 100px x 100px cells
    mockElementRect(stage, 100, 100, 600, 400);

    const projects = screen.getByTestId('desktop-icon-projects');

    // Secondary button ignored
    fireEvent.pointerDown(projects, { button: 2, clientX: 140, clientY: 140 });
    fireEvent.pointerMove(window, { clientX: 340, clientY: 340 });
    expect(projects).not.toHaveAttribute('data-dragging');

    // Movement below 4px threshold does not initiate drag and allows click
    fireEvent.pointerDown(projects, { button: 0, clientX: 140, clientY: 140 });
    fireEvent.pointerMove(window, { clientX: 142, clientY: 141 });
    expect(projects).not.toHaveAttribute('data-dragging');
    fireEvent.pointerUp(window);
    expect(onItemsChange).not.toHaveBeenCalled();

    // Drag Projects from (0,0) by (+200px, +200px) -> snaps to (2, 2)
    fireEvent.pointerDown(projects, { button: 0, clientX: 140, clientY: 140 });
    fireEvent.pointerMove(window, { clientX: 340, clientY: 340 });
    expect(projects).toHaveAttribute('data-dragging', 'true');
    expect(stage).toHaveAttribute('data-dragging-icon', 'projects');

    fireEvent.pointerUp(window);
    expect(projects).not.toHaveAttribute('data-dragging');
    expect(projects).toHaveAttribute('data-col', '2');
    expect(projects).toHaveAttribute('data-row', '2');
    expect(onItemsChange).toHaveBeenCalledTimes(1);

    // Trailing synthetic click right after drag is suppressed
    const selCallsBefore = onSelectionChange.mock.calls.length;
    fireEvent.click(projects);
    expect(onSelectionChange).toHaveBeenCalledTimes(selCallsBefore);

    // Drag Projects onto occupied (1, 0) (Release Assets.zip) -> resolves collision to nearest open cell
    fireEvent.pointerDown(projects, { button: 0, clientX: 340, clientY: 340 });
    fireEvent.pointerMove(window, { clientX: 240, clientY: 140 });
    fireEvent.pointerUp(window);
    const afterCollision = onItemsChange.mock.calls.at(-1)?.[0] ?? [];
    const movedProjects = afterCollision.find((i) => i.id === 'projects')!;
    const occupiedByOthers = new Set(
      afterCollision
        .filter((i) => i.id !== 'projects')
        .map((i) => `${i.col}:${i.row}`)
    );
    expect(
      occupiedByOthers.has(`${movedProjects.col}:${movedProjects.row}`)
    ).toBe(false);

    // Turn off Snap to Grid and drag by fractional offset (+55px, +35px)
    fireEvent.click(screen.getByTestId('desktop-snap-toggle'));
    const beforeFreeCol = movedProjects.col;
    const beforeFreeRow = movedProjects.row;
    fireEvent.pointerDown(projects, { button: 0, clientX: 200, clientY: 200 });
    fireEvent.pointerMove(window, { clientX: 255, clientY: 235 });
    fireEvent.pointerUp(window);
    const afterFree = onItemsChange.mock.calls.at(-1)?.[0] ?? [];
    const freeProjects = afterFree.find((i) => i.id === 'projects')!;
    expect(freeProjects.col).toBeCloseTo(beforeFreeCol + 0.55, 2);
    expect(freeProjects.row).toBeCloseTo(beforeFreeRow + 0.35, 2);

    // pointercancel mid-drag restores icon cleanly without committing changes
    const changeCountBeforeCancel = onItemsChange.mock.calls.length;
    fireEvent.pointerDown(projects, { button: 0, clientX: 200, clientY: 200 });
    fireEvent.pointerMove(window, { clientX: 500, clientY: 350 });
    expect(projects).toHaveAttribute('data-dragging', 'true');
    fireEvent.pointerCancel(window);
    expect(projects).not.toHaveAttribute('data-dragging');
    expect(onItemsChange).toHaveBeenCalledTimes(changeCountBeforeCancel);
    expect(screen.getByTestId('desktop-status-live')).toHaveTextContent(
      'Cancelled moving "Projects".'
    );

    // Zero-sized stage rect fallback during drag + unmount mid-drag cleans up listeners
    mockElementRect(stage, 0, 0, 0, 0);
    fireEvent.pointerDown(projects, { button: 0, clientX: 10, clientY: 10 });
    fireEvent.pointerMove(window, { clientX: 122, clientY: 114 });
    expect(projects).toHaveAttribute('data-dragging', 'true');

    const countBeforeUnmount = onItemsChange.mock.calls.length;
    unmount();

    fireEvent.pointerMove(window, { clientX: 300, clientY: 300 });
    fireEvent.pointerUp(window);
    expect(onItemsChange).toHaveBeenCalledTimes(countBeforeUnmount);

    const addedMove = addSpy.mock.calls.filter(
      ([type]) => type === 'pointermove'
    ).length;
    const removedMove = removeSpy.mock.calls.filter(
      ([type]) => type === 'pointermove'
    ).length;
    expect(addedMove).toBeGreaterThanOrEqual(5);
    expect(removedMove).toBe(addedMove);
  });

  it('falls back cleanly when snapping onto an occupied cell in a completely full grid', () => {
    const onItemsChange = vi.fn<(items: DesktopIconItem[]) => void>();
    const fullGridItems: ReadonlyArray<DesktopIconItem> = [
      { id: 'c00', name: 'A', kind: 'folder', col: 0, row: 0 },
      { id: 'c10', name: 'B', kind: 'app', col: 1, row: 0 },
      { id: 'c20', name: 'C', kind: 'document', col: 2, row: 0 },
      { id: 'c01', name: 'D', kind: 'archive', col: 0, row: 1 },
      { id: 'c11', name: 'E', kind: 'image', col: 1, row: 1 },
      { id: 'c21', name: 'F', kind: 'drive', col: 2, row: 1 },
    ];

    render(
      <DesktopIconCanvas
        defaultItems={fullGridItems}
        gridCols={3}
        gridRows={2}
        onItemsChange={onItemsChange}
      />
    );

    const stage = screen.getByTestId('desktop-canvas-stage');
    mockElementRect(stage, 0, 0, 300, 200);
    const tileA = screen.getByTestId('desktop-icon-c00');

    // Drag c00 (0,0) onto c10 (1,0): only (0,0) is free since c00 is excluded from occupied!
    // Now add a 7th duplicate-cell item at (0,0) so all 6 cells are occupied by OTHER items
    const { unmount } = render(
      <DesktopIconCanvas
        defaultItems={[
          ...fullGridItems,
          { id: 'extra', name: 'G', kind: 'folder', col: 0, row: 0 },
        ]}
        gridCols={3}
        gridRows={2}
        onItemsChange={onItemsChange}
      />
    );
    const stages = screen.getAllByTestId('desktop-canvas-stage');
    mockElementRect(stages[1]!, 0, 0, 300, 200);
    const extraTile = screen.getByTestId('desktop-icon-extra');
    fireEvent.pointerDown(extraTile, { button: 0, clientX: 20, clientY: 20 });
    fireEvent.pointerMove(window, { clientX: 120, clientY: 20 });
    fireEvent.pointerUp(window);
    const updated = onItemsChange.mock.calls.at(-1)?.[0] ?? [];
    expect(updated.find((i) => i.id === 'extra')).toMatchObject({
      col: 1,
      row: 0,
    });

    // Also drag tileA cleanly to ensure no interference
    fireEvent.pointerDown(tileA, { button: 0, clientX: 20, clientY: 20 });
    fireEvent.pointerUp(window);
    unmount();
  });

  it('draws desktop-level marquee lasso with AABB intersection, reverse drag clamping, additive Shift/Ctrl drag, pointercancel, and unmount cleanup', () => {
    const addSpy = vi.spyOn(window, 'addEventListener');
    const removeSpy = vi.spyOn(window, 'removeEventListener');
    const onSelectionChange = vi.fn<(ids: string[]) => void>();

    const { unmount } = render(
      <DesktopIconCanvas onSelectionChange={onSelectionChange} />
    );

    const stage = screen.getByTestId('desktop-canvas-stage');
    mockElementRect(stage, 100, 100, 600, 400);

    // Position icon bounding rects matching 100x100 grid cells
    mockElementRect(
      screen.getByTestId('desktop-icon-projects'),
      110,
      110,
      80,
      80
    );
    mockElementRect(
      screen.getByTestId('desktop-icon-release-assets'),
      210,
      110,
      80,
      80
    );
    mockElementRect(
      screen.getByTestId('desktop-icon-refractor-studio'),
      110,
      210,
      80,
      80
    );
    mockElementRect(
      screen.getByTestId('desktop-icon-glass-study'),
      210,
      210,
      80,
      80
    );
    mockElementRect(
      screen.getByTestId('desktop-icon-q4-spec'),
      110,
      310,
      80,
      80
    );
    mockElementRect(
      screen.getByTestId('desktop-icon-macintosh-hd'),
      610,
      110,
      80,
      80
    );

    // Forward marquee drag covering Projects + Release Assets.zip
    fireEvent.pointerDown(stage, { button: 0, clientX: 105, clientY: 105 });
    const marqueeBox = screen.getByTestId('desktop-marquee-box');
    expect(marqueeBox.style.borderColor).toBe('var(--prism-primary-main)');
    expect(stage).toHaveAttribute('data-marquee-active', 'true');

    fireEvent.pointerMove(window, { clientX: 260, clientY: 170 });
    expect(marqueeBox).toHaveStyle({
      left: '5px',
      top: '5px',
      width: '155px',
      height: '65px',
    });
    expect(onSelectionChange).toHaveBeenLastCalledWith([
      'projects',
      'release-assets',
    ]);

    // Same intersection emits no duplicate callback
    const callsBeforeRepeat = onSelectionChange.mock.calls.length;
    fireEvent.pointerMove(window, { clientX: 265, clientY: 172 });
    expect(onSelectionChange).toHaveBeenCalledTimes(callsBeforeRepeat);

    fireEvent.pointerUp(window);
    expect(screen.queryByTestId('desktop-marquee-box')).toBeNull();

    // Additive Shift+drag over Macintosh HD preserves existing selection
    fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 750,
      clientY: 205,
      shiftKey: true,
    });
    fireEvent.pointerMove(window, { clientX: 640, clientY: 130 });
    expect(onSelectionChange).toHaveBeenLastCalledWith([
      'projects',
      'release-assets',
      'macintosh-hd',
    ]);
    fireEvent.pointerUp(window);

    // Shift+click on empty canvas without moving preserves selection
    const callsBeforeShiftClick = onSelectionChange.mock.calls.length;
    fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 400,
      clientY: 350,
      shiftKey: true,
    });
    fireEvent.pointerUp(window);
    expect(onSelectionChange).toHaveBeenCalledTimes(callsBeforeShiftClick);

    // Plain click on empty canvas without moving clears selection
    fireEvent.pointerDown(stage, { button: 0, clientX: 400, clientY: 350 });
    fireEvent.pointerUp(window);
    expect(onSelectionChange).toHaveBeenLastCalledWith([]);

    // Zero-sized stage and zero-sized icon fallback
    mockElementRect(stage, 0, 0, 0, 0);
    mockElementRect(screen.getByTestId('desktop-icon-projects'), 0, 0, 0, 0);
    fireEvent.pointerDown(stage, { button: 0, clientX: 0, clientY: 0 });
    fireEvent.pointerMove(window, { clientX: 250, clientY: 160 });
    expect(onSelectionChange).toHaveBeenLastCalledWith(['release-assets']);
    fireEvent.pointerUp(window);

    // pointercancel mid-marquee removes box and listeners
    mockElementRect(stage, 100, 100, 600, 400);
    fireEvent.pointerDown(stage, { button: 0, clientX: 105, clientY: 105 });
    expect(screen.getByTestId('desktop-marquee-box')).toBeInTheDocument();
    fireEvent.pointerCancel(window);
    expect(screen.queryByTestId('desktop-marquee-box')).toBeNull();

    // Unmount mid-marquee removes all listeners
    fireEvent.pointerDown(stage, { button: 0, clientX: 105, clientY: 105 });
    expect(screen.getByTestId('desktop-marquee-box')).toBeInTheDocument();
    const callsBeforeUnmount = onSelectionChange.mock.calls.length;
    unmount();

    fireEvent.pointerMove(window, { clientX: 680, clientY: 380 });
    fireEvent.pointerUp(window);
    expect(onSelectionChange).toHaveBeenCalledTimes(callsBeforeUnmount);

    const addedMove = addSpy.mock.calls.filter(
      ([type]) => type === 'pointermove'
    ).length;
    const removedMove = removeSpy.mock.calls.filter(
      ([type]) => type === 'pointermove'
    ).length;
    expect(addedMove).toBeGreaterThanOrEqual(6);
    expect(removedMove).toBe(addedMove);
  });

  it('supports keyboard spatial navigation, Alt+Arrow cell nudging, Space/Enter/Ctrl+A/Escape, and IME composition guard', () => {
    const onItemsChange = vi.fn<(items: DesktopIconItem[]) => void>();
    const onSelectionChange = vi.fn<(ids: string[]) => void>();
    const onOpenItem = vi.fn<(item: DesktopIconItem) => void>();

    render(
      <DesktopIconCanvas
        onItemsChange={onItemsChange}
        onSelectionChange={onSelectionChange}
        onOpenItem={onOpenItem}
      />
    );

    const stage = screen.getByTestId('desktop-canvas-stage');
    const projects = screen.getByTestId('desktop-icon-projects');
    const releaseAssets = screen.getByTestId('desktop-icon-release-assets');
    const macHd = screen.getByTestId('desktop-icon-macintosh-hd');
    const glassStudy = screen.getByTestId('desktop-icon-glass-study');
    const q4Spec = screen.getByTestId('desktop-icon-q4-spec');

    projects.focus();
    expect(document.activeElement).toBe(projects);

    // ArrowUp at top boundary stays on Projects
    fireEvent.keyDown(projects, { key: 'ArrowUp' });
    expect(document.activeElement).toBe(projects);

    // Spatial arrows: Right -> Release Assets -> Right -> Macintosh HD -> Left -> Release Assets -> Left -> Projects -> Right -> Release Assets -> Down -> Glass Study -> Up -> Release Assets
    fireEvent.keyDown(projects, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(releaseAssets);
    fireEvent.keyDown(releaseAssets, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(macHd);
    fireEvent.keyDown(macHd, { key: 'ArrowLeft' });
    expect(document.activeElement).toBe(releaseAssets);
    fireEvent.keyDown(releaseAssets, { key: 'ArrowLeft' });
    expect(document.activeElement).toBe(projects);
    fireEvent.keyDown(projects, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(releaseAssets);
    fireEvent.keyDown(releaseAssets, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(glassStudy);
    fireEvent.keyDown(glassStudy, { key: 'ArrowUp' });
    expect(document.activeElement).toBe(releaseAssets);

    // End -> Q4 Spec (last in reading order), Home -> Projects (first in reading order)
    fireEvent.keyDown(releaseAssets, { key: 'End' });
    expect(document.activeElement).toBe(q4Spec);
    fireEvent.keyDown(q4Spec, { key: 'Home' });
    expect(document.activeElement).toBe(projects);

    // Space toggles selection on and off
    fireEvent.keyDown(projects, { key: ' ' });
    expect(onSelectionChange).toHaveBeenLastCalledWith(['projects']);
    fireEvent.keyDown(projects, { key: ' ' });
    expect(onSelectionChange).toHaveBeenLastCalledWith([]);

    // Keydown dispatched directly on stage uses effectiveFocusedId
    fireEvent.keyDown(stage, { key: 'Enter' });
    expect(onOpenItem).toHaveBeenCalledTimes(1);
    expect(onOpenItem).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: 'projects' })
    );

    // Ctrl+A / Meta+A select all; Escape clears selection
    fireEvent.keyDown(projects, { key: 'a', ctrlKey: true });
    expect(onSelectionChange).toHaveBeenLastCalledWith(
      DEFAULT_DESKTOP_ICONS.map((i) => i.id)
    );
    fireEvent.keyDown(projects, { key: 'Escape' });
    expect(onSelectionChange).toHaveBeenLastCalledWith([]);
    fireEvent.keyDown(projects, { key: 'A', metaKey: true });
    expect(onSelectionChange).toHaveBeenLastCalledWith(
      DEFAULT_DESKTOP_ICONS.map((i) => i.id)
    );

    // Unrelated key ignored safely
    const callsBeforeOther = onSelectionChange.mock.calls.length;
    fireEvent.keyDown(projects, { key: 'x' });
    expect(onSelectionChange).toHaveBeenCalledTimes(callsBeforeOther);

    // Alt+ArrowUp at row 0 edge is a clean no-op
    fireEvent.keyDown(projects, { key: 'ArrowUp', altKey: true });
    expect(onItemsChange).not.toHaveBeenCalled();

    // Alt+ArrowRight from (0,0) into occupied (1,0) snaps to nearest open cell cleanly
    fireEvent.keyDown(projects, { key: 'ArrowRight', altKey: true });
    expect(onItemsChange).toHaveBeenCalledTimes(1);
    const nudgedItems = onItemsChange.mock.calls.at(-1)?.[0] ?? [];
    const nudgedProjects = nudgedItems.find((i) => i.id === 'projects')!;
    expect(nudgedProjects).toMatchObject({ col: 2, row: 0 });
    expect(screen.getByTestId('desktop-status-live')).toHaveTextContent(
      'Moved "Projects" to column 3, row 1.'
    );

    // Alt+ArrowDown and Alt+ArrowLeft when Snap to Grid is disabled allow direct cell coordinates
    fireEvent.click(screen.getByTestId('desktop-snap-toggle'));
    fireEvent.keyDown(projects, { key: 'ArrowDown', altKey: true });
    expect(
      (onItemsChange.mock.calls.at(-1)?.[0] ?? []).find(
        (i) => i.id === 'projects'
      )
    ).toMatchObject({ col: 2, row: 1 });
    fireEvent.keyDown(projects, { key: 'ArrowLeft', altKey: true });
    expect(
      (onItemsChange.mock.calls.at(-1)?.[0] ?? []).find(
        (i) => i.id === 'projects'
      )
    ).toMatchObject({ col: 1, row: 1 });

    // IME composition guards both canvas shortcuts and toolbar buttons
    const callsBeforeIme = onSelectionChange.mock.calls.length;
    dispatchComposingKeyDown(projects, 'Escape');
    expect(onSelectionChange).toHaveBeenCalledTimes(callsBeforeIme);

    const snapBtn = screen.getByTestId('desktop-snap-toggle');
    const composingBtnEvent = dispatchComposingKeyDown(snapBtn, 'Enter');
    expect(composingBtnEvent.defaultPrevented).toBe(true);

    const normalBtnEvent = new KeyboardEvent('keydown', {
      key: 'Enter',
      bubbles: true,
      cancelable: true,
    });
    snapBtn.dispatchEvent(normalBtnEvent);
    expect(normalBtnEvent.defaultPrevented).toBe(false);
  });

  it('supports F2 inline rename with validation against empty, path-separator, traversal, control-char, and duplicate names, plus Escape/IME/background cancel', () => {
    const onItemsChange = vi.fn<(items: DesktopIconItem[]) => void>();
    const onOpenItem = vi.fn<(item: DesktopIconItem) => void>();

    render(
      <DesktopIconCanvas
        onItemsChange={onItemsChange}
        onOpenItem={onOpenItem}
      />
    );

    const stage = screen.getByTestId('desktop-canvas-stage');
    const projects = screen.getByTestId('desktop-icon-projects');
    projects.focus();

    // Press F2 to enter inline rename mode
    fireEvent.keyDown(projects, { key: 'F2' });
    const input = screen.getByTestId('desktop-rename-input') as HTMLInputElement;
    expect(input.value).toBe('Projects');

    // Clicking or pointerDown inside rename input keeps rename active and ignores icon click/dblclick
    fireEvent.pointerDown(input, { button: 0 });
    fireEvent.click(input);
    fireEvent.click(projects);
    fireEvent.doubleClick(projects);
    fireEvent.keyDown(stage, { key: 'Escape' }); // stage guard ignores while renaming
    expect(onOpenItem).not.toHaveBeenCalled();
    expect(screen.getByTestId('desktop-rename-input')).toBeInTheDocument();

    // Empty name rejected
    fireEvent.change(input, { target: { value: '   ' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(screen.getByTestId('desktop-rename-error')).toHaveTextContent(
      'Name cannot be empty.'
    );
    expect(input).toHaveAttribute('aria-invalid', 'true');

    // Malicious path-separator, traversal, dot, and control-char names rejected
    const maliciousNames = [
      '../evil',
      'sub/folder',
      'win\\path',
      '.',
      '..',
      'bad\u0007bell',
    ];
    for (const badName of maliciousNames) {
      fireEvent.change(input, { target: { value: badName } });
      expect(screen.queryByTestId('desktop-rename-error')).toBeNull();
      fireEvent.keyDown(input, { key: 'Enter' });
      expect(screen.getByTestId('desktop-rename-error')).toHaveTextContent(
        /path separators/i
      );
    }

    // Duplicate name (case-insensitive) rejected
    fireEvent.change(input, { target: { value: 'macintosh hd' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(screen.getByTestId('desktop-rename-error')).toHaveTextContent(
      'An icon with this name already exists.'
    );
    expect(onItemsChange).not.toHaveBeenCalled();

    // IME composing Enter inside rename input does not commit or close rename
    fireEvent.change(input, { target: { value: 'Design Systems' } });
    dispatchComposingKeyDown(input, 'Enter');
    expect(screen.getByTestId('desktop-rename-input')).toBeInTheDocument();
    expect(onItemsChange).not.toHaveBeenCalled();

    // Normal Enter commits valid rename
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(screen.queryByTestId('desktop-rename-input')).toBeNull();
    expect(screen.getByTestId('desktop-icon-label-projects')).toHaveTextContent(
      'Design Systems'
    );
    expect(onItemsChange).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('desktop-status-live')).toHaveTextContent(
      'Renamed "Projects" to "Design Systems".'
    );

    // Unchanged rename closes without firing onItemsChange
    fireEvent.keyDown(projects, { key: 'F2' });
    const unchangedInput = screen.getByTestId('desktop-rename-input');
    fireEvent.keyDown(unchangedInput, { key: 'Enter' });
    expect(onItemsChange).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('desktop-status-live')).toHaveTextContent(
      'Rename unchanged.'
    );

    // Escape cancels rename and restores focus
    fireEvent.keyDown(projects, { key: 'F2' });
    const cancelInput = screen.getByTestId('desktop-rename-input');
    fireEvent.change(cancelInput, { target: { value: 'Temporary' } });
    fireEvent.keyDown(cancelInput, { key: 'Escape' });
    expect(screen.queryByTestId('desktop-rename-input')).toBeNull();
    expect(screen.getByTestId('desktop-icon-label-projects')).toHaveTextContent(
      'Design Systems'
    );
    expect(screen.getByTestId('desktop-status-live')).toHaveTextContent(
      'Rename cancelled.'
    );

    // Clicking canvas background while renaming exits rename cleanly
    fireEvent.keyDown(projects, { key: 'F2' });
    expect(screen.getByTestId('desktop-rename-input')).toBeInTheDocument();
    fireEvent.pointerDown(stage, { button: 0, clientX: 500, clientY: 300 });
    fireEvent.pointerUp(window);
    expect(screen.queryByTestId('desktop-rename-input')).toBeNull();
  });

  it('sanitizes NaN/Infinity/out-of-bounds grid dimensions, handles empty desktop, and defends against XSS and prototype-pollution keys', () => {
    const xssName = '<img src=x onerror=alert(1)>';
    const adversarialItems: ReadonlyArray<DesktopIconItem> = [
      {
        id: '__proto__',
        name: xssName,
        kind: 'document',
        col: Number.NaN,
        row: Number.POSITIVE_INFINITY,
      },
      {
        id: 'constructor',
        name: 'SafeDrive',
        kind: 'drive',
        col: 999,
        row: -50,
      },
    ];

    const { rerender } = render(
      <DesktopIconCanvas
        items={adversarialItems}
        gridCols={Number.NaN}
        gridRows={Number.POSITIVE_INFINITY}
        defaultSelectedIds={['__proto__', '__proto__', 'missing-id']}
      />
    );

    const stage = screen.getByTestId('desktop-canvas-stage');
    expect(stage).toHaveAttribute('data-grid-cols', '6');
    expect(stage).toHaveAttribute('data-grid-rows', '4');
    expect(document.querySelector('img')).toBeNull();
    expect(screen.getByText(xssName)).toBeInTheDocument();
    expect(screen.getByTestId('desktop-icon-__proto__')).toHaveAttribute(
      'data-col',
      '0'
    );
    expect(screen.getByTestId('desktop-icon-__proto__')).toHaveAttribute(
      'data-row',
      '0'
    );
    expect(screen.getByTestId('desktop-icon-constructor')).toHaveAttribute(
      'data-col',
      '5'
    );
    expect(screen.getByTestId('desktop-icon-constructor')).toHaveAttribute(
      'data-row',
      '0'
    );
    expect(screen.getByTestId('desktop-selection-count')).toHaveTextContent(
      '1 selected'
    );

    // Clamping gridCols [3..12] and gridRows [2..8]
    rerender(
      <DesktopIconCanvas items={adversarialItems} gridCols={1} gridRows={1} />
    );
    expect(stage).toHaveAttribute('data-grid-cols', '3');
    expect(stage).toHaveAttribute('data-grid-rows', '2');

    rerender(
      <DesktopIconCanvas items={adversarialItems} gridCols={40} gridRows={20} />
    );
    expect(stage).toHaveAttribute('data-grid-cols', '12');
    expect(stage).toHaveAttribute('data-grid-rows', '8');

    // Empty desktop state (fresh mount + rerender) handles keyboard shortcuts safely
    rerender(<DesktopIconCanvas items={[]} />);
    expect(screen.getByTestId('desktop-canvas-empty')).toHaveTextContent(
      'Desktop is empty'
    );
    expect(screen.getByTestId('desktop-sort-name')).toBeDisabled();
    fireEvent.keyDown(stage, { key: 'a', ctrlKey: true });
    fireEvent.keyDown(stage, { key: 'ArrowRight' });
    expect(screen.getByTestId('desktop-selection-count')).toHaveTextContent(
      '0 selected'
    );

    const { unmount: unmountEmpty } = render(<DesktopIconCanvas items={[]} />);
    expect(screen.getAllByTestId('desktop-canvas-empty')).toHaveLength(2);
    unmountEmpty();
  });

  it('respects controlled props and enforces disabled state across clicks, drags, keyboard, and stripped DOM disabled attributes', () => {
    const onItemsChange = vi.fn<(items: DesktopIconItem[]) => void>();
    const onSelectionChange = vi.fn<(ids: string[]) => void>();
    const onWallpaperChange = vi.fn<(preset: DesktopWallpaperPreset) => void>();
    const onOpenItem = vi.fn<(item: DesktopIconItem) => void>();

    function ControlledHarness() {
      const [items, setItems] = useState<DesktopIconItem[]>([
        ...DEFAULT_DESKTOP_ICONS,
      ]);
      const [selectedIds, setSelectedIds] = useState<string[]>(['projects']);
      const [wallpaper, setWallpaper] =
        useState<DesktopWallpaperPreset>('obsidian-grid');

      return (
        <DesktopIconCanvas
          items={items}
          selectedIds={selectedIds}
          wallpaper={wallpaper}
          snapToGrid={true}
          onItemsChange={(next) => {
            onItemsChange(next);
            setItems(next);
          }}
          onSelectionChange={(next) => {
            onSelectionChange(next);
            setSelectedIds(next);
          }}
          onWallpaperChange={(next) => {
            onWallpaperChange(next);
            setWallpaper(next);
          }}
          onOpenItem={onOpenItem}
          data-testid="controlled-desktop"
        />
      );
    }

    const { unmount } = render(<ControlledHarness />);
    expect(screen.getByTestId('desktop-canvas-stage')).toHaveAttribute(
      'data-wallpaper',
      'obsidian-grid'
    );
    expect(screen.getByTestId('desktop-selection-count')).toHaveTextContent(
      '1 selected'
    );

    // Controlled snapToGrid stays true even after clicking toggle
    fireEvent.click(screen.getByTestId('desktop-snap-toggle'));
    expect(screen.getByTestId('desktop-snap-toggle')).toHaveAttribute(
      'aria-pressed',
      'true'
    );

    // Controlled wallpaper, items, and selection update cleanly via callbacks
    fireEvent.click(screen.getByTestId('desktop-wallpaper-solar-refraction'));
    expect(onWallpaperChange).toHaveBeenLastCalledWith('solar-refraction');
    expect(screen.getByTestId('desktop-canvas-stage')).toHaveAttribute(
      'data-wallpaper',
      'solar-refraction'
    );

    fireEvent.click(screen.getByTestId('desktop-sort-name'));
    expect(onItemsChange).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByTestId('desktop-clear-selection'));
    expect(onSelectionChange).toHaveBeenLastCalledWith([]);
    unmount();

    // Frozen controlled props (no state setters) emit callbacks without mutating DOM
    const onFrozenItems = vi.fn<(items: DesktopIconItem[]) => void>();
    const onFrozenSel = vi.fn<(ids: string[]) => void>();
    const onFrozenWall = vi.fn<(preset: DesktopWallpaperPreset) => void>();

    const { rerender } = render(
      <DesktopIconCanvas
        items={DEFAULT_DESKTOP_ICONS}
        selectedIds={['projects']}
        wallpaper="prism-aurora"
        snapToGrid={true}
        onItemsChange={onFrozenItems}
        onSelectionChange={onFrozenSel}
        onWallpaperChange={onFrozenWall}
        onOpenItem={onOpenItem}
        data-testid="frozen-desktop"
      />
    );

    const frozenStage = screen.getByTestId('desktop-canvas-stage');
    mockElementRect(frozenStage, 0, 0, 600, 400);
    mockElementRect(screen.getByTestId('desktop-icon-projects'), 10, 10, 80, 80);
    mockElementRect(
      screen.getByTestId('desktop-icon-release-assets'),
      110,
      10,
      80,
      80
    );

    // Drag icon under frozen controlled items -> emits onItemsChange while DOM stays pinned
    const frozenProjects = screen.getByTestId('desktop-icon-projects');
    fireEvent.pointerDown(frozenProjects, {
      button: 0,
      clientX: 40,
      clientY: 40,
    });
    fireEvent.pointerMove(window, { clientX: 340, clientY: 240 });
    fireEvent.pointerUp(window);
    expect(onFrozenItems).toHaveBeenCalledTimes(1);
    expect(frozenProjects).toHaveAttribute('data-col', '0');

    // Marquee under frozen controlled selection -> emits onSelectionChange while DOM stays pinned
    fireEvent.pointerDown(frozenStage, { button: 0, clientX: 5, clientY: 5 });
    fireEvent.pointerMove(window, { clientX: 160, clientY: 60 });
    fireEvent.pointerUp(window);
    expect(onFrozenSel).toHaveBeenCalledWith(['projects', 'release-assets']);
    expect(screen.getByTestId('desktop-selection-count')).toHaveTextContent(
      '1 selected'
    );

    // Start active marquee, then flip disabled=true mid-drag -> aborts session cleanly
    fireEvent.pointerDown(frozenStage, { button: 0, clientX: 5, clientY: 5 });
    expect(screen.getByTestId('desktop-marquee-box')).toBeInTheDocument();

    onFrozenItems.mockClear();
    onFrozenSel.mockClear();
    onFrozenWall.mockClear();
    onOpenItem.mockClear();

    rerender(
      <DesktopIconCanvas
        disabled
        items={DEFAULT_DESKTOP_ICONS}
        selectedIds={['projects']}
        wallpaper="prism-aurora"
        snapToGrid={true}
        onItemsChange={onFrozenItems}
        onSelectionChange={onFrozenSel}
        onWallpaperChange={onFrozenWall}
        onOpenItem={onOpenItem}
        data-testid="frozen-desktop"
      />
    );

    expect(screen.queryByTestId('desktop-marquee-box')).toBeNull();
    expect(screen.getByTestId('frozen-desktop')).toHaveAttribute(
      'data-disabled',
      'true'
    );
    expect(frozenProjects).toHaveAttribute('tabindex', '-1');
    expect(frozenProjects).toHaveAttribute('aria-disabled', 'true');

    // Disabled blocks click, dblclick, pointerdown, keydown, and even buttons with stripped disabled attribute
    fireEvent.click(frozenProjects);
    fireEvent.doubleClick(frozenProjects);
    fireEvent.pointerDown(frozenStage, { button: 0, clientX: 5, clientY: 5 });
    fireEvent.keyDown(frozenStage, { key: 'a', ctrlKey: true });

    const toolbarButtons = [
      screen.getByTestId('desktop-wallpaper-alabaster-mist'),
      screen.getByTestId('desktop-snap-toggle'),
      screen.getByTestId('desktop-sort-name'),
      screen.getByTestId('desktop-open-selected'),
      screen.getByTestId('desktop-clear-selection'),
    ];
    for (const btn of toolbarButtons) {
      expect(btn).toBeDisabled();
      btn.removeAttribute('disabled');
      fireEvent.click(btn);
    }

    expect(onFrozenItems).not.toHaveBeenCalled();
    expect(onFrozenSel).not.toHaveBeenCalled();
    expect(onFrozenWall).not.toHaveBeenCalled();
    expect(onOpenItem).not.toHaveBeenCalled();
  });
});
