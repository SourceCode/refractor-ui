import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AmbientAuraBleed } from './AmbientAuraBleed';

describe('AmbientAuraBleed', () => {
  it('renders ambient floor bloom beneath children with elevation, tone, and React 19 ref', () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <AmbientAuraBleed ref={ref} tone="ai-violet" elevation="lg" intensity={0.9} data-testid="aura-root">
        <div className="prism-slab p-4">Floating AI Card</div>
      </AmbientAuraBleed>
    );

    const root = screen.getByTestId('aura-root');
    expect(ref.current).toBe(root);
    expect(root.getAttribute('data-tone')).toBe('ai-violet');
    expect(screen.getByText('Floating AI Card')).toBeInTheDocument();

    const bloom = screen.getByTestId('ambient-aura-bleed-bloom');
    expect(bloom.className).toContain('prism-fx-aura-layer');
    expect(bloom.style.opacity).toBe('0.9');
  });

  it('handles inactive state, static non-breathing mode, and non-finite intensity safely', () => {
    render(
      <AmbientAuraBleed tone="critical" elevation="sm" breathing={false} active={false} intensity={Number.NaN}>
        <span>Card</span>
      </AmbientAuraBleed>
    );
    const bloom = screen.getByTestId('ambient-aura-bleed-bloom');
    expect(bloom.className).not.toContain('prism-fx-aura-layer');
    expect(bloom.style.opacity).toBe('0');
  });
});
