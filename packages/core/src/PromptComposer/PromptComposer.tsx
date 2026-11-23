'use client';

import { memo, useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { ArrowUp, Mic, MicOff, Paperclip, Sparkles, Square } from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { useControllableState } from '../hooks/useControllableState';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { mergeProps } from '../utils/mergeProps';
import { STYLE_PRIMARY_MAIN, STYLE_TEXT_PRIMARY, STYLE_TEXT_SECONDARY } from '../utils/styles';
import { themeProps } from '../utils/themeProps';

export interface PromptModelOption {
  /** Unique model identifier emitted via onModelChange and onSubmit. */
  id: string;
  /** Visible display name shown inside the model selector. */
  label: string;
  /** Optional concise badge metadata (e.g. 'Fast', 'Reasoning', '128k'). */
  badge?: string;
}

type PromptComposerBaseProps = Omit<BaseProps<HTMLDivElement>, 'onChange' | 'onSubmit'>;

export interface PromptComposerProps extends PromptComposerBaseProps {
  /** Controlled prompt text value. */
  value?: string;
  /** Initial prompt text for uncontrolled mode. */
  defaultValue?: string;
  /** Fired whenever the prompt input changes. */
  onChange?: (val: string) => void;
  /** Fired when a non-empty prompt is submitted via Enter or the Send button. */
  onSubmit?: (prompt: string, modelId?: string) => void;
  /** Fired when the Stop button is pressed while isGenerating is true. */
  onStop?: () => void;
  /** Fired when the Attachment button is clicked. */
  onAttachClick?: () => void;
  /** Fired when the Voice toggle button switches recording state. */
  onVoiceToggle?: (recording: boolean) => void;
  /** Optional list of selectable AI models rendered in a crystal selector pill. */
  models?: ReadonlyArray<PromptModelOption>;
  /** Controlled active model identifier. */
  selectedModelId?: string;
  /** Initial model identifier for uncontrolled selection. */
  defaultModelId?: string;
  /** Fired when the active model selection changes. */
  onModelChange?: (id: string) => void;
  /** Switches the Send capsule into a Stop generation button when true. */
  isGenerating?: boolean;
  /** Textarea placeholder copy (defaults to 'Ask anything or describe what to build...'). */
  placeholder?: string;
  /** Disables text input and action bar controls when true. */
  disabled?: boolean;
  /** Optional positive finite character limit showing a live tabular counter. */
  maxLength?: number;
  /** Number of attached items; displays a tabular count badge when > 0. */
  attachmentsCount?: number;
}

const MAX_TEXTAREA_HEIGHT_PX = 200;

function deduplicateModels(
  models: ReadonlyArray<PromptModelOption> | undefined
): PromptModelOption[] {
  if (!models || models.length === 0) return [];
  const seen = new Set<string>();
  const unique: PromptModelOption[] = [];
  for (const model of models) {
    if (!seen.has(model.id)) {
      seen.add(model.id);
      unique.push(model);
    }
  }
  return unique;
}

function PromptComposerInner({
  value,
  defaultValue = '',
  onChange,
  onSubmit,
  onStop,
  onAttachClick,
  onVoiceToggle,
  models,
  selectedModelId,
  defaultModelId,
  onModelChange,
  isGenerating = false,
  placeholder = 'Ask anything or describe what to build...',
  disabled = false,
  maxLength,
  attachmentsCount = 0,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: PromptComposerProps) {
  const override = useComponentOverride('PromptComposer');
  const textareaId = useId();
  const modelSelectId = useId();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const uniqueModels = useMemo(() => deduplicateModels(models), [models]);

  const [currentValue, setCurrentValue] = useControllableState<string>({
    value,
    defaultValue,
    onChange,
  });

  const fallbackModelId = defaultModelId ?? uniqueModels[0]?.id ?? '';
  const [currentModelId, setCurrentModelId] = useControllableState<string>({
    value: selectedModelId,
    defaultValue: fallbackModelId,
    onChange: onModelChange,
  });

  const [isRecording, setIsRecording] = useState(false);

  const activeModel = useMemo<PromptModelOption | undefined>(() => {
    if (uniqueModels.length === 0) return undefined;
    return uniqueModels.find((entry) => entry.id === currentModelId) ?? uniqueModels[0];
  }, [uniqueModels, currentModelId]);

  const activeModelId = activeModel?.id;

  const safeMaxLength =
    typeof maxLength === 'number' && Number.isFinite(maxLength) && maxLength > 0
      ? Math.floor(maxLength)
      : undefined;

  const safeAttachmentsCount =
    Number.isFinite(attachmentsCount) && attachmentsCount > 0 ? Math.floor(attachmentsCount) : 0;

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const nextHeight = Math.min(el.scrollHeight, MAX_TEXTAREA_HEIGHT_PX);
    if (nextHeight > 0) {
      el.style.height = `${nextHeight}px`;
    }
  }, [currentValue]);

  const trimmedValue = currentValue.trim();
  const canSubmit = !disabled && !isGenerating && trimmedValue.length > 0;

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSubmit?.(trimmedValue, activeModelId);
    if (value === undefined) {
      setCurrentValue('');
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.nativeEvent.isComposing) return;
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleVoiceToggle = () => {
    const nextRecording = !isRecording;
    setIsRecording(nextRecording);
    onVoiceToggle?.(nextRecording);
  };

  const merged = mergeProps({
    themeTarget: themeProps('PromptComposer', {
      disabled,
      generating: isGenerating,
      recording: isRecording,
      hasValue: trimmedValue.length > 0,
    }),
    baseClassName: 'prism-slab p-3 space-y-2.5 w-full',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  return (
    <div ref={ref} {...rest} {...merged}>
      <div className="prism-well rounded-2xl px-3.5 py-2.5">
        <textarea
          ref={textareaRef}
          id={textareaId}
          rows={1}
          value={currentValue}
          disabled={disabled}
          maxLength={safeMaxLength}
          placeholder={placeholder}
          aria-label="Prompt input"
          onChange={(e) => setCurrentValue(e.target.value)}
          onKeyDown={handleKeyDown}
          className="prism-focus-ring w-full resize-none overflow-y-auto bg-transparent text-sm leading-relaxed focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            color: 'var(--prism-text-primary)',
            maxHeight: `${MAX_TEXTAREA_HEIGHT_PX}px`,
          }}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            disabled={disabled}
            aria-label={
              safeAttachmentsCount > 0
                ? `Attach files (${safeAttachmentsCount} attached)`
                : 'Attach files'
            }
            onClick={() => onAttachClick?.()}
            className="prism-crystal prism-focus-ring h-8 px-2.5 rounded-full inline-flex items-center gap-1.5 text-xs font-medium cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed enabled:hover:brightness-105 transition-[color,background-color,border-color,opacity,transform]"
            style={STYLE_TEXT_PRIMARY}
          >
            <Paperclip aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
            {safeAttachmentsCount > 0 ? (
              <span
                data-testid="prompt-attachments-badge"
                className="prism-btn-primary px-1.5 py-0.5 rounded-full font-mono text-[10px] font-semibold tabular-nums leading-none"
              >
                <span className="relative z-10">{safeAttachmentsCount}</span>
              </span>
            ) : null}
          </button>

          <button
            type="button"
            disabled={disabled}
            aria-pressed={isRecording}
            aria-label={isRecording ? 'Stop voice input' : 'Start voice input'}
            onClick={handleVoiceToggle}
            className={`${
              isRecording ? 'prism-emerald' : 'prism-crystal'
            } prism-focus-ring h-8 px-2.5 rounded-full inline-flex items-center gap-1.5 text-xs font-medium cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed enabled:hover:brightness-105 transition-[color,background-color,border-color,opacity,transform]`}
            style={isRecording ? undefined : { color: 'var(--prism-text-primary)' }}
          >
            {isRecording ? (
              <MicOff aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
            ) : (
              <Mic aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
            )}
            <span>{isRecording ? 'Listening' : 'Voice'}</span>
          </button>

          {activeModel ? (
            <div className="prism-crystal h-8 px-2.5 rounded-full inline-flex items-center gap-1.5">
              <Sparkles
                aria-hidden="true"
                className="w-3.5 h-3.5 shrink-0"
                style={STYLE_PRIMARY_MAIN}
              />
              <select
                id={modelSelectId}
                aria-label="Select model"
                disabled={disabled}
                value={activeModel.id}
                onChange={(e) => setCurrentModelId(e.target.value)}
                className="prism-focus-ring bg-transparent text-xs font-medium pr-1 py-0.5 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed focus:outline-none"
                style={STYLE_TEXT_PRIMARY}
              >
                {uniqueModels.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.badge ? `${model.label} (${model.badge})` : model.label}
                  </option>
                ))}
              </select>
              {activeModel.badge ? (
                <span
                  data-testid="prompt-model-badge"
                  className="prism-well px-1.5 py-0.5 rounded-full font-mono text-[10px] font-semibold"
                  style={STYLE_TEXT_SECONDARY}
                >
                  {activeModel.badge}
                </span>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="flex items-center gap-2 ml-auto">
          {safeMaxLength !== undefined ? (
            <span
              data-testid="prompt-char-count"
              className="font-mono text-[11px] tabular-nums"
              style={{
                color:
                  currentValue.length >= safeMaxLength
                    ? 'var(--prism-warning-main)'
                    : 'var(--prism-text-secondary)',
              }}
            >
              {currentValue.length} / {safeMaxLength}
            </span>
          ) : null}

          {isGenerating ? (
            <button
              type="button"
              disabled={disabled}
              aria-label="Stop generating"
              onClick={() => onStop?.()}
              className="prism-btn-primary prism-focus-ring h-8 px-3.5 rounded-full text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed enabled:hover:brightness-105 transition-[color,background-color,border-color,opacity,transform]"
            >
              <Square aria-hidden="true" className="w-3.5 h-3.5 relative z-10" />
              <span className="relative z-10">Stop</span>
            </button>
          ) : (
            <button
              type="button"
              disabled={!canSubmit}
              aria-label="Send prompt"
              onClick={handleSubmit}
              className="prism-btn-primary prism-focus-ring h-8 px-3.5 rounded-full text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed enabled:hover:brightness-105 transition-[color,background-color,border-color,opacity,transform]"
            >
              <ArrowUp aria-hidden="true" className="w-3.5 h-3.5 relative z-10" />
              <span className="relative z-10">Send</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export const PromptComposer = memo(PromptComposerInner);
PromptComposer.displayName = 'PromptComposer';
