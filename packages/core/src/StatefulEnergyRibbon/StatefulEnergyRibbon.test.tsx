import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StatefulEnergyRibbon, type EnergyRibbonState } from './StatefulEnergyRibbon';

describe('StatefulEnergyRibbon', () => {
  it('adapts flow speed, semantic state attribute, and live label across all 6 states', () => {
    const ref = createRef<HTMLDivElement>();
    const states: EnergyRibbonState[] = [
      'idle',
      'listening',
      'thinking',
      'streaming',
      'success',
      'error',
    ];
    const { rerender } = render(
      <StatefulEnergyRibbon ref={ref} state="idle" showLabel position="top" />
    );

    expect(ref.current).toBeInstanceOf(HTMLDivElement);
    for (const st of states) {
      rerender(<StatefulEnergyRibbon ref={ref} state={st} showLabel position="top" />);
      const status = screen.getByRole('status');
      expect(status.getAttribute('data-state')).toBe(st);
      expect(status.className).toContain('top-0');
    }
  });

  it('supports custom label, paused animation, bottom anchor, and non-finite thickness clamping', () => {
    render(
      <StatefulEnergyRibbon
        state="thinking"
        position="bottom"
        thicknessPx={Number.NaN}
        paused
        label="Synthesizing shaders"
        showLabel
      />
    );
    const status = screen.getByRole('status', { name: 'Synthesizing shaders' });
    expect(status.className).toContain('bottom-0');
    expect(screen.getByTestId('stateful-energy-ribbon-flow').style.animationPlayState).toBe('paused');
  });
});
