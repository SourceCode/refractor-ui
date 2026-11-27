import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AmbientAccentExtractor } from './AmbientAccentExtractor';

describe('AmbientAccentExtractor', () => {
  it('extracts primary and secondary accents from wallpaper swatches and notifies callback', () => {
    const onAccentsExtracted = vi.fn();
    render(
      <AmbientAccentExtractor
        wallpaperSwatches={['#1e293b', '#f97316', '#0ea5e9', '#cbd5e1']}
        sourceLabel="Desktop Wallpaper"
        onAccentsExtracted={onAccentsExtracted}
        data-testid="extractor"
      >
        <span>Tinted Glass Child</span>
      </AmbientAccentExtractor>
    );

    const el = screen.getByTestId('extractor');
    expect(el.getAttribute('data-primary-accent')).toMatch(/^#[0-9a-f]{6}$/);
    expect(el.getAttribute('data-secondary-accent')).toMatch(/^#[0-9a-f]{6}$/);
    expect(onAccentsExtracted).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Desktop Wallpaper')).toBeInTheDocument();
  });
});
