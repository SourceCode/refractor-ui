export const docs = {
  name: 'CookieConsentBanner',
  displayName: 'Cookie Consent & Privacy Preferences Banner',
  group: 'Mobile, Touch & System Utilities',
  category: 'mobile-utilities',
  keywords: [
    'cookie',
    'consent',
    'privacy',
    'gdpr',
    'ccpa',
    'banner',
    'preferences',
    'compliance',
    'tracking',
    'opt-in',
  ],
  usage: {
    description:
      'Non-blocking optical-glass cookie consent banner supporting floating bottom bar, corner card, and embedded inline modes with sanitized privacy policy links, equal-prominence Accept All / Reject Non-Essential actions, and an expandable preference matrix with locked Essential cookies and toggleable Analytics, Preferences, and Marketing switches.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Provide equally clear Accept All and Reject Non-Essential actions alongside Customize so consent choices remain transparent and GDPR/CCPA compliant.',
      },
      {
        guidance: true,
        description:
          'Link your privacy or cookie policy through policyHref so CookieConsentBanner validates the URL with sanitizeUrl and enforces rel="noopener noreferrer".',
      },
      {
        guidance: false,
        description:
          'Enable optional tracking categories before explicit user consent or pass unsanitized javascript: URIs into policyHref.',
      },
    ],
    accessibility: [
      {
        name: 'Non-Blocking Named Region Landmark',
        criterion: '1.3.1 Info and Relationships & 4.1.2 Name, Role, Value',
        requirement: 'role="region" with aria-label linked to title and aria-expanded/aria-controls on Customize',
        description:
          'Allows keyboard and screen-reader users to inspect or adjust cookie consent without trapping focus behind a blocking modal overlay.',
      },
      {
        name: 'Switch Semantics & Locked Essential Control',
        criterion: '2.1.1 Keyboard & 4.1.2 Name, Role, Value',
        requirement: 'Native <button role="switch" aria-checked> controls with disabled Essential switch and prism-focus-ring',
        description:
          'Communicates active state clearly for every cookie category, locks Essential Cookies as disabled with an emerald Always Active badge, and collapses the customization panel cleanly on non-composing Escape.',
      },
    ],
  },
  props: [
    {
      name: 'open',
      type: 'boolean',
      defaultValue: 'undefined',
      description: 'Controlled visibility state; returns null when false.',
    },
    {
      name: 'defaultOpen',
      type: 'boolean',
      defaultValue: 'true',
      description: 'Initial visibility state when operating in uncontrolled mode.',
    },
    {
      name: 'onOpenChange',
      type: '(open: boolean) => void',
      defaultValue: 'undefined',
      description: 'Callback invoked when the banner closes after accepting, rejecting, or saving preferences.',
    },
    {
      name: 'mode',
      type: "'bar' | 'card' | 'inline'",
      defaultValue: "'inline'",
      description: 'Controls layout placement as a floating bottom bar, corner card, or embedded inline slab.',
    },
    {
      name: 'title',
      type: 'string',
      defaultValue: "'Privacy & Cookie Preferences'",
      description: 'Heading text displayed in the banner and exposed as the region aria-label.',
    },
    {
      name: 'description',
      type: 'string',
      defaultValue: "'We use strictly necessary cookies...'",
      description: 'Explanatory summary distinguishing strictly necessary cookies from optional categories.',
    },
    {
      name: 'policyHref',
      type: 'string',
      defaultValue: 'undefined',
      description: 'Optional privacy policy URL validated via sanitizeUrl; unsafe schemes are stripped and omitted.',
    },
    {
      name: 'policyLabel',
      type: 'string',
      defaultValue: "'Privacy Policy'",
      description: 'Visible anchor label rendered when policyHref resolves to a safe URL.',
    },
    {
      name: 'defaultPreferences',
      type: "Partial<Omit<CookieConsentPreferences, 'essential'>>",
      defaultValue: 'undefined',
      description: 'Initial opt-in values for analytics, preferences, and marketing switches.',
    },
    {
      name: 'onSavePreferences',
      type: '(prefs: CookieConsentPreferences) => void',
      defaultValue: 'undefined',
      description: 'Callback fired with committed preferences on Accept All, Reject Non-Essential, or Save Preferences.',
    },
    {
      name: 'onAcceptAll',
      type: '(prefs: CookieConsentPreferences) => void',
      defaultValue: 'undefined',
      description: 'Callback fired with all categories enabled when Accept All is pressed.',
    },
    {
      name: 'onRejectNonEssential',
      type: '(prefs: CookieConsentPreferences) => void',
      defaultValue: 'undefined',
      description: 'Callback fired with optional categories disabled when Reject Non-Essential is pressed.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed CSS custom properties and style overrides.',
    },
  ],
  examples: [
    `<CookieConsentBanner\n  mode="bar"\n  policyHref="https://example.com/privacy"\n  defaultPreferences={{ preferences: true }}\n  onSavePreferences={(prefs) => console.warn(prefs)}\n/>`,
  ],
};
