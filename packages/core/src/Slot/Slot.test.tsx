import { fireEvent, render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { Slot } from './Slot';

describe('Slot', () => {
  it('merges className, style, refs, and event handlers onto a custom child without wrapper div soup', () => {
    const parentClick = vi.fn();
    const childClick = vi.fn();
    const ref = createRef<HTMLElement>();

    render(
      <Slot
        ref={ref}
        className="prism-btn-primary"
        data-testid="slotted-link"
        onClick={parentClick}
      >
        <a href="#docs" className="custom-link" onClick={childClick}>
          Go to Docs
        </a>
      </Slot>
    );

    const link = screen.getByRole('link', { name: 'Go to Docs' });
    expect(link.tagName).toBe('A');
    expect(link).toHaveClass('prism-btn-primary', 'custom-link');
    expect(ref.current).toBe(link);

    fireEvent.click(link);
    expect(parentClick).toHaveBeenCalledTimes(1);
    expect(childClick).toHaveBeenCalledTimes(1);
  });

  it('falls back cleanly to a span when given non-element children', () => {
    render(<Slot data-testid="fallback">Plain text</Slot>);
    expect(screen.getByTestId('fallback').tagName).toBe('SPAN');
  });
});
