import { createRef } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { GradientTextSelection } from './GradientTextSelection';

describe('GradientTextSelection', () => {
  it('renders custom gradient caret on focus, gradient selection band on highlight, and handles IME-safe Enter', () => {
    const ref = createRef<HTMLDivElement>();
    const onSubmit = vi.fn();
    const onSelectionRangeChange = vi.fn();
    render(
      <GradientTextSelection
        ref={ref}
        defaultValue="Refractor Optical"
        label="Prompt"
        onSubmit={onSubmit}
        onSelectionRangeChange={onSelectionRangeChange}
      />
    );

    expect(ref.current).toBeInstanceOf(HTMLDivElement);
    const input = screen.getByLabelText('Prompt') as HTMLInputElement;

    fireEvent.focus(input);
    expect(screen.getByTestId('gradient-text-selection-caret')).toBeInTheDocument();

    input.setSelectionRange(0, 9);
    fireEvent.select(input);
    expect(onSelectionRangeChange).toHaveBeenLastCalledWith(0, 9);
    expect(screen.getByTestId('gradient-text-selection-band')).toHaveTextContent('Refractor');

    fireEvent.change(input, { target: { value: 'New prompt' } });
    expect(input.value).toBe('New prompt');

    // IME composition should NOT submit
    const composingEvt = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true });
    Object.defineProperty(composingEvt, 'isComposing', { value: true });
    input.dispatchEvent(composingEvt);
    expect(onSubmit).not.toHaveBeenCalled();

    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onSubmit).toHaveBeenCalledWith('New prompt');

    fireEvent.blur(input);
    expect(screen.queryByTestId('gradient-text-selection-caret')).toBeNull();
  });

  it('renders prose mode with selectable optical highlight and empty placeholder in editable mode', () => {
    const { rerender } = render(
      <GradientTextSelection mode="prose" palette="aurora" label="Prose region" />
    );
    expect(screen.getByRole('region', { name: 'Prose region' })).toBeInTheDocument();
    expect(screen.getByText(/prismatic spectrum selection/i)).toBeInTheDocument();

    rerender(<GradientTextSelection defaultValue="" placeholder="Ask anything..." palette="solar" disabled />);
    expect(screen.getByPlaceholderText('Ask anything...')).toBeDisabled();
  });
});
