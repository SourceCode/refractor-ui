import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FocusPrismaticRing } from './FocusPrismaticRing';

describe('FocusPrismaticRing', () => {
  it('applies prism-focus-prismatic class and optional forceVisible preview ring', () => {
    const { rerender } = render(
      <FocusPrismaticRing radius="full" data-testid="ring">
        <button type="button">Action</button>
      </FocusPrismaticRing>
    );
    expect(screen.getByTestId('ring')).toHaveClass('prism-focus-prismatic', 'rounded-full');

    rerender(
      <FocusPrismaticRing radius="xl" forceVisible data-testid="ring">
        <button type="button">Action</button>
      </FocusPrismaticRing>
    );
    expect(screen.getByTestId('ring')).toHaveAttribute('data-force-visible', 'true');
  });
});
