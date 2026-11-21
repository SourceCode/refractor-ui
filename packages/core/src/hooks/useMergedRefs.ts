import { useCallback, type Ref, type RefCallback } from 'react';

type AssignableRef<T> = Ref<T> | undefined;

/**
 * Merges multiple React 19 refs (object refs and callback refs) into one stable callback ref.
 */
export function useMergedRefs<T>(...refs: AssignableRef<T>[]): RefCallback<T> {
  return useCallback(
    (node: T | null) => {
      for (const ref of refs) {
        if (!ref) continue;
        if (typeof ref === 'function') {
          ref(node);
        } else {
          ref.current = node;
        }
      }
    },
    refs
  );
}
