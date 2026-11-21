import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import { SankeyDiagram, type SankeyLink, type SankeyNode } from './index';

const FUNNEL_NODES: SankeyNode[] = [
  { id: 'organic', label: 'Organic Search', stage: 0, tone: 'emerald' },
  { id: 'paid', label: 'Paid Social', stage: 0, tone: 'primary' },
  { id: 'trial', label: 'Free Trial', stage: 1, tone: 'secondary' },
  { id: 'demo', label: 'Sales Demo', stage: 1, tone: 'amber' },
  { id: 'closed', label: 'Paid Plan', stage: 2, tone: 'emerald' },
  { id: 'churn', label: 'Drop-off', stage: 2, tone: 'rose' },
];

const FUNNEL_LINKS: SankeyLink[] = [
  { source: 'organic', target: 'trial', value: 120 },
  { source: 'organic', target: 'demo', value: 30 },
  { source: 'paid', target: 'trial', value: 60 },
  { source: 'paid', target: 'demo', value: 40 },
  { source: 'trial', target: 'closed', value: 110.5 },
  { source: 'trial', target: 'churn', value: 69.5 },
  { source: 'demo', target: 'closed', value: 55 },
  { source: 'demo', target: 'churn', value: 15 },
];

describe('SankeyDiagram', () => {
  it('renders optical-glass cubic-bezier ribbons, rounded node bars, stage ordering, forwards ref, and uses semantic CSS tokens only', () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <PrismThemeProvider
        theme={{
          components: {
            SankeyDiagram: {
              className: 'theme-sankey',
              style: { maxWidth: '820px' },
            },
          },
        }}
      >
        <SankeyDiagram
          ref={ref}
          nodes={FUNNEL_NODES}
          links={FUNNEL_LINKS}
          valueUnit="k"
          className="consumer-sankey"
          xstyle={{ '--prism-blur-px': '16px' }}
          data-testid="sankey-root"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('sankey-root');
    expect(ref.current).toBe(root);
    expect(SankeyDiagram.displayName).toBe('SankeyDiagram');
    expect(root).toHaveClass(
      'refractor-sankey-diagram',
      'prism-slab',
      'theme-sankey',
      'consumer-sankey'
    );
    expect(root).toHaveStyle({ maxWidth: '820px' });
    expect(root).not.toHaveAttribute('data-empty');
    expect(root).not.toHaveAttribute('data-selection');

    expect(screen.getByRole('heading', { name: 'Flow Sankey Diagram' })).toBeInTheDocument();
    expect(screen.getByTestId('sankey-summary-pill')).toHaveClass('prism-crystal');
    expect(screen.getByTestId('sankey-summary-pill')).toHaveTextContent(
      '3 stages · 6 nodes · 8 links'
    );
    expect(screen.getByTestId('sankey-total-badge')).toHaveClass('prism-emerald');
    expect(screen.getByTestId('sankey-total-badge')).toHaveTextContent('Flow: 500k');

    const svg = screen.getByRole('img', {
      name: 'Flow Sankey Diagram sankey diagram with 6 nodes and 8 links',
    });
    expect(svg).toHaveAttribute('viewBox', '0 0 640 260');
    expect(svg.innerHTML).not.toMatch(/#[0-9a-fA-F]{3,8}/);
    expect(svg.innerHTML).not.toMatch(/\b(?:rgba?|hsla?)\s*\(/);
    expect(svg.innerHTML).not.toContain('NaN');

    // Stage guides use --prism-divider
    const stageGuides = svg.querySelectorAll('line[data-role="sankey-stage-guide"]');
    expect(stageGuides).toHaveLength(3);
    stageGuides.forEach((guide) => {
      expect(guide).toHaveAttribute('stroke', 'var(--prism-divider)');
    });

    // Rounded node bars (rx=4) positioned across sorted stage columns
    const nodeRects = svg.querySelectorAll('rect[data-role="sankey-node"]');
    expect(nodeRects).toHaveLength(6);
    nodeRects.forEach((rect) => {
      expect(rect).toHaveAttribute('rx', '4');
      expect(rect.getAttribute('fill')).toMatch(/^var\(--prism-/);
    });

    const organicRect = svg.querySelector('rect[data-node-id="organic"]')!;
    const paidRect = svg.querySelector('rect[data-node-id="paid"]')!;
    const trialRect = svg.querySelector('rect[data-node-id="trial"]')!;
    const closedRect = svg.querySelector('rect[data-node-id="closed"]')!;
    const churnRect = svg.querySelector('rect[data-node-id="churn"]')!;

    // Stage columns increase strictly left to right
    expect(Number(organicRect.getAttribute('x'))).toBeLessThan(Number(trialRect.getAttribute('x')));
    expect(Number(trialRect.getAttribute('x'))).toBeLessThan(Number(closedRect.getAttribute('x')));

    // Proportional heights within stage 0: Organic (150) > Paid (100)
    expect(Number(organicRect.getAttribute('height'))).toBeGreaterThan(
      Number(paidRect.getAttribute('height'))
    );
    // Semantic tone mapping
    expect(organicRect).toHaveAttribute('fill', 'var(--prism-success-main)');
    expect(paidRect).toHaveAttribute('fill', 'var(--prism-primary-main)');
    expect(trialRect).toHaveAttribute('fill', 'var(--prism-secondary-main)');
    expect(churnRect).toHaveAttribute('fill', 'var(--prism-error-main)');
    expect(svg.querySelector('rect[data-node-id="demo"]')).toHaveAttribute(
      'fill',
      'var(--prism-warning-main)'
    );

    // Cubic-bezier ribbons (M x1,y1 C mx,y1 mx,y2 x2,y2) with proportional strokeWidth
    const linkPaths = svg.querySelectorAll('path[data-role="sankey-link"]');
    expect(linkPaths).toHaveLength(8);
    linkPaths.forEach((path) => {
      const d = path.getAttribute('d') ?? '';
      expect(d).toMatch(/^M [\d.-]+,[\d.-]+ C [\d.-]+,[\d.-]+ [\d.-]+,[\d.-]+ [\d.-]+,[\d.-]+$/);
      expect(path.getAttribute('stroke')).toMatch(/^var\(--prism-/);
      expect(Number(path.getAttribute('stroke-width'))).toBeGreaterThanOrEqual(1.5);
      expect(path.getAttribute('stroke-opacity')).toBe('0.48');
    });

    // Organic -> Trial (120) must be thicker than Organic -> Demo (30)
    const orgToTrial = svg.querySelector(
      'path[data-source="organic"][data-target="trial"]'
    )!;
    const orgToDemo = svg.querySelector('path[data-source="organic"][data-target="demo"]')!;
    expect(Number(orgToTrial.getAttribute('stroke-width'))).toBeGreaterThan(
      Number(orgToDemo.getAttribute('stroke-width'))
    );

    // Recessed prism-well readout default prompt
    const readout = screen.getByTestId('sankey-diagram-readout');
    expect(readout).toHaveClass('prism-well');
    expect(readout).toHaveTextContent(
      'Select any flow ribbon or node to inspect transfer volume and inflow/outflow summary.'
    );
  });

  it('highlights selected link (0.85 vs 0.25), fires onSelectLink, updates prism-well readout, and supports IME-safe keyboard interaction', () => {
    const onSelectLink = vi.fn();
    render(
      <SankeyDiagram
        title="Revenue Funnel"
        nodes={FUNNEL_NODES}
        links={FUNNEL_LINKS}
        valueUnit="k"
        onSelectLink={onSelectLink}
        data-testid="sankey-interactive"
      />
    );

    const targetRibbon = screen.getByRole('button', {
      name: 'Organic Search → Free Trial: 120k',
    });
    const siblingRibbon = screen.getByRole('button', {
      name: 'Paid Social → Sales Demo: 40k',
    });

    fireEvent.click(targetRibbon);
    expect(onSelectLink).toHaveBeenCalledTimes(1);
    expect(onSelectLink).toHaveBeenCalledWith(FUNNEL_LINKS[0], FUNNEL_NODES[0], FUNNEL_NODES[2]);
    expect(screen.getByTestId('sankey-interactive')).toHaveAttribute('data-selection', 'link');
    expect(targetRibbon).toHaveAttribute('stroke-opacity', '0.85');
    expect(targetRibbon).toHaveAttribute('data-selected', 'true');
    expect(targetRibbon).toHaveAttribute('aria-pressed', 'true');
    expect(siblingRibbon).toHaveAttribute('stroke-opacity', '0.25');
    expect(siblingRibbon).toHaveAttribute('data-selected', 'false');
    expect(screen.getByTestId('sankey-diagram-readout')).toHaveTextContent(
      'Organic Search → Free Trial: 120k'
    );

    // IME composition Enter must be ignored
    fireEvent.keyDown(siblingRibbon, { key: 'Enter', isComposing: true });
    expect(onSelectLink).toHaveBeenCalledTimes(1);

    // Unrelated key must be ignored
    fireEvent.keyDown(siblingRibbon, { key: 'Tab' });
    expect(onSelectLink).toHaveBeenCalledTimes(1);

    // Enter activates sibling ribbon
    fireEvent.keyDown(siblingRibbon, { key: 'Enter' });
    expect(onSelectLink).toHaveBeenLastCalledWith(
      FUNNEL_LINKS[3],
      FUNNEL_NODES[1],
      FUNNEL_NODES[3]
    );
    expect(siblingRibbon).toHaveAttribute('stroke-opacity', '0.85');
    expect(targetRibbon).toHaveAttribute('stroke-opacity', '0.25');
    expect(screen.getByTestId('sankey-diagram-readout')).toHaveTextContent(
      'Paid Social → Sales Demo: 40k'
    );

    // Space activates fractional flow ribbon
    const fractionalRibbon = screen.getByRole('button', {
      name: 'Free Trial → Paid Plan: 110.5k',
    });
    fireEvent.keyDown(fractionalRibbon, { key: ' ' });
    expect(onSelectLink).toHaveBeenLastCalledWith(
      FUNNEL_LINKS[4],
      FUNNEL_NODES[2],
      FUNNEL_NODES[4]
    );
    expect(screen.getByTestId('sankey-diagram-readout')).toHaveTextContent(
      'Free Trial → Paid Plan: 110.5k'
    );

    // Escape clears active selection
    fireEvent.keyDown(fractionalRibbon, { key: 'Escape' });
    expect(screen.getByTestId('sankey-interactive')).not.toHaveAttribute('data-selection');
    expect(fractionalRibbon).toHaveAttribute('stroke-opacity', '0.48');
  });

  it('highlights all incident links and displays node inflow/outflow summary when clicking or keyboard-activating a node', () => {
    render(
      <SankeyDiagram
        nodes={FUNNEL_NODES}
        links={FUNNEL_LINKS}
        valueUnit="k"
        data-testid="sankey-nodes-test"
      />
    );

    const trialNode = screen.getByRole('button', {
      name: 'Free Trial (Stage 1): inflow 180k, outflow 180k',
    });
    const demoNode = screen.getByRole('button', {
      name: 'Sales Demo (Stage 1): inflow 70k, outflow 70k',
    });

    fireEvent.click(trialNode);
    expect(screen.getByTestId('sankey-nodes-test')).toHaveAttribute('data-selection', 'node');
    expect(trialNode).toHaveAttribute('data-selected', 'true');
    expect(trialNode).toHaveAttribute('aria-pressed', 'true');
    expect(trialNode).toHaveAttribute('fill-opacity', '1');
    // Unrelated node dims
    expect(demoNode).toHaveAttribute('fill-opacity', '0.4');
    // Connected neighbor node keeps elevated opacity
    const organicNode = screen.getByRole('button', {
      name: 'Organic Search (Stage 0): inflow 0k, outflow 150k',
    });
    expect(organicNode).toHaveAttribute('fill-opacity', '0.82');

    // Incident links to 'trial' have 0.85 opacity; non-incident links dim to 0.25
    const svg = screen.getByRole('img');
    const links = Array.from(svg.querySelectorAll('path[data-role="sankey-link"]'));
    for (const path of links) {
      const incident =
        path.getAttribute('data-source') === 'trial' ||
        path.getAttribute('data-target') === 'trial';
      expect(path).toHaveAttribute('stroke-opacity', incident ? '0.85' : '0.25');
      expect(path).toHaveAttribute('data-highlighted', incident ? 'true' : 'false');
    }

    const readout = screen.getByTestId('sankey-diagram-readout');
    expect(readout).toHaveTextContent('Free Trial');
    expect(readout).toHaveTextContent('Stage 1');
    expect(readout).toHaveTextContent('Inflow: 180k');
    expect(readout).toHaveTextContent('Outflow: 180k');

    // IME composition Enter on node is ignored
    fireEvent.keyDown(demoNode, { key: 'Enter', isComposing: true });
    expect(trialNode).toHaveAttribute('data-selected', 'true');

    // Non-activation key on node is ignored
    fireEvent.keyDown(demoNode, { key: 'ArrowDown' });
    expect(trialNode).toHaveAttribute('data-selected', 'true');

    // Keyboard Enter selects demo node
    fireEvent.keyDown(demoNode, { key: 'Enter' });
    expect(demoNode).toHaveAttribute('data-selected', 'true');
    expect(readout).toHaveTextContent('Sales Demo');
    expect(readout).toHaveTextContent('Inflow: 70k');
    expect(readout).toHaveTextContent('Outflow: 70k');

    // Space selects organic node
    fireEvent.keyDown(organicNode, { key: ' ' });
    expect(organicNode).toHaveAttribute('data-selected', 'true');
    expect(readout).toHaveTextContent('Inflow: 0k');
    expect(readout).toHaveTextContent('Outflow: 150k');

    // Escape clears node selection
    fireEvent.keyDown(organicNode, { key: 'Escape' });
    expect(screen.getByTestId('sankey-nodes-test')).not.toHaveAttribute('data-selection');
  });

  it('filters invalid links (non-positive, non-finite, self-loops, unknown endpoints), deduplicates nodes, handles unsorted/non-finite stages, feedback loops, parallel links, and crowded columns', () => {
    const complexNodes: SankeyNode[] = [
      { id: 'b', label: 'Stage Two', stage: 2 }, // unsorted stage, omitted tone
      { id: 'a', label: 'Stage Zero', stage: 0 },
      { id: 'a', label: 'Duplicate Ignored', stage: 99 }, // duplicate node ID ignored
      { id: 'nan-stage', label: 'Fallback Stage', stage: Number.NaN }, // sanitized to stage 0
      { id: 'iso', label: 'Isolated Stage', stage: 5 }, // isolated node in its own stage (colFlowTotal === 0)
      { id: 'c1', label: 'Tiny 1', stage: 1 },
      { id: 'c2', label: 'Tiny 2', stage: 1 },
      { id: 'c3', label: 'Tiny 3', stage: 1 },
      { id: 'c4', label: 'Tiny 4', stage: 1 },
      { id: 'c5', label: 'Tiny 5', stage: 1 },
      { id: 'c6', label: 'Tiny 6', stage: 1 },
      { id: 'c7', label: 'Tiny 7', stage: 1 },
      { id: 'c8', label: 'Tiny 8', stage: 1 },
      { id: 'c9', label: 'Tiny 9', stage: 1 },
      { id: 'c10', label: 'Tiny 10', stage: 1 },
      { id: 'c11', label: 'Tiny 11', stage: 1 },
      { id: 'c12', label: 'Tiny 12', stage: 1 },
    ];

    const complexLinks: SankeyLink[] = [
      { source: 'a', target: 'b', value: 100 },
      { source: 'a', target: 'b', value: 50 }, // parallel duplicate edge (same source & target)
      { source: 'b', target: 'a', value: 25 }, // backward feedback link (source.stage > target.stage)
      { source: 'a', target: 'c1', value: 1 },
      { source: 'nan-stage', target: 'a', value: 20 }, // same-stage link (both stage 0)
      // Invalid links that MUST be filtered out:
      { source: 'a', target: 'a', value: 40 }, // self-loop
      { source: 'a', target: 'b', value: 0 }, // zero
      { source: 'a', target: 'b', value: -15 }, // negative
      { source: 'a', target: 'b', value: Number.NaN }, // NaN
      { source: 'a', target: 'b', value: Number.POSITIVE_INFINITY }, // Infinity
      { source: 'missing-src', target: 'b', value: 30 }, // unknown source
      { source: 'a', target: 'missing-tgt', value: 30 }, // unknown target
    ];

    const { rerender } = render(
      <SankeyDiagram nodes={complexNodes} links={complexLinks} height={120} />
    );

    const svg = screen.getByRole('img');
    // Clamped to minimum 160
    expect(svg).toHaveAttribute('viewBox', '0 0 640 160');
    expect(svg.innerHTML).not.toContain('NaN');
    // Only 5 valid links remain
    expect(svg.querySelectorAll('path[data-role="sankey-link"]')).toHaveLength(5);
    // Duplicate 'a' ignored -> 16 unique nodes rendered
    expect(svg.querySelectorAll('rect[data-role="sankey-node"]')).toHaveLength(16);
    expect(screen.queryByText('Duplicate Ignored')).toBeNull();

    // Clicking isolated node renders 0 inflow/outflow and dims all links
    const isoNode = screen.getByRole('button', {
      name: 'Isolated Stage (Stage 5): inflow 0, outflow 0',
    });
    fireEvent.click(isoNode);
    expect(screen.getByTestId('sankey-diagram-readout')).toHaveTextContent('Inflow: 0');
    expect(screen.getByTestId('sankey-diagram-readout')).toHaveTextContent('Outflow: 0');
    svg.querySelectorAll('path[data-role="sankey-link"]').forEach((path) => {
      expect(path).toHaveAttribute('stroke-opacity', '0.25');
    });

    // Click a link when onSelectLink is undefined (no crash) and then shrink links so activeLink resets
    const firstLink = svg.querySelector('path[data-role="sankey-link"]')!;
    fireEvent.click(firstLink);
    expect(screen.getByTestId('sankey-diagram-readout')).toHaveTextContent(
      'Stage Zero → Stage Two: 100'
    );

    // Rerender with single stage + upper height clamp (>520 -> 520) and removed selected link
    rerender(
      <SankeyDiagram
        nodes={[
          { id: 's1', label: 'Alpha', stage: 0, tone: 'primary' },
          { id: 's2', label: 'Beta', stage: 0, tone: 'secondary' },
        ]}
        links={[{ source: 's1', target: 's2', value: 42 }]}
        height={900}
      />
    );
    expect(screen.getByRole('img')).toHaveAttribute('viewBox', '0 0 640 520');
    expect(screen.getByTestId('sankey-summary-pill')).toHaveTextContent(
      '1 stages · 2 nodes · 1 links'
    );
    // Previous link key `sankey-link-0` still exists; select node `s2` then remove it on next rerender
    const betaNode = screen.getByRole('button', {
      name: 'Beta (Stage 0): inflow 42, outflow 0',
    });
    fireEvent.click(betaNode);
    expect(screen.getByTestId('sankey-diagram-readout')).toHaveTextContent('Beta');

    rerender(
      <SankeyDiagram
        nodes={[
          { id: 's1', label: 'Alpha', stage: 0 },
          { id: 's3', label: 'Gamma', stage: 1 },
        ]}
        links={[{ source: 's1', target: 's3', value: 10 }]}
        height={Number.NaN}
      />
    );
    // NaN height falls back to 260, and removed selected node resets gracefully
    expect(screen.getByRole('img')).toHaveAttribute('viewBox', '0 0 640 260');
    expect(screen.getByTestId('sankey-diagram-readout')).toHaveTextContent(
      'Select any flow ribbon or node'
    );

    // Select link at index 0, then shift link list so previously selected link key disappears
    const onlyLink = screen.getByRole('img').querySelector('path[data-role="sankey-link"]')!;
    fireEvent.click(onlyLink);
    rerender(
      <SankeyDiagram
        nodes={[
          { id: 's1', label: 'Alpha', stage: 0 },
          { id: 's3', label: 'Gamma', stage: 1 },
        ]}
        links={[
          { source: 's1', target: 's1', value: 5 }, // index 0 filtered out
          { source: 's1', target: 's3', value: 12 }, // key sankey-link-1
        ]}
      />
    );
    expect(screen.getByTestId('sankey-diagram-readout')).toHaveTextContent(
      'Select any flow ribbon or node'
    );
  });

  it('renders clean empty states when nodes or valid positive links are absent', () => {
    const { rerender } = render(
      <SankeyDiagram nodes={[]} links={[]} data-testid="empty-sankey" />
    );

    expect(screen.getByTestId('empty-sankey')).toHaveAttribute('data-empty', 'true');
    expect(screen.getByTestId('sankey-diagram-empty')).toHaveClass('prism-well');
    expect(screen.getByTestId('sankey-diagram-empty')).toHaveTextContent(
      'No valid flow nodes or positive links to display.'
    );
    expect(screen.queryByRole('img')).toBeNull();
    expect(screen.queryByTestId('sankey-diagram-readout')).toBeNull();
    expect(screen.queryByTestId('sankey-total-badge')).toBeNull();

    // Nodes exist, but links are all invalid
    rerender(
      <SankeyDiagram
        nodes={[
          { id: 'x', label: 'X', stage: 0 },
          { id: 'y', label: 'Y', stage: 1 },
        ]}
        links={[
          { source: 'x', target: 'x', value: 50 },
          { source: 'x', target: 'y', value: 0 },
          { source: 'x', target: 'z', value: 25 },
        ]}
        data-testid="empty-sankey"
      />
    );
    expect(screen.getByTestId('empty-sankey')).toHaveAttribute('data-empty', 'true');
    expect(screen.getByTestId('sankey-diagram-empty')).toBeInTheDocument();
  });

  it('resists prototype pollution via adversarial node IDs and neutralizes XSS strings', () => {
    const onSelectLink = vi.fn();
    const protoNodes: SankeyNode[] = [
      { id: '__proto__', label: 'Proto Source', stage: 0, tone: 'primary' },
      { id: 'constructor', label: 'Constructor Mid', stage: 1, tone: 'secondary' },
      { id: 'prototype', label: 'Prototype Sink', stage: 2, tone: 'emerald' },
    ];
    const protoLinks: SankeyLink[] = [
      { source: '__proto__', target: 'constructor', value: 75 },
      { source: 'constructor', target: 'prototype', value: 75 },
    ];

    const { rerender } = render(
      <SankeyDiagram nodes={protoNodes} links={protoLinks} onSelectLink={onSelectLink} />
    );

    expect(({} as Record<string, string>)['polluted']).toBeUndefined();
    const protoRibbon = screen.getByRole('button', {
      name: 'Proto Source → Constructor Mid: 75',
    });
    fireEvent.click(protoRibbon);
    expect(onSelectLink).toHaveBeenCalledWith(protoLinks[0], protoNodes[0], protoNodes[1]);
    expect(screen.getByTestId('sankey-diagram-readout')).toHaveTextContent(
      'Proto Source → Constructor Mid: 75'
    );

    const payload = '<script>window.__sankeyXss=1</script><img src=x onerror=alert(1)>';
    rerender(
      <SankeyDiagram
        title={payload}
        valueUnit={payload}
        nodes={[
          { id: 'n1', label: payload, stage: 0 },
          { id: 'n2', label: 'Safe Sink', stage: 1 },
        ]}
        links={[{ source: 'n1', target: 'n2', value: 10 }]}
      />
    );
    expect(screen.getByRole('heading', { name: payload })).toBeInTheDocument();
    expect(document.querySelector('script')).toBeNull();
  });
});
