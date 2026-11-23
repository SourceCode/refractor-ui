import { useCallback, useRef, type Ref, type RefCallback } from 'react';

type AssignableRef<T> = Ref<T> | undefined;

/**
 * Merges multiple React 19 refs (object refs and callback refs) into one
 * referentially stable callback ref. Storing refs in a ref container keeps the
 * returned RefCallback identity constant across renders, avoiding redundant
 * React ref detach/reattach cycles while preserving contravariant Ref<T> typing.
 */
export function useMergedRefs<T>(...refs: AssignableRef<T>[]): RefCallback<T> {
  const refsRef = useRef<AssignableRef<T>[]>(refs);
  refsRef.current = refs;

  return useCallback<RefCallback<T>>((node: T | null) => {
    const activeRefs = refsRef.current;
    for (let i = 0; i < activeRefs.length; i += 1) {
      const ref = activeRefs[i];
      if (!ref) continue;
      if (typeof ref === 'function') {
        ref(node);
      } else {
        ref.current = node;
      }
    }
  }, []);
}
