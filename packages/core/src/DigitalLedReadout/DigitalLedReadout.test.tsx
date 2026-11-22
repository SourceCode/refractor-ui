import { createRef, useState } from 'react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import {
  DigitalLedReadout,
  type LedDisplayStyle,
  type LedPhosphorTone,
  type LedReadoutSize,
} from './index';

function getDigitCells(svg: Element): SVGGElement[] {
  return Array.from(svg.querySelectorAll<SVGGElement>('g[data-cell-kind="digit"]'));
}

function getColonCells(svg: Element): SVGGElement[] {
  return Array.from(svg.querySelectorAll<SVGGElement>('g[data-cell-kind="colon"]'));
}

function getLitSegments(cell: SVGGElement): string[] {
  return Array.from(cell.querySelectorAll<SVGPolygonElement>('polygon[data-lit="true"]'))
    .map((el) => el.getAttribute('data-segment') ?? '')
    .sort();
}

describe('DigitalLedReadout', () => {
  it('renders sculpted prism-slab housing, prism-well window, SVG viewBox, accessible status, theme override, and React 19 ref', () => {
    const ref = createRef<HTMLDivElement>();

    render(
      <PrismThemeProvider
        theme={{
          components: {
            DigitalLedReadout: {
              className: 'theme-led-readout',
              style: { minWidth: '220px' },
            },
          },
        }}
      >
        <DigitalLedReadout
          ref={ref}
          label="Oscillator"
          unit="MHz"
          className="local-led-readout"
          xstyle={{ '--prism-blur-px': '20px' }}
          style={{ marginTop: '8px' }}
          data-testid="led-root"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('led-root');
    const status = screen.getByRole('status', { name: 'Oscillator: 128.4 MHz' });
    const svg = screen.getByTestId('led-readout-svg');

    expect(DigitalLedReadout.displayName).toBe('DigitalLedReadout');
    expect(ref.current).toBe(root);
    expect(root).toHaveClass(
      'refractor-digital-led-readout',
      'prism-slab',
      'theme-led-readout',
      'local-led-readout'
    );
    expect(root).toHaveAttribute('data-display-style', '7-segment');
    expect(root).toHaveAttribute('data-tone', 'primary');
    expect(root).toHaveAttribute('data-size', 'md');
    expect(root).toHaveStyle({ minWidth: '220px', marginTop: '8px' });

    expect(status).toHaveClass('prism-well', 'refractor-digital-led-readout__window');
    expect(status).toHaveAttribute('aria-live', 'polite');
    expect(status).toHaveAttribute('aria-atomic', 'true');
    expect(screen.getByTestId('led-readout-label')).toHaveTextContent('Oscillator');
    expect(screen.getByTestId('led-readout-unit')).toHaveTextContent('MHz');
    expect(screen.getByTestId('led-readout-unit')).toHaveAttribute('aria-hidden', 'true');
    expect(screen.queryByTestId('led-style-toggle')).not.toBeInTheDocument();

    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(svg).toHaveAttribute('data-display-style', '7-segment');
    const viewBox = svg.getAttribute('viewBox');
    expect(viewBox).toMatch(/^0 0 \d+ \d+$/);

    const digits = getDigitCells(svg);
    expect(digits).toHaveLength(4);
    expect(digits.map((d) => d.getAttribute('data-cell-char'))).toEqual(['1', '2', '8', '4']);
    expect(digits[2]?.getAttribute('data-has-decimal')).toBe('true');
    const dpLit = digits[2]?.querySelector('circle[data-segment="dp"]');
    expect(dpLit).toHaveAttribute('data-lit', 'true');
    expect(dpLit).toHaveAttribute('fill', 'var(--prism-primary-main)');
  });

  it('renders exact beveled 7-segment polygon patterns for all digits 0123456789', () => {
    const expectedSegments: Record<string, string[]> = {
      '0': ['a', 'b', 'c', 'd', 'e', 'f'],
      '1': ['b', 'c'],
      '2': ['a', 'b', 'd', 'e', 'g'],
      '3': ['a', 'b', 'c', 'd', 'g'],
      '4': ['b', 'c', 'f', 'g'],
      '5': ['a', 'c', 'd', 'f', 'g'],
      '6': ['a', 'c', 'd', 'e', 'f', 'g'],
      '7': ['a', 'b', 'c'],
      '8': ['a', 'b', 'c', 'd', 'e', 'f', 'g'],
      '9': ['a', 'b', 'c', 'd', 'f', 'g'],
    };

    const { container } = render(<DigitalLedReadout value="0123456789" />);
    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
    if (!svg) return;

    const cells = getDigitCells(svg);
    expect(cells).toHaveLength(10);

    for (const cell of cells) {
      const ch = cell.getAttribute('data-cell-char') ?? '';
      expect(getLitSegments(cell)).toEqual(expectedSegments[ch]);
      const unlit = Array.from(cell.querySelectorAll('polygon[data-lit="false"]'));
      for (const poly of unlit) {
        expect(poly).toHaveAttribute(
          'fill',
          'color-mix(in srgb, var(--prism-primary-main) 12%, transparent)'
        );
      }
    }
  });

  it('renders colon timecode 12:45:09 in both 7-segment and nixie modes', () => {
    const { container, rerender } = render(
      <DigitalLedReadout label="Clock" value="12:45:09" displayStyle="7-segment" />
    );

    expect(screen.getByRole('status', { name: 'Clock: 12:45:09' })).toBeInTheDocument();
    const sevenSegSvg = container.querySelector('svg');
    expect(sevenSegSvg).not.toBeNull();
    if (!sevenSegSvg) return;

    expect(getDigitCells(sevenSegSvg)).toHaveLength(6);
    const sevenColons = getColonCells(sevenSegSvg);
    expect(sevenColons).toHaveLength(2);
    for (const colon of sevenColons) {
      const dots = colon.querySelectorAll('circle[data-lit="true"]');
      expect(dots).toHaveLength(2);
    }

    rerender(<DigitalLedReadout label="Clock" value="12:45:09" displayStyle="nixie" />);
    const nixieSvg = container.querySelector('svg');
    expect(nixieSvg).not.toBeNull();
    if (!nixieSvg) return;

    expect(getDigitCells(nixieSvg)).toHaveLength(6);
    const nixieColons = getColonCells(nixieSvg);
    expect(nixieColons).toHaveLength(2);
    for (const colon of nixieColons) {
      expect(colon.querySelector('[data-part="tube-envelope"]')).not.toBeNull();
      expect(colon.querySelector('[data-part="cathode-grid"]')).not.toBeNull();
      expect(colon.querySelectorAll('circle[data-lit="true"]')).toHaveLength(2);
    }
  });

  it('handles negative/decimal values (-04.8), numeric 0/-0, leading dot (.5), and consecutive dots (1..2)', () => {
    const { container, rerender } = render(
      <DigitalLedReadout value="-04.8" unit="dB" />
    );

    expect(screen.getByRole('status', { name: '-04.8 dB' })).toBeInTheDocument();
    let svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
    if (!svg) return;

    let digits = getDigitCells(svg);
    expect(digits).toHaveLength(4);
    expect(getLitSegments(digits[0]!)).toEqual(['g']);
    expect(getLitSegments(digits[1]!)).toEqual(['a', 'b', 'c', 'd', 'e', 'f']);
    expect(getLitSegments(digits[2]!)).toEqual(['b', 'c', 'f', 'g']);
    expect(digits[2]).toHaveAttribute('data-has-decimal', 'true');
    expect(getLitSegments(digits[3]!)).toEqual(['a', 'b', 'c', 'd', 'e', 'f', 'g']);

    rerender(<DigitalLedReadout value={-0} />);
    expect(screen.getByRole('status', { name: '0' })).toBeInTheDocument();

    rerender(<DigitalLedReadout value={42.5} />);
    expect(screen.getByRole('status', { name: '42.5' })).toBeInTheDocument();

    rerender(<DigitalLedReadout value=".5" />);
    svg = container.querySelector('svg');
    if (!svg) return;
    digits = getDigitCells(svg);
    expect(digits).toHaveLength(2);
    expect(digits[0]).toHaveAttribute('data-cell-char', ' ');
    expect(digits[0]).toHaveAttribute('data-has-decimal', 'true');
    expect(digits[1]).toHaveAttribute('data-cell-char', '5');

    rerender(<DigitalLedReadout value="1..2" />);
    svg = container.querySelector('svg');
    if (!svg) return;
    digits = getDigitCells(svg);
    expect(digits).toHaveLength(3);
    expect(digits[0]).toHaveAttribute('data-has-decimal', 'true');
    expect(digits[1]).toHaveAttribute('data-cell-char', ' ');
    expect(digits[1]).toHaveAttribute('data-has-decimal', 'true');
    expect(digits[2]).toHaveAttribute('data-cell-char', '2');
  });

  it('renders alpha indicators (ERR, HELP, ACEFHLPU) in 7-segment and nixie modes', () => {
    const { container, rerender } = render(<DigitalLedReadout value="ERR" />);
    let svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
    if (!svg) return;

    let digits = getDigitCells(svg);
    expect(digits).toHaveLength(3);
    expect(getLitSegments(digits[0]!)).toEqual(['a', 'd', 'e', 'f', 'g']);
    expect(getLitSegments(digits[1]!)).toEqual(['e', 'g']);
    expect(getLitSegments(digits[2]!)).toEqual(['e', 'g']);

    rerender(<DigitalLedReadout value="help" />);
    svg = container.querySelector('svg');
    if (!svg) return;
    digits = getDigitCells(svg);
    expect(digits).toHaveLength(4);
    expect(getLitSegments(digits[0]!)).toEqual(['b', 'c', 'e', 'f', 'g']);
    expect(getLitSegments(digits[1]!)).toEqual(['a', 'd', 'e', 'f', 'g']);
    expect(getLitSegments(digits[2]!)).toEqual(['d', 'e', 'f']);
    expect(getLitSegments(digits[3]!)).toEqual(['a', 'b', 'e', 'f', 'g']);

    rerender(<DigitalLedReadout value="ACEFHLPU" displayStyle="nixie" />);
    svg = container.querySelector('svg');
    if (!svg) return;
    const filaments = Array.from(svg.querySelectorAll('text[data-part="nixie-filament"]'));
    expect(filaments.map((f) => f.textContent)).toEqual([
      'A',
      'C',
      'E',
      'F',
      'H',
      'L',
      'P',
      'U',
    ]);
  });

  it('handles non-finite numbers (NaN, Infinity, -Infinity) safely by displaying ----', () => {
    const nonFiniteValues: ReadonlyArray<number> = [NaN, Infinity, -Infinity];

    for (const badNum of nonFiniteValues) {
      const { container, unmount } = render(
        <DigitalLedReadout label="Sensor" value={badNum} unit="V" />
      );
      expect(screen.getByRole('status', { name: 'Sensor: ---- V' })).toBeInTheDocument();
      const svg = container.querySelector('svg');
      expect(svg).not.toBeNull();
      if (svg) {
        const digits = getDigitCells(svg);
        expect(digits).toHaveLength(4);
        for (const cell of digits) {
          expect(cell).toHaveAttribute('data-cell-char', '-');
          expect(getLitSegments(cell)).toEqual(['g']);
        }
      }
      unmount();
    }
  });

  it('handles unsupported symbols, prototype keys, empty strings, and oversized strings without throwing', () => {
    const { container, rerender } = render(<DigitalLedReadout value="A?@~🚀" />);
    let svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
    if (!svg) return;

    const digits = getDigitCells(svg);
    expect(digits).toHaveLength(5);
    expect(getLitSegments(digits[0]!)).toEqual(['a', 'b', 'c', 'e', 'f', 'g']);
    expect(getLitSegments(digits[1]!)).toEqual([]);
    expect(getLitSegments(digits[2]!)).toEqual([]);
    expect(getLitSegments(digits[3]!)).toEqual([]);
    expect(getLitSegments(digits[4]!)).toEqual([]);

    // Unsupported chars in nixie mode render blank glass tubes with no glowing filament
    rerender(<DigitalLedReadout value="? " displayStyle="nixie" />);
    svg = container.querySelector('svg');
    if (!svg) return;
    expect(svg.querySelectorAll('text[data-part="nixie-filament"]')).toHaveLength(0);
    expect(svg.querySelectorAll('[data-part="tube-envelope"]')).toHaveLength(2);

    // Prototype pollution safety
    rerender(<DigitalLedReadout value="__proto__" />);
    expect(container.querySelector('svg')).not.toBeNull();

    // Empty and whitespace strings produce valid non-empty viewBox and safe aria-label
    rerender(<DigitalLedReadout value="" label="Idle" />);
    expect(screen.getByRole('status', { name: 'Idle: blank' })).toBeInTheDocument();
    svg = container.querySelector('svg');
    if (!svg) return;
    expect(getDigitCells(svg)).toHaveLength(1);
    expect(svg.getAttribute('viewBox')).toMatch(/^0 0 [1-9]\d* [1-9]\d*$/);

    rerender(<DigitalLedReadout value="   " />);
    expect(screen.getByRole('status', { name: 'blank' })).toBeInTheDocument();

    // Oversized adversarial payload is safely capped
    rerender(<DigitalLedReadout value={'8'.repeat(80)} />);
    svg = container.querySelector('svg');
    if (!svg) return;
    expect(getDigitCells(svg)).toHaveLength(48);
  });

  it('pads and clamps minDigits cleanly across [1..12]', () => {
    const { container, rerender } = render(<DigitalLedReadout value={42} minDigits={6} />);
    let svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
    if (!svg) return;

    const digits = getDigitCells(svg);
    expect(digits).toHaveLength(6);
    expect(digits.map((d) => d.getAttribute('data-cell-char'))).toEqual([
      ' ',
      ' ',
      ' ',
      ' ',
      '4',
      '2',
    ]);

    // Never truncates when value already exceeds minDigits
    rerender(<DigitalLedReadout value="128.4" minDigits={2} />);
    svg = container.querySelector('svg');
    if (!svg) return;
    expect(getDigitCells(svg)).toHaveLength(4);

    // Upper clamp to 12
    rerender(<DigitalLedReadout value={7} minDigits={99} />);
    svg = container.querySelector('svg');
    if (!svg) return;
    expect(getDigitCells(svg)).toHaveLength(12);

    // Lower clamp to 1 with empty value and negative/zero/NaN minDigits
    rerender(<DigitalLedReadout value="" minDigits={-5} />);
    svg = container.querySelector('svg');
    if (!svg) return;
    expect(getDigitCells(svg)).toHaveLength(1);

    rerender(<DigitalLedReadout value="" minDigits={NaN} />);
    svg = container.querySelector('svg');
    if (!svg) return;
    expect(getDigitCells(svg)).toHaveLength(1);

    // Preserves colons while counting digit slots
    rerender(<DigitalLedReadout value="1:23" minDigits={4} />);
    svg = container.querySelector('svg');
    if (!svg) return;
    expect(getDigitCells(svg)).toHaveLength(4);
    expect(getColonCells(svg)).toHaveLength(1);
  });

  it('supports uncontrolled and controlled showStyleToggle with IME-safe keyboard switching', () => {
    const onDisplayStyleChange = vi.fn<(style: LedDisplayStyle) => void>();

    render(
      <DigitalLedReadout
        value="88.8"
        showStyleToggle
        defaultDisplayStyle="7-segment"
        onDisplayStyleChange={onDisplayStyleChange}
        data-testid="toggle-root"
      />
    );

    const sevenBtn = screen.getByTestId('led-style-7-segment');
    const nixieBtn = screen.getByTestId('led-style-nixie');
    const root = screen.getByTestId('toggle-root');

    expect(sevenBtn).toHaveAttribute('aria-pressed', 'true');
    expect(nixieBtn).toHaveAttribute('aria-pressed', 'false');
    expect(sevenBtn).toHaveClass('prism-focus-ring');
    expect(nixieBtn).toHaveClass('prism-focus-ring');

    // Clicking already-active button does not emit duplicate change
    fireEvent.click(sevenBtn);
    expect(onDisplayStyleChange).not.toHaveBeenCalled();

    // IME composing keydown is ignored
    fireEvent.keyDown(sevenBtn, { key: 'ArrowRight', isComposing: true });
    expect(onDisplayStyleChange).not.toHaveBeenCalled();
    expect(root).toHaveAttribute('data-display-style', '7-segment');

    // Unrelated key is ignored
    fireEvent.keyDown(sevenBtn, { key: 'Tab' });
    expect(onDisplayStyleChange).not.toHaveBeenCalled();

    // Click Nixie -> switches mode and renders vacuum tube envelopes + cathode grid
    fireEvent.click(nixieBtn);
    expect(onDisplayStyleChange).toHaveBeenLastCalledWith('nixie');
    expect(root).toHaveAttribute('data-display-style', 'nixie');
    expect(nixieBtn).toHaveAttribute('aria-pressed', 'true');
    expect(sevenBtn).toHaveAttribute('aria-pressed', 'false');

    const svg = screen.getByTestId('led-readout-svg');
    expect(svg.querySelectorAll('[data-part="tube-envelope"]').length).toBeGreaterThan(0);
    expect(svg.querySelectorAll('[data-part="cathode-grid"]').length).toBeGreaterThan(0);
    expect(svg.querySelectorAll('text[data-part="nixie-filament"]').length).toBe(3);

    // Keyboard ArrowLeft / Home switches back to 7-segment
    fireEvent.keyDown(nixieBtn, { key: 'ArrowLeft' });
    expect(onDisplayStyleChange).toHaveBeenLastCalledWith('7-segment');
    expect(root).toHaveAttribute('data-display-style', '7-segment');

    // Keyboard End switches to nixie
    fireEvent.keyDown(sevenBtn, { key: 'End' });
    expect(onDisplayStyleChange).toHaveBeenLastCalledWith('nixie');
    expect(root).toHaveAttribute('data-display-style', 'nixie');

    // Keyboard Home switches to 7-segment
    fireEvent.keyDown(nixieBtn, { key: 'Home' });
    expect(onDisplayStyleChange).toHaveBeenLastCalledWith('7-segment');

    // Keyboard Enter and Space activate target button style
    fireEvent.keyDown(nixieBtn, { key: 'Enter' });
    expect(onDisplayStyleChange).toHaveBeenLastCalledWith('nixie');
    fireEvent.keyDown(sevenBtn, { key: ' ' });
    expect(onDisplayStyleChange).toHaveBeenLastCalledWith('7-segment');
  });

  it('supports controlled displayStyle mode via showStyleToggle', () => {
    const spy = vi.fn<(next: LedDisplayStyle) => void>();

    function ControlledHarness() {
      const [mode, setMode] = useState<LedDisplayStyle>('nixie');
      return (
        <DigitalLedReadout
          label="Controlled"
          value="99.9"
          displayStyle={mode}
          showStyleToggle
          onDisplayStyleChange={(next) => {
            spy(next);
            setMode(next);
          }}
          data-testid="controlled-led"
        />
      );
    }

    render(<ControlledHarness />);
    const root = screen.getByTestId('controlled-led');
    expect(root).toHaveAttribute('data-display-style', 'nixie');

    fireEvent.click(screen.getByTestId('led-style-7-segment'));
    expect(spy).toHaveBeenCalledWith('7-segment');
    expect(root).toHaveAttribute('data-display-style', '7-segment');

    // Static controlled prop refuses internal mutation until parent updates
    const lockedSpy = vi.fn<(next: LedDisplayStyle) => void>();
    render(
      <DigitalLedReadout
        value="10"
        displayStyle="7-segment"
        showStyleToggle
        onDisplayStyleChange={lockedSpy}
        data-testid="locked-led"
      />
    );
    const lockedRoot = screen.getByTestId('locked-led');
    const nixieButtons = screen.getAllByTestId('led-style-nixie');
    fireEvent.click(nixieButtons[1]!);
    expect(lockedSpy).toHaveBeenCalledWith('nixie');
    expect(lockedRoot).toHaveAttribute('data-display-style', '7-segment');
  });

  it('maps all 5 phosphor tones to exact --prism-* semantic tokens and ghost color-mix', () => {
    const expectedToneTokens: ReadonlyArray<readonly [LedPhosphorTone, string]> = [
      ['primary', 'var(--prism-primary-main)'],
      ['emerald', 'var(--prism-success-main)'],
      ['amber', 'var(--prism-warning-main)'],
      ['info', 'var(--prism-info-main)'],
      ['rose', 'var(--prism-error-main)'],
    ];

    for (const [tone, token] of expectedToneTokens) {
      const { container, unmount } = render(
        <DigitalLedReadout value="1" tone={tone} data-testid={`tone-${tone}`} />
      );
      expect(screen.getByTestId(`tone-${tone}`)).toHaveAttribute('data-tone', tone);
      const litPoly = container.querySelector('polygon[data-lit="true"]');
      const ghostPoly = container.querySelector('polygon[data-lit="false"]');
      expect(litPoly).toHaveAttribute('fill', token);
      expect(ghostPoly).toHaveAttribute('fill', `color-mix(in srgb, ${token} 12%, transparent)`);
      unmount();
    }
  });

  it('renders all 3 sizes (sm, md, lg) across 7-segment and nixie styles with valid viewBox and zero raw colors', () => {
    const sizes: ReadonlyArray<readonly [LedReadoutSize, string, string]> = [
      ['sm', 'h-10', 'h-12'],
      ['md', 'h-14', 'h-16'],
      ['lg', 'h-20', 'h-24'],
    ];

    for (const [size, sevenHeight, nixieHeight] of sizes) {
      const { rerender, unmount } = render(
        <DigitalLedReadout
          value="56.7"
          size={size}
          displayStyle="7-segment"
          data-testid={`size-${size}`}
        />
      );
      expect(screen.getByTestId(`size-${size}`)).toHaveAttribute('data-size', size);
      let svg = screen.getByTestId('led-readout-svg');
      expect(svg).toHaveClass(sevenHeight);
      expect(svg.getAttribute('viewBox')).toMatch(/^0 0 \d+ \d+$/);

      rerender(
        <DigitalLedReadout
          value="56.7"
          size={size}
          displayStyle="nixie"
          data-testid={`size-${size}`}
        />
      );
      svg = screen.getByTestId('led-readout-svg');
      expect(svg).toHaveClass(nixieHeight);
      expect(svg.getAttribute('viewBox')).toMatch(/^0 0 \d+ \d+$/);
      unmount();
    }

    // Verify component source contains zero raw hex/rgb/hsl color literals
    const sourceText = readFileSync(
      resolve(__dirname, 'DigitalLedReadout.tsx'),
      'utf8'
    );
    const rawColorRegex =
      /(?:#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b|\b(?:rgba?|hsla?)\s*\()/;
    expect(rawColorRegex.test(sourceText)).toBe(false);
  });
});
