import { createRef, useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import {
  StructuredOutputViewer,
  type JsonArray,
  type JsonObject,
  type JsonValue,
  type StructuredOutputMode,
} from './index';

const SAMPLE_OBJECT: JsonObject = {
  service: 'refractor-cli',
  replicas: 3,
  healthy: true,
  deprecated: false,
  notes: null,
  tags: ['glass', 'optical'],
  singleItem: ['only'],
  emptyList: [],
  emptyObj: {},
  nested: {
    region: 'us-west-2',
    deep: {
      level3: 'hidden-at-default-depth',
    },
  },
};

const SAMPLE_TABLE_ARRAY: JsonArray = [
  { id: 'svc-1', name: 'Gateway', active: true, latencyMs: 14, meta: { region: 'us' } },
  { id: 'svc-2', name: 'Worker', active: false, extra: ['a', 'b'] },
];

describe('StructuredOutputViewer', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('renders tree mode by default with semantic primitive coloring, ref, theme overrides, and expand/collapse toggles', () => {
    const ref = createRef<HTMLDivElement>();

    render(
      <PrismThemeProvider
        theme={{
          components: {
            StructuredOutputViewer: {
              className: 'theme-structured',
              style: { maxWidth: 720 },
            },
          },
        }}
      >
        <StructuredOutputViewer
          ref={ref}
          title="CLI Telemetry"
          data={SAMPLE_OBJECT}
          className="local-structured"
          xstyle={{ '--prism-blur-px': '20px' }}
          data-testid="structured-viewer"
        />
      </PrismThemeProvider>
    );

    const region = screen.getByTestId('structured-viewer');
    expect(ref.current).toBe(region);
    expect(region).toHaveClass(
      'refractor-structured-output-viewer',
      'prism-slab',
      'theme-structured',
      'local-structured'
    );
    expect(region).toHaveAttribute('data-mode', 'tree');
    expect(region).toHaveStyle({ maxWidth: '720px' });
    expect(screen.getByRole('region', { name: 'CLI Telemetry' })).toBe(region);

    // Tablist semantics
    const tablist = screen.getByRole('tablist', { name: 'Output view mode' });
    expect(within(tablist).getByRole('tab', { name: 'Tree' })).toHaveAttribute(
      'aria-selected',
      'true'
    );
    expect(within(tablist).getByRole('tab', { name: 'Table' })).toHaveAttribute(
      'aria-selected',
      'false'
    );
    expect(within(tablist).getByRole('tab', { name: 'Raw' })).toHaveAttribute(
      'aria-selected',
      'false'
    );

    // Semantic primitive nodes rendered at depth <= 2
    expect(screen.getByText('"refractor-cli"')).toHaveAttribute('data-json-type', 'string');
    expect(screen.getByText('3')).toHaveAttribute('data-json-type', 'number');
    expect(screen.getByText('true')).toHaveAttribute('data-json-type', 'boolean');
    expect(screen.getByText('false')).toHaveAttribute('data-json-type', 'boolean');
    expect(screen.getByText('null')).toHaveAttribute('data-json-type', 'null');
    expect(screen.getByText('Empty array')).toBeInTheDocument();
    expect(screen.getByText('Empty object')).toBeInTheDocument();
    expect(screen.getByText('[1 item]')).toBeInTheDocument();

    // Depth 2 node (`deep`) starts collapsed because defaultExpandedDepth=2 (depth < 2 expanded)
    expect(screen.queryByText('"hidden-at-default-depth"')).not.toBeInTheDocument();
    const deepToggle = screen.getByRole('button', { name: /deep:/i });
    expect(deepToggle).toHaveAttribute('aria-expanded', 'false');

    // Expanding reveals level3
    fireEvent.click(deepToggle);
    expect(deepToggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('"hidden-at-default-depth"')).toBeInTheDocument();

    // Collapsing hides it again
    fireEvent.click(deepToggle);
    expect(deepToggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('"hidden-at-default-depth"')).not.toBeInTheDocument();

    // Collapse root object
    const rootToggle = screen.getByRole('button', { name: /^Object/i });
    expect(rootToggle).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(rootToggle);
    expect(rootToggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('"refractor-cli"')).not.toBeInTheDocument();
  });

  it('switches modes via tabs and keyboard ArrowLeft/ArrowRight (IME-safe) and supports controlled mode', () => {
    const onModeChange = vi.fn<(next: StructuredOutputMode) => void>();

    function ControlledViewer() {
      const [mode, setMode] = useState<StructuredOutputMode>('tree');
      return (
        <StructuredOutputViewer
          data={SAMPLE_TABLE_ARRAY}
          mode={mode}
          onModeChange={(next) => {
            onModeChange(next);
            setMode(next);
          }}
          data-testid="controlled-viewer"
        />
      );
    }

    render(<ControlledViewer />);

    const treeTab = screen.getByRole('tab', { name: 'Tree' });
    // IME composition and non-arrow keys should be ignored
    fireEvent.keyDown(treeTab, { key: 'ArrowRight', isComposing: true });
    fireEvent.keyDown(treeTab, { key: 'Home' });
    expect(onModeChange).not.toHaveBeenCalled();

    // ArrowRight moves Tree -> Table
    fireEvent.keyDown(treeTab, { key: 'ArrowRight' });
    expect(onModeChange).toHaveBeenLastCalledWith('table');
    expect(screen.getByTestId('controlled-viewer')).toHaveAttribute('data-mode', 'table');

    // Unified columns table rendered with <thead> and <tbody>
    const table = screen.getByRole('table');
    expect(table.querySelector('thead')).not.toBeNull();
    expect(table.querySelector('tbody')).not.toBeNull();
    expect(screen.getByRole('columnheader', { name: 'id' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'name' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'active' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'latencyMs' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'meta' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'extra' })).toBeInTheDocument();
    // Missing cells display em-dash
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(2);
    // Nested object & array cells serialize compactly
    expect(screen.getByText('{"region":"us"}')).toBeInTheDocument();
    expect(screen.getByText('["a","b"]')).toBeInTheDocument();

    // ArrowRight moves Table -> Raw
    const tableTab = screen.getByRole('tab', { name: 'Table' });
    fireEvent.keyDown(tableTab, { key: 'ArrowRight' });
    expect(onModeChange).toHaveBeenLastCalledWith('raw');
    expect(screen.getByTestId('controlled-viewer')).toHaveAttribute('data-mode', 'raw');

    const codeEl = document.querySelector('pre code');
    expect(codeEl?.textContent).toBe(JSON.stringify(SAMPLE_TABLE_ARRAY, null, 2));

    // ArrowLeft wraps Raw -> Table, then Table -> Tree, then Tree -> Raw
    const rawTab = screen.getByRole('tab', { name: 'Raw' });
    fireEvent.keyDown(rawTab, { key: 'ArrowLeft' });
    expect(onModeChange).toHaveBeenLastCalledWith('table');

    fireEvent.keyDown(screen.getByRole('tab', { name: 'Table' }), { key: 'ArrowLeft' });
    expect(onModeChange).toHaveBeenLastCalledWith('tree');

    fireEvent.keyDown(screen.getByRole('tab', { name: 'Tree' }), { key: 'ArrowLeft' });
    expect(onModeChange).toHaveBeenLastCalledWith('raw');

    // Direct tab click
    fireEvent.click(screen.getByRole('tab', { name: 'Tree' }));
    expect(onModeChange).toHaveBeenLastCalledWith('tree');
  });

  it('renders 2-column Key/Value table for single JsonObject and empty object fallback row', () => {
    const singleObj: JsonObject = { host: 'localhost', port: 8080 };
    const { rerender } = render(
      <StructuredOutputViewer data={singleObj} defaultMode="table" />
    );

    expect(screen.getByRole('columnheader', { name: 'Key' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Value' })).toBeInTheDocument();
    expect(screen.getByRole('rowheader', { name: 'host' })).toBeInTheDocument();
    expect(screen.getByText('"localhost"')).toBeInTheDocument();
    expect(screen.getByText('8080')).toBeInTheDocument();

    rerender(<StructuredOutputViewer data={{}} defaultMode="table" />);
    expect(screen.getByText('Empty object — no properties to display.')).toBeInTheDocument();
  });

  it('renders clean summary cards in Table mode for scalars, empty arrays, non-object arrays, and arrays of empty objects (negative tests)', () => {
    const { rerender } = render(<StructuredOutputViewer data={[]} defaultMode="table" />);
    expect(screen.getByTestId('structured-table-summary')).toHaveTextContent('Empty Array');

    rerender(<StructuredOutputViewer data={[1, 'two', true]} defaultMode="table" />);
    expect(screen.getByTestId('structured-table-summary')).toHaveTextContent('Non-Object Array');
    expect(screen.getByTestId('structured-table-summary')).toHaveTextContent('3 non-object items');

    rerender(<StructuredOutputViewer data={[{}, {}]} defaultMode="table" />);
    expect(screen.getByTestId('structured-table-summary')).toHaveTextContent(
      'No Displayable Columns'
    );

    rerender(<StructuredOutputViewer data="plain-scalar" defaultMode="table" />);
    expect(screen.getByTestId('structured-table-summary')).toHaveTextContent(
      'Scalar Value (string)'
    );
    expect(screen.getByText('"plain-scalar"')).toBeInTheDocument();

    rerender(<StructuredOutputViewer data={null} defaultMode="table" />);
    expect(screen.getByTestId('structured-table-summary')).toHaveTextContent(
      'Scalar Value (null)'
    );

    // Root primitive in Tree mode renders cleanly without toggle buttons
    rerender(<StructuredOutputViewer data={42} defaultMode="tree" />);
    expect(screen.getByText('42')).toHaveAttribute('data-json-type', 'number');
    expect(screen.queryByRole('button', { expanded: true })).not.toBeInTheDocument();
  });

  it('copies formatted JSON with emerald feedback, handles double-click timer reset, unmount cleanup, and missing/rejecting/throwing clipboard', () => {
    vi.useFakeTimers();
    const writeText = vi.fn<(text: string) => Promise<void>>().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });

    const onCopy = vi.fn<(raw: string) => void>();
    const payload: JsonObject = { ok: true };
    const expectedJson = JSON.stringify(payload, null, 2);

    const { unmount } = render(
      <StructuredOutputViewer data={payload} onCopy={onCopy} />
    );

    const copyBtn = screen.getByRole('button', { name: 'Copy JSON' });
    fireEvent.click(copyBtn);
    expect(writeText).toHaveBeenCalledWith(expectedJson);
    expect(onCopy).toHaveBeenCalledWith(expectedJson);
    expect(screen.getByRole('button', { name: 'Copied JSON' })).toHaveClass('prism-emerald');

    // Clicking again before expiry resets the timeout cleanly
    fireEvent.click(screen.getByRole('button', { name: 'Copied JSON' }));
    expect(onCopy).toHaveBeenCalledTimes(2);

    act(() => {
      vi.advanceTimersByTime(1800);
    });
    expect(screen.getByRole('button', { name: 'Copy JSON' })).not.toHaveClass('prism-emerald');

    // Trigger copy and unmount before timeout fires (tests cleanup)
    fireEvent.click(screen.getByRole('button', { name: 'Copy JSON' }));
    unmount();
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    // Rejecting clipboard promise does not crash or cause unhandled rejection
    const rejectingWrite = vi
      .fn<(text: string) => Promise<void>>()
      .mockRejectedValue(new Error('denied'));
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: rejectingWrite },
      configurable: true,
    });
    const { unmount: unmountReject } = render(
      <StructuredOutputViewer data={payload} onCopy={onCopy} />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Copy JSON' }));
    expect(rejectingWrite).toHaveBeenCalledWith(expectedJson);
    expect(screen.getByRole('button', { name: 'Copied JSON' })).toBeInTheDocument();
    unmountReject();

    // Missing clipboard handles gracefully
    Object.defineProperty(navigator, 'clipboard', {
      value: undefined,
      configurable: true,
    });
    const { unmount: unmountMissing } = render(
      <StructuredOutputViewer data={payload} onCopy={onCopy} />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Copy JSON' }));
    expect(screen.getByRole('button', { name: 'Copied JSON' })).toBeInTheDocument();
    unmountMissing();

    // Throwing clipboard getter is caught gracefully
    Object.defineProperty(navigator, 'clipboard', {
      get() {
        throw new Error('restricted');
      },
      configurable: true,
    });
    render(<StructuredOutputViewer data={payload} onCopy={onCopy} />);
    fireEvent.click(screen.getByRole('button', { name: 'Copy JSON' }));
    expect(screen.getByRole('button', { name: 'Copied JSON' })).toBeInTheDocument();
  });

  it('clamps defaultExpandedDepth, caps tree recursion at max depth 12, handles circular data, filters prototype keys, and renders XSS literally (adversarial)', () => {
    // Build a 14-level deep nested object + array to verify MAX_TREE_DEPTH = 12
    let deepObj: JsonObject = { leaf: 'unreachable' };
    for (let i = 0; i < 13; i += 1) {
      deepObj = { child: deepObj };
    }
    const deepArr: JsonArray = [[[[[[[[[[[[['too-deep']]]]]]]]]]]]];

    // Pass NaN / out-of-range defaultExpandedDepth; defaultExpandedDepth clamps to 0..8
    const { rerender } = render(
      <StructuredOutputViewer data={deepObj} defaultExpandedDepth={99} />
    );
    // Clamped to 8, so depth 8 node starts collapsed; expand down to depth 12
    for (let step = 0; step < 5; step += 1) {
      const collapsed = screen.queryAllByRole('button', { expanded: false });
      collapsed.forEach((btn) => fireEvent.click(btn));
    }
    expect(screen.getByText('{Max depth 12 reached}')).toBeInTheDocument();

    rerender(<StructuredOutputViewer data={deepArr} defaultExpandedDepth={8} />);
    for (let step = 0; step < 5; step += 1) {
      const collapsed = screen.queryAllByRole('button', { expanded: false });
      collapsed.forEach((btn) => fireEvent.click(btn));
    }
    expect(screen.getByText('[Max depth 12 reached]')).toBeInTheDocument();

    // Prototype-polluting own keys + XSS strings
    const xss = '<script>window.__structuredXss=1</script><img src=x onerror=alert(1)>';
    const adversarialObj: JsonObject = { safeKey: xss };
    Object.defineProperty(adversarialObj, '__proto__', {
      value: 'polluted',
      enumerable: true,
    });
    Object.defineProperty(adversarialObj, 'constructor', {
      value: 'polluted-ctor',
      enumerable: true,
    });
    Object.defineProperty(adversarialObj, 'prototype', {
      value: 'polluted-proto',
      enumerable: true,
    });

    rerender(
      <StructuredOutputViewer
        title={xss}
        data={adversarialObj}
        defaultExpandedDepth={Number.NaN}
      />
    );
    expect(document.querySelector('script')).toBeNull();
    expect(screen.getByRole('heading', { name: xss })).toHaveTextContent(xss);
    expect(screen.getByText(`"${xss}"`)).toBeInTheDocument();
    expect(screen.queryByText('__proto__:')).not.toBeInTheDocument();
    expect(screen.queryByText('constructor:')).not.toBeInTheDocument();
    expect(screen.queryByText('prototype:')).not.toBeInTheDocument();

    // Switch to Table mode with array containing prototype-polluting keys
    const adversarialRows: JsonValue = [adversarialObj];
    rerender(<StructuredOutputViewer data={adversarialRows} mode="table" />);
    expect(screen.getByRole('columnheader', { name: 'safeKey' })).toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: '__proto__' })).not.toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: 'constructor' })).not.toBeInTheDocument();

    // Circular object does not crash Raw mode
    const circular: JsonObject = { name: 'loop' };
    circular.self = circular;
    rerender(<StructuredOutputViewer data={circular} mode="raw" />);
    expect(screen.getByText('[Circular or unserializable JSON value]')).toBeInTheDocument();
  });
});
