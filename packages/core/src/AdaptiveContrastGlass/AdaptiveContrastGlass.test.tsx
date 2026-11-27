import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AdaptiveContrastGlass } from './AdaptiveContrastGlass';

describe('AdaptiveContrastGlass', () => {
  it('flips ink polarity between dark-ink over bright backdrops and light-ink over dark backdrops', () => {
    const { rerender } = render(
      <AdaptiveContrastGlass backdropColor="#f8fafc" showTelemetry data-testid="glass">
        Bright Backdrop Content
      </AdaptiveContrastGlass>
    );
    expect(screen.getByTestId('glass')).toHaveAttribute('data-ink-mode', 'dark-ink');
    expect(screen.getByText(/Ink: dark-ink/)).toBeInTheDocument();

    rerender(
      <AdaptiveContrastGlass backdropColor="#0f172a" showTelemetry data-testid="glass">
        Dark Backdrop Content
      </AdaptiveContrastGlass>
    );
    expect(screen.getByTestId('glass')).toHaveAttribute('data-ink-mode', 'light-ink');
    expect(screen.getByText(/Ink: light-ink/)).toBeInTheDocument();
  });
});
