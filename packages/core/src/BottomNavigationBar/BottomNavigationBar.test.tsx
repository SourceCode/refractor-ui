import { createRef, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { Bell, Home, Search, User } from 'lucide-react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import { BottomNavigationBar, type BottomNavItem } from './index';

const SAMPLE_ITEMS: BottomNavItem[] = [
  { id: 'home', label: 'Home', icon: <Home data-testid="icon-home" /> },
  { id: 'search', label: 'Search', icon: <Search data-testid="icon-search" />, disabled: true },
  { id: 'alerts', label: 'Alerts', icon: <Bell data-testid="icon-alerts" />, badgeCount: 5 },
  { id: 'profile', label: 'Profile', icon: <User data-testid="icon-profile" />, badgeCount: 142 },
];

describe('BottomNavigationBar', () => {
  it('renders prism-slab inline nav, defaults to first enabled item, forwards ref/theme overrides, and formats badges', () => {
    const ref = createRef<HTMLElement>();
    const onChange = vi.fn<(id: string, item: BottomNavItem) => void>();

    render(
      <PrismThemeProvider
        theme={{
          components: {
            BottomNavigationBar: {
              className: 'theme-bottom-nav',
              style: { maxWidth: '480px' },
            },
          },
        }}
      >
        <BottomNavigationBar
          ref={ref}
          items={SAMPLE_ITEMS}
          onChange={onChange}
          className="local-bottom-nav"
          xstyle={{ '--prism-slab-blur-px': '20px' }}
          data-testid="bottom-nav-root"
        />
      </PrismThemeProvider>
    );

    const nav = screen.getByRole('navigation', { name: 'Bottom navigation' });
    expect(ref.current).toBe(nav);
    expect(nav).toHaveClass(
      'refractor-bottom-navigation-bar',
      'prism-slab',
      'theme-bottom-nav',
      'local-bottom-nav'
    );
    expect(nav).toHaveAttribute('data-mode', 'inline');
    expect(nav).not.toHaveAttribute('data-empty');
    expect(nav).toHaveStyle({ maxWidth: '480px' });

    const homeBtn = screen.getByRole('button', { name: 'Home' });
    const searchBtn = screen.getByRole('button', { name: 'Search' });
    const alertsBtn = screen.getByRole('button', { name: /Alerts/ });
    const profileBtn = screen.getByRole('button', { name: /Profile/ });

    expect(homeBtn).toHaveAttribute('aria-current', 'page');
    expect(homeBtn).toHaveClass('min-h-[48px]', 'prism-crystal');
    expect(screen.getByTestId('bottom-nav-active-pill-home')).toBeInTheDocument();

    expect(searchBtn).toBeDisabled();
    expect(searchBtn).toHaveClass('disabled:cursor-not-allowed');
    expect(searchBtn).not.toHaveAttribute('aria-current');

    expect(screen.getByTestId('bottom-nav-badge-alerts')).toHaveTextContent('5');
    expect(screen.getByTestId('bottom-nav-badge-profile')).toHaveTextContent('99+');

    fireEvent.click(alertsBtn);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('alerts', SAMPLE_ITEMS[2]);
    expect(alertsBtn).toHaveAttribute('aria-current', 'page');
    expect(homeBtn).not.toHaveAttribute('aria-current');

    // Disabled destination cannot be activated
    fireEvent.click(searchBtn);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(alertsBtn).toHaveAttribute('aria-current', 'page');
    expect(profileBtn).not.toHaveAttribute('aria-current');
  });

  it('supports fixed mode classes, custom ariaLabel, and non-icon inline badges with edge-case counts', () => {
    const items: BottomNavItem[] = [
      { id: 'disabled-first', label: 'Locked', disabled: true, badgeCount: 3 },
      { id: 'zero', label: 'Zero', badgeCount: 0 },
      { id: 'neg', label: 'Neg', badgeCount: -10 },
      { id: 'nan', label: 'NaN', badgeCount: Number.NaN },
      { id: 'inf', label: 'Inf', badgeCount: Number.POSITIVE_INFINITY },
      { id: 'frac', label: 'Frac', badgeCount: 0.4 },
      { id: 'valid', label: 'Inbox', badgeCount: 99 },
    ];

    render(
      <BottomNavigationBar
        items={items}
        mode="fixed"
        ariaLabel="Mobile app navigation"
        defaultActiveId="disabled-first"
        data-testid="fixed-nav"
      />
    );

    const nav = screen.getByRole('navigation', { name: 'Mobile app navigation' });
    expect(nav).toHaveAttribute('data-mode', 'fixed');
    expect(nav).toHaveClass('prism-slab', 'fixed', 'bottom-0', 'inset-x-0', 'z-40');

    // Falls back to first non-disabled item when defaultActiveId points to a disabled item
    expect(screen.getByRole('button', { name: 'Zero' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('button', { name: /Locked/ })).not.toHaveAttribute('aria-current');

    expect(screen.queryByTestId('bottom-nav-badge-zero')).not.toBeInTheDocument();
    expect(screen.queryByTestId('bottom-nav-badge-neg')).not.toBeInTheDocument();
    expect(screen.queryByTestId('bottom-nav-badge-nan')).not.toBeInTheDocument();
    expect(screen.queryByTestId('bottom-nav-badge-inf')).not.toBeInTheDocument();
    expect(screen.queryByTestId('bottom-nav-badge-frac')).not.toBeInTheDocument();
    expect(screen.getByTestId('bottom-nav-badge-valid')).toHaveTextContent('99');
  });

  it('supports defaultActiveId and controlled activeId synchronization', () => {
    const onChange = vi.fn<(id: string, item: BottomNavItem) => void>();

    function ControlledNavHarness() {
      const [active, setActive] = useState('alerts');
      return (
        <BottomNavigationBar
          items={SAMPLE_ITEMS}
          activeId={active}
          onChange={(id, item) => {
            onChange(id, item);
            setActive(id);
          }}
        />
      );
    }

    const { unmount } = render(<ControlledNavHarness />);
    expect(screen.getByRole('button', { name: /Alerts/ })).toHaveAttribute('aria-current', 'page');

    fireEvent.click(screen.getByRole('button', { name: /Profile/ }));
    expect(onChange).toHaveBeenCalledWith('profile', SAMPLE_ITEMS[3]);
    expect(screen.getByRole('button', { name: /Profile/ })).toHaveAttribute('aria-current', 'page');
    unmount();

    // Uncontrolled with explicit valid defaultActiveId
    render(<BottomNavigationBar items={SAMPLE_ITEMS} defaultActiveId="profile" />);
    expect(screen.getByRole('button', { name: /Profile/ })).toHaveAttribute('aria-current', 'page');
  });

  it('navigates across enabled destinations with ArrowRight, ArrowLeft, Home, and End while skipping disabled items and guarding IME', () => {
    const onChange = vi.fn<(id: string, item: BottomNavItem) => void>();
    render(<BottomNavigationBar items={SAMPLE_ITEMS} onChange={onChange} />);

    const homeBtn = screen.getByRole('button', { name: 'Home' });
    const alertsBtn = screen.getByRole('button', { name: /Alerts/ });
    const profileBtn = screen.getByRole('button', { name: /Profile/ });

    homeBtn.focus();
    expect(document.activeElement).toBe(homeBtn);

    // Unrelated key does nothing
    fireEvent.keyDown(homeBtn, { key: 'ArrowDown' });
    expect(onChange).not.toHaveBeenCalled();

    // IME composing keydown is ignored
    fireEvent.keyDown(homeBtn, { key: 'ArrowRight', isComposing: true });
    expect(onChange).not.toHaveBeenCalled();

    // ArrowRight skips disabled 'search' and focuses 'alerts'
    fireEvent.keyDown(homeBtn, { key: 'ArrowRight' });
    expect(alertsBtn).toHaveAttribute('aria-current', 'page');
    expect(document.activeElement).toBe(alertsBtn);
    expect(onChange).toHaveBeenLastCalledWith('alerts', SAMPLE_ITEMS[2]);

    // ArrowRight moves to 'profile'
    fireEvent.keyDown(alertsBtn, { key: 'ArrowRight' });
    expect(profileBtn).toHaveAttribute('aria-current', 'page');
    expect(document.activeElement).toBe(profileBtn);

    // ArrowRight wraps back to 'home'
    fireEvent.keyDown(profileBtn, { key: 'ArrowRight' });
    expect(homeBtn).toHaveAttribute('aria-current', 'page');
    expect(document.activeElement).toBe(homeBtn);

    // ArrowLeft wraps backward to 'profile'
    fireEvent.keyDown(homeBtn, { key: 'ArrowLeft' });
    expect(profileBtn).toHaveAttribute('aria-current', 'page');
    expect(document.activeElement).toBe(profileBtn);

    // Home jumps to first enabled ('home')
    fireEvent.keyDown(profileBtn, { key: 'Home' });
    expect(homeBtn).toHaveAttribute('aria-current', 'page');
    expect(document.activeElement).toBe(homeBtn);

    // End jumps to last enabled ('profile')
    fireEvent.keyDown(homeBtn, { key: 'End' });
    expect(profileBtn).toHaveAttribute('aria-current', 'page');
    expect(document.activeElement).toBe(profileBtn);
  });

  it('handles empty items and all-disabled items gracefully without throwing (negative test)', () => {
    const { rerender } = render(
      <BottomNavigationBar items={[]} data-testid="empty-nav" />
    );

    const emptyNav = screen.getByTestId('empty-nav');
    expect(emptyNav).toHaveAttribute('data-empty', 'true');
    expect(screen.getByTestId('bottom-nav-empty')).toHaveTextContent(
      'No navigation destinations available.'
    );
    expect(screen.queryAllByRole('button')).toHaveLength(0);

    // All disabled items: defaults activeId to '', no button has aria-current
    rerender(
      <BottomNavigationBar
        items={[
          { id: 'a', label: 'Alpha', disabled: true },
          { id: 'b', label: 'Beta', disabled: true },
        ]}
        data-testid="empty-nav"
      />
    );
    expect(emptyNav).not.toHaveAttribute('data-empty');
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(2);
    for (const button of buttons) {
      expect(button).toBeDisabled();
      expect(button).not.toHaveAttribute('aria-current');
    }
  });

  it('renders adversarial XSS payloads in labels as literal text and honors aria-label override', () => {
    const payload = '<script>window.__navXss=1</script><img src=x onerror=alert(1)>';
    render(
      <BottomNavigationBar
        items={[{ id: 'xss', label: payload, badgeCount: 1 }]}
        aria-label="Custom ARIA Nav"
      />
    );

    expect(screen.getByRole('navigation', { name: 'Custom ARIA Nav' })).toBeInTheDocument();
    expect(document.querySelector('script')).toBeNull();
    expect(document.querySelector('img')).toBeNull();
    expect(screen.getByText(payload)).toBeInTheDocument();
  });
});
