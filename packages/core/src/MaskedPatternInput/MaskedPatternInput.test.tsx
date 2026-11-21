import { createRef, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import {
  MASK_PRESETS,
  MaskedPatternInput,
  applyPatternMask,
  type MaskPresetId,
  type MaskedPatternMeta,
} from './index';

describe('MASK_PRESETS & applyPatternMask', () => {
  it('defines all five canonical presets accurately', () => {
    expect(MASK_PRESETS).toEqual({
      ipv4: '###.###.###.###',
      cidr: '###.###.###.###/##',
      mac: 'HH:HH:HH:HH:HH:HH',
      license: '****-****-****-****',
      'tax-id': '##-#######',
    });
  });

  it('enforces #, A, H, and * tokens with auto-uppercasing, literal insertion, and no trailing orphan delimiters', () => {
    // IPv4 (#)
    expect(applyPatternMask('192168001001', MASK_PRESETS.ipv4)).toEqual({
      masked: '192.168.001.001',
      unmasked: '192168001001',
      complete: true,
    });
    expect(applyPatternMask('192', MASK_PRESETS.ipv4)).toEqual({
      masked: '192',
      unmasked: '192',
      complete: false,
    });
    expect(applyPatternMask('192.', MASK_PRESETS.ipv4)).toEqual({
      masked: '192',
      unmasked: '192',
      complete: false,
    });

    // CIDR (# + . + /)
    expect(applyPatternMask('192.168.001.001/24', MASK_PRESETS.cidr)).toEqual({
      masked: '192.168.001.001/24',
      unmasked: '19216800100124',
      complete: true,
    });
    expect(applyPatternMask('192168001001', MASK_PRESETS.cidr)).toEqual({
      masked: '192.168.001.001',
      unmasked: '192168001001',
      complete: false,
    });

    // MAC (H hex uppercased, skips non-hex letters like g-z)
    expect(applyPatternMask('a1:b2:gZ:c3:d4:e5:f6', MASK_PRESETS.mac)).toEqual({
      masked: 'A1:B2:C3:D4:E5:F6',
      unmasked: 'A1B2C3D4E5F6',
      complete: true,
    });
    expect(applyPatternMask('a1:', MASK_PRESETS.mac)).toEqual({
      masked: 'A1',
      unmasked: 'A1',
      complete: false,
    });

    // License (* alphanumeric uppercased)
    expect(applyPatternMask('ab12-cd34-ef56-gh78-EXTRA', MASK_PRESETS.license)).toEqual({
      masked: 'AB12-CD34-EF56-GH78',
      unmasked: 'AB12CD34EF56GH78',
      complete: true,
    });
    expect(applyPatternMask('ab12-', MASK_PRESETS.license)).toEqual({
      masked: 'AB12',
      unmasked: 'AB12',
      complete: false,
    });

    // Tax ID (##-#######)
    expect(applyPatternMask('123456789', MASK_PRESETS['tax-id'])).toEqual({
      masked: '12-3456789',
      unmasked: '123456789',
      complete: true,
    });
    expect(applyPatternMask('12', MASK_PRESETS['tax-id'])).toEqual({
      masked: '12',
      unmasked: '12',
      complete: false,
    });

    // Custom letter token (A) + leading/multi-char literals
    expect(applyPatternMask('12ab3456', 'AA-####')).toEqual({
      masked: 'AB-3456',
      unmasked: 'AB3456',
      complete: true,
    });
    expect(applyPatternMask('ID-ab12', 'ID-AA##')).toEqual({
      masked: 'ID-AB12',
      unmasked: 'AB12',
      complete: true,
    });
    expect(applyPatternMask('ab12', 'ID-AA##')).toEqual({
      masked: 'ID-AB12',
      unmasked: 'AB12',
      complete: true,
    });
  });

  it('handles empty inputs, unmatched characters, empty patterns, and literal-only patterns safely (negative test)', () => {
    expect(applyPatternMask('', MASK_PRESETS.license)).toEqual({
      masked: '',
      unmasked: '',
      complete: false,
    });
    expect(applyPatternMask('abc123', '')).toEqual({
      masked: '',
      unmasked: '',
      complete: false,
    });
    expect(applyPatternMask('abc123', '---/:.')).toEqual({
      masked: '',
      unmasked: '',
      complete: false,
    });
    expect(applyPatternMask('!@#$%^', 'AA-##-HH-**')).toEqual({
      masked: '',
      unmasked: '',
      complete: false,
    });
    expect(applyPatternMask('zzzzzz', 'HH:HH')).toEqual({
      masked: '',
      unmasked: '',
      complete: false,
    });
  });
});

describe('MaskedPatternInput', () => {
  it('renders prism-slab with ref, displayName, theme overrides, default license preset, pattern hint, and Complete/Incomplete status pill', () => {
    const ref = createRef<HTMLDivElement>();
    const onChange = vi.fn<(masked: string, meta: MaskedPatternMeta) => void>();

    render(
      <PrismThemeProvider
        theme={{
          components: {
            MaskedPatternInput: {
              className: 'theme-masked-input',
              style: { maxWidth: '460px' },
            },
          },
        }}
      >
        <MaskedPatternInput
          ref={ref}
          onChange={onChange}
          className="local-masked-input"
          style={{ marginBottom: '8px' }}
          xstyle={{ '--prism-blur-px': '22px' }}
          data-testid="masked-root"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('masked-root');
    expect(MaskedPatternInput.displayName).toBe('MaskedPatternInput');
    expect(ref.current).toBe(root);
    expect(root).toHaveClass(
      'refractor-masked-pattern-input',
      'prism-slab',
      'theme-masked-input',
      'local-masked-input'
    );
    expect(root).toHaveStyle({ maxWidth: '460px', marginBottom: '8px' });
    expect(root.style.getPropertyValue('--prism-blur-px')).toBe('22px');
    expect(root).toHaveAttribute('data-preset', 'license');
    expect(root).not.toHaveAttribute('data-complete');
    expect(root).not.toHaveAttribute('data-filled');

    expect(screen.getByTestId('masked-pattern-hint')).toHaveTextContent('****-****-****-****');
    const status = screen.getByTestId('masked-pattern-status');
    expect(status).toHaveTextContent('Incomplete');
    expect(status).toHaveAttribute('data-complete', 'false');
    expect(status).toHaveClass('prism-well');
    expect(screen.queryByTestId('masked-pattern-clear')).not.toBeInTheDocument();

    const input = screen.getByLabelText('Formatted Code');
    expect(input).toHaveAttribute('placeholder', '****-****-****-****');

    // Partial entry
    fireEvent.change(input, { target: { value: 'ab12cd3' } });
    expect(input).toHaveValue('AB12-CD3');
    expect(root).toHaveAttribute('data-filled', 'true');
    expect(status).toHaveTextContent('Incomplete');
    expect(screen.getByTestId('masked-pattern-clear')).toBeInTheDocument();
    expect(onChange).toHaveBeenLastCalledWith('AB12-CD3', {
      unmasked: 'AB12CD3',
      complete: false,
    });

    // Complete entry -> emerald Complete status pill
    fireEvent.change(input, { target: { value: 'ab12cd34ef56gh78' } });
    expect(input).toHaveValue('AB12-CD34-EF56-GH78');
    expect(root).toHaveAttribute('data-complete', 'true');
    expect(status).toHaveTextContent('Complete');
    expect(status).toHaveAttribute('data-complete', 'true');
    expect(status).toHaveClass('prism-emerald');
    expect(onChange).toHaveBeenLastCalledWith('AB12-CD34-EF56-GH78', {
      unmasked: 'AB12CD34EF56GH78',
      complete: true,
    });

    // Clear button empties value and resets to Incomplete
    fireEvent.click(screen.getByTestId('masked-pattern-clear'));
    expect(input).toHaveValue('');
    expect(status).toHaveTextContent('Incomplete');
    expect(screen.queryByTestId('masked-pattern-clear')).not.toBeInTheDocument();
    expect(onChange).toHaveBeenLastCalledWith('', {
      unmasked: '',
      complete: false,
    });
  });

  it('supports every built-in preset and prioritizes non-empty custom pattern over preset', () => {
    const cases: ReadonlyArray<{
      preset: MaskPresetId;
      raw: string;
      expectedMasked: string;
      expectedUnmasked: string;
    }> = [
      {
        preset: 'ipv4',
        raw: '100200001025',
        expectedMasked: '100.200.001.025',
        expectedUnmasked: '100200001025',
      },
      {
        preset: 'cidr',
        raw: '01000000000008',
        expectedMasked: '010.000.000.000/08',
        expectedUnmasked: '01000000000008',
      },
      {
        preset: 'mac',
        raw: '0a1b2c3d4e5f',
        expectedMasked: '0A:1B:2C:3D:4E:5F',
        expectedUnmasked: '0A1B2C3D4E5F',
      },
      {
        preset: 'tax-id',
        raw: '987654321',
        expectedMasked: '98-7654321',
        expectedUnmasked: '987654321',
      },
    ];

    const { rerender } = render(<MaskedPatternInput preset="ipv4" data-testid="preset-root" />);

    for (const item of cases) {
      rerender(
        <MaskedPatternInput
          preset={item.preset}
          value={item.raw}
          data-testid="preset-root"
        />
      );
      expect(screen.getByTestId('preset-root')).toHaveAttribute('data-preset', item.preset);
      expect(screen.getByTestId('masked-pattern-hint')).toHaveTextContent(MASK_PRESETS[item.preset]);
      expect(screen.getByTestId('masked-pattern-input')).toHaveValue(item.expectedMasked);
      expect(screen.getByTestId('masked-pattern-status')).toHaveTextContent('Complete');
    }

    // Custom pattern overrides preset
    rerender(
      <MaskedPatternInput
        preset="ipv4"
        pattern="AA-####"
        placeholder="US-0042"
        value="ca1234"
        data-testid="preset-root"
      />
    );
    expect(screen.getByTestId('preset-root')).toHaveAttribute('data-preset', 'custom');
    expect(screen.getByTestId('masked-pattern-hint')).toHaveTextContent('AA-####');
    expect(screen.getByTestId('masked-pattern-input')).toHaveAttribute('placeholder', 'US-0042');
    expect(screen.getByTestId('masked-pattern-input')).toHaveValue('CA-1234');
    expect(screen.getByTestId('masked-pattern-status')).toHaveTextContent('Complete');

    // Whitespace-only pattern falls back to preset
    rerender(
      <MaskedPatternInput
        preset="tax-id"
        pattern="   "
        value="123456789"
        data-testid="preset-root"
      />
    );
    expect(screen.getByTestId('preset-root')).toHaveAttribute('data-preset', 'tax-id');
    expect(screen.getByTestId('masked-pattern-hint')).toHaveTextContent('##-#######');
    expect(screen.getByTestId('masked-pattern-input')).toHaveValue('12-3456789');
  });

  it('supports controlled value updates and meta emission across edits and clears', () => {
    function ControlledMaskHarness() {
      const [val, setVal] = useState<string>('12-34');
      const [lastMeta, setLastMeta] = useState<MaskedPatternMeta>({
        unmasked: '1234',
        complete: false,
      });

      return (
        <div>
          <span data-testid="meta-unmasked">{lastMeta.unmasked}</span>
          <span data-testid="meta-complete">{String(lastMeta.complete)}</span>
          <MaskedPatternInput
            preset="tax-id"
            value={val}
            onChange={(masked, meta) => {
              setVal(masked);
              setLastMeta(meta);
            }}
          />
        </div>
      );
    }

    render(<ControlledMaskHarness />);

    const input = screen.getByTestId('masked-pattern-input');
    expect(input).toHaveValue('12-34');
    expect(screen.getByTestId('masked-pattern-status')).toHaveTextContent('Incomplete');

    fireEvent.change(input, { target: { value: '12-3456789' } });
    expect(input).toHaveValue('12-3456789');
    expect(screen.getByTestId('meta-unmasked')).toHaveTextContent('123456789');
    expect(screen.getByTestId('meta-complete')).toHaveTextContent('true');
    expect(screen.getByTestId('masked-pattern-status')).toHaveTextContent('Complete');

    // Backspace deleting across delimiter leaves no orphan '-'
    fireEvent.change(input, { target: { value: '12-' } });
    expect(input).toHaveValue('12');
    expect(screen.getByTestId('meta-unmasked')).toHaveTextContent('12');
    expect(screen.getByTestId('meta-complete')).toHaveTextContent('false');

    fireEvent.click(screen.getByTestId('masked-pattern-clear'));
    expect(input).toHaveValue('');
    expect(screen.getByTestId('meta-unmasked')).toHaveTextContent('');
    expect(screen.getByTestId('meta-complete')).toHaveTextContent('false');
  });

  it('handles empty label and disabled state blocking edits and clearing (negative test)', () => {
    const onChange = vi.fn<(masked: string, meta: MaskedPatternMeta) => void>();

    render(
      <MaskedPatternInput
        preset="mac"
        label=""
        defaultValue="aabbccddeeff"
        disabled
        onChange={onChange}
        data-testid="disabled-mask"
      />
    );

    const root = screen.getByTestId('disabled-mask');
    expect(root).toHaveAttribute('data-disabled', 'true');

    const input = screen.getByLabelText('Formatted Code');
    const clearBtn = screen.getByTestId('masked-pattern-clear');

    expect(input).toHaveValue('AA:BB:CC:DD:EE:FF');
    expect(input).toBeDisabled();
    expect(clearBtn).toBeDisabled();

    fireEvent.change(input, { target: { value: '00:00:00:00:00:00' } });
    fireEvent.click(clearBtn);

    expect(onChange).not.toHaveBeenCalled();
    expect(input).toHaveValue('AA:BB:CC:DD:EE:FF');
  });

  it('renders XSS payloads in label and placeholder literally and sanitizes typed input via mask tokens (adversarial test)', () => {
    const payload = '<script>window.__maskXss=1</script><img src=x onerror=alert(1)>';

    render(
      <MaskedPatternInput
        preset="tax-id"
        label={payload}
        placeholder={payload}
      />
    );

    expect(document.querySelector('script')).toBeNull();
    expect(document.querySelector('img')).toBeNull();

    const input = screen.getByTestId('masked-pattern-input');
    expect(input).toHaveAttribute('placeholder', payload);

    fireEvent.change(input, { target: { value: payload } });
    // Only the two '1' digits in payload survive the '##-#######' mask
    expect(input).toHaveValue('11');
    expect(screen.getByTestId('masked-pattern-status')).toHaveTextContent('Incomplete');
    expect(document.querySelector('script')).toBeNull();
    expect(document.querySelector('img')).toBeNull();
  });
});
