import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  AdvancedDataGrid,
  type AdvancedGridColumn,
  type GridCellValue,
  type GridRowRecord,
} from '../AdvancedDataGrid';
import { CodeEditor, type CodeDiagnostic } from '../CodeEditor';
import { CommentThread, type CommentItem } from '../CommentThread';
import { DiffViewer } from '../DiffViewer';
import { FacetedFilterBar, type FacetCategoryOption } from '../FacetedFilterBar';
import { GlobalSearchModal, type GlobalSearchItem } from '../GlobalSearchModal';
import { ImageCropper } from '../ImageCropper';
import { LivePresenceIndicator, type PresenceUser } from '../LivePresenceIndicator';
import { NotificationCenter, type NotificationItem } from '../NotificationCenter';
import { PivotTable, type PivotField, type PivotRecord, type PivotScalar } from '../PivotTable';
import { ProductTour, type TourStep } from '../ProductTour';
import { RichTextEditor } from '../RichTextEditor';
import {
  VisualQueryBuilder,
  formatQueryExpression,
  type QueryFieldSpec,
  type QueryGroupNode,
} from '../VisualQueryBuilder';
import {
  buildSafeCsv,
  isSafeObjectKey,
  sanitizeCsvCell,
  sanitizeHtml,
  sanitizeUrl,
  splitLiteralHighlight,
} from '../utils/sanitize';

const PROTO_HOSTILE_KEYS: readonly string[] = [
  '__proto__',
  'constructor',
  'prototype',
  'toString',
  'hasOwnProperty',
];

const REDOS_PAYLOAD = '((((((((((a+)+)+)+)+)+)+)+)+)+$';
const INVALID_BRACKET_PAYLOAD = '[invalid===';
const REGEX_META_PAYLOAD = '.*+?^${}()|[\\]\\\\';
const HOSTILE_REGEX_INPUTS: readonly string[] = [
  REDOS_PAYLOAD,
  INVALID_BRACKET_PAYLOAD,
  REGEX_META_PAYLOAD,
];

function createHostileRecord<TValue extends GridCellValue | PivotScalar>(
  entries: ReadonlyArray<readonly [string, TValue]>
): Record<string, TValue> {
  const record: Record<string, TValue> = {};
  for (const [key, value] of entries) {
    Object.defineProperty(record, key, {
      value,
      enumerable: true,
      writable: true,
      configurable: true,
    });
  }
  return record;
}

function assertCleanObjectPrototype(baselineKeys: readonly string[]): void {
  expect(Object.getOwnPropertyNames(Object.prototype).sort()).toEqual(baselineKeys);
  expect(Object.prototype.hasOwnProperty.call(Object.prototype, 'polluted')).toBe(false);
  expect('polluted' in ({} as Record<string, string>)).toBe(false);
  expect(typeof Object.prototype.toString).toBe('function');
  expect(typeof Object.prototype.hasOwnProperty).toBe('function');
}

function collectNonTestTsxFiles(rootDir: string): string[] {
  const collected: string[] = [];
  const entries = fs.readdirSync(rootDir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === 'coverage') {
      continue;
    }
    const fullPath = path.join(rootDir, entry.name);
    if (entry.isDirectory()) {
      collected.push(...collectNonTestTsxFiles(fullPath));
    } else if (entry.name.endsWith('.tsx') && !entry.name.endsWith('.test.tsx')) {
      collected.push(fullPath);
    }
  }
  return collected;
}

describe('1. XSS & Script Injection Immunity', () => {
  it('RichTextEditor strips scripts, inline event handlers, svg onload, and javascript: links in preview', () => {
    const xssPayload =
      '<script>alert("xss")</script><img src=x onerror=alert(1)><svg onload=alert(2)><a href="javascript:alert(3)">evil</a>';

    const { container } = render(
      <RichTextEditor label="Security Doc" defaultValue={xssPayload} showPreview />
    );

    const preview = screen.getByRole('region', { name: 'Rich text preview' });
    expect(container.querySelectorAll('script')).toHaveLength(0);
    expect(container.querySelectorAll('[onerror], [onload]')).toHaveLength(0);
    expect(preview.querySelectorAll('img')).toHaveLength(0);
    expect(preview.querySelectorAll('svg')).toHaveLength(0);

    const links = Array.from(container.querySelectorAll('a[href]'));
    for (const anchor of links) {
      const href = (anchor.getAttribute('href') ?? '').toLowerCase();
      expect(href.startsWith('javascript:')).toBe(false);
    }

    expect(preview).toHaveTextContent('evil');
    expect(preview.innerHTML.toLowerCase()).not.toContain('javascript:');
    expect(preview.innerHTML.toLowerCase()).not.toContain('onerror');
    expect(preview.innerHTML.toLowerCase()).not.toContain('onload');

    // Switch exclusively to Preview mode and re-verify DOM immunity
    fireEvent.click(screen.getByRole('tab', { name: 'Preview' }));
    const previewOnly = screen.getByRole('region', { name: 'Rich text preview' });
    expect(container.querySelectorAll('script')).toHaveLength(0);
    expect(container.querySelectorAll('[onerror], [onload]')).toHaveLength(0);
    expect(previewOnly.querySelectorAll('a[href^="javascript:"]')).toHaveLength(0);

    // Direct sanitizeHtml verification on the exact vector
    const cleaned = sanitizeHtml(xssPayload);
    expect(cleaned.toLowerCase()).not.toContain('<script');
    expect(cleaned.toLowerCase()).not.toContain('onerror');
    expect(cleaned.toLowerCase()).not.toContain('onload');
    expect(cleaned.toLowerCase()).not.toContain('javascript:');
  });

  it('CommentThread renders XSS payloads in body and author.name as literal text and blocks javascript: avatarSrc', () => {
    const comments: readonly CommentItem[] = [
      {
        id: 'xss-comment-1',
        author: {
          id: 'attacker-1',
          name: '<script>alert(1)</script>',
          role: 'Untrusted',
          avatarSrc: 'javascript:alert(1)',
        },
        body: '<script>alert(1)</script> and <img src=x onerror=alert(1)>',
        timestamp: '1m ago',
      },
      {
        id: 'xss-comment-2',
        author: {
          id: 'attacker-2',
          name: '<img src=x onerror=alert(1)>',
          avatarSrc: '  java\u0000script:alert(2)',
        },
        body: 'Nested payload <svg onload=alert(3)>',
        timestamp: 'Just now',
      },
    ];

    const { container } = render(<CommentThread defaultComments={comments} />);

    expect(container.querySelectorAll('script')).toHaveLength(0);
    expect(container.querySelectorAll('[onerror], [onload]')).toHaveLength(0);

    const images = Array.from(container.querySelectorAll('img'));
    expect(images).toHaveLength(0);
    for (const img of images) {
      expect((img.getAttribute('src') ?? '').toLowerCase()).not.toContain('javascript:');
    }

    expect(screen.getByText('<script>alert(1)</script>')).toBeInTheDocument();
    expect(screen.getByText('<img src=x onerror=alert(1)>')).toBeInTheDocument();
    expect(
      screen.getByText('<script>alert(1)</script> and <img src=x onerror=alert(1)>')
    ).toBeInTheDocument();
  });

  it('DiffViewer neutralizes <script> and <iframe src="javascript:..."> in both split and unified modes', () => {
    const original = '<script>alert(1)</script>\nconst safe = true;';
    const modified = '<iframe src="javascript:alert(1)"></iframe>\nconst safe = true;';

    const { container } = render(<DiffViewer original={original} modified={modified} />);

    expect(container.querySelectorAll('script')).toHaveLength(0);
    expect(container.querySelectorAll('iframe')).toHaveLength(0);
    expect(container.textContent).toContain('<script>alert(1)</script>');
    expect(container.textContent).toContain('<iframe src="javascript:alert(1)"></iframe>');

    fireEvent.click(screen.getByRole('button', { name: 'Unified' }));
    expect(container.querySelectorAll('script')).toHaveLength(0);
    expect(container.querySelectorAll('iframe')).toHaveLength(0);
    expect(container.textContent).toContain('<script>alert(1)</script>');
    expect(container.textContent).toContain('<iframe src="javascript:alert(1)"></iframe>');
  });

  it('CodeEditor neutralizes <script> payloads in defaultValue and diagnostics messages', () => {
    const xssCode = '<script>alert(1)</script>';
    const diagnostics: ReadonlyArray<CodeDiagnostic> = [
      {
        line: 1,
        severity: 'error',
        message: '<script>alert(1)</script> unexpected token',
      },
    ];

    const { container } = render(
      <CodeEditor defaultValue={xssCode} diagnostics={diagnostics} language="typescript" />
    );

    expect(container.querySelectorAll('script')).toHaveLength(0);
    const canvas = container.querySelector('[data-code-canvas="true"]');
    expect(canvas?.textContent).toContain('<script>alert(1)</script>');
    expect(screen.getByText('<script>alert(1)</script> unexpected token')).toBeInTheDocument();
  });

  it('NotificationCenter renders XSS payloads in title, message, and actor strictly as literal text in inline mode', () => {
    const xssTitle = '<script>alert("title")</script>';
    const xssMessage = '<img src=x onerror=alert("message")>';
    const xssActor = '<svg onload=alert("actor")>';

    const items: readonly NotificationItem[] = [
      {
        id: 'notif-xss-1',
        title: xssTitle,
        message: xssMessage,
        actor: xssActor,
        timestamp: 'Just now',
        category: 'alert',
        tone: 'warning',
      },
    ];

    const { container } = render(<NotificationCenter mode="inline" defaultItems={items} />);

    expect(container.querySelectorAll('script')).toHaveLength(0);
    expect(container.querySelectorAll('img')).toHaveLength(0);
    expect(container.querySelectorAll('[onerror], [onload]')).toHaveLength(0);
    expect(screen.getByText(xssTitle)).toBeInTheDocument();
    expect(screen.getByText(xssMessage)).toBeInTheDocument();
    expect(screen.getByText(xssActor)).toBeInTheDocument();
  });
});

describe('2. URL Protocol & CSS Color Allowlisting', () => {
  it('sanitizeUrl rejects dangerous schemes and control-char obfuscation while allowing safe URLs and raster data URIs', () => {
    // Dangerous protocols rejected (returns empty string '')
    expect(sanitizeUrl('javascript:alert(1)')).toBe('');
    expect(sanitizeUrl('vbscript:msgbox(1)')).toBe('');
    expect(sanitizeUrl('data:text/html,<script>alert(1)</script>')).toBe('');
    expect(sanitizeUrl('data:text/html,<script>alert(1)</script>', true)).toBe('');
    expect(sanitizeUrl('data:image/svg+xml,<svg/>')).toBe('');
    expect(sanitizeUrl('data:image/svg+xml,<svg/>', true)).toBe('');
    expect(sanitizeUrl('j\ta\nv\ra\u0000script:alert(1)')).toBe('');
    expect(sanitizeUrl('j\ta\nv\ra\u0000script:alert(1)', true)).toBe('');
    expect(sanitizeUrl('//evil.example/payload.js')).toBe('');

    // Safe allowlisted destinations succeed
    expect(sanitizeUrl('https://refractor.dev/docs')).toBe('https://refractor.dev/docs');
    expect(sanitizeUrl('/assets/specimen.png')).toBe('/assets/specimen.png');
    expect(sanitizeUrl('data:image/png;base64,iVBOR', true)).toBe(
      'data:image/png;base64,iVBOR'
    );
    // Raster data URI blocked unless explicitly opted in
    expect(sanitizeUrl('data:image/png;base64,iVBOR', false)).toBe('');
  });

  it('ImageCropper blocks javascript: src and renders zero unsafe <img> elements', () => {
    const { container } = render(<ImageCropper src="javascript:alert(1)" alt="Hostile media" />);

    expect(container.querySelectorAll('img')).toHaveLength(0);
    expect(screen.getByTestId('crop-fallback')).toBeInTheDocument();
    expect(screen.getByText('Blocked unsafe media URL')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Apply Crop/i })).toBeDisabled();
  });

  it('LivePresenceIndicator falls back to initials for javascript: avatarSrc and rejects CSS-injection color values', () => {
    const hostileUsers: readonly PresenceUser[] = [
      {
        id: 'user-css-xss',
        name: 'Grace Hopper',
        status: 'editing',
        avatarSrc: 'javascript:alert(1)',
        color: 'red; background-image: url(javascript:alert(1))',
        cursor: { x: 35, y: 45, label: 'Grace' },
      },
    ];

    const { container } = render(<LivePresenceIndicator users={hostileUsers} showCursors />);

    expect(container.querySelectorAll('img')).toHaveLength(0);
    expect(screen.getByText('GH')).toBeInTheDocument();

    const avatarButton = container.querySelector<HTMLButtonElement>(
      'button[data-user-id="user-css-xss"]'
    );
    expect(avatarButton).not.toBeNull();
    expect(avatarButton?.style.backgroundImage).toBe('');
    expect(avatarButton?.style.borderColor).not.toBe('red');
    expect(avatarButton?.style.borderColor).not.toContain('javascript:');
    expect(avatarButton?.style.borderColor).not.toContain('url(');

    const cursorPath = container.querySelector('[data-cursor-user="user-css-xss"] path');
    expect(cursorPath?.getAttribute('fill')).toMatch(/^#[0-9A-Fa-f]{6}$/);
    expect(container.innerHTML.toLowerCase()).not.toContain('javascript:');
    expect(container.innerHTML.toLowerCase()).not.toContain('background-image');
  });
});

describe('3. OWASP CSV / Excel Formula Injection Neutralization', () => {
  it('sanitizeCsvCell prefixes leading formula triggers and applies RFC 4180 escaping', () => {
    expect(sanitizeCsvCell("=CMD|' /C calc'!A0")).toBe("'=CMD|' /C calc'!A0");
    expect(sanitizeCsvCell('+1+1')).toBe("'+1+1");
    expect(sanitizeCsvCell('-2+3')).toBe("'-2+3");
    expect(sanitizeCsvCell('@SUM(A1:A10)')).toBe("'@SUM(A1:A10)");
    expect(sanitizeCsvCell('\t=1')).toBe("'\t=1");
    expect(sanitizeCsvCell('\r=1')).toBe('"\'\r=1"');
    expect(sanitizeCsvCell('=HYPERLINK("http://evil.com", "Click")')).toBe(
      '"\'=HYPERLINK(""http://evil.com"", ""Click"")"'
    );
    expect(sanitizeCsvCell('safe, "quoted"\nline2')).toBe('"safe, ""quoted""\nline2"');

    const safeCsv = buildSafeCsv(['=Header', 'Value'], [['@SUM(1,2)', 'plain, "ok"']]);
    expect(safeCsv).toBe('\'=Header,Value\r\n"\'@SUM(1,2)","plain, ""ok"""');
  });

  it('AdvancedDataGrid CSV export neutralizes formula-injection cell values with leading single quotes', () => {
    const columns: ReadonlyArray<AdvancedGridColumn> = [
      { key: 'name', header: 'Name' },
      { key: 'formula', header: 'Formula' },
    ];
    const rows: ReadonlyArray<GridRowRecord> = [
      { id: 'row-1', values: { name: 'LinkAttack', formula: '=HYPERLINK("http://evil")' } },
      { id: 'row-2', values: { name: 'CmdAttack', formula: "+cmd|' /C calc'!A0" } },
      { id: 'row-3', values: { name: 'SumAttack', formula: '@SUM(1+1)' } },
    ];

    const onExportCsv = vi.fn<(csvContent: string, filename: string) => void>();

    render(
      <AdvancedDataGrid
        columns={columns}
        rows={rows}
        onExportCsv={onExportCsv}
        exportFilename="security-audit.csv"
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Export CSV/i }));

    expect(onExportCsv).toHaveBeenCalledTimes(1);
    const capturedCall = onExportCsv.mock.calls[0];
    expect(capturedCall).toBeDefined();
    const csvContent = capturedCall?.[0] ?? '';
    const filename = capturedCall?.[1] ?? '';

    expect(filename).toBe('security-audit.csv');
    const lines = csvContent.split('\r\n');
    expect(lines).toEqual([
      'Name,Formula',
      'LinkAttack,"\'=HYPERLINK(""http://evil"")"',
      "CmdAttack,'+cmd|' /C calc'!A0",
      "SumAttack,'@SUM(1+1)",
    ]);

    expect(csvContent).toContain('"\'=HYPERLINK(""http://evil"")"');
    expect(csvContent).toContain("'+cmd|' /C calc'!A0");
    expect(csvContent).toContain("'@SUM(1+1)");
  });
});

describe('4. Prototype Pollution Immunity', () => {
  it('PivotTable resists __proto__, constructor, prototype, toString, and hasOwnProperty keys and values', () => {
    const baselineProtoKeys = Object.getOwnPropertyNames(Object.prototype).sort();

    expect(isSafeObjectKey('__proto__')).toBe(false);
    expect(isSafeObjectKey('constructor')).toBe(false);
    expect(isSafeObjectKey('prototype')).toBe(false);

    const hostileFields: ReadonlyArray<PivotField> = [
      { key: '__proto__', label: 'Proto Field' },
      { key: 'constructor', label: 'Constructor Field' },
      { key: 'prototype', label: 'Prototype Field' },
      { key: 'toString', label: 'ToString Field' },
      { key: 'hasOwnProperty', label: 'HasOwnProperty Field' },
      { key: 'rowDim', label: 'Row Dimension' },
      { key: 'colDim', label: 'Col Dimension' },
      { key: 'amount', label: 'Amount', numeric: true },
    ];

    const hostileData: ReadonlyArray<PivotRecord> = PROTO_HOSTILE_KEYS.map((key, idx) =>
      createHostileRecord<PivotScalar>([
        ['__proto__', 'polluted'],
        ['constructor', 'polluted'],
        ['prototype', 'polluted'],
        ['toString', `own-${idx}`],
        ['hasOwnProperty', `flag-${idx}`],
        ['rowDim', key],
        ['colDim', PROTO_HOSTILE_KEYS[(idx + 1) % PROTO_HOSTILE_KEYS.length] ?? '__proto__'],
        ['amount', (idx + 1) * 10],
      ])
    );

    expect(() => {
      render(
        <PivotTable
          data={hostileData}
          fields={hostileFields}
          defaultRowField="__proto__"
          defaultColumnField="constructor"
          defaultValueField="prototype"
        />
      );
    }).not.toThrow();

    // Switch axes to own hostile values & test aggregations
    fireEvent.change(screen.getByLabelText('Row field'), { target: { value: 'rowDim' } });
    fireEvent.change(screen.getByLabelText('Column field'), { target: { value: 'colDim' } });
    fireEvent.change(screen.getByLabelText('Value field'), { target: { value: 'amount' } });
    fireEvent.click(screen.getByRole('button', { name: 'Count' }));
    fireEvent.click(screen.getByRole('button', { name: 'Sum' }));

    assertCleanObjectPrototype(baselineProtoKeys);
  });

  it('AdvancedDataGrid resists prototype-polluting column keys, group names, sorting, and CSV export', () => {
    const baselineProtoKeys = Object.getOwnPropertyNames(Object.prototype).sort();

    const columns: ReadonlyArray<AdvancedGridColumn> = [
      { key: '__proto__', header: '__proto__', editable: true, sortable: true },
      { key: 'constructor', header: 'constructor', editable: true, sortable: true },
      { key: 'prototype', header: 'prototype', editable: true, sortable: true },
      { key: 'toString', header: 'toString', editable: true, sortable: true },
      { key: 'hasOwnProperty', header: 'hasOwnProperty', editable: true, sortable: true },
      { key: 'group', header: 'Group', sortable: true },
    ];

    const rows: ReadonlyArray<GridRowRecord> = PROTO_HOSTILE_KEYS.map((key, idx) => ({
      id: `proto-row-${idx}`,
      values: createHostileRecord<GridCellValue>([
        ['__proto__', 'polluted'],
        ['constructor', 'polluted'],
        ['prototype', 'polluted'],
        ['toString', `toString-${idx}`],
        ['hasOwnProperty', `hasOwn-${idx}`],
        ['group', key],
      ]),
    }));

    const onExportCsv = vi.fn<(csvContent: string, filename: string) => void>();

    expect(() => {
      render(
        <AdvancedDataGrid
          columns={columns}
          rows={rows}
          defaultGroupBy="group"
          onExportCsv={onExportCsv}
        />
      );
    }).not.toThrow();

    fireEvent.change(screen.getByLabelText('Group rows by'), { target: { value: '__proto__' } });
    fireEvent.click(screen.getByRole('button', { name: '__proto__' }));
    fireEvent.click(screen.getByRole('button', { name: /Export CSV/i }));
    expect(onExportCsv).toHaveBeenCalledTimes(1);

    assertCleanObjectPrototype(baselineProtoKeys);
  });

  it('VisualQueryBuilder isolates hostile field/group names without throwing or polluting Object.prototype', () => {
    const baselineProtoKeys = Object.getOwnPropertyNames(Object.prototype).sort();

    const fields: ReadonlyArray<QueryFieldSpec> = [
      { key: '__proto__', label: 'Proto', type: 'text' },
      { key: 'constructor', label: 'Constructor', type: 'text' },
      { key: 'prototype', label: 'Prototype', type: 'text' },
      { key: 'toString', label: 'ToString', type: 'text' },
      { key: 'hasOwnProperty', label: 'HasOwnProperty', type: 'text' },
      { key: 'status', label: 'Status', type: 'select', options: ['active', 'paused'] },
    ];

    const hostileAst: QueryGroupNode = {
      kind: 'group',
      id: '__proto__',
      combinator: 'AND',
      children: [
        { kind: 'rule', id: 'constructor', field: '__proto__', operator: 'equals', value: 'polluted' },
        {
          kind: 'group',
          id: 'prototype',
          combinator: 'OR',
          children: [
            {
              kind: 'rule',
              id: 'toString',
              field: 'toString',
              operator: 'contains',
              value: 'hasOwnProperty',
            },
            {
              kind: 'rule',
              id: 'hasOwnProperty',
              field: 'prototype',
              operator: 'equals',
              value: 'polluted',
            },
          ],
        },
      ],
    };

    const expression = formatQueryExpression(hostileAst, fields);
    expect(expression).toContain('(invalid field)');

    expect(() => {
      render(<VisualQueryBuilder fields={fields} defaultValue={hostileAst} showPreview />);
    }).not.toThrow();

    const fieldSelects = screen.getAllByLabelText('Rule field');
    for (const select of fieldSelects) {
      const optionValues = Array.from(select.querySelectorAll('option')).map((opt) => opt.value);
      expect(optionValues).not.toContain('__proto__');
      expect(optionValues).not.toContain('constructor');
      expect(optionValues).not.toContain('prototype');
    }

    const rootGroup = screen.getByRole('group', { name: 'Root query group' });
    fireEvent.click(within(rootGroup).getAllByRole('button', { name: '+ Rule' })[0] as HTMLElement);
    fireEvent.click(screen.getByRole('button', { name: 'JSON AST' }));
    expect(screen.getByRole('region', { name: 'Query preview' }).textContent).toContain('"__proto__"');

    assertCleanObjectPrototype(baselineProtoKeys);
  });

  it('GlobalSearchModal safely groups and filters items with prototype-polluting types and queries', () => {
    const baselineProtoKeys = Object.getOwnPropertyNames(Object.prototype).sort();
    const onSelectItem = vi.fn<(item: GlobalSearchItem) => void>();
    const onClose = vi.fn<() => void>();

    const items: ReadonlyArray<GlobalSearchItem> = PROTO_HOSTILE_KEYS.map((key) => ({
      id: key,
      title: `Entry ${key}`,
      subtitle: `Group ${key}`,
      type: key,
    }));

    expect(() => {
      render(
        <GlobalSearchModal
          open
          onClose={onClose}
          items={items}
          onSelectItem={onSelectItem}
          recentQueries={PROTO_HOSTILE_KEYS}
        />
      );
    }).not.toThrow();

    fireEvent.click(screen.getByRole('tab', { name: /__proto__/i }));
    fireEvent.click(screen.getByRole('tab', { name: /constructor/i }));
    fireEvent.click(screen.getByRole('tab', { name: /All/i }));

    const searchInput = screen.getByRole('searchbox', { name: 'Global search query' });
    fireEvent.change(searchInput, { target: { value: 'hasOwnProperty' } });
    fireEvent.keyDown(searchInput, { key: 'Enter' });

    expect(onSelectItem).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'hasOwnProperty', type: 'hasOwnProperty' })
    );

    assertCleanObjectPrototype(baselineProtoKeys);
  });
});

describe('5. ReDoS, Regex Metacharacter & Boundary Fuzzing', () => {
  it('GlobalSearchModal and splitLiteralHighlight handle ReDoS and regex metacharacters well under 500ms', () => {
    const items: ReadonlyArray<GlobalSearchItem> = [
      {
        id: 'redos-1',
        title: `Target ${'a'.repeat(40)}! ${REDOS_PAYLOAD}`,
        subtitle: `Literal ${REGEX_META_PAYLOAD} and ${INVALID_BRACKET_PAYLOAD}`,
        type: 'Security',
      },
      {
        id: 'redos-2',
        title: 'Normal Optical Component',
        subtitle: 'Refractive glass surface',
        type: 'Components',
      },
    ];

    const start = performance.now();

    render(
      <GlobalSearchModal open onClose={vi.fn()} items={items} onSelectItem={vi.fn()} />
    );
    const searchInput = screen.getByRole('searchbox', { name: 'Global search query' });

    for (const payload of HOSTILE_REGEX_INPUTS) {
      expect(() => {
        fireEvent.change(searchInput, { target: { value: payload } });
      }).not.toThrow();

      const segments = splitLiteralHighlight(`${'a'.repeat(120)}! ${payload}`, payload);
      expect(segments.some((seg) => seg.highlighted && seg.text === payload)).toBe(true);
    }

    const elapsedMs = performance.now() - start;
    expect(elapsedMs).toBeLessThan(500);
  });

  it('FacetedFilterBar handles hostile regex queries and NaN/Infinity/-Infinity bounds safely under 500ms', () => {
    const categories: ReadonlyArray<FacetCategoryOption> = [
      { value: 'glass', label: 'Glass', count: Number.NaN },
      { value: 'optics', label: 'Optics', count: Number.POSITIVE_INFINITY },
      { value: 'prism', label: 'Prism', count: Number.NEGATIVE_INFINITY },
    ];

    const start = performance.now();

    const { rerender } = render(
      <FacetedFilterBar
        categories={categories}
        priceBounds={{ min: Number.NaN, max: Number.POSITIVE_INFINITY }}
        defaultValue={{
          query: REDOS_PAYLOAD,
          categories: ['glass'],
          minPrice: Number.NEGATIVE_INFINITY,
          maxPrice: Number.NaN,
        }}
        resultCount={Number.NaN}
      />
    );

    const searchInput = screen.getByRole('searchbox');
    for (const payload of HOSTILE_REGEX_INPUTS) {
      expect(() => {
        fireEvent.change(searchInput, { target: { value: payload } });
      }).not.toThrow();
    }

    rerender(
      <FacetedFilterBar
        categories={categories}
        priceBounds={{ min: Number.NEGATIVE_INFINITY, max: Number.POSITIVE_INFINITY }}
        resultCount={Number.POSITIVE_INFINITY}
      />
    );

    rerender(
      <FacetedFilterBar
        categories={categories}
        priceBounds={{ min: Number.POSITIVE_INFINITY, max: Number.NEGATIVE_INFINITY }}
        resultCount={Number.NEGATIVE_INFINITY}
      />
    );

    expect(screen.queryByText(/NaN|Infinity/)).not.toBeInTheDocument();

    const elapsedMs = performance.now() - start;
    expect(elapsedMs).toBeLessThan(500);
  });

  it('CodeEditor handles hostile regex metacharacter code and NaN/Infinity/-Infinity tabSize & diagnostics under 500ms', () => {
    const hostileCode = [
      REDOS_PAYLOAD,
      INVALID_BRACKET_PAYLOAD,
      REGEX_META_PAYLOAD,
      `${'('.repeat(200)}${'a'.repeat(200)}!`,
    ].join('\n');

    const extremeDiagnostics: ReadonlyArray<CodeDiagnostic> = [
      { line: Number.NaN, severity: 'error', message: 'NaN line diagnostic' },
      { line: Number.POSITIVE_INFINITY, severity: 'warning', message: 'Infinity line diagnostic' },
      { line: Number.NEGATIVE_INFINITY, severity: 'error', message: '-Infinity line diagnostic' },
    ];

    const start = performance.now();

    const { rerender } = render(
      <CodeEditor
        defaultValue={hostileCode}
        tabSize={Number.NaN}
        diagnostics={extremeDiagnostics}
        language="typescript"
      />
    );

    const editorTextarea = screen.getByRole('textbox', { name: 'Code editor' });
    expect(() => {
      fireEvent.keyDown(editorTextarea, { key: 'Tab' });
    }).not.toThrow();

    rerender(
      <CodeEditor
        value={hostileCode}
        tabSize={Number.POSITIVE_INFINITY}
        diagnostics={extremeDiagnostics}
        language="css"
      />
    );

    rerender(
      <CodeEditor
        value={hostileCode}
        tabSize={Number.NEGATIVE_INFINITY}
        diagnostics={extremeDiagnostics}
        language="json"
      />
    );

    const elapsedMs = performance.now() - start;
    expect(elapsedMs).toBeLessThan(500);
  });

  it('ProductTour survives invalid targetSelector strings and NaN/Infinity/-Infinity step indices under 500ms', () => {
    const hostileSteps: readonly TourStep[] = [
      {
        id: 'step-invalid-bracket',
        title: 'Invalid Selector Step',
        description: 'Tests querySelector error catching.',
        targetSelector: INVALID_BRACKET_PAYLOAD,
        placement: 'bottom',
      },
      {
        id: 'step-redos',
        title: 'ReDoS Selector Step',
        description: 'Tests hostile regex metacharacter selector.',
        targetSelector: REDOS_PAYLOAD,
        placement: 'top',
      },
      {
        id: 'step-meta',
        title: 'Meta Selector Step',
        description: 'Tests regex punctuation selector.',
        targetSelector: REGEX_META_PAYLOAD,
        placement: 'right',
      },
    ];

    const start = performance.now();

    const { container, rerender } = render(
      <ProductTour
        steps={hostileSteps}
        open
        mode="overlay"
        defaultStepIndex={Number.NaN}
      />
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Invalid Selector Step')).toBeInTheDocument();
    expect(container.querySelector('[data-tour-card="true"]')).toHaveAttribute(
      'data-placement',
      'center'
    );

    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByText('ReDoS Selector Step')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByText('Meta Selector Step')).toBeInTheDocument();

    rerender(
      <ProductTour
        steps={hostileSteps}
        open
        mode="overlay"
        stepIndex={Number.POSITIVE_INFINITY}
      />
    );
    expect(screen.getByText('Invalid Selector Step')).toBeInTheDocument();

    rerender(
      <ProductTour
        steps={hostileSteps}
        open
        mode="overlay"
        stepIndex={Number.NEGATIVE_INFINITY}
      />
    );
    expect(screen.getByText('Invalid Selector Step')).toBeInTheDocument();

    const elapsedMs = performance.now() - start;
    expect(elapsedMs).toBeLessThan(500);
  });
});

describe('6. Static Source Hygiene Gate', () => {
  it('verifies ZERO occurrences of dangerouslySetInnerHTML, eval(, new Function(, or innerHTML = across all component .tsx files', () => {
    const testDir = path.dirname(fileURLToPath(import.meta.url));
    const coreSrcDir = path.resolve(testDir, '..');
    const tsxFiles = collectNonTestTsxFiles(coreSrcDir);

    // Ensure the static scan covers all 75+ Refractor core components
    expect(tsxFiles.length).toBeGreaterThanOrEqual(75);

    const forbiddenSinks: ReadonlyArray<{ label: string; pattern: RegExp }> = [
      { label: 'dangerouslySetInnerHTML', pattern: /\bdangerouslySetInnerHTML\b/ },
      { label: 'eval(', pattern: /\beval\s*\(/ },
      { label: 'new Function(', pattern: /\bnew\s+Function\s*\(/ },
      { label: 'innerHTML =', pattern: /\binnerHTML\s*=/ },
    ];

    const violations: string[] = [];

    for (const filePath of tsxFiles) {
      const source = fs.readFileSync(filePath, 'utf8');
      const relativePath = path.relative(coreSrcDir, filePath).replace(/\\/g, '/');
      for (const sink of forbiddenSinks) {
        if (sink.pattern.test(source)) {
          violations.push(`${relativePath} contains forbidden sink "${sink.label}"`);
        }
      }
    }

    expect(violations).toEqual([]);
  });
});
