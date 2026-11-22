import { createRef } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import {
  LinkPreviewCard,
  type LinkPreviewEntityKind,
  type LinkPreviewMetadata,
} from './index';

const BASE_PREVIEW: LinkPreviewMetadata = {
  title: 'ADR-0003: Optical Token Cascade Contract',
  summary:
    'Defines the strict --prism-* CSS custom property surface contract shared across all Refractor glass components.',
  kind: 'doc',
  author: 'Elena Vance',
  updatedAt: 'Updated 2h ago',
  tags: ['architecture', 'tokens', 'glass'],
  thumbnailSrc: 'https://docs.refractor.dev/assets/adr-0003.png',
};

afterEach(() => {
  vi.useRealTimers();
});

describe('LinkPreviewCard', () => {
  it('renders inline optical anchor trigger with ref, theme override, full card metadata, and viewport-clamped prism-slab dialog', () => {
    const ref = createRef<HTMLSpanElement>();

    render(
      <PrismThemeProvider
        theme={{
          components: {
            LinkPreviewCard: {
              className: 'theme-link-preview',
              style: { verticalAlign: 'middle' },
            },
          },
        }}
      >
        <p>
          Read{' '}
          <LinkPreviewCard
            ref={ref}
            href="/docs/adr-0003"
            label="ADR-0003 Spec"
            preview={BASE_PREVIEW}
            defaultOpen
            className="custom-link-preview"
            style={{ marginRight: '4px' }}
            xstyle={{ '--prism-blur-px': '20px' }}
            data-testid="preview-root"
          />{' '}
          for details.
        </p>
      </PrismThemeProvider>
    );

    expect(LinkPreviewCard.displayName).toBe('LinkPreviewCard');

    const root = screen.getByTestId('preview-root');
    expect(ref.current).toBe(root);
    expect(root).toHaveClass(
      'refractor-link-preview-card',
      'theme-link-preview',
      'custom-link-preview',
      'max-w-full'
    );
    expect(root).toHaveStyle({ verticalAlign: 'middle', marginRight: '4px' });
    expect(root.style.getPropertyValue('--prism-blur-px')).toBe('20px');
    expect(root).toHaveAttribute('data-open', 'true');
    expect(root).toHaveAttribute('data-placement', 'bottom');
    expect(root).toHaveAttribute('data-kind', 'doc');
    expect(root).toHaveAttribute('data-has-href', 'true');
    expect(root).not.toHaveAttribute('data-external');

    const trigger = screen.getByRole('link', { name: 'ADR-0003 Spec' });
    expect(trigger).toHaveAttribute('href', '/docs/adr-0003');
    expect(trigger).not.toHaveAttribute('target');
    expect(trigger).not.toHaveAttribute('rel');
    expect(trigger).toHaveClass('prism-focus-ring', 'underline');
    expect(trigger.style.textDecorationColor).toBe('var(--prism-primary-main)');
    expect(trigger).toHaveAttribute('aria-haspopup', 'dialog');
    expect(trigger).toHaveAttribute('aria-expanded', 'true');

    const dialog = screen.getByRole('dialog', {
      name: 'ADR-0003: Optical Token Cascade Contract',
    });
    expect(trigger).toHaveAttribute('aria-controls', dialog.id);
    expect(dialog).toHaveClass('prism-slab', 'w-[min(20rem,calc(100vw-2rem))]');

    const thumbnail = within(dialog).getByTestId('link-preview-thumbnail');
    expect(thumbnail).toHaveAttribute(
      'src',
      'https://docs.refractor.dev/assets/adr-0003.png'
    );
    expect(thumbnail).toHaveAttribute('alt', BASE_PREVIEW.title);

    const badge = within(dialog).getByTestId('link-preview-badge');
    expect(badge).toHaveTextContent('Doc');
    expect(badge).toHaveAttribute('data-kind', 'doc');

    expect(within(dialog).getByTestId('link-preview-title')).toHaveTextContent(
      BASE_PREVIEW.title
    );
    expect(within(dialog).getByTestId('link-preview-summary')).toHaveTextContent(
      BASE_PREVIEW.summary
    );
    expect(within(dialog).getByTestId('link-preview-author')).toHaveTextContent(
      'Elena Vance'
    );
    expect(within(dialog).getByTestId('link-preview-updated')).toHaveTextContent(
      'Updated 2h ago'
    );

    const tags = within(dialog).getAllByTestId('link-preview-tag');
    expect(tags.map((el) => el.textContent)).toEqual([
      'architecture',
      'tokens',
      'glass',
    ]);
  });

  it('renders all entity kind badges, defaults kind cleanly, supports top placement, external link attributes, and deduplicated tags', () => {
    const expectedBadges: ReadonlyArray<{
      kind: LinkPreviewEntityKind;
      label: string;
    }> = [
      { kind: 'doc', label: 'Doc' },
      { kind: 'wiki', label: 'Wiki' },
      { kind: 'issue', label: 'Issue' },
      { kind: 'repo', label: 'Repo' },
      { kind: 'external', label: 'Link' },
    ];

    for (const entry of expectedBadges) {
      const { unmount } = render(
        <LinkPreviewCard
          href="https://docs.refractor.dev/item"
          label={`Item ${entry.kind}`}
          defaultOpen
          preview={{
            title: `Title ${entry.kind}`,
            summary: 'Short summary',
            kind: entry.kind,
          }}
        />
      );
      const badge = screen.getByTestId('link-preview-badge');
      expect(badge).toHaveTextContent(entry.label);
      expect(badge).toHaveAttribute('data-kind', entry.kind);
      unmount();
    }

    const rasterDataUri = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB';
    const { rerender } = render(
      <LinkPreviewCard
        href="https://github.com/refractor-ui/core"
        label="External Repo"
        external
        placement="top"
        defaultOpen
        preview={{
          title: 'Refractor Core',
          summary: '   ',
          tags: ['react', ' ', 'react', 'optical'],
          thumbnailSrc: rasterDataUri,
        }}
        data-testid="external-root"
      />
    );

    const root = screen.getByTestId('external-root');
    expect(root).toHaveAttribute('data-placement', 'top');
    expect(root).toHaveAttribute('data-kind', 'external');
    expect(root).toHaveAttribute('data-external', 'true');

    const link = screen.getByRole('link', { name: 'External Repo' });
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');

    const bridge = screen.getByTestId('link-preview-bridge');
    expect(bridge).toHaveAttribute('data-placement', 'top');
    expect(bridge).toHaveClass('bottom-full', 'pb-2');

    const dialog = screen.getByRole('dialog');
    expect(dialog).not.toHaveAttribute('aria-describedby');
    expect(screen.queryByTestId('link-preview-summary')).not.toBeInTheDocument();
    expect(screen.queryByTestId('link-preview-meta')).not.toBeInTheDocument();
    expect(screen.getByTestId('link-preview-badge')).toHaveTextContent('Link');
    expect(
      screen.getByTestId('link-preview-external-indicator')
    ).toHaveTextContent('External');
    expect(screen.getByTestId('link-preview-thumbnail')).toHaveAttribute(
      'src',
      rasterDataUri
    );
    expect(
      screen.getAllByTestId('link-preview-tag').map((el) => el.textContent)
    ).toEqual(['react', 'optical']);

    // Default kind without external defaults to 'doc', and partial meta rows render cleanly
    rerender(
      <LinkPreviewCard
        href="/docs/minimal"
        label="Minimal Doc"
        defaultOpen
        preview={{
          title: 'Minimal Doc',
          summary: 'Summary line',
          author: '   ',
          updatedAt: 'Today',
          tags: [],
        }}
        data-testid="external-root"
      />
    );
    expect(screen.getByTestId('link-preview-badge')).toHaveTextContent('Doc');
    expect(screen.queryByTestId('link-preview-author')).not.toBeInTheDocument();
    expect(screen.getByTestId('link-preview-updated')).toHaveTextContent('Today');
    expect(screen.queryByTestId('link-preview-tags')).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('link-preview-external-indicator')
    ).not.toBeInTheDocument();

    // Author-only metadata row (without updatedAt) renders cleanly
    rerender(
      <LinkPreviewCard
        href="/docs/author-only"
        label="Author Doc"
        defaultOpen
        preview={{
          title: 'Author Doc',
          summary: 'Author-only summary',
          author: 'Marcus Chen',
        }}
        data-testid="external-root"
      />
    );
    expect(screen.getByTestId('link-preview-author')).toHaveTextContent('Marcus Chen');
    expect(screen.queryByTestId('link-preview-updated')).not.toBeInTheDocument();
  });

  it('opens and closes with clamped hover delays, preserves hover across bridge, and cleans up timers on unmount', () => {
    vi.useFakeTimers();
    const onOpenChange = vi.fn();

    const { unmount } = render(
      <LinkPreviewCard
        href="/docs/guide"
        label="Optical Guide"
        preview={BASE_PREVIEW}
        onOpenChange={onOpenChange}
        data-testid="hover-root"
      />
    );

    const trigger = screen.getByRole('link', { name: 'Optical Guide' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    // Hover in then leave before default 120ms open delay cancels open cleanly
    fireEvent.mouseEnter(trigger);
    act(() => {
      vi.advanceTimersByTime(60);
    });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    fireEvent.mouseLeave(trigger);
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(onOpenChange).not.toHaveBeenCalled();

    // Hover in for full 120ms opens dialog
    fireEvent.mouseEnter(trigger);
    act(() => {
      vi.advanceTimersByTime(119);
    });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(onOpenChange).toHaveBeenCalledTimes(1);
    expect(onOpenChange).toHaveBeenLastCalledWith(true);

    // Leave trigger -> move into hover bridge before 150ms close delay cancels close
    fireEvent.mouseLeave(trigger);
    act(() => {
      vi.advanceTimersByTime(80);
    });
    const bridge = screen.getByTestId('link-preview-bridge');
    fireEvent.mouseEnter(bridge);
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(onOpenChange).toHaveBeenCalledTimes(1);

    // Leave bridge for full 150ms closes dialog
    fireEvent.mouseLeave(bridge);
    act(() => {
      vi.advanceTimersByTime(149);
    });
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(onOpenChange).toHaveBeenCalledTimes(2);
    expect(onOpenChange).toHaveBeenLastCalledWith(false);

    // Pending open timer is cleared safely on unmount
    fireEvent.mouseEnter(trigger);
    act(() => {
      vi.advanceTimersByTime(40);
    });
    unmount();
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(onOpenChange).toHaveBeenCalledTimes(2);
  });

  it('clamps extreme/NaN openDelayMs and closeDelayMs and cleans up pending close timers on unmount', () => {
    vi.useFakeTimers();
    const onOpenChange = vi.fn();

    const { rerender, unmount } = render(
      <LinkPreviewCard
        href="/docs/clamped"
        label="Clamped Delays"
        preview={BASE_PREVIEW}
        openDelayMs={-250}
        closeDelayMs={0}
        onOpenChange={onOpenChange}
      />
    );

    const trigger = screen.getByRole('link', { name: 'Clamped Delays' });

    // Negative openDelayMs clamps to 0 (synchronous open) and closeDelayMs=0 closes synchronously
    fireEvent.mouseEnter(trigger);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.mouseLeave(trigger);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    // Excessive closeDelayMs clamps to 1000ms and NaN openDelayMs falls back to 120ms
    rerender(
      <LinkPreviewCard
        href="/docs/clamped"
        label="Clamped Delays"
        preview={BASE_PREVIEW}
        openDelayMs={Number.NaN}
        closeDelayMs={9999}
        onOpenChange={onOpenChange}
      />
    );

    fireEvent.mouseEnter(trigger);
    act(() => {
      vi.advanceTimersByTime(120);
    });
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    fireEvent.mouseLeave(trigger);
    act(() => {
      vi.advanceTimersByTime(999);
    });
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    // Unmount with pending close timer clears timeout without calling onOpenChange
    const callsBeforeUnmount = onOpenChange.mock.calls.length;
    unmount();
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(onOpenChange).toHaveBeenCalledTimes(callsBeforeUnmount);
  });

  it('opens on focus, keeps open on internal blur, dismisses on outside blur and IME-safe Escape (both focused and hovered)', () => {
    const onOpenChange = vi.fn();
    const onKeyDown = vi.fn();

    render(
      <div>
        <button type="button">Outside Control</button>
        <LinkPreviewCard
          href="/docs/keyboard"
          label="Keyboard Link"
          preview={BASE_PREVIEW}
          openDelayMs={0}
          closeDelayMs={0}
          onOpenChange={onOpenChange}
          onKeyDown={onKeyDown}
        />
      </div>
    );

    const trigger = screen.getByRole('link', { name: 'Keyboard Link' });
    const outsideBtn = screen.getByRole('button', { name: 'Outside Control' });

    // Focus opens immediately
    fireEvent.focus(trigger);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(onOpenChange).toHaveBeenCalledWith(true);

    // Focusing/blurring to a node inside the component keeps dialog open
    fireEvent.blur(trigger, { relatedTarget: dialog });
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    // Non-Escape key keeps dialog open
    fireEvent.keyDown(trigger, { key: 'Enter' });
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(onKeyDown).toHaveBeenCalledTimes(1);

    // Escape during IME composition is ignored
    const composingEvent = new KeyboardEvent('keydown', {
      key: 'Escape',
      bubbles: true,
      cancelable: true,
    });
    Object.defineProperty(composingEvent, 'isComposing', { value: true });
    act(() => {
      trigger.dispatchEvent(composingEvent);
    });
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    // Genuine Escape while focused closes dialog once and restores focus to trigger
    fireEvent.keyDown(trigger, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(document.activeElement).toBe(trigger);
    expect(onOpenChange).toHaveBeenCalledTimes(2);
    expect(onOpenChange).toHaveBeenLastCalledWith(false);

    // Reopen via focus, then blur to outside control closes cleanly
    fireEvent.focus(trigger);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.blur(trigger, { relatedTarget: outsideBtn });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    // Open via hover, ignore document non-Escape & composing Escape, dismiss on document Escape
    fireEvent.mouseEnter(trigger);
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Tab' });
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    const docComposingEscape = new KeyboardEvent('keydown', {
      key: 'Escape',
      bubbles: true,
    });
    Object.defineProperty(docComposingEscape, 'isComposing', { value: true });
    act(() => {
      document.dispatchEvent(docComposingEscape);
    });
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('toggles on click for internal URLs and prevented external clicks, without blocking normal external clicks, and supports controlled mode', () => {
    const internalPaths: readonly string[] = [
      '/docs/intro',
      '#section-optics',
      './sibling',
      '../parent',
    ];

    for (const internalHref of internalPaths) {
      const { unmount } = render(
        <LinkPreviewCard
          href={internalHref}
          label="Internal Anchor"
          preview={BASE_PREVIEW}
        />
      );
      const anchor = screen.getByRole('link', { name: 'Internal Anchor' });
      fireEvent.click(anchor);
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      fireEvent.click(anchor);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      unmount();
    }

    // External click with consumer preventDefault toggles preview; clicking inside card does not close
    const preventedClick = vi.fn((event: { preventDefault: () => void }) => {
      event.preventDefault();
    });
    const { rerender } = render(
      <LinkPreviewCard
        href="https://docs.refractor.dev/spec"
        label="Prevented External"
        external
        onClick={preventedClick}
        preview={BASE_PREVIEW}
      />
    );

    const extAnchor = screen.getByRole('link', { name: 'Prevented External' });
    fireEvent.click(extAnchor);
    expect(preventedClick).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    // Clicking inside dialog summary does not toggle closed even though root onClick prevents default
    fireEvent.click(screen.getByTestId('link-preview-summary'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    // Clicking external link WITHOUT preventDefault does not hijack navigation or open card
    const allowNavClick = vi.fn();
    rerender(
      <LinkPreviewCard
        href="https://docs.refractor.dev/spec"
        label="Normal External"
        external
        open={false}
        onClick={allowNavClick}
        preview={BASE_PREVIEW}
      />
    );
    const normalAnchor = screen.getByRole('link', { name: 'Normal External' });
    const clickEvent = new MouseEvent('click', { bubbles: true, cancelable: true });
    act(() => {
      normalAnchor.dispatchEvent(clickEvent);
    });
    expect(allowNavClick).toHaveBeenCalledTimes(1);
    expect(clickEvent.defaultPrevented).toBe(false);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    // Controlled mode delegates state transitions via onOpenChange without mutating internally
    const onControlledChange = vi.fn();
    rerender(
      <LinkPreviewCard
        href="/docs/controlled"
        label="Controlled Link"
        open={false}
        onOpenChange={onControlledChange}
        preview={BASE_PREVIEW}
      />
    );
    fireEvent.focus(screen.getByRole('link', { name: 'Controlled Link' }));
    expect(onControlledChange).toHaveBeenCalledWith(true);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    rerender(
      <LinkPreviewCard
        href="/docs/controlled"
        label="Controlled Link"
        open={true}
        onOpenChange={onControlledChange}
        preview={BASE_PREVIEW}
      />
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('strictly blocks unsafe href and thumbnailSrc protocols (adversarial)', () => {
    const unsafeHrefs: readonly string[] = [
      'javascript:alert(1)',
      '  JaVaScRiPt:alert(document.cookie)',
      'vbscript:msgbox(1)',
      'data:text/html,<script>alert(1)</script>',
      'data:image/png;base64,iVBORw0KGgo=',
      '//evil.example/redirect',
      '   ',
    ];

    for (const badHref of unsafeHrefs) {
      const { container, unmount } = render(
        <LinkPreviewCard
          href={badHref}
          label="Untrusted Link"
          external
          preview={{
            title: 'Untrusted Target',
            summary: 'Must never become an unsafe anchor.',
            thumbnailSrc: 'javascript:alert(1)',
          }}
          data-testid="unsafe-root"
        />
      );

      const root = screen.getByTestId('unsafe-root');
      expect(root).not.toHaveAttribute('data-has-href');
      expect(root).not.toHaveAttribute('data-external');
      expect(screen.queryByRole('link')).not.toBeInTheDocument();
      expect(container.querySelector('a')).toBeNull();

      const fallbackTrigger = screen.getByRole('button', {
        name: 'Untrusted Link',
      });
      expect(fallbackTrigger).not.toHaveAttribute('href');
      expect(fallbackTrigger).not.toHaveAttribute('target');
      expect(fallbackTrigger).not.toHaveAttribute('rel');

      // Clicking safe button trigger toggles preview card and never renders unsafe thumbnail
      fireEvent.click(fallbackTrigger);
      const dialog = screen.getByRole('dialog');
      expect(within(dialog).queryByTestId('link-preview-thumbnail')).not.toBeInTheDocument();
      expect(container.querySelector('img')).toBeNull();

      // Escape restores focus to the button trigger
      fireEvent.keyDown(fallbackTrigger, { key: 'Escape' });
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(document.activeElement).toBe(fallbackTrigger);

      unmount();
    }

    const unsafeThumbnails: readonly string[] = [
      'javascript:alert(1)',
      'vbscript:msgbox(1)',
      'data:text/html,<script>alert(1)</script>',
      'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=',
      '//evil.example/pixel.png',
    ];

    for (const badThumb of unsafeThumbnails) {
      const { container, unmount } = render(
        <LinkPreviewCard
          href="https://docs.refractor.dev/safe"
          label="Safe Link Unsafe Thumb"
          defaultOpen
          preview={{
            title: 'Thumbnail Sanitization',
            summary: 'Unsafe thumbnails must be dropped.',
            thumbnailSrc: badThumb,
          }}
        />
      );
      expect(container.querySelector('img')).toBeNull();
      expect(screen.queryByTestId('link-preview-thumbnail')).not.toBeInTheDocument();
      unmount();
    }
  });

  it('renders XSS payloads in label, title, summary, author, updatedAt, and tags strictly as literal text (adversarial)', () => {
    const payload = '<script>window.__linkPreviewXss=1</script><img src=x onerror=alert(1)>';

    render(
      <LinkPreviewCard
        href="javascript:alert(1)"
        label={payload}
        defaultOpen
        preview={{
          title: payload,
          summary: payload,
          author: payload,
          updatedAt: payload,
          tags: [payload],
          thumbnailSrc: 'data:text/html,<script>alert(1)</script>',
        }}
      />
    );

    expect(document.querySelector('script')).toBeNull();
    expect(document.querySelector('img')).toBeNull();
    expect(document.querySelector('a')).toBeNull();
    expect(screen.getByTestId('link-preview-title')).toHaveTextContent(payload);
    expect(screen.getByTestId('link-preview-summary')).toHaveTextContent(payload);
    expect(screen.getByTestId('link-preview-author')).toHaveTextContent(payload);
    expect(screen.getByTestId('link-preview-updated')).toHaveTextContent(payload);
    expect(screen.getByTestId('link-preview-tag')).toHaveTextContent(payload);
  });
});
