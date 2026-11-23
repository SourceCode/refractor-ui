export const REFRACTOR_PREFIX = 'refractor';

const MAX_CLASS_CACHE_SIZE = 2048;
const stableClassCache = new Map<string, string>();

function normalizeSegment(raw: string): string {
  return raw
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[^a-zA-Z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

/**
 * Build the stable Refractor target class name for a component or sub-part.
 * Cached in O(1) to avoid repeated regex execution on hot render paths.
 * Example: stableClassName('primary-button') -> 'refractor-primary-button'
 */
export function stableClassName(component: string, part?: string): string {
  const cacheKey = part === undefined ? component : `${component}\0${part}`;
  const cached = stableClassCache.get(cacheKey);
  if (cached !== undefined) {
    return cached;
  }

  const normalized = normalizeSegment(component);
  const resolved =
    part === undefined || part === ''
      ? `${REFRACTOR_PREFIX}-${normalized}`
      : `${REFRACTOR_PREFIX}-${normalized}__${normalizeSegment(part)}`;

  if (stableClassCache.size >= MAX_CLASS_CACHE_SIZE) {
    stableClassCache.clear();
  }
  stableClassCache.set(cacheKey, resolved);
  return resolved;
}
