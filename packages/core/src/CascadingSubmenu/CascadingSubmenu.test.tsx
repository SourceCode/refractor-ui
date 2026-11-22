import { createRef } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import {
  CascadingSubmenu,
  DEFAULT_CASCADING_MENU_ITEMS,
  isPointInSafeTriangle,
  type CascadingMenuItem,
} from './index';

function dispatchComposingKeyDown(target: EventTarget, key: string) {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
  Object.defineProperty(event, 'isComposing', { value: true });
  target.dispatchEvent(event);
}

function makeDomRect(left: number, top: number, width: number, height: number): DOMRect {
  return {
    x: left,
    y: top,
    left,
    top,
    right: left + width,
    bottom: top + height,
    width,
    height,
    toJSON: () => ({ left, top, width, height }),
  };
}

describe('isPointInSafeTriangle', () => {
  const anchor = { x: 100, y: 100 };
  const topCorner = { x: 200, y: 40 };
  const bottomCorner = { x: 200, y: 200 };

  it('returns true for points strictly inside and on the edges/vertices of the triangle', () => {
    expect(isPointInSafeTriangle({ x: 150, y: 110 }, anchor, topCorner, bottomCorner)).toBe(true);
    expect(isPointInSafeTriangle({ x: 180, y: 60 }, anchor, topCorner, bottomCorner)).toBe(true);
    // Midpoint on top edge anchor -> topCorner
    expect(isPointInSafeTriangle({ x: 150, y: 70 }, anchor, topCorner, bottomCorner)).toBe(true);
    // Vertices
    expect(isPointInSafeTriangle(anchor, anchor, topCorner, bottomCorner)).toBe(true);
    expect(isPointInSafeTriangle(topCorner, anchor, topCorner, bottomCorner)).toBe(true);
    expect(isPointInSafeTriangle(bottomCorner, anchor, topCorner, bottomCorner)).toBe(true);
    // Opposite winding order (e.g. RTL submenu opened to the left)
    expect(
      isPointInSafeTriangle(
        { x: 50, y: 110 },
        { x: 100, y: 100 },
        { x: 0, y: 40 },
        { x: 0, y: 200 }
      )
    ).toBe(true);
  });

  it('returns false for points outside the safe triangle', () => {
    // Straight vertically below anchor in same column
    expect(isPointInSafeTriangle({ x: 100, y: 140 }, anchor, topCorner, bottomCorner)).toBe(false);
    // Above top edge
    expect(isPointInSafeTriangle({ x: 150, y: 20 }, anchor, topCorner, bottomCorner)).toBe(false);
    // Below bottom edge
    expect(isPointInSafeTriangle({ x: 150, y: 190 }, anchor, topCorner, bottomCorner)).toBe(false);
    // Behind anchor
    expect(isPointInSafeTriangle({ x: 80, y: 100 }, anchor, topCorner, bottomCorner)).toBe(false);
    // Past child edge
    expect(isPointInSafeTriangle({ x: 220, y: 100 }, anchor, topCorner, bottomCorner)).toBe(false);
  });

  it('returns false for collinear/degenerate triangles and non-finite coordinates', () => {
    // Collinear diagonal
    expect(
      isPointInSafeTriangle(
        { x: 10, y: 10 },
        { x: 0, y: 0 },
        { x: 10, y: 10 },
        { x: 20, y: 20 }
      )
    ).toBe(false);
    // Collinear vertical line
    expect(
      isPointInSafeTriangle(
        { x: 100, y: 50 },
        { x: 100, y: 0 },
        { x: 100, y: 50 },
        { x: 100, y: 100 }
      )
    ).toBe(false);
    // Coincident corners (zero height)
    expect(
      isPointInSafeTriangle(
        { x: 150, y: 100 },
        { x: 100, y: 100 },
        { x: 200, y: 100 },
        { x: 200, y: 100 }
      )
    ).toBe(false);
    // Non-finite inputs
    expect(
      isPointInSafeTriangle({ x: Number.NaN, y: 100 }, anchor, topCorner, bottomCorner)
    ).toBe(false);
    expect(
      isPointInSafeTriangle({ x: 150, y: 100 }, { x: Number.POSITIVE_INFINITY, y: 100 }, topCorner, bottomCorner)
    ).toBe(false);
    expect(
      isPointInSafeTriangle({ x: 150, y: 100 }, anchor, { x: 200, y: Number.NEGATIVE_INFINITY }, bottomCorner)
    ).toBe(false);
    expect(
      isPointInSafeTriangle({ x: 150, y: 100 }, anchor, topCorner, { x: 200, y: Number.NaN })
    ).toBe(false);
  });
});

describe('CascadingSubmenu', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders prism-slab shell, default 3-level root items, responsive overflow-x-auto panes, theme override, xstyle, and React 19 ref', () => {
    const ref = createRef<HTMLDivElement>();

    render(
      <PrismThemeProvider
        theme={{
          components: {
            CascadingSubmenu: { className: 'theme-cascading', style: { letterSpacing: '0.25px' } },
          },
        }}
      >
        <CascadingSubmenu
          ref={ref}
          className="local-cascading"
          xstyle={{ '--prism-blur-px': '20px' }}
          style={{ marginTop: '6px' }}
          data-testid="cascading-root"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('cascading-root');
    expect(ref.current).toBe(root);
    expect(root).toHaveClass(
      'refractor-cascading-submenu',
      'prism-slab',
      'theme-cascading',
      'local-cascading'
    );
    expect(root).toHaveStyle({ letterSpacing: '0.25px', marginTop: '6px' });
    expect(root).toHaveAttribute('role', 'region');
    expect(root).toHaveAttribute('aria-label', 'Command Menu');
    expect(root).toHaveAttribute('data-open-depth', '0');

    const panes = screen.getByTestId('cascading-submenu-panes');
    expect(panes).toHaveClass('overflow-x-auto', 'min-w-0', 'max-w-full');

    const status = screen.getByTestId('cascading-submenu-status');
    expect(status).toHaveAttribute('role', 'status');
    expect(status).toHaveAttribute('aria-live', 'polite');
    expect(status).toHaveTextContent('Ready · Navigate with mouse or arrow keys');

    const rootMenu = screen.getByRole('menu', { name: 'Command Menu' });
    expect(DEFAULT_CASCADING_MENU_ITEMS).toHaveLength(5);

    const newDoc = within(rootMenu).getByRole('menuitem', { name: 'New Document' });
    const openRecent = within(rootMenu).getByRole('menuitem', { name: 'Open Recent' });
    const exportAs = within(rootMenu).getByRole('menuitem', { name: 'Export As' });
    const preferences = within(rootMenu).getByRole('menuitem', { name: 'Preferences' });
    const disabledAction = within(rootMenu).getByRole('menuitem', { name: 'Disabled Action' });

    expect(newDoc).toHaveAttribute('tabindex', '0');
    expect(openRecent).toHaveAttribute('tabindex', '-1');
    expect(openRecent).toHaveAttribute('aria-haspopup', 'menu');
    expect(openRecent).toHaveAttribute('aria-expanded', 'false');
    expect(exportAs).toHaveAttribute('aria-haspopup', 'menu');
    expect(exportAs).toHaveAttribute('aria-expanded', 'false');
    expect(preferences).not.toHaveAttribute('aria-haspopup');
    expect(disabledAction).toBeDisabled();
    expect(disabledAction).toHaveAttribute('aria-disabled', 'true');
    expect(within(rootMenu).getByText('⌘N')).toBeInTheDocument();
    expect(within(rootMenu).getByText('⌘,')).toBeInTheDocument();
  });

  it('cascades across all 3 levels via hover and click, shows checkmarks, invokes onSelectItem with full pathIds, and updates polite status strip', () => {
    const onSelectItem = vi.fn();
    render(
      <CascadingSubmenu
        title="Studio Menu"
        onSelectItem={onSelectItem}
        data-testid="cascading-root"
      />
    );

    const root = screen.getByTestId('cascading-root');
    const status = screen.getByTestId('cascading-submenu-status');
    const rootMenu = screen.getByRole('menu', { name: 'Studio Menu' });

    // Hovering root leaf when no child is open keeps status idle
    fireEvent.mouseEnter(within(rootMenu).getByRole('menuitem', { name: 'New Document' }));
    expect(status).toHaveTextContent('Ready · Navigate with mouse or arrow keys');

    // Hovering disabled item is ignored
    const disabledAction = within(rootMenu).getByRole('menuitem', { name: 'Disabled Action' });
    fireEvent.mouseEnter(disabledAction);
    fireEvent.mouseMove(disabledAction);
    fireEvent.click(disabledAction);
    expect(onSelectItem).not.toHaveBeenCalled();

    // Level 1 -> Level 2: Export As
    const exportAs = within(rootMenu).getByRole('menuitem', { name: 'Export As' });
    fireEvent.mouseEnter(exportAs);
    expect(exportAs).toHaveAttribute('aria-expanded', 'true');
    const exportMenu = screen.getByRole('menu', { name: 'Export As' });
    expect(exportAs).toHaveAttribute('aria-controls', exportMenu.id);
    expect(root).toHaveAttribute('data-open-depth', '1');
    expect(status).toHaveTextContent('Opened Export As (Level 2)');

    // Level 2 -> Level 3: Raster Image
    const rasterImage = within(exportMenu).getByRole('menuitem', { name: 'Raster Image' });
    fireEvent.mouseEnter(rasterImage);
    const rasterMenu = screen.getByRole('menu', { name: 'Raster Image' });
    expect(rasterImage).toHaveAttribute('aria-expanded', 'true');
    expect(rasterImage).toHaveAttribute('aria-controls', rasterMenu.id);
    expect(root).toHaveAttribute('data-open-depth', '2');
    expect(status).toHaveTextContent('Opened Export As › Raster Image (Level 3)');
    expect(screen.getByTestId('cascading-submenu-depth-badge')).toHaveTextContent('Level 3 · 160ms');

    // Checkmark and shortcut on PNG (2x Retina)
    const pngItem = within(rasterMenu).getByRole('menuitem', { name: 'PNG (2x Retina)' });
    expect(pngItem).toHaveAttribute('data-checked', 'true');
    expect(screen.getByTestId('cascading-check-png-2x-retina')).toBeInTheDocument();
    expect(within(rasterMenu).getByText('⇧⌘P')).toBeInTheDocument();

    // Select Level 3 leaf
    fireEvent.click(pngItem);
    expect(onSelectItem).toHaveBeenCalledTimes(1);
    expect(onSelectItem).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: 'png-2x-retina', label: 'PNG (2x Retina)' }),
      ['export-as', 'raster-image', 'png-2x-retina']
    );
    expect(pngItem).toHaveAttribute('data-selected', 'true');
    expect(status).toHaveTextContent('Selected: Export As › Raster Image › PNG (2x Retina)');

    // Switch Level 2 sibling to Vector -> Level 3 SVG Optical
    const vectorItem = within(exportMenu).getByRole('menuitem', { name: 'Vector' });
    fireEvent.mouseEnter(vectorItem);
    const vectorMenu = screen.getByRole('menu', { name: 'Vector' });
    expect(screen.queryByRole('menu', { name: 'Raster Image' })).toBeNull();
    fireEvent.click(within(vectorMenu).getByRole('menuitem', { name: 'SVG Optical' }));
    expect(onSelectItem).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: 'svg-optical', label: 'SVG Optical' }),
      ['export-as', 'vector', 'svg-optical']
    );
    expect(status).toHaveTextContent('Selected: Export As › Vector › SVG Optical');

    // Click Vector while open toggles Level 3 closed; clicking again re-opens
    fireEvent.click(vectorItem);
    expect(screen.queryByRole('menu', { name: 'Vector' })).toBeNull();
    expect(status).toHaveTextContent('Closed Vector · Active level: Export As');
    fireEvent.click(vectorItem);
    expect(screen.getByRole('menu', { name: 'Vector' })).toBeInTheDocument();

    // Click Export As while open toggles it closed to root
    fireEvent.click(exportAs);
    expect(screen.queryByRole('menu', { name: 'Export As' })).toBeNull();
    expect(status).toHaveTextContent('Closed Export As · Active level: Studio Menu');

    // Click Open Recent to open Level 2, then hover root leaf Preferences to collapse Level 2
    const openRecent = within(rootMenu).getByRole('menuitem', { name: 'Open Recent' });
    fireEvent.click(openRecent);
    const recentMenu = screen.getByRole('menu', { name: 'Open Recent' });
    expect(within(recentMenu).getByRole('menuitem', { name: 'OpticalSpec_v2.md' })).toHaveAttribute(
      'data-checked',
      'true'
    );
    expect(within(recentMenu).getByRole('menuitem', { name: 'TokenEngine.ts' })).toBeInTheDocument();

    fireEvent.mouseEnter(within(rootMenu).getByRole('menuitem', { name: 'Preferences' }));
    expect(screen.queryByRole('menu', { name: 'Open Recent' })).toBeNull();
    expect(status).toHaveTextContent('Active level: Studio Menu');
  });

  it('defers sibling hover switching inside the directional safe triangle, cancels on child menu entry or parent re-entry, handles RTL edge, clamps hoverDelayMs, and cleans up timer on unmount', () => {
    vi.useFakeTimers();

    const { rerender, unmount } = render(
      <CascadingSubmenu hoverDelayMs={160} data-testid="cascading-root" />
    );

    const root = screen.getByTestId('cascading-root');
    const rootMenu = screen.getByRole('menu', { name: 'Command Menu' });
    const exportAs = within(rootMenu).getByRole('menuitem', { name: 'Export As' });
    const openRecent = within(rootMenu).getByRole('menuitem', { name: 'Open Recent' });
    const preferences = within(rootMenu).getByRole('menuitem', { name: 'Preferences' });

    // Keyboard-opened submenu (no prior pointer anchor) switches immediately on sibling hover
    exportAs.focus();
    fireEvent.keyDown(exportAs, { key: 'ArrowRight' });
    expect(screen.getByRole('menu', { name: 'Export As' })).toBeInTheDocument();
    fireEvent.mouseEnter(preferences, { clientX: 165, clientY: 130 });
    expect(screen.queryByRole('menu', { name: 'Export As' })).toBeNull();

    // Open Export As via hover and move pointer to establish safe-triangle anchor
    fireEvent.mouseEnter(exportAs, { clientX: 120, clientY: 100 });
    fireEvent.mouseMove(exportAs, { clientX: 130, clientY: 105 });
    // Moving over non-active sibling does not break anchor
    fireEvent.mouseMove(preferences, { clientX: 130, clientY: 150 });

    const exportMenu = screen.getByRole('menu', { name: 'Export As' });
    vi.spyOn(exportMenu, 'getBoundingClientRect').mockReturnValue(makeDomRect(220, 40, 220, 200));

    // 1. Diagonal move inside safe triangle onto Preferences defers closing Export As
    fireEvent.mouseEnter(preferences, { clientX: 165, clientY: 130 });
    expect(root).toHaveAttribute('data-hover-deferred', 'true');
    expect(screen.getByRole('menu', { name: 'Export As' })).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(screen.getByRole('menu', { name: 'Export As' })).toBeInTheDocument();

    // Entering child menu cancels pending deferral cleanly
    fireEvent.mouseEnter(exportMenu);
    expect(root).not.toHaveAttribute('data-hover-deferred');

    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(screen.getByRole('menu', { name: 'Export As' })).toBeInTheDocument();

    // 2. Re-entering active parent item also cancels a pending deferral
    fireEvent.mouseEnter(preferences, { clientX: 165, clientY: 130 });
    expect(root).toHaveAttribute('data-hover-deferred', 'true');
    fireEvent.mouseEnter(exportAs, { clientX: 130, clientY: 105 });
    expect(root).not.toHaveAttribute('data-hover-deferred');
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(screen.getByRole('menu', { name: 'Export As' })).toBeInTheDocument();

    // 3. Staying on sibling inside safe triangle switches once hoverDelayMs elapses
    fireEvent.mouseEnter(openRecent, { clientX: 165, clientY: 95 });
    expect(root).toHaveAttribute('data-hover-deferred', 'true');
    expect(screen.getByRole('menu', { name: 'Export As' })).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(159);
    });
    expect(screen.getByRole('menu', { name: 'Export As' })).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(root).not.toHaveAttribute('data-hover-deferred');
    expect(screen.queryByRole('menu', { name: 'Export As' })).toBeNull();
    expect(screen.getByRole('menu', { name: 'Open Recent' })).toBeInTheDocument();

    // 4. Straight vertical move outside safe triangle switches immediately without waiting
    const recentMenu = screen.getByRole('menu', { name: 'Open Recent' });
    vi.spyOn(recentMenu, 'getBoundingClientRect').mockReturnValue(makeDomRect(220, 40, 220, 200));
    fireEvent.mouseMove(openRecent, { clientX: 130, clientY: 70 });
    fireEvent.mouseEnter(exportAs, { clientX: 130, clientY: 115 });
    expect(root).not.toHaveAttribute('data-hover-deferred');
    expect(screen.getByRole('menu', { name: 'Export As' })).toBeInTheDocument();

    // 5. RTL / left-placed child column uses right edge of child rect for safe triangle
    const exportMenuRtl = screen.getByRole('menu', { name: 'Export As' });
    vi.spyOn(exportMenuRtl, 'getBoundingClientRect').mockReturnValue(makeDomRect(0, 40, 100, 200));
    fireEvent.mouseMove(exportAs, { clientX: 180, clientY: 105 });
    fireEvent.mouseEnter(preferences, { clientX: 140, clientY: 130 });
    expect(root).toHaveAttribute('data-hover-deferred', 'true');
    act(() => {
      vi.advanceTimersByTime(160);
    });
    expect(screen.queryByRole('menu', { name: 'Export As' })).toBeNull();

    // 6. hoverDelayMs clamping: negative clamps to 0ms (immediate), >1000 clamps to 1000ms, NaN defaults to 160ms
    rerender(<CascadingSubmenu hoverDelayMs={-250} data-testid="cascading-root" />);
    expect(screen.getByTestId('cascading-submenu-depth-badge')).toHaveTextContent('Level 1 · 0ms');
    fireEvent.mouseEnter(exportAs, { clientX: 120, clientY: 100 });
    const exportMenuZero = screen.getByRole('menu', { name: 'Export As' });
    vi.spyOn(exportMenuZero, 'getBoundingClientRect').mockReturnValue(makeDomRect(220, 40, 220, 200));
    fireEvent.mouseEnter(openRecent, { clientX: 165, clientY: 95 });
    expect(screen.getByRole('menu', { name: 'Open Recent' })).toBeInTheDocument();

    rerender(<CascadingSubmenu hoverDelayMs={5000} data-testid="cascading-root" />);
    expect(screen.getByTestId('cascading-submenu-depth-badge')).toHaveTextContent('Level 2 · 1000ms');

    rerender(<CascadingSubmenu hoverDelayMs={Number.NaN} data-testid="cascading-root" />);
    expect(screen.getByTestId('cascading-submenu-depth-badge')).toHaveTextContent('Level 2 · 160ms');

    // 7. Unmount while safe-triangle timer is pending cleans up cleanly with zero leaks
    const recentMenuBeforeUnmount = screen.getByRole('menu', { name: 'Open Recent' });
    vi.spyOn(recentMenuBeforeUnmount, 'getBoundingClientRect').mockReturnValue(
      makeDomRect(220, 40, 220, 200)
    );
    fireEvent.mouseMove(openRecent, { clientX: 130, clientY: 75 });
    fireEvent.mouseEnter(preferences, { clientX: 165, clientY: 110 });
    expect(root).toHaveAttribute('data-hover-deferred', 'true');

    unmount();
    expect(() => {
      act(() => {
        vi.advanceTimersByTime(1000);
      });
    }).not.toThrow();
  });

  it('supports full IME-safe WAI-ARIA keyboard navigation across 3 levels, skips disabled items, and restores focus on ArrowLeft/Escape', () => {
    const onSelectItem = vi.fn();
    render(<CascadingSubmenu onSelectItem={onSelectItem} />);

    const rootMenu = screen.getByRole('menu', { name: 'Command Menu' });
    const newDoc = within(rootMenu).getByRole('menuitem', { name: 'New Document' });
    const openRecent = within(rootMenu).getByRole('menuitem', { name: 'Open Recent' });
    const exportAs = within(rootMenu).getByRole('menuitem', { name: 'Export As' });
    const preferences = within(rootMenu).getByRole('menuitem', { name: 'Preferences' });
    const status = screen.getByTestId('cascading-submenu-status');

    // Focus first item; ArrowLeft, Escape (while nothing open), ArrowRight on leaf, and unrelated key are no-ops
    newDoc.focus();
    fireEvent.keyDown(newDoc, { key: 'ArrowLeft' });
    fireEvent.keyDown(newDoc, { key: 'Escape' });
    fireEvent.keyDown(newDoc, { key: 'ArrowRight' });
    fireEvent.keyDown(newDoc, { key: 'a' });
    expect(document.activeElement).toBe(newDoc);

    // ArrowUp wraps to Preferences, skipping Disabled Action
    fireEvent.keyDown(newDoc, { key: 'ArrowUp' });
    expect(document.activeElement).toBe(preferences);

    // ArrowDown wraps back to New Document, skipping Disabled Action
    fireEvent.keyDown(preferences, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(newDoc);

    // End jumps to Preferences (skips Disabled Action), Home jumps back to New Document
    fireEvent.keyDown(newDoc, { key: 'End' });
    expect(document.activeElement).toBe(preferences);
    fireEvent.keyDown(preferences, { key: 'Home' });
    expect(document.activeElement).toBe(newDoc);

    // Move to Export As and open Level 2 via ArrowRight -> focuses Raster Image
    fireEvent.keyDown(newDoc, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(openRecent);
    fireEvent.keyDown(openRecent, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(exportAs);

    fireEvent.keyDown(exportAs, { key: 'ArrowRight' });
    const exportMenu = screen.getByRole('menu', { name: 'Export As' });
    const rasterImage = within(exportMenu).getByRole('menuitem', { name: 'Raster Image' });
    expect(document.activeElement).toBe(rasterImage);
    expect(status).toHaveTextContent('Opened Export As (Level 2)');

    // Open Level 3 via ArrowRight -> focuses PNG (2x Retina), move to WebP Lossless, select via Enter
    fireEvent.keyDown(rasterImage, { key: 'ArrowRight' });
    const rasterMenu = screen.getByRole('menu', { name: 'Raster Image' });
    const pngItem = within(rasterMenu).getByRole('menuitem', { name: 'PNG (2x Retina)' });
    const webpItem = within(rasterMenu).getByRole('menuitem', { name: 'WebP Lossless' });
    expect(document.activeElement).toBe(pngItem);

    fireEvent.keyDown(pngItem, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(webpItem);

    fireEvent.keyDown(webpItem, { key: 'Enter' });
    expect(onSelectItem).toHaveBeenCalledTimes(1);
    expect(onSelectItem).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: 'webp-lossless', label: 'WebP Lossless' }),
      ['export-as', 'raster-image', 'webp-lossless']
    );
    expect(status).toHaveTextContent('Selected: Export As › Raster Image › WebP Lossless');

    // ArrowLeft from Level 3 closes Level 3 and restores focus to Raster Image (Level 2)
    fireEvent.keyDown(webpItem, { key: 'ArrowLeft' });
    expect(screen.queryByRole('menu', { name: 'Raster Image' })).toBeNull();
    expect(screen.getByRole('menu', { name: 'Export As' })).toBeInTheDocument();
    expect(document.activeElement).toBe(rasterImage);
    expect(status).toHaveTextContent('Closed Raster Image · Returned to Export As');

    // Escape from Level 2 closes Level 2 and restores focus to Export As (Level 1)
    fireEvent.keyDown(rasterImage, { key: 'Escape' });
    expect(screen.queryByRole('menu', { name: 'Export As' })).toBeNull();
    expect(document.activeElement).toBe(exportAs);
    expect(status).toHaveTextContent('Closed Export As · Returned to Command Menu');

    // Space opens Open Recent submenu and focuses OpticalSpec_v2.md; Space selects leaf
    fireEvent.keyDown(exportAs, { key: 'ArrowUp' });
    expect(document.activeElement).toBe(openRecent);
    fireEvent.keyDown(openRecent, { key: ' ' });
    const recentMenu = screen.getByRole('menu', { name: 'Open Recent' });
    const opticalSpec = within(recentMenu).getByRole('menuitem', { name: 'OpticalSpec_v2.md' });
    expect(document.activeElement).toBe(opticalSpec);
    fireEvent.keyDown(opticalSpec, { key: ' ' });
    expect(onSelectItem).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: 'optical-spec-v2', label: 'OpticalSpec_v2.md' }),
      ['open-recent', 'optical-spec-v2']
    );

    // Moving ArrowDown in root while Open Recent is open closes Open Recent
    openRecent.focus();
    fireEvent.keyDown(openRecent, { key: 'ArrowDown' });
    expect(screen.queryByRole('menu', { name: 'Open Recent' })).toBeNull();
    expect(document.activeElement).toBe(exportAs);

    // Hover opens Export As while focus stays in root; Escape on root closes open submenus
    fireEvent.mouseEnter(exportAs);
    expect(screen.getByRole('menu', { name: 'Export As' })).toBeInTheDocument();
    fireEvent.keyDown(exportAs, { key: 'Escape' });
    expect(screen.queryByRole('menu', { name: 'Export As' })).toBeNull();
    expect(status).toHaveTextContent('Closed submenus · Active level: Command Menu');

    // IME composition guard blocks Enter, Space, ArrowRight, ArrowDown, Escape
    newDoc.focus();
    dispatchComposingKeyDown(newDoc, 'Enter');
    dispatchComposingKeyDown(newDoc, ' ');
    dispatchComposingKeyDown(newDoc, 'ArrowDown');
    expect(onSelectItem).toHaveBeenCalledTimes(2);
    expect(document.activeElement).toBe(newDoc);

    exportAs.focus();
    dispatchComposingKeyDown(exportAs, 'ArrowRight');
    expect(screen.queryByRole('menu', { name: 'Export As' })).toBeNull();
  });

  it('handles empty items, disabled state (including mid-timer disable), nested leaf hover close, all-disabled submenu children, dynamic items pruning, and adversarial XSS/prototype-key inputs', () => {
    vi.useFakeTimers();
    const onSelectItem = vi.fn();

    // 1. Empty items state
    const { rerender } = render(
      <CascadingSubmenu items={[]} onSelectItem={onSelectItem} data-testid="edge-root" />
    );
    expect(screen.getByTestId('edge-root')).toHaveAttribute('data-empty', 'true');
    expect(screen.getByTestId('cascading-submenu-empty')).toHaveTextContent(
      'No menu items available'
    );
    expect(screen.queryByRole('menu')).toBeNull();

    // 2. Disabled component state blocks all pointer and keyboard actions and cancels pending hover timers
    rerender(<CascadingSubmenu onSelectItem={onSelectItem} data-testid="edge-root" />);
    const rootMenu = screen.getByRole('menu', { name: 'Command Menu' });
    const exportAs = within(rootMenu).getByRole('menuitem', { name: 'Export As' });
    const preferences = within(rootMenu).getByRole('menuitem', { name: 'Preferences' });
    fireEvent.mouseEnter(exportAs, { clientX: 120, clientY: 100 });
    const exportMenu = screen.getByRole('menu', { name: 'Export As' });
    vi.spyOn(exportMenu, 'getBoundingClientRect').mockReturnValue(makeDomRect(220, 40, 220, 200));
    fireEvent.mouseEnter(preferences, { clientX: 165, clientY: 130 });
    expect(screen.getByTestId('edge-root')).toHaveAttribute('data-hover-deferred', 'true');

    // Disable while timer is pending -> collapses submenu and cancels pending timer
    rerender(<CascadingSubmenu disabled onSelectItem={onSelectItem} data-testid="edge-root" />);
    const edgeRoot = screen.getByTestId('edge-root');
    expect(edgeRoot).toHaveAttribute('data-disabled', 'true');
    expect(edgeRoot).toHaveAttribute('aria-disabled', 'true');
    expect(screen.queryByRole('menu', { name: 'Export As' })).toBeNull();

    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(screen.queryByRole('menu', { name: 'Export As' })).toBeNull();

    const disabledRootMenu = screen.getByRole('menu', { name: 'Command Menu' });
    fireEvent.mouseEnter(disabledRootMenu);
    const disabledNewDoc = within(disabledRootMenu).getByRole('menuitem', { name: 'New Document' });
    expect(disabledNewDoc).toBeDisabled();
    fireEvent.mouseEnter(disabledNewDoc);
    fireEvent.mouseMove(disabledNewDoc);
    fireEvent.click(disabledNewDoc);
    fireEvent.keyDown(disabledNewDoc, { key: 'Enter' });
    expect(onSelectItem).not.toHaveBeenCalled();

    // 3. Adversarial XSS payload, prototype keys, empty children array, all-disabled child submenu, and nested leaf hover
    const xssPayload = '<script>window.__xss=1</script><img src=x onerror=alert(1)>';
    const customItems: ReadonlyArray<CascadingMenuItem> = [
      { id: '__proto__', label: xssPayload, children: [] },
      {
        id: 'constructor',
        label: 'Locked Branch',
        children: [{ id: 'prototype', label: 'Locked Leaf', disabled: true }],
      },
      {
        id: 'deep-parent',
        label: 'Deep Parent',
        children: [
          {
            id: 'nested-branch',
            label: 'Nested Branch',
            children: [{ id: 'nested-leaf', label: 'Nested Leaf' }],
          },
          { id: 'level2-leaf', label: 'Level 2 Leaf' },
        ],
      },
    ];

    rerender(
      <CascadingSubmenu
        title={xssPayload}
        items={customItems}
        onSelectItem={onSelectItem}
        data-testid="edge-root"
      />
    );

    expect(document.querySelector('script')).toBeNull();
    const customRootMenu = screen.getByRole('menu', { name: xssPayload });
    const protoLeaf = within(customRootMenu).getByRole('menuitem', { name: xssPayload });
    expect(protoLeaf).not.toHaveAttribute('aria-haspopup');
    fireEvent.click(protoLeaf);
    expect(onSelectItem).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: '__proto__', label: xssPayload }),
      ['__proto__']
    );

    // Opening branch with all-disabled children via ArrowRight opens pane safely without moving focus
    const lockedBranch = within(customRootMenu).getByRole('menuitem', { name: 'Locked Branch' });
    lockedBranch.focus();
    fireEvent.keyDown(lockedBranch, { key: 'ArrowRight' });
    const lockedMenu = screen.getByRole('menu', { name: 'Locked Branch' });
    expect(within(lockedMenu).getByRole('menuitem', { name: 'Locked Leaf' })).toBeDisabled();
    expect(document.activeElement).toBe(lockedBranch);

    // Hovering a Level 2 leaf while Level 3 is open collapses Level 3 and keeps Level 2 active
    fireEvent.mouseEnter(within(customRootMenu).getByRole('menuitem', { name: 'Deep Parent' }));
    const deepMenu = screen.getByRole('menu', { name: 'Deep Parent' });
    fireEvent.mouseEnter(within(deepMenu).getByRole('menuitem', { name: 'Nested Branch' }));
    expect(screen.getByRole('menu', { name: 'Nested Branch' })).toBeInTheDocument();
    fireEvent.mouseEnter(within(deepMenu).getByRole('menuitem', { name: 'Level 2 Leaf' }));
    expect(screen.queryByRole('menu', { name: 'Nested Branch' })).toBeNull();
    expect(screen.getByTestId('cascading-submenu-status')).toHaveTextContent(
      'Active level: Deep Parent'
    );

    // Rerendering with items that remove the currently open parent prunes stale columns cleanly
    rerender(
      <CascadingSubmenu
        title="Pruned"
        items={[{ id: 'only-leaf', label: 'Only Leaf' }]}
        data-testid="edge-root"
      />
    );
    expect(screen.queryByRole('menu', { name: 'Deep Parent' })).toBeNull();
    expect(screen.getByRole('menuitem', { name: 'Only Leaf' })).toBeInTheDocument();
  });
});
