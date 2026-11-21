import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import { CitationChip } from './index';

describe('CitationChip', () => {
  it('renders compact crystal trigger with [index] label, opens popover with metadata, safe link, inspect action, ref, and theme overrides', () => {
    const ref = createRef<HTMLSpanElement>();
    const onInspect = vi.fn();

    render(
      <PrismThemeProvider
        theme={{
          components: {
            CitationChip: { className: 'theme-citation', style: { verticalAlign: 'middle' } },
          },
        }}
      >
        <CitationChip
          ref={ref}
          index={1}
          label="ADR-0003"
          title="Optical Token Cascade Contract"
          domain="docs.refractor.dev"
          snippet="Every surface reads exclusively from --prism-* CSS custom properties."
          href="https://docs.refractor.dev/adr/0003"
          onInspect={onInspect}
          className="custom-citation"
          xstyle={{ '--prism-blur-px': '16px' }}
          data-testid="citation-root"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('citation-root');
    expect(ref.current).toBe(root);
    expect(root).toHaveClass('refractor-citation-chip', 'theme-citation', 'custom-citation');
    expect(root).toHaveStyle({ verticalAlign: 'middle' });
    expect(root).toHaveAttribute('data-has-href', 'true');
    expect(root).toHaveAttribute('data-inspectable', 'true');
    expect(root).not.toHaveAttribute('data-open');

    const trigger = screen.getByRole('button', { name: '[1] ADR-0003' });
    expect(trigger).toHaveClass('prism-crystal', 'prism-focus-ring');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).toHaveAttribute('aria-haspopup', 'dialog');
    expect(trigger).not.toHaveAttribute('aria-controls');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    fireEvent.click(trigger);

    expect(root).toHaveAttribute('data-open', 'true');
    expect(trigger).toHaveAttribute('aria-expanded', 'true');

    const dialog = screen.getByRole('dialog', { name: 'Optical Token Cascade Contract' });
    expect(dialog).toHaveClass('prism-slab');
    expect(trigger).toHaveAttribute('aria-controls', dialog.id);
    expect(within(dialog).getByTestId('citation-domain')).toHaveTextContent('docs.refractor.dev');
    expect(within(dialog).getByTestId('citation-snippet')).toHaveTextContent(
      'Every surface reads exclusively from --prism-* CSS custom properties.'
    );

    const link = within(dialog).getByRole('link', { name: /Open source/ });
    expect(link).toHaveAttribute('href', 'https://docs.refractor.dev/adr/0003');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');

    const inspectBtn = within(dialog).getByRole('button', { name: /Inspect source/ });
    fireEvent.click(inspectBtn);
    expect(onInspect).toHaveBeenCalledTimes(1);

    // Clicking trigger again toggles the popover closed cleanly
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('closes popover on Escape, outside click, and close button while staying open on inside clicks or other keys', () => {
    render(
      <div>
        <button type="button">Outside Target</button>
        <CitationChip
          index="A"
          label="Spec"
          snippet="Popover body text."
        />
      </div>
    );

    const trigger = screen.getByRole('button', { name: '[A] Spec' });
    fireEvent.click(trigger);
    expect(screen.getByRole('dialog', { name: 'Spec' })).toBeInTheDocument();

    // Non-Escape key keeps dialog open
    fireEvent.keyDown(document, { key: 'Enter' });
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    // Clicking inside dialog keeps it open
    fireEvent.mouseDown(screen.getByTestId('citation-snippet'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    // Escape closes dialog and restores focus to trigger
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(document.activeElement).toBe(trigger);

    // Reopen and close via outside mousedown
    fireEvent.click(trigger);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.mouseDown(screen.getByRole('button', { name: 'Outside Target' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    // Reopen and close via explicit Close button
    fireEvent.click(trigger);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Close citation preview' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('handles omitted index, index={0}, fallback heading, and safe relative href cleanly', () => {
    const { rerender } = render(
      <CitationChip label="Local Guide" href="/docs/optics" data-testid="chip-minimal" />
    );

    expect(screen.queryByTestId('citation-index')).not.toBeInTheDocument();
    const trigger = screen.getByRole('button', { name: 'Local Guide' });
    fireEvent.click(trigger);

    const dialog = screen.getByRole('dialog', { name: 'Local Guide' });
    expect(within(dialog).queryByTestId('citation-domain')).not.toBeInTheDocument();
    expect(within(dialog).queryByTestId('citation-snippet')).not.toBeInTheDocument();
    expect(within(dialog).queryByRole('button', { name: /Inspect source/ })).not.toBeInTheDocument();
    expect(within(dialog).getByRole('link', { name: /Open source/ })).toHaveAttribute(
      'href',
      '/docs/optics'
    );

    rerender(<CitationChip index={0} label="Zero Index" data-testid="chip-minimal" />);
    expect(screen.getByTestId('citation-index')).toHaveTextContent('[0]');
    expect(screen.queryByRole('link')).not.toBeInTheDocument();

    rerender(<CitationChip index="   " label="Blank Index" data-testid="chip-minimal" />);
    expect(screen.queryByTestId('citation-index')).not.toBeInTheDocument();

    const inspectOnly = vi.fn();
    rerender(<CitationChip label="Inspect Only" onInspect={inspectOnly} data-testid="chip-minimal" />);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Inspect source/ }));
    expect(inspectOnly).toHaveBeenCalledTimes(1);
  });

  it('strips javascript:, vbscript:, data:, and protocol-relative hrefs so no anchor is ever rendered (adversarial)', () => {
    const dangerousUrls: readonly string[] = [
      'javascript:alert(1)',
      '  JaVaScRiPt:alert(document.cookie)',
      'vbscript:msgbox(1)',
      'data:text/html,<script>alert(1)</script>',
      'data:image/png;base64,iVBORw0KGgo=',
      '//evil.example/redirect',
    ];

    for (const badUrl of dangerousUrls) {
      const { unmount } = render(
        <CitationChip
          index={9}
          label="Untrusted Source"
          href={badUrl}
          data-testid="unsafe-chip"
        />
      );

      expect(screen.getByTestId('unsafe-chip')).not.toHaveAttribute('data-has-href');
      fireEvent.click(screen.getByRole('button', { name: '[9] Untrusted Source' }));

      const dialog = screen.getByRole('dialog');
      expect(within(dialog).queryByRole('link')).not.toBeInTheDocument();
      expect(dialog.querySelector('a')).toBeNull();
      unmount();
    }
  });

  it('renders XSS payloads in label, title, domain, snippet, and index strictly as literal text (adversarial)', () => {
    const payload = '<script>window.__citationXss=1</script><img src=x onerror=alert(1)>';

    render(
      <CitationChip
        index={payload}
        label={payload}
        title={payload}
        domain={payload}
        snippet={payload}
        href="javascript:alert(1)"
      />
    );

    fireEvent.click(screen.getByRole('button'));

    expect(document.querySelector('script')).toBeNull();
    expect(document.querySelector('img')).toBeNull();
    expect(document.querySelector('a')).toBeNull();
    expect(screen.getByTestId('citation-index')).toHaveTextContent(`[${payload}]`);
    expect(screen.getByTestId('citation-domain')).toHaveTextContent(payload);
    expect(screen.getByTestId('citation-snippet')).toHaveTextContent(payload);
    expect(screen.getAllByText(payload)).toHaveLength(4);
  });
});
