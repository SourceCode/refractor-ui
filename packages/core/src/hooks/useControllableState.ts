import { useCallback, useRef, useState } from 'react';

export interface UseControllableStateOptions<T> {
  value?: T;
  defaultValue: T;
  onChange?: (next: T) => void;
}

/**
 * Supports both controlled (`value` provided) and uncontrolled (`defaultValue`)
 * React component patterns while keeping the returned setter referentially stable
 * across state updates so downstream `useCallback` hooks and `React.memo` children
 * do not invalidate unnecessarily.
 */
export function useControllableState<T>({
  value,
  defaultValue,
  onChange,
}: UseControllableStateOptions<T>): [T, (next: T | ((prev: T) => T)) => void] {
  const [uncontrolled, setUncontrolled] = useState<T>(defaultValue);
  const isControlled = value !== undefined;
  const current = isControlled ? value : uncontrolled;

  const currentRef = useRef<T>(current);
  const isControlledRef = useRef<boolean>(isControlled);
  const onChangeRef = useRef<((next: T) => void) | undefined>(onChange);

  currentRef.current = current;
  isControlledRef.current = isControlled;
  onChangeRef.current = onChange;

  const setValue = useCallback((next: T | ((prev: T) => T)) => {
    const prevValue = currentRef.current;
    const resolved =
      typeof next === 'function' ? (next as (prev: T) => T)(prevValue) : next;
    if (!isControlledRef.current && !Object.is(resolved, prevValue)) {
      currentRef.current = resolved;
      setUncontrolled(resolved);
    }
    onChangeRef.current?.(resolved);
  }, []);

  return [current, setValue];
}
