import { createRef } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import {
  SystemSpotlightLauncher,
  evaluateSpotlightExpression,
  type SpotlightResultItem,
  type SpotlightResultKindMap,
} from './index';

const CUSTOM_CATALOG: ReadonlyArray<SpotlightResultItem> = [
  {
    id: 'app-forge',
    title: 'Shader Forge',
    subtitle: 'Interactive WGSL node composer',
    kind: 'app',
    pathOrShortcut: '⌘2',
    previewBody: 'Compile optical dispersion shaders with real-time frame timing.',
    meta: [
      { label: 'Engine', value: 'WebGPU' },
      { label: 'Channel', value: 'Canary' },
    ],
  },
  {
    id: 'file-manifest',
    title: 'prism-manifest.json',
    subtitle: '~/studio/config/prism-manifest.json',
    kind: 'file',
    pathOrShortcut: '4.1 KB',
    previewBody: '{ "theme": "alabaster", "caustics": true }',
    meta: [{ label: 'Owner', value: 'DesignOps' }],
  },
  {
    id: 'cmd-restart',
    title: 'Restart Optical Daemon',
    subtitle: 'Reloads compositor pipeline cleanly',
    kind: 'command',
    pathOrShortcut: '⇧⌘K',
    previewBody: 'Gracefully restarts the optical glass shader daemon in under 50 ms.',
  },
];

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('evaluateSpotlightExpression (zero-eval math & unit engine)', () => {
  it('evaluates recursive-descent arithmetic with operator precedence, parentheses, decimals, and unary +/-', () => {
    expect(evaluateSpotlightExpression('(24 + 16) * 3')).toEqual({
      expression: '(24 + 16) * 3',
      formattedValue: '120',
      detail: 'Inline arithmetic expression',
    });
    expect(evaluateSpotlightExpression('2 + 3 * 4')?.formattedValue).toBe('14');
    expect(evaluateSpotlightExpression('10 - 3 - 2')?.formattedValue).toBe('5');
    expect(evaluateSpotlightExpression('24 / 6 / 2')?.formattedValue).toBe('2');
    expect(evaluateSpotlightExpression('-5 + 12')?.formattedValue).toBe('7');
    expect(evaluateSpotlightExpression('+4.5 * 2')?.formattedValue).toBe('9');
    expect(evaluateSpotlightExpression('--8')?.formattedValue).toBe('8');
    expect(evaluateSpotlightExpression('-(2 + 3) * -4')?.formattedValue).toBe('20');
    expect(evaluateSpotlightExpression('0.1 + 0.2')?.formattedValue).toBe('0.3');
    expect(evaluateSpotlightExpression('.5 * 4')?.formattedValue).toBe('2');
    expect(evaluateSpotlightExpression('0 * -5')?.formattedValue).toBe('0');
    expect(evaluateSpotlightExpression('1 / 10000000')?.formattedValue).toBe('1e-7');
    expect(evaluateSpotlightExpression('1e16 + 1')?.formattedValue).toBe('10000000000000000');
    expect(evaluateSpotlightExpression('1.5e3 / 3')?.formattedValue).toBe('500');
    expect(evaluateSpotlightExpression('1e+2 + 5')?.formattedValue).toBe('105');
    expect(evaluateSpotlightExpression('1e-2 * 100')?.formattedValue).toBe('1');
    expect(evaluateSpotlightExpression('\t( 9 + 1 ) / 4 ')?.formattedValue).toBe('2.5');
    // Boundary max recursion depth = 32 succeeds
    expect(
      evaluateSpotlightExpression(`${'('.repeat(32)}7${')'.repeat(32)}`)?.formattedValue
    ).toBe('7');
  });

  it('evaluates all 10 deterministic linear unit conversion pairs', () => {
    expect(evaluateSpotlightExpression('24 px to rem')?.formattedValue).toBe('1.5 rem');
    expect(evaluateSpotlightExpression('24px in REM')?.formattedValue).toBe('1.5 rem');
    expect(evaluateSpotlightExpression('-0.001 px to rem')?.formattedValue).toBe('0 rem');
    expect(evaluateSpotlightExpression('1.5 rem to px')?.formattedValue).toBe('24 px');
    expect(evaluateSpotlightExpression('100 km to mi')?.formattedValue).toBe('62.14 mi');
    expect(evaluateSpotlightExpression('100 KM TO MI')?.formattedValue).toBe('62.14 mi');
    expect(evaluateSpotlightExpression('10 mi to km')?.formattedValue).toBe('16.09 km');
    expect(evaluateSpotlightExpression('10 kg to lb')?.formattedValue).toBe('22.05 lb');
    expect(evaluateSpotlightExpression('22.0462 lb to kg')?.formattedValue).toBe('10 kg');
    expect(evaluateSpotlightExpression('0 c to f')?.formattedValue).toBe('32 °F');
    expect(evaluateSpotlightExpression('-40 c to f')?.formattedValue).toBe('-40 °F');
    expect(evaluateSpotlightExpression('32 f to c')?.formattedValue).toBe('0 °C');
    expect(evaluateSpotlightExpression('212 f to c')?.formattedValue).toBe('100 °C');
    expect(evaluateSpotlightExpression('2 gb to mb')?.formattedValue).toBe('2048 MB');
    expect(evaluateSpotlightExpression('512 mb to gb')?.formattedValue).toBe('0.5 GB');
  });

  it('returns null cleanly on division by zero, deep nesting > 32, overflow, > 120 chars, malformed syntax, and unknown units', () => {
    // Division by zero
    expect(evaluateSpotlightExpression('10 / 0')).toBeNull();
    expect(evaluateSpotlightExpression('1 / (5 - 5)')).toBeNull();

    // Deep nesting > 32 (parens & unary)
    expect(evaluateSpotlightExpression(`${'('.repeat(33)}1${')'.repeat(33)}`)).toBeNull();
    expect(evaluateSpotlightExpression(`${'-'.repeat(33)}1`)).toBeNull();

    // Length > 120
    expect(evaluateSpotlightExpression(`${'1+'.repeat(62)}1`)).toBeNull();

    // Overflow / non-finite
    expect(evaluateSpotlightExpression('1e308 * 10')).toBeNull();
    expect(evaluateSpotlightExpression('1e308 + 1e308')).toBeNull();
    expect(evaluateSpotlightExpression('1e309 + 1')).toBeNull();
    expect(evaluateSpotlightExpression('1e308 gb to mb')).toBeNull();
    expect(evaluateSpotlightExpression('1e309 gb to mb')).toBeNull();

    // Malformed syntax, empty, plain numbers, and injection attempts
    expect(evaluateSpotlightExpression('')).toBeNull();
    expect(evaluateSpotlightExpression('   ')).toBeNull();
    expect(evaluateSpotlightExpression('42')).toBeNull();
    expect(evaluateSpotlightExpression('Optical')).toBeNull();
    expect(evaluateSpotlightExpression('1.2.3 + 1')).toBeNull();
    expect(evaluateSpotlightExpression('. + 1')).toBeNull();
    expect(evaluateSpotlightExpression('1e + 1')).toBeNull();
    expect(evaluateSpotlightExpression('1e+ + 1')).toBeNull();
    expect(evaluateSpotlightExpression('()')).toBeNull();
    expect(evaluateSpotlightExpression('(2 + 3')).toBeNull();
    expect(evaluateSpotlightExpression('2 + 3)')).toBeNull();
    expect(evaluateSpotlightExpression('2 +')).toBeNull();
    expect(evaluateSpotlightExpression('2 *')).toBeNull();
    expect(evaluateSpotlightExpression('* 2')).toBeNull();
    expect(evaluateSpotlightExpression('-')).toBeNull();
    expect(evaluateSpotlightExpression('(1 + )')).toBeNull();
    expect(evaluateSpotlightExpression('2 3 +')).toBeNull();
    expect(evaluateSpotlightExpression('10 foo to bar')).toBeNull();
    expect(evaluateSpotlightExpression('10 __proto__ to constructor')).toBeNull();
    expect(evaluateSpotlightExpression('eval(1+1)')).toBeNull();
    expect(evaluateSpotlightExpression('new Function("return 1")()')).toBeNull();
  });
});

describe('SystemSpotlightLauncher', () => {
  it('renders prism-slab split layout, ref, theme override, combobox semantics, and zero raw colors', () => {
    const kindKeys: ReadonlyArray<keyof SpotlightResultKindMap> = [
      'app',
      'file',
      'command',
      'calculation',
    ];
    expect(kindKeys).toHaveLength(4);

    const ref = createRef<HTMLDivElement>();
    const { container } = render(
      <PrismThemeProvider
        theme={{
          components: {
            SystemSpotlightLauncher: {
              className: 'theme-spotlight',
              style: { maxWidth: '820px' },
            },
          },
        }}
      >
        <SystemSpotlightLauncher
          ref={ref}
          className="consumer-spotlight"
          xstyle={{ '--prism-slab-blur-px': '20px' }}
          data-testid="spotlight-root"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('spotlight-root');
    expect(ref.current).toBe(root);
    expect(SystemSpotlightLauncher.displayName).toBe('SystemSpotlightLauncher');
    expect(root).toHaveClass(
      'refractor-system-spotlight-launcher',
      'prism-slab',
      'theme-spotlight',
      'consumer-spotlight'
    );
    expect(root).toHaveStyle({ maxWidth: '820px' });
    expect(root).toHaveAttribute('role', 'region');
    expect(root).toHaveAttribute('aria-label', 'System Spotlight Launcher');
    expect(root).toHaveAttribute('data-count', '6');
    expect(root).not.toHaveAttribute('data-has-calculation');

    const input = screen.getByRole('combobox', { name: 'Spotlight search' });
    expect(input).toHaveAttribute('type', 'search');
    expect(input).toHaveAttribute('aria-expanded', 'true');
    expect(input).toHaveAttribute('aria-autocomplete', 'list');

    const listbox = screen.getByRole('listbox', { name: 'Spotlight search results' });
    expect(input).toHaveAttribute('aria-controls', listbox.id);
    expect(screen.getAllByRole('option')).toHaveLength(6);

    // Split preview pane renders first highlighted item
    expect(screen.getByTestId('spotlight-preview-pane')).toHaveAttribute(
      'data-preview-kind',
      'app'
    );
    expect(screen.getByTestId('spotlight-preview-title')).toHaveTextContent('Optical Studio');
    expect(screen.getByTestId('spotlight-preview-action')).toHaveTextContent('Open / Run');

    // Quick example chips are present
    expect(screen.getByTestId('spotlight-chip-(24 + 16) * 3')).toBeInTheDocument();
    expect(screen.getByTestId('spotlight-chip-100 km to mi')).toBeInTheDocument();
    expect(screen.getByTestId('spotlight-chip-Optical')).toBeInTheDocument();

    // Zero raw hex/rgb/hsl color literals in rendered DOM
    expect(container.innerHTML).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(container.innerHTML).not.toMatch(/\b(?:rgba?|hsla?)\s*\(/);
  });

  it('prepends live Calculation hit via quick chips & typing, copies with navigator.clipboard, and resets Copied feedback', () => {
    vi.useFakeTimers();
    const writeText = vi.fn<(text: string) => Promise<void>>().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });

    const onLaunchResult = vi.fn<(item: SpotlightResultItem) => void>();
    render(<SystemSpotlightLauncher onLaunchResult={onLaunchResult} data-testid="calc-root" />);

    const root = screen.getByTestId('calc-root');
    const input = screen.getByRole('combobox', { name: 'Spotlight search' });

    // Click arithmetic quick chip
    fireEvent.click(screen.getByTestId('spotlight-chip-(24 + 16) * 3'));
    expect(input).toHaveValue('(24 + 16) * 3');
    expect(root).toHaveAttribute('data-has-calculation', 'true');

    const firstOption = screen.getByTestId('spotlight-option-0');
    expect(firstOption).toHaveAttribute('data-kind', 'calculation');
    expect(firstOption).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByTestId('spotlight-calc-output')).toHaveTextContent('120');

    const copyBtn = screen.getByTestId('spotlight-preview-action');
    expect(copyBtn).toHaveTextContent('Copy Result');

    // Click Copy Result
    fireEvent.click(copyBtn);
    expect(writeText).toHaveBeenCalledWith('120');
    expect(onLaunchResult).toHaveBeenCalledTimes(1);
    expect(onLaunchResult.mock.calls[0]?.[0]?.kind).toBe('calculation');
    expect(onLaunchResult.mock.calls[0]?.[0]?.title).toBe('120');
    expect(copyBtn).toHaveTextContent('Copied');
    expect(copyBtn).toHaveAttribute('data-copied', 'true');
    expect(screen.getByTestId('spotlight-live-region')).toHaveTextContent(
      'Copied result 120 to clipboard.'
    );

    // Feedback resets after timer elapses
    act(() => {
      vi.advanceTimersByTime(1900);
    });
    expect(copyBtn).toHaveTextContent('Copy Result');
    expect(copyBtn).not.toHaveAttribute('data-copied');

    // Unit conversion chip
    fireEvent.click(screen.getByTestId('spotlight-chip-100 km to mi'));
    expect(screen.getByTestId('spotlight-calc-output')).toHaveTextContent('62.14 mi');

    // Live calculation alongside a matching catalog item announces plural results
    fireEvent.change(input, { target: { value: '2 + 2' } });
    expect(screen.getByTestId('spotlight-calc-output')).toHaveTextContent('4');

    // Clear query button resets search
    fireEvent.click(screen.getByTestId('spotlight-clear-btn'));
    expect(input).toHaveValue('');
    expect(screen.getByTestId('spotlight-live-region')).toHaveTextContent(
      'Cleared Spotlight search query.'
    );
  });

  it('uses resilient clipboard fallbacks when navigator.clipboard rejects, is missing, or throws', async () => {
    const execCommand = vi.fn<(cmd: string) => boolean>().mockReturnValue(true);
    Object.defineProperty(document, 'execCommand', {
      value: execCommand,
      configurable: true,
    });

    // 1. navigator.clipboard.writeText rejects -> falls back to execCommand('copy')
    const rejectingWrite = vi
      .fn<(text: string) => Promise<void>>()
      .mockRejectedValue(new Error('Clipboard denied'));
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: rejectingWrite },
      configurable: true,
    });

    const { unmount } = render(<SystemSpotlightLauncher defaultQuery="24 px to rem" />);
    fireEvent.click(screen.getByTestId('spotlight-preview-action'));
    await Promise.resolve();
    await Promise.resolve();
    expect(rejectingWrite).toHaveBeenCalledWith('1.5 rem');
    expect(execCommand).toHaveBeenCalledWith('copy');
    unmount();

    // 2. navigator.clipboard missing -> uses execCommand('copy') synchronously
    execCommand.mockClear();
    Object.defineProperty(navigator, 'clipboard', {
      value: undefined,
      configurable: true,
    });
    const { unmount: unmount2 } = render(<SystemSpotlightLauncher defaultQuery="0 c to f" />);
    fireEvent.click(screen.getByTestId('spotlight-preview-action'));
    expect(execCommand).toHaveBeenCalledWith('copy');
    unmount2();

    // 3. navigator.clipboard getter throws AND document.execCommand throws -> zero uncaught errors
    Object.defineProperty(navigator, 'clipboard', {
      get() {
        throw new Error('Blocked');
      },
      configurable: true,
    });
    Object.defineProperty(document, 'execCommand', {
      value: () => {
        throw new Error('Unsupported');
      },
      configurable: true,
    });
    const { unmount: unmount3 } = render(<SystemSpotlightLauncher defaultQuery="8 * 9" />);
    expect(() => {
      fireEvent.click(screen.getByTestId('spotlight-preview-action'));
    }).not.toThrow();
    expect(screen.getByTestId('spotlight-preview-action')).toHaveTextContent('Copied');
    unmount3();

    // 4. document.execCommand unavailable -> still succeeds cleanly
    Object.defineProperty(navigator, 'clipboard', {
      value: undefined,
      configurable: true,
    });
    Object.defineProperty(document, 'execCommand', {
      value: undefined,
      configurable: true,
    });
    render(<SystemSpotlightLauncher defaultQuery="6 + 7" />);
    expect(() => {
      fireEvent.click(screen.getByTestId('spotlight-preview-action'));
    }).not.toThrow();
  });

  it('filters apps, files, and commands across title, subtitle, shortcut, body, and meta; supports click selection, double-click, and Open / Run', () => {
    const onLaunchResult = vi.fn<(item: SpotlightResultItem) => void>();
    render(<SystemSpotlightLauncher items={CUSTOM_CATALOG} onLaunchResult={onLaunchResult} />);

    const input = screen.getByRole('combobox', { name: 'Spotlight search' });

    // Match by meta value ('WebGPU')
    fireEvent.change(input, { target: { value: 'webgpu' } });
    expect(screen.getAllByRole('option')).toHaveLength(1);
    expect(screen.getByTestId('spotlight-preview-title')).toHaveTextContent('Shader Forge');

    // Match by pathOrShortcut ('4.1 KB')
    fireEvent.change(input, { target: { value: '4.1 kb' } });
    expect(screen.getAllByRole('option')).toHaveLength(1);
    expect(screen.getByTestId('spotlight-preview-title')).toHaveTextContent('prism-manifest.json');
    expect(screen.getByTestId('spotlight-preview-kind')).toHaveTextContent('File');

    // Match by previewBody ('daemon')
    fireEvent.change(input, { target: { value: 'daemon' } });
    expect(screen.getAllByRole('option')).toHaveLength(1);
    expect(screen.getByTestId('spotlight-preview-title')).toHaveTextContent(
      'Restart Optical Daemon'
    );
    expect(screen.getByTestId('spotlight-preview-kind')).toHaveTextContent('Command');

    // Clear and click second option to update preview, then launch via Open / Run & double-click
    fireEvent.change(input, { target: { value: '' } });
    expect(screen.getAllByRole('option')).toHaveLength(3);

    const secondOption = screen.getByTestId('spotlight-option-1');
    fireEvent.click(secondOption);
    expect(secondOption).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByTestId('spotlight-preview-title')).toHaveTextContent('prism-manifest.json');

    fireEvent.click(screen.getByTestId('spotlight-preview-action'));
    expect(onLaunchResult).toHaveBeenCalledTimes(1);
    expect(onLaunchResult.mock.calls[0]?.[0]?.id).toBe('file-manifest');

    const thirdOption = screen.getByTestId('spotlight-option-2');
    fireEvent.doubleClick(thirdOption);
    expect(onLaunchResult).toHaveBeenCalledTimes(2);
    expect(onLaunchResult.mock.calls[1]?.[0]?.id).toBe('cmd-restart');
  });

  it('supports IME-safe ArrowDown, ArrowUp, Home, End, Enter, and Escape keyboard navigation', () => {
    const onLaunchResult = vi.fn<(item: SpotlightResultItem) => void>();
    render(<SystemSpotlightLauncher items={CUSTOM_CATALOG} onLaunchResult={onLaunchResult} />);

    const input = screen.getByRole('combobox', { name: 'Spotlight search' });

    // Initial active option is index 0
    expect(screen.getByTestId('spotlight-option-0')).toHaveAttribute('aria-selected', 'true');

    // IME composing events must be ignored completely
    fireEvent.keyDown(input, { key: 'ArrowDown', isComposing: true });
    fireEvent.keyDown(input, { key: 'Enter', isComposing: true });
    fireEvent.keyDown(input, { key: 'Escape', isComposing: true });
    expect(screen.getByTestId('spotlight-option-0')).toHaveAttribute('aria-selected', 'true');
    expect(onLaunchResult).not.toHaveBeenCalled();

    // ArrowDown advances 0 -> 1 -> 2 -> wraps to 0
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(screen.getByTestId('spotlight-option-1')).toHaveAttribute('aria-selected', 'true');
    expect(input).toHaveAttribute(
      'aria-activedescendant',
      screen.getByTestId('spotlight-option-1').id
    );

    // End jumps to last item (2)
    fireEvent.keyDown(input, { key: 'End' });
    expect(screen.getByTestId('spotlight-option-2')).toHaveAttribute('aria-selected', 'true');

    // ArrowDown wraps back to 0
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(screen.getByTestId('spotlight-option-0')).toHaveAttribute('aria-selected', 'true');

    // ArrowUp wraps to last item (2)
    fireEvent.keyDown(input, { key: 'ArrowUp' });
    expect(screen.getByTestId('spotlight-option-2')).toHaveAttribute('aria-selected', 'true');

    // Home jumps back to 0
    fireEvent.keyDown(input, { key: 'Home' });
    expect(screen.getByTestId('spotlight-option-0')).toHaveAttribute('aria-selected', 'true');

    // Enter launches active result
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onLaunchResult).toHaveBeenCalledTimes(1);
    expect(onLaunchResult.mock.calls[0]?.[0]?.id).toBe('app-forge');

    // Unhandled key leaves active selection unchanged
    fireEvent.keyDown(input, { key: 'a' });
    expect(screen.getByTestId('spotlight-option-0')).toHaveAttribute('aria-selected', 'true');

    // Escape on empty query is a safe no-op
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(input).toHaveValue('');

    // Type query then Escape clears it
    fireEvent.change(input, { target: { value: 'manifest' } });
    expect(input).toHaveValue('manifest');
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(input).toHaveValue('');
    expect(screen.getByTestId('spotlight-live-region')).toHaveTextContent(
      'Cleared Spotlight search query.'
    );
  });

  it('renders role="status" empty state on 0 matches and handles empty catalog + live calculation hit', () => {
    const onLaunchResult = vi.fn<(item: SpotlightResultItem) => void>();
    const { rerender } = render(
      <SystemSpotlightLauncher items={CUSTOM_CATALOG} onLaunchResult={onLaunchResult} />
    );

    const input = screen.getByRole('combobox', { name: 'Spotlight search' });
    fireEvent.change(input, { target: { value: 'nonexistent-xyz' } });

    const emptyStatus = screen.getByRole('status');
    expect(emptyStatus).toBe(screen.getByTestId('spotlight-empty-state'));
    expect(emptyStatus).toHaveTextContent('No matches for "nonexistent-xyz"');
    expect(screen.queryByTestId('spotlight-preview-pane')).toBeNull();

    // Navigation keys on empty list are safe no-ops
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onLaunchResult).not.toHaveBeenCalled();

    // Clear Search button inside empty state restores catalog
    fireEvent.click(screen.getByRole('button', { name: 'Clear Search' }));
    expect(input).toHaveValue('');
    expect(screen.getAllByRole('option')).toHaveLength(3);

    // Explicit empty items=[] shows empty catalog status, yet math still evaluates live!
    rerender(<SystemSpotlightLauncher items={[]} />);
    expect(screen.getByRole('status')).toHaveTextContent('No Spotlight items available');
    expect(screen.queryByRole('button', { name: 'Clear Search' })).toBeNull();

    fireEvent.change(input, { target: { value: '6 * 7' } });
    expect(screen.queryByTestId('spotlight-empty-state')).toBeNull();
    expect(screen.getByTestId('spotlight-calc-output')).toHaveTextContent('42');
    expect(screen.getByTestId('spotlight-result-count')).toHaveTextContent('1 result');
  });

  it('defends against ReDoS queries, XSS literal previewBody payloads, duplicate/prototype IDs, blank fields, and prebuilt calculation items', () => {
    const adversarialItems: ReadonlyArray<SpotlightResultItem> = [
      {
        id: '__proto__',
        title: '<script>alert("xss")</script>',
        subtitle: '<img src=x onerror=alert(1)>',
        kind: 'file',
        previewBody: '<script>window.__pwned=1</script><img src="x" onerror="alert(2)">',
        meta: [{ label: 'Payload', value: '<svg onload=alert(3)>' }],
      },
      {
        id: '__proto__',
        title: '   ',
        subtitle: '   ',
        kind: 'command',
        previewBody: 'Fallback untitled command',
      },
      {
        id: 'constructor',
        title: '42 ms',
        subtitle: 'Saved benchmark metric 1 + 1',
        kind: 'calculation',
        previewBody: 'frameBudget = 42 ms',
      },
    ];

    const onLaunchResult = vi.fn<(item: SpotlightResultItem) => void>();
    const { container } = render(
      <SystemSpotlightLauncher
        items={adversarialItems}
        aria-label="Custom Spotlight"
        onLaunchResult={onLaunchResult}
      />
    );

    expect(screen.getByRole('region', { name: 'Custom Spotlight' })).toBeInTheDocument();

    // XSS payload rendered strictly as literal text, zero injected script/img/svg payload elements
    expect(screen.getByTestId('spotlight-preview-body')).toHaveTextContent(
      '<script>window.__pwned=1</script><img src="x" onerror="alert(2)">'
    );
    expect(container.querySelector('script')).toBeNull();
    expect(container.querySelector('img')).toBeNull();

    // Blank title falls back cleanly to 'Untitled item'
    const secondOption = screen.getByTestId('spotlight-option-1');
    fireEvent.click(secondOption);
    expect(screen.getByTestId('spotlight-preview-title')).toHaveTextContent('Untitled item');
    fireEvent.click(screen.getByTestId('spotlight-preview-action'));
    expect(screen.getByTestId('spotlight-live-region')).toHaveTextContent(
      'Launched Untitled item.'
    );

    // Prebuilt calculation item renders without live evalResult using previewBody & subtitle fallbacks
    const thirdOption = screen.getByTestId('spotlight-option-2');
    fireEvent.click(thirdOption);
    expect(screen.getByTestId('spotlight-calc-output')).toHaveTextContent('42 ms');
    expect(screen.getByTestId('spotlight-preview-pane')).toHaveTextContent('frameBudget = 42 ms');
    expect(screen.getByTestId('spotlight-preview-pane')).toHaveTextContent(
      'Saved benchmark metric'
    );

    // Live calculation alongside a matching catalog item announces plural results
    const input = screen.getByRole('combobox', { name: 'Spotlight search' });
    fireEvent.change(input, { target: { value: '1 + 1' } });
    expect(screen.getByTestId('spotlight-live-region')).toHaveTextContent(
      'Calculation result 2. 2 results available.'
    );
    expect(screen.getAllByRole('option')).toHaveLength(2);

    // ReDoS-style catastrophic backtracking queries evaluate linearly and safely
    const redosQuery = `${'('.repeat(80)}a+${')'.repeat(80)}${'a'.repeat(4000)}!`;
    fireEvent.change(input, { target: { value: redosQuery } });
    expect(screen.getByRole('status')).toHaveTextContent('No matches for');
  });

  it('locks down all interactions cleanly when disabled={true}', () => {
    const onLaunchResult = vi.fn<(item: SpotlightResultItem) => void>();
    render(
      <SystemSpotlightLauncher
        items={CUSTOM_CATALOG}
        defaultQuery="Optical"
        disabled
        onLaunchResult={onLaunchResult}
        data-testid="disabled-root"
      />
    );

    const root = screen.getByTestId('disabled-root');
    expect(root).toHaveAttribute('data-disabled', 'true');
    expect(root).toHaveAttribute('aria-disabled', 'true');

    const input = screen.getByRole('combobox', { name: 'Spotlight search' });
    expect(input).toBeDisabled();
    expect(screen.getByTestId('spotlight-clear-btn')).toBeDisabled();
    expect(screen.getByTestId('spotlight-chip-Optical')).toBeDisabled();
    expect(screen.getByTestId('spotlight-preview-action')).toBeDisabled();

    // Keyboard & click handlers are blocked when disabled
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Enter' });
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(input).toHaveValue('Optical');
    expect(onLaunchResult).not.toHaveBeenCalled();

    fireEvent.click(screen.getByTestId('spotlight-option-0'));
    fireEvent.doubleClick(screen.getByTestId('spotlight-option-0'));
    fireEvent.click(screen.getByTestId('spotlight-preview-action'));
    expect(onLaunchResult).not.toHaveBeenCalled();
  });
});
