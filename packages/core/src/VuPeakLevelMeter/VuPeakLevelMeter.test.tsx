import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import {
  VuPeakLevelMeter,
  type MeterChannelReading,
  type MeterOrientationMap,
} from './index';

describe('VuPeakLevelMeter', () => {
  it('renders default stereo vertical meter with PrismThemeProvider overrides, xstyle, React 19 ref, and calibrated scale', () => {
    const ref = createRef<HTMLDivElement>();
    const orientationMap: MeterOrientationMap = {
      vertical: true,
      horizontal: true,
    };
    expect(Object.keys(orientationMap)).toEqual(['vertical', 'horizontal']);
    expect(VuPeakLevelMeter.displayName).toBe('VuPeakLevelMeter');

    render(
      <PrismThemeProvider
        theme={{
          components: {
            VuPeakLevelMeter: {
              className: 'theme-vu-meter',
              style: { letterSpacing: '0.2px' },
            },
          },
        }}
      >
        <VuPeakLevelMeter
          ref={ref}
          className="custom-vu-meter"
          xstyle={{ '--prism-blur-px': '20px' }}
          style={{ minWidth: '220px' }}
          data-testid="vu-root"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('vu-root');
    expect(ref.current).toBe(root);
    expect(root).toHaveClass(
      'refractor-vu-peak-level-meter',
      'prism-slab',
      'theme-vu-meter',
      'custom-vu-meter'
    );
    expect(root).toHaveAttribute('role', 'region');
    expect(root).toHaveAttribute('data-orientation', 'vertical');
    expect(root).not.toHaveAttribute('data-clipped');
    expect(root).not.toHaveAttribute('data-empty');
    expect(root).toHaveStyle({ letterSpacing: '0.2px', minWidth: '220px' });

    expect(screen.getByTestId('vu-meter-label')).toHaveTextContent('Master Output VU');

    // Default stereo meters L (-8.5) and R (-6.2)
    const leftMeter = screen.getByRole('meter', { name: 'L level' });
    const rightMeter = screen.getByRole('meter', { name: 'R level' });
    expect(leftMeter).toHaveClass('prism-well');
    expect(leftMeter).toHaveAttribute('aria-valuemin', '-60');
    expect(leftMeter).toHaveAttribute('aria-valuemax', '6');
    expect(leftMeter).toHaveAttribute('aria-valuenow', '-8.5');
    expect(leftMeter).toHaveAttribute('aria-valuetext', '-8.5 dBFS, peak -8.5 dBFS');
    expect(rightMeter).toHaveAttribute('aria-valuenow', '-6.2');
    expect(rightMeter).toHaveAttribute('aria-valuetext', '-6.2 dBFS, peak -6.2 dBFS');

    // 24 segments per channel by default
    expect(leftMeter.querySelectorAll('[data-zone]').length).toBe(24);
    expect(rightMeter.querySelectorAll('[data-zone]').length).toBe(24);

    // Calibrated dBFS reference scale (+6, 0, -6, -12, -24, -48, -60)
    const scale = screen.getByTestId('vu-scale');
    expect(scale).toHaveTextContent('+6');
    expect(scale).toHaveTextContent('0');
    expect(scale).toHaveTextContent('-6');
    expect(scale).toHaveTextContent('-12');
    expect(scale).toHaveTextContent('-24');
    expect(scale).toHaveTextContent('-48');
    expect(scale).toHaveTextContent('-60');
    expect(screen.getByTestId('vu-scale-tick-6').style.color).toBe('var(--prism-error-main)');
    expect(screen.getByTestId('vu-scale-tick-0').style.color).toBe('var(--prism-error-main)');
    expect(screen.getByTestId('vu-scale-tick--6').style.color).toBe('var(--prism-warning-main)');
    expect(screen.getByTestId('vu-scale-tick--12').style.color).toBe('var(--prism-warning-main)');
    expect(screen.getByTestId('vu-scale-tick--24').style.color).toBe('var(--prism-text-secondary)');

    // Tabular RMS / Peak dBFS readout (-7.2 RMS / -6.2 Peak)
    expect(screen.getByTestId('vu-dbfs-readout')).toHaveTextContent('RMS / Peak dBFS');
    expect(screen.getByTestId('vu-rms-value')).toHaveTextContent('-7.2');
    expect(screen.getByTestId('vu-peak-value')).toHaveTextContent('-6.2');

    // CLIP button in standby state
    const clipBtn = screen.getByTestId('vu-clip-button');
    expect(clipBtn).toHaveAttribute('aria-pressed', 'false');
    expect(clipBtn).toHaveClass('prism-crystal');
    expect(clipBtn).not.toHaveAttribute('data-clipped');
  });

  it('supports horizontal orientation seamlessly with zone-colored segments and calibrated scale', () => {
    const channels: MeterChannelReading[] = [
      { id: 'vox', label: 'VOX', levelDb: -18.0 },
      { id: 'gtr', label: 'GTR', levelDb: -6.0 },
      { id: 'kick', label: 'KCK', levelDb: 2.5 },
    ];

    render(
      <VuPeakLevelMeter
        label="Drum & Vocal Bus"
        orientation="horizontal"
        segments={24}
        channels={channels}
        data-testid="horiz-meter"
      />
    );

    const root = screen.getByTestId('horiz-meter');
    expect(root).toHaveAttribute('data-orientation', 'horizontal');
    expect(root).toHaveAttribute('data-clipped', 'true');

    const voxMeter = screen.getByRole('meter', { name: 'VOX level' });
    const gtrMeter = screen.getByRole('meter', { name: 'GTR level' });
    const kickMeter = screen.getByRole('meter', { name: 'KCK level' });
    expect(voxMeter).toHaveAttribute('data-orientation', 'horizontal');
    expect(gtrMeter).toHaveAttribute('data-orientation', 'horizontal');
    expect(kickMeter).toHaveAttribute('data-orientation', 'horizontal');
    expect(kickMeter).toHaveAttribute('data-clipped', 'true');

    // Verify green, amber, red, and unlit LED tokens
    const nominalSeg = screen.getByTestId('vu-segment-kick-0');
    expect(nominalSeg).toHaveAttribute('data-zone', 'nominal');
    expect(nominalSeg).toHaveAttribute('data-lit', 'true');
    expect(nominalSeg.style.backgroundColor).toBe('var(--prism-success-main)');

    const warnSeg = screen.getByTestId('vu-segment-kick-18');
    expect(warnSeg).toHaveAttribute('data-zone', 'warn');
    expect(warnSeg).toHaveAttribute('data-lit', 'true');
    expect(warnSeg.style.backgroundColor).toBe('var(--prism-warning-main)');

    const clipSeg = screen.getByTestId('vu-segment-kick-22');
    expect(clipSeg).toHaveAttribute('data-zone', 'clip');
    expect(clipSeg).toHaveAttribute('data-lit', 'true');
    expect(clipSeg.style.backgroundColor).toBe('var(--prism-error-main)');

    const unlitSeg = screen.getByTestId('vu-segment-vox-23');
    expect(unlitSeg).toHaveAttribute('data-lit', 'false');
    expect(unlitSeg.style.backgroundColor).toBe('var(--prism-divider)');

    // Horizontal scale renders left-to-right ticks
    const scale = screen.getByTestId('vu-scale');
    const tickLabels = Array.from(scale.querySelectorAll('span')).map((el) => el.textContent);
    expect(tickLabels).toEqual(['-60', '-48', '-24', '-12', '-6', '0', '+6']);

    // Per-channel readout colors red when live-clipping
    expect(screen.getByTestId('vu-channel-readout-kick')).toHaveTextContent('+2.5 dB');
    expect(screen.getByTestId('vu-channel-readout-kick').style.color).toBe('var(--prism-error-main)');
    expect(screen.getByTestId('vu-channel-readout-vox').style.color).toBe('var(--prism-text-secondary)');
  });

  it('tracks sticky per-channel peak-hold LEDs, latches CLIP on overload, and clears on CLIP or Reset Peak click', () => {
    const onClearClip = vi.fn();

    const { rerender } = render(
      <VuPeakLevelMeter
        channels={[
          { id: 'l', label: 'L', levelDb: -18.0 },
          { id: 'r', label: 'R', levelDb: -20.0 },
        ]}
        onClearClip={onClearClip}
        data-testid="latch-meter"
      />
    );

    const clipBtn = screen.getByTestId('vu-clip-button');
    expect(clipBtn).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByTestId('vu-peak-value')).toHaveTextContent('-18.0');

    // 1. Transient overload on L (+2.4 dB) and hot signal on R (-3.0 dB)
    rerender(
      <VuPeakLevelMeter
        channels={[
          { id: 'l', label: 'L', levelDb: 2.4 },
          { id: 'r', label: 'R', levelDb: -3.0 },
        ]}
        onClearClip={onClearClip}
        data-testid="latch-meter"
      />
    );

    expect(clipBtn).toHaveAttribute('aria-pressed', 'true');
    expect(clipBtn).toHaveAttribute('data-clipped', 'true');
    expect(clipBtn.style.backgroundColor).toBe('var(--prism-error-main)');
    expect(clipBtn.style.color).toBe('var(--prism-error-contrast)');
    expect(screen.getByTestId('vu-peak-value')).toHaveTextContent('+2.4');

    // 2. Signal drops back to nominal (-24 dB / -30 dB) -> sticky peak hold & CLIP stay latched!
    rerender(
      <VuPeakLevelMeter
        channels={[
          { id: 'l', label: 'L', levelDb: -24.0 },
          { id: 'r', label: 'R', levelDb: -30.0 },
        ]}
        onClearClip={onClearClip}
        data-testid="latch-meter"
      />
    );

    expect(clipBtn).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('vu-peak-value')).toHaveTextContent('+2.4');

    // Sticky peak-hold LED stays illuminated in the red clip zone even though live bar is in green
    const leftPeakHoldSeg = screen.getByTestId('vu-segment-l-22');
    expect(leftPeakHoldSeg).toHaveAttribute('data-lit', 'false');
    expect(leftPeakHoldSeg).toHaveAttribute('data-peak-hold', 'true');
    expect(leftPeakHoldSeg.style.backgroundColor).toBe('var(--prism-error-main)');

    const leftMeter = screen.getByRole('meter', { name: 'L level' });
    expect(leftMeter).toHaveAttribute('aria-valuetext', '-24.0 dBFS, peak +2.4 dBFS, clipping');

    // 3. Click CLIP button -> clears sticky peak-hold & clip alert, invokes onClearClip
    fireEvent.click(clipBtn);
    expect(onClearClip).toHaveBeenCalledTimes(1);
    expect(clipBtn).toHaveAttribute('aria-pressed', 'false');
    expect(clipBtn).not.toHaveAttribute('data-clipped');
    expect(screen.getByTestId('vu-peak-value')).toHaveTextContent('-24.0');
    expect(screen.getByTestId('vu-segment-l-22')).not.toHaveAttribute('data-peak-hold');
    expect(screen.getByTestId('vu-segment-l-22').style.backgroundColor).toBe('var(--prism-divider)');

    // 4. Second spike -> clear via Reset Peak button
    rerender(
      <VuPeakLevelMeter
        channels={[
          { id: 'l', label: 'L', levelDb: 0.0 },
          { id: 'r', label: 'R', levelDb: -12.0 },
        ]}
        onClearClip={onClearClip}
        data-testid="latch-meter"
      />
    );
    expect(screen.getByTestId('vu-peak-value')).toHaveTextContent('0.0');
    expect(clipBtn).toHaveAttribute('aria-pressed', 'true');

    rerender(
      <VuPeakLevelMeter
        channels={[
          { id: 'l', label: 'L', levelDb: -30.0 },
          { id: 'r', label: 'R', levelDb: -32.0 },
        ]}
        onClearClip={onClearClip}
        data-testid="latch-meter"
      />
    );
    expect(clipBtn).toHaveAttribute('aria-pressed', 'true');

    const resetBtn = screen.getByRole('button', { name: 'Reset Peak' });
    fireEvent.click(resetBtn);
    expect(onClearClip).toHaveBeenCalledTimes(2);
    expect(clipBtn).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByTestId('vu-peak-value')).toHaveTextContent('-30.0');
  });

  it('handles external peakDb readings, clearing stale prop peaks, and re-latching on new peaks', () => {
    const onClearClip = vi.fn();

    const { rerender } = render(
      <VuPeakLevelMeter
        channels={[{ id: 'bus', label: 'BUS', levelDb: -18.0, peakDb: 1.5 }]}
        onClearClip={onClearClip}
      />
    );

    const clipBtn = screen.getByTestId('vu-clip-button');
    expect(clipBtn).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('vu-peak-value')).toHaveTextContent('+1.5');

    // Click CLIP -> clears even while static peakDb prop remains 1.5
    fireEvent.click(clipBtn);
    expect(onClearClip).toHaveBeenCalledTimes(1);
    expect(clipBtn).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByTestId('vu-peak-value')).toHaveTextContent('-18.0');

    // Re-rendering with same stale peakDb stays cleared
    rerender(
      <VuPeakLevelMeter
        channels={[{ id: 'bus', label: 'BUS', levelDb: -18.0, peakDb: 1.5 }]}
        onClearClip={onClearClip}
      />
    );
    expect(clipBtn).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByTestId('vu-peak-value')).toHaveTextContent('-18.0');

    // New peakDb value re-latches immediately
    rerender(
      <VuPeakLevelMeter
        channels={[{ id: 'bus', label: 'BUS', levelDb: -16.0, peakDb: 3.2 }]}
        onClearClip={onClearClip}
      />
    );
    expect(clipBtn).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('vu-peak-value')).toHaveTextContent('+3.2');

    // Clearing and removing peakDb resets clearedPropPeakDb guard; peakDb below levelDb clamps up to levelDb
    fireEvent.click(clipBtn);
    rerender(
      <VuPeakLevelMeter
        channels={[{ id: 'bus', label: 'BUS', levelDb: -10.0, peakDb: -25.0 }]}
        onClearClip={onClearClip}
      />
    );
    expect(screen.getByTestId('vu-peak-value')).toHaveTextContent('-10.0');
  });

  it('respects controlled clipped prop override in both true and false states', () => {
    const onClearClip = vi.fn();

    const { rerender } = render(
      <VuPeakLevelMeter
        channels={[{ id: 'ch1', label: 'CH1', levelDb: -36.0 }]}
        clipped={true}
        onClearClip={onClearClip}
        data-testid="ctrl-meter"
      />
    );

    const root = screen.getByTestId('ctrl-meter');
    const clipBtn = screen.getByTestId('vu-clip-button');
    expect(root).toHaveAttribute('data-clipped', 'true');
    expect(clipBtn).toHaveAttribute('aria-pressed', 'true');
    expect(clipBtn.style.backgroundColor).toBe('var(--prism-error-main)');

    fireEvent.click(clipBtn);
    expect(onClearClip).toHaveBeenCalledTimes(1);

    // Controlled clipped=false overrides actively hot +4.5 dB channel
    rerender(
      <VuPeakLevelMeter
        channels={[{ id: 'ch1', label: 'CH1', levelDb: 4.5 }]}
        clipped={false}
        onClearClip={onClearClip}
        data-testid="ctrl-meter"
      />
    );
    expect(root).not.toHaveAttribute('data-clipped');
    expect(clipBtn).toHaveAttribute('aria-pressed', 'false');
  });

  it('guards Escape keyboard reset against IME composition (isComposing: true)', () => {
    const onClearClip = vi.fn();

    render(
      <VuPeakLevelMeter
        channels={[{ id: 'l', label: 'L', levelDb: -20.0, peakDb: 1.0 }]}
        onClearClip={onClearClip}
      />
    );

    const clipBtn = screen.getByTestId('vu-clip-button');
    expect(clipBtn).toHaveAttribute('aria-pressed', 'true');

    // Escape during IME composition must be ignored
    const imeEscape = new KeyboardEvent('keydown', {
      key: 'Escape',
      bubbles: true,
      cancelable: true,
    });
    Object.defineProperty(imeEscape, 'isComposing', { value: true });
    fireEvent(clipBtn, imeEscape);
    expect(imeEscape.defaultPrevented).toBe(false);
    expect(onClearClip).not.toHaveBeenCalled();
    expect(clipBtn).toHaveAttribute('aria-pressed', 'true');

    // Non-Escape key does not prevent default or clear clip
    const otherKey = new KeyboardEvent('keydown', {
      key: 'ArrowDown',
      bubbles: true,
      cancelable: true,
    });
    fireEvent(clipBtn, otherKey);
    expect(otherKey.defaultPrevented).toBe(false);
    expect(onClearClip).not.toHaveBeenCalled();

    // Normal Escape clears clip alert and peak hold
    const plainEscape = new KeyboardEvent('keydown', {
      key: 'Escape',
      bubbles: true,
      cancelable: true,
    });
    fireEvent(clipBtn, plainEscape);
    expect(plainEscape.defaultPrevented).toBe(true);
    expect(onClearClip).toHaveBeenCalledTimes(1);
    expect(clipBtn).toHaveAttribute('aria-pressed', 'false');
  });

  it('clamps segment counts into [10..40], handles -60 dB silence floor, and guards inverted thresholds', () => {
    const { rerender } = render(
      <VuPeakLevelMeter
        segments={4}
        channels={[{ id: 'sub', label: 'SUB', levelDb: -60 }]}
      />
    );

    const meter = screen.getByRole('meter', { name: 'SUB level' });
    expect(meter.querySelectorAll('[data-zone]').length).toBe(10);
    // At -60 dB silence floor, zero segments are lit and no peak-hold LED is active
    expect(meter.querySelectorAll('[data-lit="true"]').length).toBe(0);
    expect(meter.querySelectorAll('[data-peak-hold="true"]').length).toBe(0);

    // Above 40 clamps to 40; inverted thresholds (clip < warn) clamp clip up to warn
    rerender(
      <VuPeakLevelMeter
        segments={99}
        warnThresholdDb={-6}
        clipThresholdDb={-18}
        channels={[{ id: 'sub', label: 'SUB', levelDb: 6 }]}
      />
    );
    expect(meter.querySelectorAll('[data-zone]').length).toBe(40);
    expect(meter.querySelectorAll('[data-lit="true"]').length).toBe(40);
    expect(screen.getByTestId('vu-clip-button')).toHaveAttribute('aria-pressed', 'true');

    // Non-finite segments falls back to 24
    rerender(
      <VuPeakLevelMeter
        segments={Number.NaN}
        channels={[{ id: 'sub', label: 'SUB', levelDb: -10 }]}
      />
    );
    expect(meter.querySelectorAll('[data-zone]').length).toBe(24);
  });

  it('renders a clean role="status" empty state when channels is explicitly []', () => {
    const onClearClip = vi.fn();

    render(
      <VuPeakLevelMeter
        channels={[]}
        onClearClip={onClearClip}
        data-testid="empty-vu"
      />
    );

    const root = screen.getByTestId('empty-vu');
    expect(root).toHaveAttribute('data-empty', 'true');

    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-live', 'polite');
    expect(status).toHaveClass('prism-well');
    expect(status).toHaveTextContent(/No audio channels connected/i);

    expect(screen.queryByRole('meter')).toBeNull();
    expect(screen.queryByTestId('vu-reset-peak-button')).toBeNull();
    expect(screen.getByTestId('vu-rms-value')).toHaveTextContent('--');
    expect(screen.getByTestId('vu-peak-value')).toHaveTextContent('--');

    fireEvent.click(screen.getByTestId('vu-clip-button'));
    expect(onClearClip).toHaveBeenCalledTimes(1);
  });

  it('safely handles adversarial XSS payloads, prototype-polluting/duplicate IDs, blank labels, non-finite dB, and BaseProps passthrough', () => {
    const xssPayload = '<script>window.__xss=1</script><img src=x onerror=alert(1)>';
    const onKeyDown = vi.fn();

    render(
      <VuPeakLevelMeter
        label={xssPayload}
        aria-label="Custom VU Region"
        onKeyDown={onKeyDown}
        data-testid="adv-vu"
        channels={[
          { id: '__proto__', label: xssPayload, levelDb: Number.NaN, peakDb: Number.POSITIVE_INFINITY },
          { id: 'constructor', label: '   ', levelDb: Number.POSITIVE_INFINITY },
          { id: 'dup', label: 'A', levelDb: -999 },
          { id: 'dup', label: 'B', levelDb: 999 },
          { id: '   ', label: 'BlankId', levelDb: -12 },
        ]}
      />
    );

    const root = screen.getByTestId('adv-vu');
    expect(root).toHaveAttribute('aria-label', 'Custom VU Region');
    expect(root).not.toHaveAttribute('aria-labelledby');
    expect(screen.getByTestId('vu-meter-label')).toHaveTextContent(xssPayload);
    expect(document.querySelector('script')).toBeNull();

    // Prototype-polluting IDs render safely without throwing or polluting Object.prototype
    expect(screen.getByTestId('vu-channel-__proto__')).toBeInTheDocument();
    expect(screen.getByTestId('vu-channel-label-constructor')).toHaveTextContent('CH');
    expect(screen.getByRole('meter', { name: 'Channel level' })).toHaveAttribute('aria-valuenow', '-60');

    // Duplicate IDs deduplicate cleanly and clamp extreme dB into [-60..+6]
    expect(screen.getByTestId('vu-meter-dup')).toHaveAttribute('aria-valuenow', '-60');
    expect(screen.getByTestId('vu-meter-dup#2')).toHaveAttribute('aria-valuenow', '6');
    expect(screen.getByTestId('vu-meter-channel')).toHaveAttribute('aria-valuenow', '-12');

    // BaseProps onKeyDown passes through cleanly
    fireEvent.keyDown(root, { key: 'ArrowUp' });
    expect(onKeyDown).toHaveBeenCalledTimes(1);

    // Blank root label falls back cleanly to 'Master Output VU'
    render(<VuPeakLevelMeter label="   " data-testid="blank-label-vu" />);
    expect(
      screen.getByTestId('blank-label-vu').querySelector('[data-testid="vu-meter-label"]')
    ).toHaveTextContent('Master Output VU');
  });
});
