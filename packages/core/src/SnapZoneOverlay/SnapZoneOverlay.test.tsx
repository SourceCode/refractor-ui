import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import {
  SnapZoneOverlay,
  type SnapZonePresetKind,
  type SnapZonePresetKindMap,
  type SnapZoneSlot,
} from './index';

describe('SnapZoneOverlay', () => {
  it('renders prism-slab defaults, header, preset pills, halves stage, ref passthrough, and theme override', () => {
    const ref = createRef<HTMLDivElement>();
    const presetMapCheck: SnapZonePresetKindMap = {
      halves: true,
      thirds: true,
      quarters: true,
      'priority-grid': true,
    };
    const samplePreset: SnapZonePresetKind = 'priority-grid';
    expect(presetMapCheck[samplePreset]).toBe(true);
    expect(SnapZoneOverlay.displayName).toBe('SnapZoneOverlay');

    render(
      <PrismThemeProvider
        theme={{
          components: {
            SnapZoneOverlay: {
              className: 'theme-snap-overlay',
              style: { opacity: '0.95' },
            },
          },
        }}
      >
        <SnapZoneOverlay
          ref={ref}
          className="local-snap-overlay"
          xstyle={{ '--prism-blur-px': '16px' }}
          data-testid="snap-root"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('snap-root');
    expect(ref.current).toBe(root);
    expect(root).toHaveAttribute('role', 'region');
    expect(root).toHaveClass(
      'refractor-snap-zone-overlay',
      'prism-slab',
      'theme-snap-overlay',
      'local-snap-overlay'
    );
    expect(root).toHaveAttribute('data-preset', 'halves');
    expect(root).not.toHaveAttribute('data-snapped');
    expect(root).not.toHaveAttribute('data-disabled');
    expect(root).toHaveStyle({ opacity: '0.95' });

    const region = screen.getByRole('region', {
      name: 'Dragging: Optical Studio — main.tsx',
    });
    expect(region).toBe(root);

    // Preset pills with aria-pressed
    const halvesBtn = screen.getByRole('button', { name: 'Halves' });
    const thirdsBtn = screen.getByRole('button', { name: 'Thirds' });
    const quartersBtn = screen.getByRole('button', { name: 'Quarters' });
    const priorityBtn = screen.getByRole('button', { name: 'Priority Grid' });

    expect(halvesBtn).toHaveAttribute('aria-pressed', 'true');
    expect(thirdsBtn).toHaveAttribute('aria-pressed', 'false');
    expect(quartersBtn).toHaveAttribute('aria-pressed', 'false');
    expect(priorityBtn).toHaveAttribute('aria-pressed', 'false');
    expect(halvesBtn).toHaveClass('prism-focus-ring');

    // Clear Snap disabled when no zone is snapped
    const clearBtn = screen.getByRole('button', { name: 'Clear Snap' });
    expect(clearBtn).toBeDisabled();
    expect(clearBtn).toHaveClass('prism-focus-ring');

    // Interactive Desktop Drop-Zone Stage
    const stage = screen.getByRole('listbox', { name: 'Window snap zones' });
    expect(stage).toHaveAttribute('data-preset', 'halves');
    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(2);
    expect(options[0]).toHaveAccessibleName('Left Half (50% × 100%)');
    expect(options[0]).toHaveAttribute('aria-selected', 'false');
    expect(options[0]).toHaveAttribute('tabindex', '0');
    expect(options[0]).toHaveClass('prism-focus-ring');
    expect(options[1]).toHaveAccessibleName('Right Half (50% × 100%)');
    expect(options[1]).toHaveAttribute('tabindex', '-1');

    // Polite status strip
    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-live', 'polite');
    expect(status).toHaveTextContent('Preset: Halves (2 snap zones)');
    expect(status).toHaveTextContent('Optical Studio — main.tsx');
  });

  it('switches across all 4 presets (halves, thirds, quarters, priority-grid) with exact zones and status announcements', () => {
    const onPresetChange = vi.fn<(preset: SnapZonePresetKind) => void>();

    render(<SnapZoneOverlay onPresetChange={onPresetChange} />);

    // Clicking already-active Halves is a no-op
    fireEvent.click(screen.getByRole('button', { name: 'Halves' }));
    expect(onPresetChange).not.toHaveBeenCalled();

    // Switch to Thirds
    fireEvent.click(screen.getByRole('button', { name: 'Thirds' }));
    expect(onPresetChange).toHaveBeenLastCalledWith('thirds');
    expect(screen.getByRole('button', { name: 'Thirds' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(screen.getByRole('button', { name: 'Halves' })).toHaveAttribute(
      'aria-pressed',
      'false'
    );
    const thirdsOptions = screen.getAllByRole('option');
    expect(thirdsOptions).toHaveLength(3);
    expect(thirdsOptions[0]).toHaveTextContent('Left Third');
    expect(thirdsOptions[0]).toHaveTextContent('33% × 100%');
    expect(thirdsOptions[1]).toHaveTextContent('Center Third');
    expect(thirdsOptions[1]).toHaveTextContent('34% × 100%');
    expect(thirdsOptions[2]).toHaveTextContent('Right Third');
    expect(thirdsOptions[2]).toHaveTextContent('33% × 100%');
    expect(screen.getByRole('status')).toHaveTextContent(
      'Preset switched to Thirds (3 snap zones)'
    );

    // Switch to Quarters
    fireEvent.click(screen.getByRole('button', { name: 'Quarters' }));
    expect(onPresetChange).toHaveBeenLastCalledWith('quarters');
    const quartersOptions = screen.getAllByRole('option');
    expect(quartersOptions).toHaveLength(4);
    expect(quartersOptions[0]).toHaveAccessibleName('Top-Left (50% × 50%)');
    expect(quartersOptions[1]).toHaveAccessibleName('Top-Right (50% × 50%)');
    expect(quartersOptions[2]).toHaveAccessibleName('Bottom-Left (50% × 50%)');
    expect(quartersOptions[3]).toHaveAccessibleName('Bottom-Right (50% × 50%)');
    expect(screen.getByTestId('snap-zone-stage')).toHaveClass('grid-cols-12', 'grid-rows-2');
    expect(screen.getByRole('status')).toHaveTextContent(
      'Preset switched to Quarters (4 snap zones)'
    );

    // Switch to Priority Grid
    fireEvent.click(screen.getByRole('button', { name: 'Priority Grid' }));
    expect(onPresetChange).toHaveBeenLastCalledWith('priority-grid');
    const priorityOptions = screen.getAllByRole('option');
    expect(priorityOptions).toHaveLength(3);
    expect(priorityOptions[0]).toHaveAccessibleName('Primary Stage (70% × 100%)');
    expect(priorityOptions[0]).toHaveClass('col-span-7', 'row-span-2');
    expect(priorityOptions[1]).toHaveAccessibleName('Top Stack (30% × 50%)');
    expect(priorityOptions[1]).toHaveClass('col-span-3', 'row-span-1');
    expect(priorityOptions[2]).toHaveAccessibleName('Bottom Stack (30% × 50%)');
    expect(priorityOptions[2]).toHaveClass('col-span-3', 'row-span-1');
    expect(screen.getByTestId('snap-zone-stage')).toHaveClass('grid-cols-10', 'grid-rows-2');
    expect(screen.getByRole('status')).toHaveTextContent(
      'Preset switched to Priority Grid (3 snap zones)'
    );

    // Snap a zone, then switch back to Halves -> active snap resets cleanly
    fireEvent.click(screen.getByTestId('snap-zone-priority-primary'));
    expect(screen.getByRole('button', { name: 'Clear Snap' })).not.toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'Halves' }));
    expect(onPresetChange).toHaveBeenLastCalledWith('halves');
    expect(screen.getByRole('button', { name: 'Clear Snap' })).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent(
      'Preset switched to Halves (2 snap zones)'
    );
  });

  it('highlights zones on hover, snaps on click with glowing primary tokens, and clears via Clear Snap', () => {
    const onSnapZone = vi.fn<(slot: SnapZoneSlot | null) => void>();

    render(<SnapZoneOverlay onSnapZone={onSnapZone} data-testid="hover-root" />);

    const root = screen.getByTestId('hover-root');
    const leftZone = screen.getByTestId('snap-zone-halves-left');
    const rightZone = screen.getByTestId('snap-zone-halves-right');
    const clearBtn = screen.getByTestId('snap-clear-button');

    // Hover highlights with --prism-primary-main border & translucent fill
    fireEvent.mouseEnter(rightZone);
    expect(rightZone).toHaveAttribute('data-hovered', 'true');
    expect(rightZone).toHaveAttribute('data-highlighted', 'true');
    expect(rightZone.style.borderColor).toBe('var(--prism-primary-main)');
    expect(rightZone.style.backgroundColor).toContain('--prism-primary-main');
    expect(rightZone).toHaveTextContent('Click to Snap');

    // Mouse leave on non-hovered zone does not clear hovered zone
    fireEvent.mouseLeave(leftZone);
    expect(rightZone).toHaveAttribute('data-hovered', 'true');

    // Mouse leave on hovered zone clears hover highlight
    fireEvent.mouseLeave(rightZone);
    expect(rightZone).not.toHaveAttribute('data-hovered');
    expect(rightZone).not.toHaveAttribute('data-highlighted');
    expect(rightZone.style.borderColor).toBe('var(--prism-divider)');

    // Click snaps the zone
    fireEvent.click(rightZone);
    expect(root).toHaveAttribute('data-snapped', 'true');
    expect(root).toHaveAttribute('data-active-zone', 'halves-right');
    expect(rightZone).toHaveAttribute('aria-selected', 'true');
    expect(rightZone).toHaveAttribute('data-snapped', 'true');
    expect(rightZone).toHaveAttribute('data-highlighted', 'true');
    expect(rightZone.style.borderColor).toBe('var(--prism-primary-main)');
    expect(rightZone.style.backgroundColor).toContain('--prism-primary-main');
    expect(rightZone).toHaveTextContent('Snapped');
    expect(
      screen.getByTestId('snap-zone-window-preview-halves-right')
    ).toHaveTextContent('Optical Studio — main.tsx');
    expect(screen.getByTestId('snap-active-badge')).toHaveTextContent(
      'Right Half · 50% × 100%'
    );
    expect(onSnapZone).toHaveBeenCalledTimes(1);
    expect(onSnapZone).toHaveBeenLastCalledWith({
      id: 'halves-right',
      label: 'Right Half',
      preset: 'halves',
      colSpanLabel: '50% × 100%',
      gridAreaClass: 'col-span-6 row-span-1',
    });
    expect(screen.getByRole('status')).toHaveTextContent(
      'Snapped Optical Studio — main.tsx to Right Half (50% × 100%)'
    );

    // Clear Snap clears active zone
    expect(clearBtn).not.toBeDisabled();
    fireEvent.click(clearBtn);
    expect(onSnapZone).toHaveBeenCalledTimes(2);
    expect(onSnapZone).toHaveBeenLastCalledWith(null);
    expect(rightZone).toHaveAttribute('aria-selected', 'false');
    expect(clearBtn).toBeDisabled();
    expect(screen.getByTestId('snap-active-badge')).toHaveTextContent('Unsnapped');
    expect(screen.getByRole('status')).toHaveTextContent(
      'Snap cleared · Optical Studio — main.tsx floating freely'
    );
  });

  it('supports HTML5 drag-start, drag-enter, drag-over, child-safe drag-leave, drag-end, and drop snapping', () => {
    const onSnapZone = vi.fn<(slot: SnapZoneSlot | null) => void>();

    render(
      <SnapZoneOverlay
        windowTitle="Shader Graph — prism.wgsl"
        defaultPreset="priority-grid"
        onSnapZone={onSnapZone}
        data-testid="dnd-root"
      />
    );

    const root = screen.getByTestId('dnd-root');
    const dragSource = screen.getByTestId('snap-drag-source');
    const primaryZone = screen.getByTestId('snap-zone-priority-primary');
    const topStackZone = screen.getByTestId('snap-zone-priority-top-stack');

    // Drag start with dataTransfer populates text/plain payload
    const setData = vi.fn<(format: string, data: string) => void>();
    const sourceDataTransfer = {
      setData,
      effectAllowed: 'none',
    };
    fireEvent.dragStart(dragSource, { dataTransfer: sourceDataTransfer });
    expect(setData).toHaveBeenCalledWith('text/plain', 'Shader Graph — prism.wgsl');
    expect(sourceDataTransfer.effectAllowed).toBe('move');

    // Drag start without dataTransfer is safe
    fireEvent.dragStart(dragSource);

    // Drag enter & drag over highlight Primary Stage
    fireEvent.dragEnter(primaryZone);
    expect(primaryZone).toHaveAttribute('data-drag-over', 'true');
    expect(primaryZone).toHaveAttribute('data-highlighted', 'true');
    expect(primaryZone).toHaveTextContent('Release to Snap');
    expect(root).toHaveAttribute('data-dragging', 'true');

    const overDataTransfer = { dropEffect: 'none' };
    fireEvent.dragOver(primaryZone, { dataTransfer: overDataTransfer });
    expect(overDataTransfer.dropEffect).toBe('move');
    expect(primaryZone.style.borderColor).toBe('var(--prism-primary-main)');
    expect(primaryZone.style.backgroundColor).toContain('--prism-primary-main');

    // Drag over without dataTransfer is also safe
    fireEvent.dragOver(primaryZone);

    // Drag leave moving onto a child span inside the same zone preserves drag-over state
    const innerLabel = primaryZone.querySelector('span');
    expect(innerLabel).not.toBeNull();
    const innerLeaveEvent = new MouseEvent('dragleave', {
      bubbles: true,
      cancelable: true,
      relatedTarget: innerLabel,
    });
    fireEvent(primaryZone, innerLeaveEvent);
    expect(primaryZone).toHaveAttribute('data-drag-over', 'true');

    // Drag leave on a different zone does not clear primaryZone
    const otherLeaveEvent = new MouseEvent('dragleave', {
      bubbles: true,
      cancelable: true,
      relatedTarget: root,
    });
    fireEvent(topStackZone, otherLeaveEvent);
    expect(primaryZone).toHaveAttribute('data-drag-over', 'true');

    // Drag leave outside primaryZone clears drag-over state
    const outerLeaveEvent = new MouseEvent('dragleave', {
      bubbles: true,
      cancelable: true,
      relatedTarget: root,
    });
    fireEvent(primaryZone, outerLeaveEvent);
    expect(primaryZone).not.toHaveAttribute('data-drag-over');
    expect(root).not.toHaveAttribute('data-dragging');

    // Drag enter + dragEnd clears highlight cleanly
    fireEvent.dragEnter(topStackZone);
    expect(topStackZone).toHaveAttribute('data-drag-over', 'true');
    fireEvent.dragEnd(dragSource);
    expect(topStackZone).not.toHaveAttribute('data-drag-over');

    // Drag over + Drop on Top Stack snaps window cleanly
    fireEvent.dragOver(topStackZone, { dataTransfer: { dropEffect: 'none' } });
    fireEvent.drop(topStackZone);

    expect(topStackZone).toHaveAttribute('aria-selected', 'true');
    expect(topStackZone).not.toHaveAttribute('data-drag-over');
    expect(onSnapZone).toHaveBeenCalledTimes(1);
    expect(onSnapZone).toHaveBeenLastCalledWith({
      id: 'priority-top-stack',
      label: 'Top Stack',
      preset: 'priority-grid',
      colSpanLabel: '30% × 50%',
      gridAreaClass: 'col-span-3 row-span-1',
    });
    expect(screen.getByRole('status')).toHaveTextContent(
      'Snapped Shader Graph — prism.wgsl to Top Stack (30% × 50%)'
    );
  });

  it('supports IME-safe Arrow/Home/End/Enter/Space/Escape keyboard navigation across 2D and 1D presets', () => {
    const onSnapZone = vi.fn<(slot: SnapZoneSlot | null) => void>();

    render(<SnapZoneOverlay defaultPreset="quarters" onSnapZone={onSnapZone} />);

    const topLeft = screen.getByTestId('snap-zone-quarters-top-left');
    const topRight = screen.getByTestId('snap-zone-quarters-top-right');
    const bottomLeft = screen.getByTestId('snap-zone-quarters-bottom-left');
    const bottomRight = screen.getByTestId('snap-zone-quarters-bottom-right');

    act(() => {
      topLeft.focus();
    });
    expect(document.activeElement).toBe(topLeft);

    // IME-composing keydown events MUST be completely ignored
    const composingEnter = new KeyboardEvent('keydown', {
      key: 'Enter',
      bubbles: true,
      cancelable: true,
    });
    Object.defineProperty(composingEnter, 'isComposing', { value: true });
    fireEvent(topLeft, composingEnter);
    expect(onSnapZone).not.toHaveBeenCalled();

    const composingArrow = new KeyboardEvent('keydown', {
      key: 'ArrowRight',
      bubbles: true,
      cancelable: true,
    });
    Object.defineProperty(composingArrow, 'isComposing', { value: true });
    fireEvent(topLeft, composingArrow);
    expect(document.activeElement).toBe(topLeft);

    // Unhandled character key is ignored
    fireEvent.keyDown(topLeft, { key: 'x' });
    expect(document.activeElement).toBe(topLeft);
    expect(onSnapZone).not.toHaveBeenCalled();

    // 2D Quarters navigation: Right -> Top-Right, Down -> Bottom-Right, Left -> Bottom-Left, Up -> Top-Left
    fireEvent.keyDown(topLeft, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(topRight);
    expect(topRight).toHaveAttribute('tabindex', '0');

    fireEvent.keyDown(topRight, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(bottomRight);

    fireEvent.keyDown(bottomRight, { key: 'ArrowLeft' });
    expect(document.activeElement).toBe(bottomLeft);

    fireEvent.keyDown(bottomLeft, { key: 'ArrowUp' });
    expect(document.activeElement).toBe(topLeft);

    // End -> Bottom-Right, Home -> Top-Left
    fireEvent.keyDown(topLeft, { key: 'End' });
    expect(document.activeElement).toBe(bottomRight);

    fireEvent.keyDown(bottomRight, { key: 'Home' });
    expect(document.activeElement).toBe(topLeft);

    // Enter snaps focused zone
    fireEvent.keyDown(topLeft, { key: 'Enter' });
    expect(topLeft).toHaveAttribute('aria-selected', 'true');
    expect(onSnapZone).toHaveBeenCalledTimes(1);
    expect(onSnapZone).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: 'quarters-top-left', colSpanLabel: '50% × 50%' })
    );

    // Focus another zone directly and press Space to snap
    fireEvent.focus(bottomRight);
    expect(bottomRight).toHaveAttribute('tabindex', '0');
    fireEvent.keyDown(bottomRight, { key: ' ' });
    expect(bottomRight).toHaveAttribute('aria-selected', 'true');
    expect(onSnapZone).toHaveBeenCalledTimes(2);
    expect(onSnapZone).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: 'quarters-bottom-right' })
    );

    // Escape clears active snap
    fireEvent.keyDown(bottomRight, { key: 'Escape' });
    expect(bottomRight).toHaveAttribute('aria-selected', 'false');
    expect(onSnapZone).toHaveBeenCalledTimes(3);
    expect(onSnapZone).toHaveBeenLastCalledWith(null);

    // Escape while already unsnapped clears hover preview without calling onSnapZone again
    fireEvent.mouseEnter(topRight);
    expect(topRight).toHaveAttribute('data-hovered', 'true');
    fireEvent.keyDown(bottomRight, { key: 'Escape' });
    expect(topRight).not.toHaveAttribute('data-hovered');
    expect(onSnapZone).toHaveBeenCalledTimes(3);

    // Switch to 1D Thirds preset and test ArrowDown / ArrowUp / ArrowLeft wrap
    fireEvent.click(screen.getByRole('button', { name: 'Thirds' }));
    const leftThird = screen.getByTestId('snap-zone-thirds-left');
    const centerThird = screen.getByTestId('snap-zone-thirds-center');
    const rightThird = screen.getByTestId('snap-zone-thirds-right');

    act(() => {
      leftThird.focus();
    });
    fireEvent.keyDown(leftThird, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(centerThird);

    fireEvent.keyDown(centerThird, { key: 'ArrowUp' });
    expect(document.activeElement).toBe(leftThird);

    fireEvent.keyDown(leftThird, { key: 'ArrowLeft' });
    expect(document.activeElement).toBe(rightThird);
  });

  it('supports controlled preset & activeZoneId, initial defaultActiveZoneId, and safe focus clamping on preset shrink', () => {
    const onPresetChange = vi.fn<(preset: SnapZonePresetKind) => void>();
    const onSnapZone = vi.fn<(slot: SnapZoneSlot | null) => void>();

    // First verify uncontrolled defaultActiveZoneId renders snapped status on mount
    const { unmount } = render(
      <SnapZoneOverlay
        defaultPreset="priority-grid"
        defaultActiveZoneId="priority-primary"
      />
    );
    expect(screen.getByTestId('snap-zone-priority-primary')).toHaveAttribute(
      'aria-selected',
      'true'
    );
    expect(screen.getByRole('status')).toHaveTextContent(
      'Snapped Optical Studio — main.tsx to Primary Stage (70% × 100%) · Priority Grid'
    );
    unmount();

    // Now verify fully controlled preset & activeZoneId
    const { rerender } = render(
      <SnapZoneOverlay
        preset="quarters"
        activeZoneId="quarters-bottom-right"
        onPresetChange={onPresetChange}
        onSnapZone={onSnapZone}
      />
    );

    const bottomRight = screen.getByTestId('snap-zone-quarters-bottom-right');
    const topLeft = screen.getByTestId('snap-zone-quarters-top-left');
    expect(bottomRight).toHaveAttribute('aria-selected', 'true');

    // Focusing index 3 before controlled preset shrinks to 2 slots
    fireEvent.focus(bottomRight);
    expect(bottomRight).toHaveAttribute('tabindex', '0');

    // Clicking another preset emits onPresetChange without mutating DOM until parent rerenders
    fireEvent.click(screen.getByRole('button', { name: 'Halves' }));
    expect(onPresetChange).toHaveBeenCalledWith('halves');
    expect(screen.getAllByRole('option')).toHaveLength(4);

    // Clicking another zone emits onSnapZone without mutating aria-selected until parent updates
    fireEvent.click(topLeft);
    expect(onSnapZone).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: 'quarters-top-left' })
    );
    expect(bottomRight).toHaveAttribute('aria-selected', 'true');
    expect(topLeft).toHaveAttribute('aria-selected', 'false');

    // Clicking Clear Snap emits null without clearing controlled selection until parent updates
    fireEvent.click(screen.getByTestId('snap-clear-button'));
    expect(onSnapZone).toHaveBeenLastCalledWith(null);
    expect(bottomRight).toHaveAttribute('aria-selected', 'true');

    // Parent shrinks controlled preset to halves & passes mismatched activeZoneId
    rerender(
      <SnapZoneOverlay
        preset="halves"
        activeZoneId="quarters-bottom-right"
        onPresetChange={onPresetChange}
        onSnapZone={onSnapZone}
      />
    );

    // Focused index safely clamps back to 0 and mismatched zone resolves to unsnapped
    const halvesLeft = screen.getByTestId('snap-zone-halves-left');
    expect(halvesLeft).toHaveAttribute('tabindex', '0');
    expect(halvesLeft).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByTestId('snap-clear-button')).toBeDisabled();

    // Parent updates activeZoneId to null
    rerender(
      <SnapZoneOverlay
        preset="halves"
        activeZoneId={null}
        onPresetChange={onPresetChange}
        onSnapZone={onSnapZone}
      />
    );
    expect(screen.getByTestId('snap-active-badge')).toHaveTextContent('Unsnapped');
  });

  it('blocks all interactions when disabled, falls back on blank windowTitle, honors aria-label, and renders XSS payload literally', () => {
    const onPresetChange = vi.fn<(preset: SnapZonePresetKind) => void>();
    const onSnapZone = vi.fn<(slot: SnapZoneSlot | null) => void>();

    const { rerender } = render(
      <SnapZoneOverlay
        windowTitle="   "
        aria-label="Custom desktop snap overlay"
        data-testid="edge-root"
      />
    );

    const root = screen.getByTestId('edge-root');
    expect(root).toHaveAttribute('aria-label', 'Custom desktop snap overlay');
    expect(root).not.toHaveAttribute('aria-labelledby');
    expect(
      screen.getByRole('heading', { name: 'Dragging: Optical Studio — main.tsx' })
    ).toBeInTheDocument();

    // Render disabled with adversarial XSS windowTitle and activeZoneId
    const xssTitle = '<script>window.__snapXss=1</script><img src=x onerror=alert(1)>';
    rerender(
      <SnapZoneOverlay
        windowTitle={xssTitle}
        defaultActiveZoneId="halves-left"
        disabled
        onPresetChange={onPresetChange}
        onSnapZone={onSnapZone}
        data-testid="edge-root"
      />
    );

    expect(root).toHaveAttribute('data-disabled', 'true');
    expect(document.querySelector('script')).toBeNull();
    expect(document.querySelector('img')).toBeNull();
    expect(screen.getByRole('heading')).toHaveTextContent(`Dragging: ${xssTitle}`);

    const stage = screen.getByTestId('snap-zone-stage');
    expect(stage).toHaveAttribute('aria-disabled', 'true');

    const dragSource = screen.getByTestId('snap-drag-source');
    expect(dragSource).toHaveAttribute('draggable', 'false');
    const dragStartEvent = new Event('dragstart', { bubbles: true, cancelable: true });
    fireEvent(dragSource, dragStartEvent);
    expect(dragStartEvent.defaultPrevented).toBe(true);

    const thirdsBtn = screen.getByTestId('snap-preset-thirds');
    const clearBtn = screen.getByTestId('snap-clear-button');
    const leftZone = screen.getByTestId('snap-zone-halves-left');
    const rightZone = screen.getByTestId('snap-zone-halves-right');

    expect(thirdsBtn).toBeDisabled();
    expect(clearBtn).toBeDisabled();
    expect(leftZone).toHaveAttribute('tabindex', '-1');
    expect(leftZone).toHaveAttribute('aria-disabled', 'true');

    // Attempt every interaction while disabled -> zero side effects
    fireEvent.click(thirdsBtn);
    fireEvent.click(clearBtn);
    fireEvent.focus(rightZone);
    fireEvent.mouseEnter(rightZone);
    expect(rightZone).not.toHaveAttribute('data-hovered');
    fireEvent.click(rightZone);
    fireEvent.dragEnter(rightZone);
    fireEvent.dragOver(rightZone);
    fireEvent.dragLeave(rightZone);
    fireEvent.drop(rightZone);
    fireEvent.keyDown(rightZone, { key: 'Enter' });
    fireEvent.keyDown(rightZone, { key: 'ArrowLeft' });
    fireEvent.keyDown(rightZone, { key: 'Escape' });

    expect(rightZone).not.toHaveAttribute('data-drag-over');
    expect(onPresetChange).not.toHaveBeenCalled();
    expect(onSnapZone).not.toHaveBeenCalled();
  });
});
