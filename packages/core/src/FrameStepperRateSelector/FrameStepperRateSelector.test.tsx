import { createRef, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import { FrameStepperRateSelector } from './index';

describe('FrameStepperRateSelector', () => {
  it('renders optical prism-slab bar with stepper cluster, prism-well readout, crystal rate pills, theme overrides, and ref', () => {
    const ref = createRef<HTMLDivElement>();
    const onFrameChange = vi.fn<(frame: number) => void>();
    const onRateChange = vi.fn<(rate: number) => void>();

    render(
      <PrismThemeProvider
        theme={{
          components: {
            FrameStepperRateSelector: {
              className: 'theme-transport-bar',
              style: { maxWidth: '720px' },
            },
          },
        }}
      >
        <FrameStepperRateSelector
          ref={ref}
          onFrameChange={onFrameChange}
          onRateChange={onRateChange}
          className="local-transport-bar"
          xstyle={{ '--prism-blur-px': '20px' }}
          data-testid="transport-root"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('transport-root');
    expect(FrameStepperRateSelector.displayName).toBe('FrameStepperRateSelector');
    expect(ref.current).toBe(root);
    expect(root).toHaveClass(
      'refractor-frame-stepper-rate-selector',
      'prism-slab',
      'flex-wrap',
      'max-w-full',
      'theme-transport-bar',
      'local-transport-bar'
    );
    expect(root).toHaveStyle({ maxWidth: '720px' });
    expect(root).toHaveAttribute('data-at-start', 'true');
    expect(root).not.toHaveAttribute('data-at-end');
    expect(root).toHaveAttribute('data-rate', '1');

    const stepperGroup = screen.getByRole('group', { name: 'Frame stepper' });
    const rateGroup = screen.getByRole('group', { name: 'Playback rate' });
    expect(rateGroup).toHaveClass('prism-crystal');

    const backJumpBtn = within(stepperGroup).getByRole('button', { name: /-10f/ });
    const backOneBtn = within(stepperGroup).getByRole('button', { name: /-1f/ });
    const fwdOneBtn = within(stepperGroup).getByRole('button', { name: /\+1f/ });
    const fwdJumpBtn = within(stepperGroup).getByRole('button', { name: /\+10f/ });
    const readout = within(stepperGroup).getByRole('spinbutton', { name: 'Current frame' });

    expect(backJumpBtn).toBeDisabled();
    expect(backOneBtn).toBeDisabled();
    expect(fwdOneBtn).toBeEnabled();
    expect(fwdJumpBtn).toBeEnabled();
    expect(readout).toHaveClass('prism-well', 'tabular-nums');
    expect(readout).toHaveTextContent('F 0000 / 1800 · 00:00.00');
    expect(readout).toHaveAttribute('tabindex', '0');

    const expectedRates = ['0.25×', '0.5×', '1×', '1.5×', '2×'];
    for (const label of expectedRates) {
      const btn = within(rateGroup).getByRole('button', { name: label });
      if (label === '1×') {
        expect(btn).toHaveAttribute('aria-pressed', 'true');
        expect(btn).toHaveClass('prism-btn-primary');
      } else {
        expect(btn).toHaveAttribute('aria-pressed', 'false');
        expect(btn).not.toHaveClass('prism-btn-primary');
      }
    }
  });

  it('formats F 0042 / 1800 · 00:01.40 readout, steps accurately, clamps boundaries, and disables end buttons', () => {
    const onFrameChange = vi.fn<(frame: number) => void>();

    render(
      <FrameStepperRateSelector
        defaultFrame={42}
        totalFrames={1800}
        fps={30}
        jumpStep={10}
        onFrameChange={onFrameChange}
        data-testid="stepper-bar"
      />
    );

    const root = screen.getByTestId('stepper-bar');
    const readout = screen.getByRole('spinbutton', { name: 'Current frame' });
    const backJumpBtn = screen.getByRole('button', { name: /-10f/ });
    const backOneBtn = screen.getByRole('button', { name: /-1f/ });
    const fwdOneBtn = screen.getByRole('button', { name: /\+1f/ });
    const fwdJumpBtn = screen.getByRole('button', { name: /\+10f/ });

    expect(readout).toHaveTextContent('F 0042 / 1800 · 00:01.40');
    expect(readout).toHaveAttribute('aria-valuenow', '42');
    expect(readout).toHaveAttribute('aria-valuemin', '0');
    expect(readout).toHaveAttribute('aria-valuemax', '1800');
    expect(readout).toHaveAttribute('aria-valuetext', 'Frame 42 of 1800, 00:01.40 at 30 fps');

    fireEvent.click(fwdOneBtn);
    expect(onFrameChange).toHaveBeenLastCalledWith(43);
    expect(readout).toHaveTextContent('F 0043 / 1800 · 00:01.43');

    fireEvent.click(backOneBtn);
    expect(onFrameChange).toHaveBeenLastCalledWith(42);

    fireEvent.click(fwdJumpBtn);
    expect(onFrameChange).toHaveBeenLastCalledWith(52);
    expect(readout).toHaveTextContent('F 0052 / 1800 · 00:01.73');

    fireEvent.click(backJumpBtn);
    expect(onFrameChange).toHaveBeenLastCalledWith(42);

    // Jump past frame 0 clamps cleanly to 0 and disables backward controls
    for (let i = 0; i < 5; i += 1) {
      if (!backJumpBtn.hasAttribute('disabled')) {
        fireEvent.click(backJumpBtn);
      }
    }
    expect(onFrameChange).toHaveBeenLastCalledWith(0);
    expect(readout).toHaveTextContent('F 0000 / 1800 · 00:00.00');
    expect(backJumpBtn).toBeDisabled();
    expect(backOneBtn).toBeDisabled();
    expect(root).toHaveAttribute('data-at-start', 'true');
  });

  it('clamps upper boundary on +jumpStep and expands padding width for large totalFrames', () => {
    const onFrameChange = vi.fn<(frame: number) => void>();

    render(
      <FrameStepperRateSelector
        defaultFrame={11995}
        totalFrames={12000}
        fps={24}
        jumpStep={24}
        onFrameChange={onFrameChange}
        data-testid="large-bar"
      />
    );

    const root = screen.getByTestId('large-bar');
    const readout = screen.getByRole('spinbutton', { name: 'Current frame' });
    const fwdOneBtn = screen.getByRole('button', { name: /\+1f/ });
    const fwdJumpBtn = screen.getByRole('button', { name: /\+24f/ });

    expect(readout).toHaveTextContent('F 11995 / 12000 · 08:19.79');

    fireEvent.click(fwdJumpBtn);
    expect(onFrameChange).toHaveBeenLastCalledWith(12000);
    expect(readout).toHaveTextContent('F 12000 / 12000 · 08:20.00');
    expect(fwdOneBtn).toBeDisabled();
    expect(fwdJumpBtn).toBeDisabled();
    expect(root).toHaveAttribute('data-at-end', 'true');
  });

  it('supports ArrowLeft, ArrowRight, Shift+Arrow, Home, End keyboard controls on readout and guards IME composition', () => {
    const onFrameChange = vi.fn<(frame: number) => void>();

    render(
      <FrameStepperRateSelector
        defaultFrame={50}
        totalFrames={200}
        fps={25}
        jumpStep={15}
        onFrameChange={onFrameChange}
      />
    );

    const readout = screen.getByRole('spinbutton', { name: 'Current frame' });
    readout.focus();

    // ArrowRight (+1)
    fireEvent.keyDown(readout, { key: 'ArrowRight' });
    expect(onFrameChange).toHaveBeenLastCalledWith(51);
    expect(readout).toHaveAttribute('aria-valuenow', '51');

    // ArrowLeft (-1)
    fireEvent.keyDown(readout, { key: 'ArrowLeft' });
    expect(onFrameChange).toHaveBeenLastCalledWith(50);

    // Shift+ArrowRight (+15)
    fireEvent.keyDown(readout, { key: 'ArrowRight', shiftKey: true });
    expect(onFrameChange).toHaveBeenLastCalledWith(65);

    // Shift+ArrowLeft (-15)
    fireEvent.keyDown(readout, { key: 'ArrowLeft', shiftKey: true });
    expect(onFrameChange).toHaveBeenLastCalledWith(50);

    // End -> totalFrames (200)
    fireEvent.keyDown(readout, { key: 'End' });
    expect(onFrameChange).toHaveBeenLastCalledWith(200);
    expect(readout).toHaveTextContent('F 0200 / 200 · 00:08.00');

    // ArrowRight at upper bound must not emit duplicate callback
    const callsAtEnd = onFrameChange.mock.calls.length;
    fireEvent.keyDown(readout, { key: 'ArrowRight' });
    expect(onFrameChange).toHaveBeenCalledTimes(callsAtEnd);

    // Home -> 0
    fireEvent.keyDown(readout, { key: 'Home' });
    expect(onFrameChange).toHaveBeenLastCalledWith(0);

    // ArrowLeft at 0 must not emit duplicate callback
    const callsAtStart = onFrameChange.mock.calls.length;
    fireEvent.keyDown(readout, { key: 'ArrowLeft' });
    expect(onFrameChange).toHaveBeenCalledTimes(callsAtStart);

    // IME composing keydown MUST NOT step
    fireEvent.keyDown(readout, { key: 'ArrowRight', isComposing: true });
    expect(onFrameChange).toHaveBeenCalledTimes(callsAtStart);
    expect(readout).toHaveAttribute('aria-valuenow', '0');

    // Unrelated key is ignored cleanly
    fireEvent.keyDown(readout, { key: 'a' });
    expect(onFrameChange).toHaveBeenCalledTimes(callsAtStart);
  });

  it('switches playback rates with aria-pressed and prism-btn-primary, deduplicates custom rates, and falls back safely', () => {
    const onRateChange = vi.fn<(rate: number) => void>();

    const { rerender } = render(
      <FrameStepperRateSelector onRateChange={onRateChange} data-testid="rate-bar" />
    );

    const root = screen.getByTestId('rate-bar');
    const rateGroup = screen.getByRole('group', { name: 'Playback rate' });

    // Clicking already-active 1× is an idempotent no-op
    fireEvent.click(within(rateGroup).getByRole('button', { name: '1×' }));
    expect(onRateChange).not.toHaveBeenCalled();

    // Select 1.5×
    const rate15 = within(rateGroup).getByRole('button', { name: '1.5×' });
    fireEvent.click(rate15);
    expect(onRateChange).toHaveBeenCalledTimes(1);
    expect(onRateChange).toHaveBeenLastCalledWith(1.5);
    expect(rate15).toHaveAttribute('aria-pressed', 'true');
    expect(rate15).toHaveClass('prism-btn-primary');
    expect(within(rateGroup).getByRole('button', { name: '1×' })).toHaveAttribute(
      'aria-pressed',
      'false'
    );
    expect(root).toHaveAttribute('data-rate', '1.5');

    // Deduplicate positive finite custom rates; defaultRate=1 absent -> falls back to first rate (0.5)
    rerender(
      <FrameStepperRateSelector
        rates={[0.5, 2, 2, -1, 0, Number.NaN, Number.POSITIVE_INFINITY, 4]}
        onRateChange={onRateChange}
        data-testid="rate-bar"
      />
    );
    const customButtons = within(rateGroup).getAllByRole('button');
    expect(customButtons.map((btn) => btn.textContent)).toEqual(['0.5×', '2×', '4×']);
    expect(within(rateGroup).getByRole('button', { name: '0.5×' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );

    // Empty rates array falls back to default [0.25, 0.5, 1, 1.5, 2]
    rerender(<FrameStepperRateSelector rates={[]} onRateChange={onRateChange} />);
    expect(within(rateGroup).getAllByRole('button').map((btn) => btn.textContent)).toEqual([
      '0.25×',
      '0.5×',
      '1×',
      '1.5×',
      '2×',
    ]);
    // Uncontrolled state 1.5× is restored once 1.5 is present again
    expect(within(rateGroup).getByRole('button', { name: '1.5×' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
  });

  it('falls back to default rates and 1× on initial mount when rates are all invalid or defaultRate is unlisted', () => {
    render(
      <FrameStepperRateSelector
        rates={[0, -0.5, Number.NaN, Number.NEGATIVE_INFINITY]}
        defaultRate={99}
      />
    );
    const rateGroup = screen.getByRole('group', { name: 'Playback rate' });
    expect(within(rateGroup).getAllByRole('button').map((btn) => btn.textContent)).toEqual([
      '0.25×',
      '0.5×',
      '1×',
      '1.5×',
      '2×',
    ]);
    expect(within(rateGroup).getByRole('button', { name: '1×' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
  });

  it('supports controlled frame and rate state updates cleanly', () => {
    function ControlledTransportHarness() {
      const [frame, setFrame] = useState(10);
      const [rate, setRate] = useState(0.5);
      return (
        <FrameStepperRateSelector
          frame={frame}
          totalFrames={100}
          fps={20}
          jumpStep={5}
          onFrameChange={setFrame}
          rate={rate}
          onRateChange={setRate}
        />
      );
    }

    render(<ControlledTransportHarness />);

    const readout = screen.getByRole('spinbutton', { name: 'Current frame' });
    expect(readout).toHaveTextContent('F 0010 / 100 · 00:00.50');
    expect(screen.getByRole('button', { name: '0.5×' })).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(screen.getByRole('button', { name: /\+5f/ }));
    expect(readout).toHaveTextContent('F 0015 / 100 · 00:00.75');

    fireEvent.keyDown(readout, { key: 'ArrowLeft', shiftKey: true });
    expect(readout).toHaveTextContent('F 0010 / 100 · 00:00.50');

    fireEvent.click(screen.getByRole('button', { name: '2×' }));
    expect(screen.getByRole('button', { name: '2×' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: '0.5×' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('sanitizes out-of-range and non-finite totalFrames, fps, jumpStep, frame, and rate props (negative test)', () => {
    const { rerender } = render(
      <FrameStepperRateSelector
        frame={Number.NaN}
        defaultFrame={-20}
        totalFrames={0}
        fps={0}
        jumpStep={1}
        rate={Number.NaN}
        defaultRate={2}
      />
    );

    const readout = screen.getByRole('spinbutton', { name: 'Current frame' });
    expect(readout).toHaveTextContent('F 0000 / 1 · 00:00.00');
    expect(screen.getByRole('button', { name: /-2f/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /\+2f/ })).toBeEnabled();
    expect(screen.getByRole('button', { name: '2×' })).toHaveAttribute('aria-pressed', 'true');

    // Overflowing upper bounds clamp to fps=120 and jumpStep=120
    rerender(
      <FrameStepperRateSelector
        frame={60}
        totalFrames={Number.POSITIVE_INFINITY}
        fps={500}
        jumpStep={999}
        rate={42}
      />
    );
    expect(readout).toHaveTextContent('F 0060 / 1800 · 00:00.50');
    expect(screen.getByRole('button', { name: /-120f/ })).toBeEnabled();
    expect(screen.getByRole('button', { name: /\+120f/ })).toBeEnabled();
    expect(screen.getByRole('button', { name: '1×' })).toHaveAttribute('aria-pressed', 'true');

    // Non-finite fps and jumpStep fall back to defaults (30 fps, 10 jumpStep); fractional frame rounds cleanly
    rerender(
      <FrameStepperRateSelector
        frame={100}
        totalFrames={Number.NaN}
        fps={100.4}
        jumpStep={Number.NaN}
      />
    );
    // 100 / 100.4 = 0.99601...s -> rounds to 100 centiseconds -> rolls over cleanly to 00:01.00 (never 00:00.100)
    expect(readout).toHaveTextContent('F 0100 / 1800 · 00:01.00');
    expect(screen.getByRole('button', { name: /-10f/ })).toBeEnabled();

    rerender(
      <FrameStepperRateSelector frame={30} totalFrames={1800} fps={Number.NaN} jumpStep={10} />
    );
    expect(readout).toHaveTextContent('F 0030 / 1800 · 00:01.00');
  });

  it('blocks all button clicks and readout keyboard shortcuts when disabled is true (negative test)', () => {
    const onFrameChange = vi.fn<(frame: number) => void>();
    const onRateChange = vi.fn<(rate: number) => void>();

    render(
      <FrameStepperRateSelector
        defaultFrame={50}
        totalFrames={100}
        onFrameChange={onFrameChange}
        onRateChange={onRateChange}
        disabled
        data-testid="disabled-transport"
      />
    );

    const root = screen.getByTestId('disabled-transport');
    const readout = screen.getByRole('spinbutton', { name: 'Current frame' });

    expect(root).toHaveAttribute('data-disabled', 'true');
    expect(readout).toHaveAttribute('tabindex', '-1');
    expect(readout).toHaveAttribute('aria-disabled', 'true');

    for (const button of screen.getAllByRole('button')) {
      expect(button).toBeDisabled();
      fireEvent.click(button);
    }

    fireEvent.keyDown(readout, { key: 'ArrowLeft' });
    fireEvent.keyDown(readout, { key: 'ArrowRight' });
    fireEvent.keyDown(readout, { key: 'ArrowRight', shiftKey: true });
    fireEvent.keyDown(readout, { key: 'Home' });
    fireEvent.keyDown(readout, { key: 'End' });

    expect(onFrameChange).not.toHaveBeenCalled();
    expect(onRateChange).not.toHaveBeenCalled();
    expect(readout).toHaveTextContent('F 0050 / 100 · 00:01.67');
  });

  it('neutralizes adversarial XSS attributes and fractional/extreme inputs safely', () => {
    const payload = '<script>window.__frameXss=1</script><img src=x onerror=alert(1)>';

    render(
      <FrameStepperRateSelector
        defaultFrame={41.6}
        totalFrames={1800.2}
        fps={30}
        aria-label={payload}
        data-context={payload}
        data-testid="adversarial-transport"
      />
    );

    const root = screen.getByTestId('adversarial-transport');
    const readout = screen.getByRole('spinbutton', { name: 'Current frame' });

    expect(document.querySelector('script')).toBeNull();
    expect(document.querySelector('img')).toBeNull();
    expect(root).toHaveAttribute('aria-label', payload);
    expect(root).toHaveAttribute('data-context', payload);
    expect(readout).toHaveTextContent('F 0042 / 1800 · 00:01.40');
  });
});
