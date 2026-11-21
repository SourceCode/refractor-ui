import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { useRef } from 'react';
import { stableClassName } from '../naming';
import { composeEventHandlers } from '../utils/composeEventHandlers';
import { cx, mergeProps } from '../utils/mergeProps';
import { themeDataAttributeName, themeDataAttributes, themeProps } from '../utils/themeProps';
import {
  darkenHex,
  derivePaletteColor,
  formatRgbTriplet,
  getAccessibleContrastText,
  getContrastRatio,
  hexToHsv,
  hsvToHex,
  hsvToRgb,
  lightenHex,
  mixRgb,
  parseColorToRgb,
  rgbToHex,
  rgbToHsv,
} from '../utils/colorMath';
import {
  buildSafeCsv,
  clampNumber,
  isSafeObjectKey,
  sanitizeCsvCell,
  sanitizeHtml,
  sanitizeUrl,
  splitLiteralHighlight,
} from '../utils/sanitize';
import { computeLineDiff } from '../utils/diffAlgorithm';
import { buildMonthGrid, formatFileSize, getChildrenNodes, type TreeNodeItem } from '../utils/dateGrid';
import { useMergedRefs } from '../hooks/useMergedRefs';
import { useControllableState } from '../hooks/useControllableState';

describe('naming, themeProps, mergeProps & composeEventHandlers', () => {
  it('generates normalized stable class names with optional sub-part', () => {
    expect(stableClassName('PrimaryButton')).toBe('refractor-primary-button');
    expect(stableClassName('PrimaryButton', 'leadingIcon')).toBe(
      'refractor-primary-button__leading-icon'
    );
    expect(stableClassName('  My_Weird  Name! ')).toBe('refractor-my-weird-name');
  });

  it('emits canonical data-* attributes via themeProps omitting false/nullish', () => {
    expect(themeDataAttributeName('isDisabled')).toBe('data-is-disabled');
    expect(themeDataAttributes()).toEqual({});
    expect(
      themeProps('button', {
        variant: 'primary',
        active: true,
        disabled: false,
        empty: undefined,
        none: null,
        level: 2,
      })
    ).toEqual({
      className: 'refractor-button',
      'data-variant': 'primary',
      'data-active': 'true',
      'data-level': '2',
    });
  });

  it('merges theme target, base classes, overrides, xstyle, and user props without clobbering', () => {
    const merged = mergeProps({
      themeTarget: themeProps('card', { variant: 'slab' }),
      baseClassName: 'prism-slab',
      overrideClassName: 'theme-override',
      userClassName: 'custom-user',
      baseStyle: { padding: '8px' },
      overrideStyle: { margin: '4px' },
      xstyle: { '--prism-blur-px': '24px' },
      userStyle: { padding: '12px' },
    });

    expect(merged.className).toBe('refractor-card prism-slab theme-override custom-user');
    expect(merged['data-variant']).toBe('slab');
    expect(merged.style).toEqual({
      padding: '12px',
      margin: '4px',
      '--prism-blur-px': '24px',
    });
    expect(cx('a', false, null, undefined, '  b  ')).toBe('a b');
    expect(mergeProps({ baseClassName: 'only-base' }).style).toBeUndefined();
  });

  it('composes event handlers respecting defaultPrevented', () => {
    const external = vi.fn((e: { defaultPrevented: boolean }) => {
      e.defaultPrevented = true;
    });
    const internal = vi.fn();
    const composed = composeEventHandlers(external, internal);
    composed({ defaultPrevented: false });
    expect(external).toHaveBeenCalledTimes(1);
    expect(internal).not.toHaveBeenCalled();

    const forceRun = composeEventHandlers(external, internal, false);
    forceRun({ defaultPrevented: false });
    expect(internal).toHaveBeenCalledTimes(1);
  });
});

describe('colorMath MUI-style palette derivation & HSV conversions', () => {
  it('parses short hex, full hex, 8-digit hex, rgb(), and handles invalid inputs safely', () => {
    expect(parseColorToRgb('#f0a')).toEqual({ r: 255, g: 0, b: 170 });
    expect(parseColorToRgb('#7c3aed')).toEqual({ r: 124, g: 58, b: 237 });
    expect(parseColorToRgb('#7c3aed80')).toEqual({ r: 124, g: 58, b: 237 });
    expect(parseColorToRgb('rgba(10, 20, 300, 0.5)')).toEqual({ r: 10, g: 20, b: 255 });
    expect(parseColorToRgb('not-a-color', { r: 1, g: 2, b: 3 })).toEqual({ r: 1, g: 2, b: 3 });
    expect(rgbToHex({ r: Number.NaN, g: -5, b: 500 })).toBe('#0000FF');
    expect(formatRgbTriplet({ r: 12, g: 34, b: 56 })).toBe('12, 34, 56');
  });

  it('derives light, dark, RGB triplets, and WCAG accessible contrastText', () => {
    const purple = derivePaletteColor({ main: '#7C3AED' });
    expect(purple.main).toBe('#7C3AED');
    expect(purple.contrastText).toBe('#FFFFFF');
    expect(purple.rgb).toBe('124, 58, 237');
    expect(getContrastRatio('#FFFFFF', '#000000')).toBeCloseTo(21, 1);
    expect(getAccessibleContrastText('#FDE047')).toBe('#151E2C');
    expect(lightenHex('#000000', 0.5)).toBe('#808080');
    expect(darkenHex('#FFFFFF', 0.5)).toBe('#85878B');
    expect(mixRgb({ r: 10, g: 20, b: 30 }, { r: 255, g: 255, b: 255 }, Number.NaN)).toEqual({
      r: 10,
      g: 20,
      b: 30,
    });
  });

  it('round-trips HSV and RGB across all 6 hue sectors', () => {
    for (const h of [0, 30, 90, 150, 210, 270, 330]) {
      const hex = hsvToHex({ h, s: 80, v: 90 });
      const back = hexToHsv(hex);
      expect(Math.abs(back.h - h)).toBeLessThanOrEqual(2);
    }
    expect(rgbToHsv({ r: 128, g: 128, b: 128 })).toEqual({ h: 0, s: 0, v: 50 });
    expect(hsvToRgb({ h: Number.NaN, s: Number.NaN, v: Number.NaN })).toEqual({ r: 0, g: 0, b: 0 });
  });
});

describe('sanitize security primitives (XSS, URL, CSV injection, prototype pollution)', () => {
  it('blocks prototype pollution keys and clamps adversarial numeric values', () => {
    expect(isSafeObjectKey('__proto__')).toBe(false);
    expect(isSafeObjectKey('constructor')).toBe(false);
    expect(isSafeObjectKey('prototype')).toBe(false);
    expect(isSafeObjectKey('department')).toBe(true);

    expect(clampNumber(Number.NaN, 0, 100, 50)).toBe(50);
    expect(clampNumber(Infinity, 0, 100, 50)).toBe(50);
    expect(clampNumber(120, 100, 0)).toBe(100);
    expect(clampNumber(-20, 0, 100)).toBe(0);
  });

  it('enforces strict URL protocol allowlisting', () => {
    expect(sanitizeUrl('https://astryx.atmeta.com')).toBe('https://astryx.atmeta.com');
    expect(sanitizeUrl('/docs/button')).toBe('/docs/button');
    expect(sanitizeUrl('#section')).toBe('#section');
    expect(sanitizeUrl('mailto:team@refractor.dev')).toBe('mailto:team@refractor.dev');
    expect(sanitizeUrl('javascript:alert(1)')).toBe('');
    expect(sanitizeUrl('  java\u0000script:alert(1)')).toBe('');
    expect(sanitizeUrl('//evil.example/x.js')).toBe('');
    expect(sanitizeUrl('data:text/html,<script>alert(1)</script>')).toBe('');
    expect(sanitizeUrl('data:image/png;base64,iVBORw0KGgo=', true)).toBe(
      'data:image/png;base64,iVBORw0KGgo='
    );
    expect(sanitizeUrl('data:image/png;base64,iVBORw0KGgo=', false)).toBe('');
  });

  it('strips scripts, iframes, event handlers, and unsafe URIs from HTML', () => {
    const xss =
      '<p>Hello <strong>World</strong></p><br><script>alert(1)</script><iframe src="https://evil.com"></iframe><img src="javascript:alert(1)" onerror="alert(2)" /><a href="javascript:alert(3)">bad</a><a href=\'https://example.com\' onclick="steal()">good</a><a href=https://plain.example>plain</a><a title="none">nohref</a><img src="https://example.com/a.png" alt="ok" /><img src=\'https://example.com/b.png\' alt=\'b\' /><img alt="nosrc" /><div onclick="x">stripped</div><!-- comment -->';
    const clean = sanitizeHtml(xss);
    expect(clean).not.toContain('<script');
    expect(clean).not.toContain('alert(');
    expect(clean).not.toContain('<iframe');
    expect(clean).not.toContain('onerror');
    expect(clean).not.toContain('onclick');
    expect(clean).not.toContain('javascript:');
    expect(clean).toContain('<strong>World</strong>');
    expect(clean).toContain('<br />');
    expect(clean).toContain('<a href="https://example.com" rel="noopener noreferrer">good</a>');
    expect(clean).toContain('<img src="https://example.com/a.png" alt="ok" />');
    expect(sanitizeUrl('')).toBe('');
    expect(sanitizeUrl('./rel/path')).toBe('./rel/path');
    expect(sanitizeUrl('../up/path')).toBe('../up/path');
    expect(sanitizeUrl('http://example.com')).toBe('http://example.com');
  });

  it('neutralizes CSV/Excel formula injection payloads and builds RFC 4180 CSV', () => {
    expect(sanitizeCsvCell('=CMD|\' /C calc\'!A0')).toBe("'=CMD|' /C calc'!A0");
    expect(sanitizeCsvCell('+1+1')).toBe("'+1+1");
    expect(sanitizeCsvCell('-2+3')).toBe("'-2+3");
    expect(sanitizeCsvCell('@SUM(A1:A2)')).toBe("'@SUM(A1:A2)");
    expect(sanitizeCsvCell('\t=1')).toBe("'\t=1");
    expect(sanitizeCsvCell('Hello, "Glass"')).toBe('"Hello, ""Glass"""');
    expect(sanitizeCsvCell(null)).toBe('');
    expect(sanitizeCsvCell(undefined)).toBe('');

    const csv = buildSafeCsv(['Name', 'Formula'], [['Alpha', '=HYPERLINK("http://evil")']]);
    expect(csv).toBe('Name,Formula\r\nAlpha,"\'=HYPERLINK(""http://evil"")"');
  });

  it('highlights literal queries safely without regex injection', () => {
    const segs = splitLiteralHighlight('Price is $100 (USD).*', '(USD).*');
    expect(segs).toEqual([
      { text: 'Price is $100 ', highlighted: false },
      { text: '(USD).*', highlighted: true },
    ]);
    expect(splitLiteralHighlight('(USD).* trailing', '(USD).*')).toEqual([
      { text: '(USD).*', highlighted: true },
      { text: ' trailing', highlighted: false },
    ]);
    expect(splitLiteralHighlight('', 'x')).toEqual([{ text: '', highlighted: false }]);
    expect(splitLiteralHighlight('hello', '')).toEqual([{ text: 'hello', highlighted: false }]);
  });
});

describe('diffAlgorithm LCS & large-input fallback', () => {
  it('computes additions, deletions, and unchanged lines accurately', () => {
    const res = computeLineDiff('a\nb\nc', 'a\nx\nc\nd');
    expect(res.additions).toBe(2);
    expect(res.deletions).toBe(1);
    expect(res.unchanged).toBe(2);

    const trailingRem = computeLineDiff('a\nb\nc', 'a');
    expect(trailingRem.deletions).toBe(2);
    expect(computeLineDiff('', 'only-new').additions).toBe(1);
    expect(computeLineDiff('only-old', '').deletions).toBe(1);
    expect(computeLineDiff('', '')).toEqual({ lines: [], additions: 0, deletions: 0, unchanged: 0 });
    expect(computeLineDiff('  foo  bar ', 'foo bar', true).unchanged).toBe(1);
  });

  it('handles > 600 line inputs via bounded linear fallback without hanging', () => {
    const bigA = Array.from({ length: 650 }, (_, i) => `line-${i}`).join('\n');
    const bigB = Array.from({ length: 651 }, (_, i) => (i === 5 ? 'changed' : `line-${i}`)).join('\n');
    const res = computeLineDiff(bigA, bigB);
    expect(res.additions).toBe(2);
    expect(res.deletions).toBe(1);
    expect(res.unchanged).toBe(649);
    const bigRev = computeLineDiff(bigB, bigA);
    expect(bigRev.deletions).toBe(2);
  });
});

describe('dateGrid & VFS tree helpers', () => {
  it('formats byte sizes cleanly including edge/negative/NaN inputs', () => {
    expect(formatFileSize(undefined)).toBe('0 B');
    expect(formatFileSize(-10)).toBe('0 B');
    expect(formatFileSize(Number.NaN)).toBe('0 B');
    expect(formatFileSize(512)).toBe('512 B');
    expect(formatFileSize(2048)).toBe('2.0 KB');
    expect(formatFileSize(2 * 1024 * 1024)).toBe('2.00 MB');
  });

  it('sorts folders before files and builds 7-column month grids', () => {
    const items: TreeNodeItem[] = [
      { id: 'f1', name: 'zeta.ts', type: 'file', parentId: null },
      { id: 'd2', name: 'beta', type: 'folder', parentId: null },
      { id: 'd1', name: 'alpha', type: 'folder', parentId: null },
      { id: 'f2', name: 'a.ts', type: 'file', parentId: null },
    ];
    expect(getChildrenNodes(items, null).map((n) => n.id)).toEqual(['d1', 'd2', 'f2', 'f1']);

    const grid = buildMonthGrid(2026, 10);
    expect(grid.length % 7).toBe(0);
    expect(grid.find((c) => c.dateIso === '2026-11-20')?.inCurrentMonth).toBe(true);
    const feb = buildMonthGrid(Number.NaN, Number.NaN);
    expect(feb.length).toBeGreaterThanOrEqual(35);
  });
});

describe('hooks: useMergedRefs & useControllableState', () => {
  it('merges object and callback refs cleanly', () => {
    let cbNode: HTMLDivElement | null = null;
    const objRef = { current: null as HTMLDivElement | null };

    function Harness() {
      const inner = useRef<HTMLDivElement>(null);
      const merged = useMergedRefs<HTMLDivElement>(
        objRef,
        (el) => {
          cbNode = el;
        },
        inner,
        undefined
      );
      return <div ref={merged}>merged</div>;
    }

    render(<Harness />);
    expect(objRef.current).toBeInstanceOf(HTMLDivElement);
    expect(cbNode).toBe(objRef.current);
  });

  it('supports controlled and uncontrolled state transitions', () => {
    const onChange = vi.fn();
    function Harness({ controlled }: { controlled?: string }) {
      const [val, setVal] = useControllableState({
        value: controlled,
        defaultValue: 'init',
        onChange,
      });
      return (
        <div>
          <button type="button" onClick={() => setVal((prev) => `${prev}!`)}>
            {val}
          </button>
          <button type="button" onClick={() => setVal('direct')}>
            direct
          </button>
        </div>
      );
    }

    const { rerender } = render(<Harness />);
    const btn = screen.getByRole('button', { name: 'init' });
    fireEvent.click(btn);
    expect(onChange).toHaveBeenCalledWith('init!');
    fireEvent.click(screen.getByRole('button', { name: 'direct' }));
    expect(onChange).toHaveBeenCalledWith('direct');

    rerender(<Harness controlled="fixed" />);
    const fixedBtn = screen.getByRole('button', { name: 'fixed' });
    fireEvent.click(fixedBtn);
    expect(onChange).toHaveBeenCalledWith('fixed!');
    expect(fixedBtn).toHaveTextContent('fixed');
  });
});
