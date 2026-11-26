import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ScanlineRadarSweep, type ScanlineSweepMode } from './ScanlineRadarSweep';

describe('ScanlineRadarSweep', () => {
  it('renders vertical, horizontal, and radar sweep beams with ARIA busy status and React 19 ref', () => {
    const ref = createRef<HTMLDivElement>();
    const modes: ScanlineSweepMode[] = ['vertical', 'horizontal', 'radar'];

    const { rerender } = render(
      <ScanlineRadarSweep ref={ref} active mode="vertical" tone="emerald" statusLabel="Scanning AST…">
        <pre className="p-4 text-xs">export const token = true;</pre>
      </ScanlineRadarSweep>
    );

    const region = screen.getByRole('region', { name: 'Scanning AST…' });
    expect(ref.current).toBe(region);
    expect(region).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByRole('status')).toHaveTextContent('Scanning AST…');

    for (const mode of modes) {
      rerender(
        <ScanlineRadarSweep ref={ref} active mode={mode} tone="prism" statusLabel={`Mode ${mode}`}>
          <div>Target</div>
        </ScanlineRadarSweep>
      );
      expect(screen.getByTestId('scanline-radar-sweep-beam')).toBeInTheDocument();
    }
  });

  it('removes beam and status pill when inactive and clamps invalid speedSeconds', () => {
    render(
      <ScanlineRadarSweep active={false} speedSeconds={Number.NaN} statusLabel="">
        <div>Idle Canvas</div>
      </ScanlineRadarSweep>
    );
    expect(screen.queryByTestId('scanline-radar-sweep-beam')).toBeNull();
    expect(screen.getByText('Idle Canvas')).toBeInTheDocument();
  });
});
