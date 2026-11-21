'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { Braces, Code2, Trash2 } from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { useControllableState } from '../hooks/useControllableState';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { cx, mergeProps } from '../utils/mergeProps';
import { clampNumber, isSafeObjectKey } from '../utils/sanitize';
import { themeProps } from '../utils/themeProps';

export type QueryCombinator = 'AND' | 'OR';
export type QueryFieldType = 'text' | 'number' | 'date' | 'select';
export type QueryOperator =
  | 'equals'
  | 'notEquals'
  | 'contains'
  | 'startsWith'
  | 'greaterThan'
  | 'lessThan'
  | 'after'
  | 'before'
  | 'isEmpty';

export interface QueryFieldSpec {
  /** Safe property key identifying the queryable field. */
  key: string;
  /** Human-readable field display label. */
  label: string;
  /** Semantic data type governing available operators and value input control. */
  type: QueryFieldType;
  /** Discrete selectable values when type is 'select'. */
  options?: ReadonlyArray<string>;
}

export interface QueryRuleNode {
  kind: 'rule';
  id: string;
  field: string;
  operator: QueryOperator;
  value: string;
}

export interface QueryGroupNode {
  kind: 'group';
  id: string;
  combinator: QueryCombinator;
  children: ReadonlyArray<QueryNode>;
}

export type QueryNode = QueryRuleNode | QueryGroupNode;

type VisualQueryBuilderBaseProps = Omit<BaseProps<HTMLDivElement>, 'children' | 'onChange'>;

export interface VisualQueryBuilderProps extends VisualQueryBuilderBaseProps {
  /** Queryable field schemas defining available keys, labels, types, and select options. */
  fields: ReadonlyArray<QueryFieldSpec>;
  /** Controlled root query AST group node. */
  value?: QueryGroupNode;
  /** Initial uncontrolled root query AST group node. */
  defaultValue?: QueryGroupNode;
  /** Invoked with the next immutable root QueryGroupNode after any structural or value edit. */
  onChange?: (root: QueryGroupNode) => void;
  /** Maximum permitted logical group nesting depth (clamped between 1 and 4; default 3). */
  maxDepth?: number;
  /** Shows the live recessed query expression & JSON AST preview footer (default true). */
  showPreview?: boolean;
}

type PreviewMode = 'expression' | 'json';

const MAX_AST_DEPTH = 12;

const TEXT_OPERATORS: readonly [QueryOperator, ...QueryOperator[]] = [
  'equals',
  'notEquals',
  'contains',
  'startsWith',
  'isEmpty',
];
const NUMBER_OPERATORS: readonly [QueryOperator, ...QueryOperator[]] = [
  'equals',
  'notEquals',
  'greaterThan',
  'lessThan',
  'isEmpty',
];
const DATE_OPERATORS: readonly [QueryOperator, ...QueryOperator[]] = [
  'equals',
  'notEquals',
  'after',
  'before',
  'isEmpty',
];
const SELECT_OPERATORS: readonly [QueryOperator, ...QueryOperator[]] = [
  'equals',
  'notEquals',
  'isEmpty',
];

const ALL_OPERATORS: ReadonlyArray<QueryOperator> = [
  'equals',
  'notEquals',
  'contains',
  'startsWith',
  'greaterThan',
  'lessThan',
  'after',
  'before',
  'isEmpty',
];

const COMBINATORS: ReadonlyArray<QueryCombinator> = ['AND', 'OR'];

function getOperatorsForType(
  fieldType: QueryFieldType
): readonly [QueryOperator, ...QueryOperator[]] {
  switch (fieldType) {
    case 'number':
      return NUMBER_OPERATORS;
    case 'date':
      return DATE_OPERATORS;
    case 'select':
      return SELECT_OPERATORS;
    case 'text':
      return TEXT_OPERATORS;
  }
}

function getOperatorLabel(operator: QueryOperator): string {
  switch (operator) {
    case 'equals':
      return 'equals';
    case 'notEquals':
      return 'not equals';
    case 'contains':
      return 'contains';
    case 'startsWith':
      return 'starts with';
    case 'greaterThan':
      return 'greater than';
    case 'lessThan':
      return 'less than';
    case 'after':
      return 'after';
    case 'before':
      return 'before';
    case 'isEmpty':
      return 'is empty';
  }
}

function parseQueryOperator(raw: string): QueryOperator | null {
  for (const op of ALL_OPERATORS) {
    if (op === raw) return op;
  }
  return null;
}

function getUniqueOptions(options?: ReadonlyArray<string>): string[] {
  if (!options || options.length === 0) return [];
  return Array.from(new Set(options));
}

function createDefaultRule(id: string, field: QueryFieldSpec): QueryRuleNode {
  const selectOptions = field.type === 'select' ? getUniqueOptions(field.options) : [];
  return {
    kind: 'rule',
    id,
    field: field.key,
    operator: getOperatorsForType(field.type)[0],
    value: field.type === 'select' ? (selectOptions[0] ?? '') : '',
  };
}

function createDefaultRoot(fields: ReadonlyArray<QueryFieldSpec>): QueryGroupNode {
  const firstField = fields[0];
  return {
    kind: 'group',
    id: 'root',
    combinator: 'AND',
    children: firstField ? [createDefaultRule('rule-1', firstField)] : [],
  };
}

function collectNodeIds(node: QueryNode, ids: Set<string>, depth = 0): void {
  if (depth > MAX_AST_DEPTH) return;
  ids.add(node.id);
  if (node.kind === 'group') {
    for (const child of node.children) {
      collectNodeIds(child, ids, depth + 1);
    }
  }
}

function updateGroupCombinator(
  node: QueryGroupNode,
  groupId: string,
  combinator: QueryCombinator
): QueryGroupNode {
  if (node.id === groupId) {
    return { ...node, combinator };
  }
  let changed = false;
  const nextChildren = node.children.map((child) => {
    if (child.kind !== 'group') return child;
    const updated = updateGroupCombinator(child, groupId, combinator);
    if (updated !== child) changed = true;
    return updated;
  });
  return changed ? { ...node, children: nextChildren } : node;
}

function addChildToGroup(
  node: QueryGroupNode,
  groupId: string,
  childToAdd: QueryNode,
  maxDepth: number,
  depth = 1
): QueryGroupNode {
  if (node.id === groupId) {
    if (childToAdd.kind === 'group' && depth >= maxDepth) {
      return node;
    }
    return { ...node, children: [...node.children, childToAdd] };
  }
  let changed = false;
  const nextChildren = node.children.map((child) => {
    if (child.kind !== 'group') return child;
    const updated = addChildToGroup(child, groupId, childToAdd, maxDepth, depth + 1);
    if (updated !== child) changed = true;
    return updated;
  });
  return changed ? { ...node, children: nextChildren } : node;
}

function updateRuleInTree(
  node: QueryGroupNode,
  ruleId: string,
  updater: (rule: QueryRuleNode) => QueryRuleNode
): QueryGroupNode {
  let changed = false;
  const nextChildren = node.children.map((child) => {
    if (child.kind === 'rule') {
      if (child.id === ruleId) {
        changed = true;
        return updater(child);
      }
      return child;
    }
    const updated = updateRuleInTree(child, ruleId, updater);
    if (updated !== child) changed = true;
    return updated;
  });
  return changed ? { ...node, children: nextChildren } : node;
}

function removeNodeFromTree(node: QueryGroupNode, targetId: string): QueryGroupNode {
  let changed = false;
  const nextChildren: QueryNode[] = [];
  for (const child of node.children) {
    if (child.id === targetId) {
      changed = true;
      continue;
    }
    if (child.kind === 'group') {
      const updated = removeNodeFromTree(child, targetId);
      if (updated !== child) changed = true;
      nextChildren.push(updated);
    } else {
      nextChildren.push(child);
    }
  }
  return changed ? { ...node, children: nextChildren } : node;
}

function formatQueryNode(
  node: QueryNode,
  fieldMap: ReadonlyMap<string, QueryFieldSpec>,
  depth: number
): string {
  if (depth > MAX_AST_DEPTH) {
    return '(max depth exceeded)';
  }

  if (node.kind === 'rule') {
    const fieldLabel = isSafeObjectKey(node.field)
      ? (fieldMap.get(node.field)?.label ?? node.field)
      : '(invalid field)';
    const opLabel = getOperatorLabel(node.operator);
    if (node.operator === 'isEmpty') {
      return `${fieldLabel} ${opLabel}`;
    }
    const escaped = node.value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    return `${fieldLabel} ${opLabel} "${escaped}"`;
  }

  const parts: string[] = [];
  for (const child of node.children) {
    const formatted = formatQueryNode(child, fieldMap, depth + 1);
    if (formatted.length > 0) {
      parts.push(formatted);
    }
  }

  if (parts.length === 0) {
    return '';
  }

  const combinator: QueryCombinator = node.combinator === 'OR' ? 'OR' : 'AND';
  const joined = parts.join(` ${combinator} `);
  return depth > 0 && parts.length > 1 ? `(${joined})` : joined;
}

/**
 * Formats a typed QueryNode AST into a human-readable boolean query expression
 * without ever evaluating code or indexing plain objects with untrusted keys.
 */
export function formatQueryExpression(
  node: QueryNode,
  fields: ReadonlyArray<QueryFieldSpec> = []
): string {
  const fieldMap = new Map<string, QueryFieldSpec>();
  for (const field of fields) {
    if (field.key.trim().length > 0 && isSafeObjectKey(field.key) && !fieldMap.has(field.key)) {
      fieldMap.set(field.key, field);
    }
  }
  return formatQueryNode(node, fieldMap, 0);
}

export function VisualQueryBuilder({
  fields,
  value,
  defaultValue,
  onChange,
  maxDepth = 3,
  showPreview = true,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: VisualQueryBuilderProps) {
  const override = useComponentOverride('VisualQueryBuilder');
  const [previewMode, setPreviewMode] = useState<PreviewMode>('expression');
  const idCounterRef = useRef<number>(1);

  const safeMaxDepth = Math.round(clampNumber(maxDepth, 1, 4, 3));

  const safeFields = useMemo(() => {
    const seen = new Set<string>();
    const list: QueryFieldSpec[] = [];
    for (const field of fields) {
      const trimmedKey = field.key.trim();
      if (trimmedKey.length === 0 || !isSafeObjectKey(field.key) || seen.has(field.key)) {
        continue;
      }
      seen.add(field.key);
      list.push(field);
    }
    return list;
  }, [fields]);

  const fieldMap = useMemo(() => {
    const map = new Map<string, QueryFieldSpec>();
    for (const field of safeFields) {
      map.set(field.key, field);
    }
    return map;
  }, [safeFields]);

  const initialRoot = useMemo(
    () => defaultValue ?? createDefaultRoot(safeFields),
    [defaultValue, safeFields]
  );

  const [root, setRoot] = useControllableState<QueryGroupNode>({
    value,
    defaultValue: initialRoot,
    onChange,
  });

  const allocateId = useCallback((prefix: 'rule' | 'group', currentTree: QueryGroupNode) => {
    const existing = new Set<string>();
    collectNodeIds(currentTree, existing);
    let candidate = `${prefix}-${idCounterRef.current}`;
    while (existing.has(candidate)) {
      idCounterRef.current += 1;
      candidate = `${prefix}-${idCounterRef.current}`;
    }
    idCounterRef.current += 1;
    return candidate;
  }, []);

  const handleCombinatorChange = useCallback(
    (groupId: string, combinator: QueryCombinator) => {
      setRoot(updateGroupCombinator(root, groupId, combinator));
    },
    [root, setRoot]
  );

  const handleAddRule = useCallback(
    (groupId: string) => {
      const firstField = safeFields[0];
      if (!firstField) return;
      const nextId = allocateId('rule', root);
      const newRule = createDefaultRule(nextId, firstField);
      setRoot(addChildToGroup(root, groupId, newRule, safeMaxDepth));
    },
    [allocateId, root, safeFields, safeMaxDepth, setRoot]
  );

  const handleAddGroup = useCallback(
    (groupId: string) => {
      const firstField = safeFields[0];
      if (!firstField) return;
      const nextGroupId = allocateId('group', root);
      const nextRuleId = allocateId('rule', root);
      const newGroup: QueryGroupNode = {
        kind: 'group',
        id: nextGroupId,
        combinator: 'AND',
        children: [createDefaultRule(nextRuleId, firstField)],
      };
      setRoot(addChildToGroup(root, groupId, newGroup, safeMaxDepth));
    },
    [allocateId, root, safeFields, safeMaxDepth, setRoot]
  );

  const handleRemoveNode = useCallback(
    (targetId: string) => {
      setRoot(removeNodeFromTree(root, targetId));
    },
    [root, setRoot]
  );

  const handleFieldChange = useCallback(
    (ruleId: string, nextFieldKey: string) => {
      const nextSpec = isSafeObjectKey(nextFieldKey) ? fieldMap.get(nextFieldKey) : undefined;
      if (!nextSpec) return;

      const validOps = getOperatorsForType(nextSpec.type);
      const selectOptions = nextSpec.type === 'select' ? getUniqueOptions(nextSpec.options) : [];

      setRoot(
        updateRuleInTree(root, ruleId, (rule) => {
          const prevSpec = isSafeObjectKey(rule.field) ? fieldMap.get(rule.field) : undefined;
          const nextOperator = validOps.includes(rule.operator) ? rule.operator : validOps[0];

          let nextValue = '';
          if (nextOperator !== 'isEmpty') {
            if (nextSpec.type === 'select') {
              nextValue = selectOptions.includes(rule.value) ? rule.value : (selectOptions[0] ?? '');
            } else if (prevSpec?.type === nextSpec.type) {
              nextValue = rule.value;
            }
          }

          return {
            ...rule,
            field: nextSpec.key,
            operator: nextOperator,
            value: nextValue,
          };
        })
      );
    },
    [fieldMap, root, setRoot]
  );

  const handleOperatorChange = useCallback(
    (ruleId: string, rawOperator: string) => {
      const nextOperator = parseQueryOperator(rawOperator);
      if (!nextOperator) return;
      setRoot(
        updateRuleInTree(root, ruleId, (rule) => {
          const spec = isSafeObjectKey(rule.field) ? fieldMap.get(rule.field) : undefined;
          let nextValue = rule.value;
          if (nextOperator === 'isEmpty') {
            nextValue = '';
          } else if (spec?.type === 'select' && nextValue === '') {
            const opts = getUniqueOptions(spec.options);
            nextValue = opts[0] ?? '';
          }
          return {
            ...rule,
            operator: nextOperator,
            value: nextValue,
          };
        })
      );
    },
    [fieldMap, root, setRoot]
  );

  const handleValueChange = useCallback(
    (ruleId: string, nextValue: string) => {
      setRoot(updateRuleInTree(root, ruleId, (rule) => ({ ...rule, value: nextValue })));
    },
    [root, setRoot]
  );

  const formattedExpression = useMemo(
    () => formatQueryExpression(root, safeFields),
    [root, safeFields]
  );

  const formattedJson = useMemo(() => JSON.stringify(root, null, 2), [root]);

  const merged = mergeProps({
    themeTarget: themeProps('visual-query-builder', {
      combinator: root.combinator.toLowerCase(),
      maxDepth: safeMaxDepth,
      preview: showPreview,
      empty: safeFields.length === 0,
    }),
    baseClassName: 'prism-slab p-4 flex flex-col gap-4 w-full',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  const groupClass = stableClassName('visual-query-builder', 'group');
  const ruleClass = stableClassName('visual-query-builder', 'rule');
  const previewClass = stableClassName('visual-query-builder', 'preview');

  const renderRuleRow = (rule: QueryRuleNode) => {
    const isFieldValid = isSafeObjectKey(rule.field) && fieldMap.has(rule.field);
    const activeFieldSpec = isFieldValid ? fieldMap.get(rule.field) : safeFields[0];
    const fieldType: QueryFieldType = activeFieldSpec?.type ?? 'text';
    const validOps = getOperatorsForType(fieldType);
    const operatorOptions: ReadonlyArray<QueryOperator> = validOps.includes(rule.operator)
      ? validOps
      : [rule.operator, ...validOps];
    const selectOptions =
      fieldType === 'select' ? getUniqueOptions(activeFieldSpec?.options) : [];
    const showValueInput = rule.operator !== 'isEmpty';

    return (
      <div
        key={rule.id}
        data-rule-id={rule.id}
        className={cx(
          ruleClass,
          'prism-crystal rounded-2xl p-2.5 flex flex-wrap items-center gap-2'
        )}
      >
        <select
          aria-label="Rule field"
          value={isFieldValid ? rule.field : ''}
          disabled={safeFields.length === 0}
          onChange={(e) => handleFieldChange(rule.id, e.target.value)}
          className="prism-well prism-focus-ring h-9 px-3 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-100 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed min-w-[130px]"
        >
          {!isFieldValid ? (
            <option value="" disabled>
              Select field...
            </option>
          ) : null}
          {safeFields.map((field) => (
            <option key={field.key} value={field.key}>
              {field.label}
            </option>
          ))}
        </select>

        <select
          aria-label="Rule operator"
          value={rule.operator}
          onChange={(e) => handleOperatorChange(rule.id, e.target.value)}
          className="prism-well prism-focus-ring h-9 px-3 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-100 cursor-pointer min-w-[125px]"
        >
          {operatorOptions.map((op) => (
            <option key={op} value={op}>
              {getOperatorLabel(op)}
            </option>
          ))}
        </select>

        {showValueInput ? (
          fieldType === 'select' ? (
            <select
              aria-label="Rule value"
              value={rule.value}
              disabled={selectOptions.length === 0}
              onChange={(e) => handleValueChange(rule.id, e.target.value)}
              className="prism-well prism-focus-ring h-9 px-3 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-100 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex-1 min-w-[140px]"
            >
              {selectOptions.length === 0 ? (
                <option value="">No options</option>
              ) : (
                selectOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))
              )}
            </select>
          ) : (
            <input
              type={fieldType === 'number' ? 'number' : fieldType === 'date' ? 'date' : 'text'}
              aria-label="Rule value"
              value={rule.value}
              placeholder={
                fieldType === 'number'
                  ? 'Enter number...'
                  : fieldType === 'date'
                    ? 'YYYY-MM-DD'
                    : 'Enter value...'
              }
              onChange={(e) => handleValueChange(rule.id, e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                }
              }}
              className={cx(
                'prism-well prism-focus-ring h-9 px-3 rounded-xl text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 flex-1 min-w-[140px]',
                (fieldType === 'number' || fieldType === 'date') && 'font-mono tabular-nums'
              )}
            />
          )
        ) : (
          <span className="text-[11px] italic text-slate-500 dark:text-slate-400 px-2 flex-1">
            No value required
          </span>
        )}

        <button
          type="button"
          aria-label="Remove rule"
          onClick={() => handleRemoveNode(rule.id)}
          className="prism-crystal prism-focus-ring h-9 px-2.5 rounded-xl inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-red-600 dark:text-slate-300 dark:hover:text-red-400 cursor-pointer shrink-0"
        >
          <Trash2 aria-hidden="true" className="w-3.5 h-3.5" />
          <span>Remove</span>
        </button>
      </div>
    );
  };

  const renderGroup = (group: QueryGroupNode, depth: number) => {
    const canAddGroup = depth < safeMaxDepth && safeFields.length > 0;
    const canAddRule = safeFields.length > 0;
    const isNested = depth > 1;

    return (
      <div
        key={group.id}
        role="group"
        aria-label={isNested ? `Nested query group level ${depth}` : 'Root query group'}
        data-group-id={group.id}
        data-depth={String(depth)}
        data-combinator={group.combinator}
        className={cx(
          groupClass,
          'prism-slab p-3.5 flex flex-col gap-3',
          isNested && 'ml-4 border-l-2 border-[var(--prism-secondary-main)]/45'
        )}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div
              role="group"
              aria-label="Logical combinator"
              className="inline-flex items-center gap-1.5"
            >
              {COMBINATORS.map((comb) => {
                const active = group.combinator === comb;
                return (
                  <button
                    key={comb}
                    type="button"
                    aria-pressed={active}
                    data-combinator-option={comb}
                    onClick={() => handleCombinatorChange(group.id, comb)}
                    className={cx(
                      'prism-focus-ring h-8 px-3 rounded-full text-xs font-semibold cursor-pointer transition-transform',
                      active
                        ? comb === 'AND'
                          ? 'prism-btn-primary'
                          : 'prism-emerald'
                        : 'prism-crystal text-slate-700 dark:text-slate-200'
                    )}
                  >
                    {comb}
                  </button>
                );
              })}
            </div>

            <span className="text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
              {isNested ? `Level ${depth}` : 'Root'}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={!canAddRule}
              onClick={() => handleAddRule(group.id)}
              className="prism-crystal prism-focus-ring h-8 px-3 rounded-full inline-flex items-center gap-1 text-xs font-semibold text-slate-800 dark:text-slate-100 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>+ Rule</span>
            </button>

            <button
              type="button"
              disabled={!canAddGroup}
              onClick={() => handleAddGroup(group.id)}
              className="prism-crystal prism-focus-ring h-8 px-3 rounded-full inline-flex items-center gap-1 text-xs font-semibold text-slate-800 dark:text-slate-100 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>+ Group</span>
            </button>

            {isNested ? (
              <button
                type="button"
                aria-label="Remove group"
                onClick={() => handleRemoveNode(group.id)}
                className="prism-crystal prism-focus-ring h-8 px-2.5 rounded-full inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-red-600 dark:text-slate-300 dark:hover:text-red-400 cursor-pointer"
              >
                <Trash2 aria-hidden="true" className="w-3.5 h-3.5" />
                <span>Remove</span>
              </button>
            ) : null}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          {group.children.length === 0 ? (
            <div className="prism-well rounded-2xl px-3.5 py-3 text-xs text-slate-500 dark:text-slate-400">
              {safeFields.length === 0
                ? 'No queryable fields configured.'
                : 'No rules in this group. Add a rule or nested group.'}
            </div>
          ) : (
            group.children.map((child) =>
              child.kind === 'rule'
                ? renderRuleRow(child)
                : depth < MAX_AST_DEPTH
                  ? renderGroup(child, depth + 1)
                  : null
            )
          )}
        </div>
      </div>
    );
  };

  return (
    <div ref={ref} {...rest} {...merged}>
      {renderGroup(root, 1)}

      {showPreview ? (
        <div
          role="region"
          aria-label="Query preview"
          className={cx(
            previewClass,
            'pt-3 border-t border-[var(--prism-divider)] flex flex-col gap-2'
          )}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
              Live Query Preview
            </span>
            <div
              role="group"
              aria-label="Preview format"
              className="prism-well p-1 rounded-full inline-flex items-center gap-1"
            >
              <button
                type="button"
                aria-pressed={previewMode === 'expression'}
                onClick={() => setPreviewMode('expression')}
                className={cx(
                  'prism-focus-ring px-2.5 py-1 rounded-full inline-flex items-center gap-1 text-xs font-semibold cursor-pointer transition-colors',
                  previewMode === 'expression'
                    ? 'prism-crystal text-[var(--prism-primary-main)]'
                    : 'text-slate-600 dark:text-slate-300'
                )}
              >
                <Code2 aria-hidden="true" className="w-3.5 h-3.5" />
                <span>Expression</span>
              </button>
              <button
                type="button"
                aria-pressed={previewMode === 'json'}
                onClick={() => setPreviewMode('json')}
                className={cx(
                  'prism-focus-ring px-2.5 py-1 rounded-full inline-flex items-center gap-1 text-xs font-semibold cursor-pointer transition-colors',
                  previewMode === 'json'
                    ? 'prism-crystal text-[var(--prism-primary-main)]'
                    : 'text-slate-600 dark:text-slate-300'
                )}
              >
                <Braces aria-hidden="true" className="w-3.5 h-3.5" />
                <span>JSON AST</span>
              </button>
            </div>
          </div>

          <div
            data-preview-mode={previewMode}
            className="prism-well rounded-2xl p-3 text-xs font-mono text-slate-800 dark:text-slate-100 overflow-x-auto"
          >
            {previewMode === 'expression' ? (
              <code>{formattedExpression || '(empty query)'}</code>
            ) : (
              <pre className="m-0 whitespace-pre">
                <code>{formattedJson}</code>
              </pre>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

VisualQueryBuilder.displayName = 'VisualQueryBuilder';
