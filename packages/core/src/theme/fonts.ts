/**
 * On-demand, allowlist-hardened WebFont loader for Refractor multi-material themes.
 *
 * Ensures zero upfront mobile font bloat by lazily injecting deduplicated Google Fonts
 * stylesheets ONLY when an active theme requests a specific webfont family.
 */

const GOOGLE_FONT_SPEC_MAP = new Map<string, string>([
  ['plus jakarta sans', 'Plus+Jakarta+Sans:wght@400;500;600;700'],
  ['inter', 'Inter:wght@400;500;600;700'],
  ['jetbrains mono', 'JetBrains+Mono:wght@400;500;600'],
  ['fira code', 'Fira+Code:wght@400;500;600'],
  ['ibm plex mono', 'IBM+Plex+Mono:wght@400;500;600'],
  ['ibm plex serif', 'IBM+Plex+Serif:wght@400;500;600;700'],
  ['orbitron', 'Orbitron:wght@400;600;700'],
  ['rajdhani', 'Rajdhani:wght@500;600;700'],
  ['russo one', 'Russo+One'],
  ['oswald', 'Oswald:wght@400;500;600;700'],
  ['press start 2p', 'Press+Start+2P'],
  ['vt323', 'VT323'],
  ['syne', 'Syne:wght@500;600;700'],
  ['rubik', 'Rubik:wght@400;500;600;700'],
  ['nunito', 'Nunito:wght@400;600;700'],
  ['poppins', 'Poppins:wght@400;500;600;700'],
  ['dm sans', 'DM+Sans:wght@400;500;700'],
  ['manrope', 'Manrope:wght@400;500;600;700'],
  ['sora', 'Sora:wght@400;500;600;700'],
  ['merriweather', 'Merriweather:wght@400;700'],
  ['roboto', 'Roboto:wght@400;500;700'],
  ['ubuntu', 'Ubuntu:wght@400;500;700'],
  ['cantarell', 'Cantarell:wght@400;700'],
  ['eb garamond', 'EB+Garamond:wght@400;500;600;700'],
  ['garamond', 'EB+Garamond:wght@400;500;600;700'],
  ['space mono', 'Space+Mono:wght@400;700'],
]);

const SAFE_GOOGLE_FONT_SPEC_RE = /^[A-Za-z0-9+]+(?::[a-z,]+@[0-9,;]+)?$/;
const GOOGLE_FONTS_ORIGIN = 'https://fonts.googleapis.com';
const GOOGLE_FONTS_STATIC_ORIGIN = 'https://fonts.gstatic.com';

export const SUPPORTED_THEME_FONT_FAMILIES: ReadonlyArray<string> = Array.from(
  new Set(GOOGLE_FONT_SPEC_MAP.values())
);

/**
 * Extracts canonical Google Fonts CSS2 family specs from a CSS `font-family` stack.
 * Uses linear string parsing (zero ReDoS risk) and an explicit static allowlist.
 */
export function extractGoogleFontsFromStack(fontFamily: string): string[] {
  if (!fontFamily || typeof fontFamily !== 'string') return [];
  const results: string[] = [];
  const seen = new Set<string>();

  for (const rawPart of fontFamily.split(',')) {
    const cleaned = rawPart.trim().replace(/^["']+|["']+$/g, '').toLowerCase();
    const spec = GOOGLE_FONT_SPEC_MAP.get(cleaned);
    if (spec && !seen.has(spec)) {
      seen.add(spec);
      results.push(spec);
    }
  }

  return results;
}

/**
 * Validates and builds a safe Google Fonts CSS2 URL for the given family specs.
 * Rejects any malformed or non-allowlisted input to prevent URL or CSS injection.
 */
export function buildGoogleFontsHref(families: ReadonlyArray<string>): string | null {
  const valid: string[] = [];
  const seen = new Set<string>();

  for (const raw of families) {
    if (typeof raw !== 'string') continue;
    const trimmed = raw.trim();
    const mapped = GOOGLE_FONT_SPEC_MAP.get(trimmed.toLowerCase()) ?? trimmed;
    if (!SAFE_GOOGLE_FONT_SPEC_RE.test(mapped)) continue;
    if (!seen.has(mapped)) {
      seen.add(mapped);
      valid.push(mapped);
    }
  }

  if (valid.length === 0) return null;
  valid.sort();
  const query = valid.map((spec) => `family=${spec}`).join('&');
  return `${GOOGLE_FONTS_ORIGIN}/css2?${query}&display=swap`;
}

const loadedFontLinksByDoc = new WeakMap<Document, Map<string, HTMLLinkElement>>();
const preconnectLinksByDoc = new WeakMap<Document, Map<string, HTMLLinkElement>>();

function ensurePreconnect(doc: Document, href: string, crossOrigin?: string): void {
  let docMap = preconnectLinksByDoc.get(doc);
  if (!docMap) {
    docMap = new Map<string, HTMLLinkElement>();
    preconnectLinksByDoc.set(doc, docMap);
  }
  const existing = docMap.get(href);
  if (existing && existing.isConnected) return;

  const selector = `link[data-refractor-font-preconnect="${href}"]`;
  const domExisting = doc.head.querySelector<HTMLLinkElement>(selector);
  if (domExisting) {
    docMap.set(href, domExisting);
    return;
  }
  const link = doc.createElement('link');
  link.rel = 'preconnect';
  link.href = href;
  if (crossOrigin) {
    link.crossOrigin = crossOrigin;
  }
  link.setAttribute('data-refractor-font-preconnect', href);
  doc.head.appendChild(link);
  docMap.set(href, link);
}

/**
 * Lazily injects a deduplicated Google Fonts stylesheet for the requested font families.
 * Uses a per-document WeakMap cache with DOM connectedness verification to avoid
 * repeated head.querySelector walks on theme switches.
 */
export function ensureThemeFontsLoaded(
  families: ReadonlyArray<string>,
  doc?: Document
): boolean {
  const targetDoc = doc ?? (typeof document !== 'undefined' ? document : undefined);
  if (!targetDoc || !targetDoc.head) return false;

  const href = buildGoogleFontsHref(families);
  if (!href) return false;

  const key = families
    .map((f) => GOOGLE_FONT_SPEC_MAP.get(f.trim().toLowerCase()) ?? f.trim())
    .filter((f) => SAFE_GOOGLE_FONT_SPEC_RE.test(f))
    .sort()
    .join('|');

  if (!key) return false;

  let docFonts = loadedFontLinksByDoc.get(targetDoc);
  if (!docFonts) {
    docFonts = new Map<string, HTMLLinkElement>();
    loadedFontLinksByDoc.set(targetDoc, docFonts);
  }
  const cachedLink = docFonts.get(key);
  if (cachedLink && cachedLink.isConnected) {
    return false;
  }

  const domExisting = targetDoc.head.querySelector<HTMLLinkElement>(
    `link[data-refractor-font-key="${key}"]`
  );
  if (domExisting) {
    docFonts.set(key, domExisting);
    return false;
  }

  ensurePreconnect(targetDoc, GOOGLE_FONTS_ORIGIN);
  ensurePreconnect(targetDoc, GOOGLE_FONTS_STATIC_ORIGIN, 'anonymous');

  const link = targetDoc.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  link.setAttribute('data-refractor-font-key', key);
  targetDoc.head.appendChild(link);
  docFonts.set(key, link);
  return true;
}

/**
 * Lists all active theme font keys injected into the target document head.
 */
export function getLoadedThemeFontKeys(doc?: Document): string[] {
  const targetDoc = doc ?? (typeof document !== 'undefined' ? document : undefined);
  if (!targetDoc || !targetDoc.head) return [];
  const links = targetDoc.head.querySelectorAll('link[data-refractor-font-key]');
  const keys: string[] = [];
  links.forEach((node) => {
    const val = node.getAttribute('data-refractor-font-key');
    if (val) keys.push(val);
  });
  return keys;
}
