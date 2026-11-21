import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import { HandoffDivider, type HandoffArtifact } from './index';

describe('HandoffDivider', () => {
  const SAMPLE_ARTIFACTS: HandoffArtifact[] = [
    { id: 'a-file', label: 'HandoffDivider.tsx', kind: 'file' },
    { id: 'a-summary', label: 'handoff-summary.md', kind: 'summary' },
    { id: 'a-plan', label: 'migration-plan.md', kind: 'plan' },
    { id: 'a-data', label: 'benchmark.json', kind: 'data' },
    { id: 'a-default', label: 'unspecified-kind.ts' },
  ];

  const SAMPLE_PAYLOAD = JSON.stringify(
    {
      task: 'verify-optical-glass',
      strictLint: true,
      coverageThreshold: 96,
    },
    null,
    2
  );

  it('renders flanking hairline rules, prism-crystal delegation badge, timestamp, summary, all artifact kinds, theme overrides, and React 19 ref', () => {
    const ref = createRef<HTMLDivElement>();
    const onArtifactClick = vi.fn();

    render(
      <PrismThemeProvider
        theme={{
          components: {
            HandoffDivider: {
              className: 'theme-handoff-divider',
              style: { maxWidth: '840px' },
            },
          },
        }}
      >
        <HandoffDivider
          ref={ref}
          fromAgent="Orchestrator"
          toAgent="UI Engineer"
          timestamp="09:42:15 UTC"
          summary="Delegating component implementation and strict verification."
          artifacts={SAMPLE_ARTIFACTS}
          onArtifactClick={onArtifactClick}
          className="local-handoff-divider"
          style={{ paddingInline: '12px' }}
          xstyle={{ '--prism-blur-px': '16px' }}
          data-testid="handoff-root"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('handoff-root');
    expect(ref.current).toBe(root);
    expect(root).toHaveAttribute('role', 'region');
    expect(root).toHaveAttribute(
      'aria-label',
      'Agent handoff from Orchestrator to UI Engineer'
    );
    expect(root).toHaveClass(
      'refractor-handoff-divider',
      'theme-handoff-divider',
      'local-handoff-divider'
    );
    expect(root).toHaveStyle({ maxWidth: '840px', paddingInline: '12px' });
    expect(root.style.getPropertyValue('--prism-blur-px')).toBe('16px');
    expect(root).toHaveAttribute('data-has-timestamp', 'true');
    expect(root).toHaveAttribute('data-has-artifacts', 'true');
    expect(root).toHaveAttribute('data-artifact-count', '5');
    expect(root).not.toHaveAttribute('data-has-payload');

    expect(screen.getByTestId('handoff-divider-rule-left')).toHaveClass(
      'refractor-handoff-divider__rule',
      'bg-[var(--prism-divider)]'
    );
    expect(screen.getByTestId('handoff-divider-rule-right')).toHaveClass(
      'refractor-handoff-divider__rule',
      'bg-[var(--prism-divider)]'
    );

    const badge = screen.getByTestId('handoff-divider-badge');
    expect(badge).toHaveClass('refractor-handoff-divider__badge', 'prism-crystal');
    expect(screen.getByTestId('handoff-from-agent')).toHaveTextContent('Orchestrator');
    expect(screen.getByTestId('handoff-arrow-icon')).toBeInTheDocument();
    expect(screen.getByTestId('handoff-to-agent')).toHaveTextContent('UI Engineer');
    expect(screen.getByTestId('handoff-timestamp')).toHaveTextContent('09:42:15 UTC');
    expect(screen.getByTestId('handoff-summary')).toHaveTextContent(
      'Delegating component implementation and strict verification.'
    );

    // Verify all semantic artifact kind icons and default kind fallback
    const fileBtn = root.querySelector('[data-artifact-id="a-file"]') as HTMLButtonElement;
    const summaryBtn = root.querySelector('[data-artifact-id="a-summary"]') as HTMLButtonElement;
    const planBtn = root.querySelector('[data-artifact-id="a-plan"]') as HTMLButtonElement;
    const dataBtn = root.querySelector('[data-artifact-id="a-data"]') as HTMLButtonElement;
    const defaultBtn = root.querySelector('[data-artifact-id="a-default"]') as HTMLButtonElement;

    expect(fileBtn).toHaveClass('prism-crystal', 'prism-focus-ring');
    expect(fileBtn.querySelector('[data-artifact-icon="file"]')).toBeInTheDocument();
    expect(summaryBtn.querySelector('[data-artifact-icon="summary"]')).toBeInTheDocument();
    expect(planBtn.querySelector('[data-artifact-icon="plan"]')).toBeInTheDocument();
    expect(dataBtn.querySelector('[data-artifact-icon="data"]')).toBeInTheDocument();
    expect(defaultBtn).toHaveAttribute('data-artifact-kind', 'file');
    expect(defaultBtn.querySelector('[data-artifact-icon="file"]')).toBeInTheDocument();

    // Clicking artifact pills invokes onArtifactClick with exact artifact record
    fireEvent.click(planBtn);
    expect(onArtifactClick).toHaveBeenCalledTimes(1);
    expect(onArtifactClick).toHaveBeenCalledWith(SAMPLE_ARTIFACTS[2]);

    fireEvent.click(dataBtn);
    expect(onArtifactClick).toHaveBeenCalledTimes(2);
    expect(onArtifactClick).toHaveBeenLastCalledWith(SAMPLE_ARTIFACTS[3]);

    // No payload button rendered when payload is omitted
    expect(screen.queryByRole('button', { name: /payload/i })).not.toBeInTheDocument();
  });

  it('toggles collapsible payload well via Inspect Payload / Hide Payload and respects defaultExpanded', () => {
    const { rerender } = render(
      <HandoffDivider
        fromAgent="Planner"
        toAgent="Tester"
        summary="Handoff with serialized context."
        payload={SAMPLE_PAYLOAD}
        data-testid="payload-root"
      />
    );

    const root = screen.getByTestId('payload-root');
    expect(root).toHaveAttribute('data-has-payload', 'true');
    expect(root).not.toHaveAttribute('data-expanded');
    expect(root).not.toHaveAttribute('data-has-timestamp');
    expect(root).not.toHaveAttribute('data-has-artifacts');
    expect(screen.queryByTestId('handoff-timestamp')).not.toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Handoff artifacts' })).not.toBeInTheDocument();
    expect(screen.queryByTestId('handoff-payload')).not.toBeInTheDocument();

    const inspectBtn = screen.getByRole('button', { name: 'Inspect Payload' });
    expect(inspectBtn).toHaveAttribute('aria-expanded', 'false');
    expect(inspectBtn).toHaveAttribute('aria-controls');

    fireEvent.click(inspectBtn);
    expect(root).toHaveAttribute('data-expanded', 'true');
    const hideBtn = screen.getByRole('button', { name: 'Hide Payload' });
    expect(hideBtn).toHaveAttribute('aria-expanded', 'true');

    const payloadWell = screen.getByTestId('handoff-payload');
    expect(payloadWell).toHaveClass('refractor-handoff-divider__payload', 'prism-well');
    expect(payloadWell.getAttribute('id')).toBe(hideBtn.getAttribute('aria-controls'));
    const codeEl = payloadWell.querySelector('pre > code');
    expect(codeEl?.textContent).toBe(SAMPLE_PAYLOAD);

    fireEvent.click(hideBtn);
    expect(screen.queryByTestId('handoff-payload')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Inspect Payload' })).toHaveAttribute(
      'aria-expanded',
      'false'
    );

    // Remount with defaultExpanded={true}
    rerender(
      <HandoffDivider
        key="expanded-by-default"
        fromAgent="Planner"
        toAgent="Tester"
        summary="Payload starts visible."
        payload={SAMPLE_PAYLOAD}
        defaultExpanded
      />
    );
    expect(screen.getByRole('button', { name: 'Hide Payload' })).toHaveAttribute(
      'aria-expanded',
      'true'
    );
    expect(screen.getByTestId('handoff-payload')).toBeInTheDocument();
  });

  it('handles empty artifacts array, custom aria-label, and omitted onArtifactClick gracefully (negative)', () => {
    const { rerender } = render(
      <HandoffDivider
        fromAgent="Router"
        toAgent="Summarizer"
        summary="No artifacts attached."
        artifacts={[]}
        aria-label="Custom handoff landmark"
        data-testid="empty-artifacts-root"
      />
    );

    const root = screen.getByTestId('empty-artifacts-root');
    expect(root).toHaveAttribute('aria-label', 'Custom handoff landmark');
    expect(root).toHaveAttribute('data-artifact-count', '0');
    expect(screen.queryByRole('group', { name: 'Handoff artifacts' })).not.toBeInTheDocument();

    // Clicking artifact pill when onArtifactClick is omitted does not throw
    rerender(
      <HandoffDivider
        fromAgent="Router"
        toAgent="Summarizer"
        summary="Artifact without click handler."
        artifacts={[{ id: 'solo', label: 'notes.md', kind: 'summary' }]}
      />
    );
    const pill = screen.getByRole('button', { name: 'notes.md' });
    expect(() => fireEvent.click(pill)).not.toThrow();
  });

  it('renders adversarial XSS payloads across all fields strictly as literal text without injecting DOM nodes', () => {
    const xss = '<script>window.__handoffXss=1</script><img src=x onerror=alert(1)>';

    render(
      <HandoffDivider
        fromAgent={xss}
        toAgent={xss}
        timestamp={xss}
        summary={xss}
        artifacts={[{ id: 'xss-artifact', label: xss, kind: 'data' }]}
        payload={xss}
        defaultExpanded
      />
    );

    expect(screen.getAllByText(xss)).toHaveLength(6);
    expect(document.querySelector('script')).toBeNull();
    expect(document.querySelector('img')).toBeNull();
  });
});
