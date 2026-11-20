const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

/**
 * Returns false for prototype-polluting object property keys.
 */
export function isSafeObjectKey(key: string): boolean {
  return !FORBIDDEN_KEYS.has(key);
}

/**
 * Clamps numeric inputs while defending against NaN and Infinity.
 */
export function clampNumber(value: number, min: number, max: number, fallback = min): number {
  if (!Number.isFinite(value)) return fallback;
  const safeMin = Math.min(min, max);
  const safeMax = Math.max(min, max);
  return Math.max(safeMin, Math.min(safeMax, value));
}

/**
 * Validates and sanitizes user-provided URLs against XSS/protocol injection.
 * Allows http:, https:, mailto:, hash fragments, and relative paths.
 * Optionally permits safe raster data:image/(png|jpeg|webp|gif) URIs when explicitly enabled.
 */
function stripControlChars(input: string): string {
  let result = '';
  for (let i = 0; i < input.length; i += 1) {
    const code = input.charCodeAt(i);
    if (code >= 32 && code !== 127) {
      result += input[i] ?? '';
    }
  }
  return result;
}

export function sanitizeUrl(rawUrl: string, allowRasterDataUri = false): string {
  const cleaned = stripControlChars(rawUrl).trim();

  if (!cleaned) return '';

  if (cleaned.startsWith('/') && !cleaned.startsWith('//')) {
    return cleaned;
  }
  if (cleaned.startsWith('#') || cleaned.startsWith('./') || cleaned.startsWith('../')) {
    return cleaned;
  }

  const lower = cleaned.toLowerCase();
  if (lower.startsWith('http://') || lower.startsWith('https://') || lower.startsWith('mailto:')) {
    return cleaned;
  }

  if (
    allowRasterDataUri &&
    /^data:image\/(?:png|jpeg|jpg|webp|gif);base64,[a-z0-9+/=]+$/i.test(cleaned)
  ) {
    return cleaned;
  }

  return '';
}

export interface SanitizedRichBlock {
  id: string;
  tag: 'p' | 'h1' | 'h2' | 'blockquote' | 'li' | 'img';
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  href?: string;
  src?: string;
  alt?: string;
  listType?: 'ul' | 'ol';
}

/**
 * Strict allowlist HTML sanitizer removing <script>, <iframe>, <object>, <embed>,
 * <style>, inline on* event handlers, and unsafe javascript:/vbscript:/data:text/html URIs.
 */
export function sanitizeHtml(rawHtml: string): string {
  let out = rawHtml;
  // Remove dangerous block tags and their inner payload completely
  out = out.replace(/<\s*(script|style|iframe|object|embed|svg|math|form|meta|link|base)\b[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, '');
  out = out.replace(/<\s*(script|style|iframe|object|embed|svg|math|form|meta|link|base)\b[^>]*\/?>/gi, '');
  // Remove HTML comments
  out = out.replace(/<!--[\s\S]*?-->/g, '');
  // Allowlist safe tags and sanitize their attributes
  const allowedTags = new Set(['p', 'br', 'strong', 'b', 'em', 'i', 'u', 'h1', 'h2', 'h3', 'ul', 'ol', 'li', 'blockquote', 'code', 'pre', 'a', 'img', 'span']);

  out = out.replace(/<\s*(\/?)\s*([a-zA-Z0-9]+)([^>]*)>/g, (_full, closing: string, rawTag: string, rawAttrs: string) => {
    const tag = rawTag.toLowerCase();
    if (!allowedTags.has(tag)) {
      return '';
    }
    if (closing === '/') {
      return tag === 'br' || tag === 'img' ? '' : `</${tag}>`;
    }
    if (tag === 'a') {
      const hrefMatch = /\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(rawAttrs);
      const rawHref = hrefMatch ? (hrefMatch[1] ?? hrefMatch[2] ?? hrefMatch[3] ?? '') : '';
      const safeHref = sanitizeUrl(rawHref, false);
      if (!safeHref) return '<a>';
      const escapedHref = safeHref.replace(/"/g, '&quot;');
      return `<a href="${escapedHref}" rel="noopener noreferrer">`;
    }
    if (tag === 'img') {
      const srcMatch = /\bsrc\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(rawAttrs);
      const altMatch = /\balt\s*=\s*(?:"([^"]*)"|'([^']*)')/i.exec(rawAttrs);
      const rawSrc = srcMatch ? (srcMatch[1] ?? srcMatch[2] ?? srcMatch[3] ?? '') : '';
      const safeSrc = sanitizeUrl(rawSrc, true);
      if (!safeSrc) return '';
      const safeAlt = (altMatch ? (altMatch[1] ?? altMatch[2] ?? '') : '').replace(/[<>"']/g, '');
      return `<img src="${safeSrc.replace(/"/g, '&quot;')}" alt="${safeAlt}" />`;
    }
    return tag === 'br' ? '<br />' : `<${tag}>`;
  });

  return out;
}

/**
 * Neutralizes CSV / Excel formula injection (OWASP CSV Injection defense)
 * and applies strict RFC 4180 quoting.
 */
export function sanitizeCsvCell(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return '';
  let text = String(value);
  // Guard leading spreadsheet formula triggers (=, +, -, @, tab, CR)
  if (/^[\t\r ]*[=+\-@]/.test(text) || /^[\t\r]/.test(text)) {
    text = `'${text}`;
  }
  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

/**
 * Builds an RFC 4180 compliant, formula-safe CSV string from typed headers and rows.
 */
export function buildSafeCsv(
  headers: ReadonlyArray<string>,
  rows: ReadonlyArray<ReadonlyArray<string | number | boolean | null | undefined>>
): string {
  const headerLine = headers.map((h) => sanitizeCsvCell(h)).join(',');
  const bodyLines = rows.map((row) => row.map((cell) => sanitizeCsvCell(cell)).join(','));
  return [headerLine, ...bodyLines].join('\r\n');
}

/**
 * Safely splits text into highlighted literal fragments without constructing regexes from user input.
 */
export interface HighlightSegment {
  text: string;
  highlighted: boolean;
}

export function splitLiteralHighlight(source: string, query: string): HighlightSegment[] {
  const q = query.trim();
  if (!q) return [{ text: source, highlighted: false }];

  const lowerSource = source.toLowerCase();
  const lowerQuery = q.toLowerCase();
  const segments: HighlightSegment[] = [];
  let cursor = 0;

  while (cursor < source.length) {
    const idx = lowerSource.indexOf(lowerQuery, cursor);
    if (idx === -1) {
      segments.push({ text: source.slice(cursor), highlighted: false });
      break;
    }
    if (idx > cursor) {
      segments.push({ text: source.slice(cursor, idx), highlighted: false });
    }
    segments.push({ text: source.slice(idx, idx + q.length), highlighted: true });
    cursor = idx + q.length;
  }

  return segments.length > 0 ? segments : [{ text: source, highlighted: false }];
}
