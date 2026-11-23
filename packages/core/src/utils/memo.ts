import { memo, type ComponentType, type MemoExoticComponent } from 'react';

/**
 * Pure tree-shakeable React.memo + displayName helper.
 * Eliminates top-level `Component.displayName = '...'` property-assignment side effects
 * so Rollup, Vite, esbuild, and Webpack can cleanly tree-shake unused components when
 * paired with `/*#__PURE__*\/` call-site annotations.
 */
export function memoWithDisplayName<P extends object>(
  component: ComponentType<P>,
  displayName: string
): MemoExoticComponent<ComponentType<P>> {
  const memoized = memo(component);
  memoized.displayName = displayName;
  return memoized;
}
