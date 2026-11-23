'use client';

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';
import { Copy, Maximize2, Minimize2, Minus, Square, X } from 'lucide-react';
import type { BaseProps, OpticalStyleTokens } from '../BaseProps';
import { createCoalescedPointerMove } from '../hooks/useRafCallback';
import { useControllableState } from '../hooks/useControllableState';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { cx, mergeProps } from '../utils/mergeProps';
import { STYLE_BORDER_DIVIDER, STYLE_TEXT_PRIMARY } from '../utils/styles';
import { memoWithDisplayName } from '../utils/memo';
import { themeProps } from '../utils/themeProps';

export type WindowChromeStyle = 'macos' | 'windows';

export type WindowStateMode = 'normal' | 'minimized' | 'maximized';

export interface WindowTitlebarProps extends BaseProps<HTMLDivElement> {
  /** Window document or application title displayed in the optical titlebar (defaults to `'Refractor Studio — Main.tsx'`). */
  title?: string;
  /** Optional document path, branch, or workspace subtitle displayed beneath the title. */
  subtitle?: string;
  /** Displays a subtle unsaved optical indicator dot beside the title when true (defaults to `false`). */
  modified?: boolean;
  /** Window chrome style: `'macos'` left traffic lights or `'windows'` right icon controls (defaults to `'macos'`). */
  chromeStyle?: WindowChromeStyle;
  /** Controlled window state mode (`'normal' | 'minimized' | 'maximized'`). */
  windowState?: WindowStateMode;
  /** Initial uncontrolled window state mode (defaults to `'normal'`). */
  defaultWindowState?: WindowStateMode;
  /** Whether the window is focused/active; dims optical specular sheen when false (defaults to `true`). */
  active?: boolean;
  /** Enables pointer dragging on the titlebar header with live delta reporting (defaults to `true`). */
  draggable?: boolean;
  /** Callback invoked during pointer dragging with incremental `(dx, dy)` pixel deltas. */
  onDragMove?: (dx: number, dy: number) => void;
  /** Callback invoked when the Minimize window control is activated. */
  onMinimize?: () => void;
  /** Callback invoked when Maximize / Restore toggles via control button or titlebar double-click. */
  onMaximizeToggle?: (nextState: 'normal' | 'maximized') => void;
  /** Callback invoked when the Close window control is activated. */
  onClose?: () => void;
  /** Optional trailing toolbar pills or status controls rendered inside the titlebar. */
  trailingSlot?: ReactNode;
  /** Optional window body content rendered inside the chrome frame; collapses cleanly when `minimized`. */
  children?: ReactNode;
}

const DEFAULT_WINDOW_TITLE = 'Refractor Studio — Main.tsx';
const INTERACTIVE_SELECTOR =
  'button, a, input, select, textarea, [role="button"]';

function isInteractiveEventTarget(target: EventTarget | null): boolean {
  return (
    target instanceof Element && target.closest(INTERACTIVE_SELECTOR) !== null
  );
}

const headerClass = /*#__PURE__*/ stableClassName('window-titlebar', 'header');
const sheenClass = /*#__PURE__*/ stableClassName('window-titlebar', 'sheen');
const controlsClass = /*#__PURE__*/ stableClassName('window-titlebar', 'controls');
const controlClass = /*#__PURE__*/ stableClassName('window-titlebar', 'control');
const titleGroupClass = /*#__PURE__*/ stableClassName('window-titlebar', 'title-group');
const titleClass = /*#__PURE__*/ stableClassName('window-titlebar', 'title');
const subtitleClass = /*#__PURE__*/ stableClassName('window-titlebar', 'subtitle');
const modifiedDotClass = /*#__PURE__*/ stableClassName('window-titlebar', 'modified-dot');
const trailingClass = /*#__PURE__*/ stableClassName('window-titlebar', 'trailing');
const bodyClass = /*#__PURE__*/ stableClassName('window-titlebar', 'body');

function WindowTitlebarInner({
  title = DEFAULT_WINDOW_TITLE,
  subtitle,
  modified = false,
  chromeStyle = 'macos',
  windowState,
  defaultWindowState = 'normal',
  active = true,
  draggable = true,
  onDragMove,
  onMinimize,
  onMaximizeToggle,
  onClose,
  trailingSlot,
  children,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: WindowTitlebarProps) {
  const titleId = useId();
  const subtitleId = useId();
  const bodyId = useId();
  const override = useComponentOverride('WindowTitlebar');

  const [currentState, setCurrentState] = useControllableState<WindowStateMode>(
    {
      value: windowState,
      defaultValue: defaultWindowState,
    }
  );
  const [isDragging, setIsDragging] = useState(false);
  const [announcement, setAnnouncement] = useState('');

  const cleanupDragRef = useRef<(() => void) | null>(null);
  const onDragMoveRef = useRef(onDragMove);
  onDragMoveRef.current = onDragMove;

  const resolvedTitle = title.trim() || DEFAULT_WINDOW_TITLE;
  const resolvedSubtitle = subtitle?.trim() || undefined;
  const isMinimized = currentState === 'minimized';
  const isMaximized = currentState === 'maximized';
  const hasBody = children !== undefined && children !== null;
  const showBody = hasBody && !isMinimized;

  useEffect(() => {
    return () => {
      cleanupDragRef.current?.();
    };
  }, []);

  useEffect(() => {
    if (!draggable && cleanupDragRef.current) {
      cleanupDragRef.current();
      setIsDragging(false);
    }
  }, [draggable]);

  const handleMinimize = useCallback(() => {
    const nextState: WindowStateMode =
      currentState === 'minimized' ? 'normal' : 'minimized';
    setCurrentState(nextState);
    setAnnouncement(
      nextState === 'minimized'
        ? `${resolvedTitle} minimized`
        : `${resolvedTitle} restored`
    );
    onMinimize?.();
  }, [currentState, onMinimize, resolvedTitle, setCurrentState]);

  const handleMaximizeToggle = useCallback(() => {
    const nextState: 'normal' | 'maximized' =
      currentState === 'maximized' ? 'normal' : 'maximized';
    setCurrentState(nextState);
    setAnnouncement(
      nextState === 'maximized'
        ? `${resolvedTitle} maximized`
        : `${resolvedTitle} restored`
    );
    onMaximizeToggle?.(nextState);
  }, [currentState, onMaximizeToggle, resolvedTitle, setCurrentState]);

  const handleClose = useCallback(() => {
    setAnnouncement(`${resolvedTitle} closed`);
    onClose?.();
  }, [onClose, resolvedTitle]);

  const handleControlKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLButtonElement>, action: () => void) => {
      if (event.nativeEvent.isComposing) {
        return;
      }
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        action();
      }
    },
    []
  );

  const handleHeaderDoubleClick = useCallback(
    (event: ReactMouseEvent<HTMLElement>) => {
      if (isInteractiveEventTarget(event.target)) {
        return;
      }
      handleMaximizeToggle();
    },
    [handleMaximizeToggle]
  );

  const handleHeaderPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (!draggable || event.button > 0) {
        return;
      }
      if (isInteractiveEventTarget(event.target)) {
        return;
      }

      event.preventDefault();
      cleanupDragRef.current?.();

      const pointerId = event.pointerId;
      let lastX = event.clientX;
      let lastY = event.clientY;

      setIsDragging(true);

      const handleWindowPointerMove = createCoalescedPointerMove((moveEvent: PointerEvent) => {
        if (moveEvent.pointerId !== pointerId) {
          return;
        }
        const dx = moveEvent.clientX - lastX;
        const dy = moveEvent.clientY - lastY;
        lastX = moveEvent.clientX;
        lastY = moveEvent.clientY;
        if (dx !== 0 || dy !== 0) {
          onDragMoveRef.current?.(dx, dy);
        }
      });

      const cleanup = () => {
        handleWindowPointerMove.cancel();
        window.removeEventListener('pointermove', handleWindowPointerMove);
        window.removeEventListener('pointerup', handleWindowPointerEnd);
        window.removeEventListener('pointercancel', handleWindowPointerEnd);
        cleanupDragRef.current = null;
      };

      const handleWindowPointerEnd = (endEvent: PointerEvent) => {
        if (endEvent.pointerId !== pointerId) {
          return;
        }
        cleanup();
        setIsDragging(false);
      };

      cleanupDragRef.current = cleanup;
      window.addEventListener('pointermove', handleWindowPointerMove, { passive: true });
      window.addEventListener('pointerup', handleWindowPointerEnd);
      window.addEventListener('pointercancel', handleWindowPointerEnd);
    },
    [draggable]
  );

  const baseStyle: OpticalStyleTokens | undefined =
    !active || isMaximized
      ? {
          ...(!active
            ? {
                '--prism-specular-opacity': 0.28,
                '--prism-caustic-opacity': 0.35,
              }
            : {}),
          ...(isMaximized ? { '--prism-radius-slab': '12px' } : {}),
        }
      : undefined;

  const merged = mergeProps({
    themeTarget: themeProps('window-titlebar', {
      chromeStyle,
      windowState: currentState,
      active,
      modified,
      draggable,
      dragging: isDragging,
    }),
    baseClassName:
      'prism-slab relative flex flex-col overflow-hidden w-full max-w-full min-w-0 transition-[color,background-color,border-color,opacity,transform] duration-200',
    overrideClassName: override?.className,
    userClassName: className,
    baseStyle,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });


  const maximizeLabel = isMaximized ? 'Restore window' : 'Maximize window';

  const titleBlock = (
    <div
      className={cx(
        titleGroupClass,
        'flex flex-col min-w-0 flex-1 max-w-full',
        chromeStyle === 'macos'
          ? 'items-center text-center'
          : 'items-start text-left'
      )}
    >
      <div
        className={cx(
          'flex items-center gap-1.5 min-w-0 max-w-full',
          chromeStyle === 'macos' ? 'justify-center' : 'justify-start'
        )}
      >
        <h2
          id={titleId}
          className={cx(
            titleClass,
            'text-xs sm:text-sm font-semibold tracking-[-0.01em] truncate'
          )}
          style={{
            color: active
              ? 'var(--prism-text-primary)'
              : 'var(--prism-text-secondary)',
          }}
        >
          {resolvedTitle}
        </h2>
        {modified ? (
          <>
            <span
              data-part="modified-dot"
              aria-hidden="true"
              className={cx(
                modifiedDotClass,
                'w-2 h-2 rounded-full shrink-0 transition-opacity'
              )}
              style={{
                backgroundColor: 'var(--prism-primary-main)',
                boxShadow:
                  '0 0 0 2px color-mix(in srgb, var(--prism-primary-main) 24%, transparent)',
                opacity: active ? 1 : 0.55,
              }}
            />
            <span className="sr-only">Unsaved changes</span>
          </>
        ) : null}
      </div>

      {resolvedSubtitle ? (
        <p
          id={subtitleId}
          className={cx(
            subtitleClass,
            'text-[11px] font-mono leading-tight truncate max-w-full'
          )}
          style={{
            color: active
              ? 'var(--prism-text-secondary)'
              : 'var(--prism-text-disabled)',
          }}
        >
          {resolvedSubtitle}
        </p>
      ) : null}
    </div>
  );

  const macosControls = (
    <div
      role="group"
      aria-label="Window controls"
      data-part="controls"
      className={cx(
        controlsClass,
        'group/controls inline-flex items-center gap-2 shrink-0'
      )}
    >
      <button
        type="button"
        aria-label="Close window"
        data-control="close"
        onClick={handleClose}
        onKeyDown={(event) => handleControlKeyDown(event, handleClose)}
        className={cx(
          controlClass,
          'prism-focus-ring w-3.5 h-3.5 rounded-full inline-flex items-center justify-center cursor-pointer transition-transform hover:scale-110 active:scale-95 shrink-0'
        )}
        style={{
          backgroundColor: 'var(--prism-error-main)',
          color: 'var(--prism-error-contrast)',
          opacity: active ? 1 : 0.45,
          boxShadow:
            'inset 0 1px 1px color-mix(in srgb, var(--prism-primary-contrast) 45%, transparent), 0 0 0 1px var(--prism-divider)',
        }}
      >
        <X
          aria-hidden="true"
          className="w-2 h-2 opacity-0 group-hover/controls:opacity-100 group-focus-within/controls:opacity-100 transition-opacity"
        />
      </button>

      <button
        type="button"
        aria-label="Minimize window"
        aria-pressed={isMinimized}
        aria-expanded={hasBody ? !isMinimized : undefined}
        aria-controls={showBody ? bodyId : undefined}
        data-control="minimize"
        onClick={handleMinimize}
        onKeyDown={(event) => handleControlKeyDown(event, handleMinimize)}
        className={cx(
          controlClass,
          'prism-focus-ring w-3.5 h-3.5 rounded-full inline-flex items-center justify-center cursor-pointer transition-transform hover:scale-110 active:scale-95 shrink-0'
        )}
        style={{
          backgroundColor: 'var(--prism-warning-main)',
          color: 'var(--prism-warning-contrast)',
          opacity: active ? 1 : 0.45,
          boxShadow:
            'inset 0 1px 1px color-mix(in srgb, var(--prism-primary-contrast) 45%, transparent), 0 0 0 1px var(--prism-divider)',
        }}
      >
        <Minus
          aria-hidden="true"
          className="w-2 h-2 opacity-0 group-hover/controls:opacity-100 group-focus-within/controls:opacity-100 transition-opacity"
        />
      </button>

      <button
        type="button"
        aria-label={maximizeLabel}
        aria-pressed={isMaximized}
        data-control="maximize"
        onClick={handleMaximizeToggle}
        onKeyDown={(event) => handleControlKeyDown(event, handleMaximizeToggle)}
        className={cx(
          controlClass,
          'prism-focus-ring w-3.5 h-3.5 rounded-full inline-flex items-center justify-center cursor-pointer transition-transform hover:scale-110 active:scale-95 shrink-0'
        )}
        style={{
          backgroundColor: 'var(--prism-success-main)',
          color: 'var(--prism-success-contrast)',
          opacity: active ? 1 : 0.45,
          boxShadow:
            'inset 0 1px 1px color-mix(in srgb, var(--prism-primary-contrast) 45%, transparent), 0 0 0 1px var(--prism-divider)',
        }}
      >
        {isMaximized ? (
          <Minimize2
            aria-hidden="true"
            className="w-2 h-2 opacity-0 group-hover/controls:opacity-100 group-focus-within/controls:opacity-100 transition-opacity"
          />
        ) : (
          <Maximize2
            aria-hidden="true"
            className="w-2 h-2 opacity-0 group-hover/controls:opacity-100 group-focus-within/controls:opacity-100 transition-opacity"
          />
        )}
      </button>
    </div>
  );

  const windowsControls = (
    <div
      role="group"
      aria-label="Window controls"
      data-part="controls"
      className={cx(
        controlsClass,
        'inline-flex items-center gap-1 shrink-0'
      )}
    >
      <button
        type="button"
        aria-label="Minimize window"
        aria-pressed={isMinimized}
        aria-expanded={hasBody ? !isMinimized : undefined}
        aria-controls={showBody ? bodyId : undefined}
        data-control="minimize"
        onClick={handleMinimize}
        onKeyDown={(event) => handleControlKeyDown(event, handleMinimize)}
        className={cx(
          controlClass,
          'prism-focus-ring h-7 w-8 rounded-lg inline-flex items-center justify-center cursor-pointer transition-opacity hover:opacity-85 active:scale-95 shrink-0 border'
        )}
        style={{
          color: active
            ? 'var(--prism-text-primary)'
            : 'var(--prism-text-secondary)',
          borderColor: 'var(--prism-divider)',
          backgroundColor:
            'color-mix(in srgb, var(--prism-crystal-top) 56%, transparent)',
        }}
      >
        <Minus aria-hidden="true" className="w-3.5 h-3.5" />
      </button>

      <button
        type="button"
        aria-label={maximizeLabel}
        aria-pressed={isMaximized}
        data-control="maximize"
        onClick={handleMaximizeToggle}
        onKeyDown={(event) => handleControlKeyDown(event, handleMaximizeToggle)}
        className={cx(
          controlClass,
          'prism-focus-ring h-7 w-8 rounded-lg inline-flex items-center justify-center cursor-pointer transition-opacity hover:opacity-85 active:scale-95 shrink-0 border'
        )}
        style={{
          color: active
            ? 'var(--prism-text-primary)'
            : 'var(--prism-text-secondary)',
          borderColor: 'var(--prism-divider)',
          backgroundColor:
            'color-mix(in srgb, var(--prism-crystal-top) 56%, transparent)',
        }}
      >
        {isMaximized ? (
          <Copy aria-hidden="true" className="w-3 h-3" />
        ) : (
          <Square aria-hidden="true" className="w-3 h-3" />
        )}
      </button>

      <button
        type="button"
        aria-label="Close window"
        data-control="close"
        onClick={handleClose}
        onKeyDown={(event) => handleControlKeyDown(event, handleClose)}
        className={cx(
          controlClass,
          'prism-focus-ring h-7 w-8 rounded-lg inline-flex items-center justify-center cursor-pointer transition-opacity hover:opacity-90 active:scale-95 shrink-0 border'
        )}
        style={{
          color: 'var(--prism-error-main)',
          borderColor:
            'color-mix(in srgb, var(--prism-error-main) 28%, var(--prism-divider))',
          backgroundColor:
            'color-mix(in srgb, var(--prism-error-main) 12%, transparent)',
        }}
      >
        <X aria-hidden="true" className="w-3.5 h-3.5" />
      </button>
    </div>
  );

  const trailingNode = trailingSlot ? (
    <div
      data-part="trailing"
      className={cx(
        trailingClass,
        'flex flex-wrap items-center gap-1.5 min-w-0 max-w-full shrink-0'
      )}
    >
      {trailingSlot}
    </div>
  ) : null;

  return (
    <div
      ref={ref}
      role="region"
      aria-labelledby={titleId}
      aria-describedby={resolvedSubtitle ? subtitleId : undefined}
      {...rest}
      {...merged}
    >
      <header
        data-part="header"
        data-dragging={isDragging ? 'true' : 'false'}
        onPointerDown={handleHeaderPointerDown}
        onDoubleClick={handleHeaderDoubleClick}
        className={cx(
          headerClass,
          'prism-crystal relative flex flex-wrap items-center justify-between gap-x-3 gap-y-2 px-3.5 py-2.5 min-w-0 max-w-full select-none',
          showBody ? 'border-b' : '',
          draggable
            ? isDragging
              ? 'cursor-grabbing'
              : 'cursor-grab'
            : 'cursor-default'
        )}
        style={STYLE_BORDER_DIVIDER}
      >
        <span
          aria-hidden="true"
          data-part="sheen"
          className={cx(
            sheenClass,
            'pointer-events-none absolute inset-x-4 top-0 h-px transition-opacity duration-200'
          )}
          style={{
            opacity: active ? 0.9 : 0.2,
            background:
              'linear-gradient(90deg, transparent 0%, color-mix(in srgb, var(--prism-primary-contrast) 70%, transparent) 30%, color-mix(in srgb, var(--prism-secondary-light) 55%, transparent) 70%, transparent 100%)',
          }}
        />

        {chromeStyle === 'macos' ? (
          <>
            {macosControls}
            {titleBlock}
            {trailingNode ?? (
              <span
                aria-hidden="true"
                className="hidden sm:block w-[58px] shrink-0"
              />
            )}
          </>
        ) : (
          <>
            {titleBlock}
            <div className="flex flex-wrap items-center gap-2 min-w-0 max-w-full shrink-0">
              {trailingNode}
              {windowsControls}
            </div>
          </>
        )}
      </header>

      {showBody ? (
        <div
          id={bodyId}
          data-part="body"
          className={cx(
            bodyClass,
            'p-4 text-sm min-w-0 max-w-full flex-1 overflow-auto'
          )}
          style={STYLE_TEXT_PRIMARY}
        >
          {children}
        </div>
      ) : null}

      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {announcement}
      </div>
    </div>
  );
}

export const WindowTitlebar = /*#__PURE__*/ memoWithDisplayName(WindowTitlebarInner, 'WindowTitlebar');
