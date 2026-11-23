'use client';

import {
  memo,
  useCallback,
  useId,
  useMemo,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import {
  Check,
  ChevronDown,
  ChevronUp,
  Cookie,
  ExternalLink,
  Lock,
  ShieldCheck,
  SlidersHorizontal,
} from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { useControllableState } from '../hooks/useControllableState';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { composeEventHandlers } from '../utils/composeEventHandlers';
import { mergeProps } from '../utils/mergeProps';
import { sanitizeUrl } from '../utils/sanitize';
import { STYLE_BORDER_DIVIDER, STYLE_INFO_MAIN, STYLE_PRIMARY_MAIN, STYLE_TEXT_PRIMARY, STYLE_TEXT_SECONDARY } from '../utils/styles';
import { themeProps } from '../utils/themeProps';

export interface CookieConsentPreferences {
  /** Strictly necessary cookies required for core security and session stability; always active. */
  essential: true;
  /** Optional usage analytics and performance diagnostics cookies. */
  analytics: boolean;
  /** Optional preference cookies remembering display theme, locale, and layout choices. */
  preferences: boolean;
  /** Optional campaign attribution and marketing communication cookies. */
  marketing: boolean;
}

export type CookieConsentMode = 'bar' | 'card' | 'inline';

export interface CookieConsentBannerProps extends BaseProps<HTMLDivElement> {
  /** Controlled visibility state of the consent banner. */
  open?: boolean;
  /** Initial visibility state for uncontrolled mode (defaults to true). */
  defaultOpen?: boolean;
  /** Callback invoked when the banner visibility changes. */
  onOpenChange?: (open: boolean) => void;
  /** Layout placement: bottom viewport 'bar', bottom-right 'card', or embedded 'inline' slab (defaults to 'inline'). */
  mode?: CookieConsentMode;
  /** Heading rendered at the top of the consent banner (defaults to 'Privacy & Cookie Preferences'). */
  title?: string;
  /** Concise copy explaining strictly necessary versus optional cookies. */
  description?: string;
  /** Optional privacy or cookie policy URL strictly sanitized via sanitizeUrl. */
  policyHref?: string;
  /** Link label shown when policyHref resolves to a safe URL (defaults to 'Privacy Policy'). */
  policyLabel?: string;
  /** Initial opt-in defaults for optional cookie categories (essential is always active). */
  defaultPreferences?: Partial<Omit<CookieConsentPreferences, 'essential'>>;
  /** Callback fired with the committed preferences on Accept All, Reject Non-Essential, or Save Preferences. */
  onSavePreferences?: (prefs: CookieConsentPreferences) => void;
  /** Callback fired with all categories enabled when Accept All is clicked. */
  onAcceptAll?: (prefs: CookieConsentPreferences) => void;
  /** Callback fired with optional categories disabled when Reject Non-Essential is clicked. */
  onRejectNonEssential?: (prefs: CookieConsentPreferences) => void;
}

type OptionalCookieCategory = keyof Omit<CookieConsentPreferences, 'essential'>;

interface OptionalCategoryMeta {
  key: OptionalCookieCategory;
  label: string;
  description: string;
}

const DEFAULT_TITLE = 'Privacy & Cookie Preferences';
const DEFAULT_DESCRIPTION =
  'We use strictly necessary cookies to keep core features secure and reliable. Optional analytics, preferences, and marketing cookies are only enabled with your consent.';
const DEFAULT_POLICY_LABEL = 'Privacy Policy';

const OPTIONAL_CATEGORIES: ReadonlyArray<OptionalCategoryMeta> = [
  {
    key: 'analytics',
    label: 'Analytics',
    description: 'Helps us measure performance and understand how features are used.',
  },
  {
    key: 'preferences',
    label: 'Preferences',
    description: 'Remembers your optical theme, locale, and workspace layout settings.',
  },
  {
    key: 'marketing',
    label: 'Marketing',
    description: 'Measures campaign effectiveness and delivers relevant product updates.',
  },
];

function getModeClass(mode: CookieConsentMode): string {
  if (mode === 'bar') {
    return 'fixed bottom-4 inset-x-4 z-50 max-w-5xl mx-auto';
  }
  if (mode === 'card') {
    return 'fixed bottom-4 right-4 z-50 max-w-md';
  }
  return 'w-full';
}

function getCategoryValue(
  prefs: CookieConsentPreferences,
  key: OptionalCookieCategory
): boolean {
  switch (key) {
    case 'analytics':
      return prefs.analytics;
    case 'preferences':
      return prefs.preferences;
    case 'marketing':
      return prefs.marketing;
  }
}

function CookieConsentBannerInner({
  open,
  defaultOpen = true,
  onOpenChange,
  mode = 'inline',
  title = DEFAULT_TITLE,
  description = DEFAULT_DESCRIPTION,
  policyHref,
  policyLabel = DEFAULT_POLICY_LABEL,
  defaultPreferences,
  onSavePreferences,
  onAcceptAll,
  onRejectNonEssential,
  onKeyDown,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: CookieConsentBannerProps) {
  const titleId = useId();
  const matrixId = useId();
  const override = useComponentOverride('CookieConsentBanner');

  const [isOpen, setIsOpen] = useControllableState<boolean>({
    value: open,
    defaultValue: defaultOpen,
    onChange: onOpenChange,
  });

  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  const [prefs, setPrefs] = useState<CookieConsentPreferences>(() => ({
    essential: true,
    analytics: Boolean(defaultPreferences?.analytics),
    preferences: Boolean(defaultPreferences?.preferences),
    marketing: Boolean(defaultPreferences?.marketing),
  }));

  const safePolicyHref = useMemo(
    () => (policyHref ? sanitizeUrl(policyHref, false) : ''),
    [policyHref]
  );

  const toggleCategory = useCallback((key: OptionalCookieCategory) => {
    setPrefs((prev) => {
      switch (key) {
        case 'analytics':
          return { ...prev, essential: true, analytics: !prev.analytics };
        case 'preferences':
          return { ...prev, essential: true, preferences: !prev.preferences };
        case 'marketing':
          return { ...prev, essential: true, marketing: !prev.marketing };
      }
    });
  }, []);

  const handleAcceptAll = useCallback(() => {
    const next: CookieConsentPreferences = {
      essential: true,
      analytics: true,
      preferences: true,
      marketing: true,
    };
    setPrefs(next);
    onAcceptAll?.({ ...next });
    onSavePreferences?.({ ...next });
    setIsOpen(false);
  }, [onAcceptAll, onSavePreferences, setIsOpen]);

  const handleRejectNonEssential = useCallback(() => {
    const next: CookieConsentPreferences = {
      essential: true,
      analytics: false,
      preferences: false,
      marketing: false,
    };
    setPrefs(next);
    onRejectNonEssential?.({ ...next });
    onSavePreferences?.({ ...next });
    setIsOpen(false);
  }, [onRejectNonEssential, onSavePreferences, setIsOpen]);

  const handleSavePreferences = useCallback(() => {
    const snapshot: CookieConsentPreferences = {
      essential: true,
      analytics: prefs.analytics,
      preferences: prefs.preferences,
      marketing: prefs.marketing,
    };
    onSavePreferences?.(snapshot);
    setIsOpen(false);
  }, [prefs, onSavePreferences, setIsOpen]);

  const handleKeyDown = composeEventHandlers<ReactKeyboardEvent<HTMLDivElement>>(
    onKeyDown,
    (event) => {
      if (event.nativeEvent.isComposing) return;
      if (event.key === 'Escape' && isExpanded) {
        setIsExpanded(false);
      }
    }
  );

  if (!isOpen) {
    return null;
  }

  const headerLayoutClass =
    mode === 'bar'
      ? 'flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4'
      : 'flex flex-col gap-4';

  const merged = mergeProps({
    themeTarget: themeProps('cookie-consent-banner', {
      open: isOpen,
      mode,
      expanded: isExpanded,
    }),
    baseClassName: `prism-slab ${getModeClass(mode)} p-5 sm:p-6 flex flex-col gap-4`,
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  return (
    <div
      ref={ref}
      role="region"
      aria-label={title}
      onKeyDown={handleKeyDown}
      {...rest}
      {...merged}
    >
      <div className={headerLayoutClass}>
        <div className="flex items-start gap-3.5 min-w-0">
          <span
            aria-hidden="true"
            className="prism-well w-10 h-10 rounded-2xl inline-flex items-center justify-center shrink-0"
            style={STYLE_PRIMARY_MAIN}
          >
            <ShieldCheck className="w-5 h-5 shrink-0" aria-hidden="true" />
          </span>

          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2
                id={titleId}
                className="text-base font-semibold leading-snug break-words"
                style={STYLE_TEXT_PRIMARY}
              >
                {title}
              </h2>
              <span
                aria-hidden="true"
                className="prism-well w-6 h-6 rounded-full inline-flex items-center justify-center shrink-0"
                style={STYLE_TEXT_SECONDARY}
              >
                <Cookie className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              </span>
            </div>

            <p
              className="text-xs sm:text-sm leading-relaxed break-words"
              style={STYLE_TEXT_SECONDARY}
            >
              {description}
            </p>

            {safePolicyHref ? (
              <div className="pt-0.5">
                <a
                  href={safePolicyHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="prism-focus-ring inline-flex items-center gap-1 text-xs font-semibold underline underline-offset-2 rounded-sm hover:opacity-80 transition-opacity"
                  style={STYLE_INFO_MAIN}
                >
                  <span>{policyLabel}</span>
                  <ExternalLink className="w-3 h-3 shrink-0" aria-hidden="true" />
                </a>
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handleAcceptAll}
            className="prism-btn-primary prism-focus-ring h-9 px-4 inline-flex items-center justify-center gap-1.5 text-xs font-semibold tracking-[-0.01em] whitespace-nowrap cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="relative z-10 inline-flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>Accept All</span>
            </span>
          </button>

          <button
            type="button"
            onClick={handleRejectNonEssential}
            className="prism-btn-secondary prism-focus-ring h-9 px-4 inline-flex items-center justify-center gap-1.5 text-xs font-semibold tracking-[-0.01em] whitespace-nowrap cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="relative z-10">Reject Non-Essential</span>
          </button>

          <button
            type="button"
            aria-expanded={isExpanded}
            aria-controls={matrixId}
            onClick={() => setIsExpanded((prev) => !prev)}
            className="prism-crystal prism-focus-ring h-9 px-3.5 rounded-full inline-flex items-center justify-center gap-1.5 text-xs font-semibold whitespace-nowrap cursor-pointer enabled:hover:brightness-105 disabled:opacity-50 disabled:cursor-not-allowed transition-[color,background-color,border-color,opacity,transform]"
            style={STYLE_TEXT_PRIMARY}
          >
            <SlidersHorizontal className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>Customize</span>
            {isExpanded ? (
              <ChevronUp className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {isExpanded ? (
        <div
          id={matrixId}
          data-testid="cookie-preference-matrix"
          className="prism-well rounded-2xl p-4 space-y-3 border"
          style={STYLE_BORDER_DIVIDER}
        >
          <div className="space-y-2.5">
            <div className="prism-crystal rounded-2xl p-3.5 flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1 space-y-0.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className="text-sm font-semibold"
                    style={STYLE_TEXT_PRIMARY}
                  >
                    Essential Cookies
                  </span>
                  <span
                    data-testid="essential-always-active-badge"
                    className="prism-emerald inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap"
                  >
                    <Lock className="w-3 h-3 shrink-0" aria-hidden="true" />
                    <span>Always Active</span>
                  </span>
                </div>
                <p
                  className="text-xs leading-relaxed"
                  style={STYLE_TEXT_SECONDARY}
                >
                  Strictly necessary for authentication, security protections, and core site
                  reliability.
                </p>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={true}
                aria-label="Essential Cookies"
                disabled
                className="prism-emerald prism-focus-ring relative w-12 h-7 rounded-full p-1 inline-flex items-center shrink-0 opacity-85 cursor-pointer disabled:cursor-not-allowed"
              >
                <span
                  aria-hidden="true"
                  className="prism-thumb block w-5 h-5 rounded-full translate-x-5"
                />
              </button>
            </div>

            {OPTIONAL_CATEGORIES.map((category) => {
              const checked = getCategoryValue(prefs, category.key);
              return (
                <div
                  key={category.key}
                  className="prism-crystal rounded-2xl p-3.5 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div
                      className="text-sm font-semibold"
                      style={STYLE_TEXT_PRIMARY}
                    >
                      {category.label}
                    </div>
                    <p
                      className="text-xs leading-relaxed"
                      style={STYLE_TEXT_SECONDARY}
                    >
                      {category.description}
                    </p>
                  </div>

                  <button
                    type="button"
                    role="switch"
                    aria-checked={checked}
                    aria-label={category.label}
                    onClick={() => toggleCategory(category.key)}
                    className={`prism-focus-ring relative w-12 h-7 rounded-full p-1 inline-flex items-center transition-[color,background-color,border-color,opacity,transform] duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed enabled:hover:brightness-105 shrink-0 ${
                      checked ? 'prism-emerald' : 'prism-crystal'
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`prism-thumb block w-5 h-5 rounded-full transition-transform duration-200 ${
                        checked ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              );
            })}
          </div>

          <div
            className="pt-3 border-t flex flex-wrap items-center justify-between gap-3"
            style={STYLE_BORDER_DIVIDER}
          >
            <p className="text-xs" style={STYLE_TEXT_SECONDARY}>
              Essential cookies stay active; optional categories follow your selections above.
            </p>

            <button
              type="button"
              onClick={handleSavePreferences}
              className="prism-btn-primary prism-focus-ring h-9 px-4 inline-flex items-center justify-center gap-1.5 text-xs font-semibold tracking-[-0.01em] whitespace-nowrap cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="relative z-10 inline-flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span>Save Preferences</span>
              </span>
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export const CookieConsentBanner = memo(CookieConsentBannerInner);
CookieConsentBanner.displayName = 'CookieConsentBanner';
