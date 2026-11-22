import { createRef } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import { PropertyGrid as BarrelPropertyGrid, type PropertyGridDensityMap } from './index';
import { PropertyGrid, type PropertyGridEntry } from './PropertyGrid';

const originalClipboardDescriptor = Object.getOwnPropertyDescriptor(navigator, 'clipboard');

function restoreClipboard() {
  if (originalClipboardDescriptor) {
    Object.defineProperty(navigator, 'clipboard', originalClipboardDescriptor);
  } else {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: undefined,
    });
  }
}

const CUSTOM_ENTRIES: ReadonlyArray<PropertyGridEntry> = [
  {
    id: 'service-url',
    label: 'Service Endpoint',
    value: (
      <a href="https://edge.refractor.dev" className="underline">
        https://edge.refractor.dev
      </a>
    ),
    copyValue: 'https://edge.refractor.dev',
    hint: 'Primary edge ingress URI',
    spanFull: true,
    monospace: true,
  },
  {
    id: 'auto-scale',
    label: 'Autoscaling',
    value: (
      <button type="button" role="switch" aria-checked="true">
        Enabled
      </button>
    ),
    hint: 'HPA target CPU 65%',
  },
  {
    id: 'owner-team',
    label: 'Owner Team',
    value: 'Optical Platform',
    copyValue: 'optical-platform@refractor.dev',
  },
];

describe('PropertyGrid', () => {
  afterEach(() => {
    vi.useRealTimers();
    restoreClipboard();
  });

  it('renders 6 default deployment metadata items inside a semantic <dl>, forwards React 19 ref, and composes theme overrides', () => {
    const ref = createRef<HTMLDivElement>();

    render(
      <PrismThemeProvider
        theme={{
          components: {
            PropertyGrid: {
              className: 'theme-prop-grid',
              style: { letterSpacing: '0.2px' },
            },
          },
        }}
      >
        <PropertyGrid
          ref={ref}
          className="local-prop-grid"
          xstyle={{ '--prism-slab-blur-px': '20px' }}
          style={{ marginTop: '8px' }}
          data-testid="default-grid"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('default-grid');
    expect(ref.current).toBe(root);
    expect(root).toHaveAttribute('role', 'region');
    expect(root).toHaveAttribute('aria-labelledby');
    expect(root).toHaveClass(
      'refractor-property-grid',
      'prism-slab',
      'theme-prop-grid',
      'local-prop-grid'
    );
    expect(root).toHaveStyle({ letterSpacing: '0.2px', marginTop: '8px' });
    expect(root.style.getPropertyValue('--prism-slab-blur-px')).toBe('20px');
    expect(root).toHaveAttribute('data-columns', '1');
    expect(root).toHaveAttribute('data-density', 'comfortable');
    expect(root).toHaveAttribute('data-layout', 'horizontal');

    expect(screen.getByRole('heading', { name: 'Object Metadata Inspector' })).toBeInTheDocument();
    expect(screen.getByTestId('property-grid-count')).toHaveTextContent('6 properties');

    const dl = screen.getByTestId('property-grid-list');
    expect(dl.tagName).toBe('DL');
    expect(dl).toHaveClass('refractor-property-grid__list', 'grid-cols-1');
    expect(dl.style.borderTopColor).toBe('var(--prism-divider)');

    const terms = dl.querySelectorAll('dt');
    const definitions = dl.querySelectorAll('dd');
    expect(terms).toHaveLength(6);
    expect(definitions).toHaveLength(6);

    const deploymentVal = screen.getByTestId('property-grid-value-deployment-id');
    expect(deploymentVal).toHaveAttribute('data-monospace', 'true');
    expect(deploymentVal).toHaveClass('font-mono', 'tabular-nums');
    expect(deploymentVal).toHaveTextContent('dpl_9f4a2c8e7b10');

    expect(screen.getByText('Active · Healthy')).toBeInTheDocument();
    expect(screen.queryByTestId('property-grid-search-input')).toBeNull();
  });

  it('renders a clean role="status" empty state when entries is [] and falls back cleanly on blank title', () => {
    render(
      <PropertyGrid
        entries={[]}
        title="   "
        aria-label="Empty Inspector"
        data-testid="empty-grid"
      />
    );

    const root = screen.getByTestId('empty-grid');
    expect(root).toHaveAttribute('data-empty', 'true');
    expect(root).toHaveAttribute('aria-label', 'Empty Inspector');
    expect(root).not.toHaveAttribute('aria-labelledby');
    expect(screen.getByRole('heading', { name: 'Object Metadata Inspector' })).toBeInTheDocument();
    expect(screen.getByTestId('property-grid-count')).toHaveTextContent('0 properties');

    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('data-testid', 'property-grid-empty');
    expect(status).toHaveTextContent('No properties available');
    expect(screen.queryByTestId('property-grid-list')).toBeNull();
  });

  it('supports 2-column responsive grid, spanFull rows, compact density, stacked layout, and arbitrary ReactNode controls', () => {
    render(
      <PropertyGrid
        title="Edge Gateway Inspector"
        entries={CUSTOM_ENTRIES}
        columns={2}
        density="compact"
        layout="stacked"
        data-testid="custom-grid"
      />
    );

    const root = screen.getByTestId('custom-grid');
    expect(root).toHaveAttribute('data-columns', '2');
    expect(root).toHaveAttribute('data-density', 'compact');
    expect(root).toHaveAttribute('data-layout', 'stacked');
    expect(root).toHaveClass('p-3.5');

    const dl = screen.getByTestId('property-grid-list');
    expect(dl).toHaveClass('grid-cols-1', 'sm:grid-cols-2');

    const spanRow = screen.getByTestId('property-grid-row-service-url');
    expect(spanRow).toHaveAttribute('data-span-full', 'true');
    expect(spanRow).toHaveClass('sm:col-span-2', 'flex-col', 'py-2');
    expect(spanRow.style.borderBottomColor).toBe('var(--prism-divider)');

    const normalRow = screen.getByTestId('property-grid-row-auto-scale');
    expect(normalRow).not.toHaveAttribute('data-span-full');
    expect(normalRow).not.toHaveClass('sm:col-span-2');

    expect(screen.getByRole('link', { name: 'https://edge.refractor.dev' })).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: 'Enabled' })).toBeInTheDocument();
    expect(screen.getByTestId('property-grid-hint-service-url')).toHaveTextContent(
      'Primary edge ingress URI'
    );
    expect(screen.queryByTestId('property-grid-copy-auto-scale')).toBeNull();
  });

  it('normalizes duplicate IDs, blank IDs/labels, empty copyValue, and singular property count', () => {
    const edgeEntries: ReadonlyArray<PropertyGridEntry> = [
      { id: 'dup', label: 'First', value: 'A', copyValue: '' },
      { id: 'dup', label: '   ', value: 'B' },
      { id: '   ', label: 'Blank ID', value: 'C' },
    ];

    const { rerender } = render(<PropertyGrid entries={edgeEntries} />);
    expect(screen.getByTestId('property-grid-row-dup')).toBeInTheDocument();
    expect(screen.getByTestId('property-grid-row-dup-2')).toBeInTheDocument();
    expect(screen.getByTestId('property-grid-row-entry-3')).toBeInTheDocument();
    expect(screen.queryByTestId('property-grid-copy-dup')).toBeNull();

    // Singular count with 1 item
    rerender(<PropertyGrid entries={[{ id: 'only', label: 'Region', value: 'eu-west-1' }]} />);
    expect(screen.getByTestId('property-grid-count')).toHaveTextContent('1 property');
  });

  it('filters entries live by label and hint, supports IME-safe Escape clear, no-matches status, and toggling searchable', () => {
    const { rerender } = render(
      <PropertyGrid
        title="Release Metadata"
        entries={CUSTOM_ENTRIES}
        searchable
        data-testid="search-grid"
      />
    );

    const searchInput = screen.getByRole('searchbox', {
      name: 'Filter Release Metadata properties',
    });

    // Escape on empty query is a no-op
    fireEvent.keyDown(searchInput, { key: 'Escape' });
    expect(screen.getByTestId('property-grid-count')).toHaveTextContent('3 properties');

    // Filter by hint text (case-insensitive)
    fireEvent.change(searchInput, { target: { value: 'HPA target' } });
    expect(screen.getByTestId('search-grid')).toHaveAttribute('data-filtered', 'true');
    expect(screen.getByTestId('property-grid-count')).toHaveTextContent('1 / 3 properties');
    expect(screen.getByTestId('property-grid-row-auto-scale')).toBeInTheDocument();
    expect(screen.queryByTestId('property-grid-row-service-url')).toBeNull();

    // IME composing Escape does not clear the query
    fireEvent.keyDown(searchInput, { key: 'Escape', isComposing: true });
    expect(searchInput).toHaveValue('HPA target');

    // Non-Escape key does not clear the query
    fireEvent.keyDown(searchInput, { key: 'Enter' });
    expect(searchInput).toHaveValue('HPA target');

    // Normal Escape clears the filter
    fireEvent.keyDown(searchInput, { key: 'Escape' });
    expect(searchInput).toHaveValue('');
    expect(screen.getByTestId('property-grid-count')).toHaveTextContent('3 properties');

    // Filter by label text and clear with inline X button
    fireEvent.change(searchInput, { target: { value: 'owner' } });
    expect(screen.getByTestId('property-grid-row-owner-team')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('property-grid-clear-search'));
    expect(searchInput).toHaveValue('');

    // Non-matching query displays role="status" no-matches panel with reset button
    fireEvent.change(searchInput, { target: { value: 'nonexistent-key' } });
    const noMatches = screen.getByRole('status');
    expect(noMatches).toHaveAttribute('data-testid', 'property-grid-no-matches');
    expect(noMatches).toHaveTextContent('No matching properties');
    fireEvent.click(screen.getByTestId('property-grid-reset-filter'));
    expect(searchInput).toHaveValue('');
    expect(screen.getByTestId('property-grid-list')).toBeInTheDocument();

    // Disabling searchable restores all entries even if query was non-empty
    fireEvent.change(searchInput, { target: { value: 'owner' } });
    expect(screen.getByTestId('property-grid-count')).toHaveTextContent('1 / 3 properties');
    rerender(
      <PropertyGrid
        title="Release Metadata"
        entries={CUSTOM_ENTRIES}
        searchable={false}
        data-testid="search-grid"
      />
    );
    expect(screen.queryByTestId('property-grid-search-input')).toBeNull();
    expect(screen.getByTestId('property-grid-count')).toHaveTextContent('3 properties');

    // Singular count with active filter
    rerender(
      <PropertyGrid
        title="Single"
        entries={[{ id: 'solo', label: 'Cluster', value: 'prism-01' }]}
        searchable
      />
    );
    fireEvent.change(screen.getByTestId('property-grid-search-input'), {
      target: { value: 'clust' },
    });
    expect(screen.getByTestId('property-grid-count')).toHaveTextContent('1 / 1 property');
  });

  it('copies entry value with transient 1600ms emerald confirmation, supports IME-safe keyboard copy, and cleans up timers on unmount', () => {
    vi.useFakeTimers();
    const writeText = vi.fn(() => Promise.resolve());
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });

    const onCopyEntry = vi.fn();
    const { unmount } = render(
      <PropertyGrid entries={CUSTOM_ENTRIES} onCopyEntry={onCopyEntry} />
    );

    const urlCopyBtn = screen.getByTestId('property-grid-copy-service-url');
    const ownerCopyBtn = screen.getByTestId('property-grid-copy-owner-team');

    // Click copy
    fireEvent.click(urlCopyBtn);
    expect(writeText).toHaveBeenCalledWith('https://edge.refractor.dev');
    expect(onCopyEntry).toHaveBeenCalledWith(CUSTOM_ENTRIES[0], 'https://edge.refractor.dev');
    expect(urlCopyBtn).toHaveClass('prism-emerald');
    expect(urlCopyBtn).toHaveAttribute('data-copied', 'true');
    expect(urlCopyBtn).toHaveAttribute('aria-label', 'Copied Service Endpoint');
    expect(screen.getByRole('status')).toHaveTextContent(
      'Copied Service Endpoint to clipboard.'
    );

    // Still active at 1000ms
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(urlCopyBtn).toHaveAttribute('data-copied', 'true');

    // Resets after 1600ms total
    act(() => {
      vi.advanceTimersByTime(600);
    });
    expect(urlCopyBtn).not.toHaveAttribute('data-copied');
    expect(urlCopyBtn).toHaveClass('prism-crystal');

    // IME composing Enter is ignored
    fireEvent.keyDown(ownerCopyBtn, { key: 'Enter', isComposing: true });
    expect(onCopyEntry).toHaveBeenCalledTimes(1);

    // Unrelated key is ignored
    fireEvent.keyDown(ownerCopyBtn, { key: 'Tab' });
    expect(onCopyEntry).toHaveBeenCalledTimes(1);

    // Space key activates copy, then rapid Enter copy on first entry replaces active timer
    fireEvent.keyDown(ownerCopyBtn, { key: ' ' });
    expect(onCopyEntry).toHaveBeenLastCalledWith(
      CUSTOM_ENTRIES[2],
      'optical-platform@refractor.dev'
    );
    expect(ownerCopyBtn).toHaveAttribute('data-copied', 'true');

    fireEvent.keyDown(urlCopyBtn, { key: 'Enter' });
    expect(urlCopyBtn).toHaveAttribute('data-copied', 'true');
    expect(ownerCopyBtn).not.toHaveAttribute('data-copied');

    // Unmount while timer is pending cleans up without error
    unmount();
    act(() => {
      vi.advanceTimersByTime(2000);
    });
  });

  it('gracefully handles missing, rejecting, and throwing navigator.clipboard APIs', async () => {
    const onCopyEntry = vi.fn();

    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: undefined,
    });
    render(<PropertyGrid entries={CUSTOM_ENTRIES} onCopyEntry={onCopyEntry} />);
    const copyBtn = screen.getByTestId('property-grid-copy-service-url');

    fireEvent.click(copyBtn);
    expect(onCopyEntry).toHaveBeenCalledTimes(1);
    expect(copyBtn).toHaveAttribute('data-copied', 'true');

    const rejectingWrite = vi.fn(() => Promise.reject(new Error('Clipboard blocked')));
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: rejectingWrite },
    });
    fireEvent.click(copyBtn);
    expect(rejectingWrite).toHaveBeenCalledWith('https://edge.refractor.dev');
    await Promise.resolve();

    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      get() {
        throw new Error('Insecure context');
      },
    });
    fireEvent.click(copyBtn);
    expect(onCopyEntry).toHaveBeenCalledTimes(3);
  });

  it('renders XSS payloads and prototype-pollution IDs safely as inert text and exports cleanly via barrel index', () => {
    const xss = '<script>window.__propGridXss=1</script><img src=x onerror=alert(1)>';
    const densityMapCheck: PropertyGridDensityMap = { compact: true, comfortable: true };
    expect(densityMapCheck.compact).toBe(true);

    const adversarialEntries: ReadonlyArray<PropertyGridEntry> = [
      {
        id: '__proto__',
        label: xss,
        value: xss,
        hint: xss,
        copyValue: xss,
      },
      {
        id: 'constructor',
        label: 'Constructor Safe',
        value: 'Verified',
      },
    ];

    render(
      <BarrelPropertyGrid
        title={xss}
        entries={adversarialEntries}
        searchable
        data-testid="adversarial-grid"
      />
    );

    expect(screen.getByTestId('property-grid-value-__proto__')).toHaveTextContent(xss);
    expect(screen.getByTestId('property-grid-row-constructor')).toBeInTheDocument();
    expect(document.querySelector('script')).toBeNull();
    expect(document.querySelector('img')).toBeNull();
  });
});
