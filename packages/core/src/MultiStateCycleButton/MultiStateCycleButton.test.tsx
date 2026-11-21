import { createRef, useState, type MouseEvent } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import { MultiStateCycleButton, type CycleButtonStateOption } from './index';

const MODE_STATES: CycleButtonStateOption[] = [
  { id: 'neutral', label: 'Balanced', icon: <span data-testid="icon-neutral">N</span>, tone: 'neutral' },
  { id: 'primary', label: 'Turbo', icon: <span data-testid="icon-primary">P</span>, tone: 'primary' },
  { id: 'secondary', label: 'Crystal', icon: <span data-testid="icon-secondary">S</span>, tone: 'secondary' },
  { id: 'emerald', label: 'Eco', icon: <span data-testid="icon-emerald">E</span>, tone: 'emerald' },
  { id: 'amber', label: 'Caution', icon: <span data-testid="icon-amber">A</span>, tone: 'amber' },
];

describe('MultiStateCycleButton', () => {
  it('renders default first state, icon, step dots, theme overrides, live region, and forwards React 19 ref', () => {
    const ref = createRef<HTMLButtonElement>();

    render(
      <PrismThemeProvider
        theme={{
          components: {
            MultiStateCycleButton: {
              className: 'theme-cycle-btn',
              style: { letterSpacing: '0.25px' },
            },
          },
        }}
      >
        <MultiStateCycleButton
          ref={ref}
          states={MODE_STATES}
          className="custom-cycle"
          xstyle={{ '--prism-blur-px': '20px' }}
          style={{ minWidth: '160px' }}
          data-testid="cycle-btn"
        />
      </PrismThemeProvider>
    );

    const btn = screen.getByTestId('cycle-btn');
    expect(ref.current).toBe(btn);
    expect(btn).toHaveClass(
      'refractor-multi-state-cycle-button',
      'prism-crystal',
      'theme-cycle-btn',
      'custom-cycle'
    );
    expect(btn).toHaveAttribute('data-state-id', 'neutral');
    expect(btn).toHaveAttribute('data-active-step', '0');
    expect(btn).toHaveAttribute('data-tone', 'neutral');
    expect(btn).toHaveStyle({ letterSpacing: '0.25px', minWidth: '160px' });
    expect(screen.getByTestId('icon-neutral')).toBeInTheDocument();
    expect(btn).toHaveTextContent('Balanced');

    const dots = screen.getByTestId('multi-state-step-dots');
    expect(dots).toHaveAttribute('data-active-step', '0');
    expect(dots.children).toHaveLength(5);
    expect(dots.children[0]).toHaveAttribute('data-active', 'true');

    const liveRegion = screen.getByRole('status');
    expect(liveRegion).toHaveAttribute('aria-live', 'polite');
    expect(liveRegion).toHaveClass('sr-only');
    expect(liveRegion).toHaveTextContent('Balanced (1 of 5)');
  });

  it('cycles through all five tones and wraps around to index 0 while firing onChange(nextId, option, nextIndex)', () => {
    const onChange = vi.fn();
    render(<MultiStateCycleButton states={MODE_STATES} onChange={onChange} />);

    const btn = screen.getByRole('button');

    // neutral (0) -> primary (1)
    fireEvent.click(btn);
    expect(onChange).toHaveBeenLastCalledWith('primary', MODE_STATES[1], 1);
    expect(btn).toHaveAttribute('data-state-id', 'primary');
    expect(btn).toHaveAttribute('data-active-step', '1');
    expect(btn).toHaveAttribute('data-tone', 'primary');
    expect(btn.style.borderColor).toBe('var(--prism-primary-main)');
    expect(screen.getByTestId('icon-primary')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Turbo (2 of 5)');

    // primary (1) -> secondary (2)
    fireEvent.click(btn);
    expect(onChange).toHaveBeenLastCalledWith('secondary', MODE_STATES[2], 2);
    expect(btn.style.borderColor).toBe('var(--prism-secondary-main)');

    // secondary (2) -> emerald (3)
    fireEvent.click(btn);
    expect(onChange).toHaveBeenLastCalledWith('emerald', MODE_STATES[3], 3);
    expect(btn.style.borderColor).toBe('var(--prism-success-main)');

    // emerald (3) -> amber (4)
    fireEvent.click(btn);
    expect(onChange).toHaveBeenLastCalledWith('amber', MODE_STATES[4], 4);
    expect(btn.style.borderColor).toBe('var(--prism-warning-main)');

    // amber (4) -> wraps to neutral (0)
    fireEvent.click(btn);
    expect(onChange).toHaveBeenLastCalledWith('neutral', MODE_STATES[0], 0);
    expect(btn).toHaveAttribute('data-state-id', 'neutral');
    expect(btn).toHaveAttribute('data-active-step', '0');
    expect(screen.getByTestId('multi-state-step-dots')).toHaveAttribute('data-active-step', '0');
    expect(screen.getByRole('status')).toHaveTextContent('Balanced (1 of 5)');
  });

  it('supports defaultValue, omitted tone fallback, and hides step dots when showStepDots is false', () => {
    const minimalStates: CycleButtonStateOption[] = [
      { id: 'asc', label: 'Ascending' },
      { id: 'desc', label: 'Descending' },
    ];

    render(
      <MultiStateCycleButton
        states={minimalStates}
        defaultValue="desc"
        showStepDots={false}
      />
    );

    const btn = screen.getByRole('button', { name: 'Descending' });
    expect(btn).toHaveAttribute('data-state-id', 'desc');
    expect(btn).toHaveAttribute('data-active-step', '1');
    expect(btn).toHaveAttribute('data-tone', 'neutral');
    expect(screen.queryByTestId('multi-state-step-dots')).toBeNull();

    fireEvent.click(btn);
    expect(btn).toHaveAttribute('data-state-id', 'asc');
    expect(btn).toHaveAttribute('data-active-step', '0');
  });

  it('supports controlled value mode and falls back cleanly on unknown value', () => {
    const onChangeSpy = vi.fn();

    function ControlledHarness() {
      const [mode, setMode] = useState('secondary');
      return (
        <MultiStateCycleButton
          states={MODE_STATES}
          value={mode}
          onChange={(nextId, option, nextIndex) => {
            onChangeSpy(nextId, option, nextIndex);
            setMode(nextId);
          }}
        />
      );
    }

    const { rerender } = render(<ControlledHarness />);
    const btn = screen.getByRole('button', { name: 'Crystal' });
    expect(btn).toHaveAttribute('data-state-id', 'secondary');
    expect(btn).toHaveAttribute('data-active-step', '2');

    fireEvent.click(btn);
    expect(onChangeSpy).toHaveBeenCalledWith('emerald', MODE_STATES[3], 3);
    expect(btn).toHaveAttribute('data-state-id', 'emerald');
    expect(btn).toHaveAttribute('data-active-step', '3');

    // Controlled with unmatched id falls back to index 0 cleanly
    rerender(
      <MultiStateCycleButton states={MODE_STATES} value="unknown-id" onChange={onChangeSpy} />
    );
    const fallbackBtn = screen.getByRole('button', { name: 'Balanced' });
    expect(fallbackBtn).toHaveAttribute('data-state-id', 'neutral');
    expect(fallbackBtn).toHaveAttribute('data-active-step', '0');
  });

  it('ignores clicks when disabled, when states has fewer than 2 items, or when caller calls preventDefault', () => {
    const onChange = vi.fn();
    const preventClick = vi.fn((e: MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
    });

    render(
      <>
        <MultiStateCycleButton
          states={MODE_STATES}
          disabled
          onChange={onChange}
          data-testid="disabled-cycle"
        />
        <MultiStateCycleButton
          states={[{ id: 'only', label: 'Single Mode' }]}
          onChange={onChange}
          data-testid="single-cycle"
        />
        <MultiStateCycleButton
          states={MODE_STATES}
          onClick={preventClick}
          onChange={onChange}
          data-testid="guarded-cycle"
        />
      </>
    );

    const disabledBtn = screen.getByTestId('disabled-cycle');
    expect(disabledBtn).toBeDisabled();
    expect(disabledBtn).toHaveAttribute('data-disabled', 'true');
    fireEvent.click(disabledBtn);

    const enterEvent = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
    disabledBtn.dispatchEvent(enterEvent);
    expect(enterEvent.defaultPrevented).toBe(true);

    const spaceEvent = new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true });
    disabledBtn.dispatchEvent(spaceEvent);
    expect(spaceEvent.defaultPrevented).toBe(true);

    const imeEvent = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
    Object.defineProperty(imeEvent, 'isComposing', { value: true });
    disabledBtn.dispatchEvent(imeEvent);
    expect(imeEvent.defaultPrevented).toBe(false);

    const singleBtn = screen.getByTestId('single-cycle');
    fireEvent.click(singleBtn);
    expect(singleBtn).toHaveAttribute('data-state-id', 'only');

    const enabledEnter = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
    singleBtn.dispatchEvent(enabledEnter);
    expect(enabledEnter.defaultPrevented).toBe(false);

    const tabEvent = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
    disabledBtn.dispatchEvent(tabEvent);
    expect(tabEvent.defaultPrevented).toBe(false);

    const guardedBtn = screen.getByTestId('guarded-cycle');
    fireEvent.click(guardedBtn);
    expect(preventClick).toHaveBeenCalledTimes(1);

    expect(onChange).not.toHaveBeenCalled();
  });

  it('handles empty states array cleanly without throwing', () => {
    const onChange = vi.fn();
    render(
      <MultiStateCycleButton
        states={[]}
        aria-label="Empty cycle"
        onChange={onChange}
        data-testid="empty-cycle"
      />
    );

    const btn = screen.getByTestId('empty-cycle');
    expect(btn).toHaveAttribute('data-empty', 'true');
    expect(btn).toHaveAttribute('data-state-id', '');
    expect(btn).toHaveAttribute('data-active-step', '-1');
    expect(screen.queryByTestId('multi-state-step-dots')).toBeNull();
    expect(screen.getByRole('status')).toHaveTextContent('');

    fireEvent.click(btn);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('safely renders adversarial XSS payloads in state labels as literal text', () => {
    const payload = '<script>window.__xss=1</script><img src=x onerror=alert(1)>';
    render(
      <MultiStateCycleButton
        states={[
          { id: 'xss', label: payload },
          { id: 'safe', label: 'Safe' },
        ]}
      />
    );

    expect(screen.getByRole('button')).toHaveTextContent(payload);
    expect(document.querySelector('script')).toBeNull();
  });
});
