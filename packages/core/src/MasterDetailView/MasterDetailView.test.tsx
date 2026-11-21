import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import { MasterDetailView, type MasterDetailItem } from './MasterDetailView';

interface ServiceRecord extends MasterDetailItem {
  region: string;
}

const ITEMS: ServiceRecord[] = [
  {
    id: 'svc-1',
    title: 'Prism Gateway',
    subtitle: 'Primary edge ingress',
    badge: 'Healthy',
    meta: '12ms',
    region: 'us-east-1',
  },
  {
    id: 'svc-2',
    title: 'Refractor Worker',
    subtitle: 'Async caustic renderer',
    badge: 'Degraded',
    meta: '84ms',
    region: 'eu-west-1',
  },
  {
    id: 'svc-3',
    title: 'Audit Ledger',
    meta: '99.9%',
    region: 'ap-south-1',
  },
  {
    id: 'svc-4',
    title: 'Bare Node',
    region: 'us-west-2',
  },
];

describe('MasterDetailView', () => {
  it('renders uncontrolled split workspace, defaults to first item, handles selection, mobile back button, and forwards ref', () => {
    const ref = createRef<HTMLDivElement>();
    const onSelectItem = vi.fn();

    render(
      <MasterDetailView
        ref={ref}
        masterTitle="Optical Services"
        items={ITEMS}
        onSelectItem={onSelectItem}
        renderDetail={(item) => (
          <div data-testid="detail-content">
            <h3>{item.title}</h3>
            <p>{item.region}</p>
          </div>
        )}
        className="custom-master-detail"
        xstyle={{ '--prism-blur-px': '20px' }}
        data-testid="mdv-root"
      />
    );

    const root = screen.getByTestId('mdv-root');
    expect(ref.current).toBe(root);
    expect(root).toHaveClass('refractor-master-detail-view', 'prism-slab', 'custom-master-detail');
    expect(root).toHaveAttribute('data-has-selection', 'true');
    expect(root).not.toHaveAttribute('data-mobile-detail-open');

    // Header and count
    expect(screen.getByText('Optical Services')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();

    // Default selection is items[0]
    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(4);
    expect(options[0]).toHaveAttribute('aria-selected', 'true');
    expect(options[0]).toHaveClass('prism-emerald');
    expect(options[1]).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByTestId('detail-content')).toHaveTextContent('Prism Gateway');
    expect(screen.getByTestId('detail-content')).toHaveTextContent('us-east-1');

    // Select second item
    fireEvent.click(options[1]!);
    expect(onSelectItem).toHaveBeenCalledWith(ITEMS[1]);
    expect(options[1]).toHaveAttribute('aria-selected', 'true');
    expect(options[1]).toHaveClass('prism-emerald');
    expect(screen.getByTestId('detail-content')).toHaveTextContent('Refractor Worker');
    expect(root).toHaveAttribute('data-mobile-detail-open', 'true');

    // Click mobile "Back to list" trigger
    const backBtn = screen.getByRole('button', { name: 'Back to list' });
    fireEvent.click(backBtn);
    expect(root).not.toHaveAttribute('data-mobile-detail-open');
  });

  it('supports controlled selectedId, defaultSelectedId=null, custom renderItem, and theme overrides', () => {
    const onSelectItem = vi.fn();
    const { rerender } = render(
      <PrismThemeProvider
        theme={{
          components: {
            MasterDetailView: { className: 'theme-mdv', style: { minHeight: '420px' } },
          },
        }}
      >
        <MasterDetailView
          items={ITEMS}
          selectedId="svc-2"
          onSelectItem={onSelectItem}
          searchable={false}
          renderItem={(item, selected) => (
            <span data-testid={`custom-row-${item.id}`}>
              {item.title} {selected ? '(active)' : '(idle)'}
            </span>
          )}
          renderDetail={(item) => <div>Detail: {item.id}</div>}
          className="local-mdv"
          data-testid="controlled-mdv"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('controlled-mdv');
    expect(root).toHaveClass('refractor-master-detail-view', 'theme-mdv', 'local-mdv');
    expect(root).toHaveStyle({ minHeight: '420px' });
    expect(screen.queryByRole('searchbox')).toBeNull();
    expect(screen.getByTestId('custom-row-svc-2')).toHaveTextContent('Refractor Worker (active)');
    expect(screen.getByText('Detail: svc-2')).toBeInTheDocument();

    // Clicking another option fires callback without overriding controlled prop
    fireEvent.click(screen.getByTestId('custom-row-svc-1'));
    expect(onSelectItem).toHaveBeenCalledWith(ITEMS[0]);
    expect(screen.getByText('Detail: svc-2')).toBeInTheDocument();

    // Rerender with uncontrolled defaultSelectedId={null}
    rerender(
      <MasterDetailView
        items={ITEMS}
        defaultSelectedId={null}
        emptyDetailMessage="Pick a service."
        renderDetail={(item) => <div>Detail: {item.id}</div>}
      />
    );
    expect(screen.getByText('Pick a service.')).toBeInTheDocument();
  });

  it('filters master items by title, subtitle, badge, and meta with IME-safe Enter and Escape/Clear handling', () => {
    const onSelectItem = vi.fn();

    render(
      <MasterDetailView
        items={ITEMS}
        onSelectItem={onSelectItem}
        searchPlaceholder="Filter services"
        emptyListMessage="Zero services matched."
        renderDetail={(item) => <div data-testid="detail">{item.title}</div>}
      />
    );

    const searchInput = screen.getByRole('searchbox', { name: 'Filter services' });

    // Match by subtitle
    fireEvent.change(searchInput, { target: { value: 'caustic' } });
    expect(screen.getAllByRole('option')).toHaveLength(1);
    expect(screen.getByRole('option')).toHaveTextContent('Refractor Worker');

    // Match by badge
    fireEvent.change(searchInput, { target: { value: 'healthy' } });
    expect(screen.getAllByRole('option')).toHaveLength(1);
    expect(screen.getByRole('option')).toHaveTextContent('Prism Gateway');

    // Match by meta
    fireEvent.change(searchInput, { target: { value: '99.9%' } });
    expect(screen.getAllByRole('option')).toHaveLength(1);
    expect(screen.getByRole('option')).toHaveTextContent('Audit Ledger');

    // IME composing Enter MUST NOT select item
    const composingEnter = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true });
    Object.defineProperty(composingEnter, 'isComposing', { value: true });
    fireEvent(searchInput, composingEnter);
    expect(onSelectItem).not.toHaveBeenCalled();

    // Non-composing Enter selects the first filtered match
    fireEvent.keyDown(searchInput, { key: 'Enter' });
    expect(onSelectItem).toHaveBeenCalledWith(ITEMS[2]);
    expect(screen.getByTestId('detail')).toHaveTextContent('Audit Ledger');

    // Non-matching query displays emptyListMessage; Enter is a safe no-op
    fireEvent.change(searchInput, { target: { value: 'zzz-no-match' } });
    expect(screen.getByText('Zero services matched.')).toBeInTheDocument();
    expect(screen.queryAllByRole('option')).toHaveLength(0);
    fireEvent.keyDown(searchInput, { key: 'Enter' });
    expect(onSelectItem).toHaveBeenCalledTimes(1);

    // Escape clears the query
    fireEvent.keyDown(searchInput, { key: 'Escape' });
    expect(searchInput).toHaveValue('');
    expect(screen.getAllByRole('option')).toHaveLength(4);

    // Clear button clears the query
    fireEvent.change(searchInput, { target: { value: 'Prism' } });
    fireEvent.click(screen.getByRole('button', { name: 'Clear search' }));
    expect(searchInput).toHaveValue('');
    expect(screen.getAllByRole('option')).toHaveLength(4);
  });

  it('supports ArrowDown, ArrowUp, Home, and End keyboard navigation across filtered options', () => {
    const onSelectItem = vi.fn();

    render(
      <MasterDetailView
        items={ITEMS}
        defaultSelectedId={null}
        onSelectItem={onSelectItem}
        renderDetail={(item) => <div data-testid="kb-detail">{item.title}</div>}
      />
    );

    const listbox = screen.getByRole('listbox', { name: 'Master items' });

    // From null selection, ArrowUp selects last item
    fireEvent.keyDown(listbox, { key: 'ArrowUp' });
    expect(screen.getByTestId('kb-detail')).toHaveTextContent('Bare Node');

    // Home jumps to first item
    fireEvent.keyDown(listbox, { key: 'Home' });
    expect(screen.getByTestId('kb-detail')).toHaveTextContent('Prism Gateway');
    expect(document.activeElement).toBe(screen.getAllByRole('option')[0]);

    // ArrowDown steps to second item
    fireEvent.keyDown(listbox, { key: 'ArrowDown' });
    expect(screen.getByTestId('kb-detail')).toHaveTextContent('Refractor Worker');
    expect(document.activeElement).toBe(screen.getAllByRole('option')[1]);

    // End jumps to last item
    fireEvent.keyDown(listbox, { key: 'End' });
    expect(screen.getByTestId('kb-detail')).toHaveTextContent('Bare Node');

    // ArrowUp steps back to third item
    fireEvent.keyDown(listbox, { key: 'ArrowUp' });
    expect(screen.getByTestId('kb-detail')).toHaveTextContent('Audit Ledger');

    // Unrelated key does not fire selection
    const callsBefore = onSelectItem.mock.calls.length;
    fireEvent.keyDown(listbox, { key: 'a' });
    expect(onSelectItem).toHaveBeenCalledTimes(callsBefore);

    // Starting from null selection with ArrowDown picks index 0
    render(
      <MasterDetailView
        items={ITEMS}
        defaultSelectedId={null}
        masterTitle="Second List"
        renderDetail={(item) => <div data-testid="kb-detail-2">{item.title}</div>}
      />
    );
    const secondListbox = screen.getByRole('listbox', { name: 'Second List' });
    fireEvent.keyDown(secondListbox, { key: 'ArrowDown' });
    expect(screen.getByTestId('kb-detail-2')).toHaveTextContent('Prism Gateway');
  });

  it('handles empty items, stale selectedId, NaN/out-of-range masterWidthPx, and XSS strings safely', () => {
    const xssPayload = '<script>window.__xss=1</script><img src=x onerror=alert(1)>';

    const { rerender } = render(
      <MasterDetailView<MasterDetailItem>
        items={[]}
        masterWidthPx={Number.NaN}
        emptyListMessage="Empty list"
        emptyDetailMessage="Empty detail"
        renderDetail={(item) => <div>{item.title}</div>}
        data-testid="edge-mdv"
      />
    );

    const root = screen.getByTestId('edge-mdv');
    expect(root).toHaveAttribute('data-empty', 'true');
    expect(screen.getByText('Empty list')).toBeInTheDocument();
    expect(screen.getByText('Empty detail')).toBeInTheDocument();

    // Keydown on empty listbox is a safe no-op
    fireEvent.keyDown(screen.getByRole('listbox'), { key: 'ArrowDown' });

    const masterPane = root.querySelector('[data-part="master-pane"]') as HTMLElement;
    expect(masterPane).toHaveAttribute('data-master-width', '300');
    expect(masterPane.style.getPropertyValue('--prism-master-width')).toBe('300px');

    // Stale selectedId + width clamped low (100 -> 200)
    rerender(
      <MasterDetailView
        items={ITEMS}
        selectedId="stale-missing-id"
        masterWidthPx={100}
        emptyDetailMessage="Stale item fallback"
        renderDetail={(item) => <div>{item.title}</div>}
        data-testid="edge-mdv"
      />
    );
    expect(screen.getByText('Stale item fallback')).toBeInTheDocument();
    expect(root).not.toHaveAttribute('data-has-selection');
    expect(masterPane).toHaveAttribute('data-master-width', '200');

    // Width clamped high (900 -> 480) + XSS strings rendered literally
    rerender(
      <MasterDetailView
        items={[{ id: 'xss', title: xssPayload, subtitle: xssPayload, badge: xssPayload }]}
        selectedId="xss"
        masterTitle={xssPayload}
        masterWidthPx={900}
        renderDetail={(item) => <div data-testid="xss-detail">{item.title}</div>}
        data-testid="edge-mdv"
      />
    );
    expect(masterPane).toHaveAttribute('data-master-width', '480');
    const detailPane = within(root).getByTestId('xss-detail');
    expect(detailPane).toHaveTextContent(xssPayload);
    expect(document.querySelector('script')).toBeNull();
  });
});
