import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import { PrismTabs } from './PrismTabs';

const tabs = [
  { id: 'overview', label: 'Overview', content: <div>Overview Panel</div> },
  { id: 'tokens', label: 'Tokens', content: <div>Tokens Panel</div> },
  { id: 'code', label: 'Code' },
];

describe('PrismTabs', () => {
  it('renders tabs, active panel, specimen pill cycling, keyboard navigation, and forwards ref/className', () => {
    const ref = createRef<HTMLDivElement>();
    const onChange = vi.fn();

    render(
      <PrismTabs
        ref={ref}
        tabs={tabs}
        activeTabId="overview"
        onChange={onChange}
        showSpecimenPill
        className="custom-tabs"
        data-testid="tabs-root"
      />
    );

    const root = screen.getByTestId('tabs-root');
    expect(ref.current).toBe(root);
    expect(root).toHaveClass('refractor-prism-tabs', 'custom-tabs');
    expect(root).toHaveAttribute('data-specimen', 'true');

    const overviewTab = screen.getByRole('tab', { name: 'Overview' });
    const tokensTab = screen.getByRole('tab', { name: 'Tokens' });
    expect(overviewTab).toHaveAttribute('aria-selected', 'true');
    expect(tokensTab).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByRole('tabpanel')).toHaveTextContent('Overview Panel');

    fireEvent.click(tokensTab);
    expect(onChange).toHaveBeenCalledWith('tokens');

    fireEvent.click(screen.getByRole('button', { name: 'Cycle active tab' }));
    expect(onChange).toHaveBeenCalledWith('tokens');

    fireEvent.keyDown(overviewTab, { key: 'ArrowRight' });
    expect(onChange).toHaveBeenLastCalledWith('tokens');

    fireEvent.keyDown(overviewTab, { key: 'ArrowLeft' });
    expect(onChange).toHaveBeenLastCalledWith('code');

    fireEvent.keyDown(tokensTab, { key: 'Home' });
    expect(onChange).toHaveBeenLastCalledWith('overview');

    fireEvent.keyDown(overviewTab, { key: 'End' });
    expect(onChange).toHaveBeenLastCalledWith('code');

    const countBefore = onChange.mock.calls.length;
    fireEvent.keyDown(overviewTab, { key: 'Tab' });
    expect(onChange).toHaveBeenCalledTimes(countBefore);
  });

  it('omits tabpanel when active tab has no content and applies theme overrides', () => {
    render(
      <PrismThemeProvider
        theme={{
          components: { PrismTabs: { className: 'theme-tabs', style: { padding: '4px' } } },
        }}
      >
        <PrismTabs
          tabs={tabs}
          activeTabId="code"
          onChange={vi.fn()}
          className="local-tabs"
          data-testid="tabs-no-panel"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('tabs-no-panel');
    expect(root).toHaveClass('refractor-prism-tabs', 'theme-tabs', 'local-tabs');
    expect(root).toHaveStyle({ padding: '4px' });
    expect(screen.queryByRole('tabpanel')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Cycle active tab' })).toBeNull();
  });

  it('handles empty tabs array and unmatched activeTabId safely (adversarial)', () => {
    const onChange = vi.fn();
    render(<PrismTabs tabs={[]} activeTabId="missing" onChange={onChange} showSpecimenPill />);

    expect(screen.queryAllByRole('tab')).toHaveLength(0);
    expect(screen.queryByRole('tabpanel')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Cycle active tab' }));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('falls back to first tab panel on unmatched activeTabId and renders XSS labels literally', () => {
    const payload = '<script>window.__xss=1</script><svg onload=alert(1)>';
    render(
      <PrismTabs
        tabs={[{ id: 'a', label: payload, content: payload }]}
        activeTabId="unknown-id"
        onChange={vi.fn()}
      />
    );

    expect(screen.getByRole('tab')).toHaveTextContent(payload);
    expect(screen.getByRole('tabpanel')).toHaveTextContent(payload);
    expect(document.querySelector('script')).toBeNull();
  });
});
