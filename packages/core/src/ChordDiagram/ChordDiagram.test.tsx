import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import {
  ChordDiagram,
  type ChordEntity,
  type ChordFlow,
} from './index';

const SAMPLE_ENTITIES: ChordEntity[] = [
  { id: 'gateway', label: 'API Gateway', tone: 'primary' },
  { id: 'auth', label: 'Auth Service', tone: 'secondary' },
  { id: 'billing', label: 'Billing Core', tone: 'emerald' },
  { id: 'ledger', label: 'Ledger DB', tone: 'amber' },
];

const SAMPLE_FLOWS: ChordFlow[] = [
  { source: 'gateway', target: 'auth', value: 120 },
  { source: 'gateway', target: 'billing', value: 80 },
  { source: 'auth', target: 'gateway', value: 45 },
  { source: 'billing', target: 'ledger', value: 60 },
];

describe('ChordDiagram', () => {
  it('renders circular entity arcs, quadratic-bezier chord ribbons, forwards ref, merges theme overrides, and uses --prism-* tokens only', () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <PrismThemeProvider
        theme={{
          components: {
            ChordDiagram: { className: 'theme-chord-diagram', style: { maxWidth: '680px' } },
          },
        }}
      >
        <ChordDiagram
          ref={ref}
          entities={SAMPLE_ENTITIES}
          flows={SAMPLE_FLOWS}
          valueUnit="k"
          className="consumer-chord-diagram"
          xstyle={{ '--prism-blur-px': '14px' }}
          data-testid="chord-root"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('chord-root');
    expect(ref.current).toBe(root);
    expect(ChordDiagram.displayName).toBe('ChordDiagram');
    expect(root).toHaveClass(
      'refractor-chord-diagram',
      'prism-slab',
      'theme-chord-diagram',
      'consumer-chord-diagram'
    );
    expect(root).toHaveStyle({ maxWidth: '680px' });
    expect(root).not.toHaveAttribute('data-empty');
    expect(root).not.toHaveAttribute('data-focused');

    const svg = screen.getByRole('img', { name: 'Bi-Directional Chord Flows chord diagram' });
    expect(svg).toHaveAttribute('viewBox', '0 0 280 280');
    expect(svg.innerHTML).not.toMatch(/#[0-9a-fA-F]{3,8}/);
    expect(svg.innerHTML).not.toContain('rgb(');
    expect(svg.innerHTML).not.toContain('hsl(');
    expect(svg.innerHTML).not.toContain('NaN');
    expect(svg.innerHTML).toContain('var(--prism-primary-main)');
    expect(svg.innerHTML).toContain('var(--prism-secondary-main)');
    expect(svg.innerHTML).toContain('var(--prism-success-main)');
    expect(svg.innerHTML).toContain('var(--prism-warning-main)');
    expect(svg.innerHTML).toContain('var(--prism-divider)');

    const arcPaths = screen.getByTestId('chord-arcs').querySelectorAll('path');
    expect(arcPaths).toHaveLength(4);

    const ribbonPaths = screen.getByTestId('chord-ribbons').querySelectorAll('path');
    expect(ribbonPaths).toHaveLength(4);
    ribbonPaths.forEach((ribbon) => {
      const d = ribbon.getAttribute('d') ?? '';
      expect(d).toContain('Q 140,140');
      expect(d).not.toContain('NaN');
      expect(ribbon).toHaveAttribute('opacity', '1');
      expect(ribbon).toHaveAttribute('data-dimmed', 'false');
    });

    const telemetry = screen.getByTestId('chord-diagram-telemetry');
    expect(telemetry).toHaveClass('prism-well');
    expect(telemetry).toHaveTextContent(
      'Select any entity arc or legend pill to inspect bi-directional flows.'
    );
    expect(telemetry).toHaveTextContent('Total Flow: 305k');
  });

  it('highlights connected chords, dims unrelated chords to 0.14, fires onSelectEntity(entity, inbound, outbound), updates telemetry, and clears focus on re-click or Clear Focus', () => {
    const onSelectEntity = vi.fn();
    const { rerender } = render(
      <ChordDiagram
        entities={SAMPLE_ENTITIES}
        flows={SAMPLE_FLOWS}
        title="Mesh Traffic"
        valueUnit="k"
        onSelectEntity={onSelectEntity}
        data-testid="interactive-chord"
      />
    );

    const root = screen.getByTestId('interactive-chord');
    const gatewayArc = screen.getByRole('button', {
      name: 'API Gateway: Outbound 200k, Inbound 45k',
    });

    // Click API Gateway arc -> highlights 3 connected chords, dims billing->ledger to 0.14
    fireEvent.click(gatewayArc);
    expect(root).toHaveAttribute('data-focused', 'true');
    expect(gatewayArc).toHaveAttribute('aria-pressed', 'true');
    expect(gatewayArc).toHaveAttribute('data-selected', 'true');
    expect(onSelectEntity).toHaveBeenCalledTimes(1);
    expect(onSelectEntity).toHaveBeenLastCalledWith(SAMPLE_ENTITIES[0], 45, 200);

    expect(
      screen.getByRole('img', { name: 'Mesh Traffic focused on API Gateway' })
    ).toBeInTheDocument();

    const telemetry = screen.getByTestId('chord-diagram-telemetry');
    expect(telemetry).toHaveTextContent('API Gateway · Outbound: 200k · Inbound: 45k');
    expect(telemetry).toHaveTextContent('3 flows');

    const ribbonsGroup = screen.getByTestId('chord-ribbons');
    const unrelatedRibbon = ribbonsGroup.querySelector(
      '[data-chord-source="billing"][data-chord-target="ledger"]'
    );
    const connectedOutbound = ribbonsGroup.querySelector(
      '[data-chord-source="gateway"][data-chord-target="auth"]'
    );
    const connectedInbound = ribbonsGroup.querySelector(
      '[data-chord-source="auth"][data-chord-target="gateway"]'
    );
    expect(unrelatedRibbon).toHaveAttribute('opacity', '0.14');
    expect(unrelatedRibbon).toHaveAttribute('data-dimmed', 'true');
    expect(unrelatedRibbon).toHaveAttribute('data-highlighted', 'false');
    expect(connectedOutbound).toHaveAttribute('opacity', '1');
    expect(connectedOutbound).toHaveAttribute('data-highlighted', 'true');
    expect(connectedInbound).toHaveAttribute('opacity', '1');
    expect(connectedInbound).toHaveAttribute('data-highlighted', 'true');

    // Unrelated entity arc ('ledger') is visually attenuated while focused on gateway
    const ledgerArc = screen.getByRole('button', {
      name: 'Ledger DB: Outbound 0k, Inbound 60k',
    });
    expect(ledgerArc).toHaveAttribute('fill-opacity', '0.35');

    // Clicking the already-selected entity clears focus cleanly without re-firing callback
    fireEvent.click(gatewayArc);
    expect(root).not.toHaveAttribute('data-focused');
    expect(gatewayArc).toHaveAttribute('aria-pressed', 'false');
    expect(onSelectEntity).toHaveBeenCalledTimes(1);
    expect(unrelatedRibbon).toHaveAttribute('opacity', '1');
    expect(telemetry).toHaveTextContent('Total Flow: 305k');

    // Selecting via legend pill focuses Ledger DB (singular '1 flow')
    const legendGroup = screen.getByRole('group', { name: 'Entity legend' });
    const ledgerPill = within(legendGroup).getByRole('button', { name: /Ledger DB/i });
    fireEvent.click(ledgerPill);
    expect(ledgerPill).toHaveAttribute('aria-pressed', 'true');
    expect(onSelectEntity).toHaveBeenCalledTimes(2);
    expect(onSelectEntity).toHaveBeenLastCalledWith(SAMPLE_ENTITIES[3], 60, 0);
    expect(telemetry).toHaveTextContent('Ledger DB · Outbound: 0k · Inbound: 60k');
    expect(telemetry).toHaveTextContent('1 flow');

    // IME composing Enter and non-activation keys are ignored
    const authPill = within(legendGroup).getByRole('button', { name: /Auth Service/i });
    fireEvent.keyDown(authPill, { key: 'Enter', isComposing: true });
    fireEvent.keyDown(authPill, { key: 'Escape' });
    expect(onSelectEntity).toHaveBeenCalledTimes(2);

    // Keyboard Enter on legend pill switches selection directly to Auth Service
    fireEvent.keyDown(authPill, { key: 'Enter' });
    expect(onSelectEntity).toHaveBeenCalledTimes(3);
    expect(onSelectEntity).toHaveBeenLastCalledWith(SAMPLE_ENTITIES[1], 120, 45);
    expect(telemetry).toHaveTextContent('Auth Service · Outbound: 45k · Inbound: 120k');

    // Clear Focus button in header clears selection cleanly
    fireEvent.click(screen.getByRole('button', { name: 'Clear Focus' }));
    expect(root).not.toHaveAttribute('data-focused');
    expect(screen.queryByRole('button', { name: 'Clear Focus' })).toBeNull();

    // Keyboard Space on SVG arc toggles selection on and off
    const billingArc = screen.getByRole('button', {
      name: 'Billing Core: Outbound 60k, Inbound 80k',
    });
    fireEvent.keyDown(billingArc, { key: ' ' });
    expect(onSelectEntity).toHaveBeenCalledTimes(4);
    expect(onSelectEntity).toHaveBeenLastCalledWith(SAMPLE_ENTITIES[2], 80, 60);
    expect(billingArc).toHaveAttribute('aria-pressed', 'true');

    // Removing currently selected entity on rerender safely resets focus
    rerender(
      <ChordDiagram
        entities={[SAMPLE_ENTITIES[0]!, SAMPLE_ENTITIES[1]!]}
        flows={[{ source: 'gateway', target: 'auth', value: 120 }]}
        title="Mesh Traffic"
        valueUnit="k"
        onSelectEntity={onSelectEntity}
        data-testid="interactive-chord"
      />
    );
    expect(root).not.toHaveAttribute('data-focused');
    expect(screen.getByTestId('chord-diagram-telemetry')).toHaveTextContent('Total Flow: 120k');
  });

  it('filters invalid/dangling flows, handles prototype-polluting IDs, duplicates, self-loops, isolated entities, tiny flows, dominant hub arcs, tone cycling, and size clamping', () => {
    const complexEntities: ChordEntity[] = [
      { id: '__proto__', label: 'Proto Hub' },
      { id: '__proto__', label: 'Duplicate Ignored' },
      { id: 'constructor', label: 'Ctor Node' },
      { id: 'prototype', label: 'Prototype Node' },
      { id: 'toString', label: 'Isolated Node' },
      { id: 'fifth', label: 'Rose Node' },
    ];

    const complexFlows: ChordFlow[] = [
      // Self-loop + dominant volume so '__proto__' spans > PI (largeArcFlag = 1)
      { source: '__proto__', target: '__proto__', value: 500 },
      // Parallel flows between same pair + fractional values
      { source: '__proto__', target: 'constructor', value: 12.5 },
      { source: '__proto__', target: 'constructor', value: 7.25 },
      // Ultra-tiny flow exercising clampVisibleSubArc
      { source: '__proto__', target: 'prototype', value: 0.001 },
      { source: 'fifth', target: '__proto__', value: 2 },
      // Invalid & dangling flows filtered out cleanly
      { source: '__proto__', target: 'constructor', value: 0 },
      { source: '__proto__', target: 'constructor', value: -40 },
      { source: '__proto__', target: 'constructor', value: Number.NaN },
      { source: '__proto__', target: 'constructor', value: Number.POSITIVE_INFINITY },
      { source: 'missing-src', target: 'constructor', value: 50 },
      { source: '__proto__', target: 'missing-tgt', value: 50 },
    ];

    const { rerender } = render(
      <ChordDiagram entities={complexEntities} flows={complexFlows} size={100} />
    );

    // Clamped to lower bound 180
    const svgSmall = screen.getByRole('img');
    expect(svgSmall).toHaveAttribute('viewBox', '0 0 180 180');
    expect(svgSmall.innerHTML).not.toContain('NaN');

    // All 5 semantic tone tokens auto-cycled across the 5 unique entities
    expect(svgSmall.innerHTML).toContain('var(--prism-primary-main)');
    expect(svgSmall.innerHTML).toContain('var(--prism-secondary-main)');
    expect(svgSmall.innerHTML).toContain('var(--prism-success-main)');
    expect(svgSmall.innerHTML).toContain('var(--prism-warning-main)');
    expect(svgSmall.innerHTML).toContain('var(--prism-error-main)');

    // 5 unique entities (duplicate '__proto__' dropped), 5 valid chords rendered
    expect(screen.getByTestId('chord-arcs').querySelectorAll('path')).toHaveLength(5);
    expect(screen.getByTestId('chord-ribbons').querySelectorAll('path')).toHaveLength(5);

    // Prototype was never polluted
    expect(({} as Record<string, string>)['Proto Hub']).toBeUndefined();

    // Dominant hub entity arc uses largeArcFlag = 1
    const hubArc = screen
      .getByTestId('chord-arcs')
      .querySelector('[data-entity-id="__proto__"]');
    expect(hubArc?.getAttribute('d')).toContain(' 0 1 1 ');

    // Clicking isolated entity ('toString') shows 0 outbound / 0 inbound and dims every chord to 0.14
    const isolatedArc = screen.getByRole('button', {
      name: 'Isolated Node: Outbound 0, Inbound 0',
    });
    fireEvent.click(isolatedArc);
    expect(screen.getByTestId('chord-diagram-telemetry')).toHaveTextContent(
      'Isolated Node · Outbound: 0 · Inbound: 0'
    );
    screen
      .getByTestId('chord-ribbons')
      .querySelectorAll('path')
      .forEach((ribbon) => {
        expect(ribbon).toHaveAttribute('opacity', '0.14');
      });

    // Clicking hub node shows formatted fractional outbound (519.75) and inbound (502) without valueUnit
    fireEvent.click(hubArc!);
    expect(screen.getByTestId('chord-diagram-telemetry')).toHaveTextContent(
      'Proto Hub · Outbound: 519.75 · Inbound: 502'
    );

    // Clamp to upper bound 420 and fallback 280 for NaN
    rerender(<ChordDiagram entities={complexEntities} flows={complexFlows} size={900} />);
    expect(screen.getByRole('img')).toHaveAttribute('viewBox', '0 0 420 420');

    rerender(<ChordDiagram entities={complexEntities} flows={complexFlows} size={Number.NaN} />);
    expect(screen.getByRole('img')).toHaveAttribute('viewBox', '0 0 280 280');
  });

  it('renders clean empty states for insufficient entities or zero valid flows and neutralizes XSS payloads', () => {
    const { rerender } = render(
      <ChordDiagram entities={[]} flows={[]} data-testid="empty-chord" />
    );
    expect(screen.getByTestId('empty-chord')).toHaveAttribute('data-empty', 'true');
    expect(screen.getByTestId('chord-diagram-empty')).toHaveTextContent(
      'At least two entities and one positive flow are required to render chords.'
    );
    expect(screen.queryByRole('img')).toBeNull();
    expect(screen.queryByTestId('chord-diagram-telemetry')).toBeNull();

    // Fewer than 2 unique entities
    rerender(
      <ChordDiagram
        entities={[
          { id: 'only', label: 'Only' },
          { id: 'only', label: 'Only Duplicate' },
        ]}
        flows={[{ source: 'only', target: 'only', value: 10 }]}
        data-testid="empty-chord"
      />
    );
    expect(screen.getByTestId('empty-chord')).toHaveAttribute('data-empty', 'true');
    expect(screen.getByTestId('chord-diagram-empty')).toBeInTheDocument();

    // Two valid entities but zero positive valid flows
    rerender(
      <ChordDiagram
        entities={[
          { id: 'a', label: 'A' },
          { id: 'b', label: 'B' },
        ]}
        flows={[
          { source: 'a', target: 'b', value: 0 },
          { source: 'a', target: 'b', value: -5 },
          { source: 'a', target: 'ghost', value: 25 },
        ]}
        data-testid="empty-chord"
      />
    );
    expect(screen.getByTestId('empty-chord')).toHaveAttribute('data-empty', 'true');
    expect(screen.getByTestId('chord-diagram-empty')).toBeInTheDocument();

    // XSS payload neutralization
    const payload = '<script>window.__xss=1</script><img src=x onerror=alert(1)>';
    rerender(
      <ChordDiagram
        title={payload}
        valueUnit={payload}
        entities={[
          { id: 'x1', label: payload, tone: 'primary' },
          { id: 'x2', label: 'Safe Peer', tone: 'rose' },
        ]}
        flows={[{ source: 'x1', target: 'x2', value: 10 }]}
      />
    );
    expect(screen.getByRole('heading', { name: payload })).toBeInTheDocument();
    expect(document.querySelector('script')).toBeNull();
  });
});
