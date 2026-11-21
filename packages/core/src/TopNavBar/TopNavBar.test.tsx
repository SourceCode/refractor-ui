import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import { TopNavBar } from './TopNavBar';

const sampleLinks = [
  { id: 'overview', label: 'Overview' },
  { id: 'components', label: 'Components' },
  { id: 'themes', label: 'Themes' },
];

describe('TopNavBar', () => {
  it('renders brand, links, active indicator, search trigger, initials, and forwards ref/className', () => {
    const ref = createRef<HTMLElement>();
    const onSelectLink = vi.fn();
    const onSearchClick = vi.fn();

    render(
      <TopNavBar
        ref={ref}
        brand="Refractor OS"
        links={sampleLinks}
        activeLinkId="components"
        onSelectLink={onSelectLink}
        onSearchClick={onSearchClick}
        userInitials="RR"
        className="custom-nav"
        data-testid="top-nav"
      />
    );

    const nav = screen.getByTestId('top-nav');
    expect(ref.current).toBe(nav);
    expect(nav).toHaveClass('refractor-top-nav-bar', 'prism-crystal', 'custom-nav');
    expect(nav).toHaveAttribute('data-has-search', 'true');
    expect(screen.getByText('Refractor OS')).toBeInTheDocument();
    expect(screen.getByLabelText('Signed in user')).toHaveTextContent('RR');

    const activeBtn = screen.getByRole('button', { name: 'Components' });
    expect(activeBtn).toHaveAttribute('aria-current', 'page');

    const inactiveBtn = screen.getByRole('button', { name: 'Themes' });
    expect(inactiveBtn).not.toHaveAttribute('aria-current');
    fireEvent.click(inactiveBtn);
    expect(onSelectLink).toHaveBeenCalledWith('themes');

    fireEvent.click(screen.getByRole('button', { name: 'Quick search' }));
    expect(onSearchClick).toHaveBeenCalledTimes(1);
  });

  it('omits search trigger when onSearchClick is undefined, defaults initials, and applies theme overrides', () => {
    render(
      <PrismThemeProvider
        theme={{
          components: { TopNavBar: { className: 'theme-nav', style: { maxWidth: '960px' } } },
        }}
      >
        <TopNavBar
          brand="Studio"
          links={sampleLinks}
          activeLinkId="overview"
          onSelectLink={vi.fn()}
          aria-label="Primary Header"
          className="local-nav"
        />
      </PrismThemeProvider>
    );

    const nav = screen.getByRole('navigation', { name: 'Primary Header' });
    expect(nav).toHaveClass('refractor-top-nav-bar', 'theme-nav', 'local-nav');
    expect(nav).toHaveStyle({ maxWidth: '960px' });
    expect(nav).not.toHaveAttribute('data-has-search');
    expect(screen.queryByRole('button', { name: 'Quick search' })).toBeNull();
    expect(screen.getByLabelText('Signed in user')).toHaveTextContent('CV');
  });

  it('handles empty links array and unmatched activeLinkId safely (negative/adversarial)', () => {
    render(
      <TopNavBar
        brand="EmptyNav"
        links={[]}
        activeLinkId="nonexistent"
        onSelectLink={vi.fn()}
      />
    );

    expect(screen.getByRole('navigation')).toBeInTheDocument();
    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });

  it('renders adversarial XSS strings in brand and link labels as literal text', () => {
    const payload = '<img src=x onerror=alert(1)><script>window.__xss=1</script>';
    render(
      <TopNavBar
        brand={payload}
        links={[{ id: 'xss', label: payload }]}
        activeLinkId="xss"
        onSelectLink={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: payload })).toHaveTextContent(payload);
    expect(document.querySelector('script')).toBeNull();
  });
});
