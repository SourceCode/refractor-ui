import { createRef, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import {
  CalloutAdmonition,
  type AdmonitionKind,
  type AdmonitionKindMap,
  type CalloutAdmonitionProps,
} from './index';

interface KindExpectation {
  kind: AdmonitionKind;
  defaultTitle: string;
  badgeLabel: string;
  accentToken: string;
  role: 'note' | 'alert';
  badgeHiddenByDefault: boolean;
}

const KIND_EXPECTATIONS: readonly KindExpectation[] = [
  {
    kind: 'note',
    defaultTitle: 'Note',
    badgeLabel: 'note',
    accentToken: 'var(--prism-info-main)',
    role: 'note',
    badgeHiddenByDefault: true,
  },
  {
    kind: 'tip',
    defaultTitle: 'Tip',
    badgeLabel: 'tip',
    accentToken: 'var(--prism-success-main)',
    role: 'note',
    badgeHiddenByDefault: true,
  },
  {
    kind: 'warning',
    defaultTitle: 'Warning',
    badgeLabel: 'warning',
    accentToken: 'var(--prism-warning-main)',
    role: 'note',
    badgeHiddenByDefault: true,
  },
  {
    kind: 'danger',
    defaultTitle: 'Danger',
    badgeLabel: 'danger',
    accentToken: 'var(--prism-error-main)',
    role: 'alert',
    badgeHiddenByDefault: true,
  },
  {
    kind: 'abstract',
    defaultTitle: 'Summary',
    badgeLabel: 'abstract',
    accentToken: 'var(--prism-secondary-main)',
    role: 'note',
    badgeHiddenByDefault: false,
  },
];

const RAW_COLOR_PATTERN =
  /(?:#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b|\b(?:rgba?|hsla?)\s*\()/;

describe('CalloutAdmonition', () => {
  it('renders semantic <aside role="note"> with default kind, ref forwarding, theme overrides, and BaseProps passthrough', () => {
    const ref = createRef<HTMLElement>();
    const mapCheck: Record<keyof AdmonitionKindMap, true> = {
      note: true,
      tip: true,
      warning: true,
      danger: true,
      abstract: true,
    };
    expect(Object.keys(mapCheck)).toHaveLength(5);
    expect(CalloutAdmonition.displayName).toBe('CalloutAdmonition');

    render(
      <PrismThemeProvider
        theme={{
          components: {
            CalloutAdmonition: {
              className: 'theme-callout',
              style: { maxWidth: '680px' },
            },
          },
        }}
      >
        <CalloutAdmonition
          ref={ref}
          className="consumer-callout"
          xstyle={{ '--prism-blur-px': '20px' }}
          style={{ marginTop: '8px' }}
          data-testid="callout-root"
          data-surface="docs"
        >
          Keep CSS tokens synchronized across themes.
        </CalloutAdmonition>
      </PrismThemeProvider>
    );

    const aside = screen.getByTestId('callout-root');
    expect(ref.current).toBe(aside);
    expect(aside.tagName).toBe('ASIDE');
    expect(aside).toHaveAttribute('role', 'note');
    expect(aside).toHaveAttribute('data-kind', 'note');
    expect(aside).toHaveAttribute('data-open', 'true');
    expect(aside).not.toHaveAttribute('data-collapsible');
    expect(aside).toHaveAttribute('data-surface', 'docs');
    expect(aside).toHaveClass(
      'refractor-callout-admonition',
      'prism-slab',
      'theme-callout',
      'consumer-callout'
    );
    expect(aside).toHaveStyle({ maxWidth: '680px', marginTop: '8px' });

    const heading = screen.getByTestId('callout-admonition-title');
    expect(heading).toHaveTextContent('Note');
    expect(aside).toHaveAttribute('aria-labelledby', heading.id);

    expect(screen.getByTestId('callout-admonition-badge')).toHaveTextContent('note');
    expect(screen.getByTestId('callout-admonition-badge')).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByTestId('callout-admonition-body')).toHaveTextContent(
      'Keep CSS tokens synchronized across themes.'
    );
    expect(screen.queryByTestId('callout-admonition-toggle')).not.toBeInTheDocument();
  });

  it.each(KIND_EXPECTATIONS)(
    'maps kind="$kind" to canonical heading "$defaultTitle", role="$role", and semantic token "$accentToken" without raw colors',
    ({ kind, defaultTitle, badgeLabel, accentToken, role, badgeHiddenByDefault }) => {
      render(
        <CalloutAdmonition kind={kind} data-testid={`callout-${kind}`}>
          Guidance copy for {kind}.
        </CalloutAdmonition>
      );

      const aside = screen.getByTestId(`callout-${kind}`);
      expect(aside).toHaveAttribute('role', role);
      expect(aside).toHaveAttribute('data-kind', kind);

      expect(screen.getByRole(role, { name: defaultTitle })).toBe(aside);
      expect(screen.getByTestId('callout-admonition-title')).toHaveTextContent(defaultTitle);

      const badge = screen.getByTestId('callout-admonition-badge');
      expect(badge).toHaveTextContent(badgeLabel);
      if (badgeHiddenByDefault) {
        expect(badge).toHaveAttribute('aria-hidden', 'true');
      } else {
        expect(badge).not.toHaveAttribute('aria-hidden');
      }

      const stripe = screen.getByTestId('callout-admonition-stripe');
      expect(stripe.style.backgroundColor).toBe(accentToken);

      const iconBox = screen.getByTestId('callout-admonition-icon');
      expect(iconBox.style.color).toBe(accentToken);
      const defaultSvg = iconBox.querySelector('svg');
      expect(defaultSvg).not.toBeNull();
      expect(defaultSvg).toHaveAttribute('aria-hidden', 'true');

      const styledNodes = aside.querySelectorAll('[style]');
      styledNodes.forEach((node) => {
        const inlineStyle = node.getAttribute('style') ?? '';
        expect(inlineStyle).not.toMatch(RAW_COLOR_PATTERN);
      });
    }
  );

  it('supports custom title, custom icon, actionSlot, and custom aria-label override', () => {
    const onAction = vi.fn();

    render(
      <CalloutAdmonition
        kind="warning"
        title="Token Migration Window"
        aria-label="Migration warning notice"
        icon={<span data-testid="custom-admonition-icon">!</span>}
        actionSlot={
          <button type="button" onClick={onAction}>
            View guide
          </button>
        }
        data-testid="custom-callout"
      >
        Legacy shadow aliases expire in v2.0.
      </CalloutAdmonition>
    );

    const aside = screen.getByTestId('custom-callout');
    expect(aside).toHaveAttribute('aria-label', 'Migration warning notice');
    expect(aside).not.toHaveAttribute('aria-labelledby');
    expect(screen.getByTestId('callout-admonition-title')).toHaveTextContent(
      'Token Migration Window'
    );
    expect(screen.getByTestId('callout-admonition-badge')).not.toHaveAttribute('aria-hidden');
    expect(screen.getByTestId('custom-admonition-icon')).toHaveTextContent('!');
    expect(screen.getByTestId('callout-admonition-icon').querySelector('svg')).toBeNull();

    const actionButton = screen.getByRole('button', { name: 'View guide' });
    fireEvent.click(actionButton);
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it('toggles smoothly in uncontrolled collapsible mode while keeping header, badge, and actionSlot crisp', () => {
    const onOpenChange = vi.fn();
    const onActionClick = vi.fn();

    render(
      <CalloutAdmonition
        kind="tip"
        title="Keyboard Shortcuts"
        collapsible
        onOpenChange={onOpenChange}
        actionSlot={
          <button type="button" onClick={onActionClick}>
            Open cheat sheet
          </button>
        }
        data-testid="collapsible-callout"
      >
        Use Shift+? to inspect available hotkeys.
      </CalloutAdmonition>
    );

    const aside = screen.getByTestId('collapsible-callout');
    const toggle = screen.getByTestId('callout-admonition-toggle');
    const body = screen.getByTestId('callout-admonition-body');
    const chevron = screen.getByTestId('callout-admonition-chevron');
    const actionBtn = screen.getByRole('button', { name: 'Open cheat sheet' });

    expect(aside).toHaveAttribute('data-collapsible', 'true');
    expect(aside).toHaveAttribute('data-open', 'true');
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(toggle).toHaveAttribute('aria-controls', body.id);
    expect(body).toHaveAttribute('role', 'region');
    expect(body).toHaveAttribute('aria-labelledby', toggle.id);
    expect(body).not.toHaveAttribute('hidden');
    expect(body).toHaveAttribute('data-open', 'true');
    expect(chevron).toHaveClass('rotate-180');

    // actionSlot must never be nested inside the disclosure toggle button
    expect(toggle.contains(actionBtn)).toBe(false);
    fireEvent.click(actionBtn);
    expect(onActionClick).toHaveBeenCalledTimes(1);
    expect(onOpenChange).not.toHaveBeenCalled();

    // Collapse body
    fireEvent.click(toggle);
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
    expect(aside).not.toHaveAttribute('data-open');
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(body).toHaveAttribute('hidden');
    expect(body).toHaveAttribute('data-open', 'false');
    expect(chevron).toHaveClass('rotate-0');

    // Header title, badge, and actionSlot stay visible when collapsed
    expect(screen.getByTestId('callout-admonition-title')).toBeVisible();
    expect(screen.getByTestId('callout-admonition-badge')).toBeVisible();
    expect(actionBtn).toBeVisible();

    // Re-expand body
    fireEvent.click(toggle);
    expect(onOpenChange).toHaveBeenLastCalledWith(true);
    expect(aside).toHaveAttribute('data-open', 'true');
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(body).not.toHaveAttribute('hidden');
    expect(chevron).toHaveClass('rotate-180');
  });

  it('starts collapsed when collapsible=true and defaultOpen=false', () => {
    render(
      <CalloutAdmonition kind="abstract" collapsible defaultOpen={false} data-testid="closed-start">
        Executive summary text.
      </CalloutAdmonition>
    );

    const aside = screen.getByTestId('closed-start');
    const toggle = screen.getByTestId('callout-admonition-toggle');
    const body = screen.getByTestId('callout-admonition-body');

    expect(aside).toHaveAttribute('data-collapsible', 'true');
    expect(aside).not.toHaveAttribute('data-open');
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(body).toHaveAttribute('hidden');
  });

  it('supports controlled open state and synchronizes external toggles', () => {
    function ControlledHarness() {
      const [open, setOpen] = useState(false);
      return (
        <div>
          <button type="button" onClick={() => setOpen((prev) => !prev)}>
            External Toggle
          </button>
          <CalloutAdmonition
            kind="danger"
            title="Production Lock"
            collapsible
            open={open}
            onOpenChange={setOpen}
            data-testid="controlled-callout"
          >
            Confirm maintenance window before unlocking writes.
          </CalloutAdmonition>
        </div>
      );
    }

    render(<ControlledHarness />);

    const toggle = screen.getByTestId('callout-admonition-toggle');
    const body = screen.getByTestId('callout-admonition-body');

    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(body).toHaveAttribute('hidden');

    fireEvent.click(screen.getByRole('button', { name: 'External Toggle' }));
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(body).not.toHaveAttribute('hidden');

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(body).toHaveAttribute('hidden');
  });

  it('handles negative and boundary states: blank title fallback, non-collapsible open=false guard, and empty body', () => {
    const props: CalloutAdmonitionProps = {
      kind: 'warning',
      title: '   ',
      collapsible: false,
      defaultOpen: false,
      open: false,
    };

    const { rerender } = render(
      <CalloutAdmonition {...props} data-testid="edge-callout">
        Body must never be trapped when collapsible is false.
      </CalloutAdmonition>
    );

    expect(screen.getByTestId('callout-admonition-title')).toHaveTextContent('Warning');
    expect(screen.getByTestId('edge-callout')).toHaveAttribute('data-open', 'true');
    expect(screen.getByTestId('callout-admonition-body')).not.toHaveAttribute('hidden');
    expect(screen.getByTestId('callout-admonition-body')).toHaveTextContent(
      'Body must never be trapped when collapsible is false.'
    );

    // Header-only non-collapsible callout with undefined, null, and false children omits body wrapper
    rerender(<CalloutAdmonition kind="note" data-testid="edge-callout" />);
    expect(screen.queryByTestId('callout-admonition-body')).not.toBeInTheDocument();

    rerender(
      <CalloutAdmonition kind="note" data-testid="edge-callout">
        {null}
      </CalloutAdmonition>
    );
    expect(screen.queryByTestId('callout-admonition-body')).not.toBeInTheDocument();

    rerender(
      <CalloutAdmonition kind="note" data-testid="edge-callout">
        {false}
      </CalloutAdmonition>
    );
    expect(screen.queryByTestId('callout-admonition-body')).not.toBeInTheDocument();

    // Collapsible without children still keeps a valid aria-controls region target
    rerender(<CalloutAdmonition kind="tip" collapsible data-testid="edge-callout" />);
    const toggle = screen.getByTestId('callout-admonition-toggle');
    const emptyBody = screen.getByTestId('callout-admonition-body');
    expect(toggle).toHaveAttribute('aria-controls', emptyBody.id);
    expect(emptyBody.textContent).toBe('');
  });

  it('renders adversarial XSS payloads as literal text and stays immune to prototype-polluting strings', () => {
    const payload = '<script>window.__calloutXss=1</script><img src=x onerror=alert(1)>';

    render(
      <CalloutAdmonition
        kind="danger"
        id="__proto__"
        title={payload}
        data-prototype="constructor"
        data-testid="xss-callout"
      >
        {payload}
      </CalloutAdmonition>
    );

    expect(document.querySelector('script')).toBeNull();
    expect(document.querySelector('img')).toBeNull();
    expect(screen.getAllByText(payload)).toHaveLength(2);
    expect(screen.getByTestId('xss-callout')).toHaveAttribute('id', '__proto__');
    expect(({} as Record<string, string>)['__proto__']).not.toBe(payload);
  });
});
