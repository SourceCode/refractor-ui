import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import { TextArea } from './TextArea';

describe('TextArea', () => {
  it('renders label, live character counter, helper text, forwards React 19 ref, and supports Ctrl+Enter', () => {
    const ref = createRef<HTMLTextAreaElement>();
    const onChange = vi.fn();
    const onEnter = vi.fn();
    const onKeyDown = vi.fn();

    const { container } = render(
      <TextArea
        ref={ref}
        id="notes-area"
        label="Release notes"
        value="Refractor v1"
        maxCharacters={120}
        helperText="Summarize highlights"
        className="custom-area"
        style={{ width: '400px' }}
        xstyle={{ '--prism-blur-px': '14px' }}
        data-testid="notes-field"
        onChange={onChange}
        onKeyDown={onKeyDown}
        onEnter={onEnter}
      />
    );

    const root = container.firstElementChild as HTMLDivElement;
    expect(root).toHaveClass('refractor-text-area', 'w-full', 'custom-area');
    expect(root).toHaveStyle({ width: '400px' });

    const area = screen.getByLabelText('Release notes') as HTMLTextAreaElement;
    expect(ref.current).toBe(area);
    expect(screen.getByTestId('notes-field')).toBe(area);
    expect(area).toHaveAttribute('maxlength', '120');
    expect(area).toHaveAttribute('aria-describedby', 'notes-area-message');
    expect(screen.getByText('12 / 120')).toBeInTheDocument();
    expect(screen.getByText('Summarize highlights')).toBeInTheDocument();

    fireEvent.change(area, { target: { value: 'Updated' } });
    expect(onChange).toHaveBeenCalledTimes(1);

    // Plain Enter does NOT submit multi-line textarea
    fireEvent.keyDown(area, { key: 'Enter' });
    expect(onEnter).not.toHaveBeenCalled();

    // Ctrl+Enter submits
    fireEvent.keyDown(area, { key: 'Enter', ctrlKey: true });
    expect(onKeyDown).toHaveBeenCalledTimes(2);
    expect(onEnter).toHaveBeenCalledWith('Refractor v1');
  });

  it('guards Ctrl/Cmd+Enter during IME composition', () => {
    const onEnter = vi.fn();
    render(<TextArea aria-label="IME area" defaultValue="テスト" onEnter={onEnter} />);
    const area = screen.getByLabelText('IME area');

    const composingEvent = new KeyboardEvent('keydown', { key: 'Enter', metaKey: true, bubbles: true });
    Object.defineProperty(composingEvent, 'isComposing', { value: true });
    fireEvent(area, composingEvent);
    expect(onEnter).not.toHaveBeenCalled();

    fireEvent.keyDown(area, { key: 'Enter', metaKey: true });
    expect(onEnter).toHaveBeenCalledWith('テスト');
  });

  it('supports counter without label, error state, disabled state, and theme overrides', () => {
    const { container } = render(
      <PrismThemeProvider
        theme={{
          components: {
            TextArea: { className: 'theme-area', style: { padding: '2px' } },
          },
        }}
      >
        <TextArea
          aria-label="Counter only"
          maxCharacters={50}
          errorText="Field cannot be empty"
          disabled
          className="local-area"
        />
      </PrismThemeProvider>
    );

    const root = container.querySelector('.refractor-text-area') as HTMLDivElement;
    expect(root).toHaveClass('refractor-text-area', 'theme-area', 'local-area');
    expect(root).toHaveAttribute('data-invalid', 'true');
    expect(root).toHaveAttribute('data-disabled', 'true');
    expect(root).toHaveStyle({ padding: '2px' });

    const area = screen.getByLabelText('Counter only');
    expect(area).toBeDisabled();
    expect(area).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText('0 / 50')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Field cannot be empty');
  });

  it('safely renders adversarial XSS strings in label, value, and helperText', () => {
    const payload = '<script>window.__xss=1</script><img src=x onerror=alert(1)>';
    render(<TextArea label={payload} value={payload} onChange={vi.fn()} helperText={payload} />);
    expect(screen.getByLabelText(payload)).toHaveValue(payload);
    expect(screen.getByText(payload, { selector: 'p' })).toBeInTheDocument();
    expect(document.querySelector('script')).toBeNull();
  });
});
