import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CausticLightLayer } from './CausticLightLayer';

describe('CausticLightLayer', () => {
  it('renders caustic filament projection layer with React 19 ref and clamped parameters', () => {
    const ref = createRef<HTMLDivElement>();
    const { rerender } = render(
      <CausticLightLayer ref={ref} intensity={0.8} scale={1.5} speed={1.2} data-testid="caustic-root">
        <div className="p-4">Hero Surface</div>
      </CausticLightLayer>
    );

    expect(ref.current).toBe(screen.getByTestId('caustic-root'));
    expect(screen.getByText('Hero Surface')).toBeInTheDocument();
    expect(screen.getByTestId('caustic-light-layer-css').className).toContain('prism-fx-caustic-overlay');

    rerender(
      <CausticLightLayer ref={ref} intensity={Number.NaN} speed={-5} animated={false} disableWebGL data-testid="caustic-root">
        <div>Static</div>
      </CausticLightLayer>
    );
    expect(screen.getByTestId('caustic-light-layer-css').className).not.toContain('prism-fx-caustic-overlay');
  });
});
