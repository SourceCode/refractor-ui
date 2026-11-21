import { createRef, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import {
  RichSelectionCards,
  type RichSelectionCardOption,
} from './index';

const BASE_OPTIONS: RichSelectionCardOption[] = [
  {
    id: 'starter',
    title: 'Starter',
    description: 'Single-region optical edge cluster',
    icon: <span data-testid="icon-starter">S</span>,
  },
  {
    id: 'pro',
    title: 'Pro',
    badge: 'Recommended',
    description: 'Global prism CDN with priority routing',
    icon: <span data-testid="icon-pro">P</span>,
  },
  {
    id: 'enterprise',
    title: 'Enterprise',
  },
];

describe('RichSelectionCards', () => {
  it('renders single-mode radiogroup cards, optical surfaces, theme overrides, and React 19 ref', () => {
    const ref = createRef<HTMLDivElement>();
    const onChange = vi.fn<(ids: string[]) => void>();

    render(
      <PrismThemeProvider
        theme={{
          components: {
            RichSelectionCards: {
              className: 'theme-rich-cards',
              style: { maxWidth: '640px' },
            },
          },
        }}
      >
        <RichSelectionCards
          ref={ref}
          label="Deployment Tier"
          options={BASE_OPTIONS}
          defaultValue={['pro']}
          onChange={onChange}
          className="local-rich-cards"
          xstyle={{ '--prism-blur-px': '20px' }}
          style={{ padding: '4px' }}
          data-testid="rich-root"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('rich-root');
    expect(RichSelectionCards.displayName).toBe('RichSelectionCards');
    expect(ref.current).toBe(root);
    expect(root).toHaveAttribute('role', 'radiogroup');
    expect(root).toHaveAttribute('aria-label', 'Deployment Tier');
    expect(root).toHaveAttribute('data-mode', 'single');
    expect(root).toHaveAttribute('data-columns', '2');
    expect(root).toHaveClass(
      'refractor-rich-selection-cards',
      'sm:grid-cols-2',
      'theme-rich-cards',
      'local-rich-cards'
    );
    expect(root).toHaveStyle({ maxWidth: '640px', padding: '4px' });

    const starterCard = screen.getByRole('radio', { name: /Starter/ });
    const proCard = screen.getByRole('radio', { name: /Pro/ });
    const enterpriseCard = screen.getByRole('radio', { name: /Enterprise/ });

    expect(proCard).toHaveAttribute('aria-checked', 'true');
    expect(proCard).toHaveAttribute('data-selected', 'true');
    expect(proCard).toHaveAttribute('tabindex', '0');
    expect(proCard).toHaveClass('prism-crystal', 'ring-2');

    expect(starterCard).toHaveAttribute('aria-checked', 'false');
    expect(starterCard).toHaveAttribute('tabindex', '-1');
    expect(starterCard).toHaveClass('prism-slab');

    expect(screen.getByTestId('rich-card-icon-pro')).toBeInTheDocument();
    expect(screen.getByTestId('icon-pro')).toBeInTheDocument();
    expect(screen.queryByTestId('rich-card-icon-enterprise')).toBeNull();
    expect(screen.getByText('Recommended')).toBeInTheDocument();
    expect(screen.getByText('Global prism CDN with priority routing')).toBeInTheDocument();

    const proIndicator = screen.getByTestId('rich-card-indicator-pro');
    expect(proIndicator).toHaveClass('prism-emerald', 'rounded-full');
    expect(proIndicator.querySelector('svg')).not.toBeNull();

    const starterIndicator = screen.getByTestId('rich-card-indicator-starter');
    expect(starterIndicator).toHaveClass('prism-well');
    expect(starterIndicator.querySelector('svg')).toBeNull();

    // Selecting Starter updates uncontrolled selection and fires onChange
    fireEvent.click(starterCard);
    expect(onChange).toHaveBeenCalledWith(['starter']);
    expect(starterCard).toHaveAttribute('aria-checked', 'true');
    expect(proCard).toHaveAttribute('aria-checked', 'false');
    expect(enterpriseCard).toHaveAttribute('aria-checked', 'false');
  });

  it('supports single-mode arrow navigation skipping disabled cards, wrapping around, and guarding IME composition', () => {
    const onChange = vi.fn<(ids: string[]) => void>();
    const options: RichSelectionCardOption[] = [
      { id: 'alpha', title: 'Alpha' },
      { id: 'beta', title: 'Beta', disabled: true },
      { id: 'gamma', title: 'Gamma' },
    ];

    render(
      <RichSelectionCards
        options={options}
        onChange={onChange}
        columns={1}
        data-testid="nav-root"
      />
    );

    const root = screen.getByTestId('nav-root');
    expect(root).toHaveAttribute('aria-label', 'Choose an option');
    expect(root).toHaveClass('grid-cols-1');

    const alpha = screen.getByRole('radio', { name: 'Alpha' });
    const beta = screen.getByRole('radio', { name: 'Beta' });
    const gamma = screen.getByRole('radio', { name: 'Gamma' });

    // No selection initially -> first enabled card gets tabIndex=0
    expect(alpha).toHaveAttribute('tabindex', '0');
    expect(beta).toBeDisabled();
    expect(beta).toHaveAttribute('tabindex', '-1');
    expect(gamma).toHaveAttribute('tabindex', '-1');

    // Clicking disabled card is a no-op
    fireEvent.click(beta);
    expect(onChange).not.toHaveBeenCalled();

    // IME composing keyDown is ignored
    fireEvent.keyDown(alpha, { key: 'ArrowRight', isComposing: true });
    expect(onChange).not.toHaveBeenCalled();

    // Unrelated key is ignored
    fireEvent.keyDown(alpha, { key: 'Tab' });
    expect(onChange).not.toHaveBeenCalled();

    // ArrowRight skips disabled beta -> selects and focuses gamma
    fireEvent.keyDown(alpha, { key: 'ArrowRight' });
    expect(onChange).toHaveBeenLastCalledWith(['gamma']);
    expect(document.activeElement).toBe(gamma);

    // ArrowDown wraps from gamma back to alpha
    fireEvent.keyDown(gamma, { key: 'ArrowDown' });
    expect(onChange).toHaveBeenLastCalledWith(['alpha']);
    expect(document.activeElement).toBe(alpha);

    // ArrowLeft wraps backward from alpha to gamma (skipping disabled beta)
    fireEvent.keyDown(alpha, { key: 'ArrowLeft' });
    expect(onChange).toHaveBeenLastCalledWith(['gamma']);
    expect(document.activeElement).toBe(gamma);

    // ArrowUp moves backward from gamma to alpha
    fireEvent.keyDown(gamma, { key: 'ArrowUp' });
    expect(onChange).toHaveBeenLastCalledWith(['alpha']);
    expect(document.activeElement).toBe(alpha);
  });

  it('supports multiple mode with group/checkbox semantics, toggling membership, and 3-column layout', () => {
    const onChange = vi.fn<(ids: string[]) => void>();

    render(
      <RichSelectionCards
        mode="multiple"
        columns={3}
        label="Capabilities"
        options={BASE_OPTIONS}
        defaultValue={['starter']}
        onChange={onChange}
        data-testid="multi-root"
      />
    );

    const root = screen.getByTestId('multi-root');
    expect(root).toHaveAttribute('role', 'group');
    expect(root).toHaveAttribute('data-mode', 'multiple');
    expect(root).toHaveClass('lg:grid-cols-3');

    const starter = screen.getByRole('checkbox', { name: /Starter/ });
    const pro = screen.getByRole('checkbox', { name: /Pro/ });
    const enterprise = screen.getByRole('checkbox', { name: /Enterprise/ });

    expect(starter).toHaveAttribute('aria-checked', 'true');
    expect(pro).toHaveAttribute('aria-checked', 'false');
    expect(screen.getByTestId('rich-card-indicator-starter')).toHaveClass('rounded-md', 'prism-emerald');

    // Arrow key in multiple mode does not hijack selection
    fireEvent.keyDown(starter, { key: 'ArrowRight' });
    expect(onChange).not.toHaveBeenCalled();

    // Add pro and enterprise
    fireEvent.click(pro);
    expect(onChange).toHaveBeenLastCalledWith(['starter', 'pro']);
    expect(pro).toHaveAttribute('aria-checked', 'true');

    fireEvent.click(enterprise);
    expect(onChange).toHaveBeenLastCalledWith(['starter', 'pro', 'enterprise']);

    // Toggle starter off
    fireEvent.click(starter);
    expect(onChange).toHaveBeenLastCalledWith(['pro', 'enterprise']);
    expect(starter).toHaveAttribute('aria-checked', 'false');
    expect(pro).toHaveAttribute('aria-checked', 'true');
  });

  it('supports controlled value updates and enforces single-card visual invariant if multi-ID value is passed in single mode', () => {
    const onChange = vi.fn<(ids: string[]) => void>();

    function ControlledHarness() {
      const [selected, setSelected] = useState<string[]>(['starter', 'pro']);
      return (
        <RichSelectionCards
          mode="single"
          options={BASE_OPTIONS}
          value={selected}
          onChange={(next) => {
            onChange(next);
            setSelected(next);
          }}
        />
      );
    }

    render(<ControlledHarness />);

    const starter = screen.getByRole('radio', { name: /Starter/ });
    const pro = screen.getByRole('radio', { name: /Pro/ });

    // Only the first ID is marked checked in single mode
    expect(starter).toHaveAttribute('aria-checked', 'true');
    expect(pro).toHaveAttribute('aria-checked', 'false');

    fireEvent.click(pro);
    expect(onChange).toHaveBeenCalledWith(['pro']);
    expect(starter).toHaveAttribute('aria-checked', 'false');
    expect(pro).toHaveAttribute('aria-checked', 'true');
  });

  it('blocks all interaction when group is disabled and renders clean empty state when options is empty (negative tests)', () => {
    const onChange = vi.fn<(ids: string[]) => void>();

    const { rerender } = render(
      <RichSelectionCards
        label="Locked Options"
        options={BASE_OPTIONS}
        defaultValue={['starter']}
        disabled
        onChange={onChange}
        data-testid="disabled-root"
      />
    );

    const disabledRoot = screen.getByTestId('disabled-root');
    expect(disabledRoot).toHaveAttribute('aria-disabled', 'true');
    expect(disabledRoot).toHaveAttribute('data-disabled', 'true');

    const starter = screen.getByRole('radio', { name: /Starter/ });
    const pro = screen.getByRole('radio', { name: /Pro/ });
    expect(starter).toBeDisabled();
    expect(pro).toBeDisabled();

    fireEvent.click(pro);
    fireEvent.keyDown(starter, { key: 'ArrowRight' });
    expect(onChange).not.toHaveBeenCalled();

    // Empty options renders clean empty state
    rerender(
      <RichSelectionCards
        label="Empty Options"
        options={[]}
        onChange={onChange}
        data-testid="empty-root"
      />
    );

    const emptyRoot = screen.getByTestId('empty-root');
    expect(emptyRoot).toHaveAttribute('data-empty', 'true');
    expect(screen.getByTestId('rich-selection-cards-empty')).toBeInTheDocument();
    expect(screen.getByText('No options available')).toBeInTheDocument();
    expect(screen.queryByRole('radio')).toBeNull();
  });

  it('safely handles adversarial XSS strings and prototype-polluting option IDs', () => {
    const payload = '<script>window.__xss=1</script><img src=x onerror=alert(1)>';
    const onChange = vi.fn<(ids: string[]) => void>();

    render(
      <RichSelectionCards
        label={payload}
        mode="multiple"
        options={[
          { id: '__proto__', title: payload, description: payload, badge: payload },
          { id: 'constructor', title: 'Constructor Safe' },
        ]}
        onChange={onChange}
      />
    );

    expect(screen.getByRole('group', { name: payload })).toBeInTheDocument();
    expect(screen.getAllByText(payload)).toHaveLength(3);
    expect(document.querySelector('script')).toBeNull();

    const protoCard = screen.getByRole('checkbox', { name: new RegExp(payload.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) });
    fireEvent.click(protoCard);
    expect(onChange).toHaveBeenCalledWith(['__proto__']);
    expect(protoCard).toHaveAttribute('aria-checked', 'true');
  });
});
