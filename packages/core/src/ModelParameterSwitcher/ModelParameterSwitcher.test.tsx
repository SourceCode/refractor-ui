import { createRef, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import {
  ModelParameterSwitcher,
  type AiModelOption,
  type ModelCapabilities,
} from './index';

const SAMPLE_MODELS: AiModelOption[] = [
  {
    id: 'gemini-flash',
    name: 'Gemini 2.5 Flash',
    provider: 'Google',
    contextWindow: '1M',
    speedTier: 'fast',
    badge: 'Default',
  },
  {
    id: 'claude-sonnet',
    name: 'Claude Sonnet',
    provider: 'Anthropic',
    contextWindow: '200K',
    speedTier: 'balanced',
  },
  {
    id: 'o3-pro',
    name: 'o3 Pro',
    contextWindow: '200K',
    speedTier: 'reasoning',
    badge: 'Deep',
  },
];

describe('ModelParameterSwitcher', () => {
  it('renders prism-crystal trigger with ref, displayName, theme overrides, default selection, and opens prism-slab popover', () => {
    const ref = createRef<HTMLDivElement>();

    render(
      <PrismThemeProvider
        theme={{
          components: {
            ModelParameterSwitcher: {
              className: 'theme-switcher',
              style: { letterSpacing: '0.15px' },
            },
          },
        }}
      >
        <ModelParameterSwitcher
          ref={ref}
          models={SAMPLE_MODELS}
          className="local-switcher"
          style={{ maxWidth: '420px' }}
          xstyle={{ '--prism-blur-px': '20px' }}
          data-testid="switcher-root"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('switcher-root');
    expect(ModelParameterSwitcher.displayName).toBe('ModelParameterSwitcher');
    expect(ref.current).toBe(root);
    expect(root).toHaveClass(
      'refractor-model-parameter-switcher',
      'theme-switcher',
      'local-switcher'
    );
    expect(root).toHaveStyle({ letterSpacing: '0.15px', maxWidth: '420px' });
    expect(root.style.getPropertyValue('--prism-blur-px')).toBe('20px');
    expect(root).toHaveAttribute('data-model-id', 'gemini-flash');
    expect(root).toHaveAttribute('data-speed-tier', 'fast');
    expect(root).not.toHaveAttribute('data-open');

    const trigger = screen.getByTestId('model-switcher-trigger');
    expect(trigger).toHaveClass('prism-crystal');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).toHaveAttribute('aria-haspopup', 'dialog');
    expect(trigger).not.toBeDisabled();
    expect(screen.getByTestId('model-switcher-selected-name')).toHaveTextContent(
      'Gemini 2.5 Flash'
    );
    expect(screen.getByTestId('model-switcher-context-pill')).toHaveTextContent('1M');
    const speedBadge = screen.getByTestId('model-switcher-speed-badge');
    expect(speedBadge).toHaveTextContent('Fast');
    expect(speedBadge).toHaveClass('prism-emerald');
    expect(screen.queryByTestId('model-switcher-popover')).not.toBeInTheDocument();

    // Click trigger to open popover
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(root).toHaveAttribute('data-open', 'true');

    const popover = screen.getByTestId('model-switcher-popover');
    expect(popover).toHaveClass('prism-slab');
    expect(popover).toHaveAttribute('role', 'dialog');

    // Verify all 3 speed tiers, providers, badges, and aria-selected states
    const listbox = screen.getByRole('listbox', { name: 'Model' });
    expect(listbox).toBeInTheDocument();

    const flashOpt = screen.getByTestId('model-option-gemini-flash');
    const sonnetOpt = screen.getByTestId('model-option-claude-sonnet');
    const o3Opt = screen.getByTestId('model-option-o3-pro');

    expect(flashOpt).toHaveAttribute('aria-selected', 'true');
    expect(sonnetOpt).toHaveAttribute('aria-selected', 'false');
    expect(o3Opt).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByTestId('model-badge-gemini-flash')).toHaveTextContent('Default');
    expect(screen.queryByTestId('model-badge-claude-sonnet')).not.toBeInTheDocument();
    expect(screen.getByTestId('model-badge-o3-pro')).toHaveTextContent('Deep');

    expect(screen.getByTestId('model-option-tier-gemini-flash')).toHaveClass('prism-emerald');
    expect(screen.getByTestId('model-option-tier-claude-sonnet')).toHaveClass(
      'prism-btn-secondary'
    );
    expect(screen.getByTestId('model-option-tier-o3-pro')).toHaveClass('prism-btn-primary');

    // Verify default capabilities and temperature
    expect(screen.getByRole('switch', { name: 'Web Search' })).toHaveAttribute(
      'aria-checked',
      'true'
    );
    expect(screen.getByRole('switch', { name: 'Code Execution' })).toHaveAttribute(
      'aria-checked',
      'true'
    );
    expect(screen.getByRole('switch', { name: 'Extended Thinking' })).toHaveAttribute(
      'aria-checked',
      'false'
    );
    expect(screen.getByTestId('temperature-value')).toHaveTextContent('0.4');
    const slider = screen.getByRole('slider', { name: 'Temperature' });
    expect(slider).toHaveAttribute('min', '0');
    expect(slider).toHaveAttribute('max', '2');
    expect(slider).toHaveAttribute('step', '0.1');
    expect(slider).toHaveValue('0.4');
  });

  it('switches models, toggles all three capability switches, and updates temperature slider in uncontrolled mode', () => {
    const onModelChange = vi.fn<(modelId: string) => void>();
    const onCapabilitiesChange = vi.fn<(caps: ModelCapabilities) => void>();

    render(
      <ModelParameterSwitcher
        models={SAMPLE_MODELS}
        defaultModelId="claude-sonnet"
        defaultCapabilities={{ webSearch: false, temperature: 1.2 }}
        defaultOpen
        onModelChange={onModelChange}
        onCapabilitiesChange={onCapabilitiesChange}
      />
    );

    expect(screen.getByTestId('model-switcher-selected-name')).toHaveTextContent('Claude Sonnet');
    expect(screen.getByTestId('model-switcher-speed-badge')).toHaveClass('prism-btn-secondary');
    expect(screen.getByTestId('temperature-value')).toHaveTextContent('1.2');

    // Select reasoning model
    fireEvent.click(screen.getByTestId('model-option-o3-pro'));
    expect(onModelChange).toHaveBeenCalledWith('o3-pro');
    expect(screen.getByTestId('model-switcher-selected-name')).toHaveTextContent('o3 Pro');
    expect(screen.getByTestId('model-switcher-speed-badge')).toHaveClass('prism-btn-primary');
    expect(screen.getByTestId('model-option-o3-pro')).toHaveAttribute('aria-selected', 'true');

    // Toggle Web Search (false -> true)
    const webSearch = screen.getByRole('switch', { name: 'Web Search' });
    expect(webSearch).toHaveAttribute('aria-checked', 'false');
    fireEvent.click(webSearch);
    expect(webSearch).toHaveAttribute('aria-checked', 'true');
    expect(onCapabilitiesChange).toHaveBeenLastCalledWith({
      webSearch: true,
      codeExecution: true,
      extendedThinking: false,
      temperature: 1.2,
    });

    // Toggle Code Execution (true -> false)
    const codeExecution = screen.getByRole('switch', { name: 'Code Execution' });
    fireEvent.click(codeExecution);
    expect(codeExecution).toHaveAttribute('aria-checked', 'false');
    expect(onCapabilitiesChange).toHaveBeenLastCalledWith({
      webSearch: true,
      codeExecution: false,
      extendedThinking: false,
      temperature: 1.2,
    });

    // Toggle Extended Thinking (false -> true)
    const extendedThinking = screen.getByRole('switch', { name: 'Extended Thinking' });
    fireEvent.click(extendedThinking);
    expect(extendedThinking).toHaveAttribute('aria-checked', 'true');
    expect(onCapabilitiesChange).toHaveBeenLastCalledWith({
      webSearch: true,
      codeExecution: false,
      extendedThinking: true,
      temperature: 1.2,
    });

    // Adjust Temperature slider
    const slider = screen.getByRole('slider', { name: 'Temperature' });
    fireEvent.change(slider, { target: { value: '0.8' } });
    expect(screen.getByTestId('temperature-value')).toHaveTextContent('0.8');
    expect(onCapabilitiesChange).toHaveBeenLastCalledWith({
      webSearch: true,
      codeExecution: false,
      extendedThinking: true,
      temperature: 0.8,
    });
  });

  it('supports controlled selectedModelId and capabilities props and clamps out-of-range temperatures', () => {
    function ControlledSwitcherHarness() {
      const [modelId, setModelId] = useState<string>('gemini-flash');
      const [caps, setCaps] = useState<ModelCapabilities>({
        webSearch: true,
        codeExecution: false,
        extendedThinking: true,
        temperature: 4.5,
      });

      return (
        <div>
          <span data-testid="external-model">{modelId}</span>
          <span data-testid="external-temp">{caps.temperature}</span>
          <ModelParameterSwitcher
            models={SAMPLE_MODELS}
            selectedModelId={modelId}
            onModelChange={setModelId}
            capabilities={caps}
            onCapabilitiesChange={setCaps}
            defaultOpen
          />
        </div>
      );
    }

    render(<ControlledSwitcherHarness />);

    // Clamped 4.5 -> 2.0
    expect(screen.getByTestId('temperature-value')).toHaveTextContent('2.0');
    expect(screen.getByTestId('temperature-fill')).toHaveStyle({ width: '100%' });

    fireEvent.click(screen.getByTestId('model-option-claude-sonnet'));
    expect(screen.getByTestId('external-model')).toHaveTextContent('claude-sonnet');

    const slider = screen.getByRole('slider', { name: 'Temperature' });
    fireEvent.change(slider, { target: { value: '0' } });
    expect(screen.getByTestId('temperature-value')).toHaveTextContent('0.0');
    expect(screen.getByTestId('external-temp')).toHaveTextContent('0');
  });

  it('clamps negative and NaN default temperatures safely (negative test)', () => {
    const { unmount } = render(
      <ModelParameterSwitcher
        models={SAMPLE_MODELS}
        defaultCapabilities={{ temperature: -2 }}
        defaultOpen
      />
    );
    expect(screen.getByTestId('temperature-value')).toHaveTextContent('0.0');
    unmount();

    render(
      <ModelParameterSwitcher
        models={SAMPLE_MODELS}
        defaultCapabilities={{ temperature: Number.NaN }}
        defaultOpen
      />
    );
    expect(screen.getByTestId('temperature-value')).toHaveTextContent('0.4');
  });

  it('closes popover on non-composing Escape or outside click while keeping open on inside click, non-Escape key, or composing Escape', () => {
    render(
      <div>
        <button type="button" data-testid="outside-btn">
          Outside
        </button>
        <ModelParameterSwitcher models={SAMPLE_MODELS} defaultOpen />
      </div>
    );

    expect(screen.getByTestId('model-switcher-popover')).toBeInTheDocument();

    // Non-Escape key keeps popover open
    fireEvent.keyDown(window, { key: 'Enter' });
    expect(screen.getByTestId('model-switcher-popover')).toBeInTheDocument();

    // Composing Escape keeps popover open (IME safety)
    fireEvent.keyDown(window, { key: 'Escape', isComposing: true });
    expect(screen.getByTestId('model-switcher-popover')).toBeInTheDocument();

    // Inside mousedown keeps popover open
    fireEvent.mouseDown(screen.getByTestId('model-switcher-popover'));
    expect(screen.getByTestId('model-switcher-popover')).toBeInTheDocument();

    // Outside mousedown closes popover
    fireEvent.mouseDown(screen.getByTestId('outside-btn'));
    expect(screen.queryByTestId('model-switcher-popover')).not.toBeInTheDocument();

    // Reopen and close via non-composing Escape
    fireEvent.click(screen.getByTestId('model-switcher-trigger'));
    expect(screen.getByTestId('model-switcher-popover')).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByTestId('model-switcher-popover')).not.toBeInTheDocument();
  });

  it('handles empty models array and unmatched selectedModelId gracefully (negative test)', () => {
    const { rerender } = render(<ModelParameterSwitcher models={[]} defaultOpen />);

    expect(screen.getByTestId('model-switcher-selected-name')).toHaveTextContent(
      'No models available'
    );
    expect(screen.queryByTestId('model-switcher-context-pill')).not.toBeInTheDocument();
    expect(screen.queryByTestId('model-switcher-speed-badge')).not.toBeInTheDocument();
    expect(screen.getByTestId('model-switcher-empty')).toHaveTextContent(
      'No models configured.'
    );

    // Explicit non-matching selectedModelId with non-empty models
    rerender(
      <ModelParameterSwitcher
        models={SAMPLE_MODELS}
        selectedModelId="unknown-model"
        defaultOpen
      />
    );
    expect(screen.getByTestId('model-switcher-selected-name')).toHaveTextContent('Select model');
    expect(screen.getByTestId('model-option-gemini-flash')).toHaveAttribute(
      'aria-selected',
      'false'
    );
  });

  it('disables trigger and suppresses popover when disabled is true (negative test)', () => {
    render(
      <ModelParameterSwitcher
        models={SAMPLE_MODELS}
        defaultOpen
        disabled
        data-testid="disabled-switcher"
      />
    );

    const root = screen.getByTestId('disabled-switcher');
    const trigger = screen.getByTestId('model-switcher-trigger');
    expect(root).toHaveAttribute('data-disabled', 'true');
    expect(trigger).toBeDisabled();
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByTestId('model-switcher-popover')).not.toBeInTheDocument();

    fireEvent.click(trigger);
    expect(screen.queryByTestId('model-switcher-popover')).not.toBeInTheDocument();
  });

  it('renders XSS payloads in model name, provider, contextWindow, and badge as literal text (adversarial test)', () => {
    const payload = '<script>window.__switcherXss=1</script><img src=x onerror=alert(1)>';
    const hostileModels: AiModelOption[] = [
      {
        id: 'xss-model',
        name: payload,
        provider: payload,
        contextWindow: payload,
        speedTier: 'fast',
        badge: payload,
      },
    ];

    render(<ModelParameterSwitcher models={hostileModels} defaultOpen />);

    expect(document.querySelector('script')).toBeNull();
    expect(document.querySelector('img')).toBeNull();
    expect(screen.getByTestId('model-switcher-selected-name')).toHaveTextContent(payload);
    expect(screen.getByTestId('model-badge-xss-model')).toHaveTextContent(payload);
  });
});
