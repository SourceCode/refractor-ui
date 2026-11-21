import { createRef } from 'react';
import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import { Avatar } from './Avatar';

describe('Avatar', () => {
  it('renders portrait image, size/shape variants, ref forwarding, and falls back to initials on broken image error', () => {
    const ref = createRef<HTMLDivElement>();
    const { rerender } = render(
      <Avatar
        ref={ref}
        src="https://example.com/clara.jpg"
        alt="Clara Vance"
        initials="CV"
        size="lg"
        shape="squircle"
        className="custom-avatar"
        data-testid="avatar"
      />
    );

    const root = screen.getByTestId('avatar');
    expect(ref.current).toBe(root);
    expect(root).toHaveClass('refractor-avatar', 'prism-crystal', 'rounded-2xl', 'w-14', 'custom-avatar');
    expect(root).toHaveAttribute('data-size', 'lg');
    expect(root).toHaveAttribute('data-shape', 'squircle');
    expect(root).not.toHaveAttribute('data-fallback');

    const img = screen.getByRole('img', { name: 'Clara Vance' });
    expect(img.tagName).toBe('IMG');
    expect(img).toHaveAttribute('referrerPolicy', 'no-referrer');

    fireEvent.error(img);

    expect(root).toHaveAttribute('data-fallback', 'true');
    const fallback = screen.getByRole('img', { name: 'Clara Vance' });
    expect(fallback.tagName).toBe('SPAN');
    expect(fallback).toHaveTextContent('CV');

    rerender(
      <Avatar
        ref={ref}
        src="https://example.com/clara-v2.jpg"
        alt="Clara Vance"
        initials="CV"
        size="lg"
        shape="squircle"
        data-testid="avatar"
      />
    );
    expect(screen.getByRole('img', { name: 'Clara Vance' }).tagName).toBe('IMG');
  });

  it('supports sm/md sizes, circle shape, initials without src, and theme overrides', () => {
    render(
      <PrismThemeProvider
        theme={{
          components: { Avatar: { className: 'theme-avatar', style: { opacity: '0.95' } } },
        }}
      >
        <Avatar size="sm" alt="Small User" initials="SU" className="local-avatar" data-testid="sm-av" />
        <Avatar alt="Default User" initials="DU" data-testid="md-av" />
      </PrismThemeProvider>
    );

    const small = screen.getByTestId('sm-av');
    expect(small).toHaveClass('refractor-avatar', 'theme-avatar', 'local-avatar', 'w-9', 'rounded-full');
    expect(small).toHaveStyle({ opacity: '0.95' });
    expect(small).toHaveAttribute('data-fallback', 'true');
    expect(screen.getByTestId('md-av')).toHaveClass('w-11', 'rounded-full');
  });

  it('blocks unsafe javascript: src URLs and safely renders adversarial XSS initials/alt (negative & adversarial test)', () => {
    const payload = '<script>window.__xss=1</script>';
    render(
      <Avatar
        src="javascript:alert(1)"
        alt={payload}
        initials={payload}
        data-testid="unsafe-avatar"
      />
    );

    const root = screen.getByTestId('unsafe-avatar');
    expect(root).toHaveAttribute('data-fallback', 'true');
    expect(root.querySelector('img')).toBeNull();
    expect(screen.getByRole('img', { name: payload })).toHaveTextContent(payload);
    expect(document.querySelector('script')).toBeNull();
  });
});
