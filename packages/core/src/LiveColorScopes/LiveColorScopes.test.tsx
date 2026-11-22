import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import {
  CLIP_WARNING_THRESHOLD_PCT,
  DEFAULT_HISTOGRAM,
  DEFAULT_VECTOR_SAMPLES,
  DEFAULT_WAVEFORM_COLUMNS,
  LiveColorScopes,
  WAVEFORM_WARNING_IRE,
  type ColorScopeMode,
  type ColorScopeModeMap,
  type ScopeHistogramBins,
  type VectorscopeSample,
} from './index';

describe('LiveColorScopes', () => {
  it('renders all three optical SVG scopes with deterministic defaults, --prism-* tokens, ref, and theme overrides', () => {
    const ref = createRef<HTMLDivElement>();
    const modeMap: ColorScopeModeMap = {
      histogram: true,
      waveform: true,
      vectorscope: true,
      all: true,
    };
    expect(Object.keys(modeMap)).toHaveLength(4);
    expect(CLIP_WARNING_THRESHOLD_PCT).toBe(1);
    expect(WAVEFORM_WARNING_IRE).toBe(90);
    expect(DEFAULT_HISTOGRAM.luma).toHaveLength(32);
    expect(DEFAULT_WAVEFORM_COLUMNS).toHaveLength(24);
    expect(DEFAULT_VECTOR_SAMPLES).toHaveLength(36);

    render(
      <PrismThemeProvider
        theme={{
          components: {
            LiveColorScopes: {
              className: 'theme-color-scopes',
              style: { maxWidth: '960px' },
            },
          },
        }}
      >
        <LiveColorScopes
          ref={ref}
          className="local-color-scopes"
          xstyle={{ '--prism-blur-px': '20px' }}
          style={{ marginTop: '8px' }}
          data-testid="scopes-root"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('scopes-root');
    expect(ref.current).toBe(root);
    expect(LiveColorScopes.displayName).toBe('LiveColorScopes');
    expect(root).toHaveClass(
      'refractor-live-color-scopes',
      'prism-slab',
      'theme-color-scopes',
      'local-color-scopes'
    );
    expect(root).toHaveStyle({ maxWidth: '960px', marginTop: '8px' });
    expect(root).toHaveAttribute('role', 'region');
    expect(root).toHaveAttribute('data-mode', 'all');
    expect(root).not.toHaveAttribute('data-shadow-clipping');
    expect(root).toHaveAttribute('data-highlight-clipping', 'true');

    expect(screen.getByTestId('scope-title')).toHaveTextContent('Live Color Scopes');

    // Clip warning pills (default luma: 0.8% shadow nominal, 2.2% highlight warning)
    const shadowPill = screen.getByTestId('scope-shadow-clip-pill');
    const highlightPill = screen.getByTestId('scope-highlight-clip-pill');
    expect(shadowPill).toHaveTextContent('Shadow Clip 0.8%');
    expect(shadowPill).not.toHaveAttribute('data-clipping');
    expect(highlightPill).toHaveTextContent('Highlight Clip 2.2%');
    expect(highlightPill).toHaveAttribute('data-clipping', 'true');
    expect(highlightPill.style.backgroundColor).toBe('var(--prism-error-main)');

    // 1. Histogram SVG
    const histSvg = screen.getByTestId('scope-histogram-svg');
    expect(histSvg).toHaveAttribute('viewBox', '0 0 280 120');
    expect(histSvg).toHaveClass('w-full', 'h-auto');
    expect(histSvg.innerHTML).not.toMatch(/#[0-9a-fA-F]{3,8}/);
    expect(histSvg.innerHTML).not.toContain('NaN');
    expect(screen.getByTestId('scope-histogram-poly-luma')).toHaveAttribute(
      'stroke',
      'var(--prism-text-primary)'
    );
    expect(screen.getByTestId('scope-histogram-poly-red')).toHaveAttribute(
      'stroke',
      'var(--prism-error-main)'
    );
    expect(screen.getByTestId('scope-histogram-poly-green')).toHaveAttribute(
      'stroke',
      'var(--prism-success-main)'
    );
    expect(screen.getByTestId('scope-histogram-poly-blue')).toHaveAttribute(
      'stroke',
      'var(--prism-info-main)'
    );

    // 2. Waveform SVG
    const waveSvg = screen.getByTestId('scope-waveform-svg');
    expect(waveSvg).toHaveAttribute('viewBox', '0 0 280 120');
    expect(waveSvg).toHaveClass('w-full', 'h-auto');
    expect(waveSvg.innerHTML).not.toMatch(/#[0-9a-fA-F]{3,8}/);
    expect(waveSvg.innerHTML).not.toContain('NaN');
    for (const ire of [0, 25, 50, 75, 100]) {
      expect(screen.getByTestId(`scope-waveform-graticule-${ire}`)).toBeInTheDocument();
    }
    const waveDots = screen.getAllByTestId('scope-waveform-dot');
    expect(waveDots).toHaveLength(120);
    const overIreDots = waveDots.filter((dot) => dot.getAttribute('data-over-ire') === 'true');
    expect(overIreDots.length).toBeGreaterThan(0);
    expect(overIreDots[0]).toHaveAttribute('fill', 'var(--prism-warning-main)');
    const safeDot = waveDots.find((dot) => dot.getAttribute('data-over-ire') === null);
    expect(safeDot).toHaveAttribute('fill', 'var(--prism-success-main)');
    expect(screen.getByTestId('scope-waveform-peak-badge')).toHaveTextContent('Peak 96.0 IRE');

    // 3. Vectorscope SVG
    const vecSvg = screen.getByTestId('scope-vectorscope-svg');
    expect(vecSvg).toHaveAttribute('viewBox', '0 0 180 180');
    expect(vecSvg).toHaveClass('w-full', 'h-auto');
    expect(vecSvg.innerHTML).not.toMatch(/#[0-9a-fA-F]{3,8}/);
    expect(vecSvg.innerHTML).not.toContain('NaN');
    expect(screen.getByTestId('scope-vectorscope-safe-ring')).toBeInTheDocument();
    expect(screen.getByTestId('scope-vectorscope-skin-line')).toBeInTheDocument();
    for (const target of ['R', 'Mg', 'B', 'Cy', 'G', 'Yl']) {
      expect(screen.getByTestId(`scope-vectorscope-target-${target}`)).toBeInTheDocument();
    }
    const vecSamples = screen.getAllByTestId('scope-vectorscope-sample');
    expect(vecSamples).toHaveLength(36);
    const primarySamples = vecSamples.filter(
      (dot) => dot.getAttribute('fill') === 'var(--prism-primary-main)'
    );
    const secondarySamples = vecSamples.filter(
      (dot) => dot.getAttribute('fill') === 'var(--prism-secondary-main)'
    );
    expect(primarySamples.length).toBeGreaterThan(0);
    expect(secondarySamples.length).toBeGreaterThan(0);

    // 4. Recessed aria-live="polite" telemetry footer
    const footer = screen.getByTestId('scope-telemetry-footer');
    expect(footer).toHaveClass('prism-well');
    expect(footer).toHaveAttribute('role', 'status');
    expect(footer).toHaveAttribute('aria-live', 'polite');
    expect(screen.getByTestId('scope-telemetry-mode')).toHaveTextContent('Mode: All Scopes');
    expect(screen.getByTestId('scope-telemetry-peak-ire')).toHaveTextContent('Peak 96.0 IRE');
    expect(screen.getByTestId('scope-telemetry-clip')).toHaveTextContent(
      'Shadow 0.8% · Highlight 2.2%'
    );
    expect(screen.getByTestId('scope-telemetry-samples')).toHaveTextContent('188 samples');
  });

  it('switches scope views via click and keyboard navigation (Arrow/Home/End) with IME safety', () => {
    const onModeChange = vi.fn<(mode: ColorScopeMode) => void>();
    render(<LiveColorScopes title="Grading Bay A" onModeChange={onModeChange} />);

    expect(screen.getByTestId('scope-title')).toHaveTextContent('Grading Bay A');

    // Clicking already-active mode is a no-op
    fireEvent.click(screen.getByTestId('scope-mode-all'));
    expect(onModeChange).not.toHaveBeenCalled();

    // Switch to Histogram
    fireEvent.click(screen.getByTestId('scope-mode-histogram'));
    expect(onModeChange).toHaveBeenLastCalledWith('histogram');
    expect(screen.getByTestId('scope-panel-histogram')).toBeInTheDocument();
    expect(screen.queryByTestId('scope-panel-waveform')).not.toBeInTheDocument();
    expect(screen.queryByTestId('scope-panel-vectorscope')).not.toBeInTheDocument();
    expect(screen.getByTestId('scope-telemetry-mode')).toHaveTextContent('Mode: Histogram');
    expect(screen.getByTestId('scope-telemetry-samples')).toHaveTextContent('32 samples');

    // ArrowRight moves Histogram -> Waveform
    fireEvent.keyDown(screen.getByTestId('scope-mode-histogram'), { key: 'ArrowRight' });
    expect(onModeChange).toHaveBeenLastCalledWith('waveform');
    expect(screen.getByTestId('scope-panel-waveform')).toBeInTheDocument();
    expect(screen.getByTestId('scope-telemetry-mode')).toHaveTextContent('Mode: Waveform');
    expect(screen.getByTestId('scope-telemetry-samples')).toHaveTextContent('120 samples');

    // ArrowDown moves Waveform -> Vectorscope
    fireEvent.keyDown(screen.getByTestId('scope-mode-waveform'), { key: 'ArrowDown' });
    expect(onModeChange).toHaveBeenLastCalledWith('vectorscope');
    expect(screen.getByTestId('scope-panel-vectorscope')).toBeInTheDocument();
    expect(screen.getByTestId('scope-telemetry-mode')).toHaveTextContent('Mode: Vectorscope');
    expect(screen.getByTestId('scope-telemetry-samples')).toHaveTextContent('36 samples');

    // ArrowLeft moves Vectorscope -> Waveform
    fireEvent.keyDown(screen.getByTestId('scope-mode-vectorscope'), { key: 'ArrowLeft' });
    expect(onModeChange).toHaveBeenLastCalledWith('waveform');

    // ArrowUp moves Waveform -> Histogram
    fireEvent.keyDown(screen.getByTestId('scope-mode-waveform'), { key: 'ArrowUp' });
    expect(onModeChange).toHaveBeenLastCalledWith('histogram');

    // Home jumps to All, End jumps to Vectorscope
    fireEvent.keyDown(screen.getByTestId('scope-mode-histogram'), { key: 'Home' });
    expect(onModeChange).toHaveBeenLastCalledWith('all');
    expect(screen.getByTestId('scope-panel-histogram')).toBeInTheDocument();
    expect(screen.getByTestId('scope-panel-waveform')).toBeInTheDocument();
    expect(screen.getByTestId('scope-panel-vectorscope')).toBeInTheDocument();

    fireEvent.keyDown(screen.getByTestId('scope-mode-all'), { key: 'End' });
    expect(onModeChange).toHaveBeenLastCalledWith('vectorscope');

    // Unrelated key and IME composing keydown are ignored
    const callCount = onModeChange.mock.calls.length;
    const vecTab = screen.getByTestId('scope-mode-vectorscope');
    fireEvent.keyDown(vecTab, { key: 'Escape' });
    const imeEvent = new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true });
    Object.defineProperty(imeEvent, 'isComposing', { value: true });
    vecTab.dispatchEvent(imeEvent);
    expect(onModeChange).toHaveBeenCalledTimes(callCount);
  });

  it('supports controlled mode prop updates cleanly', () => {
    const onModeChange = vi.fn<(mode: ColorScopeMode) => void>();
    const { rerender } = render(
      <LiveColorScopes mode="waveform" onModeChange={onModeChange} data-testid="ctrl-scopes" />
    );

    expect(screen.getByTestId('ctrl-scopes')).toHaveAttribute('data-mode', 'waveform');
    expect(screen.getByTestId('scope-panel-waveform')).toBeInTheDocument();
    expect(screen.queryByTestId('scope-panel-histogram')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('scope-mode-histogram'));
    expect(onModeChange).toHaveBeenCalledWith('histogram');
    // Remains controlled until parent updates prop
    expect(screen.getByTestId('scope-panel-waveform')).toBeInTheDocument();

    rerender(
      <LiveColorScopes mode="histogram" onModeChange={onModeChange} data-testid="ctrl-scopes" />
    );
    expect(screen.getByTestId('ctrl-scopes')).toHaveAttribute('data-mode', 'histogram');
    expect(screen.getByTestId('scope-panel-histogram')).toBeInTheDocument();
    expect(screen.queryByTestId('scope-panel-waveform')).not.toBeInTheDocument();
  });

  it('toggles RGB + Luma histogram channels via click and IME-safe keyboard Enter/Space', () => {
    render(<LiveColorScopes defaultMode="histogram" />);

    const lumaBtn = screen.getByTestId('scope-channel-luma');
    const redBtn = screen.getByTestId('scope-channel-red');
    const greenBtn = screen.getByTestId('scope-channel-green');
    const blueBtn = screen.getByTestId('scope-channel-blue');

    expect(lumaBtn).toHaveAttribute('aria-pressed', 'true');
    expect(redBtn).toHaveAttribute('aria-pressed', 'true');

    // Toggle via click
    fireEvent.click(redBtn);
    expect(redBtn).toHaveAttribute('aria-pressed', 'false');
    expect(screen.queryByTestId('scope-histogram-poly-red')).not.toBeInTheDocument();

    // Toggle via keyboard Enter and Space
    fireEvent.keyDown(greenBtn, { key: 'Enter' });
    expect(greenBtn).toHaveAttribute('aria-pressed', 'false');
    expect(screen.queryByTestId('scope-histogram-poly-green')).not.toBeInTheDocument();

    fireEvent.keyDown(blueBtn, { key: ' ' });
    expect(blueBtn).toHaveAttribute('aria-pressed', 'false');
    expect(screen.queryByTestId('scope-histogram-poly-blue')).not.toBeInTheDocument();

    // Unrelated key and IME event do not toggle Luma
    fireEvent.keyDown(lumaBtn, { key: 'Escape' });
    const imeEvent = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true });
    Object.defineProperty(imeEvent, 'isComposing', { value: true });
    lumaBtn.dispatchEvent(imeEvent);
    expect(lumaBtn).toHaveAttribute('aria-pressed', 'true');

    // Hiding the final channel shows the all-hidden message
    fireEvent.click(lumaBtn);
    expect(screen.getByTestId('scope-histogram-empty')).toHaveTextContent('All channels hidden');

    // Re-enabling a channel restores its polygon
    fireEvent.click(redBtn);
    expect(redBtn).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('scope-histogram-poly-red')).toBeInTheDocument();
    expect(screen.queryByTestId('scope-histogram-empty')).not.toBeInTheDocument();
  });

  it('computes shadow/highlight clip warnings from histogram bins and respects clamped prop overrides', () => {
    const heavyShadowHistogram: ScopeHistogramBins = {
      luma: [25, 50, 25, 0],
      red: [20, 40, 20, 0],
      green: [25, 50, 25, 0],
      blue: [30, 50, 20, 0],
    };

    const { rerender } = render(
      <LiveColorScopes histogram={heavyShadowHistogram} data-testid="clip-scopes" />
    );

    const shadowPill = screen.getByTestId('scope-shadow-clip-pill');
    const highlightPill = screen.getByTestId('scope-highlight-clip-pill');
    expect(shadowPill).toHaveTextContent('Shadow Clip 25.0%');
    expect(shadowPill).toHaveAttribute('data-clipping', 'true');
    expect(shadowPill.style.backgroundColor).toBe('var(--prism-info-main)');
    expect(shadowPill.style.color).toBe('var(--prism-info-contrast)');

    expect(highlightPill).toHaveTextContent('Highlight Clip 0.0%');
    expect(highlightPill).not.toHaveAttribute('data-clipping');
    expect(screen.getByTestId('clip-scopes')).toHaveAttribute('data-shadow-clipping', 'true');
    expect(screen.getByTestId('clip-scopes')).not.toHaveAttribute('data-highlight-clipping');

    // Prop overrides clamp out-of-range values (-15 -> 0%, 145 -> 100%)
    rerender(
      <LiveColorScopes
        histogram={heavyShadowHistogram}
        shadowClipPct={-15}
        highlightClipPct={145}
        data-testid="clip-scopes"
      />
    );
    expect(screen.getByTestId('scope-shadow-clip-pill')).toHaveTextContent('Shadow Clip 0.0%');
    expect(screen.getByTestId('scope-shadow-clip-pill')).not.toHaveAttribute('data-clipping');
    expect(screen.getByTestId('scope-highlight-clip-pill')).toHaveTextContent(
      'Highlight Clip 100.0%'
    );
    expect(screen.getByTestId('scope-highlight-clip-pill')).toHaveAttribute(
      'data-clipping',
      'true'
    );

    // Non-finite overrides safely fall back to computed histogram values
    rerender(
      <LiveColorScopes
        histogram={heavyShadowHistogram}
        shadowClipPct={Number.NaN}
        highlightClipPct={Number.POSITIVE_INFINITY}
        data-testid="clip-scopes"
      />
    );
    expect(screen.getByTestId('scope-shadow-clip-pill')).toHaveTextContent('Shadow Clip 25.0%');
    expect(screen.getByTestId('scope-highlight-clip-pill')).toHaveTextContent('Highlight Clip 0.0%');
  });

  it('handles empty datasets, zero-energy bins, single-entry edge cases, and non-finite inputs without NaN', () => {
    const emptyHistogram: ScopeHistogramBins = {
      luma: [],
      red: [],
      green: [],
      blue: [],
    };

    const { rerender } = render(
      <LiveColorScopes histogram={emptyHistogram} waveformColumns={[]} vectorSamples={[]} />
    );

    expect(screen.getByTestId('scope-histogram-empty')).toHaveTextContent('No histogram signal');
    expect(screen.getByTestId('scope-waveform-empty')).toHaveTextContent('No waveform signal');
    expect(screen.getByTestId('scope-vectorscope-empty')).toHaveTextContent('No chroma signal');
    expect(screen.getByTestId('scope-waveform-peak-badge')).toHaveTextContent('Peak 0.0 IRE');
    expect(screen.getByTestId('scope-waveform-peak-badge').style.color).toBe(
      'var(--prism-success-main)'
    );
    expect(screen.getByTestId('scope-telemetry-samples')).toHaveTextContent('0 samples');

    // All-zero / negative / NaN histogram bins yield safe 0% clip and empty signal
    rerender(
      <LiveColorScopes
        histogram={{
          luma: [0, -5, Number.NaN, Number.POSITIVE_INFINITY],
          red: [0, 0],
          green: [Number.NEGATIVE_INFINITY],
          blue: [-1],
        }}
        waveformColumns={[[], [Number.NaN, Number.POSITIVE_INFINITY]]}
        vectorSamples={[
          { angleDeg: Number.NaN, saturation: 50 },
          { angleDeg: 120, saturation: Number.POSITIVE_INFINITY },
        ]}
      />
    );
    expect(screen.getByTestId('scope-histogram-empty')).toHaveTextContent('No histogram signal');
    expect(screen.getByTestId('scope-waveform-empty')).toHaveTextContent('No waveform signal');
    expect(screen.getByTestId('scope-vectorscope-empty')).toHaveTextContent('No chroma signal');
    expect(screen.getByTestId('scope-telemetry-clip')).toHaveTextContent(
      'Shadow 0.0% · Highlight 0.0%'
    );

    // Single-bin histogram, single-column waveform, and single valid vector sample (singular "1 sample")
    const singleHistogram: ScopeHistogramBins = {
      luma: [40],
      red: [],
      green: [20],
      blue: [Number.NaN],
    };
    const singleVector: VectorscopeSample[] = [
      { angleDeg: -45, saturation: 150 },
      { angleDeg: Number.NaN, saturation: 30 },
    ];

    rerender(
      <LiveColorScopes
        mode="histogram"
        histogram={singleHistogram}
        waveformColumns={[[45]]}
        vectorSamples={singleVector}
      />
    );
    expect(screen.getByTestId('scope-histogram-poly-luma')).toBeInTheDocument();
    expect(screen.getByTestId('scope-histogram-poly-green')).toBeInTheDocument();
    expect(screen.queryByTestId('scope-histogram-poly-red')).not.toBeInTheDocument();
    expect(screen.getByTestId('scope-histogram-svg').innerHTML).not.toContain('NaN');
    expect(screen.getByTestId('scope-telemetry-samples')).toHaveTextContent('1 sample');

    rerender(
      <LiveColorScopes
        mode="waveform"
        histogram={singleHistogram}
        waveformColumns={[[45]]}
        vectorSamples={singleVector}
      />
    );
    expect(screen.getAllByTestId('scope-waveform-dot')).toHaveLength(1);
    expect(screen.getByTestId('scope-waveform-svg').innerHTML).not.toContain('NaN');
    expect(screen.getByTestId('scope-telemetry-peak-ire')).toHaveTextContent('Peak 45.0 IRE');
    expect(screen.getByTestId('scope-telemetry-samples')).toHaveTextContent('1 sample');

    rerender(
      <LiveColorScopes
        mode="vectorscope"
        histogram={singleHistogram}
        waveformColumns={[[120, -10, 50]]}
        vectorSamples={singleVector}
      />
    );
    const plottedVec = screen.getAllByTestId('scope-vectorscope-sample');
    expect(plottedVec).toHaveLength(1);
    expect(plottedVec[0]).toHaveAttribute('fill', 'var(--prism-primary-main)');
    expect(screen.getByTestId('scope-vectorscope-svg').innerHTML).not.toContain('NaN');
    expect(screen.getByTestId('scope-telemetry-peak-ire')).toHaveTextContent('Peak 100.0 IRE');
    expect(screen.getByTestId('scope-telemetry-samples')).toHaveTextContent('1 sample');
  });
});
