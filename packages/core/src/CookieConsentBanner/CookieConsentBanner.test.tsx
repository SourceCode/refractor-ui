import { createRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import {
  CookieConsentBanner,
  type CookieConsentMode,
  type CookieConsentPreferences,
} from './index';

describe('CookieConsentBanner', () => {
  it('renders open inline region by default with ref, displayName, theme overrides, and safe policy link', () => {
    const ref = createRef<HTMLDivElement>();

    render(
      <PrismThemeProvider
        theme={{
          components: {
            CookieConsentBanner: { className: 'theme-consent', style: { letterSpacing: '0.2px' } },
          },
        }}
      >
        <CookieConsentBanner
          ref={ref}
          title="Your Privacy Choices"
          description="Control how essential and optional cookies operate on this site."
          policyHref="https://example.com/privacy"
          policyLabel="Read Privacy Policy"
          className="local-consent"
          style={{ maxWidth: '720px' }}
          xstyle={{ '--prism-blur-px': '20px' }}
          data-testid="cookie-banner"
        />
      </PrismThemeProvider>
    );

    const banner = screen.getByTestId('cookie-banner');
    expect(CookieConsentBanner.displayName).toBe('CookieConsentBanner');
    expect(ref.current).toBe(banner);
    expect(banner).toHaveClass(
      'refractor-cookie-consent-banner',
      'prism-slab',
      'w-full',
      'theme-consent',
      'local-consent'
    );
    expect(banner).not.toHaveClass('fixed');
    expect(banner).toHaveAttribute('data-open', 'true');
    expect(banner).toHaveAttribute('data-mode', 'inline');
    expect(banner).not.toHaveAttribute('data-expanded');
    expect(banner).toHaveStyle({ letterSpacing: '0.2px', maxWidth: '720px' });
    expect(banner.style.getPropertyValue('--prism-blur-px')).toBe('20px');

    const region = screen.getByRole('region', { name: 'Your Privacy Choices' });
    expect(region).toBe(banner);
    expect(
      screen.getByText('Control how essential and optional cookies operate on this site.')
    ).toBeInTheDocument();

    const policyLink = screen.getByRole('link', { name: 'Read Privacy Policy' });
    expect(policyLink).toHaveAttribute('href', 'https://example.com/privacy');
    expect(policyLink).toHaveAttribute('rel', 'noopener noreferrer');
    expect(policyLink).toHaveAttribute('target', '_blank');

    expect(screen.getByRole('button', { name: 'Accept All' })).toHaveClass('prism-btn-primary');
    expect(screen.getByRole('button', { name: 'Reject Non-Essential' })).toHaveClass(
      'prism-btn-secondary'
    );
    const customizeButton = screen.getByRole('button', { name: 'Customize' });
    expect(customizeButton).toHaveClass('prism-crystal');
    expect(customizeButton).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByTestId('cookie-preference-matrix')).not.toBeInTheDocument();
  });

  it('applies exact positioning classes across bar, card, and inline modes', () => {
    const modeExpectations: ReadonlyArray<{
      mode: CookieConsentMode;
      expectedClasses: ReadonlyArray<string>;
    }> = [
      {
        mode: 'bar',
        expectedClasses: ['fixed', 'bottom-4', 'inset-x-4', 'z-50', 'max-w-5xl', 'mx-auto'],
      },
      {
        mode: 'card',
        expectedClasses: ['fixed', 'bottom-4', 'right-4', 'z-50', 'max-w-md'],
      },
      {
        mode: 'inline',
        expectedClasses: ['w-full'],
      },
    ];

    for (const { mode, expectedClasses } of modeExpectations) {
      const { unmount } = render(
        <CookieConsentBanner mode={mode} data-testid={`banner-${mode}`} />
      );
      const banner = screen.getByTestId(`banner-${mode}`);
      expect(banner).toHaveAttribute('data-mode', mode);
      expect(banner).toHaveClass('prism-slab', ...expectedClasses);
      unmount();
    }
  });

  it('supports uncontrolled defaultOpen={false} and controlled open state transitions', () => {
    const { container: closedContainer } = render(<CookieConsentBanner defaultOpen={false} />);
    expect(closedContainer.firstChild).toBeNull();

    function ControlledBannerHarness() {
      const [open, setOpen] = useState<boolean>(false);
      return (
        <div>
          <button type="button" onClick={() => setOpen(true)}>
            Open Privacy Banner
          </button>
          <CookieConsentBanner open={open} onOpenChange={setOpen} data-testid="controlled-banner" />
        </div>
      );
    }

    render(<ControlledBannerHarness />);
    expect(screen.queryByTestId('controlled-banner')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Open Privacy Banner' }));
    expect(screen.getByTestId('controlled-banner')).toBeInTheDocument();
    expect(
      screen.getByRole('region', { name: 'Privacy & Cookie Preferences' })
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Accept All' }));
    expect(screen.queryByTestId('controlled-banner')).not.toBeInTheDocument();
  });

  it('handles Accept All by enabling every category, firing callbacks, and closing', () => {
    const onAcceptAll = vi.fn<(prefs: CookieConsentPreferences) => void>();
    const onSavePreferences = vi.fn<(prefs: CookieConsentPreferences) => void>();
    const onOpenChange = vi.fn<(open: boolean) => void>();

    render(
      <CookieConsentBanner
        onAcceptAll={onAcceptAll}
        onSavePreferences={onSavePreferences}
        onOpenChange={onOpenChange}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Accept All' }));

    const expected: CookieConsentPreferences = {
      essential: true,
      analytics: true,
      preferences: true,
      marketing: true,
    };
    expect(onAcceptAll).toHaveBeenCalledTimes(1);
    expect(onAcceptAll).toHaveBeenCalledWith(expected);
    expect(onSavePreferences).toHaveBeenCalledTimes(1);
    expect(onSavePreferences).toHaveBeenCalledWith(expected);
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(screen.queryByRole('region')).not.toBeInTheDocument();
  });

  it('handles Reject Non-Essential by disabling optional categories while keeping essential true', () => {
    const onRejectNonEssential = vi.fn<(prefs: CookieConsentPreferences) => void>();
    const onSavePreferences = vi.fn<(prefs: CookieConsentPreferences) => void>();
    const onOpenChange = vi.fn<(open: boolean) => void>();

    render(
      <CookieConsentBanner
        defaultPreferences={{ analytics: true, preferences: true, marketing: true }}
        onRejectNonEssential={onRejectNonEssential}
        onSavePreferences={onSavePreferences}
        onOpenChange={onOpenChange}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Reject Non-Essential' }));

    const expected: CookieConsentPreferences = {
      essential: true,
      analytics: false,
      preferences: false,
      marketing: false,
    };
    expect(onRejectNonEssential).toHaveBeenCalledTimes(1);
    expect(onRejectNonEssential).toHaveBeenCalledWith(expected);
    expect(onSavePreferences).toHaveBeenCalledTimes(1);
    expect(onSavePreferences).toHaveBeenCalledWith(expected);
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(screen.queryByRole('region')).not.toBeInTheDocument();
  });

  it('expands Customize preference matrix, locks Essential Cookies, toggles optional switches, and saves preferences', () => {
    const onSavePreferences = vi.fn<(prefs: CookieConsentPreferences) => void>();
    const onOpenChange = vi.fn<(open: boolean) => void>();

    render(
      <CookieConsentBanner
        defaultPreferences={{ preferences: true }}
        onSavePreferences={onSavePreferences}
        onOpenChange={onOpenChange}
        data-testid="custom-banner"
      />
    );

    const customizeBtn = screen.getByRole('button', { name: 'Customize' });
    fireEvent.click(customizeBtn);

    expect(customizeBtn).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByTestId('custom-banner')).toHaveAttribute('data-expanded', 'true');
    expect(screen.getByTestId('cookie-preference-matrix')).toBeInTheDocument();

    // Essential Cookies is locked active with emerald badge and disabled switch
    const alwaysActiveBadge = screen.getByTestId('essential-always-active-badge');
    expect(alwaysActiveBadge).toHaveTextContent('Always Active');
    expect(alwaysActiveBadge).toHaveClass('prism-emerald');

    const essentialSwitch = screen.getByRole('switch', { name: 'Essential Cookies' });
    expect(essentialSwitch).toBeDisabled();
    expect(essentialSwitch).toHaveAttribute('aria-checked', 'true');
    fireEvent.click(essentialSwitch);
    expect(essentialSwitch).toHaveAttribute('aria-checked', 'true');

    // Optional categories reflect defaultPreferences and toggle cleanly
    const analyticsSwitch = screen.getByRole('switch', { name: 'Analytics' });
    const preferencesSwitch = screen.getByRole('switch', { name: 'Preferences' });
    const marketingSwitch = screen.getByRole('switch', { name: 'Marketing' });

    expect(analyticsSwitch).toHaveAttribute('aria-checked', 'false');
    expect(analyticsSwitch).toHaveClass('prism-crystal');
    expect(preferencesSwitch).toHaveAttribute('aria-checked', 'true');
    expect(preferencesSwitch).toHaveClass('prism-emerald');
    expect(marketingSwitch).toHaveAttribute('aria-checked', 'false');

    // Toggle all three optional switches
    fireEvent.click(analyticsSwitch);
    expect(analyticsSwitch).toHaveAttribute('aria-checked', 'true');
    expect(analyticsSwitch).toHaveClass('prism-emerald');

    fireEvent.click(preferencesSwitch);
    expect(preferencesSwitch).toHaveAttribute('aria-checked', 'false');
    expect(preferencesSwitch).toHaveClass('prism-crystal');

    fireEvent.click(marketingSwitch);
    expect(marketingSwitch).toHaveAttribute('aria-checked', 'true');

    // Collapse and re-expand via Customize toggle preserves selections
    fireEvent.click(customizeBtn);
    expect(customizeBtn).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByTestId('cookie-preference-matrix')).not.toBeInTheDocument();

    fireEvent.click(customizeBtn);
    expect(screen.getByRole('switch', { name: 'Analytics' })).toHaveAttribute(
      'aria-checked',
      'true'
    );

    const saveBtn = screen.getByRole('button', { name: 'Save Preferences' });
    expect(saveBtn).toHaveClass('prism-btn-primary');
    fireEvent.click(saveBtn);

    expect(onSavePreferences).toHaveBeenCalledTimes(1);
    expect(onSavePreferences).toHaveBeenCalledWith({
      essential: true,
      analytics: true,
      preferences: false,
      marketing: true,
    });
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(screen.queryByTestId('custom-banner')).not.toBeInTheDocument();
  });

  it('handles Escape key safely with IME composition guard and caller onKeyDown composition', () => {
    const onKeyDown = vi.fn<(event: ReactKeyboardEvent<HTMLDivElement>) => void>();

    render(
      <CookieConsentBanner onKeyDown={onKeyDown} data-testid="ime-banner" />
    );

    const banner = screen.getByTestId('ime-banner');
    const customizeBtn = screen.getByRole('button', { name: 'Customize' });

    // Escape while collapsed does nothing
    fireEvent.keyDown(banner, { key: 'Escape' });
    expect(customizeBtn).toHaveAttribute('aria-expanded', 'false');

    // Expand preference matrix
    fireEvent.click(customizeBtn);
    expect(customizeBtn).toHaveAttribute('aria-expanded', 'true');

    // Non-Escape key does not collapse
    fireEvent.keyDown(banner, { key: 'Enter' });
    expect(customizeBtn).toHaveAttribute('aria-expanded', 'true');

    // Composing Escape is ignored (IME safety)
    fireEvent.keyDown(banner, { key: 'Escape', isComposing: true });
    expect(customizeBtn).toHaveAttribute('aria-expanded', 'true');

    // Non-composing Escape collapses matrix without closing banner
    fireEvent.keyDown(banner, { key: 'Escape' });
    expect(customizeBtn).toHaveAttribute('aria-expanded', 'false');
    expect(banner).toBeInTheDocument();
    expect(onKeyDown).toHaveBeenCalledTimes(4);
  });

  it('strips malicious policyHref schemes while allowing safe relative and https URLs (adversarial test)', () => {
    const dangerousUrls: ReadonlyArray<string> = [
      'javascript:alert(1)',
      '  j\ta\nv\ra\u0000script:alert(1)',
      'vbscript:msgbox(1)',
      'data:text/html,<script>alert(1)</script>',
      '//evil.example/privacy',
    ];

    for (const unsafeUrl of dangerousUrls) {
      const { unmount } = render(<CookieConsentBanner policyHref={unsafeUrl} />);
      expect(screen.queryByRole('link')).not.toBeInTheDocument();
      unmount();
    }

    const { rerender } = render(<CookieConsentBanner policyHref="/legal/cookies" />);
    const relativeLink = screen.getByRole('link', { name: 'Privacy Policy' });
    expect(relativeLink).toHaveAttribute('href', '/legal/cookies');
    expect(relativeLink).toHaveAttribute('rel', 'noopener noreferrer');

    rerender(<CookieConsentBanner policyHref="https://refractor.dev/privacy" />);
    const httpsLink = screen.getByRole('link', { name: 'Privacy Policy' });
    expect(httpsLink).toHaveAttribute('href', 'https://refractor.dev/privacy');
    expect(httpsLink).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('renders XSS payloads in title, description, and policyLabel as escaped literal text (adversarial test)', () => {
    const payload = '<script>window.__cookieXss=1</script><img src=x onerror=alert(1)>';

    render(
      <CookieConsentBanner
        title={payload}
        description={payload}
        policyHref="https://example.com/privacy"
        policyLabel={payload}
      />
    );

    expect(document.querySelector('script')).toBeNull();
    expect(document.querySelector('img')).toBeNull();
    expect(screen.getByRole('region', { name: payload })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: payload })).toHaveTextContent(payload);
    expect(screen.getByRole('link', { name: payload })).toHaveTextContent(payload);
    expect(screen.getAllByText(payload)).toHaveLength(3);
  });
});
