'use client';

import {
  Children,
  createContext,
  isValidElement,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';
import type { BaseProps } from '../BaseProps';
import type { MotionTokenName } from '../motion/motion.theme';
import { useMotionConfig } from '../motion/MotionConfigProvider';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { memoWithDisplayName } from '../utils/memo';
import { mergeProps } from '../utils/mergeProps';
import { themeProps } from '../utils/themeProps';

export type AnimatePresenceMode = 'sync' | 'wait' | 'popLayout';

export interface PresenceContextValue {
  readonly isPresent: boolean;
  readonly safeToRemove: () => void;
}

const DEFAULT_PRESENCE: PresenceContextValue = /*#__PURE__*/ Object.freeze({
  isPresent: true,
  safeToRemove: () => undefined,
});

const PresenceContext = /*#__PURE__*/ createContext<PresenceContextValue>(DEFAULT_PRESENCE);

/** Returns `[isPresent, safeToRemove]` for components mounted inside `<AnimatePresence>`. */
export function usePresence(): readonly [boolean, () => void] {
  const ctx = useContext(PresenceContext);
  return [ctx.isPresent, ctx.safeToRemove] as const;
}

/** Returns true while the component is mounted and not currently exiting. */
export function useIsPresent(): boolean {
  return useContext(PresenceContext).isPresent;
}

export interface AnimatePresenceProps extends BaseProps<HTMLDivElement> {
  /** Coordination mode: `'sync'` (overlap), `'wait'` (exit before enter), or `'popLayout'`. */
  mode?: AnimatePresenceMode;
  /** Semantic motion token used to derive exit duration (default: `'ui'`). */
  transitionToken?: MotionTokenName;
  /** Optional explicit exit duration in ms overriding token default. */
  exitDurationMs?: number;
  /** Callback invoked after all exiting children finish unmounting. */
  onExitComplete?: () => void;
  children?: ReactNode;
}

interface TrackedChild {
  readonly key: string;
  readonly element: ReactElement;
  readonly state: 'present' | 'exiting';
}

const ROOT_CLASS = /*#__PURE__*/ stableClassName('animate-presence');
const ITEM_CLASS = /*#__PURE__*/ stableClassName('animate-presence', 'item');

function extractKeyedElements(children: ReactNode): Array<{ key: string; element: ReactElement }> {
  const out: Array<{ key: string; element: ReactElement }> = [];
  Children.forEach(children, (child, index) => {
    if (isValidElement(child)) {
      const key = child.key !== null ? String(child.key) : `__idx_${index}`;
      out.push({ key, element: child });
    }
  });
  return out;
}

function AnimatePresenceInner({
  mode = 'sync',
  transitionToken = 'ui',
  exitDurationMs,
  onExitComplete,
  className,
  style,
  xstyle,
  ref,
  children,
  ...rest
}: AnimatePresenceProps) {
  const override = useComponentOverride('AnimatePresence');
  const { getToken, isCalmMotion } = useMotionConfig();
  const token = getToken(transitionToken);
  const resolvedExitMs =
    exitDurationMs ?? (isCalmMotion ? token.calmOpacityMs : Math.min(280, token.durationMs));

  const incoming = extractKeyedElements(children);
  const [tracked, setTracked] = useState<TrackedChild[]>(() =>
    incoming.map((item) => ({ key: item.key, element: item.element, state: 'present' }))
  );

  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const onExitCompleteRef = useRef(onExitComplete);
  onExitCompleteRef.current = onExitComplete;

  const removeExitedKey = (targetKey: string) => {
    const existingTimer = timersRef.current.get(targetKey);
    if (existingTimer) {
      clearTimeout(existingTimer);
      timersRef.current.delete(targetKey);
    }
    setTracked((prev) => {
      const next = prev.filter((item) => !(item.key === targetKey && item.state === 'exiting'));
      const stillExiting = next.some((item) => item.state === 'exiting');
      if (!stillExiting) {
        onExitCompleteRef.current?.();
      }
      return next;
    });
  };

  useEffect(() => {
    const nextMap = new Map<string, ReactElement>();
    for (const item of incoming) {
      nextMap.set(item.key, item.element);
    }

    setTracked((prev) => {
      const mergedList: TrackedChild[] = [];
      const seen = new Set<string>();

      for (const item of prev) {
        const updated = nextMap.get(item.key);
        if (updated) {
          const timer = timersRef.current.get(item.key);
          if (timer) {
            clearTimeout(timer);
            timersRef.current.delete(item.key);
          }
          mergedList.push({ key: item.key, element: updated, state: 'present' });
          seen.add(item.key);
        } else {
          mergedList.push({ key: item.key, element: item.element, state: 'exiting' });
          seen.add(item.key);
          if (!timersRef.current.has(item.key)) {
            const timeoutId = setTimeout(() => {
              removeExitedKey(item.key);
            }, resolvedExitMs);
            timersRef.current.set(item.key, timeoutId);
          }
        }
      }

      const hasExiting = mergedList.some((item) => item.state === 'exiting');
      if (mode !== 'wait' || !hasExiting) {
        for (const item of incoming) {
          if (!seen.has(item.key)) {
            mergedList.push({ key: item.key, element: item.element, state: 'present' });
          }
        }
      }

      return mergedList;
    });
  }, [children, mode, resolvedExitMs]);

  useEffect(() => {
    const map = timersRef.current;
    return () => {
      for (const timer of map.values()) {
        clearTimeout(timer);
      }
      map.clear();
    };
  }, []);

  const merged = mergeProps({
    themeTarget: themeProps('AnimatePresence', {
      mode,
      calm: isCalmMotion,
    }),
    baseClassName: ROOT_CLASS,
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  return (
    <div ref={ref} {...rest} {...merged}>
      {tracked.map((item) => {
        const isExiting = item.state === 'exiting';
        return (
          <PresenceContext
            key={item.key}
            value={{
              isPresent: !isExiting,
              safeToRemove: () => removeExitedKey(item.key),
            }}
          >
            <div
              className={ITEM_CLASS}
              data-presence-state={item.state}
              style={{
                opacity: isExiting ? 0 : 1,
                transform:
                  isExiting && !isCalmMotion
                    ? 'scale(0.96) translateY(4px)'
                    : 'scale(1) translateY(0px)',
                transition: `opacity ${resolvedExitMs}ms ease-out, transform ${resolvedExitMs}ms ${token.cssEasing}`,
                position: isExiting && mode === 'popLayout' ? 'absolute' : undefined,
                pointerEvents: isExiting ? 'none' : undefined,
              }}
            >
              {item.element}
            </div>
          </PresenceContext>
        );
      })}
    </div>
  );
}

export const AnimatePresence = /*#__PURE__*/ memoWithDisplayName(AnimatePresenceInner, 'AnimatePresence');
