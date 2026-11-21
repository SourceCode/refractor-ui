'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from 'react';
import { AlertCircle, Check, Loader2 } from 'lucide-react';
import type { BaseProps, OpticalStyleTokens } from '../BaseProps';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { composeEventHandlers } from '../utils/composeEventHandlers';
import { cx, mergeProps } from '../utils/mergeProps';
import { clampNumber } from '../utils/sanitize';
import { themeProps } from '../utils/themeProps';

export type AsyncButtonState = 'idle' | 'loading' | 'success' | 'error';

export type AsyncButtonSize = 'sm' | 'md' | 'lg';

export interface StatefulAsyncButtonProps
  extends BaseProps<HTMLButtonElement>,
    Pick<
      ButtonHTMLAttributes<HTMLButtonElement>,
      'form' | 'formAction' | 'name' | 'type' | 'value'
    > {
  /** Label rendered while the button is idle and ready to trigger the action. */
  idleLabel: string;
  /** Optional leading icon rendered while in the idle state. */
  idleIcon?: ReactNode;
  /** Label rendered while an async promise returned by onAction is pending (defaults to 'Working...'). */
  loadingLabel?: string;
  /** Label rendered after the action succeeds (defaults to 'Done'). */
  successLabel?: string;
  /** Label rendered after the action throws or rejects (defaults to 'Failed'). */
  errorLabel?: string;
  /** Synchronous or Promise-returning action executed on click from idle or error (retry) state. */
  onAction?: () => void | Promise<void>;
  /** Optional controlled lifecycle state ('idle' | 'loading' | 'success' | 'error'). */
  state?: AsyncButtonState;
  /** Milliseconds before automatically resetting from success/error back to idle (0..15000, default 1800; 0 disables auto-reset). */
  resetDelayMs?: number;
  /** Capsule height and horizontal padding scale ('sm' | 'md' | 'lg', defaults to 'md'). */
  size?: AsyncButtonSize;
  /** Disables interaction and dims the optical glass surface. */
  disabled?: boolean;
}

const DEFAULT_RESET_DELAY_MS = 1800;
const MAX_RESET_DELAY_MS = 15000;

const ERROR_SURFACE_STYLE: OpticalStyleTokens = {
  color: 'var(--prism-error-contrast)',
  background:
    'linear-gradient(145deg, var(--prism-error-main) 0%, var(--prism-rose-main, var(--prism-error-main)) 100%)',
  borderWidth: '1px',
  borderStyle: 'solid',
  borderColor: 'var(--prism-rose-border, var(--prism-error-main))',
};

const LOADING_SURFACE_STYLE: OpticalStyleTokens = {
  color: 'var(--prism-text-primary)',
};

interface SizeVisual {
  buttonClass: string;
  iconClass: string;
}

function getSizeVisual(size: AsyncButtonSize): SizeVisual {
  switch (size) {
    case 'sm':
      return {
        buttonClass: 'h-9 px-5 text-xs',
        iconClass: 'w-3.5 h-3.5',
      };
    case 'lg':
      return {
        buttonClass: 'h-14 px-9 text-base',
        iconClass: 'w-5 h-5',
      };
    case 'md':
      return {
        buttonClass: 'h-12 px-7 text-[15px]',
        iconClass: 'w-4 h-4',
      };
  }
}

interface StateSurfaceVisual {
  surfaceClass: string;
  baseStyle?: OpticalStyleTokens;
}

function getStateSurfaceVisual(activeState: AsyncButtonState): StateSurfaceVisual {
  switch (activeState) {
    case 'idle':
      return {
        surfaceClass: 'prism-btn-primary',
      };
    case 'loading':
      return {
        surfaceClass: 'prism-crystal rounded-full',
        baseStyle: LOADING_SURFACE_STYLE,
      };
    case 'success':
      return {
        surfaceClass: 'prism-emerald rounded-full',
      };
    case 'error':
      return {
        surfaceClass: 'rounded-full enabled:hover:brightness-105 enabled:active:scale-[0.99]',
        baseStyle: ERROR_SURFACE_STYLE,
      };
  }
}

function isPromiseLike(value: void | Promise<void>): value is Promise<void> {
  return (
    typeof value === 'object' &&
    value !== null &&
    'then' in value &&
    typeof value.then === 'function'
  );
}

export function StatefulAsyncButton({
  idleLabel,
  idleIcon,
  loadingLabel = 'Working...',
  successLabel = 'Done',
  errorLabel = 'Failed',
  onAction,
  state,
  resetDelayMs = DEFAULT_RESET_DELAY_MS,
  size = 'md',
  disabled = false,
  type = 'button',
  className,
  style,
  xstyle,
  onClick,
  onKeyDown,
  ref,
  ...rest
}: StatefulAsyncButtonProps) {
  const override = useComponentOverride('StatefulAsyncButton');
  const isControlled = state !== undefined;
  const [internalState, setInternalState] = useState<AsyncButtonState>('idle');
  const activeState: AsyncButtonState = isControlled ? state : internalState;
  const isLoading = activeState === 'loading';

  const mountedRef = useRef<boolean>(true);
  const inFlightRef = useRef<boolean>(false);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clampedResetDelay = clampNumber(
    resetDelayMs,
    0,
    MAX_RESET_DELAY_MS,
    DEFAULT_RESET_DELAY_MS
  );

  const clearResetTimer = useCallback(() => {
    if (resetTimerRef.current !== null) {
      clearTimeout(resetTimerRef.current);
      resetTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      clearResetTimer();
    };
  }, [clearResetTimer]);

  const scheduleReset = useCallback(() => {
    clearResetTimer();
    if (clampedResetDelay <= 0) {
      return;
    }
    resetTimerRef.current = setTimeout(() => {
      resetTimerRef.current = null;
      if (mountedRef.current) {
        setInternalState('idle');
      }
    }, clampedResetDelay);
  }, [clampedResetDelay, clearResetTimer]);

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    if (disabled || isLoading || inFlightRef.current) {
      event.preventDefault();
      return;
    }

    onClick?.(event);
    if (event.defaultPrevented) {
      return;
    }

    if (activeState !== 'idle' && activeState !== 'error') {
      return;
    }

    if (!onAction) {
      return;
    }

    clearResetTimer();

    let result: void | Promise<void>;
    try {
      result = onAction();
    } catch {
      if (!isControlled && mountedRef.current) {
        setInternalState('error');
        scheduleReset();
      }
      return;
    }

    if (isPromiseLike(result)) {
      inFlightRef.current = true;
      if (!isControlled) {
        setInternalState('loading');
      }
      result.then(
        () => {
          inFlightRef.current = false;
          if (!mountedRef.current) {
            return;
          }
          if (!isControlled) {
            setInternalState('success');
            scheduleReset();
          }
        },
        () => {
          inFlightRef.current = false;
          if (!mountedRef.current) {
            return;
          }
          if (!isControlled) {
            setInternalState('error');
            scheduleReset();
          }
        }
      );
    } else if (!isControlled && mountedRef.current) {
      setInternalState('success');
      scheduleReset();
    }
  };

  const handleKeyDown = composeEventHandlers(
    onKeyDown,
    (event: KeyboardEvent<HTMLButtonElement>) => {
      if (event.nativeEvent.isComposing) {
        return;
      }
      if ((event.key === 'Enter' || event.key === ' ') && (disabled || isLoading)) {
        event.preventDefault();
      }
    }
  );

  const sizeVisual = getSizeVisual(size);
  const surfaceVisual = getStateSurfaceVisual(activeState);

  const merged = mergeProps({
    themeTarget: themeProps('stateful-async-button', {
      state: activeState,
      size,
      disabled,
      busy: isLoading,
    }),
    baseClassName: cx(
      'prism-focus-ring inline-flex items-center justify-center gap-2.5 font-medium tracking-[-0.01em] whitespace-nowrap shrink-0 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed',
      isLoading ? 'cursor-wait' : 'cursor-pointer',
      sizeVisual.buttonClass,
      surfaceVisual.surfaceClass
    ),
    overrideClassName: override?.className,
    userClassName: className,
    baseStyle: surfaceVisual.baseStyle,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  const iconWrapperClass = stableClassName('stateful-async-button', 'icon');
  const labelClass = stableClassName('stateful-async-button', 'label');

  let currentLabel: string;
  let currentIcon: ReactNode = null;
  let statusAnnouncement = '';

  switch (activeState) {
    case 'loading':
      currentLabel = loadingLabel;
      statusAnnouncement = loadingLabel;
      currentIcon = (
        <Loader2
          aria-hidden="true"
          data-testid="stateful-async-spinner"
          className={cx(sizeVisual.iconClass, 'animate-spin shrink-0')}
          style={{ color: 'var(--prism-primary-main)' }}
        />
      );
      break;
    case 'success':
      currentLabel = successLabel;
      statusAnnouncement = successLabel;
      currentIcon = (
        <Check
          aria-hidden="true"
          data-testid="stateful-async-success-icon"
          className={cx(sizeVisual.iconClass, 'shrink-0')}
        />
      );
      break;
    case 'error':
      currentLabel = errorLabel;
      statusAnnouncement = errorLabel;
      currentIcon = (
        <AlertCircle
          aria-hidden="true"
          data-testid="stateful-async-error-icon"
          className={cx(sizeVisual.iconClass, 'shrink-0')}
        />
      );
      break;
    case 'idle':
      currentLabel = idleLabel;
      currentIcon = idleIcon ?? null;
      break;
  }

  return (
    <>
      <button
        ref={ref}
        type={type}
        disabled={disabled}
        aria-busy={isLoading ? 'true' : undefined}
        aria-disabled={isLoading && !disabled ? 'true' : undefined}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        {...rest}
        {...merged}
      >
        {currentIcon ? (
          <span
            aria-hidden="true"
            className={cx(iconWrapperClass, 'relative z-10 inline-flex items-center shrink-0')}
          >
            {currentIcon}
          </span>
        ) : null}
        <span className={cx(labelClass, 'relative z-10')}>{currentLabel}</span>
      </button>
      <span role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {statusAnnouncement}
      </span>
    </>
  );
}

StatefulAsyncButton.displayName = 'StatefulAsyncButton';
