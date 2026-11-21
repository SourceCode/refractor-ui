import { createRef } from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import {
  PasswordStrengthMeter,
  type PasswordRuleResult,
  type PasswordStrengthLevel,
} from './index';

describe('PasswordStrengthMeter', () => {
  it('renders empty state with 0/4 progressbar, 5 unmet rules, ref forwarding, and theme overrides', () => {
    const ref = createRef<HTMLDivElement>();

    render(
      <PrismThemeProvider
        theme={{
          components: {
            PasswordStrengthMeter: {
              className: 'theme-strength-meter',
              style: { maxWidth: '480px' },
            },
          },
        }}
      >
        <PasswordStrengthMeter
          ref={ref}
          password=""
          className="local-meter"
          xstyle={{ '--prism-blur-px': '20px' }}
          style={{ marginBottom: '12px' }}
          data-testid="meter-root"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('meter-root');
    expect(ref.current).toBe(root);
    expect(root).toHaveClass(
      'refractor-password-strength-meter',
      'prism-slab',
      'theme-strength-meter',
      'local-meter'
    );
    expect(root).toHaveStyle({ maxWidth: '480px', marginBottom: '12px' });
    expect(root).toHaveAttribute('data-level', 'empty');
    expect(root).toHaveAttribute('data-score', '0');
    expect(root).toHaveAttribute('data-checklist', 'true');
    expect(PasswordStrengthMeter.displayName).toBe('PasswordStrengthMeter');

    const progressbar = screen.getByRole('progressbar', { name: 'Password strength' });
    expect(progressbar).toHaveAttribute('aria-valuemin', '0');
    expect(progressbar).toHaveAttribute('aria-valuemax', '4');
    expect(progressbar).toHaveAttribute('aria-valuenow', '0');
    expect(progressbar).toHaveAttribute('aria-valuetext', 'Not entered');

    const badge = screen.getByTestId('password-strength-badge');
    expect(badge).toHaveAttribute('aria-live', 'polite');
    expect(badge).toHaveAttribute('data-strength-level', 'empty');
    expect(badge).toHaveTextContent('Not entered');

    for (let i = 1; i <= 4; i += 1) {
      const seg = screen.getByTestId(`strength-segment-${i}`);
      expect(seg).toHaveAttribute('data-filled', 'false');
      expect(seg).toHaveClass('prism-well');
    }

    const checklist = screen.getByTestId('password-strength-checklist');
    const items = within(checklist).getAllByRole('listitem');
    expect(items).toHaveLength(5);
    items.forEach((item) => {
      expect(item).toHaveAttribute('data-passed', 'false');
    });
    expect(within(checklist).getByText('At least 12 characters')).toBeInTheDocument();
  });

  it('transitions accurately across weak, fair, strong, and excellent levels with semantic tokens', () => {
    const cases: ReadonlyArray<{
      password: string;
      expectedLevel: PasswordStrengthLevel;
      expectedScore: number;
      expectedBadge: string;
      expectedColorToken: string;
    }> = [
      {
        password: 'abc',
        expectedLevel: 'weak',
        expectedScore: 1,
        expectedBadge: 'Weak',
        expectedColorToken: 'var(--prism-error-main)',
      },
      {
        password: '   ',
        expectedLevel: 'weak',
        expectedScore: 1,
        expectedBadge: 'Weak',
        expectedColorToken: 'var(--prism-error-main)',
      },
      {
        password: 'Abc123',
        expectedLevel: 'fair',
        expectedScore: 2,
        expectedBadge: 'Fair',
        expectedColorToken: 'var(--prism-warning-main)',
      },
      {
        password: 'Abcdefgh1234',
        expectedLevel: 'strong',
        expectedScore: 3,
        expectedBadge: 'Strong',
        expectedColorToken: 'var(--prism-secondary-main)',
      },
      {
        password: 'PrismGlass2026!',
        expectedLevel: 'excellent',
        expectedScore: 4,
        expectedBadge: 'Excellent',
        expectedColorToken: 'var(--prism-success-main)',
      },
    ];

    const { rerender } = render(<PasswordStrengthMeter password="" data-testid="meter-levels" />);

    for (const testCase of cases) {
      rerender(<PasswordStrengthMeter password={testCase.password} data-testid="meter-levels" />);

      const root = screen.getByTestId('meter-levels');
      expect(root).toHaveAttribute('data-level', testCase.expectedLevel);
      expect(root).toHaveAttribute('data-score', String(testCase.expectedScore));

      const progressbar = screen.getByRole('progressbar', { name: 'Password strength' });
      expect(progressbar).toHaveAttribute('aria-valuenow', String(testCase.expectedScore));
      expect(progressbar).toHaveAttribute('aria-valuetext', testCase.expectedBadge);

      const badge = screen.getByTestId('password-strength-badge');
      expect(badge).toHaveTextContent(testCase.expectedBadge);
      expect(badge).toHaveAttribute('data-strength-level', testCase.expectedLevel);

      if (testCase.expectedLevel === 'excellent') {
        expect(badge).toHaveClass('prism-emerald');
      } else {
        expect(badge).toHaveClass('prism-crystal');
      }

      for (let segIdx = 1; segIdx <= 4; segIdx += 1) {
        const segment = screen.getByTestId(`strength-segment-${segIdx}`);
        const shouldFill = segIdx <= testCase.expectedScore;
        expect(segment).toHaveAttribute('data-filled', shouldFill ? 'true' : 'false');
        if (shouldFill) {
          expect(segment.style.backgroundColor).toBe(testCase.expectedColorToken);
        } else {
          expect(segment).toHaveClass('prism-well');
        }
      }
    }

    // Verify all 5 checklist items passed on final excellent case
    const expectedIds: ReadonlyArray<PasswordRuleResult['id']> = [
      'length',
      'uppercase',
      'lowercase',
      'digit',
      'symbol',
    ];
    const items = within(screen.getByTestId('password-strength-checklist')).getAllByRole('listitem');
    expect(items.map((el) => el.getAttribute('data-rule-id'))).toEqual(expectedIds);
    items.forEach((item) => {
      expect(item).toHaveAttribute('data-passed', 'true');
    });
  });

  it('clamps minLength to [6, 64] with fallback 12 and hides checklist when showChecklist is false', () => {
    const { rerender } = render(
      <PasswordStrengthMeter password="Ab1!cd" minLength={2} label="PIN strength" />
    );

    expect(screen.getByText('At least 6 characters')).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'PIN strength' })).toHaveAttribute(
      'aria-valuenow',
      '4'
    );

    rerender(<PasswordStrengthMeter password="Ab1!cd" minLength={120} />);
    expect(screen.getByText('At least 64 characters')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '3');

    rerender(<PasswordStrengthMeter password="Ab1!cd" minLength={Number.NaN} />);
    expect(screen.getByText('At least 12 characters')).toBeInTheDocument();

    rerender(
      <PasswordStrengthMeter
        password="PrismGlass2026!"
        showChecklist={false}
        data-testid="no-checklist"
      />
    );
    expect(screen.queryByTestId('password-strength-checklist')).not.toBeInTheDocument();
    expect(screen.getByTestId('no-checklist')).not.toHaveAttribute('data-checklist');
  });

  it('evaluates very long adversarial strings linearly without backtracking and escapes XSS labels cleanly', () => {
    const xssPayload = '<script>window.__pwXss=1</script><img src=x onerror=alert(1)>';
    const longWeakPassword = 'a'.repeat(50_000);

    const start = performance.now();
    const { rerender } = render(
      <PasswordStrengthMeter password={longWeakPassword} label={xssPayload} />
    );
    const elapsedMs = performance.now() - start;

    expect(elapsedMs).toBeLessThan(1000);
    expect(document.querySelector('script')).toBeNull();
    expect(document.querySelector('img')).toBeNull();
    expect(screen.getByText(xssPayload)).toBeInTheDocument();
    // Long lowercase string satisfies length + lowercase (2 checks -> weak / score 1)
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '1');

    // Adding upper + digit + symbol at the tail triggers excellent in linear time
    rerender(<PasswordStrengthMeter password={`${longWeakPassword}Z9!`} label={xssPayload} />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '4');
  });
});
