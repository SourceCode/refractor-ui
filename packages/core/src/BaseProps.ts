import type React from 'react';

export type OpticalCssVarKey = `--prism-${string}`;

export type OpticalStyleTokens = React.CSSProperties & {
  [key in OpticalCssVarKey]?: string | number;
};

/**
 * BaseProps — Shared base interface for all Refractor Optical Glass UI components.
 *
 * Implements Refractor's Open-Internals BaseProps architecture:
 * - Preserves event handlers, aria-*, role, tabIndex, hidden, draggable, inert, dir,
 *   className, style, id, ref (React 19 standard prop), xstyle, and data-* attributes.
 * - Omits footgun, deprecated, or non-standard HTML attributes (dangerouslySetInnerHTML,
 *   title, contentEditable, RDFa, Microdata, etc.). Components that legitimately need
 *   an omitted attribute declare it explicitly.
 */
export interface BaseProps<T extends HTMLElement = HTMLElement>
  extends Omit<
    React.HTMLAttributes<T>,
    | 'children'
    | 'title'
    | 'contentEditable'
    | 'dangerouslySetInnerHTML'
    | 'suppressContentEditableWarning'
    | 'suppressHydrationWarning'
    | 'accessKey'
    | 'autoCapitalize'
    | 'autoFocus'
    | 'contextMenu'
    | 'enterKeyHint'
    | 'lang'
    | 'nonce'
    | 'slot'
    | 'spellCheck'
    | 'translate'
    | 'radioGroup'
    | 'inputMode'
    | 'is'
    | 'about'
    | 'content'
    | 'datatype'
    | 'inlist'
    | 'prefix'
    | 'property'
    | 'rel'
    | 'resource'
    | 'rev'
    | 'typeof'
    | 'vocab'
    | 'autoCorrect'
    | 'autoSave'
    | 'color'
    | 'results'
    | 'security'
    | 'unselectable'
    | 'itemProp'
    | 'itemScope'
    | 'itemType'
    | 'itemID'
    | 'itemRef'
    | 'popover'
    | 'popoverTargetAction'
    | 'popoverTarget'
    | 'exportparts'
    | 'defaultChecked'
    | 'defaultValue'
  > {
  /** React 19 standard element ref prop (replaces legacy forwardRef). */
  ref?: React.Ref<T>;

  /** Typed optical token and inline CSS overrides merged cleanly without clobbering base styles. */
  xstyle?: OpticalStyleTokens;

  /** Allow data-* attributes for telemetry, testing, integration hooks, and state reflection. */
  [key: `data-${string}`]: string | undefined;
}
