import { createRef } from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import { KeycapBadge } from './index';

describe('KeycapBadge', () => {
  it('renders sculpted crystal <kbd> keycaps with default "+" joiner, aria-label, title, ref, and theme overrides', () => {
    const ref = createRef<HTMLSpanElement>();

    render(
      <PrismThemeProvider
        theme={{
          components: {
            KeycapBadge: {
              className: 'theme-keycap',
              style: { opacity: '0.95' },
            },
          },
        }}
      >
        <KeycapBadge
          ref={ref}
          keys={['⌘', 'Shift', 'K']}
          description="Open command palette"
          className="local-keycap"
          xstyle={{ '--prism-blur-px': '12px' }}
          data-testid="keycap-root"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('keycap-root');
    expect(ref.current).toBe(root);
    expect(root).toHaveClass('refractor-keycap-badge', 'theme-keycap', 'local-keycap');
    expect(root).toHaveAttribute('data-size', 'md');
    expect(root).not.toHaveAttribute('data-empty');
    expect(root).toHaveAttribute('aria-label', 'Open command palette: ⌘ + Shift + K');
    expect(root).toHaveAttribute('title', 'Open command palette');
    expect(root).toHaveStyle({ opacity: '0.95' });

    const kbds = root.querySelectorAll('kbd');
    expect(kbds).toHaveLength(3);
    expect(kbds[0]).toHaveTextContent('⌘');
    expect(kbds[1]).toHaveTextContent('Shift');
    expect(kbds[2]).toHaveTextContent('K');

    for (const kbd of kbds) {
      expect(kbd).toHaveClass(
        'refractor-keycap-badge__key',
        'prism-crystal',
        'border-b-2',
        'border-[var(--prism-border-strong)]',
        'font-mono',
        'tabular-nums',
        'h-6'
      );
    }

    const joiners = root.querySelectorAll('.refractor-keycap-badge__joiner');
    expect(joiners).toHaveLength(2);
    for (const joinerEl of joiners) {
      expect(joinerEl).toHaveTextContent('+');
      expect(joinerEl).toHaveAttribute('aria-hidden', 'true');
    }
  });

  it('supports sm, md, and lg sizes, custom joiner, empty joiner, and duplicate keys safely', () => {
    const { rerender } = render(
      <KeycapBadge keys={['g', 'g']} size="sm" joiner="then" data-testid="sized-keycap" />
    );

    const root = screen.getByTestId('sized-keycap');
    expect(root).toHaveAttribute('data-size', 'sm');
    expect(root).toHaveAttribute('aria-label', 'g + g');
    expect(root).not.toHaveAttribute('title');

    const smKbds = root.querySelectorAll('kbd');
    expect(smKbds).toHaveLength(2);
    expect(smKbds[0]).toHaveClass('h-5', 'text-[10px]');
    const thenJoiners = root.querySelectorAll('.refractor-keycap-badge__joiner');
    expect(thenJoiners).toHaveLength(1);
    expect(thenJoiners[0]).toHaveTextContent('then');

    // Large size with empty joiner omits separator spans completely
    rerender(
      <KeycapBadge keys={['Ctrl', 'Enter']} size="lg" joiner="" data-testid="sized-keycap" />
    );

    expect(root).toHaveAttribute('data-size', 'lg');
    const lgKbds = root.querySelectorAll('kbd');
    expect(lgKbds).toHaveLength(2);
    expect(lgKbds[0]).toHaveClass('h-8', 'text-sm');
    expect(root.querySelectorAll('.refractor-keycap-badge__joiner')).toHaveLength(0);
  });

  it('filters blank/whitespace-only keys and preserves ref/BaseProps with data-empty="true" when empty (negative test)', () => {
    const ref = createRef<HTMLSpanElement>();
    const { rerender } = render(
      <KeycapBadge
        ref={ref}
        keys={['  ', 'Ctrl', '', '\t', '  S  ']}
        data-testid="filtered-keycap"
      />
    );

    const root = screen.getByTestId('filtered-keycap');
    expect(ref.current).toBe(root);
    expect(root).not.toHaveAttribute('data-empty');
    expect(root).toHaveAttribute('aria-label', 'Ctrl + S');
    const kbds = root.querySelectorAll('kbd');
    expect(kbds).toHaveLength(2);
    expect(kbds[0]).toHaveTextContent('Ctrl');
    expect(kbds[1]).toHaveTextContent('S');

    // All blank keys -> renders empty host <span> with data-empty="true" and preserves ref
    rerender(
      <KeycapBadge ref={ref} keys={['', '   ', '\n']} data-testid="filtered-keycap" />
    );
    expect(ref.current).toBe(root);
    expect(root).toHaveAttribute('data-empty', 'true');
    expect(root.querySelectorAll('kbd')).toHaveLength(0);
    expect(root).not.toHaveAttribute('aria-label');
    expect(root).not.toHaveAttribute('title');

    // Empty keys with description retains description for aria-label & title
    rerender(
      <KeycapBadge
        ref={ref}
        keys={[]}
        description="Unbound shortcut"
        data-testid="filtered-keycap"
      />
    );
    expect(root).toHaveAttribute('data-empty', 'true');
    expect(root).toHaveAttribute('aria-label', 'Unbound shortcut');
    expect(root).toHaveAttribute('title', 'Unbound shortcut');
  });

  it('honors explicit aria-label override and renders adversarial XSS payloads and prototype keys safely', () => {
    const payload = '<script>window.__kbdXss=1</script><img src=x onerror=alert(1)>';
    render(
      <KeycapBadge
        keys={['__proto__', 'constructor', payload]}
        description={payload}
        aria-label="Custom shortcut label"
        data-testid="adversarial-keycap"
      />
    );

    const root = screen.getByTestId('adversarial-keycap');
    expect(root).toHaveAttribute('aria-label', 'Custom shortcut label');
    expect(root).toHaveAttribute('title', payload);
    expect(document.querySelector('script')).toBeNull();
    expect(document.querySelector('img')).toBeNull();
    const kbds = root.querySelectorAll('kbd');
    expect(kbds).toHaveLength(3);
    expect(kbds[0]).toHaveTextContent('__proto__');
    expect(kbds[1]).toHaveTextContent('constructor');
    expect(kbds[2]).toHaveTextContent(payload);
  });
});
