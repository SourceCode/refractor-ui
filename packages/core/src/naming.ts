export const REFRACTOR_PREFIX = 'refractor';

/**
 * Build the stable Refractor target class name for a component or sub-part.
 * Example: stableClassName('primary-button') -> 'refractor-primary-button'
 */
export function stableClassName(component: string, part?: string): string {
  const normalized = component
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[^a-zA-Z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();

  if (!part) {
    return `${REFRACTOR_PREFIX}-${normalized}`;
  }

  const normalizedPart = part
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[^a-zA-Z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();

  return `${REFRACTOR_PREFIX}-${normalized}__${normalizedPart}`;
}
