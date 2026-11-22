import { createRef } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import {
  DEFAULT_MOTION_CURVE_CONFIG,
  SPRING_EASING_PRESETS,
  SpringEasingPicker,
  type MotionCurveConfig,
  type MotionCurveModeMap,
  type SpringPresetKey,
} from './index';

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('SpringEasingPicker', () => {
  it('renders default spring physics config, optical tokens, SVG viewBox 280x180, ref, and theme overrides', () => {
    const ref = createRef<HTMLDivElement>();
    const modeCheck: MotionCurveModeMap = {
      spring: true,
      bezier: true,
    };
    expect(Object.keys(modeCheck)).toHaveLength(2);
    expect(SPRING_EASING_PRESETS).toHaveLength(4);
    expect(DEFAULT_MOTION_CURVE_CONFIG.mode).toBe('spring');

    render(
      <PrismThemeProvider
        theme={{
          components: {
            SpringEasingPicker: {
              className: 'theme-spring-picker',
              style: { maxWidth: '680px' },
            },
          },
        }}
      >
        <SpringEasingPicker
          ref={ref}
          className="local-spring-picker"
          xstyle={{ '--prism-blur-px': '20px' }}
          style={{ marginTop: '8px' }}
          data-testid="picker-root"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('picker-root');
    expect(ref.current).toBe(root);
    expect(SpringEasingPicker.displayName).toBe('SpringEasingPicker');
    expect(root).toHaveClass(
      'refractor-spring-easing-picker',
      'prism-slab',
      'theme-spring-picker',
      'local-spring-picker'
    );
    expect(root).toHaveStyle({ maxWidth: '680px', marginTop: '8px' });
    expect(root).toHaveAttribute('data-mode', 'spring');
    expect(root).toHaveAttribute('data-preset', 'custom');
    expect(root).toHaveAttribute('data-damping-regime', 'underdamped');
    expect(root).not.toHaveAttribute('data-disabled');
    expect(root).not.toHaveAttribute('data-playing');

    expect(screen.getByTestId('spring-easing-title')).toHaveTextContent(
      'Spring & Easing Curve Picker'
    );
    expect(screen.getByTestId('spring-easing-mode-spring')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('spring-easing-mode-bezier')).toHaveAttribute('aria-pressed', 'false');

    const codeSummary = screen.getByTestId('spring-easing-code-summary');
    expect(codeSummary).toHaveAttribute('aria-live', 'polite');
    expect(codeSummary).toHaveTextContent('spring(stiffness: 240, damping: 18, mass: 1)');

    expect(screen.getByTestId('spring-easing-damping-ratio')).toHaveTextContent('ζ = 0.58');
    expect(screen.getByTestId('spring-easing-regime-pill')).toHaveTextContent('Underdamped');
    expect(screen.getByTestId('spring-easing-settling-time').textContent).toMatch(/Settling ~\d+ms/);

    const svg = screen.getByTestId('spring-easing-svg');
    expect(svg).toHaveAttribute('viewBox', '0 0 280 180');
    expect(svg.innerHTML).not.toMatch(/#[0-9a-fA-F]{3,8}/);
    expect(svg.innerHTML).not.toMatch(/\b(?:rgba?|hsla?)\s*\(/);
    expect(svg.innerHTML).not.toContain('NaN');
    expect(svg.innerHTML).not.toContain('Infinity');
    expect(screen.queryByTestId('spring-easing-bezier-handles')).not.toBeInTheDocument();

    const curvePath = screen.getByTestId('spring-easing-curve-path');
    expect(curvePath).toHaveAttribute('stroke', 'var(--prism-primary-main)');
    expect(curvePath.getAttribute('d')).toMatch(/^M \d+(?:\.\d+)?,\d+(?:\.\d+)?(?: L \d+(?:\.\d+)?,\d+(?:\.\d+)?){64}$/);
  });

  it('switches modes and applies all 4 presets across underdamped, critically damped, and overdamped regimes', () => {
    const onChange = vi.fn<(config: MotionCurveConfig) => void>();
    render(<SpringEasingPicker onChange={onChange} data-testid="presets-root" />);

    const expectedSpringPresets: ReadonlyArray<{
      key: SpringPresetKey;
      regime: string;
      regimeLabel: string;
      summary: string;
    }> = [
      {
        key: 'snappy',
        regime: 'underdamped',
        regimeLabel: 'Underdamped',
        summary: 'spring(stiffness: 380, damping: 28, mass: 0.8)',
      },
      {
        key: 'gentle',
        regime: 'critically-damped',
        regimeLabel: 'Critically Damped',
        summary: 'spring(stiffness: 100, damping: 20, mass: 1)',
      },
      {
        key: 'bouncy',
        regime: 'underdamped',
        regimeLabel: 'Underdamped',
        summary: 'spring(stiffness: 300, damping: 10, mass: 1)',
      },
      {
        key: 'stiff',
        regime: 'overdamped',
        regimeLabel: 'Overdamped',
        summary: 'spring(stiffness: 520, damping: 48, mass: 1)',
      },
    ];

    for (const preset of expectedSpringPresets) {
      const btn = screen.getByTestId(`spring-easing-preset-${preset.key}`);
      fireEvent.click(btn);
      expect(btn).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByTestId('presets-root')).toHaveAttribute('data-preset', preset.key);
      expect(screen.getByTestId('presets-root')).toHaveAttribute('data-damping-regime', preset.regime);
      expect(screen.getByTestId('spring-easing-regime-pill')).toHaveTextContent(preset.regimeLabel);
      expect(screen.getByTestId('spring-easing-code-summary')).toHaveTextContent(preset.summary);
    }

    // Clicking already-active spring mode button is a clean no-op
    const callsBeforeNoop = onChange.mock.calls.length;
    fireEvent.click(screen.getByTestId('spring-easing-mode-spring'));
    expect(onChange).toHaveBeenCalledTimes(callsBeforeNoop);

    // Switch to Cubic Bezier mode
    fireEvent.click(screen.getByTestId('spring-easing-mode-bezier'));
    expect(screen.getByTestId('presets-root')).toHaveAttribute('data-mode', 'bezier');
    expect(screen.getByTestId('presets-root')).not.toHaveAttribute('data-damping-regime');
    expect(screen.getByTestId('spring-easing-mode-bezier')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('spring-easing-bezier-handles')).toBeInTheDocument();
    expect(screen.getByTestId('spring-easing-code-summary')).toHaveTextContent(
      'cubic-bezier(0.16, 1.00, 0.30, 1.00)'
    );

    // Apply all 4 presets in bezier mode
    const expectedBezierPresets: ReadonlyArray<{
      key: SpringPresetKey;
      summary: string;
      duration: string;
    }> = [
      { key: 'snappy', summary: 'cubic-bezier(0.20, 0.95, 0.30, 1.00)', duration: '360ms' },
      { key: 'gentle', summary: 'cubic-bezier(0.25, 0.10, 0.25, 1.00)', duration: '750ms' },
      { key: 'bouncy', summary: 'cubic-bezier(0.34, 1.45, 0.64, 1.00)', duration: '850ms' },
      { key: 'stiff', summary: 'cubic-bezier(0.16, 1.00, 0.30, 1.00)', duration: '280ms' },
    ];

    for (const preset of expectedBezierPresets) {
      fireEvent.click(screen.getByTestId(`spring-easing-preset-${preset.key}`));
      expect(screen.getByTestId(`spring-easing-preset-${preset.key}`)).toHaveAttribute(
        'aria-pressed',
        'true'
      );
      expect(screen.getByTestId('presets-root')).toHaveAttribute('data-preset', preset.key);
      expect(screen.getByTestId('spring-easing-code-summary')).toHaveTextContent(preset.summary);
      expect(screen.getByTestId('spring-easing-duration-pill')).toHaveTextContent(preset.duration);
    }

    // Switch back to spring mode
    fireEvent.click(screen.getByTestId('spring-easing-mode-spring'));
    expect(screen.getByTestId('presets-root')).toHaveAttribute('data-mode', 'spring');
  });

  it('updates spring and bezier parameter sliders via pointer changes and IME-safe Home/End keyboard jumps', () => {
    const onChange = vi.fn<(config: MotionCurveConfig) => void>();
    render(<SpringEasingPicker onChange={onChange} data-testid="slider-root" />);

    const stiffness = screen.getByTestId('spring-easing-slider-stiffness');
    const damping = screen.getByTestId('spring-easing-slider-damping');
    const mass = screen.getByTestId('spring-easing-slider-mass');

    fireEvent.change(stiffness, { target: { value: '400' } });
    fireEvent.change(damping, { target: { value: '40' } });
    fireEvent.change(mass, { target: { value: '1.5' } });

    expect(screen.getByTestId('spring-easing-code-summary')).toHaveTextContent(
      'spring(stiffness: 400, damping: 40, mass: 1.5)'
    );
    expect(screen.getByTestId('spring-easing-slider-stiffness-value')).toHaveTextContent('400');
    expect(screen.getByTestId('spring-easing-slider-damping-value')).toHaveTextContent('40');
    expect(screen.getByTestId('spring-easing-slider-mass-value')).toHaveTextContent('1.5');

    // Home/End keyboard jumps and IME composition guard on parameter slider
    fireEvent.keyDown(stiffness, { key: 'Home' });
    expect(screen.getByTestId('spring-easing-slider-stiffness-value')).toHaveTextContent('40');
    fireEvent.keyDown(stiffness, { key: 'End' });
    expect(screen.getByTestId('spring-easing-slider-stiffness-value')).toHaveTextContent('600');

    const callsBeforeIgnored = onChange.mock.calls.length;
    fireEvent.keyDown(stiffness, { key: 'Escape' });
    const imeSliderEvent = new KeyboardEvent('keydown', { key: 'Home', bubbles: true });
    Object.defineProperty(imeSliderEvent, 'isComposing', { value: true });
    stiffness.dispatchEvent(imeSliderEvent);
    expect(onChange).toHaveBeenCalledTimes(callsBeforeIgnored);

    // Switch to bezier mode and test all 5 bezier sliders
    fireEvent.click(screen.getByTestId('spring-easing-mode-bezier'));
    fireEvent.change(screen.getByTestId('spring-easing-slider-x1'), { target: { value: '0.15' } });
    fireEvent.change(screen.getByTestId('spring-easing-slider-y1'), { target: { value: '1.25' } });
    fireEvent.change(screen.getByTestId('spring-easing-slider-x2'), { target: { value: '0.85' } });
    fireEvent.change(screen.getByTestId('spring-easing-slider-y2'), { target: { value: '-0.2' } });
    fireEvent.change(screen.getByTestId('spring-easing-slider-duration'), {
      target: { value: '900' },
    });

    expect(screen.getByTestId('spring-easing-code-summary')).toHaveTextContent(
      'cubic-bezier(0.15, 1.25, 0.85, -0.20)'
    );
    expect(screen.getByTestId('spring-easing-duration-pill')).toHaveTextContent('900ms');
    expect(screen.getByTestId('slider-root')).toHaveAttribute('data-preset', 'custom');

    // Scrub across bezier curve at 0%, 25%, 50%, 75%, 100%
    const scrubber = screen.getByTestId('spring-easing-scrubber');
    for (const pct of [0, 25, 50, 75, 100]) {
      fireEvent.change(scrubber, { target: { value: String(pct) } });
      expect(screen.getByTestId('spring-easing-progress-readout').textContent).toContain(
        `t=${pct}%`
      );
    }
    expect(screen.getByTestId('spring-easing-animated-dot')).toHaveAttribute(
      'data-motion-value',
      '1.000'
    );
  });

  it('drives deterministic requestAnimationFrame playback, pause, resume, scrub, keyboard controls, and cleans up on unmount', () => {
    vi.useFakeTimers();
    const cancelSpy = vi.spyOn(window, 'cancelAnimationFrame');

    const { unmount } = render(
      <SpringEasingPicker
        defaultValue={{
          mode: 'bezier',
          spring: { stiffness: 300, damping: 10, mass: 1 },
          bezier: [0.34, 1.45, 0.64, 1],
          durationMs: 400,
        }}
        data-testid="play-root"
      />
    );

    const playBtn = screen.getByTestId('spring-easing-play-button');
    const resetBtn = screen.getByTestId('spring-easing-reset-button');
    const scrubber = screen.getByTestId('spring-easing-scrubber');

    expect(playBtn).toHaveTextContent('Play Preview');
    expect(playBtn).toHaveAttribute('aria-pressed', 'false');

    // Start playback
    fireEvent.click(playBtn);
    expect(playBtn).toHaveTextContent('Pause');
    expect(playBtn).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('play-root')).toHaveAttribute('data-playing', 'true');

    // Advance halfway (~200ms of 400ms)
    act(() => {
      vi.advanceTimersByTime(200);
    });
    const midProgress = Number(scrubber.getAttribute('value'));
    expect(midProgress).toBeGreaterThan(20);
    expect(midProgress).toBeLessThan(95);

    // Pause mid-way -> cancels rAF cleanly
    const cancelsBeforePause = cancelSpy.mock.calls.length;
    fireEvent.click(playBtn);
    expect(playBtn).toHaveTextContent('Play Preview');
    expect(cancelSpy.mock.calls.length).toBeGreaterThan(cancelsBeforePause);

    // Resume from paused progress and run through completion -> auto-stops at 100%
    fireEvent.click(playBtn);
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(scrubber).toHaveAttribute('value', '100');
    expect(playBtn).toHaveTextContent('Play Preview');
    expect(screen.getByTestId('play-root')).not.toHaveAttribute('data-playing');

    // Clicking Play Preview when already at 100% restarts cleanly from 0%
    fireEvent.click(playBtn);
    expect(scrubber).toHaveAttribute('value', '0');
    expect(playBtn).toHaveTextContent('Pause');

    // Scrubbing while playing cancels playback and pins scrubbed progress
    fireEvent.change(scrubber, { target: { value: '45' } });
    expect(playBtn).toHaveTextContent('Play Preview');
    expect(scrubber).toHaveAttribute('value', '45');

    // Reset button returns progress to 0%
    fireEvent.click(resetBtn);
    expect(scrubber).toHaveAttribute('value', '0');

    // Keyboard controls on scrubber: Enter starts play, Space pauses, End jumps to 100%, Home resets to 0%
    fireEvent.keyDown(scrubber, { key: 'Enter' });
    expect(playBtn).toHaveTextContent('Pause');
    fireEvent.keyDown(scrubber, { key: ' ' });
    expect(playBtn).toHaveTextContent('Play Preview');
    fireEvent.keyDown(scrubber, { key: 'End' });
    expect(scrubber).toHaveAttribute('value', '100');
    fireEvent.keyDown(scrubber, { key: 'Home' });
    expect(scrubber).toHaveAttribute('value', '0');

    // Unrelated key and IME composing event on scrubber are ignored
    fireEvent.keyDown(scrubber, { key: 'Escape' });
    const imeScrubEvent = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true });
    Object.defineProperty(imeScrubEvent, 'isComposing', { value: true });
    scrubber.dispatchEvent(imeScrubEvent);
    expect(playBtn).toHaveTextContent('Play Preview');

    // Start playback and unmount mid-flight -> cancels active rAF cleanly
    fireEvent.click(playBtn);
    const cancelsBeforeUnmount = cancelSpy.mock.calls.length;
    unmount();
    expect(cancelSpy.mock.calls.length).toBeGreaterThan(cancelsBeforeUnmount);
  });

  it('copies the live code summary cleanly across resolved, rejected, rapid re-click, and unmount cleanup paths', async () => {
    vi.useFakeTimers();

    const writeText = vi.fn<(text: string) => Promise<void>>().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });

    const { unmount } = render(<SpringEasingPicker />);
    const copyBtn = screen.getByTestId('spring-easing-copy-button');

    await act(async () => {
      fireEvent.click(copyBtn);
    });
    expect(writeText).toHaveBeenCalledWith('spring(stiffness: 240, damping: 18, mass: 1)');
    expect(copyBtn).toHaveTextContent('Copied');

    // Rapid second click replaces timer cleanly
    await act(async () => {
      fireEvent.click(copyBtn);
    });
    expect(copyBtn).toHaveTextContent('Copied');

    // Timer expires after 1500ms
    act(() => {
      vi.advanceTimersByTime(1500);
    });
    expect(copyBtn).toHaveTextContent('Copy');

    // Rejected clipboard write is caught without throwing
    writeText.mockRejectedValueOnce(new Error('Clipboard blocked'));
    await act(async () => {
      fireEvent.click(copyBtn);
    });
    expect(copyBtn).toHaveTextContent('Copied');

    // Missing navigator.clipboard still completes safely without throwing
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: undefined,
    });
    await act(async () => {
      fireEvent.click(copyBtn);
    });
    expect(copyBtn).toHaveTextContent('Copied');

    // Unmount with pending copy reset timer cleans up timer safely
    unmount();
  });

  it('supports controlled mode and enforces disabled guards across all interactions including mid-playback disable', () => {
    vi.useFakeTimers();
    const onChange = vi.fn<(config: MotionCurveConfig) => void>();
    const controlled: MotionCurveConfig = {
      mode: 'spring',
      spring: { stiffness: 200, damping: 20, mass: 1 },
      bezier: [0.22, 1, 0.36, 1],
      durationMs: 500,
    };

    const { rerender } = render(
      <SpringEasingPicker value={controlled} onChange={onChange} data-testid="ctrl-root" />
    );

    // Controlled preset click fires onChange without mutating rendered readout until parent updates value
    fireEvent.click(screen.getByTestId('spring-easing-preset-bouncy'));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'spring',
        spring: { stiffness: 300, damping: 10, mass: 1 },
      })
    );
    expect(screen.getByTestId('spring-easing-code-summary')).toHaveTextContent(
      'spring(stiffness: 200, damping: 20, mass: 1)'
    );

    // Start playback then disable mid-flight -> playback halts cleanly
    fireEvent.click(screen.getByTestId('spring-easing-play-button'));
    expect(screen.getByTestId('ctrl-root')).toHaveAttribute('data-playing', 'true');

    rerender(
      <SpringEasingPicker
        value={controlled}
        disabled
        onChange={onChange}
        data-testid="ctrl-root"
      />
    );

    expect(screen.getByTestId('ctrl-root')).toHaveAttribute('data-disabled', 'true');
    expect(screen.getByTestId('ctrl-root')).not.toHaveAttribute('data-playing');
    expect(screen.getByTestId('spring-easing-mode-spring')).toBeDisabled();
    expect(screen.getByTestId('spring-easing-mode-bezier')).toBeDisabled();
    expect(screen.getByTestId('spring-easing-preset-snappy')).toBeDisabled();
    expect(screen.getByTestId('spring-easing-play-button')).toBeDisabled();
    expect(screen.getByTestId('spring-easing-reset-button')).toBeDisabled();
    expect(screen.getByTestId('spring-easing-scrubber')).toBeDisabled();
    expect(screen.getByTestId('spring-easing-copy-button')).toBeDisabled();

    // Synthetic events while disabled are strictly ignored
    const callsWhileDisabled = onChange.mock.calls.length;
    fireEvent.click(screen.getByTestId('spring-easing-mode-bezier'));
    fireEvent.click(screen.getByTestId('spring-easing-preset-stiff'));
    fireEvent.change(screen.getByTestId('spring-easing-slider-stiffness'), {
      target: { value: '500' },
    });
    fireEvent.keyDown(screen.getByTestId('spring-easing-slider-stiffness'), { key: 'End' });
    fireEvent.click(screen.getByTestId('spring-easing-play-button'));
    fireEvent.click(screen.getByTestId('spring-easing-reset-button'));
    fireEvent.change(screen.getByTestId('spring-easing-scrubber'), { target: { value: '70' } });
    fireEvent.keyDown(screen.getByTestId('spring-easing-scrubber'), { key: 'Enter' });
    fireEvent.click(screen.getByTestId('spring-easing-copy-button'));

    expect(onChange).toHaveBeenCalledTimes(callsWhileDisabled);
    expect(screen.getByTestId('spring-easing-copy-button')).toHaveTextContent('Copy');
  });

  it('sanitizes NaN/Infinity/out-of-range values, negative zero, and XSS title payloads without corrupting SVG output', () => {
    const xssTitle = '<script>window.__springXss=1</script><img src=x onerror=alert(1)>';
    const adversarialConfig: MotionCurveConfig = {
      mode: 'spring',
      spring: {
        stiffness: Number.NaN,
        damping: Number.POSITIVE_INFINITY,
        mass: -5,
      },
      bezier: [Number.NaN, 9.9, -4, Number.NEGATIVE_INFINITY],
      durationMs: 99999,
    };

    render(<SpringEasingPicker title={xssTitle} defaultValue={adversarialConfig} />);

    expect(document.querySelector('script')).toBeNull();
    expect(document.querySelector('img')).toBeNull();
    expect(screen.getByRole('heading', { name: xssTitle })).toBeInTheDocument();

    // Spring stiffness falls back to 240, damping falls back to 18, mass clamps to 0.5
    expect(screen.getByTestId('spring-easing-code-summary')).toHaveTextContent(
      'spring(stiffness: 240, damping: 18, mass: 0.5)'
    );

    const svg = screen.getByTestId('spring-easing-svg');
    expect(svg.innerHTML).not.toContain('NaN');
    expect(svg.innerHTML).not.toContain('Infinity');

    // Switch to bezier mode: x1=0.22 (NaN fallback), y1=1.50 (clamped), x2=0.00 (clamped), y2=1.00 (-Inf fallback), duration=2000ms
    fireEvent.click(screen.getByTestId('spring-easing-mode-bezier'));
    expect(screen.getByTestId('spring-easing-code-summary')).toHaveTextContent(
      'cubic-bezier(0.22, 1.50, 0.00, 1.00)'
    );
    expect(screen.getByTestId('spring-easing-duration-pill')).toHaveTextContent('2000ms');
    expect(svg.innerHTML).not.toContain('NaN');
    expect(svg.innerHTML).not.toContain('Infinity');
  });
});
