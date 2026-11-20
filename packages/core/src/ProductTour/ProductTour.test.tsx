import { createRef, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { createEvent, fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import { ProductTour, type TourStep } from './index';

const SAMPLE_STEPS: readonly TourStep[] = [
  {
    id: 'step-theme',
    title: 'Customize Optical Theme',
    description: 'Switch between Alabaster, Obsidian, and Emerald Tide presets.',
    badge: 'New in v1.6',
    placement: 'bottom',
  },
  {
    id: 'step-presence',
    title: 'Inspect Live Collaborators',
    description: 'See active teammates and live cursors directly on your canvas.',
    placement: 'right',
  },
  {
    id: 'step-export',
    title: 'Ship Production Tokens',
    description: 'Export CSS custom properties or swizzle any component in seconds.',
    placement: 'center',
    actionLabel: 'Launch Workspace',
  },
];

describe('ProductTour', () => {
  it('returns null when closed or when steps array is empty', () => {
    const { rerender, container } = render(<ProductTour steps={SAMPLE_STEPS} />);
    expect(container.firstChild).toBeNull();

    rerender(<ProductTour steps={[]} open />);
    expect(container.firstChild).toBeNull();

    rerender(<ProductTour steps={SAMPLE_STEPS} open={false} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders overlay coachmark, badge, progress dots, theme overrides, and React 19 ref', () => {
    const ref = createRef<HTMLDivElement>();

    render(
      <PrismThemeProvider
        theme={{
          components: {
            ProductTour: { className: 'theme-tour', style: { zIndex: 70 } },
          },
        }}
      >
        <ProductTour
          ref={ref}
          steps={SAMPLE_STEPS}
          defaultOpen
          className="custom-tour"
          xstyle={{ '--prism-slab-blur-px': '26px' }}
          data-testid="tour-root"
        />
      </PrismThemeProvider>
    );

    const dialog = screen.getByRole('dialog');
    expect(ref.current).toBe(dialog);
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveClass('refractor-product-tour', 'theme-tour', 'custom-tour');
    expect(dialog).toHaveAttribute('data-open', 'true');
    expect(dialog).toHaveAttribute('data-mode', 'overlay');
    expect(dialog).toHaveAttribute('data-step', '1');
    expect(dialog).toHaveAttribute('data-total-steps', '3');
    expect(dialog).toHaveStyle({ zIndex: '70' });

    expect(screen.getByText('New in v1.6')).toBeInTheDocument();
    expect(screen.getByText('1 / 3')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Customize Optical Theme' })).toBeInTheDocument();
    expect(
      screen.getByText('Switch between Alabaster, Obsidian, and Emerald Tide presets.')
    ).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Step 1 of 3: Customize Optical Theme');

    const backBtn = screen.getByRole('button', { name: 'Back' });
    expect(backBtn).toBeDisabled();
    expect(backBtn).toHaveClass('disabled:cursor-not-allowed');
  });

  it('navigates Next, Back, progress dots, and Finish in uncontrolled mode with callbacks', () => {
    const onStepChange = vi.fn();
    const onComplete = vi.fn();
    const onOpenChange = vi.fn();

    render(
      <ProductTour
        steps={SAMPLE_STEPS}
        defaultOpen
        onStepChange={onStepChange}
        onComplete={onComplete}
        onOpenChange={onOpenChange}
      />
    );

    // Next -> step 2 (default Step 2 of 3 badge when custom badge omitted)
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(onStepChange).toHaveBeenLastCalledWith(1, SAMPLE_STEPS[1]);
    expect(screen.getByText('Step 2 of 3')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Inspect Live Collaborators' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Back' })).toBeEnabled();

    // Back -> step 1
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(onStepChange).toHaveBeenLastCalledWith(0, SAMPLE_STEPS[0]);
    expect(screen.getByRole('button', { name: 'Back' })).toBeDisabled();

    // Jump directly to step 3 via progress dot
    const dot3 = screen.getByRole('button', { name: 'Go to step 3: Ship Production Tokens' });
    fireEvent.click(dot3);
    expect(onStepChange).toHaveBeenLastCalledWith(2, SAMPLE_STEPS[2]);
    expect(dot3).toHaveAttribute('aria-current', 'step');

    // Step 3 uses custom actionLabel ('Launch Workspace')
    const finishBtn = screen.getByRole('button', { name: 'Launch Workspace' });
    expect(finishBtn).toHaveClass('prism-btn-primary');
    fireEvent.click(finishBtn);

    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('supports controlled open + stepIndex, custom labels, showProgressDots=false, and inline mode', () => {
    const onComplete = vi.fn();

    function ControlledHarness() {
      const [open, setOpen] = useState(true);
      const [step, setStep] = useState(0);
      return (
        <ProductTour
          steps={[
            { id: 'a', title: 'Alpha', description: 'First step' },
            { id: 'b', title: 'Beta', description: 'Final step' },
          ]}
          open={open}
          onOpenChange={setOpen}
          stepIndex={step}
          onStepChange={(idx) => setStep(idx)}
          onComplete={onComplete}
          mode="inline"
          showProgressDots={false}
          nextLabel="Continue"
          backLabel="Previous"
          finishLabel="All Done"
          skipLabel="Dismiss"
        />
      );
    }

    render(<ControlledHarness />);

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('data-mode', 'inline');
    expect(dialog).toHaveClass('prism-slab');
    expect(dialog).not.toHaveAttribute('aria-modal');
    expect(screen.queryByRole('group', { name: 'Tour progress' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getByRole('heading', { name: 'Beta' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Previous' })).toBeEnabled();

    fireEvent.click(screen.getByRole('button', { name: 'All Done' }));
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('supports Escape dismissal (with closeOnEscape toggle), Close button, Skip tour, and ArrowLeft/ArrowRight keyboard navigation', () => {
    const onSkip = vi.fn();
    const onStepChange = vi.fn();

    const { rerender } = render(
      <ProductTour
        steps={SAMPLE_STEPS}
        defaultOpen
        closeOnEscape={false}
        onSkip={onSkip}
        onStepChange={onStepChange}
      />
    );

    const dialog = screen.getByRole('dialog');

    // Escape ignored when closeOnEscape is false
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onSkip).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    // ArrowLeft at step 0 is a no-op
    fireEvent.keyDown(dialog, { key: 'ArrowLeft' });
    expect(onStepChange).not.toHaveBeenCalled();

    // IME composing ArrowRight is ignored
    const composingRight = createEvent.keyDown(dialog, { key: 'ArrowRight' });
    Object.defineProperty(composingRight, 'isComposing', { value: true });
    fireEvent(dialog, composingRight);
    expect(onStepChange).not.toHaveBeenCalled();

    // ArrowRight advances step 0 -> 1 -> 2
    fireEvent.keyDown(dialog, { key: 'ArrowRight' });
    expect(onStepChange).toHaveBeenLastCalledWith(1, SAMPLE_STEPS[1]);
    fireEvent.keyDown(dialog, { key: 'ArrowRight' });
    expect(onStepChange).toHaveBeenLastCalledWith(2, SAMPLE_STEPS[2]);

    // ArrowRight at last step is a no-op
    onStepChange.mockClear();
    fireEvent.keyDown(dialog, { key: 'ArrowRight' });
    expect(onStepChange).not.toHaveBeenCalled();

    // ArrowLeft moves back 2 -> 1
    fireEvent.keyDown(dialog, { key: 'ArrowLeft' });
    expect(onStepChange).toHaveBeenLastCalledWith(1, SAMPLE_STEPS[1]);

    // Enable closeOnEscape and test IME guard + real Escape
    rerender(
      <ProductTour
        steps={SAMPLE_STEPS}
        defaultOpen
        closeOnEscape
        onSkip={onSkip}
        onStepChange={onStepChange}
      />
    );

    const composingEsc = createEvent.keyDown(window, { key: 'Escape' });
    Object.defineProperty(composingEsc, 'isComposing', { value: true });
    fireEvent(window, composingEsc);
    expect(onSkip).not.toHaveBeenCalled();

    fireEvent.keyDown(window, { key: 'a' });
    expect(onSkip).not.toHaveBeenCalled();

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onSkip).toHaveBeenCalledWith(1);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('invokes onSkip via Skip tour button and Close icon button', () => {
    const onSkip = vi.fn();

    const { unmount } = render(
      <ProductTour steps={SAMPLE_STEPS} defaultOpen defaultStepIndex={1} onSkip={onSkip} />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Skip tour' }));
    expect(onSkip).toHaveBeenLastCalledWith(1);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    unmount();

    render(<ProductTour steps={SAMPLE_STEPS} defaultOpen onSkip={onSkip} />);
    fireEvent.click(screen.getByRole('button', { name: 'Close tour' }));
    expect(onSkip).toHaveBeenLastCalledWith(0);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('spotlights a matched target element across all anchored placements (top, bottom, left, right, center) and updates on resize/scroll', () => {
    const target = document.createElement('button');
    target.id = 'tour-anchor-btn';
    target.getBoundingClientRect = () => ({
      top: 220,
      left: 340,
      width: 140,
      height: 44,
      right: 480,
      bottom: 264,
      x: 340,
      y: 220,
      toJSON: () => ({}),
    });
    document.body.appendChild(target);

    const anchoredSteps: readonly TourStep[] = [
      { id: 'p-bottom', title: 'Bottom', description: 'Anchored bottom', targetSelector: '#tour-anchor-btn', placement: 'bottom' },
      { id: 'p-top', title: 'Top', description: 'Anchored top', targetSelector: '#tour-anchor-btn', placement: 'top' },
      { id: 'p-left', title: 'Left', description: 'Anchored left', targetSelector: '#tour-anchor-btn', placement: 'left' },
      { id: 'p-right', title: 'Right', description: 'Anchored right', targetSelector: '#tour-anchor-btn', placement: 'right' },
      { id: 'p-center', title: 'Center', description: 'Centered with spotlight', targetSelector: '#tour-anchor-btn', placement: 'center' },
    ];

    try {
      const { rerender } = render(
        <ProductTour steps={anchoredSteps} open stepIndex={0} />
      );

      const spotlight = document.querySelector('[data-tour-spotlight="true"]');
      expect(spotlight).not.toBeNull();
      expect(spotlight).toHaveStyle({ top: '214px', left: '334px', width: '152px', height: '56px' });

      const card = document.querySelector('[data-tour-card="true"]');
      expect(card).toHaveAttribute('data-placement', 'bottom');
      expect(card).toHaveStyle({ position: 'fixed' });

      // Trigger resize and scroll listeners
      fireEvent(window, new Event('resize'));
      fireEvent(window, new Event('scroll'));
      expect(document.querySelector('[data-tour-spotlight="true"]')).not.toBeNull();

      rerender(<ProductTour steps={anchoredSteps} open stepIndex={1} />);
      expect(document.querySelector('[data-tour-card="true"]')).toHaveAttribute('data-placement', 'top');

      rerender(<ProductTour steps={anchoredSteps} open stepIndex={2} />);
      expect(document.querySelector('[data-tour-card="true"]')).toHaveAttribute('data-placement', 'left');

      rerender(<ProductTour steps={anchoredSteps} open stepIndex={3} />);
      expect(document.querySelector('[data-tour-card="true"]')).toHaveAttribute('data-placement', 'right');

      rerender(<ProductTour steps={anchoredSteps} open stepIndex={4} />);
      expect(document.querySelector('[data-tour-card="true"]')).toHaveAttribute('data-placement', 'center');
    } finally {
      document.body.removeChild(target);
    }
  });

  it('defends against adversarial inputs: invalid targetSelector, missing/blank targetSelector, out-of-range stepIndex/defaultStepIndex, and XSS payloads', () => {
    const xss = '<script>window.__tourXss=1</script><img src=x onerror=alert(1)>';
    const adversarialSteps: readonly TourStep[] = [
      {
        id: 'bad-selector',
        title: xss,
        description: xss,
        badge: xss,
        targetSelector: '[invalid===',
        placement: 'bottom',
      },
      {
        id: 'blank-selector',
        title: 'Blank Selector Fallback',
        description: 'Handles blank whitespace selector cleanly.',
        targetSelector: '   ',
        placement: 'top',
      },
      {
        id: 'missing-selector',
        title: 'Missing Target Fallback',
        description: 'Handles non-matching selector cleanly.',
        targetSelector: '#does-not-exist-in-dom',
        placement: 'right',
      },
    ];

    const { rerender } = render(
      <ProductTour steps={adversarialSteps} open defaultStepIndex={-50} stepIndex={-10} />
    );

    // Invalid CSS selector does not throw and falls back cleanly to centered coachmark
    expect(document.querySelector('[data-tour-spotlight="true"]')).toBeNull();
    expect(document.querySelector('[data-tour-card="true"]')).toHaveAttribute(
      'data-placement',
      'center'
    );
    expect(document.querySelector('script')).toBeNull();
    expect(screen.getAllByText(xss).length).toBeGreaterThanOrEqual(3);

    // Blank selector falls back safely
    rerender(<ProductTour steps={adversarialSteps} open stepIndex={1} />);
    expect(document.querySelector('[data-tour-spotlight="true"]')).toBeNull();
    expect(screen.getByRole('heading', { name: 'Blank Selector Fallback' })).toBeInTheDocument();

    // Out-of-range positive stepIndex clamps to last step (index 2)
    rerender(<ProductTour steps={adversarialSteps} open stepIndex={999} />);
    expect(document.querySelector('[data-tour-spotlight="true"]')).toBeNull();
    expect(screen.getByRole('heading', { name: 'Missing Target Fallback' })).toBeInTheDocument();

    // NaN stepIndex clamps safely to 0
    rerender(<ProductTour steps={adversarialSteps} open stepIndex={Number.NaN} />);
    expect(screen.getByRole('dialog')).toHaveAttribute('data-step', '1');
  });
});
