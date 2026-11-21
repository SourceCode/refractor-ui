import { createRef, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import { PromptComposer, type PromptModelOption } from './index';

const SAMPLE_MODELS: readonly PromptModelOption[] = [
  { id: 'prism-pro', label: 'Prism Pro', badge: 'Reasoning' },
  { id: 'prism-flash', label: 'Prism Flash', badge: 'Fast' },
  { id: 'prism-base', label: 'Prism Base' },
];

describe('PromptComposer', () => {
  it('renders optical slab, theme overrides, xstyle, React 19 ref, and auto-expands textarea', () => {
    const ref = createRef<HTMLDivElement>();

    render(
      <PrismThemeProvider
        theme={{
          components: {
            PromptComposer: { className: 'theme-composer', style: { opacity: 0.99 } },
          },
        }}
      >
        <PromptComposer
          ref={ref}
          className="custom-composer"
          xstyle={{ '--prism-blur-px': '20px' }}
          data-testid="composer-root"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('composer-root');
    expect(ref.current).toBe(root);
    expect(root).toHaveClass('refractor-prompt-composer', 'prism-slab', 'theme-composer', 'custom-composer');
    expect(root).toHaveStyle({ opacity: '0.99' });
    expect(PromptComposer.displayName).toBe('PromptComposer');

    const textarea = screen.getByRole('textbox', { name: 'Prompt input' });
    expect(textarea).toHaveAttribute('placeholder', 'Ask anything or describe what to build...');
    expect(textarea).toHaveClass('resize-none');

    // No model selector or character counter when omitted
    expect(screen.queryByRole('combobox', { name: 'Select model' })).not.toBeInTheDocument();
    expect(screen.queryByTestId('prompt-char-count')).not.toBeInTheDocument();
    expect(screen.queryByTestId('prompt-attachments-badge')).not.toBeInTheDocument();

    // Send button starts disabled with disabled:cursor-not-allowed
    const sendBtn = screen.getByRole('button', { name: 'Send prompt' });
    expect(sendBtn).toBeDisabled();
    expect(sendBtn).toHaveClass('disabled:cursor-not-allowed');

    // Auto-expanding textarea clamps height to 200px max
    Object.defineProperty(textarea, 'scrollHeight', { configurable: true, value: 92 });
    fireEvent.change(textarea, { target: { value: 'Line 1\nLine 2\nLine 3' } });
    expect(textarea.style.height).toBe('92px');

    Object.defineProperty(textarea, 'scrollHeight', { configurable: true, value: 420 });
    fireEvent.change(textarea, { target: { value: 'Line 1\nLine 2\nLine 3\nLine 4' } });
    expect(textarea.style.height).toBe('200px');
  });

  it('handles IME-safe Enter submit, Shift+Enter newline, whitespace guard, and uncontrolled reset', () => {
    const onSubmit = vi.fn();
    const onChange = vi.fn();

    render(
      <PromptComposer
        defaultValue="   "
        models={SAMPLE_MODELS}
        defaultModelId="prism-flash"
        onChange={onChange}
        onSubmit={onSubmit}
      />
    );

    const textarea = screen.getByRole('textbox', { name: 'Prompt input' });
    const sendBtn = screen.getByRole('button', { name: 'Send prompt' });

    // Whitespace-only input is ignored
    expect(sendBtn).toBeDisabled();
    fireEvent.keyDown(textarea, { key: 'Enter' });
    expect(onSubmit).not.toHaveBeenCalled();

    // Type valid prompt
    fireEvent.change(textarea, { target: { value: '  Build a crystal card  ' } });
    expect(onChange).toHaveBeenCalledWith('  Build a crystal card  ');
    expect(sendBtn).toBeEnabled();

    // Shift+Enter does NOT submit
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true });
    expect(onSubmit).not.toHaveBeenCalled();

    // IME composing Enter does NOT submit
    const imeEvent = new KeyboardEvent('keydown', {
      key: 'Enter',
      bubbles: true,
      cancelable: true,
    });
    Object.defineProperty(imeEvent, 'isComposing', { value: true });
    textarea.dispatchEvent(imeEvent);
    expect(onSubmit).not.toHaveBeenCalled();

    // Regular Enter submits trimmed value + selected modelId and clears uncontrolled input
    fireEvent.keyDown(textarea, { key: 'Enter' });
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith('Build a crystal card', 'prism-flash');
    expect(textarea).toHaveValue('');

    // Clicking Send button submits as well
    fireEvent.change(textarea, { target: { value: 'Second prompt' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send prompt' }));
    expect(onSubmit).toHaveBeenLastCalledWith('Second prompt', 'prism-flash');
    expect(textarea).toHaveValue('');
  });

  it('supports attachment badge, voice toggle, model selector, character counter, and generating Stop button', () => {
    const onAttachClick = vi.fn();
    const onVoiceToggle = vi.fn();
    const onModelChange = vi.fn();
    const onSubmit = vi.fn();
    const onStop = vi.fn();

    const { rerender } = render(
      <PromptComposer
        defaultValue="Hello"
        models={SAMPLE_MODELS}
        attachmentsCount={3}
        maxLength={10}
        onAttachClick={onAttachClick}
        onVoiceToggle={onVoiceToggle}
        onModelChange={onModelChange}
        onSubmit={onSubmit}
        onStop={onStop}
      />
    );

    // Attachment button & tabular count badge
    const attachBtn = screen.getByRole('button', { name: 'Attach files (3 attached)' });
    expect(screen.getByTestId('prompt-attachments-badge')).toHaveTextContent('3');
    fireEvent.click(attachBtn);
    expect(onAttachClick).toHaveBeenCalledTimes(1);

    // Voice toggle button with aria-pressed
    const voiceBtn = screen.getByRole('button', { name: 'Start voice input' });
    expect(voiceBtn).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(voiceBtn);
    expect(onVoiceToggle).toHaveBeenLastCalledWith(true);
    expect(screen.getByRole('button', { name: 'Stop voice input' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    fireEvent.click(screen.getByRole('button', { name: 'Stop voice input' }));
    expect(onVoiceToggle).toHaveBeenLastCalledWith(false);

    // Model selector changes model and toggles badge display
    const select = screen.getByRole('combobox', { name: 'Select model' });
    expect(select).toHaveValue('prism-pro');
    expect(screen.getByTestId('prompt-model-badge')).toHaveTextContent('Reasoning');

    fireEvent.change(select, { target: { value: 'prism-base' } });
    expect(onModelChange).toHaveBeenCalledWith('prism-base');
    expect(select).toHaveValue('prism-base');
    expect(screen.queryByTestId('prompt-model-badge')).not.toBeInTheDocument();

    // Character counter displays live tabular count and warning highlight at limit
    const counter = screen.getByTestId('prompt-char-count');
    expect(counter).toHaveTextContent('5 / 10');
    fireEvent.change(screen.getByRole('textbox', { name: 'Prompt input' }), {
      target: { value: '1234567890' },
    });
    expect(counter).toHaveTextContent('10 / 10');
    expect(counter.style.color).toBe('var(--prism-warning-main)');

    // Generating mode swaps Send to Stop button and blocks Enter submit
    rerender(
      <PromptComposer
        defaultValue="1234567890"
        models={SAMPLE_MODELS}
        isGenerating
        onSubmit={onSubmit}
        onStop={onStop}
      />
    );

    expect(screen.queryByRole('button', { name: 'Send prompt' })).not.toBeInTheDocument();
    const stopBtn = screen.getByRole('button', { name: 'Stop generating' });
    expect(stopBtn).toHaveTextContent('Stop');

    fireEvent.keyDown(screen.getByRole('textbox', { name: 'Prompt input' }), { key: 'Enter' });
    expect(onSubmit).not.toHaveBeenCalled();

    fireEvent.click(stopBtn);
    expect(onStop).toHaveBeenCalledTimes(1);
  });

  it('supports controlled value & model state and disabled lockouts', () => {
    const onSubmit = vi.fn();

    function ControlledHarness() {
      const [val, setVal] = useState('Controlled prompt');
      const [modelId, setModelId] = useState('non-existent-id');
      return (
        <PromptComposer
          value={val}
          onChange={setVal}
          models={SAMPLE_MODELS}
          selectedModelId={modelId}
          onModelChange={setModelId}
          onSubmit={onSubmit}
        />
      );
    }

    const { unmount } = render(<ControlledHarness />);
    // Unknown selectedModelId falls back gracefully to first model
    const select = screen.getByRole('combobox', { name: 'Select model' });
    expect(select).toHaveValue('prism-pro');

    fireEvent.click(screen.getByRole('button', { name: 'Send prompt' }));
    expect(onSubmit).toHaveBeenCalledWith('Controlled prompt', 'prism-pro');
    // Controlled value remains controlled by parent
    expect(screen.getByRole('textbox', { name: 'Prompt input' })).toHaveValue('Controlled prompt');
    unmount();

    // Disabled state + non-finite maxLength / negative attachmentsCount guard
    render(
      <PromptComposer
        defaultValue="Locked text"
        disabled
        models={SAMPLE_MODELS}
        maxLength={Number.POSITIVE_INFINITY}
        attachmentsCount={-2}
        onSubmit={onSubmit}
      />
    );

    expect(screen.getByRole('textbox', { name: 'Prompt input' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Attach files' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Start voice input' })).toBeDisabled();
    expect(screen.getByRole('combobox', { name: 'Select model' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Send prompt' })).toBeDisabled();
    expect(screen.queryByTestId('prompt-char-count')).not.toBeInTheDocument();
    expect(screen.queryByTestId('prompt-attachments-badge')).not.toBeInTheDocument();
  });

  it('deduplicates prototype-polluting model IDs and defends against XSS payloads (adversarial)', () => {
    const xss = '<script>window.__promptXss=1</script><img src=x onerror=alert(1)>';
    const onSubmit = vi.fn();
    const models: PromptModelOption[] = [
      { id: '__proto__', label: xss, badge: xss },
      { id: '__proto__', label: 'Duplicate Model Should Be Ignored' },
      { id: 'constructor', label: 'Constructor Safe' },
    ];

    render(
      <PromptComposer
        defaultValue={xss}
        placeholder={xss}
        models={models}
        onSubmit={onSubmit}
      />
    );

    expect(document.querySelector('script')).toBeNull();
    expect(screen.queryByText('Duplicate Model Should Be Ignored')).not.toBeInTheDocument();
    expect(screen.getByTestId('prompt-model-badge')).toHaveTextContent(xss);
    expect(screen.getAllByRole('option')).toHaveLength(2);

    fireEvent.click(screen.getByRole('button', { name: 'Send prompt' }));
    expect(onSubmit).toHaveBeenCalledWith(xss, '__proto__');
    expect(({} as Record<string, string>)['__proto__']).not.toBe(xss);
  });
});
