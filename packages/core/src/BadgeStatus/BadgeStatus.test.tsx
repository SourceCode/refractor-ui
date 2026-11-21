import { createRef } from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import { BadgeStatus } from './BadgeStatus';

describe('BadgeStatus', () => {
  it('renders numeric counter badge, ref forwarding, data attributes, and className passthrough', () => {
    const ref = createRef<HTMLSpanElement>();

    render(
      <BadgeStatus
        ref={ref}
        count={8}
        label="Pending PR reviews"
        className="custom-badge"
        data-testid="count-badge"
      />
    );

    const badge = screen.getByTestId('count-badge');
    expect(ref.current).toBe(badge);
    expect(badge).toHaveClass('refractor-badge-status', 'prism-crystal', 'custom-badge');
    expect(badge).toHaveAttribute('data-has-count', 'true');
    expect(badge).toHaveAttribute('data-tone', 'online');
    expect(screen.getByText('8')).toHaveClass('prism-btn-primary');
    expect(screen.getByText('Pending PR reviews')).toBeInTheDocument();
  });

  it('renders all semantic status dot tones including zero count and theme overrides', () => {
    render(
      <PrismThemeProvider
        theme={{
          components: { BadgeStatus: { className: 'theme-badge', style: { letterSpacing: '0.5px' } } },
        }}
      >
        <BadgeStatus tone="online" label="Synced" data-testid="b-online" />
        <BadgeStatus tone="warning" label="Queued" data-testid="b-warning" />
        <BadgeStatus tone="offline" label="Archived" data-testid="b-offline" />
        <BadgeStatus tone="counter" label="Alert" data-testid="b-counter" />
        <BadgeStatus count={0} label="Zero items" data-testid="b-zero" />
      </PrismThemeProvider>
    );

    const online = screen.getByTestId('b-online');
    expect(online).toHaveClass('refractor-badge-status', 'theme-badge');
    expect(online).toHaveStyle({ letterSpacing: '0.5px' });
    expect(online.querySelector('.bg-emerald-500')).not.toBeNull();

    expect(screen.getByTestId('b-warning').querySelector('.bg-amber-500')).not.toBeNull();
    expect(screen.getByTestId('b-offline').querySelector('.bg-slate-400')).not.toBeNull();
    expect(screen.getByTestId('b-counter').querySelector('.bg-orange-500')).not.toBeNull();
    expect(screen.getByTestId('b-zero')).toHaveTextContent('0');
    expect(screen.getByTestId('b-zero')).toHaveAttribute('data-has-count', 'true');
  });

  it('safely renders adversarial XSS payloads in label as literal text', () => {
    const payload = '<script>window.__xss=1</script><img src=x onerror=alert(1)>';
    render(<BadgeStatus label={payload} />);
    expect(screen.getByText(payload)).toBeInTheDocument();
    expect(document.querySelector('script')).toBeNull();
  });
});
