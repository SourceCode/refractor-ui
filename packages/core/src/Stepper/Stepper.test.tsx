import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import { Stepper } from './Stepper';

const steps = [
  { id: 'setup', title: 'Setup', subtitle: 'Workspace details' },
  { id: 'optics', title: 'Optics', subtitle: 'Theme refraction' },
  { id: 'ship', title: 'Ship' },
];

describe('Stepper', () => {
  it('renders completed, current, and upcoming steps with click callback and ref/className passthrough', () => {
    const ref = createRef<HTMLOListElement>();
    const onStepClick = vi.fn();

    render(
      <Stepper
        ref={ref}
        steps={steps}
        activeStepIndex={1}
        onStepClick={onStepClick}
        className="custom-stepper"
        data-testid="stepper"
      />
    );

    const list = screen.getByTestId('stepper');
    expect(ref.current).toBe(list);
    expect(list).toHaveClass('refractor-stepper', 'custom-stepper');
    expect(list).toHaveAttribute('data-active-step', '1');
    expect(list).toHaveAttribute('data-total-steps', '3');

    const step1 = screen.getByRole('button', { name: 'Step 1: Setup' });
    const step2 = screen.getByRole('button', { name: 'Step 2: Optics' });
    const step3 = screen.getByRole('button', { name: 'Step 3: Ship' });

    expect(step1).toHaveClass('prism-emerald');
    expect(step2).toHaveClass('prism-btn-primary');
    expect(step2).toHaveAttribute('aria-current', 'step');
    expect(step3).toHaveClass('prism-crystal');
    expect(screen.getByText('Workspace details')).toBeInTheDocument();

    fireEvent.click(step3);
    expect(onStepClick).toHaveBeenCalledWith(2);
  });

  it('works cleanly without onStepClick and applies theme overrides', () => {
    render(
      <PrismThemeProvider
        theme={{
          components: { Stepper: { className: 'theme-stepper', style: { maxWidth: '640px' } } },
        }}
      >
        <Stepper steps={steps} activeStepIndex={0} className="local-stepper" />
      </PrismThemeProvider>
    );

    const list = screen.getByRole('list', { name: 'Progress steps' });
    expect(list).toHaveClass('refractor-stepper', 'theme-stepper', 'local-stepper');
    expect(list).toHaveStyle({ maxWidth: '640px' });

    expect(() => fireEvent.click(screen.getByRole('button', { name: 'Step 1: Setup' }))).not.toThrow();
  });

  it('clamps out-of-range activeStepIndex, handles empty steps, and escapes XSS labels (adversarial)', () => {
    const { rerender, container } = render(
      <Stepper steps={steps} activeStepIndex={-5} data-testid="adv-stepper" />
    );
    expect(screen.getByTestId('adv-stepper')).toHaveAttribute('data-active-step', '0');
    expect(screen.getByRole('button', { name: 'Step 1: Setup' })).toHaveAttribute('aria-current', 'step');

    rerender(<Stepper steps={steps} activeStepIndex={99} data-testid="adv-stepper" />);
    expect(screen.getByTestId('adv-stepper')).toHaveAttribute('data-active-step', '3');
    const items = container.querySelectorAll('li');
    items.forEach((li) => expect(li).toHaveAttribute('data-status', 'completed'));

    rerender(<Stepper steps={steps} activeStepIndex={Number.NaN} data-testid="adv-stepper" />);
    expect(screen.getByTestId('adv-stepper')).toHaveAttribute('data-active-step', '0');

    rerender(<Stepper steps={[]} activeStepIndex={0} data-testid="adv-stepper" />);
    expect(container.querySelectorAll('li')).toHaveLength(0);

    const payload = '<script>window.__xss=1</script><img src=x onerror=alert(1)>';
    rerender(
      <Stepper
        steps={[{ id: 'xss', title: payload, subtitle: payload }]}
        activeStepIndex={0}
      />
    );
    expect(screen.getAllByText(payload)).toHaveLength(2);
    expect(document.querySelector('script')).toBeNull();
  });
});
