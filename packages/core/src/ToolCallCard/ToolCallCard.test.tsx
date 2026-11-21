import { createRef, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import {
  ToolCallCard,
  type ToolCallCategory,
  type ToolCallField,
} from './index';

describe('ToolCallCard', () => {
  it('renders collapsed by default with monospace toolName, summary, status pill, tabular duration, ref, and theme overrides', () => {
    const ref = createRef<HTMLDivElement>();

    render(
      <PrismThemeProvider
        theme={{
          components: {
            ToolCallCard: { className: 'theme-tool-card', style: { maxWidth: '620px' } },
          },
        }}
      >
        <ToolCallCard
          ref={ref}
          toolName="search_codebase"
          category="search"
          status="success"
          durationMs={145}
          summary="Located optical token definitions"
          inputs={[{ key: 'query', value: '--prism-slab-top' }]}
          className="custom-tool-card"
          xstyle={{ '--prism-blur-px': '18px' }}
          data-testid="tool-root"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('tool-root');
    expect(ref.current).toBe(root);
    expect(root).toHaveClass(
      'refractor-tool-call-card',
      'prism-slab',
      'theme-tool-card',
      'custom-tool-card'
    );
    expect(root).toHaveStyle({ maxWidth: '620px' });
    expect(root).toHaveAttribute('data-category', 'search');
    expect(root).toHaveAttribute('data-status', 'success');
    expect(root).not.toHaveAttribute('data-expanded');

    const trigger = screen.getByRole('button', { name: /search_codebase/ });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).toHaveAttribute('aria-controls');

    expect(screen.getByTestId('tool-call-name')).toHaveTextContent('search_codebase');
    expect(screen.getByTestId('tool-call-summary')).toHaveTextContent(
      'Located optical token definitions'
    );
    expect(screen.getByTestId('tool-call-status')).toHaveTextContent('Success');
    expect(screen.getByTestId('tool-call-status')).toHaveClass('prism-emerald');
    expect(screen.getByTestId('tool-call-duration')).toHaveTextContent('145ms');
    expect(screen.getByTestId('tool-call-chevron')).not.toHaveClass('rotate-180');
    expect(screen.queryByRole('region')).not.toBeInTheDocument();
  });

  it('expands and collapses in uncontrolled mode showing Inputs, Outputs, and Error alert blocks', () => {
    const onExpandedChange = vi.fn();
    const inputs: ToolCallField[] = [
      { key: 'command', value: 'pnpm test:coverage' },
      { key: 'cwd', value: '/workspace/packages/core' },
    ];
    const outputs: ToolCallField[] = [
      { key: 'exitCode', value: '1' },
      { key: 'stderr', value: 'AssertionError: expected 96 >= 98' },
    ];

    render(
      <ToolCallCard
        toolName="run_terminal"
        category="terminal"
        status="error"
        durationMs={2450}
        inputs={inputs}
        outputs={outputs}
        errorMessage="Test suite exited with code 1"
        onExpandedChange={onExpandedChange}
        data-testid="error-card"
      />
    );

    expect(screen.getByTestId('tool-call-status')).toHaveTextContent('Error');
    expect(screen.getByTestId('tool-call-duration')).toHaveTextContent('2.5s');

    const trigger = screen.getByRole('button', { name: /run_terminal/ });
    fireEvent.click(trigger);

    expect(onExpandedChange).toHaveBeenLastCalledWith(true);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByTestId('error-card')).toHaveAttribute('data-expanded', 'true');
    expect(screen.getByTestId('error-card')).toHaveAttribute('data-has-error', 'true');
    expect(screen.getByTestId('tool-call-chevron')).toHaveClass('rotate-180');

    const region = screen.getByRole('region', { name: /run_terminal/ });
    expect(region.id).toBe(trigger.getAttribute('aria-controls'));

    const inputsBlock = within(region).getByTestId('tool-call-inputs');
    expect(within(inputsBlock).getByText('Inputs')).toBeInTheDocument();
    expect(within(inputsBlock).getByText('command')).toBeInTheDocument();
    expect(within(inputsBlock).getByText('pnpm test:coverage')).toBeInTheDocument();

    const outputsBlock = within(region).getByTestId('tool-call-outputs');
    expect(within(outputsBlock).getByText('Outputs')).toBeInTheDocument();
    expect(within(outputsBlock).getByText('exitCode')).toBeInTheDocument();
    expect(within(outputsBlock).getByText('AssertionError: expected 96 >= 98')).toBeInTheDocument();

    const alert = within(region).getByRole('alert');
    expect(alert).toHaveTextContent('Test suite exited with code 1');

    fireEvent.click(trigger);
    expect(onExpandedChange).toHaveBeenLastCalledWith(false);
    expect(screen.queryByRole('region')).not.toBeInTheDocument();
  });

  it('supports controlled expanded state and renders running status pill', () => {
    function ControlledHarness() {
      const [expanded, setExpanded] = useState(false);
      return (
        <div>
          <button type="button" onClick={() => setExpanded(true)}>
            Open Card
          </button>
          <ToolCallCard
            toolName="fetch_schema"
            status="running"
            expanded={expanded}
            onExpandedChange={setExpanded}
            inputs={[{ key: 'endpoint', value: '/api/v1/schema' }]}
          />
        </div>
      );
    }

    render(<ControlledHarness />);
    expect(screen.getByTestId('tool-call-category-icon')).toHaveAttribute('data-category', 'api');
    expect(screen.getByTestId('tool-call-status')).toHaveTextContent('Running');
    expect(screen.queryByRole('region')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Open Card' }));
    expect(screen.getByRole('region')).toBeInTheDocument();
    expect(screen.getByText('/api/v1/schema')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /fetch_schema/ }));
    expect(screen.queryByRole('region')).not.toBeInTheDocument();
  });

  it('renders distinct category icons and screen-reader labels for all six categories', () => {
    const categories: ReadonlyArray<{ category: ToolCallCategory; label: string }> = [
      { category: 'search', label: 'Search tool' },
      { category: 'terminal', label: 'Terminal tool' },
      { category: 'file', label: 'File tool' },
      { category: 'database', label: 'Database tool' },
      { category: 'api', label: 'API tool' },
      { category: 'browser', label: 'Browser tool' },
    ];

    render(
      <div>
        {categories.map((entry) => (
          <ToolCallCard
            key={entry.category}
            toolName={`tool_${entry.category}`}
            category={entry.category}
            status="success"
          />
        ))}
      </div>
    );

    for (const entry of categories) {
      expect(screen.getByText(entry.label)).toBeInTheDocument();
      expect(screen.getByText(`tool_${entry.category}`)).toBeInTheDocument();
    }
  });

  it('renders empty payload notice when expanded with no inputs, outputs, or errorMessage (negative test)', () => {
    render(
      <ToolCallCard
        toolName="noop_ping"
        category="api"
        status="success"
        inputs={[]}
        outputs={[]}
        errorMessage="   "
        defaultExpanded
      />
    );

    expect(screen.getByTestId('tool-call-empty')).toHaveTextContent(
      'No payload details recorded.'
    );
    expect(screen.queryByTestId('tool-call-inputs')).not.toBeInTheDocument();
    expect(screen.queryByTestId('tool-call-outputs')).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('renders outputs-only and errorMessage-only expanded panels cleanly without empty notice', () => {
    const { rerender } = render(
      <ToolCallCard
        toolName="read_metrics"
        category="database"
        status="success"
        outputs={[{ key: 'rows', value: '128' }]}
        defaultExpanded
      />
    );

    expect(screen.queryByTestId('tool-call-inputs')).not.toBeInTheDocument();
    expect(screen.getByTestId('tool-call-outputs')).toHaveTextContent('128');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    rerender(
      <ToolCallCard
        toolName="read_metrics"
        category="database"
        status="error"
        errorMessage="Query timeout after 30s"
        defaultExpanded
      />
    );

    expect(screen.queryByTestId('tool-call-inputs')).not.toBeInTheDocument();
    expect(screen.queryByTestId('tool-call-outputs')).not.toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Query timeout after 30s');
  });

  it('omits negative, NaN, and Infinity durationMs while formatting zero and boundary values cleanly (negative test)', () => {
    const { rerender } = render(
      <ToolCallCard toolName="t_zero" status="success" durationMs={0} />
    );
    expect(screen.getByTestId('tool-call-duration')).toHaveTextContent('0ms');

    rerender(<ToolCallCard toolName="t_boundary" status="success" durationMs={999.6} />);
    expect(screen.getByTestId('tool-call-duration')).toHaveTextContent('1.0s');

    rerender(<ToolCallCard toolName="t_neg" status="success" durationMs={-15} />);
    expect(screen.queryByTestId('tool-call-duration')).not.toBeInTheDocument();

    rerender(<ToolCallCard toolName="t_nan" status="success" durationMs={Number.NaN} />);
    expect(screen.queryByTestId('tool-call-duration')).not.toBeInTheDocument();

    rerender(
      <ToolCallCard toolName="t_inf" status="success" durationMs={Number.POSITIVE_INFINITY} />
    );
    expect(screen.queryByTestId('tool-call-duration')).not.toBeInTheDocument();
  });

  it('renders adversarial XSS payloads as literal text and handles duplicate or prototype-polluting field keys safely', () => {
    const xssPayload = '<script>window.__toolXss=1</script><img src=x onerror=alert(1)>';
    const fields: ToolCallField[] = [
      { key: '__proto__', value: xssPayload },
      { key: '__proto__', value: 'duplicate key second value' },
      { key: 'constructor', value: 'safe value' },
    ];

    render(
      <ToolCallCard
        toolName={xssPayload}
        summary={xssPayload}
        status="error"
        inputs={fields}
        errorMessage={xssPayload}
        defaultExpanded
      />
    );

    expect(document.querySelector('script')).toBeNull();
    expect(document.querySelector('img')).toBeNull();
    expect(screen.getAllByText(xssPayload)).toHaveLength(4);
    expect(screen.getByText('duplicate key second value')).toBeInTheDocument();
    expect(screen.getByText('safe value')).toBeInTheDocument();
    expect(({} as Record<string, string>)['__proto__']).not.toBe(xssPayload);
  });
});
