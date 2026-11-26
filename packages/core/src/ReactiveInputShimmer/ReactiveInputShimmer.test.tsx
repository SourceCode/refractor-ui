import { createRef } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ReactiveInputShimmer } from './ReactiveInputShimmer';

describe('ReactiveInputShimmer', () => {
  it('triggers directional light sweep on focus, autocomplete acceptance, IME-safe Enter, and imperative trigger', () => {
    const ref = createRef<HTMLDivElement>();
    const onSubmit = vi.fn();
    const onAcceptSuggestion = vi.fn();

    const { rerender } = render(
      <ReactiveInputShimmer
        ref={ref}
        label="Command prompt"
        suggestions={['Run audit', 'Export tokens']}
        onSubmit={onSubmit}
        onAcceptSuggestion={onAcceptSuggestion}
      />
    );

    expect(ref.current).toBeInstanceOf(HTMLDivElement);
    expect(screen.queryByTestId('reactive-input-shimmer-sweep')).toBeNull();

    const input = screen.getByLabelText('Command prompt') as HTMLInputElement;
    fireEvent.focus(input);
    expect(screen.getByTestId('reactive-input-shimmer-sweep').getAttribute('data-trigger')).toBe('focus');

    fireEvent.click(screen.getByRole('button', { name: 'Run audit' }));
    expect(input.value).toBe('Run audit');
    expect(onAcceptSuggestion).toHaveBeenCalledWith('Run audit');
    expect(screen.getByTestId('reactive-input-shimmer-sweep').getAttribute('data-trigger')).toBe('autocomplete');

    // IME composing Enter must be ignored
    const composing = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true });
    Object.defineProperty(composing, 'isComposing', { value: true });
    input.dispatchEvent(composing);
    expect(onSubmit).not.toHaveBeenCalled();

    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onSubmit).toHaveBeenCalledWith('Run audit');
    expect(screen.getByTestId('reactive-input-shimmer-sweep').getAttribute('data-trigger')).toBe('submit');

    rerender(
      <ReactiveInputShimmer
        ref={ref}
        label="Command prompt"
        suggestions={[]}
        shimmerTrigger={1}
        onSubmit={onSubmit}
      />
    );
    expect(screen.getByTestId('reactive-input-shimmer-sweep').getAttribute('data-trigger')).toBe('manual');
  });

  it('respects disabled state without triggering sweeps or submissions', () => {
    const onSubmit = vi.fn();
    render(<ReactiveInputShimmer disabled label="Locked input" onSubmit={onSubmit} />);
    const input = screen.getByLabelText('Locked input');
    expect(input).toBeDisabled();
    fireEvent.focus(input);
    expect(screen.queryByTestId('reactive-input-shimmer-sweep')).toBeNull();
  });
});
