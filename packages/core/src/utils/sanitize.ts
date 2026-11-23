const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

const RASTER_DATA_URI_RE = /^data:image\/(?:png|jpeg|jpg|webp|gif);base64,[a-z0-9+/=]+$/i;
const DANGEROUS_BLOCK_TAG_RE =
  /<\s*(script|style|iframe|object|embed|svg|math|form|meta|link|base)\b[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi;
const DANGEROUS_VOID_TAG_RE =
  /<\s*(script|style|iframe|object|embed|svg|math|form|meta|link|base)\b[^>]*\/?>/gi;
const HTML_COMMENT_RE = /<!--[\s\S]*?-->/g;
const HTML_TAG_RE = /<\s*(\/?)\s*([a-zA-Z0-9]+)([^>]*)>/g;
const HREF_ATTR_RE = /\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i;
const SRC_ATTR_RE = /\bsrc\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i;
const ALT_ATTR_RE = /\balt\s*=\s*(?:"([^"]*)"|'([^']*)')/i;
const CSV_FORMULA_TRIGGER_RE = /^[\t\r ]*[=+\-@]/;
const CSV_LEADING_CTRL_RE = /^[\t\r]/;
const CSV_NEEDS_QUOTE_RE = /[",\r\n]/;

const ALLOWED_HTML_TAGS = new Set([
  'p',
  'br',
  'strong',
  'b',
  'em',
  'i',
  'u',
  'h1',
  'h2',
  'h3',
  'ul',
  'ol',
  'li',
  'blockquote',
  'code',
  'pre',
  'a',
  'img',
  'span',
]);

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
  const safeMin = min < max ? min : max;
  const safeMax = min < max ? max : min;
  return value < safeMin ? safeMin : value > safeMax ? safeMax : value;
}

/**
 * Removes ASCII control characters with a zero-allocation fast path when none are present.
 */
function stripControlChars(input: string): string {
  const len = input.length;
  let firstControl = -1;
  for (let i = 0; i < len; i += 1) {
    const code = input.charCodeAt(i);
    if (code < 32 || code === 127) {
      firstControl = i;
      break;
    }
  }
  if (firstControl === -1) {
    return input;
  }

  let result = input.slice(0, firstControl);
  for (let i = firstControl + 1; i < len; i += 1) {
    const code = input.charCodeAt(i);
    if (code >= 32 && code !== 127) {
      result += input[i] ?? '';
    }
  }
  return result;
}

/**
 * Validates and sanitizes user-provided URLs against XSS/protocol injection.
 * Allows http:, https:, mailto:, hash fragments, and relative paths.
 * Optionally permits safe raster data:image/(png|jpeg|webp|gif) URIs when explicitly enabled.
 */
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

  if (allowRasterDataUri && RASTER_DATA_URI_RE.test(cleaned)) {
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
  out = out.replace(DANGEROUS_BLOCK_TAG_RE, '');
  out = out.replace(DANGEROUS_VOID_TAG_RE, '');
  out = out.replace(HTML_COMMENT_RE, '');

  out = out.replace(
    HTML_TAG_RE,
    (_full, closing: string, rawTag: string, rawAttrs: string) => {
      const tag = rawTag.toLowerCase();
      if (!ALLOWED_HTML_TAGS.has(tag)) {
        return '';
      }
      if (closing === '/') {
        return tag === 'br' || tag === 'img' ? '' : `</${tag}>`;
      }
      if (tag === 'a') {
        const hrefMatch = HREF_ATTR_RE.exec(rawAttrs);
        const rawHref = hrefMatch ? (hrefMatch[1] ?? hrefMatch[2] ?? hrefMatch[3] ?? '') : '';
        const safeHref = sanitizeUrl(rawHref, false);
        if (!safeHref) return '<a>';
        const escapedHref = safeHref.replace(/"/g, '&quot;');
        return `<a href="${escapedHref}" rel="noopener noreferrer">`;
      }
      if (tag === 'img') {
        const srcMatch = SRC_ATTR_RE.exec(rawAttrs);
        const altMatch = ALT_ATTR_RE.exec(rawAttrs);
        const rawSrc = srcMatch ? (srcMatch[1] ?? srcMatch[2] ?? srcMatch[3] ?? '') : '';
        const safeSrc = sanitizeUrl(rawSrc, true);
        if (!safeSrc) return '';
        const safeAlt = (altMatch ? (altMatch[1] ?? altMatch[2] ?? '') : '').replace(/[<>"']/g, '');
        return `<img src="${safeSrc.replace(/"/g, '&quot;')}" alt="${safeAlt}" />`;
      }
      return tag === 'br' ? '<br />' : `<${tag}>`;
    }
  );

  return out;
}

/**
 * Neutralizes CSV / Excel formula injection (OWASP CSV Injection defense)
 * and applies strict RFC 4180 quoting.
 */
export function sanitizeCsvCell(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return '';
  let text = String(value);
  if (CSV_FORMULA_TRIGGER_RE.test(text) || CSV_LEADING_CTRL_RE.test(text)) {
    text = `'${text}`;
  }
  if (CSV_NEEDS_QUOTE_RE.test(text)) {
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
  const lines = new Array<string>(rows.length + 1);
  lines[0] = headers.map((h) => sanitizeCsvCell(h)).join(',');
  for (let i = 0; i < rows.length; i += 1) {
    lines[i + 1] = rows[i]!.map((cell) => sanitizeCsvCell(cell)).join(',');
  }
  return lines.join('\r\n');
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
