import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import {
  WindowUtilityControls,
  type WindowUtilityState,
} from './index';

describe('WindowUtilityControls', () => {
  it('renders defaults, semantic optical tokens, ref passthrough, and theme overrides', () => {
    const ref = createRef<HTMLDivElement>();

    render(
      <PrismThemeProvider
        theme={{
          components: {
            WindowUtilityControls: {
              className: 'theme-window-utility',
              style: { opacity: '0.97' },
            },
          },
        }}
      >
        <WindowUtilityControls
          ref={ref}
          className="local-utility-shell"
          xstyle={{ '--prism-blur-px': '18px' }}
          data-testid="utility-root"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('utility-root');
    expect(ref.current).toBe(root);
    expect(root).toHaveAttribute('role', 'region');
    expect(root).toHaveClass(
      'refractor-window-utility-controls',
      'prism-slab',
      'theme-window-utility',
      'local-utility-shell'
    );
    expect(root).toHaveStyle({ opacity: '0.97' });
    expect(root).toHaveAttribute('data-opacity-pct', '92');
    expect(root).toHaveAttribute('data-show-sample-body', 'true');
    expect(root).not.toHaveAttribute('data-pinned');
    expect(root).not.toHaveAttribute('data-shaded');
    expect(root).not.toHaveAttribute('data-disabled');

    const region = screen.getByRole('region', {
      name: 'Optical Shader Monitor',
    });
    expect(region).toBe(root);
    expect(
      screen.getByRole('heading', { name: 'Optical Shader Monitor' })
    ).toBeInTheDocument();

    // Live status pills
    expect(screen.queryByTestId('window-utility-pill-pinned')).toBeNull();
    expect(screen.queryByTestId('window-utility-pill-shaded')).toBeNull();
    expect(screen.getByTestId('window-utility-pill-opacity')).toHaveTextContent(
      '92%'
    );

    // Pin & Shade buttons
    const pinBtn = screen.getByRole('button', {
      name: 'Pin window always on top',
    });
    expect(pinBtn).toHaveAttribute('aria-pressed', 'false');

    const body = screen.getByTestId('window-utility-body');
    const shadeBtn = screen.getByRole('button', {
      name: 'Roll up window shade',
    });
    expect(shadeBtn).toHaveAttribute('aria-pressed', 'false');
    expect(shadeBtn).toHaveAttribute('aria-expanded', 'true');
    expect(shadeBtn).toHaveAttribute('aria-controls', body.id);

    // Range slider
    const slider = screen.getByRole('slider', {
      name: 'Window background opacity',
    });
    expect(slider).toHaveAttribute('min', '30');
    expect(slider).toHaveAttribute('max', '100');
    expect(slider).toHaveAttribute('step', '2');
    expect(slider).toHaveValue('92');
    expect(slider).toHaveAttribute('aria-valuetext', '92% opacity');

    // Quick presets and Reset button
    expect(screen.getByRole('button', { name: '50%' })).toHaveAttribute(
      'aria-pressed',
      'false'
    );
    expect(screen.getByRole('button', { name: '75%' })).toHaveAttribute(
      'aria-pressed',
      'false'
    );
    expect(screen.getByRole('button', { name: '100%' })).toHaveAttribute(
      'aria-pressed',
      'false'
    );
    expect(screen.getByRole('button', { name: 'Reset' })).toBeEnabled();

    // Sample window body reflects live translucency
    expect(body.style.opacity).toBe('0.92');
    expect(body).toHaveAttribute('data-pinned-ring', 'false');
    expect(screen.getByTestId('window-utility-layer-value')).toHaveTextContent(
      'Standard Stack'
    );
    expect(
      screen.getByTestId('window-utility-opacity-readout')
    ).toHaveTextContent('92% · α 0.92');

    // Polite live status region starts empty
    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-live', 'polite');
    expect(status).toHaveTextContent('');
  });

  it('toggles Pin Always-on-Top on and off with --prism-primary-main pill, elevation ring, and live announcement', () => {
    const onChange = vi.fn<(state: WindowUtilityState) => void>();

    render(
      <WindowUtilityControls
        title="Lens Telemetry"
        onChange={onChange}
        data-testid="pin-root"
      />
    );

    const root = screen.getByTestId('pin-root');
    const pinBtn = screen.getByRole('button', {
      name: 'Pin window always on top',
    });
    const status = screen.getByRole('status');

    // Pin ON
    fireEvent.click(pinBtn);
    expect(pinBtn).toHaveAttribute('aria-pressed', 'true');
    expect(root).toHaveAttribute('data-pinned', 'true');
    expect(root.style.boxShadow).toContain('var(--prism-primary-main)');

    const pinnedPill = screen.getByTestId('window-utility-pill-pinned');
    expect(pinnedPill).toHaveTextContent('Pinned');
    expect(pinnedPill.style.color).toBe('var(--prism-primary-main)');

    const body = screen.getByTestId('window-utility-body');
    expect(body).toHaveAttribute('data-pinned-ring', 'true');
    expect(body.style.boxShadow).toContain('var(--prism-primary-main)');
    expect(screen.getByTestId('window-utility-layer-value')).toHaveTextContent(
      'Always-on-Top'
    );
    expect(screen.getByText('z-index: top')).toBeInTheDocument();

    expect(onChange).toHaveBeenCalledWith({
      pinned: true,
      shaded: false,
      opacityPct: 92,
    });
    expect(status).toHaveTextContent('Lens Telemetry pinned always on top');

    // Pin OFF
    fireEvent.click(pinBtn);
    expect(pinBtn).toHaveAttribute('aria-pressed', 'false');
    expect(root).not.toHaveAttribute('data-pinned');
    expect(screen.queryByTestId('window-utility-pill-pinned')).toBeNull();
    expect(body).toHaveAttribute('data-pinned-ring', 'false');
    expect(body.style.boxShadow).toBe('');
    expect(screen.getByText('z-index: auto')).toBeInTheDocument();
    expect(onChange).toHaveBeenLastCalledWith({
      pinned: false,
      shaded: false,
      opacityPct: 92,
    });
    expect(status).toHaveTextContent('Lens Telemetry unpinned from always on top');
  });

  it('toggles Window Shade roll-up collapsing and restoring sample body with --prism-info-main status pill', () => {
    const onChange = vi.fn<(state: WindowUtilityState) => void>();

    render(
      <WindowUtilityControls
        title="Shader Inspector"
        onChange={onChange}
        data-testid="shade-root"
      />
    );

    const root = screen.getByTestId('shade-root');
    const header = root.querySelector('[data-part="header"]');
    const shadeBtn = screen.getByRole('button', {
      name: 'Roll up window shade',
    });
    const status = screen.getByRole('status');

    expect(screen.getByTestId('window-utility-body')).toBeInTheDocument();
    expect(header).toHaveClass('border-b');

    // Roll up shade (collapse body to titlebar-only glass bar)
    fireEvent.click(shadeBtn);
    expect(shadeBtn).toHaveAttribute('aria-pressed', 'true');
    expect(shadeBtn).toHaveAttribute('aria-expanded', 'false');
    expect(shadeBtn).not.toHaveAttribute('aria-controls');
    expect(root).toHaveAttribute('data-shaded', 'true');
    expect(header).not.toHaveClass('border-b');
    expect(screen.queryByTestId('window-utility-body')).toBeNull();

    const shadedPill = screen.getByTestId('window-utility-pill-shaded');
    expect(shadedPill).toHaveTextContent('Shaded');
    expect(shadedPill.style.color).toBe('var(--prism-info-main)');

    expect(onChange).toHaveBeenCalledWith({
      pinned: false,
      shaded: true,
      opacityPct: 92,
    });
    expect(status).toHaveTextContent('Shader Inspector shaded and rolled up');

    // Expand shade back
    fireEvent.click(shadeBtn);
    expect(shadeBtn).toHaveAttribute('aria-pressed', 'false');
    expect(shadeBtn).toHaveAttribute('aria-expanded', 'true');
    expect(root).not.toHaveAttribute('data-shaded');
    expect(screen.queryByTestId('window-utility-pill-shaded')).toBeNull();
    expect(screen.getByTestId('window-utility-body')).toBeInTheDocument();
    expect(onChange).toHaveBeenLastCalledWith({
      pinned: false,
      shaded: false,
      opacityPct: 92,
    });
    expect(status).toHaveTextContent(
      'Shader Inspector expanded from window shade'
    );
  });

  it('updates live opacity via range slider, quick presets (50%, 75%, 100%), and restores defaults on Reset', () => {
    const onChange = vi.fn<(state: WindowUtilityState) => void>();

    render(
      <WindowUtilityControls onChange={onChange} data-testid="opacity-root" />
    );

    const root = screen.getByTestId('opacity-root');
    const slider = screen.getByRole('slider', {
      name: 'Window background opacity',
    });
    const status = screen.getByRole('status');

    // Adjust slider to 64%
    fireEvent.change(slider, { target: { value: '64' } });
    expect(slider).toHaveValue('64');
    expect(root).toHaveAttribute('data-opacity-pct', '64');
    expect(screen.getByTestId('window-utility-pill-opacity')).toHaveTextContent(
      '64%'
    );
    expect(screen.getByTestId('window-utility-body').style.opacity).toBe('0.64');
    expect(
      screen.getByTestId('window-utility-opacity-readout')
    ).toHaveTextContent('64% · α 0.64');
    expect(onChange).toHaveBeenLastCalledWith({
      pinned: false,
      shaded: false,
      opacityPct: 64,
    });
    expect(status).toHaveTextContent(
      'Optical Shader Monitor background opacity set to 64%'
    );

    // Preset 50%
    const preset50 = screen.getByRole('button', { name: '50%' });
    const preset75 = screen.getByRole('button', { name: '75%' });
    const preset100 = screen.getByRole('button', { name: '100%' });

    fireEvent.click(preset50);
    expect(preset50).toHaveAttribute('aria-pressed', 'true');
    expect(preset50).toHaveClass('prism-btn-primary');
    expect(preset75).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByTestId('window-utility-body').style.opacity).toBe('0.5');
    expect(onChange).toHaveBeenLastCalledWith({
      pinned: false,
      shaded: false,
      opacityPct: 50,
    });

    // Preset 75%
    fireEvent.click(preset75);
    expect(preset75).toHaveAttribute('aria-pressed', 'true');
    expect(preset50).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByTestId('window-utility-body').style.opacity).toBe('0.75');
    expect(onChange).toHaveBeenLastCalledWith({
      pinned: false,
      shaded: false,
      opacityPct: 75,
    });

    // Preset 100%
    fireEvent.click(preset100);
    expect(preset100).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('window-utility-body').style.opacity).toBe('1');
    expect(onChange).toHaveBeenLastCalledWith({
      pinned: false,
      shaded: false,
      opacityPct: 100,
    });

    // Combine Pin + Shade + 50% then click Reset
    fireEvent.click(
      screen.getByRole('button', { name: 'Pin window always on top' })
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'Roll up window shade' })
    );
    fireEvent.click(preset50);
    expect(screen.queryByTestId('window-utility-body')).toBeNull();
    expect(screen.getByTestId('window-utility-pill-pinned')).toBeInTheDocument();
    expect(screen.getByTestId('window-utility-pill-shaded')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Reset' }));
    expect(onChange).toHaveBeenLastCalledWith({
      pinned: false,
      shaded: false,
      opacityPct: 92,
    });
    expect(root).not.toHaveAttribute('data-pinned');
    expect(root).not.toHaveAttribute('data-shaded');
    expect(root).toHaveAttribute('data-opacity-pct', '92');
    expect(screen.queryByTestId('window-utility-pill-pinned')).toBeNull();
    expect(screen.queryByTestId('window-utility-pill-shaded')).toBeNull();
    expect(screen.getByTestId('window-utility-body').style.opacity).toBe('0.92');
    expect(status).toHaveTextContent(
      'Optical Shader Monitor utilities reset to defaults: unpinned, expanded, 92% opacity'
    );
  });

  it('sanitizes NaN, Infinity, negative, and out-of-bounds opacity values cleanly into [30..100]', () => {
    const { rerender } = render(
      <WindowUtilityControls
        defaultValue={{ opacityPct: Number.NaN }}
        data-testid="sanitize-nan"
      />
    );
    expect(screen.getByTestId('sanitize-nan')).toHaveAttribute(
      'data-opacity-pct',
      '92'
    );

    const { unmount: unmountInf } = render(
      <WindowUtilityControls
        defaultValue={{ opacityPct: Number.POSITIVE_INFINITY }}
        data-testid="sanitize-inf"
      />
    );
    expect(screen.getByTestId('sanitize-inf')).toHaveAttribute(
      'data-opacity-pct',
      '92'
    );
    unmountInf();

    const { unmount: unmountLow } = render(
      <WindowUtilityControls
        defaultValue={{ opacityPct: 8 }}
        data-testid="sanitize-low"
      />
    );
    expect(screen.getByTestId('sanitize-low')).toHaveAttribute(
      'data-opacity-pct',
      '30'
    );
    unmountLow();

    const { unmount: unmountHigh } = render(
      <WindowUtilityControls
        defaultValue={{ opacityPct: 185 }}
        data-testid="sanitize-high"
      />
    );
    expect(screen.getByTestId('sanitize-high')).toHaveAttribute(
      'data-opacity-pct',
      '100'
    );
    unmountHigh();

    // Controlled sanitization: NaN -> 92, -50 -> 30, 140 -> 100, float -> rounded integer
    rerender(
      <WindowUtilityControls
        value={{ pinned: true, shaded: false, opacityPct: -50 }}
        data-testid="sanitize-nan"
      />
    );
    expect(screen.getByTestId('sanitize-nan')).toHaveAttribute(
      'data-opacity-pct',
      '30'
    );
    expect(screen.getByTestId('window-utility-body').style.opacity).toBe('0.3');

    rerender(
      <WindowUtilityControls
        value={{ pinned: false, shaded: false, opacityPct: 140 }}
        data-testid="sanitize-nan"
      />
    );
    expect(screen.getByTestId('sanitize-nan')).toHaveAttribute(
      'data-opacity-pct',
      '100'
    );

    rerender(
      <WindowUtilityControls
        value={{
          pinned: false,
          shaded: false,
          opacityPct: Number.NEGATIVE_INFINITY,
        }}
        data-testid="sanitize-nan"
      />
    );
    expect(screen.getByTestId('sanitize-nan')).toHaveAttribute(
      'data-opacity-pct',
      '92'
    );

    // Float rounding & out-of-bounds slider clamping
    const onChange = vi.fn<(state: WindowUtilityState) => void>();
    rerender(
      <WindowUtilityControls
        value={{ pinned: false, shaded: false, opacityPct: 67.6 }}
        onChange={onChange}
        data-testid="sanitize-nan"
      />
    );
    expect(screen.getByTestId('sanitize-nan')).toHaveAttribute(
      'data-opacity-pct',
      '68'
    );
    const slider = screen.getByRole('slider', {
      name: 'Window background opacity',
    });
    fireEvent.change(slider, { target: { value: '12' } });
    expect(onChange).toHaveBeenLastCalledWith({
      pinned: false,
      shaded: false,
      opacityPct: 30,
    });
    fireEvent.change(slider, { target: { value: '160' } });
    expect(onChange).toHaveBeenLastCalledWith({
      pinned: false,
      shaded: false,
      opacityPct: 100,
    });
  });

  it('hides sample body when showSampleBody is false', () => {
    render(
      <WindowUtilityControls
        showSampleBody={false}
        data-testid="compact-bar"
      />
    );

    const root = screen.getByTestId('compact-bar');
    expect(root).not.toHaveAttribute('data-show-sample-body');
    expect(screen.queryByTestId('window-utility-body')).toBeNull();
    expect(root.querySelector('[data-part="header"]')).not.toHaveClass(
      'border-b'
    );
    const shadeBtn = screen.getByRole('button', {
      name: 'Roll up window shade',
    });
    expect(shadeBtn).toHaveAttribute('aria-expanded', 'true');
    expect(shadeBtn).not.toHaveAttribute('aria-controls');
  });

  it('supports controlled mode without internal mutation until parent updates value', () => {
    const onChange = vi.fn<(state: WindowUtilityState) => void>();
    const initial: WindowUtilityState = {
      pinned: false,
      shaded: false,
      opacityPct: 80,
    };

    const { rerender } = render(
      <WindowUtilityControls
        value={initial}
        onChange={onChange}
        data-testid="ctrl-root"
      />
    );

    const root = screen.getByTestId('ctrl-root');
    fireEvent.click(
      screen.getByRole('button', { name: 'Pin window always on top' })
    );
    expect(onChange).toHaveBeenCalledWith({
      pinned: true,
      shaded: false,
      opacityPct: 80,
    });
    // Remains unpinned because parent has not updated value
    expect(root).not.toHaveAttribute('data-pinned');

    rerender(
      <WindowUtilityControls
        value={{ pinned: true, shaded: true, opacityPct: 50 }}
        onChange={onChange}
        data-testid="ctrl-root"
      />
    );
    expect(root).toHaveAttribute('data-pinned', 'true');
    expect(root).toHaveAttribute('data-shaded', 'true');
    expect(root).toHaveAttribute('data-opacity-pct', '50');
    expect(screen.queryByTestId('window-utility-body')).toBeNull();
  });

  it('blocks all interactions when disabled is true', () => {
    const onChange = vi.fn<(state: WindowUtilityState) => void>();

    render(
      <WindowUtilityControls
        disabled
        onChange={onChange}
        data-testid="disabled-root"
      />
    );

    const root = screen.getByTestId('disabled-root');
    expect(root).toHaveAttribute('data-disabled', 'true');
    expect(root).toHaveAttribute('aria-disabled', 'true');

    const pinBtn = screen.getByRole('button', {
      name: 'Pin window always on top',
    });
    const shadeBtn = screen.getByRole('button', {
      name: 'Roll up window shade',
    });
    const slider = screen.getByRole('slider', {
      name: 'Window background opacity',
    });
    const preset50 = screen.getByRole('button', { name: '50%' });
    const resetBtn = screen.getByRole('button', { name: 'Reset' });

    expect(pinBtn).toBeDisabled();
    expect(shadeBtn).toBeDisabled();
    expect(slider).toBeDisabled();
    expect(preset50).toBeDisabled();
    expect(resetBtn).toBeDisabled();

    fireEvent.click(pinBtn);
    fireEvent.click(shadeBtn);
    fireEvent.click(preset50);
    fireEvent.click(resetBtn);
    fireEvent.change(slider, { target: { value: '50' } });
    fireEvent.keyDown(pinBtn, { key: 'Enter' });
    fireEvent.keyDown(shadeBtn, { key: ' ' });

    expect(onChange).not.toHaveBeenCalled();
    expect(root).toHaveAttribute('data-opacity-pct', '92');
    expect(root).not.toHaveAttribute('data-pinned');
    expect(root).not.toHaveAttribute('data-shaded');
  });

  it('supports IME-safe keyboard activation on controls and ignores composing or non-activation keys', () => {
    const onChange = vi.fn<(state: WindowUtilityState) => void>();

    render(<WindowUtilityControls onChange={onChange} />);

    const pinBtn = screen.getByRole('button', {
      name: 'Pin window always on top',
    });
    const shadeBtn = screen.getByRole('button', {
      name: 'Roll up window shade',
    });
    const preset50 = screen.getByRole('button', { name: '50%' });
    const resetBtn = screen.getByRole('button', { name: 'Reset' });

    // IME composition Enter MUST be ignored
    const composingEnter = new KeyboardEvent('keydown', {
      key: 'Enter',
      bubbles: true,
      cancelable: true,
    });
    Object.defineProperty(composingEnter, 'isComposing', { value: true });
    fireEvent(pinBtn, composingEnter);
    expect(onChange).not.toHaveBeenCalled();

    // Non-activation key ignored
    fireEvent.keyDown(pinBtn, { key: 'Escape' });
    expect(onChange).not.toHaveBeenCalled();

    // Enter activates Pin
    fireEvent.keyDown(pinBtn, { key: 'Enter' });
    expect(onChange).toHaveBeenLastCalledWith({
      pinned: true,
      shaded: false,
      opacityPct: 92,
    });

    // Space activates Shade
    fireEvent.keyDown(shadeBtn, { key: ' ' });
    expect(onChange).toHaveBeenLastCalledWith({
      pinned: true,
      shaded: true,
      opacityPct: 92,
    });

    // Enter activates Preset 50%
    fireEvent.keyDown(preset50, { key: 'Enter' });
    expect(onChange).toHaveBeenLastCalledWith({
      pinned: true,
      shaded: true,
      opacityPct: 50,
    });

    // Space activates Reset
    fireEvent.keyDown(resetBtn, { key: ' ' });
    expect(onChange).toHaveBeenLastCalledWith({
      pinned: false,
      shaded: false,
      opacityPct: 92,
    });
  });

  it('handles blank title fallback, omitted callbacks, and adversarial XSS strings safely', () => {
    const { rerender } = render(
      <WindowUtilityControls title="   " data-testid="safe-root" />
    );

    expect(
      screen.getByRole('heading', { name: 'Optical Shader Monitor' })
    ).toBeInTheDocument();

    // Interacting without onChange callback never throws
    fireEvent.click(
      screen.getByRole('button', { name: 'Pin window always on top' })
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'Roll up window shade' })
    );
    fireEvent.click(screen.getByRole('button', { name: 'Reset' }));

    // Adversarial XSS payload rendered strictly as escaped text
    const xssPayload =
      '<script>window.__windowUtilityXss=1</script><img src=x onerror=alert(1)>';
    rerender(
      <WindowUtilityControls title={xssPayload} data-testid="safe-root" />
    );

    expect(document.querySelector('script')).toBeNull();
    expect(document.querySelector('img')).toBeNull();
    expect(
      screen.getByRole('heading', { name: xssPayload })
    ).toBeInTheDocument();
  });
});
