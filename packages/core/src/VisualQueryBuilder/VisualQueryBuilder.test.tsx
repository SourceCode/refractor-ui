import { createRef, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import {
  VisualQueryBuilder,
  formatQueryExpression,
  type QueryFieldSpec,
  type QueryGroupNode,
  type QueryNode,
} from './VisualQueryBuilder';

const SAMPLE_FIELDS: ReadonlyArray<QueryFieldSpec> = [
  { key: 'title', label: 'Title', type: 'text' },
  { key: 'notes', label: 'Notes', type: 'text' },
  { key: 'budget', label: 'Budget', type: 'number' },
  { key: 'created', label: 'Created', type: 'date' },
  {
    key: 'status',
    label: 'Status',
    type: 'select',
    options: ['Active', 'Paused', 'Archived', 'Active'],
  },
  {
    key: 'secondaryStatus',
    label: 'Secondary Status',
    type: 'select',
    options: ['Active', 'Closed'],
  },
  { key: 'emptySelect', label: 'Empty Select', type: 'select' },
];

describe('VisualQueryBuilder', () => {
  it('renders default root group, rule row, live expression preview, ref, and theme overrides', () => {
    const ref = createRef<HTMLDivElement>();

    render(
      <PrismThemeProvider
        theme={{
          components: {
            VisualQueryBuilder: {
              className: 'theme-vqb',
              style: { letterSpacing: '0.3px' },
            },
          },
        }}
      >
        <VisualQueryBuilder
          ref={ref}
          fields={SAMPLE_FIELDS}
          className="local-vqb"
          xstyle={{ '--prism-blur-px': '14px' }}
          data-testid="vqb-root"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('vqb-root');
    expect(ref.current).toBe(root);
    expect(root).toHaveClass(
      'refractor-visual-query-builder',
      'prism-slab',
      'theme-vqb',
      'local-vqb'
    );
    expect(root).toHaveAttribute('data-combinator', 'and');
    expect(root).toHaveAttribute('data-max-depth', '3');
    expect(root).toHaveStyle({ letterSpacing: '0.3px' });

    const andBtn = screen.getByRole('button', { name: 'AND' });
    const orBtn = screen.getByRole('button', { name: 'OR' });
    expect(andBtn).toHaveAttribute('aria-pressed', 'true');
    expect(andBtn).toHaveClass('prism-btn-primary');
    expect(orBtn).toHaveAttribute('aria-pressed', 'false');
    expect(orBtn).toHaveClass('prism-crystal');

    expect(screen.getByRole('region', { name: 'Query preview' })).toHaveTextContent(
      'Title equals ""'
    );
  });

  it('switches fields with type-aware operators, adapts value controls, and hides input for isEmpty', () => {
    const onChange = vi.fn();

    render(<VisualQueryBuilder fields={SAMPLE_FIELDS} onChange={onChange} />);

    const fieldSelect = screen.getByLabelText('Rule field');
    const operatorSelect = screen.getByLabelText('Rule operator');

    // Text field -> contains operator + value
    fireEvent.change(operatorSelect, { target: { value: 'contains' } });
    fireEvent.change(screen.getByLabelText('Rule value'), { target: { value: 'prism' } });
    expect(screen.getByRole('region', { name: 'Query preview' })).toHaveTextContent(
      'Title contains "prism"'
    );

    // Switch to another text field -> retains operator & value
    fireEvent.change(fieldSelect, { target: { value: 'notes' } });
    expect(operatorSelect).toHaveValue('contains');
    expect(screen.getByLabelText('Rule value')).toHaveValue('prism');

    // Switch to number field -> incompatible 'contains' resets to 'equals', value resets, type=number
    fireEvent.change(fieldSelect, { target: { value: 'budget' } });
    expect(operatorSelect).toHaveValue('equals');
    const numberInput = screen.getByLabelText('Rule value');
    expect(numberInput).toHaveAttribute('type', 'number');
    expect(numberInput).toHaveValue(null);

    fireEvent.change(operatorSelect, { target: { value: 'greaterThan' } });
    fireEvent.change(numberInput, { target: { value: '500' } });
    expect(screen.getByRole('region', { name: 'Query preview' })).toHaveTextContent(
      'Budget greater than "500"'
    );

    // Switch to date field -> incompatible 'greaterThan' resets to 'equals', type=date
    fireEvent.change(fieldSelect, { target: { value: 'created' } });
    expect(operatorSelect).toHaveValue('equals');
    const dateInput = screen.getByLabelText('Rule value');
    expect(dateInput).toHaveAttribute('type', 'date');
    fireEvent.change(operatorSelect, { target: { value: 'after' } });
    fireEvent.change(dateInput, { target: { value: '2026-01-01' } });
    expect(screen.getByRole('region', { name: 'Query preview' })).toHaveTextContent(
      'Created after "2026-01-01"'
    );

    // Switch to select field -> incompatible 'after' resets to 'equals', deduplicated <select> options
    fireEvent.change(fieldSelect, { target: { value: 'status' } });
    expect(operatorSelect).toHaveValue('equals');
    const selectVal = screen.getByLabelText('Rule value');
    expect(selectVal.tagName).toBe('SELECT');
    expect(selectVal).toHaveValue('Active');
    expect(within(selectVal).getAllByRole('option')).toHaveLength(3);

    fireEvent.change(selectVal, { target: { value: 'Paused' } });
    expect(screen.getByRole('region', { name: 'Query preview' })).toHaveTextContent(
      'Status equals "Paused"'
    );

    // Switch operator to isEmpty -> hides value input and formats without quotes
    fireEvent.change(operatorSelect, { target: { value: 'isEmpty' } });
    expect(screen.queryByLabelText('Rule value')).not.toBeInTheDocument();
    expect(screen.getByText('No value required')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Query preview' })).toHaveTextContent(
      'Status is empty'
    );

    // Switch back from isEmpty to notEquals on select -> restores first option
    fireEvent.change(operatorSelect, { target: { value: 'notEquals' } });
    expect(screen.getByLabelText('Rule value')).toHaveValue('Active');

    // Switch to another select field containing the same value -> preserves value
    fireEvent.change(fieldSelect, { target: { value: 'secondaryStatus' } });
    expect(screen.getByLabelText('Rule value')).toHaveValue('Active');

    // Switch to select field with empty options, then toggle isEmpty and back
    fireEvent.change(fieldSelect, { target: { value: 'emptySelect' } });
    const emptyVal = screen.getByLabelText('Rule value');
    expect(emptyVal).toBeDisabled();
    expect(emptyVal).toHaveTextContent('No options');

    fireEvent.change(operatorSelect, { target: { value: 'isEmpty' } });
    fireEvent.change(fieldSelect, { target: { value: 'title' } });
    expect(screen.queryByLabelText('Rule value')).not.toBeInTheDocument();

    fireEvent.change(fieldSelect, { target: { value: 'emptySelect' } });
    fireEvent.change(operatorSelect, { target: { value: 'equals' } });
    expect(screen.getByLabelText('Rule value')).toHaveValue('');
  });

  it('builds nested AND/OR groups, toggles JSON AST preview, enforces maxDepth, and supports node removal', () => {
    const onChange = vi.fn();
    const initialAst: QueryGroupNode = {
      kind: 'group',
      id: 'root',
      combinator: 'AND',
      children: [
        { kind: 'rule', id: 'rule-1', field: 'status', operator: 'equals', value: 'Active' },
      ],
    };

    render(
      <VisualQueryBuilder
        fields={SAMPLE_FIELDS}
        defaultValue={initialAst}
        maxDepth={2}
        onChange={onChange}
      />
    );

    // Add second rule to root
    fireEvent.click(screen.getByRole('button', { name: '+ Rule' }));
    const ruleFields = screen.getAllByLabelText('Rule field');
    expect(ruleFields).toHaveLength(2);
    fireEvent.change(ruleFields[1] as HTMLSelectElement, { target: { value: 'created' } });
    const ruleOps = screen.getAllByLabelText('Rule operator');
    fireEvent.change(ruleOps[1] as HTMLSelectElement, { target: { value: 'after' } });
    const ruleVals = screen.getAllByLabelText('Rule value');
    fireEvent.change(ruleVals[1] as HTMLInputElement, { target: { value: '2026-01-01' } });

    expect(screen.getByRole('region', { name: 'Query preview' })).toHaveTextContent(
      'Status equals "Active" AND Created after "2026-01-01"'
    );

    // Add nested group (depth 2 === maxDepth 2)
    fireEvent.click(screen.getByRole('button', { name: '+ Group' }));
    const nestedGroup = screen.getByRole('group', { name: 'Nested query group level 2' });
    expect(nestedGroup).toHaveAttribute('data-depth', '2');

    // At depth === maxDepth (2), nested + Group button MUST be disabled
    const nestedAddGroupBtn = within(nestedGroup).getByRole('button', { name: '+ Group' });
    expect(nestedAddGroupBtn).toBeDisabled();

    // Switch nested group combinator to OR -> prism-emerald class
    const nestedOrBtn = within(nestedGroup).getByRole('button', { name: 'OR' });
    fireEvent.click(nestedOrBtn);
    expect(nestedOrBtn).toHaveClass('prism-emerald');
    expect(nestedOrBtn).toHaveAttribute('aria-pressed', 'true');

    // Add a second rule inside nested group so parentheses appear
    fireEvent.click(within(nestedGroup).getByRole('button', { name: '+ Rule' }));
    const nestedValInputs = within(nestedGroup).getAllByLabelText('Rule value');
    fireEvent.change(nestedValInputs[0] as HTMLInputElement, { target: { value: 'Alpha' } });
    fireEvent.change(nestedValInputs[1] as HTMLInputElement, { target: { value: 'Beta' } });

    expect(screen.getByRole('region', { name: 'Query preview' })).toHaveTextContent(
      'Status equals "Active" AND Created after "2026-01-01" AND (Title equals "Alpha" OR Title equals "Beta")'
    );

    // Toggle preview to JSON AST and verify valid JSON matching immutable AST
    fireEvent.click(screen.getByRole('button', { name: 'JSON AST' }));
    const previewContainer = screen
      .getByRole('region', { name: 'Query preview' })
      .querySelector('[data-preview-mode="json"]');
    expect(previewContainer).not.toBeNull();
    const parsed = JSON.parse(previewContainer?.textContent ?? '{}') as QueryGroupNode;
    expect(parsed.kind).toBe('group');
    expect(parsed.children).toHaveLength(3);

    // Switch back to Expression view
    fireEvent.click(screen.getByRole('button', { name: 'Expression' }));
    expect(
      screen
        .getByRole('region', { name: 'Query preview' })
        .querySelector('[data-preview-mode="expression"]')
    ).not.toBeNull();

    // Remove one rule from nested group, then remove nested group entirely
    const nestedRemoveRuleBtns = within(nestedGroup).getAllByRole('button', {
      name: 'Remove rule',
    });
    fireEvent.click(nestedRemoveRuleBtns[0] as HTMLButtonElement);
    expect(within(nestedGroup).getAllByRole('button', { name: 'Remove rule' })).toHaveLength(1);

    fireEvent.click(within(nestedGroup).getByRole('button', { name: 'Remove group' }));
    expect(screen.queryByRole('group', { name: 'Nested query group level 2' })).not.toBeInTheDocument();

    // Remove remaining rules to test empty group state
    for (const btn of screen.getAllByRole('button', { name: 'Remove rule' })) {
      fireEvent.click(btn);
    }
    expect(
      screen.getByText('No rules in this group. Add a rule or nested group.')
    ).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Query preview' })).toHaveTextContent('(empty query)');

    // Original initialAst must remain unmutated
    expect(initialAst.children).toHaveLength(1);
  });

  it('clamps maxDepth (1..4), supports showPreview=false, and works in controlled mode', () => {
    const { rerender } = render(
      <VisualQueryBuilder fields={SAMPLE_FIELDS} maxDepth={0} showPreview={false} />
    );

    // maxDepth=0 clamps to 1 -> root + Group is disabled
    expect(screen.getByRole('button', { name: '+ Group' })).toBeDisabled();
    expect(screen.queryByRole('region', { name: 'Query preview' })).not.toBeInTheDocument();

    // maxDepth=99 clamps to 4; NaN falls back to 3
    rerender(<VisualQueryBuilder fields={SAMPLE_FIELDS} maxDepth={99} data-testid="vqb-clamp" />);
    expect(screen.getByTestId('vqb-clamp')).toHaveAttribute('data-max-depth', '4');

    rerender(
      <VisualQueryBuilder fields={SAMPLE_FIELDS} maxDepth={Number.NaN} data-testid="vqb-clamp" />
    );
    expect(screen.getByTestId('vqb-clamp')).toHaveAttribute('data-max-depth', '3');

    function ControlledHarness() {
      const [ast, setAst] = useState<QueryGroupNode>({
        kind: 'group',
        id: 'root',
        combinator: 'OR',
        children: [
          { kind: 'rule', id: 'r1', field: 'title', operator: 'startsWith', value: 'Glass' },
        ],
      });
      return <VisualQueryBuilder fields={SAMPLE_FIELDS} value={ast} onChange={setAst} />;
    }

    render(<ControlledHarness />);
    expect(screen.getByText('Title starts with "Glass"')).toBeInTheDocument();
  });

  it('guards IME composition on value input Enter keydown', () => {
    render(<VisualQueryBuilder fields={SAMPLE_FIELDS} />);
    const input = screen.getByLabelText('Rule value');

    const composingEnter = new KeyboardEvent('keydown', {
      key: 'Enter',
      bubbles: true,
      cancelable: true,
    });
    Object.defineProperty(composingEnter, 'isComposing', { value: true });
    fireEvent(input, composingEnter);
    expect(composingEnter.defaultPrevented).toBe(false);

    const plainEnter = new KeyboardEvent('keydown', {
      key: 'Enter',
      bubbles: true,
      cancelable: true,
    });
    fireEvent(input, plainEnter);
    expect(plainEnter.defaultPrevented).toBe(true);
  });

  it('handles empty fields, forbidden prototype keys, unknown operators, deep ASTs, and XSS safely', () => {
    const onChange = vi.fn();

    // Empty + forbidden prototype keys only -> safe empty configured state
    const { rerender } = render(
      <VisualQueryBuilder
        fields={[
          { key: '__proto__', label: 'Proto', type: 'text' },
          { key: 'constructor', label: 'Ctor', type: 'text' },
          { key: 'prototype', label: 'Prototype', type: 'text' },
          { key: '   ', label: 'Blank', type: 'text' },
        ]}
        onChange={onChange}
      />
    );

    expect(screen.getByText('No queryable fields configured.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '+ Rule' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '+ Group' })).toBeDisabled();

    // Controlled AST containing invalid field key, mismatched operator, and XSS value
    const xssPayload = '<script>window.__vqbXss=1</script>"quoted"\\slash';
    const hostileAst: QueryGroupNode = {
      kind: 'group',
      id: 'root',
      combinator: 'AND',
      children: [
        {
          kind: 'rule',
          id: 'bad-rule',
          field: '__proto__',
          operator: 'lessThan',
          value: xssPayload,
        },
      ],
    };

    rerender(
      <VisualQueryBuilder
        fields={SAMPLE_FIELDS}
        value={hostileAst}
        onChange={onChange}
      />
    );

    expect(screen.getByLabelText('Rule field')).toHaveValue('');
    expect(document.querySelector('script')).toBeNull();
    expect(screen.getByRole('region', { name: 'Query preview' })).toHaveTextContent(
      '(invalid field) less than'
    );

    // Invalid field change & invalid operator DOM events are ignored cleanly
    fireEvent.change(screen.getByLabelText('Rule field'), { target: { value: '__proto__' } });
    fireEvent.change(screen.getByLabelText('Rule field'), { target: { value: 'unknownKey' } });
    fireEvent.change(screen.getByLabelText('Rule operator'), { target: { value: 'evalInjection' } });
    expect(onChange).not.toHaveBeenCalled();

    // Ensure Object.prototype was never polluted
    expect(({} as Record<string, string>)['polluted']).toBeUndefined();
  });

  it('formats all operators, omitted fields, empty sub-groups, and bounded depth in formatQueryExpression', () => {
    const allOpsGroup: QueryGroupNode = {
      kind: 'group',
      id: 'g-all',
      combinator: 'OR',
      children: [
        { kind: 'rule', id: '1', field: 'title', operator: 'equals', value: 'A' },
        { kind: 'rule', id: '2', field: 'title', operator: 'notEquals', value: 'B' },
        { kind: 'rule', id: '3', field: 'title', operator: 'contains', value: 'C' },
        { kind: 'rule', id: '4', field: 'title', operator: 'startsWith', value: 'D' },
        { kind: 'rule', id: '5', field: 'budget', operator: 'greaterThan', value: '10' },
        { kind: 'rule', id: '6', field: 'budget', operator: 'lessThan', value: '20' },
        { kind: 'rule', id: '7', field: 'created', operator: 'after', value: '2026-01-01' },
        { kind: 'rule', id: '8', field: 'created', operator: 'before', value: '2026-12-31' },
        { kind: 'rule', id: '9', field: 'notes', operator: 'isEmpty', value: '' },
        { kind: 'group', id: 'empty-sub', combinator: 'AND', children: [] },
      ],
    };

    const expr = formatQueryExpression(allOpsGroup, SAMPLE_FIELDS);
    expect(expr).toBe(
      'Title equals "A" OR Title not equals "B" OR Title contains "C" OR Title starts with "D" OR Budget greater than "10" OR Budget less than "20" OR Created after "2026-01-01" OR Created before "2026-12-31" OR Notes is empty'
    );

    // Without fields array -> falls back to field key
    expect(
      formatQueryExpression({
        kind: 'rule',
        id: 'r-raw',
        field: 'status',
        operator: 'equals',
        value: 'say "hi" \\ ok',
      })
    ).toBe('status equals "say \\"hi\\" \\\\ ok"');

    // Adversarial deeply nested AST (> 12 levels) terminates safely
    let deepNode: QueryNode = {
      kind: 'rule',
      id: 'leaf',
      field: 'title',
      operator: 'equals',
      value: 'deep',
    };
    for (let i = 0; i < 15; i += 1) {
      deepNode = {
        kind: 'group',
        id: `g-${i}`,
        combinator: 'AND',
        children: [deepNode],
      };
    }
    expect(formatQueryExpression(deepNode, SAMPLE_FIELDS)).toBe('(max depth exceeded)');

    // Rendering an externally supplied deeply nested AST terminates safely too
    const deepRender = render(
      <VisualQueryBuilder fields={SAMPLE_FIELDS} value={deepNode as QueryGroupNode} />
    );
    expect(screen.getByRole('region', { name: 'Query preview' })).toHaveTextContent(
      '(max depth exceeded)'
    );
    // Clicking + Rule on a deeply nested tree safely collects IDs with bounded recursion
    fireEvent.click(screen.getAllByRole('button', { name: '+ Rule' })[0] as HTMLButtonElement);
    deepRender.unmount();

    // Format expression with duplicate and forbidden fields ignores unsafe/duplicate specs
    expect(
      formatQueryExpression(
        { kind: 'rule', id: 'r-x', field: 'title', operator: 'equals', value: 'ok' },
        [
          { key: '__proto__', label: 'Bad', type: 'text' },
          { key: 'title', label: 'Title', type: 'text' },
          { key: 'title', label: 'Duplicate Title', type: 'text' },
        ]
      )
    ).toBe('Title equals "ok"');

    // Sibling nested groups: editing/adding/removing inside one leaves sibling unchanged
    const siblingAst: QueryGroupNode = {
      kind: 'group',
      id: 'root',
      combinator: 'AND',
      children: [
        {
          kind: 'group',
          id: 'g-a',
          combinator: 'AND',
          children: [{ kind: 'rule', id: 'r-a', field: 'title', operator: 'equals', value: 'One' }],
        },
        {
          kind: 'group',
          id: 'g-b',
          combinator: 'OR',
          children: [{ kind: 'rule', id: 'r-b', field: 'title', operator: 'equals', value: 'Two' }],
        },
      ],
    };
    const onSiblingChange = vi.fn();
    render(
      <VisualQueryBuilder
        fields={[
          { key: 'status', label: 'Status', type: 'select', options: ['Open', 'Closed'] },
          { key: 'title', label: 'Title', type: 'text' },
        ]}
        defaultValue={siblingAst}
        onChange={onSiblingChange}
      />
    );
    const groups = screen.getAllByRole('group', { name: 'Nested query group level 2' });
    const groupB = groups[1] as HTMLElement;
    fireEvent.click(within(groupB).getByRole('button', { name: 'AND' }));
    fireEvent.click(within(groupB).getByRole('button', { name: '+ Rule' }));
    const groupBInputs = within(groupB).getAllByLabelText('Rule value');
    fireEvent.change(groupBInputs[0] as HTMLInputElement, { target: { value: 'Updated' } });
    fireEvent.click(within(groupB).getAllByRole('button', { name: 'Remove rule' })[0] as HTMLButtonElement);

    // Default root initialization when first field is a select (with and without options)
    render(
      <VisualQueryBuilder
        fields={[{ key: 'status', label: 'Status', type: 'select', options: ['Open', 'Closed'] }]}
      />
    );
    render(
      <VisualQueryBuilder fields={[{ key: 'empty', label: 'Empty', type: 'select' }]} />
    );

    // Controlled rule when fields=[] falls back gracefully to text field type and switching invalid rule field works
    const onRecover = vi.fn();
    const { rerender: rerenderRecover } = render(
      <VisualQueryBuilder
        fields={[]}
        value={{
          kind: 'group',
          id: 'root',
          combinator: 'AND',
          children: [{ kind: 'rule', id: 'r-orphan', field: '__proto__', operator: 'equals', value: 'x' }],
        }}
        onChange={onRecover}
      />
    );
    expect(screen.getAllByLabelText('Rule field').at(-1)).toBeDisabled();
    rerenderRecover(
      <VisualQueryBuilder
        fields={SAMPLE_FIELDS}
        value={{
          kind: 'group',
          id: 'root',
          combinator: 'AND',
          children: [{ kind: 'rule', id: 'r-orphan', field: '__proto__', operator: 'equals', value: 'x' }],
        }}
        onChange={onRecover}
      />
    );
    fireEvent.change(screen.getAllByLabelText('Rule field').at(-1) as HTMLSelectElement, {
      target: { value: 'title' },
    });
    expect(onRecover).toHaveBeenCalled();
    fireEvent.change(screen.getAllByLabelText('Rule operator').at(-1) as HTMLSelectElement, {
      target: { value: 'notEquals' },
    });
    expect(onRecover).toHaveBeenCalledTimes(2);
  });
});
