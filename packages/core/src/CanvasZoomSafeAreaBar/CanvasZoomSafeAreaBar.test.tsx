import { createRef, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import {
  CanvasZoomSafeAreaBar,
  type AspectMaskPresetMap,
  type SafeAreaGuidesState,
} from './index';

describe('CanvasZoomSafeAreaBar', () => {
  it('renders Open-Internals contracts, default optical frame, broadcast overlays, live status bar, theme overrides, and React 19 ref', () => {
    const ref = createRef<HTMLDivElement>();
    const maskMapCheck: AspectMaskPresetMap = {
      none: true,
      '16:9': true,
      '2.39:1': true,
      '9:16': true,
      '1:1': true,
    };
    expect(
      maskMapCheck.none &&
        maskMapCheck['16:9'] &&
        maskMapCheck['2.39:1'] &&
        maskMapCheck['9:16'] &&
        maskMapCheck['1:1']
    ).toBe(true);

    render(
      <PrismThemeProvider
        theme={{
          components: {
            CanvasZoomSafeAreaBar: {
              className: 'theme-canvas-zoom-bar',
              style: { maxWidth: '920px' },
            },
          },
        }}
      >
        <CanvasZoomSafeAreaBar
          ref={ref}
          className="local-canvas-zoom-bar"
          xstyle={{ '--prism-blur-px': '22px' }}
          style={{ marginBottom: '10px' }}
          data-testid="canvas-root"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('canvas-root');
    expect(ref.current).toBe(root);
    expect(CanvasZoomSafeAreaBar.displayName).toBe('CanvasZoomSafeAreaBar');
    expect(root).toHaveClass(
      'refractor-canvas-zoom-safe-area-bar',
      'prism-slab',
      'theme-canvas-zoom-bar',
      'local-canvas-zoom-bar'
    );
    expect(root).toHaveAttribute('data-zoom', 'fit');
    expect(root).toHaveAttribute('data-aspect-mask', '2.39:1');
    expect(root).toHaveAttribute('data-rule-of-thirds', 'true');
    expect(root).toHaveAttribute('data-title-safe', 'true');
    expect(root).toHaveAttribute('data-action-safe', 'true');
    expect(root).not.toHaveAttribute('data-disabled');
    expect(root).toHaveStyle({ maxWidth: '920px', marginBottom: '10px' });

    // Rich default optical frame + scale(1) media stage
    expect(screen.getByTestId('canvas-default-frame')).toBeInTheDocument();
    expect(screen.getByTestId('canvas-media-stage')).toHaveStyle({ transform: 'scale(1)' });

    // Broadcast guides active by default
    expect(screen.getByTestId('guide-rule-of-thirds')).toBeInTheDocument();
    expect(screen.getByTestId('guide-action-safe')).toHaveTextContent('Action Safe 90%');
    expect(screen.getByTestId('guide-title-safe')).toHaveTextContent('Title Safe 80%');

    // Default 2.39:1 Scope letterbox matte bars
    expect(screen.getByTestId('guide-aspect-mask')).toHaveAttribute('data-mask-preset', '2.39:1');
    expect(screen.getByTestId('aspect-mask-top')).toHaveStyle({ height: '12.81%' });
    expect(screen.getByTestId('aspect-mask-bottom')).toHaveStyle({ height: '12.81%' });
    expect(screen.getByTestId('aspect-mask-badge')).toHaveTextContent('2.39:1 Scope');

    // Segmented buttons & toggles pressed states
    expect(screen.getByRole('button', { name: 'Fit' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: '50%' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: '100%' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: '200%' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: 'Thirds' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Title Safe' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(screen.getByRole('button', { name: 'Action Safe' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(screen.getByLabelText('Aspect ratio mask')).toHaveValue('2.39:1');

    // Recessed polite live status bar
    const status = screen.getByTestId('canvas-status-bar');
    expect(status).toHaveAttribute('aria-live', 'polite');
    expect(status).toHaveTextContent('3840 × 2160 · Rec.709');
    expect(status).toHaveTextContent('Zoom: Fit');
    expect(status).toHaveTextContent('Mask: 2.39:1 Scope');
    expect(status).toHaveTextContent('Guides: 3/3 active');
  });

  it('renders custom children media and sanitizes adversarial canvasLabel as literal text', () => {
    render(
      <CanvasZoomSafeAreaBar canvasLabel="<script>window.__xss=1</script>4096 × 2160 · DCI-P3">
        <div data-testid="custom-preview-canvas">Custom Render Feed</div>
      </CanvasZoomSafeAreaBar>
    );

    expect(document.querySelector('script')).toBeNull();
    expect(screen.queryByTestId('canvas-default-frame')).toBeNull();
    expect(screen.getByTestId('custom-preview-canvas')).toHaveTextContent('Custom Render Feed');
    expect(screen.getByTestId('canvas-header-label')).toHaveTextContent(
      '<script>window.__xss=1</script>4096 × 2160 · DCI-P3'
    );
    expect(screen.getByTestId('canvas-status-bar')).toHaveTextContent(
      '<script>window.__xss=1</script>4096 × 2160 · DCI-P3'
    );
  });

  it('updates stage transform scale and state across Fit, 50%, 100%, and 200% zoom buttons', () => {
    const onChange = vi.fn<(state: SafeAreaGuidesState) => void>();

    render(<CanvasZoomSafeAreaBar onChange={onChange} data-testid="canvas-root" />);

    const fitBtn = screen.getByRole('button', { name: 'Fit' });
    const z50Btn = screen.getByRole('button', { name: '50%' });
    const z100Btn = screen.getByRole('button', { name: '100%' });
    const z200Btn = screen.getByRole('button', { name: '200%' });
    const stage = screen.getByTestId('canvas-media-stage');
    const status = screen.getByTestId('canvas-status-bar');

    // Clicking already-active Fit is a no-op
    fireEvent.click(fitBtn);
    expect(onChange).not.toHaveBeenCalled();

    // 50% zoom
    fireEvent.click(z50Btn);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenLastCalledWith({
      zoom: 50,
      ruleOfThirds: true,
      titleSafe: true,
      actionSafe: true,
      aspectMask: '2.39:1',
    });
    expect(stage).toHaveStyle({ transform: 'scale(0.5)' });
    expect(z50Btn).toHaveAttribute('aria-pressed', 'true');
    expect(fitBtn).toHaveAttribute('aria-pressed', 'false');
    expect(status).toHaveTextContent('Zoom: 50%');

    // 100% zoom
    fireEvent.click(z100Btn);
    expect(onChange).toHaveBeenLastCalledWith({
      zoom: 100,
      ruleOfThirds: true,
      titleSafe: true,
      actionSafe: true,
      aspectMask: '2.39:1',
    });
    expect(stage).toHaveStyle({ transform: 'scale(1)' });
    expect(screen.getByTestId('canvas-root')).toHaveAttribute('data-zoom', '100');
    expect(status).toHaveTextContent('Zoom: 100%');

    // 200% zoom
    fireEvent.click(z200Btn);
    expect(onChange).toHaveBeenLastCalledWith({
      zoom: 200,
      ruleOfThirds: true,
      titleSafe: true,
      actionSafe: true,
      aspectMask: '2.39:1',
    });
    expect(stage).toHaveStyle({ transform: 'scale(2)' });
    expect(status).toHaveTextContent('Zoom: 200%');

    // Return to Fit
    fireEvent.click(fitBtn);
    expect(onChange).toHaveBeenLastCalledWith({
      zoom: 'fit',
      ruleOfThirds: true,
      titleSafe: true,
      actionSafe: true,
      aspectMask: '2.39:1',
    });
    expect(stage).toHaveStyle({ transform: 'scale(1)' });
    expect(status).toHaveTextContent('Zoom: Fit');
  });

  it('supports IME-safe 0 (Fit), 1 (100%), and 2 (200%) keyboard shortcuts on the toolbar', () => {
    const onChange = vi.fn<(state: SafeAreaGuidesState) => void>();

    render(<CanvasZoomSafeAreaBar onChange={onChange} />);

    const toolbar = screen.getByRole('toolbar', { name: 'Canvas zoom and safe-area controls' });
    const stage = screen.getByTestId('canvas-media-stage');
    const select = screen.getByLabelText('Aspect ratio mask');

    // IME composing event must be ignored
    const composingEvent = new KeyboardEvent('keydown', { key: '1', bubbles: true });
    Object.defineProperty(composingEvent, 'isComposing', { value: true });
    toolbar.dispatchEvent(composingEvent);
    expect(onChange).not.toHaveBeenCalled();

    // Modifier keys must not hijack browser shortcuts
    fireEvent.keyDown(toolbar, { key: '1', ctrlKey: true });
    fireEvent.keyDown(toolbar, { key: '2', metaKey: true });
    fireEvent.keyDown(toolbar, { key: '0', altKey: true });
    expect(onChange).not.toHaveBeenCalled();

    // Pressing keys inside native <select> must be ignored
    fireEvent.keyDown(select, { key: '1' });
    expect(onChange).not.toHaveBeenCalled();

    // Unrelated keys do nothing
    fireEvent.keyDown(toolbar, { key: '9' });
    expect(onChange).not.toHaveBeenCalled();

    // Shortcut '1' -> 100%
    fireEvent.keyDown(toolbar, { key: '1' });
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ zoom: 100 }));
    expect(stage).toHaveAttribute('data-zoom', '100');

    // Shortcut '2' -> 200%
    fireEvent.keyDown(toolbar, { key: '2' });
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ zoom: 200 }));
    expect(stage).toHaveStyle({ transform: 'scale(2)' });

    // Shortcut '0' -> Fit (also verify bubbling from a non-HTMLElement SVG icon inside toolbar)
    const iconSvg = screen.getByTestId('toggle-rule-of-thirds').querySelector('svg');
    expect(iconSvg).not.toBeNull();
    if (iconSvg) {
      fireEvent.keyDown(iconSvg, { key: '0' });
    }
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ zoom: 'fit' }));
    expect(stage).toHaveAttribute('data-zoom', 'fit');
  });

  it('toggles Thirds, Title Safe, and Action Safe guides and updates active count in live status bar', () => {
    const onChange = vi.fn<(state: SafeAreaGuidesState) => void>();

    render(<CanvasZoomSafeAreaBar onChange={onChange} data-testid="canvas-root" />);

    const root = screen.getByTestId('canvas-root');
    const thirdsBtn = screen.getByRole('button', { name: 'Thirds' });
    const titleSafeBtn = screen.getByRole('button', { name: 'Title Safe' });
    const actionSafeBtn = screen.getByRole('button', { name: 'Action Safe' });
    const status = screen.getByTestId('canvas-status-bar');

    // Turn off Rule of Thirds
    fireEvent.click(thirdsBtn);
    expect(thirdsBtn).toHaveAttribute('aria-pressed', 'false');
    expect(screen.queryByTestId('guide-rule-of-thirds')).toBeNull();
    expect(root).not.toHaveAttribute('data-rule-of-thirds');
    expect(status).toHaveTextContent('Guides: 2/3 active');

    // Turn off Title Safe
    fireEvent.click(titleSafeBtn);
    expect(titleSafeBtn).toHaveAttribute('aria-pressed', 'false');
    expect(screen.queryByTestId('guide-title-safe')).toBeNull();
    expect(root).not.toHaveAttribute('data-title-safe');
    expect(status).toHaveTextContent('Guides: 1/3 active');

    // Turn off Action Safe
    fireEvent.click(actionSafeBtn);
    expect(actionSafeBtn).toHaveAttribute('aria-pressed', 'false');
    expect(screen.queryByTestId('guide-action-safe')).toBeNull();
    expect(root).not.toHaveAttribute('data-action-safe');
    expect(status).toHaveTextContent('Guides: 0/3 active');

    // Toggle all three back on
    fireEvent.click(thirdsBtn);
    fireEvent.click(titleSafeBtn);
    fireEvent.click(actionSafeBtn);
    expect(screen.getByTestId('guide-rule-of-thirds')).toBeInTheDocument();
    expect(screen.getByTestId('guide-title-safe')).toBeInTheDocument();
    expect(screen.getByTestId('guide-action-safe')).toBeInTheDocument();
    expect(status).toHaveTextContent('Guides: 3/3 active');
    expect(onChange).toHaveBeenCalledTimes(6);
  });

  it('switches aspect ratio matte masks across Off, 16:9 HD, 2.39:1 Scope, 9:16 Vertical, and 1:1 Square', () => {
    const onChange = vi.fn<(state: SafeAreaGuidesState) => void>();

    render(<CanvasZoomSafeAreaBar onChange={onChange} data-testid="canvas-root" />);

    const select = screen.getByLabelText('Aspect ratio mask');
    const status = screen.getByTestId('canvas-status-bar');

    // Switch to Off ('none')
    fireEvent.change(select, { target: { value: 'none' } });
    expect(screen.queryByTestId('guide-aspect-mask')).toBeNull();
    expect(status).toHaveTextContent('Mask: Off');

    // Re-selecting same value is a no-op
    const callsAfterNone = onChange.mock.calls.length;
    fireEvent.change(select, { target: { value: 'none' } });
    expect(onChange).toHaveBeenCalledTimes(callsAfterNone);

    // Adversarial unsupported option value is safely ignored
    fireEvent.change(select, { target: { value: '4:3' } });
    expect(onChange).toHaveBeenCalledTimes(callsAfterNone);

    // Switch to 16:9 HD
    fireEvent.change(select, { target: { value: '16:9' } });
    expect(screen.getByTestId('aspect-mask-frame')).toBeInTheDocument();
    expect(screen.queryByTestId('aspect-mask-top')).toBeNull();
    expect(screen.queryByTestId('aspect-mask-left')).toBeNull();
    expect(screen.getByTestId('aspect-mask-badge')).toHaveTextContent('16:9 HD');
    expect(status).toHaveTextContent('Mask: 16:9 HD');

    // Switch to 9:16 Vertical pillarbox
    fireEvent.change(select, { target: { value: '9:16' } });
    expect(screen.getByTestId('aspect-mask-left')).toHaveStyle({ width: '34.18%' });
    expect(screen.getByTestId('aspect-mask-right')).toHaveStyle({ width: '34.18%' });
    expect(screen.getByTestId('aspect-mask-badge')).toHaveTextContent('9:16 Vertical');
    expect(status).toHaveTextContent('Mask: 9:16 Vertical');

    // Switch to 1:1 Square pillarbox
    fireEvent.change(select, { target: { value: '1:1' } });
    expect(screen.getByTestId('aspect-mask-left')).toHaveStyle({ width: '21.88%' });
    expect(screen.getByTestId('aspect-mask-right')).toHaveStyle({ width: '21.88%' });
    expect(screen.getByTestId('aspect-mask-badge')).toHaveTextContent('1:1 Square');
    expect(status).toHaveTextContent('Mask: 1:1 Square');

    // Switch back to 2.39:1 Scope letterbox
    fireEvent.change(select, { target: { value: '2.39:1' } });
    expect(screen.getByTestId('aspect-mask-top')).toHaveStyle({ height: '12.81%' });
    expect(screen.getByTestId('aspect-mask-bottom')).toHaveStyle({ height: '12.81%' });
    expect(status).toHaveTextContent('Mask: 2.39:1 Scope');
  });

  it('supports partial defaultValue merging and fully controlled value synchronization', () => {
    function ControlledHarness() {
      const [state, setState] = useState<SafeAreaGuidesState>({
        zoom: 50,
        ruleOfThirds: false,
        titleSafe: true,
        actionSafe: false,
        aspectMask: '1:1',
      });

      return (
        <CanvasZoomSafeAreaBar
          value={state}
          onChange={setState}
          data-testid="controlled-canvas"
        />
      );
    }

    const { unmount } = render(
      <CanvasZoomSafeAreaBar
        defaultValue={{ zoom: 200, actionSafe: false }}
        data-testid="partial-canvas"
      />
    );

    expect(screen.getByTestId('partial-canvas')).toHaveAttribute('data-zoom', '200');
    expect(screen.getByTestId('partial-canvas')).toHaveAttribute('data-aspect-mask', '2.39:1');
    expect(screen.getByTestId('canvas-status-bar')).toHaveTextContent('Guides: 2/3 active');
    unmount();

    // Render controlled harness
    render(<ControlledHarness />);
    expect(screen.getByTestId('controlled-canvas')).toHaveAttribute('data-zoom', '50');
    expect(screen.getByTestId('controlled-canvas')).toHaveAttribute('data-aspect-mask', '1:1');
    expect(screen.getByTestId('canvas-status-bar')).toHaveTextContent('Guides: 1/3 active');

    fireEvent.click(screen.getByRole('button', { name: '100%' }));
    fireEvent.click(screen.getByRole('button', { name: 'Thirds' }));
    expect(screen.getByTestId('controlled-canvas')).toHaveAttribute('data-zoom', '100');
    expect(screen.getByTestId('canvas-status-bar')).toHaveTextContent('Guides: 2/3 active');
  });

  it('blocks all interactions, shortcuts, and select changes when disabled', () => {
    const onChange = vi.fn<(state: SafeAreaGuidesState) => void>();

    render(<CanvasZoomSafeAreaBar disabled onChange={onChange} data-testid="disabled-canvas" />);

    const root = screen.getByTestId('disabled-canvas');
    const toolbar = screen.getByRole('toolbar', { name: 'Canvas zoom and safe-area controls' });
    const select = screen.getByLabelText('Aspect ratio mask');

    expect(root).toHaveAttribute('data-disabled', 'true');
    expect(toolbar).toHaveAttribute('aria-disabled', 'true');
    expect(toolbar).toHaveAttribute('tabindex', '-1');
    expect(screen.getByRole('button', { name: '50%' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Thirds' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Title Safe' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Action Safe' })).toBeDisabled();
    expect(select).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: '200%' }));
    fireEvent.click(screen.getByRole('button', { name: 'Thirds' }));
    fireEvent.keyDown(toolbar, { key: '1' });
    fireEvent.keyDown(toolbar, { key: '2' });
    fireEvent.change(select, { target: { value: '1:1' } });

    expect(onChange).not.toHaveBeenCalled();
    expect(root).toHaveAttribute('data-zoom', 'fit');
    expect(root).toHaveAttribute('data-aspect-mask', '2.39:1');
  });
});
