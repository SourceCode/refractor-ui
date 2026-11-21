import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import { SignaturePad, type SignatureExportData } from './SignaturePad';

function mockSvgRect(el: Element, width = 480, height = 180) {
  vi.spyOn(el, 'getBoundingClientRect').mockReturnValue({
    x: 0,
    y: 0,
    left: 0,
    top: 0,
    width,
    height,
    right: width,
    bottom: height,
    toJSON: () => ({}),
  });
}

describe('SignaturePad', () => {
  it('renders optical glass pad, baseline, placeholder, overrides, data attributes, and React 19 ref', () => {
    const ref = createRef<HTMLDivElement>();

    render(
      <PrismThemeProvider
        theme={{
          components: {
            SignaturePad: { className: 'theme-sig', style: { maxWidth: '520px' } },
          },
        }}
      >
        <SignaturePad
          ref={ref}
          label="Authorized Signer"
          placeholder="Sign with stylus or mouse"
          className="local-sig"
          xstyle={{ '--prism-blur-px': '16px' }}
          style={{ padding: '14px' }}
          data-testid="sig-root"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('sig-root');
    expect(ref.current).toBe(root);
    expect(root).toHaveClass('refractor-signature-pad', 'prism-slab', 'theme-sig', 'local-sig');
    expect(root).toHaveAttribute('data-empty', 'true');
    expect(root).toHaveStyle({ maxWidth: '520px', padding: '14px' });

    expect(screen.getByText('Authorized Signer')).toBeInTheDocument();
    expect(screen.getByTestId('signature-placeholder')).toHaveTextContent(
      'Sign with stylus or mouse'
    );
    expect(screen.getByTestId('signature-stroke-count')).toHaveTextContent('0 strokes');

    const canvas = screen.getByTestId('signature-canvas');
    expect(canvas).toHaveAttribute('width', '480');
    expect(canvas).toHaveAttribute('height', '180');
    expect(canvas).toHaveAttribute('viewBox', '0 0 480 180');
  });

  it('captures vector strokes via pointer events, exports deterministic SVG data URL, and supports undo/clear/save', () => {
    const onChange = vi.fn<(data: SignatureExportData) => void>();
    const onSave = vi.fn<(data: SignatureExportData) => void>();

    render(<SignaturePad onChange={onChange} onSave={onSave} />);

    const canvas = screen.getByTestId('signature-canvas');
    mockSvgRect(canvas, 480, 180);

    // Moving before pointerDown is a no-op
    fireEvent.pointerMove(canvas, { clientX: 50, clientY: 60 });
    expect(onChange).not.toHaveBeenCalled();

    // Non-primary mouse button is ignored
    fireEvent.pointerDown(canvas, { button: 2, clientX: 40, clientY: 80 });
    fireEvent.pointerUp(canvas);
    expect(onChange).not.toHaveBeenCalled();

    // Draw stroke 1 (includes a duplicate point that should be deduplicated)
    fireEvent.pointerDown(canvas, { button: 0, clientX: 40, clientY: 80 });
    fireEvent.pointerMove(canvas, { clientX: 40, clientY: 80 });
    fireEvent.pointerMove(canvas, { clientX: 120, clientY: 60 });
    fireEvent.pointerMove(canvas, { clientX: 210, clientY: 110 });
    fireEvent.pointerUp(canvas);

    expect(onChange).toHaveBeenCalledTimes(1);
    const firstPayload = onChange.mock.calls[0]?.[0];
    expect(firstPayload?.isEmpty).toBe(false);
    expect(firstPayload?.strokes).toHaveLength(1);
    expect(firstPayload?.strokes[0]).toEqual([
      { x: 40, y: 80 },
      { x: 120, y: 60 },
      { x: 210, y: 110 },
    ]);
    expect(firstPayload?.svgDataUrl).toMatch(/^data:image\/svg\+xml;charset=utf-8,/);
    const decodedSvg = decodeURIComponent(
      (firstPayload?.svgDataUrl ?? '').replace('data:image/svg+xml;charset=utf-8,', '')
    );
    expect(decodedSvg).toContain('<polyline');
    expect(decodedSvg).toContain('points="40,80 120,60 210,110"');
    expect(decodedSvg).toContain('stroke="#18202C"');

    expect(screen.queryByTestId('signature-placeholder')).toBeNull();
    expect(screen.getByTestId('signature-stroke-count')).toHaveTextContent('1 stroke');

    // Draw single-point dot stroke 2 (via pointerCancel) with Cobalt ink swatch
    fireEvent.click(screen.getByRole('button', { name: 'Cobalt ink' }));
    expect(screen.getByRole('button', { name: 'Cobalt ink' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    fireEvent.pointerDown(canvas, { button: 0, clientX: 260, clientY: 90 });
    fireEvent.pointerCancel(canvas);

    expect(screen.getByTestId('signature-stroke-count')).toHaveTextContent('2 strokes');
    const secondPayload = onChange.mock.calls[1]?.[0];
    expect(secondPayload?.strokes).toHaveLength(2);
    const decodedWithDot = decodeURIComponent(
      (secondPayload?.svgDataUrl ?? '').replace('data:image/svg+xml;charset=utf-8,', '')
    );
    expect(decodedWithDot).toContain('<circle cx="260" cy="90"');
    expect(decodedWithDot).toContain('fill="#1D4ED8"');

    // Save Signature CTA fires onSave with current export payload
    fireEvent.click(screen.getByRole('button', { name: 'Save Signature' }));
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave.mock.calls[0]?.[0]).toEqual(secondPayload);

    // Undo removes stroke 2 only
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(screen.getByTestId('signature-stroke-count')).toHaveTextContent('1 stroke');
    expect(onChange.mock.calls[2]?.[0].strokes).toHaveLength(1);

    // Clear wipes remaining strokes
    fireEvent.click(screen.getByRole('button', { name: 'Clear' }));
    expect(screen.getByTestId('signature-stroke-count')).toHaveTextContent('0 strokes');
    expect(screen.getByTestId('signature-placeholder')).toBeInTheDocument();
    expect(onChange.mock.calls[3]?.[0].isEmpty).toBe(true);
  });

  it('works deterministically in headless jsdom without mocking getBoundingClientRect', () => {
    const onChange = vi.fn<(data: SignatureExportData) => void>();
    render(<SignaturePad onChange={onChange} />);

    const canvas = screen.getByTestId('signature-canvas');
    fireEvent.pointerDown(canvas, { button: 0, clientX: 30, clientY: 50 });
    fireEvent.pointerMove(canvas, { clientX: 150, clientY: 95 });
    fireEvent.pointerUp(canvas);

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0]?.[0].strokes[0]).toEqual([
      { x: 30, y: 50 },
      { x: 150, y: 95 },
    ]);
  });

  it('supports keyboard signing, undo (Ctrl+Z / Backspace), and clear (Delete / Escape)', () => {
    const onChange = vi.fn<(data: SignatureExportData) => void>();
    render(<SignaturePad onChange={onChange} />);

    const canvas = screen.getByTestId('signature-canvas');

    // Unrelated key, IME composing, and empty Backspace/Delete are ignored
    fireEvent.keyDown(canvas, { key: 'a' });
    fireEvent.keyDown(canvas, { key: 'Enter', isComposing: true });
    fireEvent.keyDown(canvas, { key: 'Backspace' });
    fireEvent.keyDown(canvas, { key: 'Delete' });
    expect(onChange).not.toHaveBeenCalled();

    // Space & Enter add accessible keyboard strokes
    fireEvent.keyDown(canvas, { key: ' ' });
    fireEvent.keyDown(canvas, { key: 'Enter' });
    expect(screen.getByTestId('signature-stroke-count')).toHaveTextContent('2 strokes');

    // Ctrl+Z and Meta+Z undo one stroke
    fireEvent.keyDown(canvas, { key: 'z', ctrlKey: true });
    expect(screen.getByTestId('signature-stroke-count')).toHaveTextContent('1 stroke');

    fireEvent.keyDown(canvas, { key: 'z', metaKey: true });
    expect(screen.getByTestId('signature-stroke-count')).toHaveTextContent('0 strokes');

    // Re-add and verify Backspace undoes remaining stroke
    fireEvent.keyDown(canvas, { key: 'Enter' });
    fireEvent.keyDown(canvas, { key: 'Backspace' });
    expect(screen.getByTestId('signature-stroke-count')).toHaveTextContent('0 strokes');

    // Add again and clear with Delete / Escape
    fireEvent.keyDown(canvas, { key: 'Enter' });
    expect(screen.getByTestId('signature-stroke-count')).toHaveTextContent('1 stroke');
    fireEvent.keyDown(canvas, { key: 'Delete' });
    expect(screen.getByTestId('signature-stroke-count')).toHaveTextContent('0 strokes');

    fireEvent.keyDown(canvas, { key: ' ' });
    fireEvent.keyDown(canvas, { key: 'Escape' });
    expect(screen.getByTestId('signature-stroke-count')).toHaveTextContent('0 strokes');
  });

  it('disables Undo, Clear, and Save when empty (negative)', () => {
    const onChange = vi.fn();
    const onSave = vi.fn();
    render(<SignaturePad onChange={onChange} onSave={onSave} />);

    const undoBtn = screen.getByRole('button', { name: 'Undo' });
    const clearBtn = screen.getByRole('button', { name: 'Clear' });
    const saveBtn = screen.getByRole('button', { name: 'Save Signature' });

    expect(undoBtn).toBeDisabled();
    expect(clearBtn).toBeDisabled();
    expect(saveBtn).toBeDisabled();

    fireEvent.click(undoBtn);
    fireEvent.click(clearBtn);
    fireEvent.click(saveBtn);

    expect(onChange).not.toHaveBeenCalled();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('blocks pointer drawing and keyboard shortcuts when disabled (negative)', () => {
    const onChange = vi.fn();
    const onSave = vi.fn();
    render(<SignaturePad disabled onChange={onChange} onSave={onSave} data-testid="sig-disabled" />);

    expect(screen.getByTestId('sig-disabled')).toHaveAttribute('data-disabled', 'true');
    const canvas = screen.getByTestId('signature-canvas');
    expect(canvas).toHaveAttribute('aria-disabled', 'true');
    expect(canvas).toHaveAttribute('tabindex', '-1');

    fireEvent.pointerDown(canvas, { button: 0, clientX: 40, clientY: 50 });
    fireEvent.pointerMove(canvas, { clientX: 120, clientY: 90 });
    fireEvent.pointerUp(canvas);
    fireEvent.keyDown(canvas, { key: 'Enter' });
    fireEvent.keyDown(canvas, { key: 'Backspace' });
    fireEvent.keyDown(canvas, { key: 'Delete' });

    expect(onChange).not.toHaveBeenCalled();
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Obsidian ink' })).toBeDisabled();
  });

  it('supports custom valid hex strokeColor and sanitizes adversarial SVG injection / NaN dimensions', () => {
    const onChange = vi.fn<(data: SignatureExportData) => void>();

    const { rerender } = render(
      <SignaturePad
        strokeColor="#7C3AED"
        width={Number.NaN}
        height={-500}
        strokeWidth={50}
        onChange={onChange}
      />
    );

    const canvas = screen.getByTestId('signature-canvas');
    // Clamped bounds: width falls back to 480, height clamps to 100
    expect(canvas).toHaveAttribute('width', '480');
    expect(canvas).toHaveAttribute('height', '100');
    expect(screen.getByRole('button', { name: 'Custom ink #7C3AED' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );

    // Adversarial strokeColor injection + XSS label/placeholder
    rerender(
      <SignaturePad
        key="adversarial"
        strokeColor='"><script>alert(1)</script>'
        label="<script>window.__sigXss=1</script>Signer"
        placeholder="<img src=x onerror=alert(1)>"
        width={2500}
        height={900}
        strokeWidth={0.1}
        onChange={onChange}
      />
    );

    const clampedCanvas = screen.getByTestId('signature-canvas');
    expect(clampedCanvas).toHaveAttribute('width', '900');
    expect(clampedCanvas).toHaveAttribute('height', '450');
    expect(document.querySelector('script')).toBeNull();

    fireEvent.keyDown(clampedCanvas, { key: 'Enter' });
    const exported = onChange.mock.calls[0]?.[0];
    const decoded = decodeURIComponent(
      (exported?.svgDataUrl ?? '').replace('data:image/svg+xml;charset=utf-8,', '')
    );
    expect(decoded).toContain('stroke="#18202C"');
    expect(decoded).toContain('stroke-width="1"');
    expect(decoded).not.toContain('<script');
  });
});
