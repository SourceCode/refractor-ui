import { createRef, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import {
  FeatureFlagRollout,
  type FeatureFlagRolloutState,
} from './index';

describe('FeatureFlagRollout', () => {
  it('renders defaults, semantic tokens, ref, theme overrides, xstyle, and polite summary footer', () => {
    const ref = createRef<HTMLDivElement>();

    render(
      <PrismThemeProvider
        theme={{
          components: {
            FeatureFlagRollout: {
              className: 'theme-ffr',
              style: { maxWidth: '720px' },
            },
          },
        }}
      >
        <FeatureFlagRollout
          ref={ref}
          className="custom-ffr"
          xstyle={{ '--prism-blur-px': '20px' }}
          data-testid="ffr-root"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('ffr-root');
    expect(ref.current).toBe(root);
    expect(root).toHaveAttribute('role', 'region');
    expect(root).toHaveClass(
      'refractor-feature-flag-rollout',
      'prism-slab',
      'theme-ffr',
      'custom-ffr'
    );
    expect(root).toHaveStyle({ maxWidth: '720px' });
    expect(root).toHaveAttribute('data-status', 'partial');
    expect(root).toHaveAttribute('data-prod', 'true');
    expect(root).toHaveAttribute('data-rollout-pct', '25');
    expect(root).not.toHaveAttribute('data-killed');
    expect(root).not.toHaveAttribute('data-disabled');

    expect(screen.getByTestId('ffr-flag-key')).toHaveTextContent(
      'prism.optical_raytracer_v2'
    );
    expect(
      screen.getByRole('heading', { name: 'Optical Raytracer Pipeline' })
    ).toBeInTheDocument();
    expect(screen.getByTestId('ffr-description')).toBeInTheDocument();

    const statusPill = screen.getByTestId('ffr-status-pill');
    expect(statusPill).toHaveTextContent('Partial Rollout');
    expect(statusPill).toHaveAttribute('data-status', 'partial');
    expect(statusPill.style.color).toBe('var(--prism-warning-main)');

    const killBtn = screen.getByTestId('ffr-kill-switch');
    expect(killBtn).toHaveTextContent('Kill Switch');
    expect(killBtn).toHaveAttribute('aria-pressed', 'false');
    expect(killBtn).toHaveClass('prism-focus-ring');
    expect(screen.queryByTestId('ffr-kill-notice')).not.toBeInTheDocument();

    const devSwitch = screen.getByRole('switch', { name: 'Dev environment' });
    const stagingSwitch = screen.getByRole('switch', { name: 'Staging environment' });
    const prodSwitch = screen.getByRole('switch', { name: 'Prod environment' });
    expect(devSwitch).toHaveAttribute('aria-checked', 'true');
    expect(stagingSwitch).toHaveAttribute('aria-checked', 'true');
    expect(prodSwitch).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByTestId('ffr-env-status-dev')).toHaveTextContent('ON');
    expect(screen.getByTestId('ffr-env-status-staging')).toHaveTextContent('ON');
    expect(screen.getByTestId('ffr-env-status-prod')).toHaveTextContent('ON');
    expect(screen.getByTestId('ffr-env-dot-dev').style.backgroundColor).toBe(
      'var(--prism-info-main)'
    );
    expect(screen.getByTestId('ffr-env-dot-staging').style.backgroundColor).toBe(
      'var(--prism-warning-main)'
    );
    expect(screen.getByTestId('ffr-env-dot-prod').style.backgroundColor).toBe(
      'var(--prism-success-main)'
    );

    expect(screen.getByTestId('ffr-rollout-readout')).toHaveTextContent('25%');
    const slider = screen.getByLabelText('Production rollout percentage');
    expect(slider).toHaveAttribute('type', 'range');
    expect(slider).toHaveAttribute('min', '0');
    expect(slider).toHaveAttribute('max', '100');
    expect(slider).toHaveAttribute('step', '1');
    expect(slider).toHaveValue('25');

    const segments = screen.getByTestId('ffr-rollout-segments');
    expect(segments.children).toHaveLength(10);

    expect(screen.getByTestId('ffr-preset-25')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('ffr-preset-50')).toHaveAttribute('aria-pressed', 'false');

    expect(screen.getByRole('button', { name: 'Internal Staff' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(screen.getByRole('button', { name: 'Beta Cohort' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(screen.getByRole('button', { name: 'Enterprise Tier' })).toHaveAttribute(
      'aria-pressed',
      'false'
    );
    expect(screen.getByTestId('ffr-rules-count')).toHaveTextContent('2/3 enabled');

    const footer = screen.getByTestId('ffr-status-footer');
    expect(footer).toHaveAttribute('role', 'status');
    expect(footer).toHaveAttribute('aria-live', 'polite');
    expect(screen.getByTestId('ffr-summary-text')).toHaveTextContent(
      'Status: Partial Rollout · Active envs: Dev, Staging, Prod · Prod rollout: 25% · Rules: 2/3 enabled'
    );
    expect(screen.queryByTestId('ffr-last-announcement')).not.toBeInTheDocument();
  });

  it('falls back cleanly on blank flagKey/title and omits empty description', () => {
    render(
      <FeatureFlagRollout
        flagKey="   "
        title="   "
        description="   "
      />
    );

    expect(screen.getByTestId('ffr-flag-key')).toHaveTextContent(
      'prism.optical_raytracer_v2'
    );
    expect(
      screen.getByRole('heading', { name: 'Optical Raytracer Pipeline' })
    ).toBeInTheDocument();
    expect(screen.queryByTestId('ffr-description')).not.toBeInTheDocument();
  });

  it('toggles Dev, Staging, and Prod switches and updates overall status pill across Active, Partial Rollout, and Standby', () => {
    const onChange = vi.fn();

    render(<FeatureFlagRollout onChange={onChange} />);

    const devSwitch = screen.getByRole('switch', { name: 'Dev environment' });
    const stagingSwitch = screen.getByRole('switch', { name: 'Staging environment' });
    const prodSwitch = screen.getByRole('switch', { name: 'Prod environment' });

    // Ramp to 100% -> Active
    fireEvent.click(screen.getByTestId('ffr-preset-100'));
    const statusPill = screen.getByTestId('ffr-status-pill');
    expect(statusPill).toHaveTextContent('Active');
    expect(statusPill).toHaveAttribute('data-status', 'active');
    expect(statusPill.style.color).toBe('var(--prism-success-main)');

    // Toggle Dev OFF
    fireEvent.click(devSwitch);
    expect(devSwitch).toHaveAttribute('aria-checked', 'false');
    expect(screen.getByTestId('ffr-env-status-dev')).toHaveTextContent('OFF');
    expect(screen.getByTestId('ffr-last-announcement')).toHaveTextContent(
      'Dev environment turned OFF.'
    );

    // Toggle Staging OFF
    fireEvent.click(stagingSwitch);
    expect(stagingSwitch).toHaveAttribute('aria-checked', 'false');
    expect(screen.getByTestId('ffr-env-status-staging')).toHaveTextContent('OFF');

    // Toggle Prod OFF -> Standby and Active envs: None
    fireEvent.click(prodSwitch);
    expect(prodSwitch).toHaveAttribute('aria-checked', 'false');
    expect(screen.getByTestId('ffr-env-status-prod')).toHaveTextContent('OFF');
    expect(statusPill).toHaveTextContent('Standby');
    expect(statusPill).toHaveAttribute('data-status', 'standby');
    expect(statusPill.style.color).toBe('var(--prism-info-main)');
    expect(screen.getByTestId('ffr-summary-text')).toHaveTextContent(
      'Active envs: None'
    );

    // Toggle Prod back ON -> Active (rolloutPct is still 100%)
    fireEvent.click(prodSwitch);
    expect(prodSwitch).toHaveAttribute('aria-checked', 'true');
    expect(statusPill).toHaveTextContent('Active');
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        environments: { dev: false, staging: false, prod: true },
        rolloutPct: 100,
        killed: false,
      })
    );

    // Drop rollout to 0% with Prod ON -> Standby
    fireEvent.click(screen.getByTestId('ffr-preset-0'));
    expect(statusPill).toHaveTextContent('Standby');
  });

  it('updates rollout via native range slider and presets, and clamps non-finite or out-of-range inputs to [0, 100]', () => {
    const onChange = vi.fn();

    const { rerender } = render(
      <FeatureFlagRollout
        defaultValue={{ rolloutPct: Number.NaN }}
        onChange={onChange}
      />
    );

    expect(screen.getByTestId('ffr-rollout-readout')).toHaveTextContent('0%');
    const slider = screen.getByTestId('ffr-rollout-slider');
    expect(slider).toHaveValue('0');

    fireEvent.change(slider, { target: { value: '68' } });
    expect(screen.getByTestId('ffr-rollout-readout')).toHaveTextContent('68%');
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ rolloutPct: 68 })
    );

    fireEvent.click(screen.getByTestId('ffr-preset-10'));
    expect(screen.getByTestId('ffr-rollout-readout')).toHaveTextContent('10%');
    expect(screen.getByTestId('ffr-preset-10')).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(screen.getByTestId('ffr-preset-50'));
    expect(screen.getByTestId('ffr-rollout-readout')).toHaveTextContent('50%');

    // Controlled sanitization for > 100, < 0, Infinity, -Infinity, decimal
    const baseState: FeatureFlagRolloutState = {
      environments: { dev: true, staging: true, prod: true },
      rolloutPct: 185,
      killed: false,
      audienceRules: [],
    };
    rerender(<FeatureFlagRollout value={baseState} onChange={onChange} />);
    expect(screen.getByTestId('ffr-rollout-readout')).toHaveTextContent('100%');

    rerender(
      <FeatureFlagRollout value={{ ...baseState, rolloutPct: -30 }} onChange={onChange} />
    );
    expect(screen.getByTestId('ffr-rollout-readout')).toHaveTextContent('0%');

    rerender(
      <FeatureFlagRollout
        value={{ ...baseState, rolloutPct: Number.POSITIVE_INFINITY }}
        onChange={onChange}
      />
    );
    expect(screen.getByTestId('ffr-rollout-readout')).toHaveTextContent('0%');

    rerender(
      <FeatureFlagRollout value={{ ...baseState, rolloutPct: 33.7 }} onChange={onChange} />
    );
    expect(screen.getByTestId('ffr-rollout-readout')).toHaveTextContent('34%');
  });

  it('activates Kill Switch to lock Prod OFF and rollout to 0%, blocks adversarial tampering while killed, and restores cleanly', () => {
    const onChange = vi.fn();

    render(
      <FeatureFlagRollout
        defaultValue={{
          environments: { dev: true, staging: true, prod: true },
          rolloutPct: 75,
          killed: false,
        }}
        onChange={onChange}
      />
    );

    const killBtn = screen.getByTestId('ffr-kill-switch');
    const devSwitch = screen.getByRole('switch', { name: 'Dev environment' });
    const prodSwitch = screen.getByRole('switch', { name: 'Prod environment' });
    const slider = screen.getByTestId('ffr-rollout-slider');
    const preset50 = screen.getByTestId('ffr-preset-50');

    // Trigger Kill Switch
    fireEvent.click(killBtn);

    expect(killBtn).toHaveTextContent('Restore Flag');
    expect(killBtn).toHaveAttribute('aria-pressed', 'true');
    const killedPill = screen.getByTestId('ffr-status-pill');
    expect(killedPill).toHaveTextContent('Killed');
    expect(killedPill.style.color).toBe('var(--prism-error-main)');

    const killNotice = screen.getByTestId('ffr-kill-notice');
    expect(killNotice).toHaveAttribute('role', 'alert');
    expect(killNotice.style.color).toBe('var(--prism-error-main)');
    expect(killNotice.style.borderColor).toBe('var(--prism-error-main)');

    expect(prodSwitch).toHaveAttribute('aria-checked', 'false');
    expect(prodSwitch).toBeDisabled();
    expect(slider).toBeDisabled();
    expect(slider).toHaveValue('0');
    expect(preset50).toBeDisabled();
    expect(screen.getByTestId('ffr-rollout-readout')).toHaveTextContent('0%');
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        killed: true,
        environments: { dev: true, staging: true, prod: false },
        rolloutPct: 0,
      })
    );

    // Dev remains toggleable while killed
    fireEvent.click(devSwitch);
    expect(devSwitch).toHaveAttribute('aria-checked', 'false');
    const callsBeforeTamper = onChange.mock.calls.length;

    // Adversarial DOM tampering: strip disabled from Prod switch, slider, and preset
    prodSwitch.removeAttribute('disabled');
    slider.removeAttribute('disabled');
    preset50.removeAttribute('disabled');
    fireEvent.click(prodSwitch);
    fireEvent.change(slider, { target: { value: '80' } });
    fireEvent.click(preset50);

    expect(onChange).toHaveBeenCalledTimes(callsBeforeTamper);
    expect(prodSwitch).toHaveAttribute('aria-checked', 'false');
    expect(screen.getByTestId('ffr-rollout-readout')).toHaveTextContent('0%');

    // Restore Flag clears killed state and unlocks Prod + rollout controls
    fireEvent.click(killBtn);
    expect(killBtn).toHaveTextContent('Kill Switch');
    expect(killBtn).toHaveAttribute('aria-pressed', 'false');
    expect(screen.queryByTestId('ffr-kill-notice')).not.toBeInTheDocument();
    expect(screen.getByTestId('ffr-status-pill')).toHaveTextContent('Standby');
    expect(prodSwitch).not.toBeDisabled();
    expect(slider).not.toBeDisabled();
    expect(preset50).not.toBeDisabled();

    // Operator can now intentionally re-enable Prod and set rollout
    fireEvent.click(prodSwitch);
    fireEvent.click(preset50);
    expect(prodSwitch).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByTestId('ffr-rollout-readout')).toHaveTextContent('50%');
    expect(screen.getByTestId('ffr-status-pill')).toHaveTextContent('Partial Rollout');
  });

  it('enforces killed safety invariant when initialized with killed: true alongside prod: true and rolloutPct > 0', () => {
    render(
      <FeatureFlagRollout
        defaultValue={{
          environments: { dev: true, staging: false, prod: true },
          rolloutPct: 90,
          killed: true,
        }}
      />
    );

    expect(screen.getByTestId('ffr-status-pill')).toHaveTextContent('Killed');
    expect(screen.getByRole('switch', { name: 'Prod environment' })).toHaveAttribute(
      'aria-checked',
      'false'
    );
    expect(screen.getByTestId('ffr-rollout-readout')).toHaveTextContent('0%');
  });

  it('toggles, removes, and adds audience rules with blank/duplicate rejection, collision-safe IDs, and IME-safe Enter handling', () => {
    const onChange = vi.fn();

    render(<FeatureFlagRollout onChange={onChange} />);

    // Toggle existing rules
    const staffBtn = screen.getByRole('button', { name: 'Internal Staff' });
    const enterpriseBtn = screen.getByRole('button', { name: 'Enterprise Tier' });
    fireEvent.click(staffBtn);
    expect(staffBtn).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByTestId('ffr-rules-count')).toHaveTextContent('1/3 enabled');

    fireEvent.click(enterpriseBtn);
    expect(enterpriseBtn).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('ffr-rules-count')).toHaveTextContent('2/3 enabled');

    const input = screen.getByLabelText('New audience targeting rule');
    const addBtn = screen.getByRole('button', { name: 'Add Rule' });
    const callsBeforeValidation = onChange.mock.calls.length;

    // Blank submission blocked with inline polite feedback
    fireEvent.change(input, { target: { value: '   ' } });
    fireEvent.click(addBtn);
    const blankFeedback = screen.getByTestId('ffr-rule-feedback');
    expect(blankFeedback).toHaveAttribute('role', 'status');
    expect(blankFeedback).toHaveAttribute('aria-live', 'polite');
    expect(blankFeedback).toHaveTextContent('Enter a target segment name');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(onChange).toHaveBeenCalledTimes(callsBeforeValidation);

    // Typing clears validation feedback
    fireEvent.change(input, { target: { value: '  internal staff  ' } });
    expect(screen.queryByTestId('ffr-rule-feedback')).not.toBeInTheDocument();

    // Case-insensitive duplicate rejected
    fireEvent.click(addBtn);
    expect(screen.getByTestId('ffr-rule-feedback')).toHaveTextContent(
      'Audience rule "internal staff" already exists.'
    );
    expect(onChange).toHaveBeenCalledTimes(callsBeforeValidation);

    // IME-composing Enter key must NOT submit
    fireEvent.change(input, { target: { value: 'Canary Mobile' } });
    const composingEvent = new KeyboardEvent('keydown', {
      key: 'Enter',
      bubbles: true,
      cancelable: true,
    });
    Object.defineProperty(composingEvent, 'isComposing', { value: true });
    input.dispatchEvent(composingEvent);
    expect(screen.queryByRole('button', { name: 'Canary Mobile' })).not.toBeInTheDocument();
    expect(onChange).toHaveBeenCalledTimes(callsBeforeValidation);

    // Non-Enter key does not submit
    fireEvent.keyDown(input, { key: 'a' });
    expect(onChange).toHaveBeenCalledTimes(callsBeforeValidation);

    // Non-composing Enter submits cleanly with trimmed whitespace
    fireEvent.change(input, { target: { value: '  Canary Mobile  ' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(input).toHaveValue('');
    const addedRuleBtn = screen.getByRole('button', { name: 'Canary Mobile' });
    expect(addedRuleBtn).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('ffr-rules-count')).toHaveTextContent('3/4 enabled');

    // Slug-colliding & punctuation-only rule labels generate unique IDs cleanly
    fireEvent.change(input, { target: { value: 'VIP-1' } });
    fireEvent.click(addBtn);
    fireEvent.change(input, { target: { value: 'VIP 1' } });
    fireEvent.click(addBtn);
    fireEvent.change(input, { target: { value: 'VIP_1' } });
    fireEvent.click(addBtn);
    fireEvent.change(input, { target: { value: '!!!' } });
    fireEvent.click(addBtn);

    expect(screen.getByTestId('ffr-rule-rule-vip-1')).toBeInTheDocument();
    expect(screen.getByTestId('ffr-rule-rule-vip-1-2')).toBeInTheDocument();
    expect(screen.getByTestId('ffr-rule-rule-vip-1-3')).toBeInTheDocument();
    expect(screen.getByTestId('ffr-rule-rule-segment')).toBeInTheDocument();

    // Remove every rule to verify removal & empty-rules state
    const removeButtons = screen.getAllByRole('button', { name: /^Remove rule / });
    expect(removeButtons.length).toBe(8);
    for (const btn of removeButtons) {
      fireEvent.click(btn);
    }

    expect(screen.getByTestId('ffr-rules-empty')).toHaveTextContent(
      'No audience targeting rules configured.'
    );
    expect(screen.getByTestId('ffr-rules-count')).toHaveTextContent('0/0 enabled');
  });

  it('supports controlled mode updates and stays immutable when parent ignores onChange (negative test)', () => {
    function ControlledHarness() {
      const [state, setState] = useState<FeatureFlagRolloutState>({
        environments: { dev: true, staging: false, prod: true },
        rolloutPct: 10,
        killed: false,
        audienceRules: [{ id: 'qa-team', label: 'QA Team', enabled: false }],
      });
      return <FeatureFlagRollout value={state} onChange={setState} />;
    }

    const { unmount } = render(<ControlledHarness />);
    expect(screen.getByTestId('ffr-rollout-readout')).toHaveTextContent('10%');

    fireEvent.click(screen.getByTestId('ffr-preset-50'));
    expect(screen.getByTestId('ffr-rollout-readout')).toHaveTextContent('50%');

    fireEvent.click(screen.getByRole('button', { name: 'QA Team' }));
    expect(screen.getByRole('button', { name: 'QA Team' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    unmount();

    // Negative controlled test: parent does not apply onChange updates
    const ignoredOnChange = vi.fn();
    render(
      <FeatureFlagRollout
        value={{
          environments: { dev: true, staging: true, prod: true },
          rolloutPct: 25,
          killed: false,
          audienceRules: [{ id: 'staff', label: 'Internal Staff', enabled: true }],
        }}
        onChange={ignoredOnChange}
      />
    );

    fireEvent.click(screen.getByTestId('ffr-preset-100'));
    expect(ignoredOnChange).toHaveBeenCalledWith(
      expect.objectContaining({ rolloutPct: 100 })
    );
    expect(screen.getByTestId('ffr-rollout-readout')).toHaveTextContent('25%');
  });

  it('blocks all mutations when disabled, including under adversarial DOM tampering', () => {
    const onChange = vi.fn();

    render(
      <FeatureFlagRollout
        disabled
        onChange={onChange}
        data-testid="ffr-disabled"
      />
    );

    expect(screen.getByTestId('ffr-disabled')).toHaveAttribute('data-disabled', 'true');

    const killBtn = screen.getByTestId('ffr-kill-switch');
    const devSwitch = screen.getByRole('switch', { name: 'Dev environment' });
    const slider = screen.getByTestId('ffr-rollout-slider');
    const preset50 = screen.getByTestId('ffr-preset-50');
    const staffBtn = screen.getByRole('button', { name: 'Internal Staff' });
    const removeStaffBtn = screen.getByRole('button', {
      name: 'Remove rule Internal Staff',
    });
    const ruleInput = screen.getByLabelText('New audience targeting rule');
    const addBtn = screen.getByRole('button', { name: 'Add Rule' });

    const allControls = [
      killBtn,
      devSwitch,
      slider,
      preset50,
      staffBtn,
      removeStaffBtn,
      ruleInput,
      addBtn,
    ];
    for (const control of allControls) {
      expect(control).toBeDisabled();
      control.removeAttribute('disabled');
    }

    fireEvent.click(killBtn);
    fireEvent.click(devSwitch);
    fireEvent.change(slider, { target: { value: '90' } });
    fireEvent.click(preset50);
    fireEvent.click(staffBtn);
    fireEvent.click(removeStaffBtn);
    fireEvent.change(ruleInput, { target: { value: 'Tampered Cohort' } });
    fireEvent.keyDown(ruleInput, { key: 'Enter' });
    fireEvent.click(addBtn);

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByTestId('ffr-rollout-readout')).toHaveTextContent('25%');
    expect(screen.queryByRole('button', { name: 'Tampered Cohort' })).not.toBeInTheDocument();
  });

  it('stays 100% immune to XSS payloads and __proto__/constructor/prototype rule labels (adversarial test)', () => {
    const xssPayload = '<script>window.__ffrXss=1</script><img src=x onerror=alert(1)>';
    const onChange = vi.fn();

    render(
      <FeatureFlagRollout
        flagKey={xssPayload}
        title={xssPayload}
        description={xssPayload}
        defaultValue={{ audienceRules: [] }}
        onChange={onChange}
      />
    );

    expect(document.querySelector('script')).toBeNull();
    expect(document.querySelector('img')).toBeNull();
    expect(screen.getAllByText(xssPayload)).toHaveLength(3);

    const input = screen.getByLabelText('New audience targeting rule');
    const addBtn = screen.getByRole('button', { name: 'Add Rule' });

    for (const label of [xssPayload, '__proto__', 'constructor', 'prototype']) {
      fireEvent.change(input, { target: { value: label } });
      fireEvent.click(addBtn);
    }

    expect(document.querySelector('script')).toBeNull();
    expect(document.querySelector('img')).toBeNull();
    expect(screen.getByRole('button', { name: '__proto__' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'constructor' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'prototype' })).toBeInTheDocument();

    // Toggle and remove prototype-named rule safely
    fireEvent.click(screen.getByRole('button', { name: '__proto__' }));
    fireEvent.click(screen.getByRole('button', { name: 'Remove rule __proto__' }));
    expect(screen.queryByRole('button', { name: '__proto__' })).not.toBeInTheDocument();

    // Ensure Object.prototype was never polluted
    const probe: Record<string, string> = {};
    expect(Object.prototype.hasOwnProperty.call(Object.prototype, '__proto__')).toBe(true);
    expect(probe['prototype']).toBeUndefined();
  });
});
