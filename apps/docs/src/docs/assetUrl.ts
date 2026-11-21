/**
 * Resolves static documentation assets safely across both local root (`/`)
 * and subpath deployments such as GitHub Pages (`/refractor-ui/`).
 */
export function assetUrl(relativePath: string): string {
  const base = import.meta.env.BASE_URL.endsWith('/')
    ? import.meta.env.BASE_URL
    : `${import.meta.env.BASE_URL}/`;
  const clean = relativePath.replace(/^\/+/, '');
  return `${base}${clean}`;
}
