import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import {
  MarqueeTicker,
  type MarqueeDirectionMap,
  type MarqueeItemTone,
  type MarqueeTickerItem,
} from './index';

const ALL_TONE_ITEMS: ReadonlyArray<MarqueeTickerItem> = [
  { id: 't-neutral', label: 'Nodes', value: '128', delta: '0%', tone: 'neutral' },
  { id: 't-primary', label: 'API p99', value: '16ms', delta: '-2ms', tone: 'primary' },
  { id: 't-emerald', label: 'Uptime', value: '99.99%', delta: '+0.01%', tone: 'emerald' },
  { id: 't-amber', label: 'GPU Load', value: '88%', delta: '+5%', tone: 'amber' },
  { id: 't-rose', label: 'Error Rate', value: '0.42%', delta: '+0.12%', tone: 'rose' },
];

describe('MarqueeTicker', () => {
  it('renders 6 default live market/telemetry items, ref, overrides, edge fades, deduplicated aria-hidden copy, and zero raw colors', () => {
    const ref = createRef<HTMLDivElement>();
    const { container } = render(
      <PrismThemeProvider
        theme={{
          components: {
            MarqueeTicker: {
              className: 'theme-marquee',
              style: { maxWidth: '900px' },
            },
          },
        }}
      >
        <MarqueeTicker
          ref={ref}
          className="consumer-marquee"
          xstyle={{ '--prism-blur-px': '14px' }}
          data-testid="marquee-root"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('marquee-root');
    expect(ref.current).toBe(root);
    expect(MarqueeTicker.displayName).toBe('MarqueeTicker');
    expect(root).toHaveClass(
      'refractor-marquee-ticker',
      'prism-slab',
      'overflow-hidden',
      'relative',
      'flex',
      'items-center',
      'gap-2',
      'min-w-0',
      'max-w-full',
      'theme-marquee',
      'consumer-marquee'
    );
    expect(root).toHaveStyle({ maxWidth: '900px' });
    expect(root).toHaveAttribute('role', 'region');
    expect(root).toHaveAttribute('aria-label', 'Live marquee ticker');
    expect(root).toHaveAttribute('data-direction', 'left');
    expect(root).toHaveAttribute('data-pause-on-hover', 'true');
    expect(root).toHaveAttribute('data-count', '6');
    expect(root).not.toHaveAttribute('data-paused');
    expect(root).not.toHaveAttribute('data-empty');

    // WCAG 2.2.2 Pause / Play toggle button & live status indicator dot
    const toggleBtn = screen.getByTestId('marquee-toggle-pause');
    expect(toggleBtn).toHaveAttribute('aria-pressed', 'false');
    expect(toggleBtn).toHaveAttribute('aria-label', 'Pause marquee ticker');
    expect(toggleBtn).toHaveTextContent('Pause');

    const statusDot = screen.getByTestId('marquee-status-dot');
    expect(statusDot).toHaveAttribute('data-status', 'live');
    expect(statusDot.style.backgroundColor).toBe('var(--prism-success-main)');

    // Edge fade masks strictly use --prism-* tokens
    const fadeLeft = screen.getByTestId('marquee-fade-left');
    const fadeRight = screen.getByTestId('marquee-fade-right');
    expect(fadeLeft).toHaveAttribute('aria-hidden', 'true');
    expect(fadeRight).toHaveAttribute('aria-hidden', 'true');
    expect(fadeLeft.style.background).toContain('var(--prism-slab-top)');
    expect(fadeRight.style.background).toContain('var(--prism-slab-bottom)');

    // Track animation defaults (left, 24s, running)
    const track = screen.getByTestId('marquee-track');
    expect(track.style.animationName).toBe('refractor-marquee-left');
    expect(track.style.animationDuration).toBe('24s');
    expect(track.style.animationPlayState).toBe('running');

    // Primary strip has 6 interactive pills; duplicate strip is aria-hidden with non-button spans
    const primaryStrip = screen.getByTestId('marquee-strip-primary');
    const primaryButtons = within(primaryStrip).getAllByRole('button');
    expect(primaryButtons).toHaveLength(6);

    const duplicateStrip = screen.getByTestId('marquee-strip-duplicate');
    expect(duplicateStrip).toHaveAttribute('aria-hidden', 'true');
    expect(within(duplicateStrip).queryAllByRole('button')).toHaveLength(0);
    expect(
      duplicateStrip.querySelectorAll('[data-testid^="marquee-duplicate-pill-"]')
    ).toHaveLength(6);

    // Total accessible buttons = 1 toggle + 6 primary pills (no duplicates exposed)
    expect(screen.getAllByRole('button')).toHaveLength(7);

    // Zero raw hex/rgb/hsl color literals in rendered DOM
    expect(container.innerHTML).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(container.innerHTML).not.toMatch(/\b(?:rgba?|hsla?)\s*\(/);
  });

  it('supports all 5 semantic tones, direction="right", MarqueeDirectionMap, and durationSec clamping (6..120)', () => {
    const dirKeys: ReadonlyArray<keyof MarqueeDirectionMap> = ['left', 'right'];
    expect(dirKeys).toHaveLength(2);

    const { rerender } = render(
      <MarqueeTicker
        items={ALL_TONE_ITEMS}
        direction="right"
        durationSec={3}
        ariaLabel="Cluster telemetry strip"
        data-testid="marquee-tones"
      />
    );

    const root = screen.getByTestId('marquee-tones');
    expect(root).toHaveAttribute('aria-label', 'Cluster telemetry strip');
    expect(root).toHaveAttribute('data-direction', 'right');

    const track = screen.getByTestId('marquee-track');
    expect(track.style.animationName).toBe('refractor-marquee-right');
    // Clamped lower bound 3 -> 6s
    expect(track.style.animationDuration).toBe('6s');

    const expectedToneVars: ReadonlyArray<[MarqueeItemTone, string]> = [
      ['neutral', 'var(--prism-text-secondary)'],
      ['primary', 'var(--prism-primary-main)'],
      ['emerald', 'var(--prism-success-main)'],
      ['amber', 'var(--prism-warning-main)'],
      ['rose', 'var(--prism-error-main)'],
    ];

    expectedToneVars.forEach(([tone, cssVar], idx) => {
      const pill = screen.getByTestId(`marquee-pill-${idx}`);
      expect(pill).toHaveAttribute('data-tone', tone);
      const dot = within(pill).getByTestId(`marquee-pill-dot-${idx}`);
      expect(dot.style.backgroundColor).toBe(cssVar);
    });

    // Upper clamp (> 120 -> 120s)
    rerender(<MarqueeTicker items={ALL_TONE_ITEMS} durationSec={400} />);
    expect(screen.getByTestId('marquee-track').style.animationDuration).toBe('120s');

    // Non-finite fallback (NaN / Infinity -> 24s)
    rerender(<MarqueeTicker items={ALL_TONE_ITEMS} durationSec={Number.NaN} />);
    expect(screen.getByTestId('marquee-track').style.animationDuration).toBe('24s');

    rerender(
      <MarqueeTicker items={ALL_TONE_ITEMS} durationSec={Number.POSITIVE_INFINITY} />
    );
    expect(screen.getByTestId('marquee-track').style.animationDuration).toBe('24s');
  });

  it('supports uncontrolled and controlled Pause / Play toggling via click and IME-safe keyboard', () => {
    const onPausedChange = vi.fn<(paused: boolean) => void>();

    // Uncontrolled starting paused via defaultPaused={true}
    const { rerender } = render(
      <MarqueeTicker
        defaultPaused
        onPausedChange={onPausedChange}
        data-testid="marquee-ctrl"
      />
    );

    const root = screen.getByTestId('marquee-ctrl');
    const toggleBtn = screen.getByTestId('marquee-toggle-pause');
    const track = screen.getByTestId('marquee-track');
    const statusDot = screen.getByTestId('marquee-status-dot');

    expect(root).toHaveAttribute('data-paused', 'true');
    expect(toggleBtn).toHaveAttribute('aria-pressed', 'true');
    expect(toggleBtn).toHaveAttribute('aria-label', 'Play marquee ticker');
    expect(toggleBtn).toHaveTextContent('Play');
    expect(track.style.animationPlayState).toBe('paused');
    expect(statusDot).toHaveAttribute('data-status', 'paused');
    expect(statusDot.style.backgroundColor).toBe('var(--prism-warning-main)');

    // Click toggles from paused -> running
    fireEvent.click(toggleBtn);
    expect(onPausedChange).toHaveBeenLastCalledWith(false);
    expect(root).not.toHaveAttribute('data-paused');
    expect(toggleBtn).toHaveAttribute('aria-pressed', 'false');
    expect(toggleBtn).toHaveTextContent('Pause');
    expect(track.style.animationPlayState).toBe('running');
    expect(statusDot.style.backgroundColor).toBe('var(--prism-success-main)');

    // IME composing Enter/Space on toggle button is ignored
    fireEvent.keyDown(toggleBtn, { key: 'Enter', isComposing: true });
    fireEvent.keyDown(toggleBtn, { key: ' ', isComposing: true });
    fireEvent.keyDown(toggleBtn, { key: 'Escape' });
    expect(onPausedChange).toHaveBeenCalledTimes(1);

    // Non-composing Enter & Space toggle pause/play
    fireEvent.keyDown(toggleBtn, { key: 'Enter' });
    expect(onPausedChange).toHaveBeenLastCalledWith(true);
    expect(toggleBtn).toHaveAttribute('aria-pressed', 'true');

    fireEvent.keyDown(toggleBtn, { key: ' ' });
    expect(onPausedChange).toHaveBeenLastCalledWith(false);
    expect(toggleBtn).toHaveAttribute('aria-pressed', 'false');

    // Controlled mode: clicking emits onPausedChange without mutating internal UI until prop updates
    const controlledChange = vi.fn<(paused: boolean) => void>();
    rerender(
      <MarqueeTicker
        paused={true}
        onPausedChange={controlledChange}
        data-testid="marquee-ctrl"
      />
    );
    expect(screen.getByTestId('marquee-ctrl')).toHaveAttribute('data-paused', 'true');
    expect(screen.getByTestId('marquee-toggle-pause')).toHaveAttribute(
      'aria-pressed',
      'true'
    );

    fireEvent.click(screen.getByTestId('marquee-toggle-pause'));
    expect(controlledChange).toHaveBeenCalledWith(false);
    // Still paused until parent updates prop
    expect(screen.getByTestId('marquee-ctrl')).toHaveAttribute('data-paused', 'true');

    rerender(
      <MarqueeTicker
        paused={false}
        onPausedChange={controlledChange}
        data-testid="marquee-ctrl"
      />
    );
    expect(screen.getByTestId('marquee-ctrl')).not.toHaveAttribute('data-paused');
    expect(screen.getByTestId('marquee-track').style.animationPlayState).toBe(
      'running'
    );
  });

  it('pauses on hover and inner focus when pauseOnHover is true, preserves caller handlers, and ignores hover/focus when pauseOnHover is false', () => {
    const onMouseEnter = vi.fn();
    const onMouseLeave = vi.fn();
    const onFocus = vi.fn();
    const onBlur = vi.fn();

    const { rerender } = render(
      <div>
        <button type="button" data-testid="outside-btn">
          Outside
        </button>
        <MarqueeTicker
          items={ALL_TONE_ITEMS}
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave}
          onFocus={onFocus}
          onBlur={onBlur}
          data-testid="marquee-hover"
        />
      </div>
    );

    const root = screen.getByTestId('marquee-hover');
    const track = screen.getByTestId('marquee-track');
    const toggleBtn = screen.getByTestId('marquee-toggle-pause');
    const pill0 = screen.getByTestId('marquee-pill-0');
    const pill1 = screen.getByTestId('marquee-pill-1');
    const outsideBtn = screen.getByTestId('outside-btn');

    // Hover pauses animation & updates indicator dot
    fireEvent.mouseEnter(root);
    expect(onMouseEnter).toHaveBeenCalledTimes(1);
    expect(root).toHaveAttribute('data-paused', 'true');
    expect(track.style.animationPlayState).toBe('paused');
    expect(screen.getByTestId('marquee-status-dot').style.backgroundColor).toBe(
      'var(--prism-warning-main)'
    );

    fireEvent.mouseLeave(root);
    expect(onMouseLeave).toHaveBeenCalledTimes(1);
    expect(root).not.toHaveAttribute('data-paused');
    expect(track.style.animationPlayState).toBe('running');

    // Focusing a ticker pill pauses animation
    fireEvent.focus(pill0);
    expect(onFocus).toHaveBeenCalledTimes(1);
    expect(root).toHaveAttribute('data-paused', 'true');
    expect(track.style.animationPlayState).toBe('paused');

    // Moving focus between two pills keeps ticker paused
    fireEvent.blur(pill0, { relatedTarget: pill1 });
    expect(onBlur).toHaveBeenCalledTimes(1);
    expect(root).toHaveAttribute('data-paused', 'true');

    // Moving focus to the Pause/Play button clears item focus-pause so Play resumes cleanly
    fireEvent.blur(pill1, { relatedTarget: toggleBtn });
    fireEvent.focus(toggleBtn);
    expect(root).not.toHaveAttribute('data-paused');

    // Focusing pill again and blurring to outside element or null resumes animation
    fireEvent.focus(pill0);
    expect(root).toHaveAttribute('data-paused', 'true');
    fireEvent.blur(pill0, { relatedTarget: outsideBtn });
    expect(root).not.toHaveAttribute('data-paused');

    fireEvent.focus(pill0);
    expect(root).toHaveAttribute('data-paused', 'true');
    fireEvent.blur(pill0, { relatedTarget: null });
    expect(root).not.toHaveAttribute('data-paused');

    // When pauseOnHover={false}, hovering or focusing does NOT pause
    rerender(
      <div>
        <button type="button" data-testid="outside-btn">
          Outside
        </button>
        <MarqueeTicker
          items={ALL_TONE_ITEMS}
          pauseOnHover={false}
          data-testid="marquee-hover"
        />
      </div>
    );

    const noHoverRoot = screen.getByTestId('marquee-hover');
    expect(noHoverRoot).not.toHaveAttribute('data-pause-on-hover');
    fireEvent.mouseEnter(noHoverRoot);
    fireEvent.focus(screen.getByTestId('marquee-pill-0'));
    expect(noHoverRoot).not.toHaveAttribute('data-paused');
    expect(screen.getByTestId('marquee-track').style.animationPlayState).toBe(
      'running'
    );
  });

  it('fires onSelectItem on click and IME-safe Enter/Space on primary ticker pills (and stays safe without onSelectItem)', () => {
    const onSelectItem = vi.fn<(item: MarqueeTickerItem) => void>();
    const { rerender } = render(
      <MarqueeTicker items={ALL_TONE_ITEMS} onSelectItem={onSelectItem} />
    );

    const pill0 = screen.getByTestId('marquee-pill-0');
    const pill2 = screen.getByTestId('marquee-pill-2');

    // IME composing Enter & Space must NOT fire selection
    fireEvent.keyDown(pill0, { key: 'Enter', isComposing: true });
    fireEvent.keyDown(pill0, { key: ' ', isComposing: true });
    expect(onSelectItem).not.toHaveBeenCalled();

    // Unhandled key ignored
    fireEvent.keyDown(pill0, { key: 'ArrowRight' });
    expect(onSelectItem).not.toHaveBeenCalled();

    // Click fires onSelectItem with exact original item
    fireEvent.click(pill0);
    expect(onSelectItem).toHaveBeenLastCalledWith(ALL_TONE_ITEMS[0]);

    // Enter fires onSelectItem
    fireEvent.keyDown(pill2, { key: 'Enter' });
    expect(onSelectItem).toHaveBeenLastCalledWith(ALL_TONE_ITEMS[2]);

    // Space fires onSelectItem
    fireEvent.keyDown(pill0, { key: ' ' });
    expect(onSelectItem).toHaveBeenLastCalledWith(ALL_TONE_ITEMS[0]);
    expect(onSelectItem).toHaveBeenCalledTimes(3);

    // Safe no-op when onSelectItem is omitted
    rerender(<MarqueeTicker items={ALL_TONE_ITEMS} />);
    expect(() => {
      fireEvent.click(screen.getByTestId('marquee-pill-0'));
      fireEvent.keyDown(screen.getByTestId('marquee-pill-0'), { key: 'Enter' });
    }).not.toThrow();
  });

  it('renders an accessible role="status" empty state when items is []', () => {
    render(
      <MarqueeTicker
        items={[]}
        ariaLabel="Empty feed"
        data-testid="marquee-empty-root"
      />
    );

    const root = screen.getByTestId('marquee-empty-root');
    expect(root).toHaveAttribute('data-empty', 'true');
    expect(root).toHaveAttribute('data-count', '0');
    expect(root).toHaveAttribute('aria-label', 'Empty feed');

    const empty = screen.getByRole('status');
    expect(empty).toBe(screen.getByTestId('marquee-empty-state'));
    expect(empty).toHaveTextContent('No live ticker items available.');
    expect(screen.queryByTestId('marquee-track')).toBeNull();
    expect(screen.queryByTestId('marquee-toggle-pause')).toBeNull();
  });

  it('defends against adversarial inputs: duplicate/prototype IDs, blank fields, omitted value/delta/tone, and XSS payloads', () => {
    const adversarialItems: ReadonlyArray<MarqueeTickerItem> = [
      { id: '__proto__', label: 'Alpha', value: '10', delta: '+1%' },
      { id: '__proto__', label: 'Beta', value: '   ', delta: '   ' },
      { id: '   ', label: '<script>alert("xss")</script>' },
      { id: 'only-id', label: '   ' },
      { id: '   ', label: '   ' },
    ];

    const { container } = render(
      <MarqueeTicker
        items={adversarialItems}
        ariaLabel="   "
        data-testid="marquee-adv"
      />
    );

    // Whitespace ariaLabel falls back to default
    const root = screen.getByTestId('marquee-adv');
    expect(root).toHaveAttribute('aria-label', 'Live marquee ticker');
    expect(root).toHaveAttribute('data-count', '5');

    // All 5 primary pills rendered cleanly with no key collisions or prototype pollution
    const primaryStrip = screen.getByTestId('marquee-strip-primary');
    expect(within(primaryStrip).getAllByRole('button')).toHaveLength(5);

    // Default tone falls back to neutral
    expect(screen.getByTestId('marquee-pill-0')).toHaveAttribute('data-tone', 'neutral');

    // Whitespace value/delta omitted cleanly
    expect(screen.getByTestId('marquee-pill-1')).toHaveTextContent('Beta');

    // XSS payload escaped as literal text, never injected as DOM script
    expect(screen.getByTestId('marquee-pill-2')).toHaveTextContent(
      '<script>alert("xss")</script>'
    );
    expect(container.querySelector('script')).toBeNull();

    // Blank label falls back to trimmed id, and blank id + blank label falls back to 'Ticker item'
    expect(screen.getByTestId('marquee-pill-3')).toHaveTextContent('only-id');
    expect(screen.getByTestId('marquee-pill-4')).toHaveTextContent('Ticker item');
  });
});
