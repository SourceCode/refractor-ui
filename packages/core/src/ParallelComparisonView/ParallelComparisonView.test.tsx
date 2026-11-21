import { createRef } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import { ParallelComparisonView, type ComparisonCandidate } from './index';

const originalClipboardDescriptor = Object.getOwnPropertyDescriptor(navigator, 'clipboard');

function restoreClipboard() {
  if (originalClipboardDescriptor) {
    Object.defineProperty(navigator, 'clipboard', originalClipboardDescriptor);
  } else {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: undefined,
    });
  }
}

const ALPHA_CANDIDATE: ComparisonCandidate = {
  id: 'alpha',
  label: 'Agent Alpha',
  model: 'gemini-2.5-pro',
  output: 'Line 1: Optimized query plan.\nLine 2: Zero redundant joins.',
  latencyMs: 640,
  tokens: 920,
  score: 94.4,
};

const BETA_CANDIDATE: ComparisonCandidate = {
  id: 'beta',
  label: 'Agent Beta',
  model: 'claude-3.7-sonnet',
  output: 'Alternative indexed strategy with composite keys.',
  latencyMs: 1450,
  tokens: 1680,
  score: 88,
};

const SAMPLE_CANDIDATES: ComparisonCandidate[] = [ALPHA_CANDIDATE, BETA_CANDIDATE];

describe('ParallelComparisonView', () => {
  afterEach(() => {
    vi.useRealTimers();
    restoreClipboard();
  });

  it('renders prism-slab header, responsive candidate grid, telemetry badges, theme overrides, and React 19 ref', () => {
    const ref = createRef<HTMLDivElement>();
    const onSelectWinner = vi.fn();

    render(
      <PrismThemeProvider
        theme={{
          components: {
            ParallelComparisonView: {
              className: 'theme-comparison-slab',
              style: { maxWidth: '1040px' },
            },
          },
        }}
      >
        <ParallelComparisonView
          ref={ref}
          candidates={SAMPLE_CANDIDATES}
          defaultWinnerId="alpha"
          onSelectWinner={onSelectWinner}
          className="local-comparison-slab"
          style={{ marginBottom: '8px' }}
          xstyle={{ '--prism-slab-blur-px': '24px' }}
          data-testid="comparison-root"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('comparison-root');
    expect(ref.current).toBe(root);
    expect(root).toHaveAttribute('role', 'region');
    expect(root).toHaveAttribute('aria-labelledby');
    expect(root).toHaveClass(
      'refractor-parallel-comparison-view',
      'prism-slab',
      'theme-comparison-slab',
      'local-comparison-slab'
    );
    expect(root).toHaveStyle({ maxWidth: '1040px', marginBottom: '8px' });
    expect(root.style.getPropertyValue('--prism-slab-blur-px')).toBe('24px');
    expect(root).toHaveAttribute('data-candidate-count', '2');
    expect(root).toHaveAttribute('data-has-winner', 'true');
    expect(root).toHaveAttribute('data-winner-id', 'alpha');

    expect(
      screen.getByRole('heading', { name: 'Parallel Candidate Comparison' })
    ).toBeInTheDocument();
    expect(screen.getByTestId('comparison-candidate-count')).toHaveTextContent('2 candidates');
    expect(screen.getByTestId('comparison-active-winner')).toHaveClass('prism-emerald');
    expect(screen.getByTestId('comparison-active-winner')).toHaveTextContent(
      'Winner: Agent Alpha'
    );

    const alphaCard = root.querySelector('[data-candidate-id="alpha"]') as HTMLElement;
    const betaCard = root.querySelector('[data-candidate-id="beta"]') as HTMLElement;

    expect(alphaCard).toHaveClass('prism-crystal', 'ring-2', 'ring-[var(--prism-primary-main)]');
    expect(alphaCard).toHaveAttribute('data-winner', 'true');
    expect(screen.getByTestId('candidate-winner-badge-alpha')).toHaveClass('prism-emerald');
    expect(screen.getByTestId('candidate-winner-badge-alpha')).toHaveTextContent('Winner');

    expect(betaCard).toHaveClass('prism-crystal');
    expect(betaCard).not.toHaveClass('ring-2');
    expect(betaCard).not.toHaveAttribute('data-winner');
    expect(screen.queryByTestId('candidate-winner-badge-beta')).not.toBeInTheDocument();

    // Telemetry formatting (ms < 1000, seconds >= 1000, locale-independent token grouping, score)
    expect(within(alphaCard).getByText('gemini-2.5-pro')).toBeInTheDocument();
    expect(alphaCard.querySelector('[data-metric="latency"]')).toHaveTextContent('640ms');
    expect(alphaCard.querySelector('[data-metric="tokens"]')).toHaveTextContent('920 tok');
    expect(alphaCard.querySelector('[data-metric="score"]')).toHaveTextContent('Score 94/100');

    expect(betaCard.querySelector('[data-metric="latency"]')).toHaveTextContent('1.5s');
    expect(betaCard.querySelector('[data-metric="tokens"]')).toHaveTextContent('1,680 tok');
    expect(betaCard.querySelector('[data-metric="score"]')).toHaveTextContent('Score 88/100');

    // Literal whitespace-pre-wrap output
    const alphaOutput = screen.getByTestId('candidate-output-alpha');
    expect(alphaOutput).toHaveClass('whitespace-pre-wrap');
    expect(alphaOutput.textContent).toBe(SAMPLE_CANDIDATES[0]?.output);

    // Selection buttons reflect pressed state and optical classes
    const alphaBtn = root.querySelector('[data-candidate-action="alpha"]') as HTMLButtonElement;
    const betaBtn = root.querySelector('[data-candidate-action="beta"]') as HTMLButtonElement;
    expect(alphaBtn).toHaveClass('prism-btn-primary');
    expect(alphaBtn).toHaveAttribute('aria-pressed', 'true');
    expect(alphaBtn).toHaveTextContent('Selected Winner');

    expect(betaBtn).toHaveClass('prism-btn-secondary');
    expect(betaBtn).toHaveAttribute('aria-pressed', 'false');
    expect(betaBtn).toHaveTextContent('Select Winner');

    // Selecting Beta in uncontrolled mode updates winner
    fireEvent.click(betaBtn);
    expect(onSelectWinner).toHaveBeenCalledWith(SAMPLE_CANDIDATES[1]);
    expect(betaBtn).toHaveAttribute('aria-pressed', 'true');
    expect(betaBtn).toHaveClass('prism-btn-primary');
    expect(alphaBtn).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByTestId('comparison-active-winner')).toHaveTextContent('Winner: Agent Beta');

    // Clicking already-selected winner keeps selection and triggers callback without error
    fireEvent.click(betaBtn);
    expect(onSelectWinner).toHaveBeenCalledTimes(2);
  });

  it('supports controlled winnerId mode, custom title/aria-label, and singular candidate count', () => {
    const onSelectWinner = vi.fn();
    const { rerender } = render(
      <ParallelComparisonView
        title="Model Shootout"
        candidates={[ALPHA_CANDIDATE]}
        winnerId=""
        onSelectWinner={onSelectWinner}
        aria-label="Custom shootout region"
        data-testid="controlled-root"
      />
    );

    const root = screen.getByTestId('controlled-root');
    expect(root).toHaveAttribute('aria-label', 'Custom shootout region');
    expect(root).not.toHaveAttribute('aria-labelledby');
    expect(screen.getByTestId('comparison-candidate-count')).toHaveTextContent('1 candidate');
    expect(screen.queryByTestId('comparison-active-winner')).not.toBeInTheDocument();

    const copyBtn = screen.getByRole('button', { name: 'Copy Winner' });
    expect(copyBtn).toBeDisabled();
    expect(copyBtn).toHaveClass('disabled:cursor-not-allowed');

    // Clicking candidate in controlled mode calls onSelectWinner without mutating controlled prop
    fireEvent.click(screen.getByRole('button', { name: 'Select Winner' }));
    expect(onSelectWinner).toHaveBeenCalledWith(ALPHA_CANDIDATE);
    expect(screen.queryByTestId('comparison-active-winner')).not.toBeInTheDocument();

    // Parent updates winnerId -> reflects immediately
    rerender(
      <ParallelComparisonView
        title=""
        candidates={[ALPHA_CANDIDATE]}
        winnerId="alpha"
        onSelectWinner={onSelectWinner}
        data-testid="controlled-root"
      />
    );
    expect(screen.getByTestId('comparison-active-winner')).toHaveTextContent(
      'Winner: Agent Alpha'
    );
    expect(screen.getByRole('button', { name: 'Copy Winner' })).toBeEnabled();
  });

  it('clamps score to 0..100 and omits non-finite or negative telemetry values cleanly', () => {
    const edgeCandidates: ComparisonCandidate[] = [
      {
        id: 'clamped-high',
        label: 'Over Score',
        output: 'High score output',
        score: 142,
        latencyMs: Number.NaN,
        tokens: -50,
      },
      {
        id: 'clamped-low',
        label: 'Under Score',
        output: 'Low score output',
        score: -25,
        latencyMs: -1,
        tokens: Number.POSITIVE_INFINITY,
      },
      {
        id: 'latency-only',
        label: 'Latency Only',
        output: 'Only latency metric provided',
        latencyMs: 320,
      },
      {
        id: 'minimal',
        label: 'Minimal Candidate',
        output: 'Plain output without telemetry',
        score: Number.NaN,
      },
    ];

    render(
      <ParallelComparisonView
        candidates={edgeCandidates}
        defaultWinnerId="missing-id"
        data-testid="edge-root"
      />
    );

    const root = screen.getByTestId('edge-root');
    // Unknown defaultWinnerId leaves activeWinner undefined and Copy Winner disabled
    expect(screen.queryByTestId('comparison-active-winner')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Copy Winner' })).toBeDisabled();

    const highCard = root.querySelector('[data-candidate-id="clamped-high"]') as HTMLElement;
    expect(highCard.querySelector('[data-metric="score"]')).toHaveTextContent('Score 100/100');
    expect(highCard.querySelector('[data-metric="latency"]')).toBeNull();
    expect(highCard.querySelector('[data-metric="tokens"]')).toBeNull();

    const lowCard = root.querySelector('[data-candidate-id="clamped-low"]') as HTMLElement;
    expect(lowCard.querySelector('[data-metric="score"]')).toHaveTextContent('Score 0/100');
    expect(lowCard.querySelector('[data-metric="latency"]')).toBeNull();
    expect(lowCard.querySelector('[data-metric="tokens"]')).toBeNull();

    const latencyOnlyCard = root.querySelector('[data-candidate-id="latency-only"]') as HTMLElement;
    expect(latencyOnlyCard.querySelector('[data-metric="latency"]')).toHaveTextContent('320ms');
    expect(latencyOnlyCard.querySelector('[data-metric="tokens"]')).toBeNull();
    expect(latencyOnlyCard.querySelector('[data-metric="score"]')).toBeNull();

    const minimalCard = root.querySelector('[data-candidate-id="minimal"]') as HTMLElement;
    expect(minimalCard.querySelector('[data-candidate-model]')).toBeNull();
    expect(minimalCard.querySelector('[data-metric]')).toBeNull();
  });

  it('copies active winner output with 1600ms emerald confirmation, resets on winner switch, and cleans up timer on unmount', () => {
    vi.useFakeTimers();
    const writeText = vi.fn(() => Promise.resolve());
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });

    const onCopyWinner = vi.fn();
    const { unmount } = render(
      <ParallelComparisonView
        candidates={SAMPLE_CANDIDATES}
        defaultWinnerId="alpha"
        onCopyWinner={onCopyWinner}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Copy Winner' }));
    expect(writeText).toHaveBeenCalledWith(SAMPLE_CANDIDATES[0]?.output);
    expect(onCopyWinner).toHaveBeenCalledWith(SAMPLE_CANDIDATES[0]);

    const copiedBtn = screen.getByRole('button', { name: 'Copied' });
    expect(copiedBtn).toHaveClass('prism-emerald');
    expect(copiedBtn).toHaveAttribute('data-copied', 'true');
    expect(screen.getByRole('status')).toHaveTextContent(
      'Copied winner "Agent Alpha" output to clipboard.'
    );

    // Still Copied at 1000ms
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByRole('button', { name: 'Copied' })).toBeInTheDocument();

    // Reverts after full 1600ms
    act(() => {
      vi.advanceTimersByTime(600);
    });
    expect(screen.getByRole('button', { name: 'Copy Winner' })).toBeInTheDocument();

    // Switching winner while Copied resets feedback immediately
    fireEvent.click(screen.getByRole('button', { name: 'Copy Winner' }));
    expect(screen.getByRole('button', { name: 'Copied' })).toBeInTheDocument();

    const selectBetaBtn = screen.getByRole('button', { name: 'Select Winner' });
    fireEvent.click(selectBetaBtn);
    expect(screen.getByRole('button', { name: 'Copy Winner' })).toBeInTheDocument();

    // Copy new winner and unmount before 1600ms elapses
    fireEvent.click(screen.getByRole('button', { name: 'Copy Winner' }));
    expect(onCopyWinner).toHaveBeenLastCalledWith(SAMPLE_CANDIDATES[1]);
    unmount();
    act(() => {
      vi.advanceTimersByTime(2000);
    });
  });

  it('gracefully handles missing, rejecting, and throwing clipboard APIs', async () => {
    const onCopyWinner = vi.fn();

    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: undefined,
    });
    render(
      <ParallelComparisonView
        candidates={SAMPLE_CANDIDATES}
        defaultWinnerId="alpha"
        onCopyWinner={onCopyWinner}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Copy Winner' }));
    expect(onCopyWinner).toHaveBeenCalledWith(SAMPLE_CANDIDATES[0]);
    expect(screen.getByRole('button', { name: 'Copied' })).toBeInTheDocument();

    const rejectingWrite = vi.fn(() => Promise.reject(new Error('Clipboard denied')));
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: rejectingWrite },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Copied' }));
    expect(rejectingWrite).toHaveBeenCalledWith(SAMPLE_CANDIDATES[0]?.output);
    await Promise.resolve();

    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      get() {
        throw new Error('Insecure context');
      },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Copied' }));
    expect(onCopyWinner).toHaveBeenCalledTimes(3);
  });

  it('renders clean empty state when candidates array is empty (negative)', () => {
    render(<ParallelComparisonView candidates={[]} data-testid="empty-comparison" />);

    const root = screen.getByTestId('empty-comparison');
    expect(root).toHaveAttribute('data-empty', 'true');
    expect(root).toHaveAttribute('data-candidate-count', '0');
    expect(screen.getByTestId('comparison-candidate-count')).toHaveTextContent('0 candidates');
    expect(screen.getByTestId('comparison-empty-state')).toHaveClass('prism-well');
    expect(screen.getByText('No candidates to compare')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Copy Winner' })).toBeDisabled();
  });

  it('renders adversarial XSS payloads across title, label, model, and output strictly as literal text', () => {
    const xss = '<script>window.__compareXss=1</script><img src=x onerror=alert(1)>';

    render(
      <ParallelComparisonView
        title={xss}
        candidates={[
          {
            id: 'xss-cand',
            label: xss,
            model: xss,
            output: xss,
          },
        ]}
        defaultWinnerId="xss-cand"
      />
    );

    expect(screen.getAllByText(xss)).toHaveLength(4);
    expect(document.querySelector('script')).toBeNull();
    expect(document.querySelector('img')).toBeNull();
  });
});
