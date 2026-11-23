'use client';

import {
  memo,
  useEffect,
  useId,
  useRef,
  useState,
  type FocusEvent,
} from 'react';
import { Check, Pencil, X } from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { cx, mergeProps } from '../utils/mergeProps';
import { themeProps } from '../utils/themeProps';

type InlineEditableFieldBaseProps = Omit<BaseProps<HTMLDivElement>, 'children' | 'onChange'>;

export interface InlineEditableFieldProps extends InlineEditableFieldBaseProps {
  /** Controlled text value. */
  value?: string;
  /** Initial uncontrolled text value. */
  defaultValue?: string;
  /** Callback invoked with the validated draft value when saved. */
  onSave?: (nextValue: string) => void;
  /** Callback invoked when editing is canceled via Escape or the Cancel micro-button. */
  onCancel?: () => void;
  /** Placeholder text shown when the field value is empty (defaults to 'Click to edit...'). */
  placeholder?: string;
  /** Accessible label bound to the view trigger and active editor input/textarea. */
  ariaLabel?: string;
  /** Rejects empty or whitespace-only commits with a live validation alert (defaults to false). */
  required?: boolean;
  /** Optional custom validation callback returning an error string or null when valid. */
  validate?: (draft: string) => string | null;
  /** Automatically validates and commits changes when focus leaves the edit controls (defaults to false). */
  saveOnBlur?: boolean;
  /** Renders a multiline textarea with Ctrl/Cmd+Enter save when true (defaults to false). */
  multiline?: boolean;
  /** Prevents entering edit mode and dims the crystal capsule trigger (defaults to false). */
  disabled?: boolean;
}

function InlineEditableFieldInner({
  value,
  defaultValue = '',
  onSave,
  onCancel,
  placeholder = 'Click to edit...',
  ariaLabel,
  required = false,
  validate,
  saveOnBlur = false,
  multiline = false,
  disabled = false,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: InlineEditableFieldProps) {
  const override = useComponentOverride('InlineEditableField');
  const errorId = useId();

  const isControlled = value !== undefined;
  const [internalValue, setInternalValue] = useState<string>(defaultValue);
  const currentValue = isControlled ? value : internalValue;

  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<string>(currentValue);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const editGroupRef = useRef<HTMLDivElement | null>(null);
  const shouldRestoreFocusRef = useRef(false);

  const editingActive = isEditing && !disabled;

  useEffect(() => {
    if (editingActive) {
      if (multiline) {
        textareaRef.current?.focus();
      } else {
        inputRef.current?.focus();
      }
      return;
    }

    if (shouldRestoreFocusRef.current) {
      shouldRestoreFocusRef.current = false;
      triggerRef.current?.focus();
    }
  }, [editingActive, multiline]);

  const startEditing = () => {
    setDraft(currentValue);
    setErrorMessage(null);
    setIsEditing(true);
  };

  const handleSave = (restoreFocus: boolean) => {
    if (required && draft.trim().length === 0) {
      setErrorMessage('This field is required.');
      return;
    }
    if (validate) {
      const customError = validate(draft);
      if (customError) {
        setErrorMessage(customError);
        return;
      }
    }
    setErrorMessage(null);
    if (!isControlled) {
      setInternalValue(draft);
    }
    shouldRestoreFocusRef.current = restoreFocus;
    setIsEditing(false);
    onSave?.(draft);
  };

  const handleCancel = (restoreFocus: boolean) => {
    setDraft(currentValue);
    setErrorMessage(null);
    shouldRestoreFocusRef.current = restoreFocus;
    setIsEditing(false);
    onCancel?.();
  };

  const handleEditorBlur = (e: FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (!saveOnBlur) return;
    const nextTarget = e.relatedTarget;
    if (nextTarget instanceof Node && editGroupRef.current?.contains(nextTarget)) {
      return;
    }
    handleSave(false);
  };

  const merged = mergeProps({
    themeTarget: themeProps('inline-editable-field', {
      editing: editingActive,
      multiline,
      disabled,
      invalid: Boolean(errorMessage),
    }),
    baseClassName: 'w-full',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  const viewClass = stableClassName('inline-editable-field', 'view');
  const editorClass = stableClassName('inline-editable-field', 'editor');
  const actionsClass = stableClassName('inline-editable-field', 'actions');

  const hasValue = currentValue.length > 0;
  const editorAriaLabel = ariaLabel ?? 'Editable field';

  return (
    <div ref={ref} {...rest} {...merged}>
      {editingActive ? (
        <div
          ref={editGroupRef}
          className={cx(
            editorClass,
            'flex gap-2',
            multiline ? 'items-start' : 'items-center'
          )}
        >
          <div
            className={cx(
              'prism-crystal flex-1 p-1 transition-[color,background-color,border-color,opacity,transform]',
              multiline ? 'rounded-2xl' : 'rounded-full',
              errorMessage
                ? 'ring-2 ring-red-500/70'
                : 'focus-within:ring-2 focus-within:ring-sky-400/70'
            )}
          >
            {multiline ? (
              <textarea
                ref={textareaRef}
                value={draft}
                placeholder={placeholder}
                aria-label={editorAriaLabel}
                aria-invalid={Boolean(errorMessage)}
                aria-describedby={errorMessage ? errorId : undefined}
                rows={3}
                onChange={(e) => {
                  setDraft(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                onBlur={handleEditorBlur}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && !e.nativeEvent.isComposing) {
                    e.preventDefault();
                    handleSave(true);
                  } else if (e.key === 'Escape' && !e.nativeEvent.isComposing) {
                    e.preventDefault();
                    handleCancel(true);
                  }
                }}
                className="prism-well w-full min-h-[84px] rounded-xl px-3.5 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none resize-y block"
              />
            ) : (
              <input
                ref={inputRef}
                type="text"
                value={draft}
                placeholder={placeholder}
                aria-label={editorAriaLabel}
                aria-invalid={Boolean(errorMessage)}
                aria-describedby={errorMessage ? errorId : undefined}
                onChange={(e) => {
                  setDraft(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                onBlur={handleEditorBlur}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                    e.preventDefault();
                    handleSave(true);
                  } else if (e.key === 'Escape' && !e.nativeEvent.isComposing) {
                    e.preventDefault();
                    handleCancel(true);
                  }
                }}
                className="prism-well w-full h-9 rounded-full px-3.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none"
              />
            )}
          </div>

          <div className={cx(actionsClass, 'flex items-center gap-1.5 shrink-0', multiline && 'pt-1')}>
            <button
              type="button"
              aria-label="Save"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleSave(true)}
              className="prism-emerald prism-focus-ring w-8 h-8 rounded-full inline-flex items-center justify-center cursor-pointer transition-transform enabled:hover:scale-105"
            >
              <Check aria-hidden="true" className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              aria-label="Cancel"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleCancel(true)}
              className="prism-crystal prism-focus-ring w-8 h-8 rounded-full inline-flex items-center justify-center text-slate-700 dark:text-slate-200 cursor-pointer transition-transform enabled:hover:scale-105"
            >
              <X aria-hidden="true" className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ) : (
        <button
          ref={triggerRef}
          type="button"
          disabled={disabled}
          aria-label={ariaLabel}
          onClick={startEditing}
          onKeyDown={(e) => {
            if (disabled) return;
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              startEditing();
            }
          }}
          className={cx(
            viewClass,
            'prism-crystal prism-focus-ring group w-full text-left px-3.5 py-2 inline-flex items-center justify-between gap-2.5 transition-[color,background-color,border-color,opacity,transform] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed enabled:hover:brightness-[1.03]',
            multiline ? 'rounded-2xl items-start' : 'rounded-full min-h-10'
          )}
        >
          <span
            className={cx(
              'text-sm leading-relaxed min-w-0 flex-1 break-words',
              multiline && 'whitespace-pre-wrap',
              hasValue
                ? 'font-medium text-slate-900 dark:text-slate-100'
                : 'italic text-slate-400 dark:text-slate-500'
            )}
          >
            {hasValue ? currentValue : placeholder}
          </span>
          <span
            aria-hidden="true"
            className={cx(
              'shrink-0 text-slate-400 dark:text-slate-500 transition-opacity',
              disabled
                ? 'opacity-40'
                : 'opacity-65 group-hover:opacity-100 group-focus-visible:opacity-100'
            )}
          >
            <Pencil className="w-3.5 h-3.5" />
          </span>
        </button>
      )}

      {editingActive && errorMessage ? (
        <p
          id={errorId}
          role="alert"
          className="mt-1.5 ml-2 text-xs font-medium text-red-600 dark:text-red-400"
        >
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}

export const InlineEditableField = memo(InlineEditableFieldInner);
InlineEditableField.displayName = 'InlineEditableField';
