'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';
import { RefreshCw } from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { composeEventHandlers } from '../utils/composeEventHandlers';
import { cx, mergeProps } from '../utils/mergeProps';
import { clampNumber } from '../utils/sanitize';
import { themeProps } from '../utils/themeProps';

export type PullToRefreshStatus = 'idle' | 'pulling' | 'ready' | 'refreshing';

export interface PullToRefreshProps extends BaseProps<HTMLDivElement> {
  /** Scrollable feed or list content wrapped by the pull-to-refresh container. */
  children: ReactNode;
  /** Callback invoked when the pull gesture exceeds threshold or the manual Refresh control is clicked. */
  onRefresh: () => void | Promise<void>;
  /** Optional controlled refreshing state override. */
  refreshing?: boolean;
  /** Dampened pull distance in pixels required to enter the 'ready' state (clamped 32..160, defaults to 64). */
  threshold?: number;
  /** Status label displayed while idle or pulling below threshold (defaults to 'Pull to refresh'). */
  pullLabel?: string;
  /** Status label displayed once pull distance reaches threshold (defaults to 'Release to refresh'). */
  releaseLabel?: string;
  /** Status label displayed while a refresh operation is active (defaults to 'Refreshing...'). */
  refreshingLabel?: string;
  /** Renders an accessible crystal manual Refresh button for desktop and keyboard users (defaults to true). */
  showManualButton?: boolean;
  /** Disables pointer pull gestures and the manual Refresh button. */
  disabled?: boolean;
}

interface PullGestureState {
  active: boolean;
  startY: number;
  distance: number;
}

const DEFAULT_THRESHOLD = 64;
const MIN_THRESHOLD = 32;
const MAX_THRESHOLD = 160;
const DAMPENING_FACTOR = 0.55;
const MAX_PULL_MULTIPLIER = 1.5;
const REFRESHING_DRAWER_MIN_HEIGHT = 56;

export function PullToRefresh({
  children,
  onRefresh,
  refreshing,
  threshold = DEFAULT_THRESHOLD,
  pullLabel = 'Pull to refresh',
  releaseLabel = 'Release to refresh',
  refreshingLabel = 'Refreshing...',
  showManualButton = true,
  disabled = false,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: PullToRefreshProps) {
  const override = useComponentOverride('PullToRefresh');

  const safeThreshold = Math.round(
    clampNumber(threshold, MIN_THRESHOLD, MAX_THRESHOLD, DEFAULT_THRESHOLD)
  );
  const maxPull = Math.round(safeThreshold * MAX_PULL_MULTIPLIER);

  const [internalRefreshing, setInternalRefreshing] = useState<boolean>(false);
  const [pullDistance, setPullDistance] = useState<number>(0);

  const mountedRef = useRef<boolean>(true);
  const inFlightRef = useRef<boolean>(false);
  const pullRef = useRef<PullGestureState>({
    active: false,
    startY: 0,
    distance: 0,
  });

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const isControlled = refreshing !== undefined;
  const isRefreshing = isControlled ? refreshing : internalRefreshing;
  const effectivePull = disabled || isRefreshing ? 0 : pullDistance;

  const status: PullToRefreshStatus = isRefreshing
    ? 'refreshing'
    : effectivePull >= safeThreshold
      ? 'ready'
      : effectivePull > 0
        ? 'pulling'
        : 'idle';

  const progressPct = isRefreshing
    ? 100
    : Math.min(100, Math.round((effectivePull / safeThreshold) * 100));

  const statusText =
    status === 'refreshing'
      ? refreshingLabel
      : status === 'ready'
        ? releaseLabel
        : pullLabel;

  const drawerHeight = isRefreshing
    ? Math.max(REFRESHING_DRAWER_MIN_HEIGHT, Math.round(safeThreshold * 0.85))
    : Math.round(effectivePull);

  const triggerRefresh = useCallback(() => {
    if (disabled || isRefreshing || inFlightRef.current) return;

    inFlightRef.current = true;
    if (!isControlled) {
      setInternalRefreshing(true);
    }

    const finalize = () => {
      inFlightRef.current = false;
      if (mountedRef.current && !isControlled) {
        setInternalRefreshing(false);
      }
    };

    const runAsync = async (pending: Promise<void>) => {
      try {
        await pending;
      } catch {
        // Gracefully absorb rejected promises so status resets to idle cleanly.
      } finally {
        finalize();
      }
    };

    try {
      const result = onRefresh();
      if (result && typeof result.then === 'function') {
        void runAsync(result);
        return;
      }
    } catch {
      // Absorb synchronous errors cleanly and reset to idle.
    }

    finalize();
  }, [disabled, isControlled, isRefreshing, onRefresh]);

  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (disabled || isRefreshing || event.button > 0) return;
      if (event.currentTarget.scrollTop > 0) return;

      pullRef.current = {
        active: true,
        startY: event.clientY,
        distance: 0,
      };
    },
    [disabled, isRefreshing]
  );

  const handlePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!pullRef.current.active || disabled || isRefreshing) return;

      if (event.currentTarget.scrollTop > 0) {
        pullRef.current = { active: false, startY: 0, distance: 0 };
        setPullDistance(0);
        return;
      }

      const deltaY = event.clientY - pullRef.current.startY;
      if (deltaY <= 0) {
        pullRef.current.distance = 0;
        setPullDistance(0);
        return;
      }

      const damped = Math.min(maxPull, deltaY * DAMPENING_FACTOR);
      pullRef.current.distance = damped;
      setPullDistance(damped);
    },
    [disabled, isRefreshing, maxPull]
  );

  const handlePointerUp = useCallback(() => {
    if (!pullRef.current.active) return;
    const finalDistance = pullRef.current.distance;
    pullRef.current = { active: false, startY: 0, distance: 0 };
    setPullDistance(0);

    if (!disabled && !isRefreshing && finalDistance >= safeThreshold) {
      triggerRefresh();
    }
  }, [disabled, isRefreshing, safeThreshold, triggerRefresh]);

  const handlePointerCancel = useCallback(() => {
    if (!pullRef.current.active) return;
    pullRef.current = { active: false, startY: 0, distance: 0 };
    setPullDistance(0);
  }, []);

  const merged = mergeProps({
    themeTarget: themeProps('pull-to-refresh', {
      status,
      refreshing: isRefreshing,
      disabled,
    }),
    baseClassName: cx(
      'prism-slab relative overflow-y-auto overflow-x-hidden flex flex-col w-full',
      disabled ? 'opacity-65' : ''
    ),
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  const indicatorClass = stableClassName('pull-to-refresh', 'indicator');
  const toolbarClass = stableClassName('pull-to-refresh', 'toolbar');
  const contentClass = stableClassName('pull-to-refresh', 'content');

  const accentColor =
    status === 'ready' || status === 'refreshing'
      ? 'var(--prism-primary-main)'
      : 'var(--prism-secondary-main)';

  return (
    <div
      ref={ref}
      onPointerDown={composeEventHandlers(onPointerDown, handlePointerDown)}
      onPointerMove={composeEventHandlers(onPointerMove, handlePointerMove)}
      onPointerUp={composeEventHandlers(onPointerUp, handlePointerUp)}
      onPointerCancel={composeEventHandlers(onPointerCancel, handlePointerCancel)}
      {...rest}
      {...merged}
    >
      <div
        data-testid="pull-to-refresh-indicator"
        data-status={status}
        style={{
          height: `${drawerHeight}px`,
          borderColor: 'var(--prism-divider)',
        }}
        className={cx(
          indicatorClass,
          'prism-well shrink-0 overflow-hidden flex flex-col items-center justify-center gap-1.5 px-4',
          status === 'idle' ? 'opacity-0' : 'opacity-100 border-b',
          status === 'pulling' || status === 'ready'
            ? ''
            : 'transition-[height,opacity] duration-200 ease-out'
        )}
      >
        <div className="flex items-center gap-2">
          <RefreshCw
            data-testid="pull-to-refresh-icon"
            aria-hidden="true"
            style={{
              color: accentColor,
              transform: isRefreshing ? undefined : `rotate(${Math.round(progressPct * 1.8)}deg)`,
            }}
            className={cx(
              'w-4 h-4 shrink-0',
              isRefreshing ? 'animate-spin' : 'transition-transform duration-75'
            )}
          />
          <span
            role="status"
            aria-live="polite"
            data-testid="pull-to-refresh-status"
            className="text-xs font-semibold tracking-tight"
            style={{ color: 'var(--prism-text-primary)' }}
          >
            {statusText}
          </span>
        </div>

        <div
          role="progressbar"
          aria-label="Pull to refresh progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progressPct}
          data-testid="pull-to-refresh-progress"
          className="prism-crystal w-32 h-1.5 rounded-full overflow-hidden"
        >
          <div
            data-testid="pull-to-refresh-progress-fill"
            className="h-full rounded-full transition-[width] duration-75"
            style={{
              width: `${progressPct}%`,
              backgroundColor: accentColor,
            }}
          />
        </div>
      </div>

      {showManualButton ? (
        <div
          data-testid="pull-to-refresh-toolbar"
          className={cx(
            toolbarClass,
            'shrink-0 px-4 py-2.5 flex items-center justify-between gap-2 border-b'
          )}
          style={{ borderColor: 'var(--prism-divider)' }}
        >
          <span
            className="text-xs font-medium"
            style={{ color: 'var(--prism-text-secondary)' }}
          >
            {statusText}
          </span>
          <button
            type="button"
            disabled={disabled || isRefreshing}
            data-testid="pull-to-refresh-manual-button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={triggerRefresh}
            style={{ color: 'var(--prism-text-primary)' }}
            className="prism-crystal prism-focus-ring h-8 px-3 rounded-full inline-flex items-center gap-1.5 text-xs font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed enabled:hover:brightness-105 transition-all"
          >
            <RefreshCw
              aria-hidden="true"
              className={cx('w-3.5 h-3.5 shrink-0', isRefreshing ? 'animate-spin' : '')}
              style={{ color: accentColor }}
            />
            <span>Refresh</span>
          </button>
        </div>
      ) : null}

      <div
        data-testid="pull-to-refresh-content"
        className={cx(contentClass, 'flex-1 min-h-0')}
      >
        {children}
      </div>
    </div>
  );
}

PullToRefresh.displayName = 'PullToRefresh';
