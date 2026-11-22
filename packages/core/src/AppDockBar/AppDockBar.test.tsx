import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import {
  AppDockBar,
  type AppDockItem,
  type AppDockPositionMap,
  type AppDockTone,
} from './index';

const ALL_TONES_ITEMS: ReadonlyArray<AppDockItem> = [
  { id: 'app-primary', label: 'Primary', tone: 'primary', running: true },
  { id: 'app-secondary', label: 'Secondary', tone: 'secondary', running: true },
  { id: 'app-emerald', label: 'Emerald', tone: 'emerald', running: false },
  { id: 'app-amber', label: 'Amber', tone: 'amber', badgeCount: 99 },
  { id: 'app-rose', label: 'Rose', tone: 'rose', badgeCount: 140, attention: true },
  { id: 'app-info', label: 'Info', tone: 'info', disabled: true, attention: true },
];

describe('AppDockBar', () => {
  it('renders 6 default iconic studio apps, ref, overrides, running dots, badge, attention, and zero raw colors', () => {
    const ref = createRef<HTMLDivElement>();
    const { container } = render(
      <PrismThemeProvider
        theme={{
          components: {
            AppDockBar: {
              className: 'theme-dock',
              style: { maxWidth: '640px' },
            },
          },
        }}
      >
        <AppDockBar
          ref={ref}
          className="consumer-dock"
          xstyle={{ '--prism-blur-px': '16px' }}
          data-testid="dock-root"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('dock-root');
    expect(ref.current).toBe(root);
    expect(AppDockBar.displayName).toBe('AppDockBar');
    expect(root).toHaveClass(
      'refractor-app-dock-bar',
      'prism-slab',
      'rounded-full',
      'max-w-full',
      'min-w-0',
      'theme-dock',
      'consumer-dock'
    );
    expect(root).toHaveStyle({ maxWidth: '640px' });
    expect(root).toHaveAttribute('role', 'toolbar');
    expect(root).toHaveAttribute('aria-label', 'Application dock');
    expect(root).toHaveAttribute('aria-orientation', 'horizontal');
    expect(root).toHaveAttribute('data-position', 'bottom');
    expect(root).toHaveAttribute('data-magnification', 'true');
    expect(root).toHaveAttribute('data-count', '6');
    expect(root).not.toHaveAttribute('data-empty');

    const tray = screen.getByTestId('app-dock-tray');
    expect(tray).toHaveClass('overflow-x-auto', 'max-w-full', 'min-w-0');

    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(6);

    const expectedLabels = [
      'Finder',
      'Code IDE',
      'Prism Studio',
      'Terminal',
      'Messages',
      'Settings',
    ];
    expectedLabels.forEach((label, idx) => {
      const btn = screen.getByTestId(`app-dock-item-${idx}`);
      expect(btn.getAttribute('aria-label')).toContain(label);
      expect(btn).toHaveAttribute('data-scale', '1.00');
      expect(btn.style.transform).toBe('scale(1)');
    });

    // Running indicator dots on Finder..Messages (indices 0..4), absent on Settings (index 5)
    for (let idx = 0; idx < 5; idx += 1) {
      const dot = screen.getByTestId(`app-dock-running-dot-${idx}`);
      expect(dot.style.backgroundColor).toBe('var(--prism-primary-main)');
    }
    expect(screen.queryByTestId('app-dock-running-dot-5')).toBeNull();

    // Numeric badge pill on Messages (index 4) strictly using --prism-error-main
    const msgBadge = screen.getByTestId('app-dock-badge-4');
    expect(msgBadge).toHaveTextContent('3');
    expect(msgBadge.style.backgroundColor).toBe('var(--prism-error-main)');
    expect(msgBadge.style.color).toBe('var(--prism-error-contrast)');

    // Attention bounce indicator on Messages (index 4)
    const msgBtn = screen.getByTestId('app-dock-item-4');
    expect(msgBtn).toHaveAttribute('data-attention', 'true');
    expect(screen.getByTestId('app-dock-glyph-4').style.animation).toContain(
      'refractor-dock-attention'
    );
    expect(screen.getByTestId('app-dock-item-0')).not.toHaveAttribute(
      'data-attention'
    );

    // No tooltip visible initially
    expect(screen.queryByTestId('app-dock-tooltip')).toBeNull();

    // Zero raw hex/rgb/hsl color literals in rendered DOM
    expect(container.innerHTML).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(container.innerHTML).not.toMatch(/\b(?:rgba?|hsla?)\s*\(/);
  });

  it('scales hovered/focused item (1.28x) and neighbors (1.12x), shows floating tooltip, supports Escape, preserves caller handlers, and respects magnification={false}', () => {
    const onMouseLeave = vi.fn();
    const onBlur = vi.fn();

    const { rerender } = render(
      <div>
        <button type="button" data-testid="outside-btn">
          Outside
        </button>
        <AppDockBar
          onMouseLeave={onMouseLeave}
          onBlur={onBlur}
          data-testid="dock-mag"
        />
      </div>
    );

    const root = screen.getByTestId('dock-mag');
    const item0 = screen.getByTestId('app-dock-item-0');
    const item1 = screen.getByTestId('app-dock-item-1');
    const item2 = screen.getByTestId('app-dock-item-2');
    const item3 = screen.getByTestId('app-dock-item-3');
    const item4 = screen.getByTestId('app-dock-item-4');
    const outsideBtn = screen.getByTestId('outside-btn');

    // Hover item 2 (Prism Studio) -> 1.12, 1.28, 1.12 wave
    fireEvent.mouseEnter(item2);
    expect(item0.style.transform).toBe('scale(1)');
    expect(item1.style.transform).toBe('scale(1.12)');
    expect(item2.style.transform).toBe('scale(1.28)');
    expect(item3.style.transform).toBe('scale(1.12)');
    expect(item4.style.transform).toBe('scale(1)');
    expect(item1).toHaveAttribute('data-scale', '1.12');
    expect(item2).toHaveAttribute('data-scale', '1.28');

    const tooltip = screen.getByRole('tooltip');
    expect(tooltip).toBe(screen.getByTestId('app-dock-tooltip'));
    expect(tooltip).toHaveTextContent('Prism Studio');
    expect(tooltip).toHaveAttribute('data-item-id', 'prism-studio');
    expect(item2).toHaveAttribute('aria-describedby', tooltip.id);

    // Mouse leave clears hover magnification and hides tooltip
    fireEvent.mouseLeave(root);
    expect(onMouseLeave).toHaveBeenCalledTimes(1);
    expect(item2.style.transform).toBe('scale(1)');
    expect(screen.queryByRole('tooltip')).toBeNull();

    // Keyboard focus on item 1 (Code IDE) triggers magnification & tooltip
    fireEvent.focus(item1);
    expect(item0.style.transform).toBe('scale(1.12)');
    expect(item1.style.transform).toBe('scale(1.28)');
    expect(item2.style.transform).toBe('scale(1.12)');
    expect(screen.getByRole('tooltip')).toHaveTextContent('Code IDE');

    // Moving focus between dock buttons keeps spotlight active
    fireEvent.blur(item1, { relatedTarget: item2 });
    expect(onBlur).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('tooltip')).toBeInTheDocument();

    // Pressing Escape dismisses tooltip and resets scale
    fireEvent.keyDown(item1, { key: 'Escape' });
    expect(screen.queryByRole('tooltip')).toBeNull();
    expect(item1.style.transform).toBe('scale(1)');

    // Focus then blur to outside element or null clears spotlight
    fireEvent.focus(item1);
    expect(screen.getByRole('tooltip')).toHaveTextContent('Code IDE');
    fireEvent.blur(item1, { relatedTarget: outsideBtn });
    expect(screen.queryByRole('tooltip')).toBeNull();

    fireEvent.focus(item1);
    expect(screen.getByRole('tooltip')).toHaveTextContent('Code IDE');
    fireEvent.blur(item1, { relatedTarget: null });
    expect(screen.queryByRole('tooltip')).toBeNull();

    // When magnification={false}, tooltip still shows but scale remains 1
    rerender(
      <div>
        <button type="button" data-testid="outside-btn">
          Outside
        </button>
        <AppDockBar magnification={false} data-testid="dock-mag" />
      </div>
    );

    const noMagRoot = screen.getByTestId('dock-mag');
    expect(noMagRoot).not.toHaveAttribute('data-magnification');
    fireEvent.mouseEnter(screen.getByTestId('app-dock-item-2'));
    expect(screen.getByRole('tooltip')).toHaveTextContent('Prism Studio');
    expect(screen.getByTestId('app-dock-item-2').style.transform).toBe('scale(1)');
    expect(screen.getByTestId('app-dock-item-1').style.transform).toBe('scale(1)');

    // If the currently hovered/focused item becomes disabled on rerender, spotlight clears cleanly
    const dynamicItems: ReadonlyArray<AppDockItem> = [
      { id: 'a', label: 'Alpha', disabled: false },
      { id: 'b', label: 'Beta', disabled: false },
    ];
    rerender(<AppDockBar items={dynamicItems} data-testid="dock-mag" />);
    fireEvent.mouseEnter(screen.getByTestId('app-dock-item-0'));
    fireEvent.focus(screen.getByTestId('app-dock-item-0'));
    expect(screen.getByRole('tooltip')).toHaveTextContent('Alpha');

    rerender(
      <AppDockBar
        items={[
          { id: 'a', label: 'Alpha', disabled: true },
          { id: 'b', label: 'Beta', disabled: false },
        ]}
        data-testid="dock-mag"
      />
    );
    expect(screen.queryByRole('tooltip')).toBeNull();
  });

  it('supports bottom, left, and right positions, AppDockPositionMap, and axis-aware wrapping keyboard navigation skipping disabled items', () => {
    const posKeys: ReadonlyArray<keyof AppDockPositionMap> = [
      'bottom',
      'left',
      'right',
    ];
    expect(posKeys).toHaveLength(3);

    const navItems: ReadonlyArray<AppDockItem> = [
      { id: 'one', label: 'One', running: true },
      { id: 'two-disabled', label: 'Two', disabled: true },
      { id: 'three', label: 'Three', running: true },
      { id: 'four', label: 'Four', running: false },
    ];

    const { rerender } = render(
      <AppDockBar
        items={navItems}
        position="bottom"
        defaultActiveId="one"
        data-testid="dock-pos"
      />
    );

    const b0 = screen.getByTestId('app-dock-item-0');
    const b1 = screen.getByTestId('app-dock-item-1');
    const b2 = screen.getByTestId('app-dock-item-2');
    const b3 = screen.getByTestId('app-dock-item-3');

    expect(b0.style.transformOrigin).toBe('center bottom');
    expect(b0).toHaveAttribute('tabindex', '0');
    expect(b1).toBeDisabled();
    expect(b1).not.toHaveAttribute('tabindex');
    expect(b2).toHaveAttribute('tabindex', '-1');

    // Bottom horizontal navigation: ArrowRight skips disabled b1 -> b2
    act(() => {
      b0.focus();
    });
    fireEvent.keyDown(b0, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(b2);

    // End jumps to last enabled (b3)
    fireEvent.keyDown(b2, { key: 'End' });
    expect(document.activeElement).toBe(b3);

    // ArrowRight wraps around from last enabled to first enabled (b0)
    fireEvent.keyDown(b3, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(b0);

    // ArrowLeft wraps around from first enabled to last enabled (b3)
    fireEvent.keyDown(b0, { key: 'ArrowLeft' });
    expect(document.activeElement).toBe(b3);

    // Home jumps to first enabled (b0)
    fireEvent.keyDown(b3, { key: 'Home' });
    expect(document.activeElement).toBe(b0);

    // Unhandled vertical key on bottom dock is ignored
    fireEvent.keyDown(b0, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(b0);

    // Left vertical dock: ArrowUp / ArrowDown navigation & left-full tooltip
    rerender(
      <AppDockBar
        items={navItems}
        position="left"
        defaultActiveId="one"
        data-testid="dock-pos"
      />
    );
    const leftRoot = screen.getByTestId('dock-pos');
    expect(leftRoot).toHaveAttribute('aria-orientation', 'vertical');
    expect(leftRoot).toHaveAttribute('data-position', 'left');
    const l0 = screen.getByTestId('app-dock-item-0');
    const l2 = screen.getByTestId('app-dock-item-2');
    const l3 = screen.getByTestId('app-dock-item-3');
    expect(l0.style.transformOrigin).toBe('left center');

    act(() => {
      l0.focus();
    });
    expect(screen.getByTestId('app-dock-tooltip')).toHaveClass('left-full');
    fireEvent.keyDown(l0, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(l2);
    fireEvent.keyDown(l2, { key: 'ArrowUp' });
    expect(document.activeElement).toBe(l0);
    fireEvent.keyDown(l0, { key: 'ArrowUp' });
    expect(document.activeElement).toBe(l3);

    // Right vertical dock: right-full tooltip and right center transformOrigin
    rerender(
      <AppDockBar
        items={navItems}
        position="right"
        defaultActiveId="one"
        data-testid="dock-pos"
      />
    );
    const rightRoot = screen.getByTestId('dock-pos');
    expect(rightRoot).toHaveAttribute('aria-orientation', 'vertical');
    expect(rightRoot).toHaveAttribute('data-position', 'right');
    const r0 = screen.getByTestId('app-dock-item-0');
    expect(r0.style.transformOrigin).toBe('right center');
    fireEvent.mouseEnter(r0);
    expect(screen.getByTestId('app-dock-tooltip')).toHaveClass('right-full');
  });

  it('handles controlled/uncontrolled activeId and IME-safe click, Enter, and Space launching', () => {
    const onLaunch = vi.fn<(item: AppDockItem) => void>();

    const { rerender } = render(
      <AppDockBar
        defaultActiveId="code-ide"
        onLaunch={onLaunch}
        data-testid="dock-launch"
      />
    );

    const root = screen.getByTestId('dock-launch');
    const finderBtn = screen.getByTestId('app-dock-item-0');
    const ideBtn = screen.getByTestId('app-dock-item-1');
    const settingsBtn = screen.getByTestId('app-dock-item-5');

    // Initial uncontrolled active state from defaultActiveId
    expect(root).toHaveAttribute('data-active-id', 'code-ide');
    expect(ideBtn).toHaveAttribute('data-active', 'true');
    expect(ideBtn).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('app-dock-running-dot-1')).toHaveAttribute(
      'data-active',
      'true'
    );
    expect(screen.queryByTestId('app-dock-running-dot-5')).toBeNull();

    // IME composing Enter/Space/Escape/ArrowRight must NOT fire
    fireEvent.keyDown(settingsBtn, { key: 'Enter', isComposing: true });
    fireEvent.keyDown(settingsBtn, { key: ' ', isComposing: true });
    fireEvent.keyDown(settingsBtn, { key: 'ArrowRight', isComposing: true });
    fireEvent.keyDown(settingsBtn, { key: 'Escape', isComposing: true });
    expect(onLaunch).not.toHaveBeenCalled();

    // Click launches Settings and updates uncontrolled active state + shows active running dot
    fireEvent.click(settingsBtn);
    expect(onLaunch).toHaveBeenCalledTimes(1);
    expect(onLaunch.mock.calls[0]?.[0]?.id).toBe('settings');
    expect(settingsBtn).toHaveAttribute('data-active', 'true');
    expect(settingsBtn).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('app-dock-running-dot-5')).toHaveAttribute(
      'data-active',
      'true'
    );

    // Keyboard Enter launches Finder
    fireEvent.keyDown(finderBtn, { key: 'Enter' });
    expect(onLaunch).toHaveBeenCalledTimes(2);
    expect(onLaunch.mock.calls[1]?.[0]?.id).toBe('finder');
    expect(finderBtn).toHaveAttribute('data-active', 'true');

    // Keyboard Space launches Code IDE
    fireEvent.keyDown(ideBtn, { key: ' ' });
    expect(onLaunch).toHaveBeenCalledTimes(3);
    expect(onLaunch.mock.calls[2]?.[0]?.id).toBe('code-ide');

    // Controlled activeId stays locked to prop until parent updates it
    const controlledLaunch = vi.fn<(item: AppDockItem) => void>();
    rerender(
      <AppDockBar
        activeId="prism-studio"
        onLaunch={controlledLaunch}
        data-testid="dock-launch"
      />
    );
    expect(screen.getByTestId('app-dock-item-2')).toHaveAttribute(
      'data-active',
      'true'
    );
    fireEvent.click(screen.getByTestId('app-dock-item-3'));
    expect(controlledLaunch).toHaveBeenCalledTimes(1);
    expect(controlledLaunch.mock.calls[0]?.[0]?.id).toBe('terminal');
    expect(screen.getByTestId('app-dock-item-2')).toHaveAttribute(
      'data-active',
      'true'
    );
    expect(screen.getByTestId('app-dock-item-3')).not.toHaveAttribute(
      'data-active'
    );

    // Controlled activeId={null} keeps none active and stays safe without onLaunch
    rerender(<AppDockBar activeId={null} data-testid="dock-launch" />);
    expect(screen.getByTestId('dock-launch')).not.toHaveAttribute(
      'data-active-id'
    );
    expect(() => {
      fireEvent.click(screen.getByTestId('app-dock-item-0'));
    }).not.toThrow();
    expect(screen.getByTestId('app-dock-item-0')).not.toHaveAttribute(
      'data-active'
    );
  });

  it('maps all 6 semantic tones, clamps badges at 99+, suppresses invalid badge counts, and blocks disabled items', () => {
    const onLaunch = vi.fn<(item: AppDockItem) => void>();
    const { rerender } = render(
      <AppDockBar
        items={ALL_TONES_ITEMS}
        onLaunch={onLaunch}
        data-testid="dock-tones"
      />
    );

    const expectedToneVars: ReadonlyArray<[AppDockTone, string]> = [
      ['primary', 'var(--prism-primary-main)'],
      ['secondary', 'var(--prism-secondary-main)'],
      ['emerald', 'var(--prism-success-main)'],
      ['amber', 'var(--prism-warning-main)'],
      ['rose', 'var(--prism-error-main)'],
      ['info', 'var(--prism-info-main)'],
    ];

    expectedToneVars.forEach(([tone, cssVar], idx) => {
      const btn = screen.getByTestId(`app-dock-item-${idx}`);
      expect(btn).toHaveAttribute('data-tone', tone);
      expect(btn.style.color).toBe(cssVar);
    });

    // Badge exact 99 and clamped 140 -> 99+
    expect(screen.getByTestId('app-dock-badge-3')).toHaveTextContent('99');
    expect(screen.getByTestId('app-dock-badge-4')).toHaveTextContent('99+');

    // Disabled item (index 5) suppresses attention, click launch, and hover magnification
    const disabledBtn = screen.getByTestId('app-dock-item-5');
    expect(disabledBtn).toBeDisabled();
    expect(disabledBtn).not.toHaveAttribute('data-attention');
    fireEvent.mouseEnter(disabledBtn);
    expect(disabledBtn.style.transform).toBe('scale(1)');
    expect(screen.queryByRole('tooltip')).toBeNull();
    fireEvent.click(disabledBtn);
    expect(onLaunch).not.toHaveBeenCalled();

    // Non-positive, fractional < 1, NaN, and Infinity badge counts are suppressed; all-disabled list is safe
    const invalidBadgeItems: ReadonlyArray<AppDockItem> = [
      { id: 'b0', label: 'Zero', badgeCount: 0, disabled: true },
      { id: 'b1', label: 'Neg', badgeCount: -12, disabled: true },
      { id: 'b2', label: 'Frac', badgeCount: 0.4, disabled: true },
      { id: 'b3', label: 'NaN', badgeCount: Number.NaN, disabled: true },
      { id: 'b4', label: 'Inf', badgeCount: Number.POSITIVE_INFINITY, disabled: true },
      { id: 'b5', label: 'Floor', badgeCount: 12.9, disabled: true },
    ];
    rerender(<AppDockBar items={invalidBadgeItems} />);
    for (let idx = 0; idx < 5; idx += 1) {
      expect(screen.queryByTestId(`app-dock-badge-${idx}`)).toBeNull();
    }
    expect(screen.getByTestId('app-dock-badge-5')).toHaveTextContent('12');
  });

  it('renders an accessible role="status" empty state when items is []', () => {
    render(
      <AppDockBar
        items={[]}
        ariaLabel="Empty workspace dock"
        data-testid="dock-empty-root"
      />
    );

    const root = screen.getByTestId('dock-empty-root');
    expect(root).toHaveAttribute('data-empty', 'true');
    expect(root).toHaveAttribute('data-count', '0');
    expect(root).toHaveAttribute('aria-label', 'Empty workspace dock');

    const empty = screen.getByRole('status');
    expect(empty).toBe(screen.getByTestId('app-dock-empty'));
    expect(empty).toHaveTextContent('No pinned applications in dock.');
    expect(screen.queryAllByRole('button')).toHaveLength(0);
    expect(screen.queryByRole('tooltip')).toBeNull();
  });

  it('defends against adversarial inputs: duplicate/prototype IDs, blank fields, omitted icons/tones, and XSS payloads', () => {
    const adversarialItems: ReadonlyArray<AppDockItem> = [
      { id: '__proto__', label: 'Proto One' },
      { id: '__proto__', label: 'Proto Two' },
      { id: 'constructor', label: '<script>alert("xss")</script>' },
      { id: 'id-only', label: '   ' },
      { id: '   ', label: '   ' },
    ];

    const { container, rerender } = render(
      <AppDockBar
        items={adversarialItems}
        ariaLabel="   "
        data-testid="dock-adv"
      />
    );

    const root = screen.getByTestId('dock-adv');
    expect(root).toHaveAttribute('aria-label', 'Application dock');
    expect(root).toHaveAttribute('data-count', '5');
    expect(screen.getAllByRole('button')).toHaveLength(5);

    // Default tone falls back to primary and fallback icon renders SVG
    const item0 = screen.getByTestId('app-dock-item-0');
    expect(item0).toHaveAttribute('data-tone', 'primary');
    expect(item0.querySelector('svg')).not.toBeNull();

    // XSS payload rendered safely as literal text inside tooltip/aria-label, zero script tags injected
    const item2 = screen.getByTestId('app-dock-item-2');
    fireEvent.mouseEnter(item2);
    expect(screen.getByRole('tooltip')).toHaveTextContent(
      '<script>alert("xss")</script>'
    );
    expect(container.querySelector('script')).toBeNull();

    // Blank label falls back to trimmed id, and blank id + blank label falls back to 'Application'
    expect(screen.getByTestId('app-dock-item-3')).toHaveAttribute(
      'aria-label',
      'id-only'
    );
    expect(screen.getByTestId('app-dock-item-4')).toHaveAttribute(
      'aria-label',
      'Application'
    );

    // Explicit aria-label prop overrides ariaLabel
    rerender(
      <AppDockBar
        items={adversarialItems}
        ariaLabel="Fallback"
        aria-label="Explicit dock label"
        data-testid="dock-adv"
      />
    );
    expect(screen.getByTestId('dock-adv')).toHaveAttribute(
      'aria-label',
      'Explicit dock label'
    );
  });
});
