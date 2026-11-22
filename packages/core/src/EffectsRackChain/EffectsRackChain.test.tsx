import { createRef, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import {
  EffectsRackChain,
  type DspEffectCategory,
  type DspEffectCategoryMap,
  type DspEffectModule,
} from './index';

describe('EffectsRackChain', () => {
  it('renders the default 4-stage mastering chain with PrismThemeProvider overrides, xstyle, and React 19 ref', () => {
    const ref = createRef<HTMLDivElement>();
    const categoryMap: DspEffectCategoryMap = {
      dynamics: true,
      eq: true,
      time: true,
      modulation: true,
      saturation: true,
    };
    expect(Object.keys(categoryMap)).toEqual([
      'dynamics',
      'eq',
      'time',
      'modulation',
      'saturation',
    ]);
    expect(EffectsRackChain.displayName).toBe('EffectsRackChain');

    render(
      <PrismThemeProvider
        theme={{
          components: {
            EffectsRackChain: {
              className: 'theme-rack-override',
              style: { letterSpacing: '0.15px' },
            },
          },
        }}
      >
        <EffectsRackChain
          ref={ref}
          className="custom-rack-class"
          xstyle={{ '--prism-blur-px': '20px' }}
          style={{ minWidth: '300px' }}
          data-testid="dsp-rack"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('dsp-rack');
    expect(ref.current).toBe(root);
    expect(root).toHaveClass(
      'refractor-effects-rack-chain',
      'prism-slab',
      'theme-rack-override',
      'custom-rack-class'
    );
    expect(root).toHaveAttribute('role', 'region');
    expect(root).toHaveAttribute('data-orientation', 'horizontal');
    expect(root).toHaveAttribute('data-count', '4');
    expect(root).toHaveAttribute('data-active-count', '4');
    expect(root).not.toHaveAttribute('data-empty');
    expect(root).not.toHaveAttribute('data-all-bypassed');
    expect(root).not.toHaveAttribute('data-disabled');
    expect(root).toHaveStyle({ letterSpacing: '0.15px', minWidth: '300px' });

    expect(screen.getByRole('heading', { name: 'DSP Effects Rack' })).toBeInTheDocument();
    expect(screen.getByTestId('effects-active-counter')).toHaveTextContent('4 / 4 Active');

    const chainList = screen.getByRole('list', { name: 'DSP Effects Rack signal chain' });
    const items = within(chainList).getAllByRole('listitem');
    expect(items).toHaveLength(4);

    expect(screen.getByTestId('effect-slot-badge-dsp-prism-gate')).toHaveTextContent('01');
    expect(screen.getByTestId('effect-name-dsp-prism-gate')).toHaveTextContent('Prism Gate');
    expect(screen.getByTestId('effect-preset-dsp-prism-gate')).toHaveTextContent('Tight Floor');

    expect(screen.getByTestId('effect-slot-badge-dsp-optical-comp')).toHaveTextContent('02');
    expect(screen.getByTestId('effect-name-dsp-optical-comp')).toHaveTextContent('Optical Comp');
    expect(screen.getByTestId('effect-preset-dsp-optical-comp')).toHaveTextContent('Warm 2:1');

    expect(screen.getByTestId('effect-slot-badge-dsp-harmonic-tube')).toHaveTextContent('03');
    expect(screen.getByTestId('effect-name-dsp-harmonic-tube')).toHaveTextContent('Harmonic Tube');
    expect(screen.getByTestId('effect-preset-dsp-harmonic-tube')).toHaveTextContent('Triode Sheen');

    expect(screen.getByTestId('effect-slot-badge-dsp-crystal-hall')).toHaveTextContent('04');
    expect(screen.getByTestId('effect-name-dsp-crystal-hall')).toHaveTextContent('Crystal Hall');
    expect(screen.getByTestId('effect-preset-dsp-crystal-hall')).toHaveTextContent('Studio Plate');

    // Horizontal directional connectors appear between cards (3 connectors for 4 slots)
    expect(screen.getByTestId('effect-connector-dsp-prism-gate')).toHaveTextContent('→');
    expect(screen.getByTestId('effect-connector-dsp-optical-comp')).toHaveTextContent('→');
    expect(screen.getByTestId('effect-connector-dsp-harmonic-tube')).toHaveTextContent('→');
    expect(screen.queryByTestId('effect-connector-dsp-crystal-hall')).toBeNull();

    const summary = screen.getByTestId('effects-rack-summary');
    expect(summary).toHaveAttribute('aria-live', 'polite');
    expect(summary).toHaveTextContent(
      'Input → Prism Gate → Optical Comp → Harmonic Tube → Crystal Hall → Output'
    );
    expect(summary).toHaveTextContent('4 active · 0 bypassed');
  });

  it('renders semantic --prism-* category tags for all five categories and handles optional presetLabel', () => {
    const allCategories: Array<{ category: DspEffectCategory; label: string; token: string }> = [
      { category: 'dynamics', label: 'Dynamics', token: 'var(--prism-primary-main)' },
      { category: 'eq', label: 'EQ', token: 'var(--prism-secondary-main)' },
      { category: 'time', label: 'Time', token: 'var(--prism-info-main)' },
      { category: 'modulation', label: 'Modulation', token: 'var(--prism-success-main)' },
      { category: 'saturation', label: 'Saturation', token: 'var(--prism-warning-main)' },
    ];

    const modules: DspEffectModule[] = allCategories.map((entry, idx) => ({
      id: `cat-${entry.category}`,
      name: `Module ${entry.label}`,
      category: entry.category,
      bypassed: false,
      wetMixPct: 50 + idx * 10,
      presetLabel: idx === 0 ? 'Preset A' : idx === 1 ? '   ' : undefined,
    }));

    render(<EffectsRackChain defaultEffects={modules} />);

    for (const entry of allCategories) {
      const badge = screen.getByTestId(`effect-category-cat-${entry.category}`);
      expect(badge).toHaveAttribute('data-category', entry.category);
      expect(badge).toHaveTextContent(entry.label);
      expect(badge.style.color).toBe(entry.token);
    }

    expect(screen.getByTestId('effect-preset-cat-dynamics')).toHaveTextContent('Preset A');
    expect(screen.queryByTestId('effect-preset-cat-eq')).toBeNull();
    expect(screen.queryByTestId('effect-preset-cat-time')).toBeNull();
  });

  it('supports vertical orientation with downward signal-flow arrows', () => {
    render(<EffectsRackChain orientation="vertical" data-testid="vertical-rack" />);

    expect(screen.getByTestId('vertical-rack')).toHaveAttribute('data-orientation', 'vertical');
    expect(screen.getByTestId('effects-rack-chain')).toHaveAttribute('data-orientation', 'vertical');
    expect(screen.getByTestId('effect-connector-dsp-prism-gate')).toHaveTextContent('↓');
    expect(screen.getByTestId('effect-connector-dsp-prism-gate')).toHaveAttribute(
      'data-direction',
      'vertical'
    );
  });

  it('toggles individual module bypass, updates active counter, disables slider, and updates live signal summary', () => {
    const onChange = vi.fn();
    render(<EffectsRackChain onChange={onChange} />);

    const powerBtn = screen.getByRole('button', { name: 'Bypass Optical Comp' });
    const powerDot = screen.getByTestId('effect-power-dot-dsp-optical-comp');
    const slider = screen.getByRole('slider', { name: 'Optical Comp wet mix' });
    const connector = screen.getByTestId('effect-connector-dsp-optical-comp');

    expect(powerBtn).toHaveAttribute('aria-pressed', 'true');
    expect(powerDot.style.backgroundColor).toBe('var(--prism-success-main)');
    expect(connector.style.color).toBe('var(--prism-primary-main)');
    expect(slider).not.toBeDisabled();

    // Bypass Optical Comp
    fireEvent.click(powerBtn);

    expect(onChange).toHaveBeenCalledTimes(1);
    const afterBypass = onChange.mock.calls[0]?.[0] as DspEffectModule[];
    expect(afterBypass.find((e) => e.id === 'dsp-optical-comp')?.bypassed).toBe(true);

    expect(screen.getByRole('button', { name: 'Enable Optical Comp' })).toHaveAttribute(
      'aria-pressed',
      'false'
    );
    expect(powerDot.style.backgroundColor).toBe('var(--prism-text-disabled)');
    expect(connector.style.color).toBe('var(--prism-text-disabled)');
    expect(slider).toBeDisabled();
    expect(screen.getByTestId('effects-active-counter')).toHaveTextContent('3 / 4 Active');
    expect(screen.getByTestId('effects-rack-summary')).toHaveTextContent(
      'Input → Prism Gate → Harmonic Tube → Crystal Hall → Output'
    );
    expect(screen.getByTestId('effects-rack-summary')).toHaveTextContent('3 active · 1 bypassed');

    // Programmatic change/keyDown on bypassed slider are ignored
    fireEvent.change(slider, { target: { value: '15' } });
    fireEvent.keyDown(slider, { key: 'Home' });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('effect-wet-readout-dsp-optical-comp')).toHaveTextContent('75%');

    // Re-enable Optical Comp
    fireEvent.click(screen.getByRole('button', { name: 'Enable Optical Comp' }));
    expect(screen.getByTestId('effects-active-counter')).toHaveTextContent('4 / 4 Active');
    expect(slider).not.toBeDisabled();
    expect(powerDot.style.backgroundColor).toBe('var(--prism-success-main)');
  });

  it('adjusts wet/dry mix via range input and IME-safe keyboard shortcuts', () => {
    const onChange = vi.fn();
    render(<EffectsRackChain onChange={onChange} />);

    const slider = screen.getByRole('slider', { name: 'Harmonic Tube wet mix' });
    expect(slider).toHaveValue('45');
    expect(screen.getByTestId('effect-wet-readout-dsp-harmonic-tube')).toHaveTextContent('45%');

    // Direct slider change
    fireEvent.change(slider, { target: { value: '62' } });
    expect(screen.getByTestId('effect-wet-readout-dsp-harmonic-tube')).toHaveTextContent('62%');
    expect(screen.getByTestId('effect-wet-fill-dsp-harmonic-tube')).toHaveStyle({ width: '62%' });
    expect(slider).toHaveAttribute('aria-valuenow', '62');
    expect(slider).toHaveAttribute('aria-valuetext', '62%');

    // PageUp / Shift+ArrowRight (+10%)
    fireEvent.keyDown(slider, { key: 'PageUp' });
    expect(screen.getByTestId('effect-wet-readout-dsp-harmonic-tube')).toHaveTextContent('72%');

    fireEvent.keyDown(slider, { key: 'ArrowRight', shiftKey: true });
    expect(screen.getByTestId('effect-wet-readout-dsp-harmonic-tube')).toHaveTextContent('82%');

    // PageDown / Shift+ArrowDown (-10%)
    fireEvent.keyDown(slider, { key: 'PageDown' });
    expect(screen.getByTestId('effect-wet-readout-dsp-harmonic-tube')).toHaveTextContent('72%');

    fireEvent.keyDown(slider, { key: 'ArrowDown', shiftKey: true });
    expect(screen.getByTestId('effect-wet-readout-dsp-harmonic-tube')).toHaveTextContent('62%');

    // End -> 100%, Home -> 0%
    fireEvent.keyDown(slider, { key: 'End' });
    expect(screen.getByTestId('effect-wet-readout-dsp-harmonic-tube')).toHaveTextContent('100%');

    fireEvent.keyDown(slider, { key: 'Home' });
    expect(screen.getByTestId('effect-wet-readout-dsp-harmonic-tube')).toHaveTextContent('0%');

    // Non-shortcut key does not invoke onChange
    const countBefore = onChange.mock.calls.length;
    fireEvent.keyDown(slider, { key: 'a' });
    expect(onChange).toHaveBeenCalledTimes(countBefore);

    // IME composition event must be ignored
    const composingEvent = new KeyboardEvent('keydown', {
      key: 'End',
      bubbles: true,
      cancelable: true,
    });
    Object.defineProperty(composingEvent, 'isComposing', { value: true });
    slider.dispatchEvent(composingEvent);
    expect(onChange).toHaveBeenCalledTimes(countBefore);
    expect(screen.getByTestId('effect-wet-readout-dsp-harmonic-tube')).toHaveTextContent('0%');
  });

  it('toggles Bypass All to bypass and restore the entire chain', () => {
    const onChange = vi.fn();
    render(<EffectsRackChain onChange={onChange} data-testid="bypass-rack" />);

    const bypassAllBtn = screen.getByRole('button', { name: 'Bypass All' });
    expect(bypassAllBtn).toHaveAttribute('aria-pressed', 'false');

    // Bypass all 4 modules
    fireEvent.click(bypassAllBtn);
    expect(bypassAllBtn).toHaveAttribute('aria-pressed', 'true');
    expect(bypassAllBtn).toHaveAttribute('data-active', 'true');
    expect(screen.getByTestId('bypass-rack')).toHaveAttribute('data-all-bypassed', 'true');
    expect(screen.getByTestId('effects-active-counter')).toHaveTextContent('0 / 4 Active');
    expect(screen.getByTestId('effects-rack-summary')).toHaveTextContent(
      'Input → Output (All Bypassed)'
    );
    expect(screen.getByRole('slider', { name: 'Prism Gate wet mix' })).toBeDisabled();

    // Un-bypass all 4 modules
    fireEvent.click(bypassAllBtn);
    expect(bypassAllBtn).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByTestId('bypass-rack')).not.toHaveAttribute('data-all-bypassed');
    expect(screen.getByTestId('effects-active-counter')).toHaveTextContent('4 / 4 Active');
    expect(screen.getByRole('slider', { name: 'Prism Gate wet mix' })).not.toBeDisabled();
  });

  it('appends deterministic optical plugin slots on Add Insert and handles template overflow collisions', () => {
    const seedWithCollision: DspEffectModule[] = [
      {
        id: 'dsp-linear-eq-2',
        name: 'Preloaded EQ 2',
        category: 'eq',
        bypassed: false,
        wetMixPct: 100,
      },
    ];
    const onChange = vi.fn();
    render(<EffectsRackChain defaultEffects={seedWithCollision} onChange={onChange} />);

    const addBtn = screen.getByRole('button', { name: 'Add Insert' });

    // Add all 5 base templates plus one overflow slot (skipping colliding dsp-linear-eq-2 -> dsp-linear-eq-3)
    for (let i = 0; i < 6; i += 1) {
      fireEvent.click(addBtn);
    }

    const latest = onChange.mock.calls[onChange.mock.calls.length - 1]?.[0] as DspEffectModule[];
    expect(latest.map((item) => item.id)).toEqual([
      'dsp-linear-eq-2',
      'dsp-linear-eq',
      'dsp-prism-chorus',
      'dsp-optical-limiter',
      'dsp-tape-saturator',
      'dsp-shimmer-delay',
      'dsp-linear-eq-3',
    ]);
    expect(screen.getByTestId('effect-name-dsp-linear-eq-3')).toHaveTextContent(
      'Linear Phase EQ 3'
    );
    expect(screen.getByTestId('effects-active-counter')).toHaveTextContent('7 / 7 Active');
  });

  it('invokes custom onAddEffect handler when provided instead of appending internally', () => {
    const onAddEffect = vi.fn();
    const onChange = vi.fn();
    render(<EffectsRackChain onAddEffect={onAddEffect} onChange={onChange} />);

    fireEvent.click(screen.getByRole('button', { name: 'Add Insert' }));

    expect(onAddEffect).toHaveBeenCalledTimes(1);
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByTestId('effects-active-counter')).toHaveTextContent('4 / 4 Active');
  });

  it('reorders modules with Move Earlier / Move Later while respecting chain boundaries', () => {
    const onChange = vi.fn();
    render(<EffectsRackChain onChange={onChange} />);

    // Boundary checks
    expect(screen.getByRole('button', { name: 'Move Prism Gate earlier' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Move Crystal Hall later' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Move Optical Comp earlier' })).not.toBeDisabled();
    expect(screen.getByRole('button', { name: 'Move Optical Comp later' })).not.toBeDisabled();

    // Move Optical Comp earlier (02 -> 01)
    fireEvent.click(screen.getByRole('button', { name: 'Move Optical Comp earlier' }));
    expect(screen.getByTestId('effect-slot-badge-dsp-optical-comp')).toHaveTextContent('01');
    expect(screen.getByTestId('effect-slot-badge-dsp-prism-gate')).toHaveTextContent('02');
    expect(screen.getByRole('button', { name: 'Move Optical Comp earlier' })).toBeDisabled();
    expect(screen.getByTestId('effects-rack-summary')).toHaveTextContent(
      'Input → Optical Comp → Prism Gate → Harmonic Tube → Crystal Hall → Output'
    );

    // Move Optical Comp later (01 -> 02)
    fireEvent.click(screen.getByRole('button', { name: 'Move Optical Comp later' }));
    expect(screen.getByTestId('effect-slot-badge-dsp-prism-gate')).toHaveTextContent('01');
    expect(screen.getByTestId('effect-slot-badge-dsp-optical-comp')).toHaveTextContent('02');
  });

  it('removes modules and renders the role="status" empty state when all inserts are cleared', () => {
    const singleEffect: DspEffectModule[] = [
      {
        id: 'solo-gate',
        name: 'Prism Gate',
        category: 'dynamics',
        bypassed: false,
        wetMixPct: 100,
      },
    ];
    render(<EffectsRackChain defaultEffects={singleEffect} data-testid="empty-test-rack" />);

    fireEvent.click(screen.getByRole('button', { name: 'Remove Prism Gate' }));

    const emptyStatus = screen.getByRole('status');
    expect(emptyStatus).toHaveTextContent('Direct Dry Signal — No inserts loaded');
    expect(screen.getByTestId('empty-test-rack')).toHaveAttribute('data-empty', 'true');
    expect(screen.getByTestId('effects-active-counter')).toHaveTextContent('0 / 0 Active');
    expect(screen.getByRole('button', { name: 'Bypass All' })).toBeDisabled();
    expect(screen.getByTestId('effects-rack-summary')).toHaveTextContent(
      'Input → Direct Dry Signal → Output'
    );
    expect(screen.getByTestId('effects-rack-summary')).toHaveTextContent('0 inserts');

    // Adding an insert recovers smoothly from empty state
    fireEvent.click(screen.getByRole('button', { name: 'Add Insert' }));
    expect(screen.queryByTestId('effects-rack-empty')).toBeNull();
    expect(screen.getByTestId('effect-name-dsp-linear-eq')).toHaveTextContent('Linear Phase EQ');
    expect(screen.getByTestId('effects-active-counter')).toHaveTextContent('1 / 1 Active');
  });

  it('operates cleanly in controlled mode with external state synchronization', () => {
    function ControlledRackHarness() {
      const [chain, setChain] = useState<DspEffectModule[]>([
        {
          id: 'ctrl-1',
          name: 'Master EQ',
          category: 'eq',
          bypassed: false,
          wetMixPct: 80,
          presetLabel: 'Linear Tilt',
        },
        {
          id: 'ctrl-2',
          name: 'Bus Glue',
          category: 'dynamics',
          bypassed: false,
          wetMixPct: 60,
        },
      ]);

      return <EffectsRackChain effects={chain} onChange={setChain} title="Controlled Mastering" />;
    }

    render(<ControlledRackHarness />);

    expect(screen.getByRole('heading', { name: 'Controlled Mastering' })).toBeInTheDocument();
    expect(screen.getByTestId('effects-active-counter')).toHaveTextContent('2 / 2 Active');

    fireEvent.click(screen.getByRole('button', { name: 'Bypass Bus Glue' }));
    expect(screen.getByTestId('effects-active-counter')).toHaveTextContent('1 / 2 Active');
    expect(screen.getByTestId('effects-rack-summary')).toHaveTextContent(
      'Input → Master EQ → Output'
    );

    fireEvent.click(screen.getByRole('button', { name: 'Remove Master EQ' }));
    expect(screen.getByTestId('effects-active-counter')).toHaveTextContent('0 / 1 Active');
  });

  it('disables all interactive controls when disabled is true', () => {
    const onChange = vi.fn();
    const onAddEffect = vi.fn();
    render(
      <EffectsRackChain
        disabled
        onChange={onChange}
        onAddEffect={onAddEffect}
        data-testid="disabled-rack"
      />
    );

    const root = screen.getByTestId('disabled-rack');
    expect(root).toHaveAttribute('aria-disabled', 'true');
    expect(root).toHaveAttribute('data-disabled', 'true');

    expect(screen.getByRole('button', { name: 'Bypass All' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Add Insert' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Bypass Prism Gate' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Move Optical Comp earlier' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Move Optical Comp later' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Remove Prism Gate' })).toBeDisabled();

    const slider = screen.getByRole('slider', { name: 'Prism Gate wet mix' });
    expect(slider).toBeDisabled();

    fireEvent.change(slider, { target: { value: '10' } });
    fireEvent.keyDown(slider, { key: 'Home' });
    expect(onChange).not.toHaveBeenCalled();
    expect(onAddEffect).not.toHaveBeenCalled();
  });

  it('sanitizes duplicate IDs, out-of-range/NaN wetMixPct, blank labels, and renders XSS payloads as literal text', () => {
    const adversarialEffects: DspEffectModule[] = [
      {
        id: 'dup-id',
        name: '<script>alert("xss")</script>',
        category: 'saturation',
        bypassed: false,
        wetMixPct: 180,
        presetLabel: '<img src=x onerror=alert(1)>',
      },
      {
        id: 'dup-id',
        name: 'Duplicate Should Drop',
        category: 'eq',
        bypassed: false,
        wetMixPct: 50,
      },
      {
        id: 'nan-effect',
        name: '   ',
        category: 'time',
        bypassed: false,
        wetMixPct: Number.NaN,
      },
      {
        id: 'neg-effect',
        name: 'Negative Mix',
        category: 'modulation',
        bypassed: false,
        wetMixPct: -25,
      },
    ];

    const { container } = render(
      <EffectsRackChain title="   " effects={adversarialEffects} />
    );

    // Blank title falls back to default
    expect(screen.getByRole('heading', { name: 'DSP Effects Rack' })).toBeInTheDocument();

    // Duplicate dropped -> 3 items remain
    expect(screen.getByTestId('effects-active-counter')).toHaveTextContent('3 / 3 Active');
    expect(screen.queryByText('Duplicate Should Drop')).toBeNull();

    // XSS strings rendered strictly as literal text, zero injected script/img tags
    expect(screen.getByTestId('effect-name-dup-id')).toHaveTextContent(
      '<script>alert("xss")</script>'
    );
    expect(screen.getByTestId('effect-preset-dup-id')).toHaveTextContent(
      '<img src=x onerror=alert(1)>'
    );
    expect(container.querySelector('script')).toBeNull();
    expect(container.querySelector('img')).toBeNull();

    // Clamped & fallback wetMixPct values
    expect(screen.getByTestId('effect-wet-readout-dup-id')).toHaveTextContent('100%');
    expect(screen.getByTestId('effect-wet-readout-nan-effect')).toHaveTextContent('100%');
    expect(screen.getByTestId('effect-wet-readout-neg-effect')).toHaveTextContent('0%');

    // Blank effect name falls back to 'Untitled Effect'
    expect(screen.getByTestId('effect-name-nan-effect')).toHaveTextContent('Untitled Effect');
    expect(screen.getByRole('slider', { name: 'Untitled Effect wet mix' })).toBeInTheDocument();
  });
});
