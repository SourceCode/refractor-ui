import { createRef } from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import { OpticalDivider } from './index';

describe('OpticalDivider', () => {
  it('renders a default horizontal specular separator with React 19 ref, BaseProps, and theme overrides', () => {
    const ref = createRef<HTMLDivElement>();

    render(
      <PrismThemeProvider
        theme={{
          components: {
            OpticalDivider: {
              className: 'theme-optical-divider',
              style: { opacity: '0.92' },
            },
          },
        }}
      >
        <OpticalDivider
          ref={ref}
          className="local-divider"
          style={{ marginBlock: '12px' }}
          xstyle={{ '--prism-divider': 'var(--prism-secondary-main)' }}
          aria-label="Primary optical boundary"
          data-testid="optical-divider-root"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByRole('separator', { name: 'Primary optical boundary' });
    expect(ref.current).toBe(root);
    expect(root).toBe(screen.getByTestId('optical-divider-root'));
    expect(root).toHaveAttribute('aria-orientation', 'horizontal');
    expect(root).not.toHaveAttribute('aria-hidden');
    expect(root).toHaveAttribute('data-orientation', 'horizontal');
    expect(root).toHaveAttribute('data-variant', 'specular');
    expect(root).toHaveAttribute('data-label-align', 'center');
    expect(root).not.toHaveAttribute('data-has-label');
    expect(root).not.toHaveAttribute('data-has-icon');
    expect(root).not.toHaveAttribute('data-decorative');
    expect(root).toHaveClass(
      'refractor-optical-divider',
      'w-full',
      'max-w-full',
      'min-w-0',
      'flex',
      'items-center',
      'gap-3',
      'theme-optical-divider',
      'local-divider'
    );
    expect(root).toHaveStyle({ opacity: '0.92', marginBlock: '12px' });

    const rails = root.querySelectorAll('.refractor-optical-divider__rail');
    expect(rails).toHaveLength(1);
    const fullRail = rails[0] as HTMLElement;
    expect(fullRail).toHaveAttribute('aria-hidden', 'true');
    expect(fullRail).toHaveAttribute('data-rail', 'full');
    expect(fullRail).toHaveClass('h-px', 'flex-1', 'min-w-0', 'w-full');
    expect(fullRail.style.backgroundImage).toContain('linear-gradient(90deg');
    expect(fullRail.style.backgroundImage).toContain('--prism-divider');
    expect(fullRail.style.backgroundImage).toContain('--prism-primary-main');
    expect(fullRail.style.backgroundImage).toContain('--prism-secondary-main');
    expect(root.querySelector('.refractor-optical-divider__medallion')).toBeNull();
  });

  it('supports seam and dashed variants across horizontal and vertical orientations', () => {
    const { rerender } = render(
      <OpticalDivider variant="seam" data-testid="variant-divider" />
    );

    const root = screen.getByTestId('variant-divider');
    expect(root).toHaveAttribute('data-variant', 'seam');
    let fullRail = root.querySelector('[data-rail="full"]') as HTMLElement;
    expect(fullRail.style.backgroundColor).toBe('var(--prism-divider)');
    expect(fullRail.style.backgroundImage).toBe('');

    rerender(<OpticalDivider variant="dashed" data-testid="variant-divider" />);
    expect(root).toHaveAttribute('data-variant', 'dashed');
    fullRail = root.querySelector('[data-rail="full"]') as HTMLElement;
    expect(fullRail.style.backgroundImage).toContain('repeating-linear-gradient(90deg');
    expect(fullRail.style.backgroundImage).toContain('--prism-divider');

    rerender(
      <OpticalDivider orientation="vertical" variant="dashed" data-testid="variant-divider" />
    );
    expect(root).toHaveAttribute('aria-orientation', 'vertical');
    expect(root).toHaveAttribute('data-orientation', 'vertical');
    expect(root).toHaveClass(
      'inline-flex',
      'flex-col',
      'items-center',
      'self-stretch',
      'min-h-[2rem]',
      'min-w-0',
      'max-w-full',
      'gap-2'
    );
    fullRail = root.querySelector('[data-rail="full"]') as HTMLElement;
    expect(fullRail).toHaveClass('w-px', 'flex-1', 'min-h-[2rem]');
    expect(fullRail.style.backgroundImage).toContain('repeating-linear-gradient(180deg');
  });

  it('renders horizontal label and icon medallions with start, center, and end rail alignments', () => {
    const { rerender } = render(
      <OpticalDivider
        label="  Calibration Phase  "
        icon={<svg data-testid="divider-icon" />}
        labelAlign="start"
        data-testid="aligned-divider"
      />
    );

    const root = screen.getByTestId('aligned-divider');
    expect(root).toHaveAttribute('data-label-align', 'start');
    expect(root).toHaveAttribute('data-has-label', 'true');
    expect(root).toHaveAttribute('data-has-icon', 'true');

    const leadingStart = root.querySelector('[data-rail="leading"]') as HTMLElement;
    const trailingStart = root.querySelector('[data-rail="trailing"]') as HTMLElement;
    expect(leadingStart).toHaveClass('h-px', 'w-6', 'shrink-0');
    expect(trailingStart).toHaveClass('h-px', 'flex-1', 'min-w-[1rem]');
    expect(leadingStart.style.backgroundImage).toContain('linear-gradient(90deg');
    expect(trailingStart.style.backgroundImage).toContain('linear-gradient(90deg');

    const medallion = root.querySelector('.refractor-optical-divider__medallion') as HTMLElement;
    expect(medallion).toHaveClass('prism-crystal', 'rounded-full', 'px-3', 'py-1', 'gap-1.5');

    const iconSlot = root.querySelector('.refractor-optical-divider__icon') as HTMLElement;
    expect(iconSlot).toHaveAttribute('aria-hidden', 'true');
    expect(iconSlot.style.color).toBe('var(--prism-primary-main)');
    expect(screen.getByTestId('divider-icon')).toBeInTheDocument();

    const labelEl = root.querySelector('.refractor-optical-divider__label') as HTMLElement;
    expect(labelEl).toHaveTextContent('Calibration Phase');
    expect(labelEl.style.color).toBe('var(--prism-text-secondary)');

    // Center alignment balances both rails
    rerender(
      <OpticalDivider
        label="Balanced Seam"
        variant="seam"
        labelAlign="center"
        data-testid="aligned-divider"
      />
    );
    expect(root).toHaveAttribute('data-label-align', 'center');
    expect(root.querySelector('[data-rail="leading"]')).toHaveClass('h-px', 'flex-1');
    expect(root.querySelector('[data-rail="trailing"]')).toHaveClass('h-px', 'flex-1');
    expect(root.querySelector('.refractor-optical-divider__icon')).toBeNull();

    // End alignment uses a full leading rail and short trailing rail
    rerender(
      <OpticalDivider
        label="End Alignment"
        labelAlign="end"
        data-testid="aligned-divider"
      />
    );
    expect(root).toHaveAttribute('data-label-align', 'end');
    expect(root.querySelector('[data-rail="leading"]')).toHaveClass('h-px', 'flex-1');
    expect(root.querySelector('[data-rail="trailing"]')).toHaveClass('h-px', 'w-6', 'shrink-0');
  });

  it('renders standalone icon medallion and vertical start/center/end medallion alignments', () => {
    const { rerender } = render(
      <OpticalDivider
        orientation="vertical"
        variant="seam"
        icon={<span data-testid="solo-icon">*</span>}
        labelAlign="start"
        data-testid="vertical-medallion"
      />
    );

    const root = screen.getByTestId('vertical-medallion');
    expect(root).toHaveAttribute('data-has-icon', 'true');
    expect(root).not.toHaveAttribute('data-has-label');

    const medallion = root.querySelector('.refractor-optical-divider__medallion') as HTMLElement;
    expect(medallion).toHaveClass('prism-crystal', 'w-7', 'h-7', 'shrink-0');
    expect(root.querySelector('.refractor-optical-divider__label')).toBeNull();

    const iconSlot = root.querySelector('.refractor-optical-divider__icon') as HTMLElement;
    expect(iconSlot.style.color).toBe('var(--prism-text-secondary)');

    expect(root.querySelector('[data-rail="leading"]')).toHaveClass('w-px', 'h-4', 'shrink-0');
    expect(root.querySelector('[data-rail="trailing"]')).toHaveClass(
      'w-px',
      'flex-1',
      'min-h-[1rem]'
    );

    rerender(
      <OpticalDivider
        orientation="vertical"
        variant="specular"
        label={0}
        labelAlign="center"
        data-testid="vertical-medallion"
      />
    );
    expect(root).toHaveAttribute('data-has-label', 'true');
    expect(root.querySelector('.refractor-optical-divider__label')).toHaveTextContent('0');
    expect(root.querySelector('[data-rail="leading"]')).toHaveClass(
      'w-px',
      'flex-1',
      'min-h-[1rem]'
    );
    expect(root.querySelector('[data-rail="trailing"]')).toHaveClass(
      'w-px',
      'flex-1',
      'min-h-[1rem]'
    );

    rerender(
      <OpticalDivider
        orientation="vertical"
        label="VS"
        labelAlign="end"
        data-testid="vertical-medallion"
      />
    );
    expect(root.querySelector('[data-rail="leading"]')).toHaveClass(
      'w-px',
      'flex-1',
      'min-h-[1rem]'
    );
    expect(root.querySelector('[data-rail="trailing"]')).toHaveClass('w-px', 'h-4', 'shrink-0');
  });

  it('switches to role="none" and aria-hidden="true" without aria-orientation when decorative', () => {
    render(<OpticalDivider decorative data-testid="decorative-divider" />);

    const root = screen.getByTestId('decorative-divider');
    expect(root).toHaveAttribute('role', 'none');
    expect(root).toHaveAttribute('aria-hidden', 'true');
    expect(root).not.toHaveAttribute('aria-orientation');
    expect(root).toHaveAttribute('data-decorative', 'true');
    expect(screen.queryByRole('separator')).toBeNull();
  });

  it('handles blank/boolean/null labels gracefully and neutralizes adversarial XSS payloads as literal text', () => {
    const { rerender } = render(
      <OpticalDivider label="   " icon={false} data-testid="negative-divider" />
    );

    const root = screen.getByTestId('negative-divider');
    expect(root).not.toHaveAttribute('data-has-label');
    expect(root).not.toHaveAttribute('data-has-icon');
    expect(root.querySelector('.refractor-optical-divider__medallion')).toBeNull();
    expect(root.querySelectorAll('[data-rail="full"]')).toHaveLength(1);

    rerender(<OpticalDivider label={null} icon={undefined} data-testid="negative-divider" />);
    expect(root.querySelector('.refractor-optical-divider__medallion')).toBeNull();

    const xssPayload = '<script>window.__dividerXss=1</script><img src=x onerror=alert(1)>';
    rerender(
      <OpticalDivider
        label={xssPayload}
        aria-label={xssPayload}
        data-testid="negative-divider"
      />
    );

    expect(document.querySelector('script')).toBeNull();
    expect(document.querySelector('img')).toBeNull();
    expect(root.querySelector('.refractor-optical-divider__label')).toHaveTextContent(xssPayload);
    expect(root).toHaveAttribute('aria-label', xssPayload);
  });

  it('exposes the canonical displayName', () => {
    expect(OpticalDivider.displayName).toBe('OpticalDivider');
  });
});
