import { createRef, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import {
  MarqueeSelectionBox,
  type MarqueeSelectableItem,
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

function mockFourByTwoGridLayout(stage: HTMLElement, itemIds: ReadonlyArray<string>) {
  // Stage: (100, 100) to (520, 320) -> width 420, height 220
  mockElementRect(stage, 100, 100, 420, 220);

  // 4 columns x 2 rows of 90x80 tiles with 10px gaps starting at (110, 110)
  itemIds.forEach((id, index) => {
    const tile = screen.getByTestId(`marquee-item-${id}`);
    const col = index % 4;
    const row = Math.floor(index / 4);
    const left = 110 + col * 100;
    const top = 110 + row * 100;
    mockElementRect(tile, left, top, 90, 80);
  });
}

const DEFAULT_IDS: ReadonlyArray<string> = [
  'hero-prism',
  'optical-tokens',
  'release-notes',
  'shaders',
  'caustic-pass',
  'budget-q4',
  'audio-master',
  'archive-zip',
];

describe('MarqueeSelectionBox', () => {
  it('renders prism-slab panel, default 8 realistic items, ARIA listbox, header controls, polite live summary, theme override, and React 19 ref', () => {
    const ref = createRef<HTMLDivElement>();

    render(
      <PrismThemeProvider
        theme={{
          components: {
            MarqueeSelectionBox: {
              className: 'theme-marquee',
              style: { maxWidth: '640px' },
            },
          },
        }}
      >
        <MarqueeSelectionBox
          ref={ref}
          className="local-marquee"
          xstyle={{ '--prism-blur-px': '20px' }}
          style={{ padding: '20px' }}
          data-testid="marquee-root"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('marquee-root');
    expect(MarqueeSelectionBox.displayName).toBe('MarqueeSelectionBox');
    expect(ref.current).toBe(root);
    expect(root).toHaveClass(
      'refractor-marquee-selection-box',
      'prism-slab',
      'theme-marquee',
      'local-marquee'
    );
    expect(root).toHaveStyle({ maxWidth: '640px', padding: '20px' });
    expect(root).toHaveAttribute('role', 'region');
    expect(root).not.toHaveAttribute('data-has-selection');
    expect(root).not.toHaveAttribute('data-dragging');

    expect(screen.getByTestId('marquee-title')).toHaveTextContent('Optical Marquee Selection');
    expect(screen.getByTestId('marquee-selection-count')).toHaveTextContent('0 of 8 selected');
    expect(screen.getByTestId('marquee-select-all')).toBeEnabled();
    expect(screen.getByTestId('marquee-clear')).toBeDisabled();

    const listbox = screen.getByRole('listbox');
    expect(listbox).toHaveAttribute('aria-multiselectable', 'true');
    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(8);
    expect(options[0]).toHaveAttribute('tabindex', '0');
    expect(options[1]).toHaveAttribute('tabindex', '-1');

    const expectedNames = [
      'Hero_Prism.png',
      'OpticalTokens.ts',
      'ReleaseNotes.md',
      'Shaders',
      'CausticPass.glsl',
      'Budget_Q4.csv',
      'AudioMaster.wav',
      'Archive.zip',
    ];
    for (const name of expectedNames) {
      expect(screen.getByText(name)).toBeInTheDocument();
    }

    const liveSummary = screen.getByTestId('marquee-live-summary');
    expect(liveSummary).toHaveAttribute('aria-live', 'polite');
    expect(liveSummary).toHaveTextContent(/0 of 8 selected/i);
  });

  it('handles plain click, Ctrl/Meta/Shift multi-select toggling, Select All, Clear, and deduplicated emissions', () => {
    const onSelectionChange = vi.fn<(ids: ReadonlyArray<string>) => void>();

    render(
      <MarqueeSelectionBox
        title="Asset Vault"
        onSelectionChange={onSelectionChange}
        data-testid="click-root"
      />
    );

    const tile0 = screen.getByTestId('marquee-item-hero-prism');
    const tile1 = screen.getByTestId('marquee-item-optical-tokens');
    const tile2 = screen.getByTestId('marquee-item-release-notes');
    const tile3 = screen.getByTestId('marquee-item-shaders');

    // Plain click selects single item
    fireEvent.click(tile0);
    expect(tile0).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByTestId('click-root')).toHaveAttribute('data-has-selection', 'true');
    expect(onSelectionChange).toHaveBeenLastCalledWith(['hero-prism']);
    expect(screen.getByTestId('marquee-selection-count')).toHaveTextContent('1 of 8 selected');
    expect(screen.getByTestId('marquee-live-summary')).toHaveTextContent(
      '1 of 8 selected: Hero_Prism.png.'
    );

    // Repeating plain click on the same sole item emits no duplicate callback
    const callsAfterFirst = onSelectionChange.mock.calls.length;
    fireEvent.click(tile0);
    expect(onSelectionChange).toHaveBeenCalledTimes(callsAfterFirst);

    // Plain click on another item replaces selection
    fireEvent.click(tile1);
    expect(tile0).toHaveAttribute('aria-selected', 'false');
    expect(tile1).toHaveAttribute('aria-selected', 'true');
    expect(onSelectionChange).toHaveBeenLastCalledWith(['optical-tokens']);

    // Ctrl+click adds item
    fireEvent.click(tile2, { ctrlKey: true });
    expect(onSelectionChange).toHaveBeenLastCalledWith(['optical-tokens', 'release-notes']);

    // Meta+click adds item
    fireEvent.click(tile3, { metaKey: true });
    expect(onSelectionChange).toHaveBeenLastCalledWith([
      'optical-tokens',
      'release-notes',
      'shaders',
    ]);
    expect(screen.getByTestId('marquee-live-summary')).toHaveTextContent(
      '3 of 8 selected: OpticalTokens.ts, ReleaseNotes.md, Shaders.'
    );

    // Shift+click adds 4th item -> summary truncates with "and 1 more"
    fireEvent.click(tile0, { shiftKey: true });
    expect(onSelectionChange).toHaveBeenLastCalledWith([
      'hero-prism',
      'optical-tokens',
      'release-notes',
      'shaders',
    ]);
    expect(screen.getByTestId('marquee-live-summary')).toHaveTextContent(
      '4 of 8 selected: Hero_Prism.png, OpticalTokens.ts, ReleaseNotes.md, and 1 more.'
    );

    // Ctrl+click on already-selected item removes it
    fireEvent.click(tile2, { ctrlKey: true });
    expect(onSelectionChange).toHaveBeenLastCalledWith([
      'hero-prism',
      'optical-tokens',
      'shaders',
    ]);

    // Select All button
    const selectAllBtn = screen.getByTestId('marquee-select-all');
    const clearBtn = screen.getByTestId('marquee-clear');
    fireEvent.click(selectAllBtn);
    expect(onSelectionChange).toHaveBeenLastCalledWith(DEFAULT_IDS);
    expect(screen.getByTestId('marquee-selection-count')).toHaveTextContent('8 of 8 selected');
    expect(selectAllBtn).toBeDisabled();
    expect(clearBtn).toBeEnabled();

    // Clear button
    fireEvent.click(clearBtn);
    expect(onSelectionChange).toHaveBeenLastCalledWith([]);
    expect(screen.getByTestId('marquee-selection-count')).toHaveTextContent('0 of 8 selected');
    expect(clearBtn).toBeDisabled();
    expect(selectAllBtn).toBeEnabled();
  });

  it('performs pointer marquee lasso drag with AABB intersection, reverse drag, clamping, and tile-origin drag suppression', () => {
    const onSelectionChange = vi.fn<(ids: ReadonlyArray<string>) => void>();

    render(
      <MarqueeSelectionBox
        onSelectionChange={onSelectionChange}
        data-testid="lasso-root"
      />
    );

    const root = screen.getByTestId('lasso-root');
    const stage = screen.getByTestId('marquee-stage');
    mockFourByTwoGridLayout(stage, DEFAULT_IDS);

    // Secondary mouse button ignored
    fireEvent.pointerDown(stage, { button: 2, clientX: 105, clientY: 105 });
    expect(screen.queryByTestId('marquee-lasso-rect')).not.toBeInTheDocument();

    // Forward drag TL -> BR over first two tiles (hero-prism at x:[110..200], optical-tokens at x:[210..300])
    fireEvent.pointerDown(stage, { button: 0, clientX: 105, clientY: 105 });
    expect(root).toHaveAttribute('data-dragging', 'true');
    const lasso = screen.getByTestId('marquee-lasso-rect');
    expect(lasso).toHaveStyle({
      left: '5px',
      top: '5px',
      width: '0px',
      height: '0px',
    });
    expect(lasso.style.borderColor).toBe('var(--prism-primary-main)');
    expect(lasso.style.backgroundColor).toBe(
      'color-mix(in srgb, var(--prism-primary-main) 18%, transparent)'
    );

    // Move across first two tiles
    fireEvent.pointerMove(window, { clientX: 250, clientY: 160 });
    expect(lasso).toHaveStyle({ left: '5px', top: '5px', width: '145px', height: '55px' });
    expect(onSelectionChange).toHaveBeenLastCalledWith(['hero-prism', 'optical-tokens']);

    // Identical intersection emits no duplicate callback
    const callsBeforeRepeat = onSelectionChange.mock.calls.length;
    fireEvent.pointerMove(window, { clientX: 255, clientY: 165 });
    expect(onSelectionChange).toHaveBeenCalledTimes(callsBeforeRepeat);

    fireEvent.pointerUp(window);
    expect(screen.queryByTestId('marquee-lasso-rect')).not.toBeInTheDocument();
    expect(root).not.toHaveAttribute('data-dragging');

    // Reverse drag BR -> TL across bottom-right 2 tiles (audio-master at x:[310..400], y:[210..290] & archive-zip at x:[410..500], y:[210..290])
    // Dragging beyond stage bottom-right (900, 900) clamps cleanly inside stage right=520, bottom=320
    fireEvent.pointerDown(stage, { button: 0, clientX: 900, clientY: 900 });
    fireEvent.pointerMove(window, { clientX: 350, clientY: 240 });
    const reverseLasso = screen.getByTestId('marquee-lasso-rect');
    expect(reverseLasso).toHaveStyle({ left: '250px', top: '140px', width: '170px', height: '80px' });
    expect(onSelectionChange).toHaveBeenLastCalledWith(['audio-master', 'archive-zip']);
    fireEvent.pointerUp(window);

    // Click on empty stage without moving clears selection
    fireEvent.pointerDown(stage, { button: 0, clientX: 102, clientY: 102 });
    fireEvent.pointerUp(window);
    expect(onSelectionChange).toHaveBeenLastCalledWith([]);

    // Drag starting directly on a tile: tiny movement (< 4px) does not activate lasso and allows normal click
    const tile0 = screen.getByTestId('marquee-item-hero-prism');
    fireEvent.pointerDown(tile0, { button: 0, clientX: 140, clientY: 140 });
    fireEvent.pointerMove(window, { clientX: 141, clientY: 141 });
    expect(screen.queryByTestId('marquee-lasso-rect')).not.toBeInTheDocument();
    fireEvent.pointerUp(window);
    fireEvent.click(tile0);
    expect(onSelectionChange).toHaveBeenLastCalledWith(['hero-prism']);

    // Drag starting on tile0 moving >= 4px activates lasso over tile0 + tile1 and suppresses trailing click on tile0
    fireEvent.pointerDown(tile0, { button: 0, clientX: 140, clientY: 140 });
    fireEvent.pointerMove(window, { clientX: 250, clientY: 160 });
    expect(screen.getByTestId('marquee-lasso-rect')).toBeInTheDocument();
    expect(onSelectionChange).toHaveBeenLastCalledWith(['hero-prism', 'optical-tokens']);
    fireEvent.pointerUp(window);

    // Trailing synthetic click on tile0 is suppressed so lasso selection stays intact
    const callsAfterTileDrag = onSelectionChange.mock.calls.length;
    fireEvent.click(tile0);
    expect(onSelectionChange).toHaveBeenCalledTimes(callsAfterTileDrag);
    expect(screen.getByTestId('marquee-selection-count')).toHaveTextContent('2 of 8 selected');

    // Subsequent click on tile2 works normally
    fireEvent.click(screen.getByTestId('marquee-item-release-notes'));
    expect(onSelectionChange).toHaveBeenLastCalledWith(['release-notes']);
  });

  it('supports additive Shift/Ctrl/Meta marquee dragging and raw coordinates when stage rect is zero-sized', () => {
    const onSelectionChange = vi.fn<(ids: ReadonlyArray<string>) => void>();

    render(
      <MarqueeSelectionBox
        defaultSelectedIds={['hero-prism']}
        onSelectionChange={onSelectionChange}
      />
    );

    const stage = screen.getByTestId('marquee-stage');
    mockFourByTwoGridLayout(stage, DEFAULT_IDS);

    // Shift+click on empty stage without moving preserves selection
    fireEvent.pointerDown(stage, { button: 0, clientX: 102, clientY: 102, shiftKey: true });
    fireEvent.pointerUp(window);
    expect(onSelectionChange).not.toHaveBeenCalled();

    // Additive Shift+drag over row 2 first two tiles (caustic-pass, budget-q4)
    fireEvent.pointerDown(stage, { button: 0, clientX: 105, clientY: 205, shiftKey: true });
    fireEvent.pointerMove(window, { clientX: 250, clientY: 260 });
    expect(onSelectionChange).toHaveBeenLastCalledWith([
      'hero-prism',
      'caustic-pass',
      'budget-q4',
    ]);
    fireEvent.pointerUp(window);

    // Additive Ctrl+drag over shaders (top-right tile: x:[410..500], y:[110..190])
    fireEvent.pointerDown(stage, { button: 0, clientX: 405, clientY: 105, ctrlKey: true });
    fireEvent.pointerMove(window, { clientX: 460, clientY: 150 });
    expect(onSelectionChange).toHaveBeenLastCalledWith([
      'hero-prism',
      'shaders',
      'caustic-pass',
      'budget-q4',
    ]);
    fireEvent.pointerUp(window);

    // Zero-size stage fallback + zero-size tile never spuriously intersects
    mockElementRect(stage, 0, 0, 0, 0);
    mockElementRect(screen.getByTestId('marquee-item-hero-prism'), 0, 0, 0, 0);
    fireEvent.pointerDown(stage, { button: 0, clientX: 0, clientY: 0 });
    fireEvent.pointerMove(window, { clientX: 250, clientY: 160 });
    // hero-prism has 0x0 rect -> excluded; optical-tokens at (210,110)-(300,190) -> included
    expect(onSelectionChange).toHaveBeenLastCalledWith(['optical-tokens']);
    fireEvent.pointerUp(window);
  });

  it('cleans up window pointer listeners cleanly on pointercancel, disabled flip mid-drag, and unmount mid-drag', () => {
    const addSpy = vi.spyOn(window, 'addEventListener');
    const removeSpy = vi.spyOn(window, 'removeEventListener');
    const onSelectionChange = vi.fn<(ids: ReadonlyArray<string>) => void>();

    const { rerender, unmount } = render(
      <MarqueeSelectionBox
        onSelectionChange={onSelectionChange}
        data-testid="cleanup-root"
      />
    );

    const stage = screen.getByTestId('marquee-stage');
    mockFourByTwoGridLayout(stage, DEFAULT_IDS);

    // 1. pointercancel mid-drag
    fireEvent.pointerDown(stage, { button: 0, clientX: 105, clientY: 105 });
    fireEvent.pointerMove(window, { clientX: 160, clientY: 150 });
    expect(onSelectionChange).toHaveBeenLastCalledWith(['hero-prism']);
    expect(screen.getByTestId('marquee-lasso-rect')).toBeInTheDocument();

    fireEvent.pointerCancel(window);
    expect(screen.queryByTestId('marquee-lasso-rect')).not.toBeInTheDocument();
    expect(screen.getByTestId('cleanup-root')).not.toHaveAttribute('data-dragging');

    const callsAfterCancel = onSelectionChange.mock.calls.length;
    fireEvent.pointerMove(window, { clientX: 500, clientY: 300 });
    expect(onSelectionChange).toHaveBeenCalledTimes(callsAfterCancel);

    // 2. disabled flipped true mid-drag aborts lasso and removes listeners
    fireEvent.pointerDown(stage, { button: 0, clientX: 105, clientY: 105 });
    expect(screen.getByTestId('marquee-lasso-rect')).toBeInTheDocument();
    rerender(
      <MarqueeSelectionBox
        disabled
        onSelectionChange={onSelectionChange}
        data-testid="cleanup-root"
      />
    );
    expect(screen.queryByTestId('marquee-lasso-rect')).not.toBeInTheDocument();
    const callsAfterDisable = onSelectionChange.mock.calls.length;
    fireEvent.pointerMove(window, { clientX: 500, clientY: 300 });
    expect(onSelectionChange).toHaveBeenCalledTimes(callsAfterDisable);

    // 3. Re-enable, start drag, and unmount mid-drag
    rerender(
      <MarqueeSelectionBox
        disabled={false}
        onSelectionChange={onSelectionChange}
        data-testid="cleanup-root"
      />
    );
    const liveStage = screen.getByTestId('marquee-stage');
    mockFourByTwoGridLayout(liveStage, DEFAULT_IDS);
    fireEvent.pointerDown(liveStage, { button: 0, clientX: 105, clientY: 105 });
    expect(screen.getByTestId('marquee-lasso-rect')).toBeInTheDocument();

    const callsBeforeUnmount = onSelectionChange.mock.calls.length;
    unmount();

    fireEvent.pointerMove(window, { clientX: 480, clientY: 280 });
    fireEvent.pointerUp(window);
    expect(onSelectionChange).toHaveBeenCalledTimes(callsBeforeUnmount);

    const addedPointerMoves = addSpy.mock.calls.filter(([type]) => type === 'pointermove').length;
    const removedPointerMoves = removeSpy.mock.calls.filter(
      ([type]) => type === 'pointermove'
    ).length;
    expect(addedPointerMoves).toBeGreaterThanOrEqual(3);
    expect(removedPointerMoves).toBe(addedPointerMoves);

    addSpy.mockRestore();
    removeSpy.mockRestore();
  });

  it('supports keyboard Arrow/Home/End navigation, Space/Enter toggle, Ctrl/Meta+A, Escape, adaptive columns, and IME composition guard', () => {
    const onSelectionChange = vi.fn<(ids: ReadonlyArray<string>) => void>();

    render(<MarqueeSelectionBox onSelectionChange={onSelectionChange} />);

    const listbox = screen.getByRole('listbox');
    const opt0 = screen.getByTestId('marquee-item-hero-prism');
    const opt1 = screen.getByTestId('marquee-item-optical-tokens');
    const opt2 = screen.getByTestId('marquee-item-release-notes');
    const opt4 = screen.getByTestId('marquee-item-caustic-pass');
    const opt7 = screen.getByTestId('marquee-item-archive-zip');

    // Focus first item (default unmocked fallback = 4 columns)
    opt0.focus();
    expect(document.activeElement).toBe(opt0);

    // ArrowRight -> index 1
    fireEvent.keyDown(opt0, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(opt1);

    // ArrowLeft -> index 0
    fireEvent.keyDown(opt1, { key: 'ArrowLeft' });
    expect(document.activeElement).toBe(opt0);

    // ArrowDown -> index 4 (4 columns)
    fireEvent.keyDown(opt0, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(opt4);

    // ArrowUp -> index 0
    fireEvent.keyDown(opt4, { key: 'ArrowUp' });
    expect(document.activeElement).toBe(opt0);

    // End -> index 7, Home -> index 0
    fireEvent.keyDown(opt0, { key: 'End' });
    expect(document.activeElement).toBe(opt7);
    fireEvent.keyDown(opt7, { key: 'Home' });
    expect(document.activeElement).toBe(opt0);

    // Space toggles focused item on, Enter toggles it off
    fireEvent.keyDown(opt0, { key: ' ' });
    expect(onSelectionChange).toHaveBeenLastCalledWith(['hero-prism']);
    fireEvent.keyDown(opt0, { key: 'Enter' });
    expect(onSelectionChange).toHaveBeenLastCalledWith([]);

    // Keyboard event directly on listbox uses focusedIndex safely
    fireEvent.keyDown(listbox, { key: ' ' });
    expect(onSelectionChange).toHaveBeenLastCalledWith(['hero-prism']);

    // Ctrl+A selects all
    fireEvent.keyDown(opt0, { key: 'a', ctrlKey: true });
    expect(onSelectionChange).toHaveBeenLastCalledWith(DEFAULT_IDS);

    // Escape clears selection (and aborts any active drag)
    fireEvent.keyDown(opt0, { key: 'Escape' });
    expect(onSelectionChange).toHaveBeenLastCalledWith([]);

    // Meta+A selects all
    fireEvent.keyDown(opt0, { key: 'A', metaKey: true });
    expect(onSelectionChange).toHaveBeenLastCalledWith(DEFAULT_IDS);

    // Unrelated key ignored safely
    const callsBeforeOtherKey = onSelectionChange.mock.calls.length;
    fireEvent.keyDown(opt0, { key: 'z' });
    expect(onSelectionChange).toHaveBeenCalledTimes(callsBeforeOtherKey);

    // IME composition guard blocks Enter, Space, ArrowRight, Escape, Ctrl+A
    const imeEvent = new KeyboardEvent('keydown', {
      key: 'Escape',
      bubbles: true,
      cancelable: true,
    });
    Object.defineProperty(imeEvent, 'isComposing', { value: true });
    opt0.dispatchEvent(imeEvent);
    expect(onSelectionChange).toHaveBeenCalledTimes(callsBeforeOtherKey);

    // Mock 2-column mobile grid layout -> ArrowDown advances by 2 instead of 4
    DEFAULT_IDS.forEach((id, index) => {
      const tile = screen.getByTestId(`marquee-item-${id}`);
      const col = index % 2;
      const row = Math.floor(index / 2);
      mockElementRect(tile, 20 + col * 140, 20 + row * 90, 120, 80);
    });
    opt0.focus();
    fireEvent.keyDown(opt0, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(opt2);
  });

  it('renders clean role="status" empty state when items is empty and handles single-item grid keyboard navigation', () => {
    const { rerender } = render(<MarqueeSelectionBox items={[]} data-testid="empty-root" />);

    expect(screen.getByTestId('empty-root')).toHaveAttribute('data-empty', 'true');
    expect(screen.getByRole('status')).toHaveTextContent(/No selectable files/i);
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(screen.getByTestId('marquee-selection-count')).toHaveTextContent('0 of 0 selected');
    expect(screen.getByTestId('marquee-select-all')).toBeDisabled();
    expect(screen.getByTestId('marquee-clear')).toBeDisabled();
    expect(screen.getByTestId('marquee-live-summary')).toHaveTextContent(
      'No items available in this folder.'
    );

    // Single item keyboard ArrowDown stays on index 0 cleanly
    const singleItem: ReadonlyArray<MarqueeSelectableItem> = [
      { id: 'solo', name: 'Solo.png', kind: 'image', sizeLabel: '1.1 MB' },
    ];
    rerender(<MarqueeSelectionBox items={singleItem} data-testid="empty-root" />);
    const soloOption = screen.getByRole('option');
    soloOption.focus();
    fireEvent.keyDown(soloOption, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(soloOption);
  });

  it('supports controlled mode, normalizes stale/duplicate IDs, enforces disabled state, and resists adversarial IDs and XSS strings', () => {
    const customItems: ReadonlyArray<MarqueeSelectableItem> = [
      { id: '__proto__', name: '<img src=x onerror=alert(1)>', kind: 'code', sizeLabel: '4 KB' },
      { id: 'constructor', name: 'Shader.wgsl', kind: 'code', sizeLabel: '8 KB' },
      { id: 'toString', name: 'Notes.md', kind: 'document', sizeLabel: '2 KB' },
    ];

    function ControlledHarness() {
      const [selected, setSelected] = useState<ReadonlyArray<string>>([
        '__proto__',
        '__proto__',
        'nonexistent-id',
      ]);
      return (
        <MarqueeSelectionBox
          items={customItems}
          selectedIds={selected}
          onSelectionChange={(next) => setSelected(next)}
          data-testid="controlled-root"
        />
      );
    }

    render(<ControlledHarness />);

    // Normalized: duplicates & nonexistent IDs filtered out, XSS rendered strictly as literal text
    expect(screen.getByTestId('marquee-selection-count')).toHaveTextContent('1 of 3 selected');
    expect(screen.getByText('<img src=x onerror=alert(1)>')).toBeInTheDocument();
    expect(screen.getByTestId('marquee-item-__proto__')).toHaveAttribute('aria-selected', 'true');

    // Selecting 'constructor' updates controlled state cleanly
    fireEvent.click(screen.getByTestId('marquee-item-constructor'), { ctrlKey: true });
    expect(screen.getByTestId('marquee-selection-count')).toHaveTextContent('2 of 3 selected');

    // Controlled without state updater does not mutate selection on drag
    const onControlledOnly = vi.fn<(ids: ReadonlyArray<string>) => void>();
    const { rerender } = render(
      <MarqueeSelectionBox
        items={customItems}
        selectedIds={['toString']}
        onSelectionChange={onControlledOnly}
        data-testid="frozen-root"
      />
    );
    const frozenRoot = screen.getByTestId('frozen-root');
    const frozenStage = frozenRoot.querySelector('[data-testid="marquee-stage"]') as HTMLDivElement;
    const frozenConstructorTile = frozenRoot.querySelector(
      '[data-testid="marquee-item-constructor"]'
    ) as HTMLDivElement;
    const frozenToStringTile = frozenRoot.querySelector(
      '[data-testid="marquee-item-toString"]'
    ) as HTMLDivElement;

    mockElementRect(frozenStage, 0, 0, 400, 200);
    mockElementRect(frozenConstructorTile, 10, 10, 80, 80);

    fireEvent.pointerDown(frozenStage, { button: 0, clientX: 5, clientY: 5 });
    fireEvent.pointerMove(window, { clientX: 60, clientY: 60 });
    fireEvent.pointerUp(window);
    expect(onControlledOnly).toHaveBeenCalledWith(['constructor']);
    // DOM stays controlled at ['toString']
    expect(frozenToStringTile).toHaveAttribute('aria-selected', 'true');

    // Disabled state blocks clicks, drags, keyboard, and buttons
    onControlledOnly.mockClear();
    rerender(
      <MarqueeSelectionBox
        items={customItems}
        selectedIds={['toString']}
        onSelectionChange={onControlledOnly}
        disabled
        data-testid="frozen-root"
      />
    );
    const disabledRoot = screen.getByTestId('frozen-root');
    expect(disabledRoot).toHaveAttribute('data-disabled', 'true');

    const disabledStage = disabledRoot.querySelector('[data-testid="marquee-stage"]') as HTMLDivElement;
    const disabledTile = disabledRoot.querySelector('[data-testid="marquee-item-constructor"]') as HTMLDivElement;
    expect(disabledTile).toHaveAttribute('tabindex', '-1');
    expect(disabledTile).toHaveAttribute('aria-disabled', 'true');

    fireEvent.click(disabledTile);
    fireEvent.pointerDown(disabledStage, { button: 0, clientX: 5, clientY: 5 });
    fireEvent.keyDown(disabledStage, { key: 'a', ctrlKey: true });
    expect(onControlledOnly).not.toHaveBeenCalled();
  });
});
