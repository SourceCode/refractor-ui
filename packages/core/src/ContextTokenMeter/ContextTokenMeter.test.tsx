import { createRef } from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import {
  ContextTokenMeter,
  type ContextTokenMeterVariant,
  type ContextTokenSegment,
} from './index';

const SAMPLE_SEGMENTS: ContextTokenSegment[] = [
  { kind: 'system', label: 'System', tokens: 8000 },
  { kind: 'files', label: 'Files', tokens: 32000 },
  { kind: 'tools', label: 'Tools', tokens: 6500 },
  { kind: 'history', label: 'History', tokens: 17500 },
];

describe('ContextTokenMeter', () => {
  it('renders bar variant with semantic segments, ref forwarding, theme overrides, and legend pills', () => {
    const ref = createRef<HTMLDivElement>();

    render(
      <PrismThemeProvider
        theme={{
          components: {
            ContextTokenMeter: {
              className: 'theme-token-meter',
              style: { maxWidth: '540px' },
            },
          },
        }}
      >
        <ContextTokenMeter
          ref={ref}
          segments={SAMPLE_SEGMENTS}
          maxTokens={128000}
          className="local-token-meter"
          xstyle={{ '--prism-blur-px': '20px' }}
          style={{ marginBottom: '8px' }}
          data-testid="meter-root"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('meter-root');
    expect(ref.current).toBe(root);
    expect(ContextTokenMeter.displayName).toBe('ContextTokenMeter');
    expect(root).toHaveClass(
      'refractor-context-token-meter',
      'prism-slab',
      'theme-token-meter',
      'local-token-meter'
    );
    expect(root).toHaveStyle({ maxWidth: '540px', marginBottom: '8px' });
    expect(root).toHaveAttribute('data-variant', 'bar');
    expect(root).toHaveAttribute('data-health', 'normal');
    expect(root).not.toHaveAttribute('data-empty');

    expect(screen.getByTestId('context-token-summary')).toHaveTextContent('64k / 128k tokens');
    expect(screen.queryByTestId('context-token-health')).not.toBeInTheDocument();

    const progressbar = screen.getByRole('progressbar', { name: 'Context Window' });
    expect(progressbar).toHaveClass('prism-well');
    expect(progressbar).toHaveAttribute('aria-valuenow', '50');
    expect(progressbar).toHaveAttribute('aria-valuemin', '0');
    expect(progressbar).toHaveAttribute('aria-valuemax', '100');
    expect(progressbar).toHaveAttribute('aria-valuetext', '50% (64k / 128k tokens)');

    const systemBar = screen.getByTestId('token-segment-system');
    const filesBar = screen.getByTestId('token-segment-files');
    const toolsBar = screen.getByTestId('token-segment-tools');
    const historyBar = screen.getByTestId('token-segment-history');

    expect(systemBar.style.backgroundColor).toBe('var(--prism-secondary-main)');
    expect(filesBar.style.backgroundColor).toBe('var(--prism-primary-main)');
    expect(toolsBar.style.backgroundColor).toBe('var(--prism-success-main)');
    expect(historyBar.style.backgroundColor).toBe('var(--prism-warning-main)');

    const legend = screen.getByTestId('context-token-legend');
    const items = within(legend).getAllByRole('listitem');
    expect(items).toHaveLength(4);
    expect(within(legend).getByText('System')).toBeInTheDocument();
    expect(within(legend).getByText('8k')).toBeInTheDocument();
    expect(within(legend).getByText('32k')).toBeInTheDocument();
    expect(within(legend).getByText('6.5k')).toBeInTheDocument();
    expect(within(legend).getByText('17.5k')).toBeInTheDocument();
  });

  it('renders radial variant with 80x80 optical SVG ring, CSS variable strokes, percent center readout, and progressbar role', () => {
    const radialVariant: ContextTokenMeterVariant = 'radial';

    render(
      <ContextTokenMeter
        variant={radialVariant}
        title="Agent Memory Budget"
        maxTokens={10000}
        segments={[
          { kind: 'system', label: 'Prompt', tokens: 950 },
          { kind: 'files', label: 'Code', tokens: 4050 },
          { kind: 'tools', label: 'Zero Tool', tokens: 0 },
        ]}
        data-testid="radial-root"
      />
    );

    const root = screen.getByTestId('radial-root');
    expect(root).toHaveAttribute('data-variant', 'radial');
    expect(root).toHaveAttribute('data-health', 'normal');

    const progressbar = screen.getByRole('progressbar', { name: 'Agent Memory Budget' });
    expect(progressbar).toHaveAttribute('aria-valuenow', '50');
    expect(progressbar).toHaveAttribute('aria-valuemin', '0');
    expect(progressbar).toHaveAttribute('aria-valuemax', '100');

    expect(screen.getByTestId('context-token-radial-percent')).toHaveTextContent('50%');
    expect(screen.getByTestId('context-token-summary')).toHaveTextContent('5k / 10k tokens');

    const svg = screen.getByTestId('context-token-radial-svg');
    expect(svg).toHaveAttribute('viewBox', '0 0 80 80');
    expect(svg).toHaveAttribute('aria-hidden', 'true');

    const circles = svg.querySelectorAll('circle');
    expect(circles.length).toBe(3); // track + 2 non-zero segments
    circles.forEach((circle) => {
      const stroke = circle.getAttribute('stroke') ?? '';
      expect(stroke.startsWith('var(--prism-')).toBe(true);
    });

    expect(screen.getByTestId('radial-segment-system')).toHaveAttribute(
      'stroke',
      'var(--prism-secondary-main)'
    );
    expect(screen.getByTestId('radial-segment-files')).toHaveAttribute(
      'stroke',
      'var(--prism-primary-main)'
    );
    expect(screen.queryByTestId('radial-segment-tools')).not.toBeInTheDocument();

    // Token formatting below 1000 renders exact integer
    expect(screen.getByText('950')).toBeInTheDocument();
    expect(screen.getByText('4.1k')).toBeInTheDocument();
  });

  it('transitions health states across normal, warning, critical, and overflow while clamping thresholds', () => {
    const { rerender } = render(
      <ContextTokenMeter
        maxTokens={1000}
        segments={[{ kind: 'files', label: 'Docs', tokens: 749 }]}
        data-testid="health-meter"
      />
    );

    expect(screen.getByTestId('health-meter')).toHaveAttribute('data-health', 'normal');
    expect(screen.queryByTestId('context-token-health')).not.toBeInTheDocument();
    expect(screen.getByTestId('context-token-summary')).toHaveTextContent('749 / 1k tokens');

    rerender(
      <ContextTokenMeter
        maxTokens={1000}
        segments={[{ kind: 'files', label: 'Docs', tokens: 760 }]}
        data-testid="health-meter"
      />
    );
    expect(screen.getByTestId('health-meter')).toHaveAttribute('data-health', 'warning');
    const warningPill = screen.getByTestId('context-token-health');
    expect(warningPill).toHaveAttribute('data-health', 'warning');
    expect(warningPill).toHaveTextContent('Warning');
    expect(warningPill.style.color).toBe('var(--prism-warning-main)');

    rerender(
      <ContextTokenMeter
        maxTokens={1000}
        segments={[{ kind: 'history', label: 'Thread', tokens: 920 }]}
        data-testid="health-meter"
      />
    );
    expect(screen.getByTestId('health-meter')).toHaveAttribute('data-health', 'critical');
    const criticalPill = screen.getByTestId('context-token-health');
    expect(criticalPill).toHaveAttribute('data-health', 'critical');
    expect(criticalPill).toHaveTextContent('Critical');
    expect(criticalPill.style.color).toBe('var(--prism-error-main)');

    // Overflow (> 100%) clamps progressbar percent to 100 while preserving true token readout
    rerender(
      <ContextTokenMeter
        maxTokens={1000}
        segments={[
          { kind: 'files', label: 'Repo', tokens: 800 },
          { kind: 'history', label: 'History', tokens: 700 },
        ]}
        data-testid="health-meter"
      />
    );
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');
    expect(screen.getByTestId('context-token-summary')).toHaveTextContent('1.5k / 1k tokens');

    // Out-of-range thresholds clamp warningThreshold to [0.1, 0.95] and criticalThreshold to [warning, 1]
    rerender(
      <ContextTokenMeter
        maxTokens={1000}
        warningThreshold={0.01}
        criticalThreshold={0.02}
        segments={[{ kind: 'system', label: 'Sys', tokens: 120 }]}
        data-testid="health-meter"
      />
    );
    // warning clamped to 0.1, critical clamped to [0.1, 1] => 0.1, so 0.12 triggers critical
    expect(screen.getByTestId('health-meter')).toHaveAttribute('data-health', 'critical');

    rerender(
      <ContextTokenMeter
        maxTokens={1000}
        warningThreshold={Number.NaN}
        criticalThreshold={Number.NaN}
        segments={[{ kind: 'system', label: 'Sys', tokens: 800 }]}
        data-testid="health-meter"
      />
    );
    // NaN falls back to 0.75 warning / 0.9 critical => 0.8 is warning
    expect(screen.getByTestId('health-meter')).toHaveAttribute('data-health', 'warning');
  });

  it('sanitizes negative/NaN/Infinity inputs, handles empty or duplicate segments, and escapes XSS strings', () => {
    const xssTitle = '<script>window.__ctxXss=1</script><img src=x onerror=alert(1)>';
    const xssLabel = '<svg onload=alert(2)>Files';

    const { rerender } = render(
      <ContextTokenMeter
        title={xssTitle}
        maxTokens={0}
        segments={[
          { kind: 'files', label: xssLabel, tokens: -500 },
          { kind: 'files', label: xssLabel, tokens: Number.NaN },
          { kind: 'tools', label: 'Inf', tokens: Number.POSITIVE_INFINITY },
        ]}
        data-testid="adversarial-meter"
      />
    );

    expect(document.querySelector('script')).toBeNull();
    expect(document.querySelector('img')).toBeNull();
    expect(screen.getByText(xssTitle)).toBeInTheDocument();
    expect(screen.getAllByText(xssLabel)).toHaveLength(2);
    expect(screen.getByTestId('context-token-summary')).toHaveTextContent('0 / 1 tokens');
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');

    // Empty segments array renders clean empty state and data-empty="true"
    rerender(
      <ContextTokenMeter
        variant="radial"
        maxTokens={Number.NaN}
        segments={[]}
        data-testid="adversarial-meter"
      />
    );
    expect(screen.getByTestId('adversarial-meter')).toHaveAttribute('data-empty', 'true');
    expect(screen.getByTestId('context-token-empty')).toHaveTextContent(
      'No token segments recorded.'
    );
    expect(screen.getByTestId('context-token-radial-percent')).toHaveTextContent('0%');
    expect(screen.getByTestId('context-token-summary')).toHaveTextContent('0 / 1 tokens');
  });
});
