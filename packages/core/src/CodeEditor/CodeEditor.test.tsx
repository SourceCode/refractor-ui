import { createRef, useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import { CodeEditor, type CodeDiagnostic } from './CodeEditor';

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('CodeEditor', () => {
  it('renders prism-slab IDE surface, crystal header, line gutter, ref, and theme overrides', () => {
    const ref = createRef<HTMLDivElement>();

    render(
      <PrismThemeProvider
        theme={{
          components: {
            CodeEditor: {
              className: 'theme-ce',
              style: { letterSpacing: '0.1px' },
            },
          },
        }}
      >
        <CodeEditor
          ref={ref}
          label="optics.ts"
          defaultValue={'export const blur = 18;\nexport const mode = "vivid";'}
          className="local-ce"
          xstyle={{ '--prism-blur-px': '12px' }}
          data-testid="ce-root"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('ce-root');
    expect(ref.current).toBe(root);
    expect(root).toHaveClass('refractor-code-editor', 'prism-slab', 'theme-ce', 'local-ce');
    expect(root).toHaveAttribute('data-language', 'typescript');
    expect(root).toHaveAttribute('data-tab-size', '2');
    expect(root).toHaveAttribute('data-line-numbers', 'true');
    expect(root).toHaveStyle({ letterSpacing: '0.1px' });

    expect(screen.getByText('optics.ts')).toBeInTheDocument();
    expect(screen.getByText('TypeScript')).toBeInTheDocument();
    expect(screen.getByText('Ln 1, Col 1')).toBeInTheDocument();

    const gutter = screen.getByLabelText('Line numbers');
    expect(within(gutter).getByRole('button', { name: 'Jump to line 1' })).toBeInTheDocument();
    expect(within(gutter).getByRole('button', { name: 'Jump to line 2' })).toBeInTheDocument();

    const textarea = screen.getByLabelText('optics.ts');
    expect(textarea).toHaveValue('export const blur = 18;\nexport const mode = "vivid";');
  });

  it('tokenizes TypeScript, JSON, and CSS cleanly into pure React span elements without raw HTML', () => {
    const tsCode = [
      '// Single line comment',
      '/* Multi-line',
      '   block comment */',
      'export const cfg = { count: 42, ratio: 3.14, mask: 0xff, upper: 0XAB, label: "hi\\"there", tpl: `line1',
      'line2` };',
      'const value = cfg.count + unknownSymbol;',
    ].join('\n');

    const { rerender, container } = render(
      <CodeEditor language="typescript" defaultValue={tsCode} />
    );

    expect(screen.getByText('Code Editor')).toBeInTheDocument();
    const canvas = container.querySelector('[data-code-canvas="true"]') as HTMLElement;
    expect(canvas.querySelectorAll('[data-token-type="comment"]').length).toBeGreaterThanOrEqual(3);
    expect(canvas.querySelectorAll('[data-token-type="keyword"]').length).toBeGreaterThanOrEqual(3);
    expect(canvas.querySelectorAll('[data-token-type="property"]').length).toBeGreaterThanOrEqual(4);
    expect(canvas.querySelectorAll('[data-token-type="number"]').length).toBeGreaterThanOrEqual(3);
    expect(canvas.querySelectorAll('[data-token-type="string"]').length).toBeGreaterThanOrEqual(3);
    expect(canvas.querySelectorAll('[data-token-type="punctuation"]').length).toBeGreaterThan(0);

    // JSON tokenization
    const jsonCode = '{\n  "version": "1.4.0",\n  "count": -12.5,\n  "enabled": true,\n  "extra": badToken\n}';
    rerender(<CodeEditor language="json" value={jsonCode} />);
    expect(screen.getByText('JSON')).toBeInTheDocument();
    expect(canvas.querySelectorAll('[data-token-type="property"]').length).toBe(4);
    expect(canvas.querySelectorAll('[data-token-type="string"]').length).toBe(1);
    expect(canvas.querySelectorAll('[data-token-type="number"]').length).toBe(1);
    expect(canvas.querySelectorAll('[data-token-type="keyword"]').length).toBe(1);

    // CSS tokenization
    const cssCode = [
      '@media (min-width: 768px) {',
      '  /* glass surface',
      '     token */',
      '  .prism-slab {',
      '    --prism-blur-px: 18px;',
      '    width: 100%;',
      '    color: #38bdf8;',
      '    backdrop-filter: blur(var(--prism-blur-px));',
      '    font-family: "Inter";',
      '    display: flex;',
      '    z-index: 10;',
      '    content: `~`;',
      '  }',
      '}',
    ].join('\n');
    rerender(<CodeEditor language="css" value={cssCode} />);
    expect(screen.getByText('CSS')).toBeInTheDocument();
    expect(canvas.querySelectorAll('[data-token-type="keyword"]').length).toBeGreaterThanOrEqual(4);
    expect(canvas.querySelectorAll('[data-token-type="property"]').length).toBeGreaterThanOrEqual(5);
    expect(canvas.querySelectorAll('[data-token-type="number"]').length).toBeGreaterThanOrEqual(4);
    expect(canvas.querySelectorAll('[data-token-type="string"]').length).toBeGreaterThanOrEqual(1);
    expect(canvas.querySelectorAll('[data-token-type="comment"]').length).toBeGreaterThanOrEqual(2);
  });

  it('supports Tab auto-indentation, IME-safe Enter auto-indentation (including after {), and tabSize clamping', () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <CodeEditor
        label="editor.ts"
        defaultValue={'function run() {'}
        tabSize={4}
        onChange={onChange}
      />
    );

    const textarea = screen.getByLabelText('editor.ts') as HTMLTextAreaElement;

    // Enter after '{' adds tabSize (4) spaces of indentation
    textarea.setSelectionRange(textarea.value.length, textarea.value.length);
    fireEvent.keyDown(textarea, { key: 'Enter' });
    expect(textarea.value).toBe('function run() {\n    ');
    expect(screen.getByText('Ln 2, Col 5')).toBeInTheDocument();

    // Tab inserts 4 spaces
    fireEvent.keyDown(textarea, { key: 'Tab' });
    expect(textarea.value).toBe('function run() {\n        ');
    expect(screen.getByText('Ln 2, Col 9')).toBeInTheDocument();

    // Enter on indented line without '{' preserves leading whitespace (including tabs)
    fireEvent.change(textarea, { target: { value: '\t  const x = 1;' } });
    textarea.setSelectionRange(textarea.value.length, textarea.value.length);
    fireEvent.keyDown(textarea, { key: 'Enter' });
    expect(textarea.value).toBe('\t  const x = 1;\n\t  ');

    // Enter at position 0 (start === 0)
    textarea.setSelectionRange(0, 0);
    fireEvent.keyDown(textarea, { key: 'Enter' });
    expect(textarea.value.startsWith('\n\t  const x = 1;')).toBe(true);

    // IME composing Enter & Tab must NOT be intercepted
    onChange.mockClear();
    const composingEnter = new KeyboardEvent('keydown', {
      key: 'Enter',
      bubbles: true,
      cancelable: true,
    });
    Object.defineProperty(composingEnter, 'isComposing', { value: true });
    fireEvent(textarea, composingEnter);
    expect(composingEnter.defaultPrevented).toBe(false);
    expect(onChange).not.toHaveBeenCalled();

    // tabSize clamping (1 -> 2, 20 -> 8, NaN -> 2)
    rerender(<CodeEditor data-testid="clamp-ce" tabSize={1} defaultValue="" />);
    expect(screen.getByTestId('clamp-ce')).toHaveAttribute('data-tab-size', '2');

    rerender(<CodeEditor data-testid="clamp-ce" tabSize={20} defaultValue="" />);
    expect(screen.getByTestId('clamp-ce')).toHaveAttribute('data-tab-size', '8');

    rerender(<CodeEditor data-testid="clamp-ce" tabSize={Number.NaN} defaultValue="" />);
    expect(screen.getByTestId('clamp-ce')).toHaveAttribute('data-tab-size', '2');
  });

  it('displays gutter diagnostic markers, summary counts, live diagnostic panel, and jumps to lines on click', () => {
    const diagnostics: ReadonlyArray<CodeDiagnostic> = [
      { line: 2, severity: 'warning', message: 'Unused binding detected' },
      { line: 2, severity: 'error', message: 'Type mismatch on assignment' },
      { line: 3, severity: 'warning', message: 'Prefer const over let' },
      { line: 3, severity: 'warning', message: 'Secondary warning on line 3' },
    ];

    const { container } = render(
      <CodeEditor
        label="diag.ts"
        defaultValue={'const a = 1;\nconst b: number = "bad";\nlet c = 3;'}
        diagnostics={diagnostics}
      />
    );

    expect(container.querySelector('[data-diagnostic-count="error"]')).toHaveTextContent('1');
    expect(container.querySelector('[data-diagnostic-count="warning"]')).toHaveTextContent('3');

    const gutter = screen.getByLabelText('Line numbers');
    // Line 2 has both warning and error -> gutter elevates severity to error
    const line2Btn = within(gutter).getByRole('button', {
      name: /Line 2 \(error\): Unused binding detected; Type mismatch on assignment/,
    });
    expect(line2Btn.querySelector('[data-severity="error"]')).not.toBeNull();

    const line3Btn = within(gutter).getByRole('button', {
      name: /Line 3 \(warning\): Prefer const over let; Secondary warning on line 3/,
    });
    expect(line3Btn.querySelector('[data-severity="warning"]')).not.toBeNull();

    // Live diagnostic panel lists all 4 diagnostics and jumps cursor on click
    const panel = screen.getByRole('region', { name: 'Code diagnostics' });
    expect(within(panel).getAllByRole('button')).toHaveLength(4);

    fireEvent.click(within(panel).getByRole('button', { name: /Prefer const over let/ }));
    expect(screen.getByText('Ln 3, Col 1')).toBeInTheDocument();
    expect(container.querySelector('[data-code-line="3"]')).toHaveAttribute('data-active-line', 'true');

    // Clicking gutter line jumps to line 1
    fireEvent.click(within(gutter).getByRole('button', { name: 'Jump to line 1' }));
    expect(screen.getByText('Ln 1, Col 1')).toBeInTheDocument();
  });

  it('copies code to clipboard with Copied state reset, handles rejection/missing clipboard, and syncs scroll/cursor', async () => {
    vi.useFakeTimers();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });

    const { container, unmount } = render(
      <CodeEditor label="copy.ts" defaultValue={'const a = 1;\nconst b = 2;'} />
    );

    const copyBtn = screen.getByRole('button', { name: 'Copy code' });
    await act(async () => {
      fireEvent.click(copyBtn);
    });
    expect(writeText).toHaveBeenCalledWith('const a = 1;\nconst b = 2;');
    expect(copyBtn).toHaveTextContent('Copied');

    // Clicking a second time resets pending timeout cleanly
    await act(async () => {
      fireEvent.click(copyBtn);
    });
    act(() => {
      vi.advanceTimersByTime(1800);
    });
    expect(copyBtn).toHaveTextContent('Copy');

    // Scroll, click, keyUp, and select handlers sync canvas/gutter and Ln/Col
    const textarea = screen.getByLabelText('copy.ts') as HTMLTextAreaElement;
    textarea.scrollTop = 24;
    textarea.scrollLeft = 12;
    fireEvent.scroll(textarea);
    const canvas = container.querySelector('[data-code-canvas="true"]') as HTMLElement;
    expect(canvas.scrollTop).toBe(24);
    expect(canvas.scrollLeft).toBe(12);

    textarea.setSelectionRange(16, 16);
    fireEvent.click(textarea);
    expect(screen.getByText('Ln 2, Col 4')).toBeInTheDocument();
    fireEvent.keyUp(textarea);
    fireEvent.select(textarea);

    // Rejecting clipboard promise does not crash
    writeText.mockRejectedValueOnce(new Error('Clipboard blocked'));
    await act(async () => {
      fireEvent.click(copyBtn);
    });
    expect(copyBtn).toHaveTextContent('Copy');

    // Start copy timer then unmount to verify timer cleanup
    writeText.mockResolvedValueOnce(undefined);
    await act(async () => {
      fireEvent.click(copyBtn);
    });
    unmount();

    // Missing clipboard does not throw; scroll also works when gutter is hidden
    Object.defineProperty(navigator, 'clipboard', {
      value: undefined,
      configurable: true,
    });
    render(<CodeEditor label="nogutter.ts" defaultValue="const x = 1;" showLineNumbers={false} />);
    expect(screen.queryByLabelText('Line numbers')).not.toBeInTheDocument();
    fireEvent.scroll(screen.getByLabelText('nogutter.ts'));
    fireEvent.click(screen.getByRole('button', { name: 'Copy code' }));
  });

  it('supports controlled mode and blocks edits in readOnly mode', () => {
    function ControlledHarness() {
      const [code, setCode] = useState('const v = 1;');
      return <CodeEditor label="controlled.ts" value={code} onChange={setCode} />;
    }

    render(<ControlledHarness />);
    const controlledArea = screen.getByLabelText('controlled.ts');
    fireEvent.change(controlledArea, { target: { value: 'const v = 2;' } });
    expect(controlledArea).toHaveValue('const v = 2;');

    const onReadOnlyChange = vi.fn();
    render(
      <CodeEditor
        label="locked.ts"
        value="const locked = true;"
        readOnly
        onChange={onReadOnlyChange}
      />
    );
    const lockedArea = screen.getByLabelText('locked.ts');
    expect(lockedArea).toHaveAttribute('readonly');
    expect(lockedArea).toHaveClass('disabled:cursor-not-allowed', 'cursor-not-allowed');
    fireEvent.change(lockedArea, { target: { value: 'mutated' } });
    fireEvent.keyDown(lockedArea, { key: 'Tab' });
    fireEvent.keyDown(lockedArea, { key: 'Enter' });
    expect(onReadOnlyChange).not.toHaveBeenCalled();
  });

  it('safely handles empty code, invalid diagnostic line numbers, XSS payloads, and unterminated tokens (adversarial)', () => {
    const hostileDiagnostics: ReadonlyArray<CodeDiagnostic> = [
      { line: 0, severity: 'error', message: 'Zero line' },
      { line: -5, severity: 'warning', message: 'Negative line' },
      { line: 999, severity: 'error', message: 'Out of bounds' },
      { line: 1.5, severity: 'warning', message: 'Fractional line' },
      { line: Number.NaN, severity: 'error', message: 'NaN line' },
      { line: Number.POSITIVE_INFINITY, severity: 'error', message: 'Infinity line' },
    ];

    const { container, rerender } = render(
      <CodeEditor defaultValue="" diagnostics={hostileDiagnostics} />
    );

    expect(container.querySelector('[data-diagnostic-count="error"]')).toHaveTextContent('0');
    expect(container.querySelector('[data-diagnostic-count="warning"]')).toHaveTextContent('0');
    expect(screen.queryByRole('region', { name: 'Code diagnostics' })).not.toBeInTheDocument();
    expect(container.textContent).not.toContain('NaN');
    expect(container.querySelectorAll('[data-code-line]')).toHaveLength(1);

    // XSS payload in code & diagnostics + unterminated single-line string + CRLF + unterminated comment
    const xssCode =
      'const payload = "<script>window.__ceXss=1</script><img src=x onerror=alert(1)>";\r\n"unterminated\r\n/* unterminated comment';
    rerender(
      <CodeEditor
        value={xssCode}
        diagnostics={[
          {
            line: 1,
            severity: 'error',
            message: '<script>window.__diagXss=1</script>Unsafe token',
          },
        ]}
      />
    );

    expect(document.querySelector('script')).toBeNull();
    expect(screen.getByRole('region', { name: 'Code diagnostics' })).toHaveTextContent(
      '<script>window.__diagXss=1</script>Unsafe token'
    );
  });
});
