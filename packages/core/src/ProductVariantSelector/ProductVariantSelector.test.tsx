import { createRef, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import {
  ProductVariantSelector,
  type VariantGroup,
  type VariantSwatchTone,
} from './index';

const SAFE_DATA_PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

const PRODUCT_GROUPS: readonly VariantGroup[] = [
  {
    id: 'finish',
    label: 'Finish',
    options: [
      {
        id: 'unavailable-finish',
        label: 'Sold Out Cobalt',
        kind: 'color',
        swatchTone: 'cobalt',
        available: false,
      },
      {
        id: 'amber',
        label: 'Solar Amber',
        kind: 'color',
        swatchTone: 'primary',
        previewImageSrc: 'https://cdn.example.com/prism-amber.png',
      },
      {
        id: 'ice',
        label: 'Glacier Ice',
        kind: 'color',
        swatchTone: 'secondary',
        priceDelta: 10,
        previewImageSrc: SAFE_DATA_PNG,
      },
      {
        id: 'emerald',
        label: 'Emerald Tide',
        kind: 'color',
        swatchTone: 'emerald',
        priceDelta: 15,
      },
      {
        id: 'obsidian',
        label: 'Obsidian Matte',
        kind: 'color',
        swatchTone: 'obsidian',
        priceDelta: -5,
      },
      {
        id: 'alabaster',
        label: 'Alabaster Pearl',
        kind: 'color',
        swatchTone: 'alabaster',
      },
      {
        id: 'default-tone',
        label: 'Default Prism',
        kind: 'color',
      },
    ],
  },
  {
    id: 'size',
    label: 'Size',
    options: [
      { id: 'sm', label: 'Small', kind: 'size', priceDelta: 0 },
      { id: 'md', label: 'Medium', kind: 'size', priceDelta: 20 },
      { id: 'xl', label: 'XL', kind: 'size', available: false, priceDelta: 35 },
    ],
  },
  {
    id: 'material',
    label: 'Material',
    options: [
      { id: 'glass', label: 'Borosilicate', kind: 'material' },
      { id: 'titanium', label: 'Brushed Titanium', kind: 'material', priceDelta: 45.5 },
    ],
  },
];

describe('ProductVariantSelector', () => {
  it('defaults each group to first available option, maps all 6 swatch tokens, computes tabular total, and forwards ref/theme overrides', () => {
    const ref = createRef<HTMLDivElement>();

    render(
      <PrismThemeProvider
        theme={{
          components: {
            ProductVariantSelector: {
              className: 'theme-variant-selector',
              style: { maxWidth: '560px' },
            },
          },
        }}
      >
        <ProductVariantSelector
          ref={ref}
          groups={PRODUCT_GROUPS}
          className="custom-variant"
          xstyle={{ '--prism-blur-px': '22px' }}
          data-testid="variant-root"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('variant-root');
    expect(ref.current).toBe(root);
    expect(root).toHaveClass(
      'refractor-product-variant-selector',
      'prism-slab',
      'theme-variant-selector',
      'custom-variant'
    );
    expect(root).toHaveStyle({ maxWidth: '560px' });
    expect(root).toHaveAttribute('data-available', 'true');
    expect(root).not.toHaveAttribute('data-empty');

    // First group skipped unavailable-finish and selected 'amber'
    expect(screen.getByTestId('variant-option-finish-amber')).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByTestId('variant-option-finish-unavailable-finish')).toBeDisabled();
    expect(screen.getByTestId('variant-option-finish-unavailable-finish')).toHaveClass(
      'disabled:cursor-not-allowed',
      'line-through'
    );

    // Verify all 6 semantic swatch tones map purely to --prism-* CSS custom properties
    const expectedTokens: ReadonlyArray<readonly [string, VariantSwatchTone, string]> = [
      ['amber', 'primary', 'var(--prism-primary-main)'],
      ['ice', 'secondary', 'var(--prism-secondary-main)'],
      ['emerald', 'emerald', 'var(--prism-success-main)'],
      ['unavailable-finish', 'cobalt', 'var(--prism-info-main)'],
      ['obsidian', 'obsidian', 'var(--prism-text-primary)'],
      ['alabaster', 'alabaster', 'var(--prism-bg-start)'],
      ['default-tone', 'primary', 'var(--prism-primary-main)'],
    ];

    for (const [id, tone, token] of expectedTokens) {
      const btn = screen.getByTestId(`variant-option-finish-${id}`);
      expect(btn).toHaveAttribute('data-swatch-tone', tone);
      const orb = screen.getByTestId(`variant-swatch-orb-finish-${id}`);
      expect(orb.style.backgroundColor).toBe(token);
    }

    // Default basePrice is 129, initial deltas are 0
    expect(screen.getByTestId('variant-total-price')).toHaveTextContent('$129');
    expect(screen.getByTestId('variant-selection-summary')).toHaveTextContent(
      'Solar Amber · Small · Borosilicate'
    );

    const badge = screen.getByTestId('variant-availability-badge');
    expect(badge).toHaveTextContent('In stock');
    expect(badge).toHaveClass('prism-emerald');

    const img = screen.getByTestId('variant-preview-image');
    expect(img).toHaveAttribute('src', 'https://cdn.example.com/prism-amber.png');
    expect(img).toHaveAttribute('alt', 'Solar Amber preview');

    // Size & material pills active/inactive classes and disabled strikethrough
    expect(screen.getByTestId('variant-option-size-sm')).toHaveClass('prism-btn-primary');
    expect(screen.getByTestId('variant-option-size-md')).toHaveClass('prism-crystal');
    expect(screen.getByTestId('variant-option-size-md')).toHaveTextContent('Medium(+$20)');
    expect(screen.getByTestId('variant-option-size-xl')).toBeDisabled();
    expect(screen.getByTestId('variant-option-size-xl')).toHaveClass(
      'line-through',
      'disabled:cursor-not-allowed'
    );
  });

  it('updates live total, summary, preview thumbnail, and emits clean selection map in uncontrolled mode', () => {
    const onChange = vi.fn();

    render(
      <ProductVariantSelector
        groups={PRODUCT_GROUPS}
        basePrice={100}
        currencySymbol="€"
        defaultSelected={{ finish: 'nonexistent', size: 'md' }}
        onChange={onChange}
      />
    );

    // Invalid finish ID fell back to 'amber'; size defaulted to 'md' (+20)
    expect(screen.getByTestId('variant-total-price')).toHaveTextContent('€120');

    // Select Glacier Ice (+10, raster data URI preview)
    fireEvent.click(screen.getByTestId('variant-option-finish-ice'));
    expect(onChange).toHaveBeenLastCalledWith({
      finish: 'ice',
      size: 'md',
      material: 'glass',
    });
    expect(screen.getByTestId('variant-total-price')).toHaveTextContent('€130');
    expect(screen.getByTestId('variant-preview-image')).toHaveAttribute('src', SAFE_DATA_PNG);

    // Select Brushed Titanium (+45.50)
    fireEvent.click(screen.getByTestId('variant-option-material-titanium'));
    expect(onChange).toHaveBeenLastCalledWith({
      finish: 'ice',
      size: 'md',
      material: 'titanium',
    });
    expect(screen.getByTestId('variant-total-price')).toHaveTextContent('€175.50');
    expect(screen.getByTestId('variant-selection-summary')).toHaveTextContent(
      'Glacier Ice · Medium · Brushed Titanium'
    );

    // Select Alabaster (dark check icon contrast branch, no previewImageSrc)
    fireEvent.click(screen.getByTestId('variant-option-finish-alabaster'));
    expect(screen.getByTestId('variant-total-price')).toHaveTextContent('€165.50');
    expect(screen.queryByTestId('variant-preview-image')).not.toBeInTheDocument();

    // Select Obsidian (-5 negative price delta)
    fireEvent.click(screen.getByTestId('variant-option-finish-obsidian'));
    expect(screen.getByTestId('variant-total-price')).toHaveTextContent('€160.50');

    // Clicking disabled option does not invoke onChange again
    const callCount = onChange.mock.calls.length;
    fireEvent.click(screen.getByTestId('variant-option-size-xl'));
    expect(onChange).toHaveBeenCalledTimes(callCount);
  });

  it('supports controlled selected state and shows Out of stock when configuration is unavailable', () => {
    function ControlledHarness() {
      const [selected, setSelected] = useState<Record<string, string>>({
        finish: 'unavailable-finish',
        size: 'sm',
        material: 'glass',
      });
      return (
        <div>
          <button
            type="button"
            onClick={() =>
              setSelected({ finish: 'emerald', size: 'md', material: 'glass' })
            }
          >
            Pick In-Stock
          </button>
          <ProductVariantSelector
            groups={PRODUCT_GROUPS}
            selected={selected}
            onChange={setSelected}
            data-testid="controlled-selector"
          />
        </div>
      );
    }

    render(<ControlledHarness />);

    expect(screen.getByTestId('controlled-selector')).not.toHaveAttribute('data-available');
    const badge = screen.getByTestId('variant-availability-badge');
    expect(badge).toHaveTextContent('Out of stock');
    expect(badge).toHaveAttribute('data-available', 'false');

    fireEvent.click(screen.getByRole('button', { name: 'Pick In-Stock' }));
    expect(screen.getByTestId('variant-availability-badge')).toHaveTextContent('In stock');
    expect(screen.getByTestId('variant-total-price')).toHaveTextContent('$164');

    // Clicking an available option delegates to parent onChange in controlled mode
    fireEvent.click(screen.getByTestId('variant-option-size-sm'));
    expect(screen.getByTestId('variant-total-price')).toHaveTextContent('$144');
  });

  it('handles empty groups, groups where every option is unavailable, and non-finite/negative prices (negative tests)', () => {
    const { rerender } = render(
      <ProductVariantSelector groups={[]} data-testid="empty-variants" />
    );

    expect(screen.getByTestId('empty-variants')).toHaveAttribute('data-empty', 'true');
    expect(screen.getByTestId('variant-empty-state')).toHaveTextContent(
      'No product variants available.'
    );

    const soldOutGroups: readonly VariantGroup[] = [
      {
        id: 'edition',
        label: 'Edition',
        options: [
          {
            id: 'ltd',
            label: 'Limited Run',
            kind: 'material',
            available: false,
            priceDelta: Number.NaN,
          },
        ],
      },
    ];

    rerender(
      <ProductVariantSelector
        groups={soldOutGroups}
        basePrice={Number.NaN}
        data-testid="sold-out-variants"
      />
    );

    expect(screen.getByTestId('variant-total-price')).toHaveTextContent('$0');
    expect(screen.getByTestId('variant-selection-summary')).toHaveTextContent(
      'No configuration selected'
    );
    expect(screen.getByTestId('variant-group-selected-edition')).toHaveTextContent('Unavailable');
    expect(screen.getByTestId('variant-availability-badge')).toHaveTextContent('Out of stock');

    // Negative delta that drops below basePrice clamps total to $0
    rerender(
      <ProductVariantSelector
        groups={[
          {
            id: 'discount',
            label: 'Tier',
            options: [{ id: 'promo', label: 'Promo', kind: 'size', priceDelta: -500 }],
          },
        ]}
        basePrice={100}
      />
    );
    expect(screen.getByTestId('variant-total-price')).toHaveTextContent('$0');
    expect(screen.getByTestId('variant-option-discount-promo')).toHaveTextContent('Promo(-$500)');
  });

  it('blocks malicious previewImageSrc URLs, renders XSS payloads as literal text, and stays immune to prototype-polluting keys', () => {
    const xssPayload = '<script>window.__variantXss=1</script><img src=x onerror=alert(1)>';
    const onChange = vi.fn();

    const unsafeDefault: Record<string, string> = {};
    Object.defineProperty(unsafeDefault, 'constructor', {
      value: 'polluted',
      enumerable: true,
    });
    unsafeDefault['safe-group'] = 'opt-a';

    const adversarialGroups: readonly VariantGroup[] = [
      {
        id: '__proto__',
        label: xssPayload,
        options: [
          {
            id: 'proto-opt-1',
            label: 'Proto One',
            kind: 'size',
            previewImageSrc: 'javascript:alert(1)',
          },
          {
            id: 'proto-opt-2',
            label: 'Proto Two',
            kind: 'size',
            previewImageSrc: 'data:image/svg+xml;base64,PHN2Zy8+',
          },
        ],
      },
      {
        id: 'safe-group',
        label: 'Safe Group',
        options: [
          {
            id: 'opt-a',
            label: xssPayload,
            kind: 'material',
            previewImageSrc: 'data:text/html;base64,PHNjcmlwdD48L3NjcmlwdD4=',
          },
          {
            id: 'opt-b',
            label: 'Clean Option',
            kind: 'material',
            previewImageSrc: '/images/clean-preview.webp',
          },
        ],
      },
    ];

    render(
      <ProductVariantSelector
        groups={adversarialGroups}
        defaultSelected={unsafeDefault}
        onChange={onChange}
      />
    );

    expect(document.querySelector('script')).toBeNull();
    // All unsafe preview URLs (javascript:, data:image/svg+xml, data:text/html) rejected
    expect(screen.queryByTestId('variant-preview-image')).not.toBeInTheDocument();
    expect(screen.getAllByText(xssPayload).length).toBeGreaterThanOrEqual(2);

    // Clicking option in safe-group emits clean object without __proto__/constructor keys
    fireEvent.click(screen.getByTestId('variant-option-safe-group-opt-b'));
    expect(onChange).toHaveBeenCalledTimes(1);
    const firstCall = onChange.mock.calls[0];
    expect(firstCall).toBeDefined();
    const emitted = (firstCall?.[0] ?? {}) as Record<string, string>;
    expect(emitted).toEqual({ 'safe-group': 'opt-b' });
    expect(Object.prototype.hasOwnProperty.call(emitted, '__proto__')).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(emitted, 'constructor')).toBe(false);
    expect(({} as Record<string, string>)['__proto__']).not.toBe('proto-opt-1');

    // Relative preview URL is safely accepted
    expect(screen.getByTestId('variant-preview-image')).toHaveAttribute(
      'src',
      '/images/clean-preview.webp'
    );
  });
});
