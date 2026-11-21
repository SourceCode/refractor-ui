import { createRef, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import { ColorPicker } from './ColorPicker';

describe('ColorPicker', () => {
  it('renders prism-slab studio card, spectrum, sliders, channels, WCAG contrast, presets, ref, and theme overrides', () => {
    const ref = createRef<HTMLDivElement>();

    render(
      <PrismThemeProvider
        theme={{
          components: {
            ColorPicker: {
              className: 'theme-color-picker',
              style: { letterSpacing: '0.15px' },
            },
          },
        }}
      >
        <ColorPicker
          ref={ref}
          label="Primary Refraction"
          className="local-color-picker"
          xstyle={{ '--prism-blur-px': '14px' }}
          data-testid="color-picker"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('color-picker');
    expect(ref.current).toBe(root);
    expect(root).toHaveClass(
      'refractor-color-picker',
      'prism-slab',
      'theme-color-picker',
      'local-color-picker'
    );
    expect(root).toHaveAttribute('data-show-alpha', 'true');
    expect(root).toHaveStyle({ letterSpacing: '0.15px' });

    expect(screen.getByText('Primary Refraction')).toBeInTheDocument();
    expect(screen.getByText('#E75C24 · 100%')).toBeInTheDocument();

    const spectrum = screen.getByRole('slider', { name: 'Primary Refraction saturation and brightness' });
    expect(spectrum).toHaveAttribute('tabindex', '0');
    expect(spectrum).toHaveAttribute('aria-valuemin', '0');
    expect(spectrum).toHaveAttribute('aria-valuemax', '100');

    expect(screen.getByLabelText('Hue')).toBeInTheDocument();
    expect(screen.getByLabelText('Opacity')).toHaveValue('100');
    expect(screen.getByLabelText('Hex color')).toHaveValue('#E75C24');
    expect(screen.getByLabelText('Red channel')).toHaveValue(231);
    expect(screen.getByLabelText('Green channel')).toHaveValue(92);
    expect(screen.getByLabelText('Blue channel')).toHaveValue(36);
    expect(screen.getByLabelText('Alpha percentage')).toHaveValue(100);

    // WCAG contrast readout against both #FFFFFF and #151E2C
    expect(screen.getByText('vs #FFFFFF')).toBeInTheDocument();
    expect(screen.getByText('vs #151E2C')).toBeInTheDocument();
    expect(screen.getByText('Aa')).toBeInTheDocument();

    // 8 default Refractor optical presets
    const presetButtons = screen.getAllByRole('button', { name: /^Select preset color /i });
    expect(presetButtons).toHaveLength(8);
    expect(screen.getByRole('button', { name: 'Select preset color #E75C24' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
  });

  it('supports showAlpha=false, custom deduplicated presets, empty presets, and fallback normalization', () => {
    const { rerender } = render(
      <ColorPicker
        label="Opaque Surface"
        defaultValue="not-valid-hex"
        defaultAlpha={Number.NaN}
        showAlpha={false}
        presets={['#38bdf8', '38BDF8', 'invalid', '#0f0']}
      />
    );

    expect(screen.getByText('#E75C24')).toBeInTheDocument();
    expect(screen.queryByLabelText('Opacity')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Alpha percentage')).not.toBeInTheDocument();

    const presetButtons = screen.getAllByRole('button', { name: /^Select preset color /i });
    expect(presetButtons).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Select preset color #38BDF8' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Select preset color #00FF00' })).toBeInTheDocument();

    rerender(<ColorPicker presets={[]} value="#000000" alpha={2.5} />);
    expect(screen.queryByRole('group', { name: 'Color presets' })).not.toBeInTheDocument();
    expect(screen.getByLabelText('Hex color')).toHaveValue('#000000');
    expect(screen.getByLabelText('Alpha percentage')).toHaveValue(100);
    // Pure black vs #FFFFFF is 21.00:1 (AAA) and vs #151E2C is Low
    expect(screen.getByText(/21\.00:1/)).toBeInTheDocument();
    expect(screen.getByText('AAA')).toBeInTheDocument();
    expect(screen.getByText('Low')).toBeInTheDocument();
  });

  it('supports 2D HSV spectrum pointer drag, clamping, pointerup cleanup, and zero-size guard', () => {
    const onChange = vi.fn();
    render(<ColorPicker defaultValue="#FF0000" onChange={onChange} />);

    const spectrum = screen.getByRole('slider', { name: 'Color saturation and brightness' });

    // Zero-size rect guard does not invoke onChange
    vi.spyOn(spectrum, 'getBoundingClientRect').mockReturnValue({
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
    fireEvent.pointerDown(spectrum, { clientX: 50, clientY: 50 });
    expect(onChange).not.toHaveBeenCalled();

    // Valid rect: 200x100 starting at (10, 20)
    vi.spyOn(spectrum, 'getBoundingClientRect').mockReturnValue({
      x: 10,
      y: 20,
      left: 10,
      top: 20,
      right: 210,
      bottom: 120,
      width: 200,
      height: 100,
      toJSON: () => ({}),
    });

    // Click at exact center: s = 50%, v = 50% (hue = 0 -> #804040)
    fireEvent.pointerDown(spectrum, { clientX: 110, clientY: 70 });
    expect(onChange).toHaveBeenLastCalledWith('#804040', 1);
    expect(spectrum).toHaveAttribute('aria-valuenow', '50');

    // Drag outside top-left -> clamps to s = 0%, v = 100% (#FFFFFF)
    fireEvent.pointerMove(window, { clientX: -100, clientY: -100 });
    expect(onChange).toHaveBeenLastCalledWith('#FFFFFF', 1);

    // Drag outside bottom-right -> clamps to s = 100%, v = 0% (#000000)
    fireEvent.pointerMove(window, { clientX: 500, clientY: 500 });
    expect(onChange).toHaveBeenLastCalledWith('#000000', 1);

    // Pointer up ends drag session
    fireEvent.pointerUp(window);
    onChange.mockClear();
    fireEvent.pointerMove(window, { clientX: 110, clientY: 70 });
    expect(onChange).not.toHaveBeenCalled();
  });

  it('supports keyboard navigation on the 2D HSV spectrum (Arrows, Shift+Arrows, Home, End)', () => {
    const onChange = vi.fn();
    render(<ColorPicker defaultValue="#804040" onChange={onChange} />);

    const spectrum = screen.getByRole('slider', { name: 'Color saturation and brightness' });
    // #804040 -> hsv { h: 0, s: 50, v: 50 }
    expect(spectrum).toHaveAttribute('aria-valuenow', '50');

    fireEvent.keyDown(spectrum, { key: 'ArrowRight' });
    expect(spectrum).toHaveAttribute('aria-valuenow', '51');

    fireEvent.keyDown(spectrum, { key: 'ArrowLeft', shiftKey: true });
    expect(spectrum).toHaveAttribute('aria-valuenow', '41');

    fireEvent.keyDown(spectrum, { key: 'ArrowUp', shiftKey: true });
    expect(spectrum.getAttribute('aria-valuetext')).toContain('Brightness 60%');

    fireEvent.keyDown(spectrum, { key: 'ArrowDown' });
    expect(spectrum.getAttribute('aria-valuetext')).toContain('Brightness 59%');

    fireEvent.keyDown(spectrum, { key: 'Home' });
    expect(spectrum).toHaveAttribute('aria-valuenow', '0');

    fireEvent.keyDown(spectrum, { key: 'End' });
    expect(spectrum).toHaveAttribute('aria-valuenow', '100');

    onChange.mockClear();
    fireEvent.keyDown(spectrum, { key: 'a' });
    expect(onChange).not.toHaveBeenCalled();
  });

  it('updates Hue and Opacity sliders and preserves chosen Hue on pure white', () => {
    const onChange = vi.fn();
    render(<ColorPicker defaultValue="#FFFFFF" defaultAlpha={0.8} onChange={onChange} />);

    const hueSlider = screen.getByLabelText('Hue');
    const opacitySlider = screen.getByLabelText('Opacity');
    expect(opacitySlider).toHaveValue('80');

    // Moving Hue slider while on #FFFFFF preserves h = 180 in the spectrum
    fireEvent.change(hueSlider, { target: { value: '180' } });
    expect(screen.getByText('180°')).toBeInTheDocument();
    expect(onChange).toHaveBeenLastCalledWith('#FFFFFF', 0.8);

    // Moving Opacity slider updates alpha to 0.45
    fireEvent.change(opacitySlider, { target: { value: '45' } });
    expect(screen.getByText('45%')).toBeInTheDocument();
    expect(onChange).toHaveBeenLastCalledWith('#FFFFFF', 0.45);
  });

  it('synchronizes Hex and R/G/B/A inputs with IME-safe Enter commit, clamping, and malformed hex rejection', () => {
    const onChange = vi.fn();
    render(<ColorPicker defaultValue="#E75C24" onChange={onChange} />);

    const hexInput = screen.getByLabelText('Hex color');
    const rInput = screen.getByLabelText('Red channel');
    const gInput = screen.getByLabelText('Green channel');
    const bInput = screen.getByLabelText('Blue channel');
    const aInput = screen.getByLabelText('Alpha percentage');

    // Blur without edits does nothing
    fireEvent.blur(hexInput);
    expect(onChange).not.toHaveBeenCalled();

    // IME-composing Enter does NOT commit
    fireEvent.change(hexInput, { target: { value: '#38BDF8' } });
    const composingEnter = new KeyboardEvent('keydown', {
      key: 'Enter',
      bubbles: true,
      cancelable: true,
    });
    Object.defineProperty(composingEnter, 'isComposing', { value: true });
    fireEvent(hexInput, composingEnter);
    expect(onChange).not.toHaveBeenCalled();

    // Escape discards draft cleanly
    fireEvent.keyDown(hexInput, { key: 'Escape' });
    expect(hexInput).toHaveValue('#E75C24');
    expect(onChange).not.toHaveBeenCalled();

    // Normal Enter commits valid hex and syncs R/G/B
    fireEvent.change(hexInput, { target: { value: '#38bdf8' } });
    fireEvent.keyDown(hexInput, { key: 'Enter' });
    expect(onChange).toHaveBeenLastCalledWith('#38BDF8', 1);
    expect(hexInput).toHaveValue('#38BDF8');
    expect(rInput).toHaveValue(56);
    expect(gInput).toHaveValue(189);
    expect(bInput).toHaveValue(248);

    // Shorthand hex without # commits on blur
    fireEvent.change(hexInput, { target: { value: '0f0' } });
    fireEvent.blur(hexInput);
    expect(onChange).toHaveBeenLastCalledWith('#00FF00', 1);
    expect(hexInput).toHaveValue('#00FF00');

    // Malformed hex and XSS payloads are cleanly rejected without corrupting state
    onChange.mockClear();
    fireEvent.change(hexInput, { target: { value: '#ZZZZZZ' } });
    fireEvent.keyDown(hexInput, { key: 'Enter' });
    expect(onChange).not.toHaveBeenCalled();
    expect(hexInput).toHaveValue('#00FF00');

    fireEvent.change(hexInput, { target: { value: '<script>' } });
    fireEvent.blur(hexInput);
    expect(onChange).not.toHaveBeenCalled();
    expect(hexInput).toHaveValue('#00FF00');
    expect(document.querySelector('script')).toBeNull();

    // R/G/B clamping & Enter handling & empty input guard
    fireEvent.change(rInput, { target: { value: '999' } });
    expect(onChange).toHaveBeenLastCalledWith('#FFFF00', 1);

    fireEvent.change(gInput, { target: { value: '-25' } });
    expect(onChange).toHaveBeenLastCalledWith('#FF0000', 1);

    fireEvent.change(bInput, { target: { value: '128' } });
    expect(onChange).toHaveBeenLastCalledWith('#FF0080', 1);

    // Empty numeric input ignored without corrupting state
    onChange.mockClear();
    fireEvent.change(rInput, { target: { value: '' } });
    fireEvent.change(aInput, { target: { value: '' } });
    expect(onChange).not.toHaveBeenCalled();

    // Enter on numeric R/G/B/A inputs (non-composing commits, non-Enter & composing ignored)
    onChange.mockClear();
    fireEvent.keyDown(rInput, { key: 'Tab' });
    fireEvent.keyDown(gInput, { key: 'Tab' });
    fireEvent.keyDown(bInput, { key: 'Tab' });
    fireEvent.keyDown(aInput, { key: 'Tab' });
    expect(onChange).not.toHaveBeenCalled();

    fireEvent.keyDown(rInput, { key: 'Enter' });
    fireEvent.keyDown(gInput, { key: 'Enter' });
    fireEvent.keyDown(bInput, { key: 'Enter' });
    expect(onChange).toHaveBeenLastCalledWith('#FF0080', 1);

    // Alpha numeric input clamping & Enter
    fireEvent.change(aInput, { target: { value: '150' } });
    expect(onChange).toHaveBeenLastCalledWith('#FF0080', 1);
    fireEvent.change(aInput, { target: { value: '35' } });
    expect(onChange).toHaveBeenLastCalledWith('#FF0080', 0.35);
    fireEvent.keyDown(aInput, { key: 'Enter' });
    expect(onChange).toHaveBeenLastCalledWith('#FF0080', 0.35);

    // Uncontrolled preset pill selection updates state directly
    fireEvent.click(screen.getByRole('button', { name: 'Select preset color #26BC92' }));
    expect(onChange).toHaveBeenLastCalledWith('#26BC92', 0.35);
    expect(hexInput).toHaveValue('#26BC92');
  });

  it('selects preset swatches and operates seamlessly in controlled mode', () => {
    function ControlledHarness() {
      const [hex, setHex] = useState('#E75C24');
      const [alpha, setAlpha] = useState(1);
      return (
        <div>
          <ColorPicker
            value={hex}
            alpha={alpha}
            onChange={(nextHex, nextAlpha) => {
              setHex(nextHex);
              setAlpha(nextAlpha);
            }}
          />
          <button type="button" onClick={() => setHex('#1D4ED8')}>
            External Blue
          </button>
        </div>
      );
    }

    render(<ControlledHarness />);

    const violetPreset = screen.getByRole('button', { name: 'Select preset color #7C3AED' });
    fireEvent.click(violetPreset);
    expect(violetPreset).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByLabelText('Hex color')).toHaveValue('#7C3AED');

    // External prop update syncs HSV & inputs cleanly
    fireEvent.click(screen.getByRole('button', { name: 'External Blue' }));
    expect(screen.getByLabelText('Hex color')).toHaveValue('#1D4ED8');
    expect(screen.getByRole('button', { name: 'Select preset color #1D4ED8' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
  });

  it('blocks all interactions when disabled', () => {
    const onChange = vi.fn();
    render(<ColorPicker disabled defaultValue="#E75C24" onChange={onChange} data-testid="cp-dis" />);

    const root = screen.getByTestId('cp-dis');
    expect(root).toHaveAttribute('data-disabled', 'true');

    const spectrum = screen.getByRole('slider', { name: 'Color saturation and brightness' });
    expect(spectrum).toHaveAttribute('tabindex', '-1');
    expect(spectrum).toHaveAttribute('aria-disabled', 'true');

    fireEvent.pointerDown(spectrum, { clientX: 20, clientY: 20 });
    fireEvent.keyDown(spectrum, { key: 'ArrowRight' });
    fireEvent.change(screen.getByLabelText('Hue'), { target: { value: '120' } });
    fireEvent.change(screen.getByLabelText('Opacity'), { target: { value: '50' } });
    fireEvent.change(screen.getByLabelText('Hex color'), { target: { value: '#112233' } });
    fireEvent.keyDown(screen.getByLabelText('Hex color'), { key: 'Enter' });
    fireEvent.change(screen.getByLabelText('Red channel'), { target: { value: '10' } });
    fireEvent.change(screen.getByLabelText('Alpha percentage'), { target: { value: '20' } });
    fireEvent.click(screen.getByRole('button', { name: 'Select preset color #38BDF8' }));

    expect(onChange).not.toHaveBeenCalled();
  });
});
