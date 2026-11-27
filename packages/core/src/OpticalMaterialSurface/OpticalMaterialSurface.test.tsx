import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { OpticalMaterialSurface } from './OpticalMaterialSurface';

describe('OpticalMaterialSurface', () => {
  it('applies wafer, lens, and prism material presets with DPR hairline locking', () => {
    const { rerender } = render(
      <OpticalMaterialSurface tier="wafer" data-testid="surface">
        Wafer Layer
      </OpticalMaterialSurface>
    );
    expect(screen.getByTestId('surface')).toHaveClass('prism-material-wafer');
    expect(screen.getByTestId('surface')).toHaveAttribute('data-material-tier', 'wafer');

    rerender(
      <OpticalMaterialSurface tier="prism" ior={1.85} blurPx={22} data-testid="surface">
        Prism Layer
      </OpticalMaterialSurface>
    );
    expect(screen.getByTestId('surface')).toHaveClass('prism-material-prism');
    expect(screen.getByTestId('surface')).toHaveAttribute('data-material-tier', 'prism');
  });
});
