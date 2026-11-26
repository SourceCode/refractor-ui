import { createRef } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AiFocusRing } from './AiFocusRing';

describe('AiFocusRing', () => {
  it('activates orbiting ring on focus-within and accelerates during processing', () => {
    const ref = createRef<HTMLDivElement>();
    const { rerender } = render(
      <AiFocusRing ref={ref} data-testid="ring-root">
        <input aria-label="AI prompt" />
      </AiFocusRing>
    );

    const root = screen.getByTestId('ring-root');
    expect(ref.current).toBe(root);
    expect(root.getAttribute('data-active')).toBeNull();

    const input = screen.getByLabelText('AI prompt');
    fireEvent.focus(input);
    expect(root.getAttribute('data-active')).toBe('true');

    fireEvent.blur(input);
    expect(root.getAttribute('data-active')).toBeNull();

    rerender(
      <AiFocusRing ref={ref} processing palette="emerald-cyan" thicknessPx={3} data-testid="ring-root">
        <input aria-label="AI prompt" />
      </AiFocusRing>
    );
    expect(root.getAttribute('data-processing')).toBe('true');
    expect(root.getAttribute('data-active')).toBe('true');
    expect(root.style.padding).toBe('3px');
  });

  it('clamps out-of-range thickness/speed and stays inactive when disabled', () => {
    render(
      <AiFocusRing
        active
        disabled
        thicknessPx={Number.NaN}
        speedSeconds={-5}
        palette="rose-violet"
        data-testid="ring-disabled"
      >
        <span>Disabled card</span>
      </AiFocusRing>
    );
    const root = screen.getByTestId('ring-disabled');
    expect(root.getAttribute('data-active')).toBeNull();
    expect(root.style.padding).toBe('2px');
  });
});
