import { createRef, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import { InlineEditableField } from './InlineEditableField';

describe('InlineEditableField', () => {
  it('renders view mode crystal capsule, placeholder, ariaLabel, ref, and theme overrides', () => {
    const ref = createRef<HTMLDivElement>();

    const { rerender } = render(
      <PrismThemeProvider
        theme={{
          components: {
            InlineEditableField: {
              className: 'theme-inline-field',
              style: { letterSpacing: '0.2px' },
            },
          },
        }}
      >
        <InlineEditableField
          ref={ref}
          ariaLabel="Project title"
          className="local-inline-field"
          xstyle={{ '--prism-blur-px': '12px' }}
          data-testid="inline-field"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('inline-field');
    expect(ref.current).toBe(root);
    expect(root).toHaveClass(
      'refractor-inline-editable-field',
      'theme-inline-field',
      'local-inline-field'
    );
    expect(root).toHaveStyle({ letterSpacing: '0.2px' });

    const trigger = screen.getByRole('button', { name: 'Project title' });
    expect(trigger).toHaveClass('prism-crystal', 'prism-focus-ring', 'disabled:cursor-not-allowed');
    expect(trigger).toHaveTextContent('Click to edit...');

    rerender(
      <InlineEditableField
        defaultValue="Optical Prism Engine"
        placeholder="Add title..."
        data-testid="inline-field"
      />
    );
    expect(screen.getByRole('button', { name: 'Optical Prism Engine' })).toBeInTheDocument();
  });

  it('activates edit mode via click, Enter, and Space, saves via button or IME-safe Enter, and cancels cleanly', () => {
    const onSave = vi.fn();
    const onCancel = vi.fn();

    render(
      <InlineEditableField
        defaultValue="Initial Title"
        ariaLabel="Document name"
        onSave={onSave}
        onCancel={onCancel}
      />
    );

    const trigger = screen.getByRole('button', { name: 'Document name' });

    // Non-activation key does nothing
    fireEvent.keyDown(trigger, { key: 'a' });
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();

    // Activate via Enter key
    fireEvent.keyDown(trigger, { key: 'Enter' });
    const input = screen.getByRole('textbox', { name: 'Document name' });
    expect(input).toHaveValue('Initial Title');
    expect(input).toHaveClass('prism-well');
    expect(document.activeElement).toBe(input);

    // Save & Cancel micro-buttons carry optical glass classes
    const saveBtn = screen.getByRole('button', { name: 'Save' });
    const cancelBtn = screen.getByRole('button', { name: 'Cancel' });
    expect(saveBtn).toHaveClass('prism-emerald', 'prism-focus-ring');
    expect(cancelBtn).toHaveClass('prism-crystal', 'prism-focus-ring');

    // IME-composing Enter & Escape are ignored
    fireEvent.change(input, { target: { value: 'Draft During IME' } });
    const composingEnter = new KeyboardEvent('keydown', {
      key: 'Enter',
      bubbles: true,
      cancelable: true,
    });
    Object.defineProperty(composingEnter, 'isComposing', { value: true });
    fireEvent(input, composingEnter);
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByRole('textbox')).toBeInTheDocument();

    const composingEsc = new KeyboardEvent('keydown', {
      key: 'Escape',
      bubbles: true,
      cancelable: true,
    });
    Object.defineProperty(composingEsc, 'isComposing', { value: true });
    fireEvent(input, composingEsc);
    expect(onCancel).not.toHaveBeenCalled();
    expect(screen.getByRole('textbox')).toBeInTheDocument();

    // Escape cancels and reverts to original value
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Document name' })).toHaveTextContent('Initial Title');
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Document name' }));

    // Activate via Space key and commit via non-composing Enter
    fireEvent.keyDown(screen.getByRole('button', { name: 'Document name' }), { key: ' ' });
    const input2 = screen.getByRole('textbox', { name: 'Document name' });
    fireEvent.change(input2, { target: { value: 'Saved Via Enter' } });
    fireEvent.keyDown(input2, { key: 'Enter' });
    expect(onSave).toHaveBeenLastCalledWith('Saved Via Enter');
    expect(screen.getByRole('button', { name: 'Document name' })).toHaveTextContent('Saved Via Enter');

    // Activate via click, test Cancel micro-button mousedown + click
    fireEvent.click(screen.getByRole('button', { name: 'Document name' }));
    const input3 = screen.getByRole('textbox', { name: 'Document name' });
    fireEvent.change(input3, { target: { value: 'Will Discard' } });
    const cancelBtn3 = screen.getByRole('button', { name: 'Cancel' });
    const cancelMouseDown = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
    fireEvent(cancelBtn3, cancelMouseDown);
    expect(cancelMouseDown.defaultPrevented).toBe(true);
    fireEvent.click(cancelBtn3);
    expect(onCancel).toHaveBeenCalledTimes(2);
    expect(screen.getByRole('button', { name: 'Document name' })).toHaveTextContent('Saved Via Enter');

    // Activate via click and save via Save micro-button
    fireEvent.click(screen.getByRole('button', { name: 'Document name' }));
    const input4 = screen.getByRole('textbox', { name: 'Document name' });
    fireEvent.change(input4, { target: { value: 'Saved Via Button' } });
    const saveBtn4 = screen.getByRole('button', { name: 'Save' });
    const saveMouseDown = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
    fireEvent(saveBtn4, saveMouseDown);
    expect(saveMouseDown.defaultPrevented).toBe(true);
    fireEvent.click(saveBtn4);
    expect(onSave).toHaveBeenLastCalledWith('Saved Via Button');
    expect(screen.getByRole('button', { name: 'Document name' })).toHaveTextContent('Saved Via Button');
  });

  it('supports multiline textarea mode with IME-safe Ctrl/Cmd+Enter save and Escape cancel', () => {
    const onSave = vi.fn();
    const onCancel = vi.fn();

    render(
      <InlineEditableField
        multiline
        defaultValue={'Line 1\nLine 2'}
        onSave={onSave}
        onCancel={onCancel}
      />
    );

    fireEvent.click(screen.getByRole('button'));
    const textarea = screen.getByRole('textbox', { name: 'Editable field' });
    expect(textarea.tagName).toBe('TEXTAREA');
    expect(document.activeElement).toBe(textarea);

    // Plain Enter does NOT save in multiline mode
    fireEvent.change(textarea, { target: { value: 'Line 1\nLine 2\nLine 3' } });
    fireEvent.keyDown(textarea, { key: 'Enter' });
    expect(onSave).not.toHaveBeenCalled();

    // IME-composing Ctrl+Enter does NOT save
    const composingCtrlEnter = new KeyboardEvent('keydown', {
      key: 'Enter',
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    });
    Object.defineProperty(composingCtrlEnter, 'isComposing', { value: true });
    fireEvent(textarea, composingCtrlEnter);
    expect(onSave).not.toHaveBeenCalled();

    // Non-composing Ctrl+Enter saves
    fireEvent.keyDown(textarea, { key: 'Enter', ctrlKey: true });
    expect(onSave).toHaveBeenLastCalledWith('Line 1\nLine 2\nLine 3');

    // Cmd+Enter (metaKey) also saves
    fireEvent.click(screen.getByRole('button'));
    const textarea2 = screen.getByRole('textbox');
    fireEvent.change(textarea2, { target: { value: 'Cmd Saved' } });
    fireEvent.keyDown(textarea2, { key: 'Enter', metaKey: true });
    expect(onSave).toHaveBeenLastCalledWith('Cmd Saved');

    // Escape cancels multiline edit
    fireEvent.click(screen.getByRole('button'));
    const textarea3 = screen.getByRole('textbox');
    fireEvent.change(textarea3, { target: { value: 'Unsaved' } });
    fireEvent.keyDown(textarea3, { key: 'Escape' });
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button')).toHaveTextContent('Cmd Saved');

    // Multiline required validation alert & clearing error on input
    render(<InlineEditableField multiline required defaultValue="Notes" onSave={onSave} />);
    fireEvent.click(screen.getByRole('button', { name: 'Notes' }));
    const reqArea = screen.getByRole('textbox');
    fireEvent.change(reqArea, { target: { value: '   ' } });
    fireEvent.keyDown(reqArea, { key: 'Enter', ctrlKey: true });
    expect(screen.getByRole('alert')).toHaveTextContent('This field is required.');
    expect(reqArea).toHaveAttribute('aria-describedby', screen.getByRole('alert').id);
    fireEvent.change(reqArea, { target: { value: 'Updated Notes' } });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('enforces required and custom validate rules with role="alert" and preserves original value on error', () => {
    const onSave = vi.fn();
    const validate = vi.fn((draft: string) =>
      draft.length < 4 ? 'Must be at least 4 characters.' : null
    );

    render(
      <InlineEditableField
        defaultValue="Original"
        ariaLabel="Slug"
        required
        validate={validate}
        onSave={onSave}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Slug' }));
    const input = screen.getByRole('textbox', { name: 'Slug' });

    // Whitespace-only rejected by required
    fireEvent.change(input, { target: { value: '   ' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('This field is required.');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAttribute('aria-describedby', screen.getByRole('alert').id);

    // Typing clears the active validation alert
    fireEvent.change(input, { target: { value: 'ab' } });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    // Custom validate rejects short string
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('Must be at least 4 characters.');

    // Canceling after validation error restores original value intact
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.getByRole('button', { name: 'Slug' })).toHaveTextContent('Original');

    // Valid draft passes both required and validate
    fireEvent.click(screen.getByRole('button', { name: 'Slug' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Slug' }), {
      target: { value: 'valid-slug' },
    });
    fireEvent.keyDown(screen.getByRole('textbox', { name: 'Slug' }), { key: 'Enter' });
    expect(onSave).toHaveBeenCalledWith('valid-slug');
  });

  it('handles saveOnBlur cleanly without hijacking clicks on Cancel/Save micro-buttons', () => {
    const onSave = vi.fn();
    const onCancel = vi.fn();

    const { rerender } = render(
      <InlineEditableField
        defaultValue="Alpha"
        ariaLabel="Tag"
        saveOnBlur={false}
        onSave={onSave}
        onCancel={onCancel}
      />
    );

    // When saveOnBlur=false, blur does not save or exit edit mode
    fireEvent.click(screen.getByRole('button', { name: 'Tag' }));
    const inputOff = screen.getByRole('textbox', { name: 'Tag' });
    fireEvent.change(inputOff, { target: { value: 'Beta' } });
    fireEvent.blur(inputOff);
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByRole('textbox', { name: 'Tag' })).toBeInTheDocument();
    fireEvent.keyDown(inputOff, { key: 'Escape' });

    // When saveOnBlur=true, blur to Cancel button inside edit container does NOT trigger save
    rerender(
      <InlineEditableField
        defaultValue="Alpha"
        ariaLabel="Tag"
        saveOnBlur
        required
        onSave={onSave}
        onCancel={onCancel}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Tag' }));
    const inputOn = screen.getByRole('textbox', { name: 'Tag' });
    const cancelBtn = screen.getByRole('button', { name: 'Cancel' });
    fireEvent.change(inputOn, { target: { value: 'Gamma' } });
    fireEvent.blur(inputOn, { relatedTarget: cancelBtn });
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByRole('textbox', { name: 'Tag' })).toBeInTheDocument();

    // Blur to external target saves cleanly
    fireEvent.blur(inputOn, { relatedTarget: document.body });
    expect(onSave).toHaveBeenLastCalledWith('Gamma');
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();

    // Blur with invalid value stays open with alert
    fireEvent.click(screen.getByRole('button', { name: 'Tag' }));
    const inputInvalid = screen.getByRole('textbox', { name: 'Tag' });
    fireEvent.change(inputInvalid, { target: { value: '   ' } });
    fireEvent.blur(inputInvalid, { relatedTarget: null });
    expect(screen.getByRole('alert')).toHaveTextContent('This field is required.');
    expect(screen.getByRole('textbox', { name: 'Tag' })).toBeInTheDocument();
  });

  it('operates in controlled mode, blocks disabled activation, and renders XSS strings safely as literal text', () => {
    function ControlledHarness() {
      const [val, setVal] = useState('Controlled Value');
      return (
        <InlineEditableField
          value={val}
          ariaLabel="Controlled field"
          onSave={setVal}
        />
      );
    }

    render(<ControlledHarness />);
    fireEvent.click(screen.getByRole('button', { name: 'Controlled field' }));
    const xss = '<script>window.__xss=1</script><img src=x onerror=alert(1)>';
    fireEvent.change(screen.getByRole('textbox', { name: 'Controlled field' }), {
      target: { value: xss },
    });
    fireEvent.keyDown(screen.getByRole('textbox', { name: 'Controlled field' }), {
      key: 'Enter',
    });
    expect(screen.getByRole('button', { name: 'Controlled field' })).toHaveTextContent(xss);
    expect(document.querySelector('script')).toBeNull();
    expect(document.querySelector('img')).toBeNull();

    // Disabled blocks click, Enter, and Space activation, and immediately closes editing if toggled mid-edit
    const onSave = vi.fn();
    const { rerender } = render(
      <InlineEditableField
        defaultValue="Locked"
        ariaLabel="Locked field"
        disabled
        onSave={onSave}
        data-testid="locked-root"
      />
    );
    const lockedBtn = screen.getByRole('button', { name: 'Locked field' });
    expect(lockedBtn).toBeDisabled();
    expect(screen.getByTestId('locked-root')).toHaveAttribute('data-disabled', 'true');
    fireEvent.click(lockedBtn);
    fireEvent.keyDown(lockedBtn, { key: 'Enter' });
    fireEvent.keyDown(lockedBtn, { key: ' ' });
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();

    // Unlock -> enter edit mode -> disable mid-edit -> safely exits edit mode
    rerender(
      <InlineEditableField
        defaultValue="Locked"
        ariaLabel="Locked field"
        disabled={false}
        onSave={onSave}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Locked field' }));
    expect(screen.getByRole('textbox', { name: 'Locked field' })).toBeInTheDocument();

    rerender(
      <InlineEditableField
        defaultValue="Locked"
        ariaLabel="Locked field"
        disabled
        onSave={onSave}
      />
    );
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });
});
