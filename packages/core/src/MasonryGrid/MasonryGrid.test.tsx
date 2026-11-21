import { createRef } from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import { MasonryGrid, type MasonryItem } from './MasonryGrid';

interface SpecimenCardItem extends MasonryItem {
  tag: string;
  score: number;
}

describe('MasonryGrid', () => {
  it('renders default optical prism-slab cards, semantic list roles, gridTemplateColumns, and forwards React 19 ref', () => {
    const ref = createRef<HTMLDivElement>();
    const items: MasonryItem[] = [
      {
        id: 'card-1',
        estimatedHeight: 220,
        title: 'Refractive Caustics',
        subtitle: 'Alabaster surface study',
        content: <span data-testid="card-1-body">Dispersion index 1.52</span>,
      },
      {
        id: 'card-2',
        estimatedHeight: 160,
        title: 'Specular Edge',
        subtitle: 'Rim sheen calibration',
      },
      {
        id: 'card-3',
      },
    ];

    render(
      <MasonryGrid ref={ref} items={items} className="custom-masonry" data-testid="masonry" />
    );

    const grid = screen.getByTestId('masonry');
    expect(ref.current).toBe(grid);
    expect(grid).toHaveAttribute('role', 'list');
    expect(grid).toHaveAttribute('aria-label', 'Masonry grid');
    expect(grid).toHaveClass('refractor-masonry-grid', 'custom-masonry');
    expect(grid).toHaveAttribute('data-columns', '3');
    expect(grid).toHaveAttribute('data-gap', '16');
    expect(grid).not.toHaveAttribute('data-empty');
    expect(grid).toHaveStyle({
      gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
      gap: '16px',
    });

    const listItems = screen.getAllByRole('listitem');
    expect(listItems).toHaveLength(3);
    expect(screen.getByText('Refractive Caustics')).toBeInTheDocument();
    expect(screen.getByText('Alabaster surface study')).toBeInTheDocument();
    expect(screen.getByTestId('card-1-body')).toBeInTheDocument();
    expect(screen.getByText('Specular Edge')).toBeInTheDocument();
    expect(grid.querySelectorAll('article.prism-slab')).toHaveLength(3);
  });

  it('packs variable-height cards via shortest-column greedy brickwork distribution', () => {
    const items: MasonryItem[] = [
      { id: 'tall', estimatedHeight: 360, title: 'Tall Card' },
      { id: 'short-1', estimatedHeight: 100, title: 'Short 1' },
      { id: 'short-2', estimatedHeight: 100, title: 'Short 2' },
      { id: 'short-3', estimatedHeight: 100, title: 'Short 3' },
      { id: 'balanced', estimatedHeight: 140, title: 'Balanced Next' },
    ];

    const { container } = render(<MasonryGrid items={items} columns={2} gapPx={16} />);

    const col0 = container.querySelector('[data-masonry-column="0"]') as HTMLElement;
    const col1 = container.querySelector('[data-masonry-column="1"]') as HTMLElement;
    expect(col0).not.toBeNull();
    expect(col1).not.toBeNull();

    // tall (360+16=376) -> col0
    // short-1 (100+16=116) -> col1
    // short-2 (116+116=232) -> col1
    // short-3 (232+116=348) -> col1
    // balanced -> col1 is still shorter (348 < 376), so col1 gets balanced!
    expect(within(col0).getByText('Tall Card')).toBeInTheDocument();
    expect(within(col0).getAllByRole('listitem')).toHaveLength(1);
    expect(within(col1).getByText('Short 1')).toBeInTheDocument();
    expect(within(col1).getByText('Short 2')).toBeInTheDocument();
    expect(within(col1).getByText('Short 3')).toBeInTheDocument();
    expect(within(col1).getByText('Balanced Next')).toBeInTheDocument();
    expect(within(col1).getAllByRole('listitem')).toHaveLength(4);
  });

  it('supports strongly typed generic items and custom renderItem with original indices', () => {
    const specimens: SpecimenCardItem[] = [
      { id: 's1', estimatedHeight: 280, tag: 'Optics', score: 98 },
      { id: 's2', estimatedHeight: 120, tag: 'Tokens', score: 95 },
      { id: 's3', estimatedHeight: 120, tag: 'A11y', score: 100 },
    ];

    render(
      <MasonryGrid<SpecimenCardItem>
        items={specimens}
        columns={2}
        gapPx={20}
        aria-label="Specimen gallery"
        renderItem={(item, idx) => (
          <div data-testid={`custom-${item.id}`}>
            #{idx}: {item.tag} ({item.score})
          </div>
        )}
      />
    );

    const grid = screen.getByRole('list', { name: 'Specimen gallery' });
    expect(grid).toHaveStyle({
      gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
      gap: '20px',
    });
    expect(screen.getByTestId('custom-s1')).toHaveTextContent('#0: Optics (98)');
    expect(screen.getByTestId('custom-s2')).toHaveTextContent('#1: Tokens (95)');
    expect(screen.getByTestId('custom-s3')).toHaveTextContent('#2: A11y (100)');
  });

  it('omits fallback aria-label when aria-labelledby is supplied and composes theme overrides', () => {
    render(
      <PrismThemeProvider
        theme={{
          components: {
            MasonryGrid: {
              className: 'theme-masonry',
              style: { padding: '12px' },
            },
          },
        }}
      >
        <h2 id="gallery-heading">Optical Gallery</h2>
        <MasonryGrid
          items={[{ id: 'a', title: 'Alpha' }]}
          aria-labelledby="gallery-heading"
          className="local-masonry"
          xstyle={{ '--prism-blur-px': '24px' }}
          style={{ marginTop: '8px' }}
          data-testid="themed-grid"
        />
      </PrismThemeProvider>
    );

    const grid = screen.getByTestId('themed-grid');
    expect(grid).toHaveAttribute('aria-labelledby', 'gallery-heading');
    expect(grid).not.toHaveAttribute('aria-label');
    expect(grid).toHaveClass('refractor-masonry-grid', 'theme-masonry', 'local-masonry');
    expect(grid).toHaveStyle({
      gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
      padding: '12px',
      marginTop: '8px',
    });
  });

  it('renders emptyMessage inside a status optical slab when items is empty (negative test)', () => {
    const { rerender } = render(<MasonryGrid items={[]} data-testid="empty-grid" />);

    const grid = screen.getByTestId('empty-grid');
    expect(grid).toHaveAttribute('data-empty', 'true');
    expect(screen.getByRole('status')).toHaveTextContent('No items to display.');
    expect(screen.queryAllByRole('listitem')).toHaveLength(0);

    rerender(<MasonryGrid items={[]} emptyMessage="No optical specimens match your filter." />);
    expect(screen.getByRole('status')).toHaveTextContent('No optical specimens match your filter.');
  });

  it('clamps adversarial columns and gapPx values safely (<= 0, NaN, Infinity, 99)', () => {
    const sample: MasonryItem[] = [
      { id: '1', title: 'One' },
      { id: '2', title: 'Two' },
    ];

    const { rerender } = render(
      <MasonryGrid items={sample} columns={0} gapPx={-24} data-testid="clamped" />
    );
    let grid = screen.getByTestId('clamped');
    expect(grid).toHaveAttribute('data-columns', '1');
    expect(grid).toHaveAttribute('data-gap', '0');
    expect(grid).toHaveStyle({
      gridTemplateColumns: 'repeat(1, minmax(0, 1fr))',
      gap: '0px',
    });

    rerender(<MasonryGrid items={sample} columns={-5} gapPx={120} data-testid="clamped" />);
    grid = screen.getByTestId('clamped');
    expect(grid).toHaveAttribute('data-columns', '1');
    expect(grid).toHaveAttribute('data-gap', '48');

    rerender(<MasonryGrid items={sample} columns={99} gapPx={NaN} data-testid="clamped" />);
    grid = screen.getByTestId('clamped');
    expect(grid).toHaveAttribute('data-columns', '6');
    expect(grid).toHaveAttribute('data-gap', '16');

    rerender(<MasonryGrid items={sample} columns={NaN} gapPx={Infinity} data-testid="clamped" />);
    grid = screen.getByTestId('clamped');
    expect(grid).toHaveAttribute('data-columns', '3');
    expect(grid).toHaveAttribute('data-gap', '16');

    rerender(
      <MasonryGrid items={sample} columns={Infinity} gapPx={-Infinity} data-testid="clamped" />
    );
    grid = screen.getByTestId('clamped');
    expect(grid).toHaveAttribute('data-columns', '3');
    expect(grid).toHaveAttribute('data-gap', '16');
  });

  it('normalizes omitted, negative, zero, NaN, and Infinity estimatedHeight to 160 without stalling lanes', () => {
    const items: MasonryItem[] = [
      { id: 'a', estimatedHeight: undefined, title: 'Omitted' },
      { id: 'b', estimatedHeight: -100, title: 'Negative' },
      { id: 'c', estimatedHeight: 0, title: 'Zero' },
      { id: 'd', estimatedHeight: NaN, title: 'NaN Height' },
      { id: 'e', estimatedHeight: Infinity, title: 'Infinite Height' },
      { id: 'f', estimatedHeight: 160, title: 'Valid 160' },
    ];

    const { container } = render(<MasonryGrid items={items} columns={3} gapPx={16} />);
    const col0 = container.querySelector('[data-masonry-column="0"]') as HTMLElement;
    const col1 = container.querySelector('[data-masonry-column="1"]') as HTMLElement;
    const col2 = container.querySelector('[data-masonry-column="2"]') as HTMLElement;

    // All 6 items normalize to 160px -> evenly split 2 per lane across 3 columns
    expect(within(col0).getAllByRole('listitem')).toHaveLength(2);
    expect(within(col1).getAllByRole('listitem')).toHaveLength(2);
    expect(within(col2).getAllByRole('listitem')).toHaveLength(2);
  });

  it('safely escapes adversarial XSS payloads in titles, subtitles, and emptyMessage', () => {
    const payload = '<script>window.__masonryXss=1</script><img src=x onerror=alert(1)>';
    const { rerender } = render(
      <MasonryGrid
        items={[
          {
            id: 'xss',
            title: payload,
            subtitle: payload,
            content: payload,
          },
        ]}
      />
    );

    expect(document.querySelector('script')).toBeNull();
    expect(screen.getAllByText(payload)).toHaveLength(3);

    rerender(<MasonryGrid items={[]} emptyMessage={payload} />);
    expect(document.querySelector('script')).toBeNull();
    expect(screen.getByRole('status')).toHaveTextContent(payload);
  });
});
