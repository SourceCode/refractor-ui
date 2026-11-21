'use client';

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';
import { Check, Copy, Terminal } from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { useControllableState } from '../hooks/useControllableState';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { cx, mergeProps } from '../utils/mergeProps';
import { themeProps } from '../utils/themeProps';

export interface CommandVariant {
  /** Unique identifier for this command runner or package manager variant. */
  id: string;
  /** Visible tab label (e.g. 'pnpm', 'npm', 'yarn', 'bun'). */
  label: string;
  /** Shell command string associated with this variant. */
  command: string;
}

type CopyableCommandBlockBaseProps = Omit<BaseProps<HTMLDivElement>, 'onCopy'>;

export interface CopyableCommandBlockProps extends CopyableCommandBlockBaseProps {
  /** Single shell command to display when variants are not provided. */
  command?: string;
  /** Optional runner/package-manager variants rendered as crystal tabs. */
  variants?: CommandVariant[];
  /** Initial active variant id when variants are supplied (defaults to first variant). */
  defaultVariantId?: string;
  /** Callback fired when the active variant tab changes. */
  onVariantChange?: (id: string) => void;
  /** Shell prompt prefix displayed before the command (defaults to '$'). */
  prefix?: string;
  /** Optional heading label rendered in the command slab header. */
  title?: string;
  /** Callback invoked with the active command string whenever Copy is activated. */
  onCopy?: (command: string) => void;
}

type CommandTokenKind = 'whitespace' | 'executable' | 'flag' | 'string' | 'arg';

interface CommandToken {
  kind: CommandTokenKind;
  value: string;
  start: number;
}

const COPY_FEEDBACK_DURATION_MS = 1600;
const COMMAND_SEPARATORS = new Set(['&&', '||', ';', '|']);

function isWhitespaceChar(ch: string): boolean {
  return ch === ' ' || ch === '\t' || ch === '\r' || ch === '\n';
}

function tokenizeCommand(source: string): CommandToken[] {
  const tokens: CommandToken[] = [];
  const length = source.length;
  let index = 0;
  let seenExecutable = false;

  while (index < length) {
    const start = index;
    const ch = source.charAt(index);

    if (isWhitespaceChar(ch)) {
      let hasNewline = false;
      while (index < length && isWhitespaceChar(source.charAt(index))) {
        if (source.charAt(index) === '\n') {
          hasNewline = true;
        }
        index += 1;
      }
      if (hasNewline) {
        seenExecutable = false;
      }
      tokens.push({
        kind: 'whitespace',
        value: source.slice(start, index),
        start,
      });
      continue;
    }

    if (ch === '"' || ch === "'") {
      const quote = ch;
      index += 1;
      while (index < length) {
        const current = source.charAt(index);
        if (current === '\\' && quote === '"' && index + 1 < length) {
          index += 2;
          continue;
        }
        index += 1;
        if (current === quote) {
          break;
        }
      }
      seenExecutable = true;
      tokens.push({
        kind: 'string',
        value: source.slice(start, index),
        start,
      });
      continue;
    }

    while (index < length && !isWhitespaceChar(source.charAt(index))) {
      index += 1;
    }

    const word = source.slice(start, index);
    if (COMMAND_SEPARATORS.has(word)) {
      seenExecutable = false;
      tokens.push({ kind: 'arg', value: word, start });
    } else if (!seenExecutable) {
      seenExecutable = true;
      tokens.push({ kind: 'executable', value: word, start });
    } else if (word.startsWith('-')) {
      tokens.push({ kind: 'flag', value: word, start });
    } else {
      tokens.push({ kind: 'arg', value: word, start });
    }
  }

  return tokens;
}

function getTokenColor(kind: Exclude<CommandTokenKind, 'whitespace'>): string {
  switch (kind) {
    case 'executable':
      return 'var(--prism-primary-main)';
    case 'flag':
      return 'var(--prism-secondary-main)';
    case 'string':
      return 'var(--prism-emerald-text, var(--prism-success-main))';
    case 'arg':
      return 'var(--prism-text-primary)';
  }
}

export function CopyableCommandBlock({
  command,
  variants,
  defaultVariantId,
  onVariantChange,
  prefix = '$',
  title,
  onCopy,
  className,
  style,
  xstyle,
  'aria-label': ariaLabel,
  ref,
  ...rest
}: CopyableCommandBlockProps) {
  const override = useComponentOverride('CopyableCommandBlock');
  const baseId = useId();
  const titleId = `${baseId}-title`;
  const panelId = `${baseId}-panel`;

  const variantList = variants && variants.length > 0 ? variants : undefined;
  const hasVariants = Boolean(variantList);

  const initialVariantId = useMemo<string>(() => {
    const firstVariant = variantList?.[0];
    if (!firstVariant) {
      return '';
    }
    const matched = defaultVariantId
      ? variantList.find((item) => item.id === defaultVariantId)
      : undefined;
    return matched ? matched.id : firstVariant.id;
  }, [defaultVariantId, variantList]);

  const [selectedVariantId, setSelectedVariantId] = useControllableState<string>({
    defaultValue: initialVariantId,
    onChange: onVariantChange,
  });

  const activeVariant = useMemo<CommandVariant | undefined>(() => {
    if (!variantList) {
      return undefined;
    }
    return variantList.find((item) => item.id === selectedVariantId) ?? variantList[0];
  }, [selectedVariantId, variantList]);

  const activeCommand = activeVariant ? activeVariant.command : (command ?? '');
  const isEmpty = activeCommand.length === 0;
  const tokens = useMemo<CommandToken[]>(() => tokenizeCommand(activeCommand), [activeCommand]);

  const [copied, setCopied] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tabRefs = useRef<Map<string, HTMLButtonElement | null>>(new Map());

  const clearCopyTimer = useCallback(() => {
    if (copyTimerRef.current !== null) {
      clearTimeout(copyTimerRef.current);
      copyTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      clearCopyTimer();
    };
  }, [clearCopyTimer]);

  const handleSelectVariant = useCallback(
    (variantId: string) => {
      if (variantId === activeVariant?.id) {
        return;
      }
      clearCopyTimer();
      setCopied(false);
      setSelectedVariantId(variantId);
    },
    [activeVariant?.id, clearCopyTimer, setSelectedVariantId]
  );

  const handleTabKeyDown = useCallback(
    (event: KeyboardEvent<HTMLButtonElement>, currentIndex: number) => {
      if (event.nativeEvent.isComposing || !variantList || variantList.length < 2) {
        return;
      }
      let nextIndex: number | null = null;
      if (event.key === 'ArrowRight') {
        nextIndex = (currentIndex + 1) % variantList.length;
      } else if (event.key === 'ArrowLeft') {
        nextIndex = (currentIndex - 1 + variantList.length) % variantList.length;
      } else if (event.key === 'Home') {
        nextIndex = 0;
      } else if (event.key === 'End') {
        nextIndex = variantList.length - 1;
      }

      if (nextIndex !== null) {
        event.preventDefault();
        const nextVariant = variantList[nextIndex];
        if (nextVariant) {
          handleSelectVariant(nextVariant.id);
          tabRefs.current.get(nextVariant.id)?.focus();
        }
      }
    },
    [handleSelectVariant, variantList]
  );

  const handleCopy = useCallback(() => {
    try {
      const clipboard = navigator.clipboard;
      if (clipboard && typeof clipboard.writeText === 'function') {
        void Promise.resolve(clipboard.writeText(activeCommand)).catch(() => undefined);
      }
    } catch {
      // Clipboard API unavailable or restricted; continue with callback and confirmation state.
    }

    onCopy?.(activeCommand);
    setCopied(true);
    setStatusMessage('Command copied to clipboard.');

    clearCopyTimer();
    copyTimerRef.current = setTimeout(() => {
      setCopied(false);
      copyTimerRef.current = null;
    }, COPY_FEEDBACK_DURATION_MS);
  }, [activeCommand, clearCopyTimer, onCopy]);

  const merged = mergeProps({
    themeTarget: themeProps('copyable-command-block', {
      copied,
      hasVariants,
      empty: isEmpty,
    }),
    baseClassName: 'prism-slab p-3.5 sm:p-4 w-full flex flex-col gap-3',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  const headerClass = stableClassName('copyable-command-block', 'header');
  const tabsClass = stableClassName('copyable-command-block', 'tabs');
  const codeWellClass = stableClassName('copyable-command-block', 'code');

  const activeTabId = activeVariant ? `${baseId}-tab-${activeVariant.id}` : undefined;

  return (
    <div
      ref={ref}
      aria-label={ariaLabel}
      aria-labelledby={!ariaLabel && title ? titleId : undefined}
      {...rest}
      {...merged}
    >
      {title || variantList ? (
        <div className={cx(headerClass, 'flex flex-wrap items-center justify-between gap-2')}>
          {title ? (
            <div className="min-w-0 flex items-center gap-2">
              <span
                className="prism-well w-7 h-7 rounded-full inline-flex items-center justify-center shrink-0"
                style={{ color: 'var(--prism-primary-main)' }}
              >
                <Terminal aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
              </span>
              <span
                id={titleId}
                className="text-xs sm:text-sm font-semibold truncate"
                style={{ color: 'var(--prism-text-primary)' }}
              >
                {title}
              </span>
            </div>
          ) : null}

          {variantList ? (
            <div
              role="tablist"
              aria-label={title ? `${title} command variants` : 'Command variants'}
              className={cx(tabsClass, 'flex flex-wrap items-center gap-1.5')}
            >
              {variantList.map((variant, index) => {
                const isSelected = activeVariant?.id === variant.id;
                const tabId = `${baseId}-tab-${variant.id}`;
                return (
                  <button
                    key={variant.id}
                    ref={(el) => {
                      tabRefs.current.set(variant.id, el);
                    }}
                    id={tabId}
                    type="button"
                    role="tab"
                    aria-selected={isSelected}
                    aria-controls={panelId}
                    tabIndex={isSelected ? 0 : -1}
                    onClick={() => handleSelectVariant(variant.id)}
                    onKeyDown={(event) => handleTabKeyDown(event, index)}
                    className={cx(
                      'prism-focus-ring h-7 px-3 rounded-full inline-flex items-center justify-center text-xs transition-all cursor-pointer enabled:hover:brightness-105',
                      isSelected ? 'prism-crystal font-semibold' : 'prism-well font-medium'
                    )}
                    style={{
                      color: isSelected
                        ? 'var(--prism-primary-main)'
                        : 'var(--prism-text-secondary)',
                    }}
                  >
                    {variant.label}
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>
      ) : null}

      <div
        id={panelId}
        role={hasVariants ? 'tabpanel' : undefined}
        aria-labelledby={activeTabId}
        className={cx(
          codeWellClass,
          'prism-well rounded-2xl px-3.5 py-2.5 flex items-center gap-2.5'
        )}
      >
        {prefix ? (
          <span
            aria-hidden="true"
            data-testid="copyable-command-prefix"
            className="font-mono text-xs sm:text-sm font-semibold select-none shrink-0"
            style={{ color: 'var(--prism-text-secondary)' }}
          >
            {prefix}
          </span>
        ) : null}

        <pre className="m-0 min-w-0 flex-1 overflow-x-auto">
          <code
            data-testid="copyable-command-code"
            className="font-mono text-xs sm:text-sm leading-relaxed whitespace-pre"
            style={{
              color: isEmpty ? 'var(--prism-text-disabled)' : 'var(--prism-text-primary)',
            }}
          >
            {isEmpty
              ? 'No command configured'
              : tokens.map((token) => {
                  const key = `${token.start}-${token.kind}`;
                  if (token.kind === 'whitespace') {
                    return <span key={key}>{token.value}</span>;
                  }
                  return (
                    <span
                      key={key}
                      data-token-kind={token.kind}
                      className={token.kind === 'executable' ? 'font-semibold' : undefined}
                      style={{ color: getTokenColor(token.kind) }}
                    >
                      {token.value}
                    </span>
                  );
                })}
          </code>
        </pre>

        <button
          type="button"
          disabled={isEmpty}
          data-copied={copied ? 'true' : undefined}
          onClick={handleCopy}
          className={cx(
            'prism-focus-ring h-8 px-3 rounded-full inline-flex items-center justify-center gap-1.5 text-xs font-medium whitespace-nowrap shrink-0 transition-all cursor-pointer enabled:hover:brightness-105 disabled:opacity-45 disabled:cursor-not-allowed',
            copied ? 'prism-emerald font-semibold' : 'prism-crystal'
          )}
          style={copied ? undefined : { color: 'var(--prism-text-primary)' }}
        >
          {copied ? (
            <>
              <Check aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
              <span>Copied</span>
            </>
          ) : (
            <>
              <Copy aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      <span role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {statusMessage}
      </span>
    </div>
  );
}

CopyableCommandBlock.displayName = 'CopyableCommandBlock';
