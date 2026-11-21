import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import { WindowSplitter, type WindowSplitterPane } from './WindowSplitter';

const TWO_PANES: WindowSplitterPane[] = [
  { id: 'left', label: 'Explorer', minSize: 20, maxSize: 80, content: <p>Explorer content</p> },
  { id: 'right', label: 'Editor', minSize: 20, maxSize: 80, content: <p>Editor content</p> },
];

const THREE_PANES: WindowSplitterPane[] = [
  { id: 'nav', label: 'Nav', content: <span>Nav</span> },
  { id: 'main', label: 'Main', content: <span>Main</span> },
  { id: 'inspector', label: 'Inspector', content: <span>Inspector</span> },
];

describe('WindowSplitter', () => {
  it('renders panes with equal split, optical glass classes, theme overrides, and React 19 ref', () => {
    const ref = createRef<HTMLDivElement>();

    render(
      <PrismThemeProvider
        theme={{
          components: {
            WindowSplitter: { className: 'theme-splitter', style: { minHeight: '240px' } },
          },
        }}
      >
        <WindowSplitter
          ref={ref}
          panes={TWO_PANES}
          className="custom-splitter"
          xstyle={{ '--prism-blur-px': '20px' }}
          style={{ padding: '10px' }}
          data-testid="splitter"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('splitter');
    expect(ref.current).toBe(root);
    expect(root).toHaveClass('refractor-window-splitter', 'prism-slab', 'theme-splitter', 'custom-splitter');
    expect(root).toHaveAttribute('data-orientation', 'horizontal');
    expect(root).toHaveAttribute('data-panes', '2');
    expect(root).toHaveStyle({ minHeight: '240px', padding: '10px' });

    const leftPane = screen.getByRole('region', { name: 'Explorer' });
    const rightPane = screen.getByRole('region', { name: 'Editor' });
    expect(leftPane).toHaveAttribute('data-pane-size', '50');
    expect(rightPane).toHaveAttribute('data-pane-size', '50');
    expect(leftPane).toHaveClass('refractor-window-splitter__pane', 'prism-well');

    const separator = screen.getByRole('separator', { name: 'Resize Explorer and Editor panes' });
    expect(separator).toHaveAttribute('aria-orientation', 'vertical');
    expect(separator).toHaveAttribute('aria-valuenow', '50');
    expect(separator).toHaveAttribute('aria-valuemin', '20');
    expect(separator).toHaveAttribute('aria-valuemax', '80');
    expect(separator).toHaveAttribute('tabindex', '0');
  });

  it('supports 3 panes with exact 100% rounding and unlabeled pane fallback aria-label', () => {
    render(
      <WindowSplitter
        panes={[
          { id: 'alpha', content: <div>Alpha</div> },
          { id: 'beta', content: <div>Beta</div> },
          { id: 'gamma', content: <div>Gamma</div> },
        ]}
      />
    );

    const separators = screen.getAllByRole('separator');
    expect(separators).toHaveLength(2);
    expect(separators[0]).toHaveAttribute('aria-label', 'Resize alpha and beta panes');
    expect(separators[1]).toHaveAttribute('aria-label', 'Resize beta and gamma panes');

    const paneEls = document.querySelectorAll('[data-pane-size]');
    const sizes = Array.from(paneEls).map((el) => Number(el.getAttribute('data-pane-size')));
    expect(sizes.reduce((a, b) => a + b, 0)).toBeCloseTo(100, 2);
  });

  it('supports keyboard resizing (ArrowLeft/ArrowRight/Home/End/Enter) in horizontal mode', () => {
    const onSizesChange = vi.fn();
    render(
      <WindowSplitter
        panes={TWO_PANES}
        defaultSizes={[40, 60]}
        step={10}
        onSizesChange={onSizesChange}
      />
    );

    const separator = screen.getByRole('separator');
    expect(separator).toHaveAttribute('aria-valuenow', '40');

    fireEvent.keyDown(separator, { key: 'ArrowRight' });
    expect(onSizesChange).toHaveBeenLastCalledWith([50, 50]);
    expect(separator).toHaveAttribute('aria-valuenow', '50');

    fireEvent.keyDown(separator, { key: 'ArrowLeft' });
    expect(onSizesChange).toHaveBeenLastCalledWith([40, 60]);

    fireEvent.keyDown(separator, { key: 'Home' });
    expect(onSizesChange).toHaveBeenLastCalledWith([20, 80]);
    expect(separator).toHaveAttribute('aria-valuenow', '20');

    fireEvent.keyDown(separator, { key: 'End' });
    expect(onSizesChange).toHaveBeenLastCalledWith([80, 20]);
    expect(separator).toHaveAttribute('aria-valuenow', '80');

    fireEvent.keyDown(separator, { key: 'Enter' });
    expect(onSizesChange).toHaveBeenLastCalledWith([40, 60]);
    expect(separator).toHaveAttribute('aria-valuenow', '40');
  });

  it('supports vertical orientation keyboard resizing (ArrowUp/ArrowDown) and double-click reset', () => {
    const onSizesChange = vi.fn();
    render(
      <WindowSplitter
        orientation="vertical"
        panes={TWO_PANES}
        defaultSizes={[30, 70]}
        onSizesChange={onSizesChange}
      />
    );

    const separator = screen.getByRole('separator');
    expect(separator).toHaveAttribute('aria-orientation', 'horizontal');

    fireEvent.keyDown(separator, { key: 'ArrowDown' });
    expect(onSizesChange).toHaveBeenLastCalledWith([35, 65]);

    fireEvent.keyDown(separator, { key: 'ArrowUp' });
    expect(onSizesChange).toHaveBeenLastCalledWith([30, 70]);

    fireEvent.keyDown(separator, { key: 'End' });
    expect(onSizesChange).toHaveBeenLastCalledWith([80, 20]);

    fireEvent.doubleClick(separator);
    expect(onSizesChange).toHaveBeenLastCalledWith([30, 70]);
  });

  it('ignores IME composing keydown events and unrelated keys', () => {
    const onSizesChange = vi.fn();
    render(<WindowSplitter panes={TWO_PANES} onSizesChange={onSizesChange} />);
    const separator = screen.getByRole('separator');

    const composingEvent = new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true });
    Object.defineProperty(composingEvent, 'isComposing', { value: true });
    separator.dispatchEvent(composingEvent);

    fireEvent.keyDown(separator, { key: 'Tab' });
    expect(onSizesChange).not.toHaveBeenCalled();
  });

  it('resizes via pointer drag in horizontal mode, clamps strictly, and cleans up on pointerup', () => {
    const onSizesChange = vi.fn();
    render(<WindowSplitter panes={TWO_PANES} onSizesChange={onSizesChange} data-testid="splitter" />);

    const root = screen.getByTestId('splitter');
    vi.spyOn(root, 'getBoundingClientRect').mockReturnValue({
      x: 0,
      y: 0,
      left: 0,
      top: 0,
      right: 1000,
      bottom: 400,
      width: 1000,
      height: 400,
      toJSON: () => ({}),
    });

    const separator = screen.getByRole('separator');

    // Non-primary mouse button is ignored
    fireEvent.pointerDown(separator, { button: 2, clientX: 500 });
    expect(separator).not.toHaveAttribute('data-dragging', 'true');

    // Primary drag +150px (+15%)
    fireEvent.pointerDown(separator, { button: 0, clientX: 500 });
    expect(separator).toHaveAttribute('data-dragging', 'true');
    expect(root).toHaveAttribute('data-dragging', 'true');

    fireEvent.pointerMove(window, { clientX: 650 });
    expect(onSizesChange).toHaveBeenLastCalledWith([65, 35]);

    // Drag past maxSize clamps to 80/20
    fireEvent.pointerMove(window, { clientX: 1400 });
    expect(onSizesChange).toHaveBeenLastCalledWith([80, 20]);

    // Drag past minSize clamps to 20/80
    fireEvent.pointerMove(window, { clientX: -200 });
    expect(onSizesChange).toHaveBeenLastCalledWith([20, 80]);

    fireEvent.pointerUp(window);
    expect(separator).not.toHaveAttribute('data-dragging');

    // Subsequent moves after pointerup are ignored
    const callCount = onSizesChange.mock.calls.length;
    fireEvent.pointerMove(window, { clientX: 700 });
    expect(onSizesChange).toHaveBeenCalledTimes(callCount);
  });

  it('resizes via pointer drag in vertical mode and cleans up on pointercancel and unmount', () => {
    const onSizesChange = vi.fn();
    const { unmount } = render(
      <WindowSplitter
        orientation="vertical"
        panes={TWO_PANES}
        onSizesChange={onSizesChange}
        data-testid="vsplitter"
      />
    );

    const root = screen.getByTestId('vsplitter');
    vi.spyOn(root, 'getBoundingClientRect').mockReturnValue({
      x: 0,
      y: 0,
      left: 0,
      top: 0,
      right: 600,
      bottom: 500,
      width: 600,
      height: 500,
      toJSON: () => ({}),
    });

    const separator = screen.getByRole('separator');
    fireEvent.pointerDown(separator, { button: 0, clientY: 250 });
    fireEvent.pointerMove(window, { clientY: 350 });
    expect(onSizesChange).toHaveBeenLastCalledWith([70, 30]);

    fireEvent.pointerCancel(window);
    expect(separator).not.toHaveAttribute('data-dragging');

    // Start another drag and unmount mid-drag to verify listener cleanup
    fireEvent.pointerDown(separator, { button: 0, clientY: 250 });
    unmount();
    const callsBefore = onSizesChange.mock.calls.length;
    fireEvent.pointerMove(window, { clientY: 400 });
    expect(onSizesChange).toHaveBeenCalledTimes(callsBefore);
  });

  it('guards zero-width container rect during pointer drag (negative test)', () => {
    const onSizesChange = vi.fn();
    render(<WindowSplitter panes={TWO_PANES} onSizesChange={onSizesChange} data-testid="zero" />);

    const root = screen.getByTestId('zero');
    vi.spyOn(root, 'getBoundingClientRect').mockReturnValue({
      x: 0,
      y: 0,
      left: 0,
      top: 0,
      right: 0,
      bottom: 0,
      width: 0,
      height: 0,
      toJSON: () => ({}),
    });

    const separator = screen.getByRole('separator');
    fireEvent.pointerDown(separator, { button: 0, clientX: 100 });
    fireEvent.pointerMove(window, { clientX: 250 });
    fireEvent.pointerUp(window);

    expect(onSizesChange).not.toHaveBeenCalled();
  });

  it('supports controlled sizes and dynamic pane count updates', () => {
    const onSizesChange = vi.fn();
    const { rerender } = render(
      <WindowSplitter panes={TWO_PANES} sizes={[35, 65]} onSizesChange={onSizesChange} />
    );

    const separator = screen.getByRole('separator');
    expect(separator).toHaveAttribute('aria-valuenow', '35');

    fireEvent.keyDown(separator, { key: 'ArrowRight' });
    expect(onSizesChange).toHaveBeenLastCalledWith([40, 60]);
    // Still controlled at 35 until parent updates prop
    expect(separator).toHaveAttribute('aria-valuenow', '35');

    // Uncontrolled re-render when pane count changes
    rerender(<WindowSplitter panes={THREE_PANES} />);
    expect(screen.getAllByRole('separator')).toHaveLength(2);
  });

  it('handles 0 panes and 1 pane gracefully without rendering separators', () => {
    const { rerender } = render(<WindowSplitter panes={[]} data-testid="empty" />);
    expect(screen.getByTestId('empty')).toHaveAttribute('data-panes', '0');
    expect(screen.queryByRole('separator')).toBeNull();

    rerender(
      <WindowSplitter
        panes={[{ id: 'solo', label: 'Solo', content: <p>Only pane</p> }]}
        data-testid="empty"
      />
    );
    expect(screen.getByTestId('empty')).toHaveAttribute('data-panes', '1');
    expect(screen.queryByRole('separator')).toBeNull();
    expect(screen.getByRole('region', { name: 'Solo' })).toHaveAttribute('data-pane-size', '100');
  });

  it('normalizes adversarial NaN, negative, non-100, and extreme constraint sizes safely', () => {
    const { rerender } = render(
      <WindowSplitter
        panes={TWO_PANES}
        defaultSizes={[Number.NaN, -50]}
        step={Number.NaN}
      />
    );
    expect(screen.getByRole('region', { name: 'Explorer' })).toHaveAttribute('data-pane-size', '50');
    expect(screen.getByRole('region', { name: 'Editor' })).toHaveAttribute('data-pane-size', '50');

    // Non-100 positive sizes and clamping redistribution
    rerender(
      <WindowSplitter
        panes={[
          { id: 'a', label: 'A', minSize: 30, maxSize: 40, content: <span>A</span> },
          { id: 'b', label: 'B', minSize: 20, maxSize: 80, content: <span>B</span> },
        ]}
        sizes={[95, 5]}
      />
    );
    expect(screen.getByRole('region', { name: 'A' })).toHaveAttribute('data-pane-size', '40');
    expect(screen.getByRole('region', { name: 'B' })).toHaveAttribute('data-pane-size', '60');

    // Over-sum redistribution with available shrink slack ([30, 30, 40] -> clamps up to 40, 40, shrinks 3rd to 20)
    rerender(
      <WindowSplitter
        panes={[
          { id: 's1', label: 'S1', minSize: 40, maxSize: 80, content: <span>S1</span> },
          { id: 's2', label: 'S2', minSize: 40, maxSize: 80, content: <span>S2</span> },
          { id: 's3', label: 'S3', minSize: 10, maxSize: 80, content: <span>S3</span> },
        ]}
        sizes={[30, 30, 40]}
      />
    );
    expect(screen.getByRole('region', { name: 'S1' })).toHaveAttribute('data-pane-size', '40');
    expect(screen.getByRole('region', { name: 'S2' })).toHaveAttribute('data-pane-size', '40');
    expect(screen.getByRole('region', { name: 'S3' })).toHaveAttribute('data-pane-size', '20');

    // Over-sum redistribution where zero shrink slack remains (impossible minSize sum > 100)
    rerender(
      <WindowSplitter
        panes={[
          { id: 'x', label: 'X', minSize: 60, maxSize: 80, content: <span>X</span> },
          { id: 'y', label: 'Y', minSize: 60, maxSize: 80, content: <span>Y</span> },
        ]}
        sizes={[50, 50]}
      />
    );
    const sep = screen.getByRole('separator');
    fireEvent.keyDown(sep, { key: 'ArrowRight' });
    expect(Number(sep.getAttribute('aria-valuenow'))).toBeGreaterThan(0);

    // Under-sum where max caps sum below 100
    rerender(
      <WindowSplitter
        panes={[
          { id: 'p', label: 'P', minSize: 10, maxSize: 30, content: <span>P</span> },
          { id: 'q', label: 'Q', minSize: 10, maxSize: 30, content: <span>Q</span> },
        ]}
        sizes={[10, 10]}
      />
    );
    expect(screen.getByRole('region', { name: 'P' })).toHaveAttribute('data-pane-size', '30');
    expect(screen.getByRole('region', { name: 'Q' })).toHaveAttribute('data-pane-size', '30');
  });

  it('safely renders adversarial XSS payloads in pane labels and content as literal text', () => {
    const payload = '<script>window.__xss=1</script><img src=x onerror=alert(1)>';
    render(
      <WindowSplitter
        panes={[
          { id: 'a', label: payload, content: payload },
          { id: 'b', label: 'Safe', content: 'Body' },
        ]}
      />
    );
    expect(screen.getByRole('region', { name: payload })).toHaveTextContent(payload);
    expect(document.querySelector('script')).toBeNull();
  });
});
