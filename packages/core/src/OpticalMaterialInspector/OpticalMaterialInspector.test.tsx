import { createRef, useState, type KeyboardEvent } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import {
  OpticalMaterialInspector,
  type OpticalMaterialPreset,
  type OpticalMaterialPresetMap,
  type OpticalMaterialState,
  type OpticalMaterialTint,
} from './index';

describe('OpticalMaterialInspector', () => {
  it('renders prism-slab shell, theme override, React 19 ref, SVG shader specimen, sliders, tints, and default live readout', () => {
    const ref = createRef<HTMLDivElement>();

    render(
      <PrismThemeProvider
        theme={{
          components: {
            OpticalMaterialInspector: {
              className: 'theme-optical-inspector',
              style: { maxWidth: '720px' },
            },
          },
        }}
      >
        <OpticalMaterialInspector
          ref={ref}
          className="local-optical-inspector"
          xstyle={{ '--prism-blur-px': '24px' }}
          style={{ padding: '20px' }}
          data-testid="optical-root"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('optical-root');
    const workbench = screen.getByTestId('optical-workbench');
    const specimenWell = screen.getByTestId('optical-specimen-well');
    const svg = screen.getByTestId('optical-specimen-svg');
    const readout = screen.getByTestId('optical-material-readout');
    const resetBtn = screen.getByTestId('optical-reset-button');

    expect(OpticalMaterialInspector.displayName).toBe('OpticalMaterialInspector');
    expect(ref.current).toBe(root);
    expect(root).toHaveClass(
      'refractor-optical-material-inspector',
      'prism-slab',
      'prism-focus-ring',
      'theme-optical-inspector',
      'local-optical-inspector'
    );
    expect(root).toHaveStyle({ maxWidth: '720px', padding: '20px' });
    expect(root).toHaveAttribute('role', 'region');
    expect(root).toHaveAttribute('aria-label', 'Optical Material & Shader Inspector');
    expect(root).toHaveAttribute('tabindex', '0');
    expect(root).toHaveAttribute('data-preset', 'custom');
    expect(root).toHaveAttribute('data-tint', 'crystal');

    expect(screen.getByTestId('optical-inspector-title')).toHaveTextContent(
      'Optical Material & Shader Inspector'
    );
    expect(resetBtn).toBeDisabled();

    // Responsive 2-column shader workbench & optical specimen well
    expect(workbench).toHaveClass('grid-cols-1', 'md:grid-cols-[0.95fr_1.05fr]');
    expect(specimenWell).toHaveClass('prism-well', 'rounded-2xl', 'p-4', 'relative', 'overflow-hidden');
    expect(svg).toHaveAttribute('viewBox', '0 0 240 200');
    expect(screen.getByTestId('optical-specimen-blur')).toHaveAttribute('stdDeviation', '4.5');

    // Prismatic chromatic split bands strictly use semantic --prism-* tokens
    expect(screen.getByTestId('optical-dispersion-warm')).toHaveAttribute(
      'stroke',
      'var(--prism-primary-main)'
    );
    expect(screen.getByTestId('optical-dispersion-mid')).toHaveAttribute(
      'stroke',
      'var(--prism-success-main)'
    );
    expect(screen.getByTestId('optical-dispersion-cool')).toHaveAttribute(
      'stroke',
      'var(--prism-secondary-main)'
    );
    expect(screen.getByTestId('optical-caustic-warm')).toHaveAttribute(
      'stroke',
      'var(--prism-primary-main)'
    );
    expect(screen.getByTestId('optical-caustic-mid')).toHaveAttribute(
      'stroke',
      'var(--prism-success-main)'
    );
    expect(screen.getByTestId('optical-caustic-cool')).toHaveAttribute(
      'stroke',
      'var(--prism-secondary-main)'
    );

    // Snell angle refraction indicator (theta1 = 42deg, n = 1.52 -> theta2 = 26.1deg)
    expect(screen.getByTestId('optical-snell-readout')).toHaveTextContent('Snell 42° → 26.1°');
    expect(screen.getByTestId('optical-tint-badge')).toHaveTextContent('Crystal · n=1.52');

    // Sliders & tabular pills
    expect(screen.getByRole('slider', { name: 'Blur Radius (px)' })).toHaveValue('18');
    expect(screen.getByRole('slider', { name: 'Index of Refraction (IOR 1.00–2.50)' })).toHaveValue(
      '1.52'
    );
    expect(screen.getByRole('slider', { name: 'Chromatic Dispersion (%)' })).toHaveValue('42');
    expect(screen.getByRole('slider', { name: 'Specular Intensity (%)' })).toHaveValue('78');
    expect(screen.getByTestId('optical-blur-pill')).toHaveTextContent('18px');
    expect(screen.getByTestId('optical-ior-pill')).toHaveTextContent('1.52');
    expect(screen.getByTestId('optical-dispersion-pill')).toHaveTextContent('42%');
    expect(screen.getByTestId('optical-specular-pill')).toHaveTextContent('78%');

    // 4 preset pills & 5 surface tint pills present
    expect(screen.getByRole('button', { name: 'Frosted Quartz' })).toHaveAttribute(
      'aria-pressed',
      'false'
    );
    expect(screen.getByRole('button', { name: 'Diamond Prism' })).toHaveAttribute(
      'aria-pressed',
      'false'
    );
    expect(screen.getByRole('button', { name: 'Smoked Obsidian' })).toHaveAttribute(
      'aria-pressed',
      'false'
    );
    expect(screen.getByRole('button', { name: 'Amber Lens' })).toHaveAttribute(
      'aria-pressed',
      'false'
    );

    expect(screen.getByRole('button', { name: 'Crystal' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Tangerine' })).toHaveAttribute(
      'aria-pressed',
      'false'
    );
    expect(screen.getByRole('button', { name: 'Sky' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: 'Emerald' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: 'Amber' })).toHaveAttribute('aria-pressed', 'false');

    // Exact aria-live="polite" shader uniform summary
    expect(readout).toHaveAttribute('aria-live', 'polite');
    expect(readout).toHaveTextContent(
      'blur: 18px · IOR: 1.52 · disp: 42% · spec: 78% · tint: crystal'
    );
    expect(screen.getByTestId('optical-preset-status')).toHaveTextContent('Custom');
  });

  it('updates live SVG blur, Snell refraction ray, chromatic dispersion bands, and specular sheen via precision sliders', () => {
    const onChange = vi.fn<(state: OpticalMaterialState) => void>();

    render(<OpticalMaterialInspector onChange={onChange} data-testid="inspector" />);

    const blurSlider = screen.getByRole('slider', { name: 'Blur Radius (px)' });
    const iorSlider = screen.getByRole('slider', { name: 'Index of Refraction (IOR 1.00–2.50)' });
    const dispersionSlider = screen.getByRole('slider', { name: 'Chromatic Dispersion (%)' });
    const specularSlider = screen.getByRole('slider', { name: 'Specular Intensity (%)' });

    const blurFilter = screen.getByTestId('optical-specimen-blur');
    const refractedRay = screen.getByTestId('optical-snell-refracted');
    const warmBand = screen.getByTestId('optical-dispersion-warm');
    const coolBand = screen.getByTestId('optical-dispersion-cool');
    const slabMeniscus = screen.getByTestId('optical-slab-meniscus');
    const sphereMeniscus = screen.getByTestId('optical-sphere-meniscus');
    const topSheen = screen.getByTestId('optical-specimen-sheen');

    const initialRefractedX2 = Number(refractedRay.getAttribute('x2'));
    const initialSpread =
      Number(warmBand.getAttribute('x2')) - Number(coolBand.getAttribute('x2'));

    // Blur slider updates Gaussian stdDeviation and pill
    fireEvent.change(blurSlider, { target: { value: '40' } });
    expect(onChange).toHaveBeenLastCalledWith({
      blurPx: 40,
      ior: 1.52,
      dispersion: 42,
      specularPct: 78,
      tint: 'crystal',
    });
    expect(blurFilter).toHaveAttribute('stdDeviation', '10');
    expect(screen.getByTestId('optical-blur-pill')).toHaveTextContent('40px');

    // Higher IOR bends Snell ray closer to surface normal (smaller x2, smaller angle)
    fireEvent.change(iorSlider, { target: { value: '2.40' } });
    expect(onChange).toHaveBeenLastCalledWith({
      blurPx: 40,
      ior: 2.4,
      dispersion: 42,
      specularPct: 78,
      tint: 'crystal',
    });
    const higherIorX2 = Number(refractedRay.getAttribute('x2'));
    expect(higherIorX2).toBeLessThan(initialRefractedX2);
    expect(screen.getByTestId('optical-snell-readout')).toHaveTextContent('Snell 42° → 16.2°');

    // Higher dispersion widens chromatic split bands and increases opacity
    fireEvent.change(dispersionSlider, { target: { value: '100' } });
    expect(onChange).toHaveBeenLastCalledWith({
      blurPx: 40,
      ior: 2.4,
      dispersion: 100,
      specularPct: 78,
      tint: 'crystal',
    });
    const widerSpread =
      Number(warmBand.getAttribute('x2')) - Number(coolBand.getAttribute('x2'));
    expect(widerSpread).toBeGreaterThan(initialSpread);
    expect(warmBand).toHaveAttribute('stroke-opacity', '0.92');

    // Lower specular scales down top-edge meniscus sheen opacities
    fireEvent.change(specularSlider, { target: { value: '20' } });
    expect(onChange).toHaveBeenLastCalledWith({
      blurPx: 40,
      ior: 2.4,
      dispersion: 100,
      specularPct: 20,
      tint: 'crystal',
    });
    expect(topSheen).toHaveStyle({ opacity: '0.2' });
    expect(Number(slabMeniscus.getAttribute('fill-opacity'))).toBeLessThan(0.3);
    expect(Number(sphereMeniscus.getAttribute('stroke-opacity'))).toBeLessThan(0.3);

    expect(screen.getByTestId('optical-material-readout')).toHaveTextContent(
      'blur: 40px · IOR: 2.40 · disp: 100% · spec: 20% · tint: crystal'
    );
  });

  it('applies all four optical material presets, ignores duplicate clicks, and resets to defaults', () => {
    const onChange = vi.fn<(state: OpticalMaterialState) => void>();

    render(<OpticalMaterialInspector onChange={onChange} data-testid="inspector" />);

    const root = screen.getByTestId('inspector');
    const resetBtn = screen.getByTestId('optical-reset-button');

    fireEvent.click(screen.getByTestId('optical-preset-frosted-quartz'));
    expect(onChange).toHaveBeenLastCalledWith({
      blurPx: 28,
      ior: 1.54,
      dispersion: 22,
      specularPct: 62,
      tint: 'crystal',
    });
    expect(root).toHaveAttribute('data-preset', 'frosted-quartz');
    expect(screen.getByTestId('optical-preset-frosted-quartz')).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(screen.getByTestId('optical-preset-frosted-quartz')).toHaveAttribute(
      'data-active',
      'true'
    );
    expect(screen.getByTestId('optical-preset-status')).toHaveTextContent('Frosted Quartz');
    expect(resetBtn).toBeEnabled();

    // Clicking active preset again emits no duplicate change
    const callCountAfterQuartz = onChange.mock.calls.length;
    fireEvent.click(screen.getByTestId('optical-preset-frosted-quartz'));
    expect(onChange).toHaveBeenCalledTimes(callCountAfterQuartz);

    fireEvent.click(screen.getByTestId('optical-preset-diamond-prism'));
    expect(onChange).toHaveBeenLastCalledWith({
      blurPx: 4,
      ior: 2.42,
      dispersion: 94,
      specularPct: 96,
      tint: 'secondary',
    });
    expect(root).toHaveAttribute('data-preset', 'diamond-prism');
    expect(screen.getByTestId('optical-preset-status')).toHaveTextContent('Diamond Prism');

    fireEvent.click(screen.getByTestId('optical-preset-smoked-obsidian'));
    expect(onChange).toHaveBeenLastCalledWith({
      blurPx: 34,
      ior: 1.49,
      dispersion: 16,
      specularPct: 84,
      tint: 'emerald',
    });
    expect(root).toHaveAttribute('data-preset', 'smoked-obsidian');

    fireEvent.click(screen.getByTestId('optical-preset-amber-lens'));
    expect(onChange).toHaveBeenLastCalledWith({
      blurPx: 12,
      ior: 1.66,
      dispersion: 64,
      specularPct: 88,
      tint: 'amber',
    });
    expect(root).toHaveAttribute('data-preset', 'amber-lens');
    expect(screen.getByTestId('optical-material-readout')).toHaveTextContent(
      'blur: 12px · IOR: 1.66 · disp: 64% · spec: 88% · tint: amber'
    );

    // Reset button restores defaults and becomes disabled again
    fireEvent.click(resetBtn);
    expect(onChange).toHaveBeenLastCalledWith({
      blurPx: 18,
      ior: 1.52,
      dispersion: 42,
      specularPct: 78,
      tint: 'crystal',
    });
    expect(root).toHaveAttribute('data-preset', 'custom');
    expect(resetBtn).toBeDisabled();
  });

  it('cycles through all five optical surface tint pills and reflects semantic tokens in specimen', () => {
    const onChange = vi.fn<(state: OpticalMaterialState) => void>();

    render(<OpticalMaterialInspector onChange={onChange} data-testid="inspector" />);

    const sphere = screen.getByTestId('optical-specimen-sphere');
    const tintBadge = screen.getByTestId('optical-tint-badge');

    // Clicking active crystal tint again is a no-op
    fireEvent.click(screen.getByTestId('optical-tint-crystal'));
    expect(onChange).not.toHaveBeenCalled();

    const expectedTints: ReadonlyArray<{
      id: OpticalMaterialTint;
      label: string;
      token: string;
    }> = [
      { id: 'primary', label: 'Tangerine', token: 'var(--prism-primary-main)' },
      { id: 'secondary', label: 'Sky', token: 'var(--prism-secondary-main)' },
      { id: 'emerald', label: 'Emerald', token: 'var(--prism-success-main)' },
      { id: 'amber', label: 'Amber', token: 'var(--prism-warning-main)' },
      { id: 'crystal', label: 'Crystal', token: 'var(--prism-crystal-mid)' },
    ];

    for (const item of expectedTints) {
      fireEvent.click(screen.getByTestId(`optical-tint-${item.id}`));
      expect(screen.getByTestId(`optical-tint-${item.id}`)).toHaveAttribute(
        'aria-pressed',
        'true'
      );
      expect(screen.getByTestId('inspector')).toHaveAttribute('data-tint', item.id);
      expect(sphere).toHaveAttribute('stroke', item.token);
      expect(tintBadge).toHaveTextContent(`${item.label} · n=1.52`);
    }

    expect(onChange).toHaveBeenCalledTimes(5);
  });

  it('handles IME-safe keyboard shortcuts (1-4 presets, R reset), ignores IME/modifiers, and composes caller onKeyDown', () => {
    const onChange = vi.fn<(state: OpticalMaterialState) => void>();
    const callerKeyDown = vi.fn<(e: KeyboardEvent<HTMLDivElement>) => void>();

    render(
      <OpticalMaterialInspector
        onChange={onChange}
        onKeyDown={callerKeyDown}
        tabIndex={-1}
        data-testid="inspector"
      />
    );

    const root = screen.getByTestId('inspector');
    expect(root).toHaveAttribute('tabindex', '-1');

    // Ignored: IME composing, Ctrl/Meta/Alt modifiers, unrelated keys
    fireEvent.keyDown(root, { key: '1', isComposing: true });
    fireEvent.keyDown(root, { key: '2', ctrlKey: true });
    fireEvent.keyDown(root, { key: '3', metaKey: true });
    fireEvent.keyDown(root, { key: '4', altKey: true });
    fireEvent.keyDown(root, { key: 'r', ctrlKey: true });
    fireEvent.keyDown(root, { key: 'x' });
    expect(onChange).not.toHaveBeenCalled();
    expect(callerKeyDown).toHaveBeenCalledTimes(6);

    // Preset shortcuts 1..4
    fireEvent.keyDown(root, { key: '1' });
    expect(root).toHaveAttribute('data-preset', 'frosted-quartz');

    fireEvent.keyDown(root, { key: '2' });
    expect(root).toHaveAttribute('data-preset', 'diamond-prism');

    fireEvent.keyDown(root, { key: '3' });
    expect(root).toHaveAttribute('data-preset', 'smoked-obsidian');

    fireEvent.keyDown(root, { key: '4' });
    expect(root).toHaveAttribute('data-preset', 'amber-lens');

    // Lowercase 'r' resets to defaults
    fireEvent.keyDown(root, { key: 'r' });
    expect(root).toHaveAttribute('data-preset', 'custom');

    // Uppercase 'R' also resets after selecting a preset
    fireEvent.keyDown(root, { key: '2' });
    expect(root).toHaveAttribute('data-preset', 'diamond-prism');
    fireEvent.keyDown(root, { key: 'R', shiftKey: true });
    expect(root).toHaveAttribute('data-preset', 'custom');
  });

  it('respects caller onKeyDown preventDefault when composing keyboard handlers', () => {
    const onChange = vi.fn<(state: OpticalMaterialState) => void>();

    render(
      <OpticalMaterialInspector
        onChange={onChange}
        onKeyDown={(e) => e.preventDefault()}
        data-testid="inspector"
      />
    );

    fireEvent.keyDown(screen.getByTestId('inspector'), { key: '2' });
    expect(onChange).not.toHaveBeenCalled();
  });

  it('supports controlled mode where external state governs rendered UI and reset emits default target', () => {
    const onChangeSpy = vi.fn<(state: OpticalMaterialState) => void>();

    function ControlledHarness() {
      const [material, setMaterial] = useState<OpticalMaterialState>({
        blurPx: 10,
        ior: 1.8,
        dispersion: 55,
        specularPct: 60,
        tint: 'primary',
      });

      return (
        <OpticalMaterialInspector
          title="Controlled Shader"
          value={material}
          onChange={(next) => {
            onChangeSpy(next);
            setMaterial(next);
          }}
        />
      );
    }

    render(<ControlledHarness />);

    expect(screen.getByTestId('optical-inspector-title')).toHaveTextContent('Controlled Shader');
    expect(screen.getByTestId('optical-material-readout')).toHaveTextContent(
      'blur: 10px · IOR: 1.80 · disp: 55% · spec: 60% · tint: primary'
    );

    fireEvent.click(screen.getByTestId('optical-preset-diamond-prism'));
    expect(onChangeSpy).toHaveBeenLastCalledWith({
      blurPx: 4,
      ior: 2.42,
      dispersion: 94,
      specularPct: 96,
      tint: 'secondary',
    });
    expect(screen.getByTestId('optical-material-readout')).toHaveTextContent(
      'blur: 4px · IOR: 2.42 · disp: 94% · spec: 96% · tint: secondary'
    );

    fireEvent.click(screen.getByTestId('optical-reset-button'));
    expect(onChangeSpy).toHaveBeenLastCalledWith({
      blurPx: 18,
      ior: 1.52,
      dispersion: 42,
      specularPct: 78,
      tint: 'crystal',
    });
    expect(screen.getByTestId('optical-material-readout')).toHaveTextContent(
      'blur: 18px · IOR: 1.52 · disp: 42% · spec: 78% · tint: crystal'
    );
  });

  it('blocks all sliders, presets, tint pills, reset action, and keyboard shortcuts when disabled', () => {
    const onChange = vi.fn<(state: OpticalMaterialState) => void>();

    render(
      <OpticalMaterialInspector
        disabled
        defaultValue={{
          blurPx: 24,
          ior: 1.75,
          dispersion: 60,
          specularPct: 50,
          tint: 'emerald',
        }}
        onChange={onChange}
        data-testid="inspector"
      />
    );

    const root = screen.getByTestId('inspector');
    expect(root).toHaveAttribute('data-disabled', 'true');
    expect(root).toHaveAttribute('aria-disabled', 'true');
    expect(root).toHaveAttribute('tabindex', '-1');

    const blurSlider = screen.getByRole('slider', { name: 'Blur Radius (px)' });
    const iorSlider = screen.getByRole('slider', { name: 'Index of Refraction (IOR 1.00–2.50)' });
    const dispersionSlider = screen.getByRole('slider', { name: 'Chromatic Dispersion (%)' });
    const specularSlider = screen.getByRole('slider', { name: 'Specular Intensity (%)' });

    expect(blurSlider).toBeDisabled();
    expect(iorSlider).toBeDisabled();
    expect(dispersionSlider).toBeDisabled();
    expect(specularSlider).toBeDisabled();
    expect(screen.getByTestId('optical-preset-diamond-prism')).toBeDisabled();
    expect(screen.getByTestId('optical-tint-amber')).toBeDisabled();
    expect(screen.getByTestId('optical-reset-button')).toBeDisabled();

    // Synthetic events while disabled must not mutate or invoke onChange
    fireEvent.change(blurSlider, { target: { value: '48' } });
    fireEvent.change(iorSlider, { target: { value: '2.50' } });
    fireEvent.change(dispersionSlider, { target: { value: '100' } });
    fireEvent.change(specularSlider, { target: { value: '10' } });
    fireEvent.click(screen.getByTestId('optical-preset-diamond-prism'));
    fireEvent.click(screen.getByTestId('optical-tint-amber'));
    fireEvent.click(screen.getByTestId('optical-reset-button'));
    fireEvent.keyDown(root, { key: '2' });
    fireEvent.keyDown(root, { key: 'r' });

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByTestId('optical-material-readout')).toHaveTextContent(
      'blur: 24px · IOR: 1.75 · disp: 60% · spec: 50% · tint: emerald'
    );
  });

  it('sanitizes adversarial NaN, Infinity, out-of-range numbers, malformed runtime tint, and aligns OpticalMaterialPresetMap', () => {
    const malformedTint: OpticalMaterialTint = 'ultraviolet-void' as never;

    const { rerender } = render(
      <OpticalMaterialInspector
        defaultValue={{
          blurPx: 999,
          ior: 0.25,
          dispersion: -40,
          specularPct: 240,
          tint: malformedTint,
        }}
      />
    );

    expect(screen.getByTestId('optical-material-readout')).toHaveTextContent(
      'blur: 48px · IOR: 1.00 · disp: 0% · spec: 100% · tint: crystal'
    );
    expect(screen.getByTestId('optical-snell-readout')).toHaveTextContent('Snell 42° → 42.0°');

    // Non-finite controlled values safely fall back to sanitized defaults
    rerender(
      <OpticalMaterialInspector
        value={{
          blurPx: Number.NaN,
          ior: Number.POSITIVE_INFINITY,
          dispersion: Number.NEGATIVE_INFINITY,
          specularPct: Number.NaN,
          tint: malformedTint,
        }}
      />
    );

    expect(screen.getByTestId('optical-material-readout')).toHaveTextContent(
      'blur: 18px · IOR: 1.52 · disp: 42% · spec: 78% · tint: crystal'
    );

    // Verify OpticalMaterialPresetMap extensible variant map keys align with OpticalMaterialPreset
    const presetMapCheck: Record<keyof OpticalMaterialPresetMap, OpticalMaterialPreset> = {
      'frosted-quartz': 'frosted-quartz',
      'diamond-prism': 'diamond-prism',
      'smoked-obsidian': 'smoked-obsidian',
      'amber-lens': 'amber-lens',
    };
    expect(Object.keys(presetMapCheck)).toHaveLength(4);
  });
});
