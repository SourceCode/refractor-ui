import { createRef, useState, type KeyboardEvent } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import {
  BrushHudControl,
  type BrushHudValue,
  type BrushPresetId,
  type BrushPresetMap,
} from './index';

describe('BrushHudControl', () => {
  it('renders prism-slab HUD, SVG radial feathering preview, theme override, React 19 ref, and default live readout', () => {
    const ref = createRef<HTMLDivElement>();

    render(
      <PrismThemeProvider
        theme={{
          components: {
            BrushHudControl: {
              className: 'theme-brush-hud',
              style: { maxWidth: '460px' },
            },
          },
        }}
      >
        <BrushHudControl
          ref={ref}
          title="Retouch Brush HUD"
          className="local-brush-hud"
          xstyle={{ '--prism-blur-px': '20px' }}
          style={{ padding: '18px' }}
          data-testid="brush-hud-root"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('brush-hud-root');
    const previewWell = screen.getByTestId('brush-preview-well');
    const svg = screen.getByTestId('brush-preview-svg');
    const dab = screen.getByTestId('brush-preview-dab');
    const ring = screen.getByTestId('brush-preview-ring');
    const centerStop = screen.getByTestId('brush-gradient-stop-center');
    const coreStop = screen.getByTestId('brush-gradient-stop-core');
    const midStop = screen.getByTestId('brush-gradient-stop-mid');
    const edgeStop = screen.getByTestId('brush-gradient-stop-edge');
    const readout = screen.getByTestId('brush-hud-readout');

    expect(BrushHudControl.displayName).toBe('BrushHudControl');
    expect(ref.current).toBe(root);
    expect(root).toHaveClass(
      'refractor-brush-hud-control',
      'prism-slab',
      'prism-focus-ring',
      'theme-brush-hud',
      'local-brush-hud'
    );
    expect(root).toHaveStyle({ maxWidth: '460px', padding: '18px' });
    expect(root).toHaveAttribute('role', 'region');
    expect(root).toHaveAttribute('aria-label', 'Retouch Brush HUD');
    expect(root).toHaveAttribute('tabindex', '0');
    expect(root).toHaveAttribute('data-preset', 'custom');

    expect(screen.getByTestId('brush-hud-title')).toHaveTextContent('Retouch Brush HUD');
    expect(screen.getByTestId('brush-shortcut-hint')).toHaveTextContent('[');
    expect(screen.getByTestId('brush-shortcut-hint')).toHaveTextContent(']');

    // Preview well & SVG contract
    expect(previewWell).toHaveClass('prism-well', 'rounded-2xl');
    expect(svg).toHaveAttribute('viewBox', '0 0 128 128');
    expect(svg).toHaveClass('w-28', 'h-28', 'shrink-0');
    expect(screen.getByTestId('brush-crosshair-h')).toBeInTheDocument();
    expect(screen.getByTestId('brush-crosshair-v')).toBeInTheDocument();
    expect(ring).toHaveAttribute('stroke-dasharray', '3 3');
    expect(dab.getAttribute('r')).toBe(ring.getAttribute('r'));

    // Radial gradient strictly uses --prism-primary-main
    for (const stop of [centerStop, coreStop, midStop, edgeStop]) {
      expect(stop).toHaveAttribute('stop-color', 'var(--prism-primary-main)');
    }
    expect(centerStop).toHaveAttribute('stop-opacity', '0.8');
    expect(edgeStop).toHaveAttribute('stop-opacity', '0');

    // Sliders & tabular pills
    expect(screen.getByRole('slider', { name: 'Brush size in pixels' })).toHaveValue('64');
    expect(screen.getByRole('slider', { name: 'Brush hardness percentage' })).toHaveValue('45');
    expect(screen.getByRole('slider', { name: 'Brush flow percentage' })).toHaveValue('80');
    expect(screen.getByTestId('brush-size-pill')).toHaveTextContent('64px');
    expect(screen.getByTestId('brush-hardness-pill')).toHaveTextContent('45%');
    expect(screen.getByTestId('brush-flow-pill')).toHaveTextContent('80%');

    // Live readout
    expect(readout).toHaveAttribute('aria-live', 'polite');
    expect(readout).toHaveTextContent('64px · 45% hard · 80% flow');
    expect(screen.getByTestId('brush-preset-status')).toHaveTextContent('Custom');

    // Presets present
    expect(screen.getByRole('button', { name: 'Airbrush' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: 'Hard Round' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: 'Soft Dodge' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: 'Detail Pen' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('updates size, hardness, flow via sliders and ±1px buttons and dynamically updates SVG preview geometry & feathering', () => {
    const onChange = vi.fn<(value: BrushHudValue) => void>();

    render(<BrushHudControl onChange={onChange} data-testid="hud" />);

    const sizeSlider = screen.getByRole('slider', { name: 'Brush size in pixels' });
    const hardnessSlider = screen.getByRole('slider', { name: 'Brush hardness percentage' });
    const flowSlider = screen.getByRole('slider', { name: 'Brush flow percentage' });
    const decBtn = screen.getByTestId('brush-size-decrease');
    const incBtn = screen.getByTestId('brush-size-increase');
    const dab = screen.getByTestId('brush-preview-dab');
    const coreStop = screen.getByTestId('brush-gradient-stop-core');
    const centerStop = screen.getByTestId('brush-gradient-stop-center');

    const initialRadius = Number(dab.getAttribute('r'));
    const initialCoreOffset = Number.parseFloat(coreStop.getAttribute('offset') ?? '0');

    // Fine-step buttons (-1px, +1px)
    fireEvent.click(decBtn);
    expect(onChange).toHaveBeenLastCalledWith({ sizePx: 63, hardnessPct: 45, flowPct: 80 });
    expect(screen.getByTestId('brush-size-pill')).toHaveTextContent('63px');

    fireEvent.click(incBtn);
    expect(onChange).toHaveBeenLastCalledWith({ sizePx: 64, hardnessPct: 45, flowPct: 80 });

    // Size slider scales radius smoothly upward
    fireEvent.change(sizeSlider, { target: { value: '280' } });
    expect(onChange).toHaveBeenLastCalledWith({ sizePx: 280, hardnessPct: 45, flowPct: 80 });
    const largerRadius = Number(dab.getAttribute('r'));
    expect(largerRadius).toBeGreaterThan(initialRadius);

    // Hardness slider tightens stop falloff
    fireEvent.change(hardnessSlider, { target: { value: '95' } });
    expect(onChange).toHaveBeenLastCalledWith({ sizePx: 280, hardnessPct: 95, flowPct: 80 });
    const tighterCoreOffset = Number.parseFloat(coreStop.getAttribute('offset') ?? '0');
    expect(tighterCoreOffset).toBeGreaterThan(initialCoreOffset);

    // Flow slider scales peak opacity
    fireEvent.change(flowSlider, { target: { value: '30' } });
    expect(onChange).toHaveBeenLastCalledWith({ sizePx: 280, hardnessPct: 95, flowPct: 30 });
    expect(centerStop).toHaveAttribute('stop-opacity', '0.3');

    expect(screen.getByTestId('brush-hud-readout')).toHaveTextContent('280px · 95% hard · 30% flow');
  });

  it('applies all four one-click preset pills, reflects active state, and ignores clicking the active preset again', () => {
    const onChange = vi.fn<(value: BrushHudValue) => void>();

    render(<BrushHudControl onChange={onChange} data-testid="hud" />);

    const root = screen.getByTestId('hud');

    fireEvent.click(screen.getByTestId('brush-preset-airbrush'));
    expect(onChange).toHaveBeenLastCalledWith({ sizePx: 140, hardnessPct: 10, flowPct: 25 });
    expect(root).toHaveAttribute('data-preset', 'airbrush');
    expect(screen.getByTestId('brush-preset-airbrush')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('brush-preset-airbrush')).toHaveAttribute('data-active', 'true');
    expect(screen.getByTestId('brush-preset-status')).toHaveTextContent('Airbrush');

    // Clicking active preset again is a no-op
    const countAfterAirbrush = onChange.mock.calls.length;
    fireEvent.click(screen.getByTestId('brush-preset-airbrush'));
    expect(onChange).toHaveBeenCalledTimes(countAfterAirbrush);

    fireEvent.click(screen.getByTestId('brush-preset-hard-round'));
    expect(onChange).toHaveBeenLastCalledWith({ sizePx: 48, hardnessPct: 95, flowPct: 100 });
    expect(root).toHaveAttribute('data-preset', 'hard-round');

    fireEvent.click(screen.getByTestId('brush-preset-dodge-soft'));
    expect(onChange).toHaveBeenLastCalledWith({ sizePx: 180, hardnessPct: 0, flowPct: 15 });
    expect(root).toHaveAttribute('data-preset', 'dodge-soft');

    fireEvent.click(screen.getByTestId('brush-preset-detail-pen'));
    expect(onChange).toHaveBeenLastCalledWith({ sizePx: 8, hardnessPct: 100, flowPct: 90 });
    expect(root).toHaveAttribute('data-preset', 'detail-pen');
    expect(screen.getByTestId('brush-hud-readout')).toHaveTextContent('8px · 100% hard · 90% flow');
  });

  it('handles IME-safe keyboard shortcuts ([ / ] size ±10px, { / } hardness ±10%), ignores modifiers/IME, and composes caller onKeyDown', () => {
    const onChange = vi.fn<(value: BrushHudValue) => void>();
    const callerKeyDown = vi.fn<(e: KeyboardEvent<HTMLDivElement>) => void>();

    render(
      <BrushHudControl
        defaultValue={{ sizePx: 25, hardnessPct: 15, flowPct: 60 }}
        minSizePx={10}
        maxSizePx={40}
        onChange={onChange}
        onKeyDown={callerKeyDown}
        tabIndex={-1}
        data-testid="hud"
      />
    );

    const root = screen.getByTestId('hud');
    expect(root).toHaveAttribute('tabindex', '-1');

    // IME composing, modifier keys, and unrelated keys ignored
    fireEvent.keyDown(root, { key: '[', isComposing: true });
    fireEvent.keyDown(root, { key: ']', ctrlKey: true });
    fireEvent.keyDown(root, { key: '{', metaKey: true });
    fireEvent.keyDown(root, { key: '}', altKey: true });
    fireEvent.keyDown(root, { key: 'x' });
    expect(onChange).not.toHaveBeenCalled();
    expect(callerKeyDown).toHaveBeenCalledTimes(5);

    // '[' decreases size by 10px (25 -> 15 -> clamped to 10)
    fireEvent.keyDown(root, { key: '[' });
    expect(onChange).toHaveBeenLastCalledWith({ sizePx: 15, hardnessPct: 15, flowPct: 60 });

    fireEvent.keyDown(root, { key: '[' });
    expect(onChange).toHaveBeenLastCalledWith({ sizePx: 10, hardnessPct: 15, flowPct: 60 });
    expect(screen.getByTestId('brush-size-decrease')).toBeDisabled();

    // At minSizePx, '[' emits no duplicate call
    const callsAtMin = onChange.mock.calls.length;
    fireEvent.keyDown(root, { key: '[' });
    expect(onChange).toHaveBeenCalledTimes(callsAtMin);

    // ']' increases size by 10px (10 -> 20 -> 30 -> 40)
    fireEvent.keyDown(root, { key: ']' });
    expect(onChange).toHaveBeenLastCalledWith({ sizePx: 20, hardnessPct: 15, flowPct: 60 });
    fireEvent.keyDown(root, { key: ']' });
    fireEvent.keyDown(root, { key: ']' });
    expect(onChange).toHaveBeenLastCalledWith({ sizePx: 40, hardnessPct: 15, flowPct: 60 });
    expect(screen.getByTestId('brush-size-increase')).toBeDisabled();

    // '{' decreases hardness by 10% (15 -> 5 -> 0)
    fireEvent.keyDown(root, { key: '{', shiftKey: true });
    expect(onChange).toHaveBeenLastCalledWith({ sizePx: 40, hardnessPct: 5, flowPct: 60 });
    fireEvent.keyDown(root, { key: '{', shiftKey: true });
    expect(onChange).toHaveBeenLastCalledWith({ sizePx: 40, hardnessPct: 0, flowPct: 60 });

    // '}' increases hardness by 10% (0 -> 10)
    fireEvent.keyDown(root, { key: '}', shiftKey: true });
    expect(onChange).toHaveBeenLastCalledWith({ sizePx: 40, hardnessPct: 10, flowPct: 60 });
  });

  it('respects caller onKeyDown preventDefault when composing keyboard handlers', () => {
    const onChange = vi.fn<(value: BrushHudValue) => void>();

    render(
      <BrushHudControl
        onChange={onChange}
        onKeyDown={(e) => e.preventDefault()}
        data-testid="hud"
      />
    );

    fireEvent.keyDown(screen.getByTestId('hud'), { key: ']' });
    expect(onChange).not.toHaveBeenCalled();
  });

  it('supports controlled mode where external value governs rendered state', () => {
    const onChangeSpy = vi.fn<(value: BrushHudValue) => void>();

    function ControlledHarness() {
      const [brush, setBrush] = useState<BrushHudValue>({
        sizePx: 32,
        hardnessPct: 50,
        flowPct: 75,
      });

      return (
        <BrushHudControl
          value={brush}
          onChange={(next) => {
            onChangeSpy(next);
            setBrush(next);
          }}
        />
      );
    }

    render(<ControlledHarness />);

    expect(screen.getByTestId('brush-hud-readout')).toHaveTextContent('32px · 50% hard · 75% flow');

    fireEvent.click(screen.getByTestId('brush-size-increase'));
    expect(onChangeSpy).toHaveBeenLastCalledWith({ sizePx: 33, hardnessPct: 50, flowPct: 75 });
    expect(screen.getByTestId('brush-hud-readout')).toHaveTextContent('33px · 50% hard · 75% flow');

    fireEvent.click(screen.getByTestId('brush-preset-hard-round'));
    expect(onChangeSpy).toHaveBeenLastCalledWith({ sizePx: 48, hardnessPct: 95, flowPct: 100 });
    expect(screen.getByTestId('brush-hud-readout')).toHaveTextContent('48px · 95% hard · 100% flow');
  });

  it('blocks all interactive controls, sliders, presets, and keyboard shortcuts when disabled', () => {
    const onChange = vi.fn<(value: BrushHudValue) => void>();

    render(<BrushHudControl disabled onChange={onChange} data-testid="hud" />);

    const root = screen.getByTestId('hud');
    expect(root).toHaveAttribute('data-disabled', 'true');
    expect(root).toHaveAttribute('aria-disabled', 'true');
    expect(root).toHaveAttribute('tabindex', '-1');

    const sizeSlider = screen.getByRole('slider', { name: 'Brush size in pixels' });
    const hardnessSlider = screen.getByRole('slider', { name: 'Brush hardness percentage' });
    const flowSlider = screen.getByRole('slider', { name: 'Brush flow percentage' });

    expect(sizeSlider).toBeDisabled();
    expect(hardnessSlider).toBeDisabled();
    expect(flowSlider).toBeDisabled();
    expect(screen.getByTestId('brush-size-decrease')).toBeDisabled();
    expect(screen.getByTestId('brush-size-increase')).toBeDisabled();
    expect(screen.getByTestId('brush-preset-airbrush')).toBeDisabled();

    // Synthetic events while disabled must not mutate or invoke onChange
    fireEvent.change(sizeSlider, { target: { value: '200' } });
    fireEvent.change(hardnessSlider, { target: { value: '90' } });
    fireEvent.change(flowSlider, { target: { value: '10' } });
    fireEvent.click(screen.getByTestId('brush-size-decrease'));
    fireEvent.click(screen.getByTestId('brush-size-increase'));
    fireEvent.click(screen.getByTestId('brush-preset-airbrush'));
    fireEvent.keyDown(root, { key: ']' });
    fireEvent.keyDown(root, { key: '}' });

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByTestId('brush-hud-readout')).toHaveTextContent('64px · 45% hard · 80% flow');
  });

  it('sanitizes adversarial NaN, Infinity, inverted bounds, degenerate equal bounds, and out-of-range values', () => {
    const onChange = vi.fn<(value: BrushHudValue) => void>();

    // Inverted bounds (min > max) & out-of-range default values
    const { rerender } = render(
      <BrushHudControl
        minSizePx={100}
        maxSizePx={20}
        defaultValue={{ sizePx: 999, hardnessPct: -40, flowPct: 0 }}
        onChange={onChange}
      />
    );

    expect(screen.getByTestId('brush-hud-readout')).toHaveTextContent('100px · 0% hard · 1% flow');
    // Presets are clamped into [20..100]
    fireEvent.click(screen.getByTestId('brush-preset-detail-pen'));
    expect(onChange).toHaveBeenLastCalledWith({ sizePx: 20, hardnessPct: 100, flowPct: 90 });

    // Non-finite bounds & values fall back safely
    rerender(
      <BrushHudControl
        minSizePx={Number.NaN}
        maxSizePx={Number.POSITIVE_INFINITY}
        value={{
          sizePx: Number.NaN,
          hardnessPct: Number.POSITIVE_INFINITY,
          flowPct: Number.NEGATIVE_INFINITY,
        }}
      />
    );
    expect(screen.getByTestId('brush-hud-readout')).toHaveTextContent('64px · 45% hard · 80% flow');

    // Degenerate span (minSizePx === maxSizePx) keeps valid preview radius & 100% bar fill
    rerender(
      <BrushHudControl
        minSizePx={50}
        maxSizePx={50}
        value={{ sizePx: 50, hardnessPct: 50, flowPct: 50 }}
      />
    );
    const dab = screen.getByTestId('brush-preview-dab');
    expect(Number(dab.getAttribute('r'))).toBeGreaterThan(5);
    expect(screen.getByTestId('brush-size-fill')).toHaveStyle({ width: '100%' });
    expect(screen.getByTestId('brush-size-decrease')).toBeDisabled();
    expect(screen.getByTestId('brush-size-increase')).toBeDisabled();

    // Verify BrushPresetMap extensible map keys align with BrushPresetId
    const presetCheck: Record<keyof BrushPresetMap, BrushPresetId> = {
      airbrush: 'airbrush',
      'hard-round': 'hard-round',
      'dodge-soft': 'dodge-soft',
      'detail-pen': 'detail-pen',
    };
    expect(Object.keys(presetCheck)).toHaveLength(4);
  });
});
