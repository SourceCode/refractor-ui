import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import {
  AppLauncherMenu,
  type AppLauncherCategory,
  type AppLauncherCategoryMap,
  type AppLauncherItem,
  type AppLauncherPowerAction,
  type AppLauncherPowerActionMap,
  type AppLauncherRecentDoc,
  type AppLauncherTone,
  type AppLauncherToneMap,
} from './index';

function dispatchComposingKeyDown(target: Element, key: string): void {
  const event = new KeyboardEvent('keydown', {
    key,
    bubbles: true,
    cancelable: true,
  });
  Object.defineProperty(event, 'isComposing', { value: true });
  fireEvent(target, event);
}

describe('AppLauncherMenu', () => {
  it('renders default Pinned view with 4 pinned apps, 4 recent docs, footer user/power controls, ref, theme overrides, and zero raw colors', () => {
    const categoryKeys: ReadonlyArray<keyof AppLauncherCategoryMap> = [
      'pinned',
      'all',
      'design',
      'engineering',
      'utilities',
    ];
    const powerKeys: ReadonlyArray<keyof AppLauncherPowerActionMap> = [
      'lock',
      'sleep',
      'restart',
      'shutdown',
    ];
    const toneKeys: ReadonlyArray<keyof AppLauncherToneMap> = [
      'primary',
      'info',
      'emerald',
      'amber',
      'rose',
    ];
    expect(categoryKeys).toHaveLength(5);
    expect(powerKeys).toHaveLength(4);
    expect(toneKeys).toHaveLength(5);

    const ref = createRef<HTMLDivElement>();
    const { container } = render(
      <PrismThemeProvider
        theme={{
          components: {
            AppLauncherMenu: {
              className: 'theme-launcher-override',
              style: { maxWidth: '720px' },
            },
          },
        }}
      >
        <AppLauncherMenu
          ref={ref}
          className="consumer-launcher-class"
          style={{ letterSpacing: '0.01em' }}
          xstyle={{ '--prism-blur-px': '20px' }}
          aria-label="Workspace start menu"
          data-testid="launcher-root"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('launcher-root');
    expect(ref.current).toBe(root);
    expect(AppLauncherMenu.displayName).toBe('AppLauncherMenu');
    expect(root).toHaveAttribute('role', 'region');
    expect(root).toHaveAttribute('aria-label', 'Workspace start menu');
    expect(root).toHaveAttribute('data-category', 'pinned');
    expect(root).toHaveAttribute('data-app-count', '4');
    expect(root).not.toHaveAttribute('data-disabled');
    expect(root).not.toHaveAttribute('data-empty');
    expect(root).not.toHaveAttribute('data-searching');
    expect(root).toHaveClass(
      'refractor-app-launcher-menu',
      'prism-slab',
      'min-w-0',
      'max-w-full',
      'theme-launcher-override',
      'consumer-launcher-class'
    );
    expect(root).toHaveStyle({ maxWidth: '720px' });
    expect(root.style.letterSpacing).toBe('0.01em');
    expect(root.style.getPropertyValue('--prism-blur-px')).toBe('20px');

    // Search input
    const searchInput = screen.getByRole('searchbox', {
      name: 'Search applications and recent files',
    });
    expect(searchInput).toBeInTheDocument();
    expect(searchInput).toHaveAttribute('type', 'search');

    // Category pills
    expect(screen.getByRole('button', { name: 'Pinned' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(screen.getByRole('button', { name: 'All Apps' })).toHaveAttribute(
      'aria-pressed',
      'false'
    );
    expect(screen.getByRole('button', { name: 'Design' })).toHaveAttribute(
      'aria-pressed',
      'false'
    );
    expect(screen.getByRole('button', { name: 'Engineering' })).toHaveAttribute(
      'aria-pressed',
      'false'
    );
    expect(screen.getByRole('button', { name: 'Utilities' })).toHaveAttribute(
      'aria-pressed',
      'false'
    );

    // Responsive installed apps grid showing 4 pinned apps across design, engineering, utilities
    const grid = screen.getByTestId('app-launcher-grid');
    expect(grid).toHaveClass('grid-cols-2', 'sm:grid-cols-4', 'gap-2.5');
    const tiles = within(grid).getAllByRole('listitem');
    expect(tiles).toHaveLength(4);
    expect(screen.getByTestId('app-launcher-visible-count')).toHaveTextContent(
      '4 apps'
    );
    expect(
      screen.getByRole('button', { name: 'Launch Prism Studio' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Launch Vector Forge' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Launch Refractor IDE' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Launch System Monitor' })
    ).toBeInTheDocument();
    expect(screen.queryByTestId('app-launcher-tile-shader-lab')).toBeNull();

    // Optional badges present on Prism Studio (Pro) and Refractor IDE (v2)
    expect(
      within(screen.getByTestId('app-launcher-tile-prism-studio')).getByText(
        'Pro'
      )
    ).toBeInTheDocument();
    expect(
      within(screen.getByTestId('app-launcher-tile-refractor-ide')).getByText(
        'v2'
      )
    ).toBeInTheDocument();

    // 4 default recent documents
    const recentList = screen.getByTestId('app-launcher-recent-list');
    expect(within(recentList).getAllByRole('listitem')).toHaveLength(4);
    expect(screen.getByTestId('app-launcher-recent-count')).toHaveTextContent(
      '4 files'
    );
    expect(screen.getByText('Optical-Tokens-v2.prism')).toBeInTheDocument();
    expect(screen.getByText('createPrismTheme.ts')).toBeInTheDocument();
    expect(screen.getByText('Refraction-Glyph-Set.svg')).toBeInTheDocument();
    expect(screen.getByText('Frame-Budget-Audit.log')).toBeInTheDocument();

    // User profile & power controls
    expect(screen.getByTestId('app-launcher-avatar')).toHaveTextContent('CV');
    expect(screen.getByTestId('app-launcher-user-name')).toHaveTextContent(
      'Clara Vance'
    );
    expect(screen.getByTestId('app-launcher-user-role')).toHaveTextContent(
      'Principal Designer'
    );
    expect(screen.getByRole('button', { name: 'Lock' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Sleep' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Restart' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Shut Down' })).toBeEnabled();

    // Polite status banner
    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-live', 'polite');
    expect(status).toHaveTextContent('Showing 4 applications in Pinned.');

    // Zero raw hex/rgb/hsl color literals in rendered DOM
    expect(container.innerHTML).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(container.innerHTML).not.toMatch(/\b(?:rgba?|hsla?)\s*\(/);
  });

  it('switches across all 5 categories and updates aria-pressed, visible apps, and status banner', () => {
    render(<AppLauncherMenu data-testid="launcher-cats" />);

    const root = screen.getByTestId('launcher-cats');
    const checks: ReadonlyArray<{
      category: AppLauncherCategory;
      label: string;
      expectedCount: number;
      expectedAppId: string;
    }> = [
      {
        category: 'all',
        label: 'All Apps',
        expectedCount: 8,
        expectedAppId: 'shader-lab',
      },
      {
        category: 'design',
        label: 'Design',
        expectedCount: 3,
        expectedAppId: 'color-optics',
      },
      {
        category: 'engineering',
        label: 'Engineering',
        expectedCount: 3,
        expectedAppId: 'terminal-mux',
      },
      {
        category: 'utilities',
        label: 'Utilities',
        expectedCount: 2,
        expectedAppId: 'vault-archive',
      },
      {
        category: 'pinned',
        label: 'Pinned',
        expectedCount: 4,
        expectedAppId: 'prism-studio',
      },
    ];

    for (const check of checks) {
      const btn = screen.getByRole('button', { name: check.label });
      fireEvent.click(btn);
      expect(btn).toHaveAttribute('aria-pressed', 'true');
      expect(root).toHaveAttribute('data-category', check.category);
      expect(
        within(screen.getByTestId('app-launcher-grid')).getAllByRole('listitem')
      ).toHaveLength(check.expectedCount);
      expect(
        screen.getByTestId(`app-launcher-tile-${check.expectedAppId}`)
      ).toBeInTheDocument();
      expect(screen.getByTestId('app-launcher-status')).toHaveTextContent(
        `Showing ${check.label} (${check.expectedCount} apps).`
      );
    }
  });

  it('toggles Pin/Unpin live in uncontrolled mode, updates the Pinned grid, and supports empty Pinned recovery', () => {
    const onTogglePin = vi.fn();
    render(<AppLauncherMenu onTogglePin={onTogglePin} />);

    // Unpin Vector Forge while in Pinned view -> removed live from Pinned grid
    const unpinVector = screen.getByRole('button', {
      name: 'Unpin Vector Forge',
    });
    expect(unpinVector).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(unpinVector);

    expect(onTogglePin).toHaveBeenCalledWith('vector-forge', false);
    expect(screen.queryByTestId('app-launcher-tile-vector-forge')).toBeNull();
    expect(screen.getByTestId('app-launcher-status')).toHaveTextContent(
      'Unpinned Vector Forge.'
    );

    // Switch to All Apps and pin Shader Lab
    fireEvent.click(screen.getByRole('button', { name: 'All Apps' }));
    const pinShader = screen.getByRole('button', { name: 'Pin Shader Lab' });
    expect(pinShader).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(pinShader);

    expect(onTogglePin).toHaveBeenCalledWith('shader-lab', true);
    expect(
      screen.getByRole('button', { name: 'Unpin Shader Lab' })
    ).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('app-launcher-status')).toHaveTextContent(
      'Pinned Shader Lab.'
    );

    // Return to Pinned view -> Shader Lab appears live
    fireEvent.click(screen.getByRole('button', { name: 'Pinned' }));
    expect(
      screen.getByTestId('app-launcher-tile-shader-lab')
    ).toBeInTheDocument();

    // Unpin all remaining 4 pinned apps -> empty state with Browse All Apps recovery
    for (const name of [
      'Prism Studio',
      'Refractor IDE',
      'Shader Lab',
      'System Monitor',
    ]) {
      fireEvent.click(screen.getByRole('button', { name: `Unpin ${name}` }));
    }

    const emptyStatus = screen.getByRole('status');
    expect(emptyStatus).toBe(screen.getByTestId('app-launcher-empty'));
    expect(emptyStatus).toHaveTextContent('No matching applications');
    expect(emptyStatus).toHaveTextContent(
      'No pinned applications yet. Switch to All Apps to pin your favorites.'
    );

    fireEvent.click(screen.getByRole('button', { name: 'Browse All Apps' }));
    expect(screen.getByRole('button', { name: 'All Apps' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(
      within(screen.getByTestId('app-launcher-grid')).getAllByRole('listitem')
    ).toHaveLength(8);
  });

  it('launches apps via click, Enter, and Space while guarding IME composition and ignoring non-activation keys', () => {
    const onLaunchApp = vi.fn();
    render(<AppLauncherMenu onLaunchApp={onLaunchApp} />);

    const launchPrism = screen.getByRole('button', {
      name: 'Launch Prism Studio',
    });
    fireEvent.click(launchPrism);
    expect(onLaunchApp).toHaveBeenCalledTimes(1);
    expect(onLaunchApp).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: 'prism-studio', name: 'Prism Studio' })
    );
    expect(screen.getByTestId('app-launcher-status')).toHaveTextContent(
      'Launched Prism Studio.'
    );

    const launchIde = screen.getByRole('button', {
      name: 'Launch Refractor IDE',
    });
    fireEvent.keyDown(launchIde, { key: 'Enter' });
    expect(onLaunchApp).toHaveBeenCalledTimes(2);
    expect(onLaunchApp).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: 'refractor-ide', name: 'Refractor IDE' })
    );

    fireEvent.keyDown(launchIde, { key: ' ' });
    expect(onLaunchApp).toHaveBeenCalledTimes(3);

    // Unrelated key and IME composing Enter must not launch
    fireEvent.keyDown(launchIde, { key: 'ArrowRight' });
    dispatchComposingKeyDown(launchIde, 'Enter');
    expect(onLaunchApp).toHaveBeenCalledTimes(3);
  });

  it('opens recent documents via click and keyboard, ignores IME composing keys, and renders empty recent docs fallback', () => {
    const onOpenRecent = vi.fn();
    const { rerender } = render(
      <AppLauncherMenu onOpenRecent={onOpenRecent} />
    );

    const firstRecent = screen.getByTestId('app-launcher-recent-doc-tokens');
    fireEvent.click(firstRecent);
    expect(onOpenRecent).toHaveBeenCalledTimes(1);
    expect(onOpenRecent).toHaveBeenLastCalledWith(
      expect.objectContaining({
        id: 'doc-tokens',
        title: 'Optical-Tokens-v2.prism',
      })
    );
    expect(screen.getByTestId('app-launcher-status')).toHaveTextContent(
      'Opened Optical-Tokens-v2.prism in Prism Studio.'
    );

    const secondRecent = screen.getByTestId('app-launcher-recent-doc-theme');
    fireEvent.keyDown(secondRecent, { key: 'Enter' });
    expect(onOpenRecent).toHaveBeenCalledTimes(2);

    fireEvent.keyDown(secondRecent, { key: ' ' });
    expect(onOpenRecent).toHaveBeenCalledTimes(3);

    fireEvent.keyDown(secondRecent, { key: 'Tab' });
    dispatchComposingKeyDown(secondRecent, 'Enter');
    expect(onOpenRecent).toHaveBeenCalledTimes(3);

    rerender(<AppLauncherMenu recentDocs={[]} onOpenRecent={onOpenRecent} />);
    expect(screen.getByTestId('app-launcher-recent-empty')).toHaveTextContent(
      'No recent documents available.'
    );
  });

  it('invokes onPowerAction for all 4 footer power controls and announces each action politely', () => {
    const onPowerAction = vi.fn();
    render(<AppLauncherMenu onPowerAction={onPowerAction} />);

    const controls: ReadonlyArray<{
      label: string;
      action: AppLauncherPowerAction;
    }> = [
      { label: 'Lock', action: 'lock' },
      { label: 'Sleep', action: 'sleep' },
      { label: 'Restart', action: 'restart' },
      { label: 'Shut Down', action: 'shutdown' },
    ];

    controls.forEach(({ label, action }, idx) => {
      fireEvent.click(screen.getByRole('button', { name: label }));
      expect(onPowerAction).toHaveBeenNthCalledWith(idx + 1, action);
      expect(screen.getByTestId('app-launcher-status')).toHaveTextContent(
        `Power action: ${label}.`
      );
    });
  });

  it('filters apps and recent docs with linear substring search, supports IME-safe Escape clear, clear button, and empty states', () => {
    render(<AppLauncherMenu data-testid="launcher-search" />);

    const root = screen.getByTestId('launcher-search');
    const searchInput = screen.getByRole('searchbox', {
      name: 'Search applications and recent files',
    });

    // Escape on empty search is a safe no-op
    fireEvent.keyDown(searchInput, { key: 'Escape' });
    expect(searchInput).toHaveValue('');

    // Search matching 1 pinned app (Vector Forge) and 1 recent file (Refraction-Glyph-Set.svg)
    fireEvent.change(searchInput, { target: { value: 'Vector' } });
    expect(root).toHaveAttribute('data-searching', 'true');
    expect(screen.getByTestId('app-launcher-visible-count')).toHaveTextContent(
      '1 app'
    );
    expect(screen.getByTestId('app-launcher-recent-count')).toHaveTextContent(
      '1 file'
    );
    expect(screen.getByTestId('app-launcher-status')).toHaveTextContent(
      'Showing 1 application in Pinned.'
    );

    // Switching category while searching hits singular "(1 app)" branch in category handler
    fireEvent.click(screen.getByRole('button', { name: 'Design' }));
    expect(screen.getByTestId('app-launcher-status')).toHaveTextContent(
      'Showing Design (1 app).'
    );

    // IME composing Escape must NOT clear search query
    dispatchComposingKeyDown(searchInput, 'Escape');
    expect(searchInput).toHaveValue('Vector');

    // Non-composing non-Escape key does not clear query
    fireEvent.keyDown(searchInput, { key: 'Enter' });
    expect(searchInput).toHaveValue('Vector');

    // Non-composing Escape clears search query
    fireEvent.keyDown(searchInput, { key: 'Escape' });
    expect(searchInput).toHaveValue('');
    expect(screen.getByTestId('app-launcher-status')).toHaveTextContent(
      'Cleared search query.'
    );

    // Clear search button clears non-empty query
    fireEvent.change(searchInput, { target: { value: 'pro' } });
    fireEvent.click(screen.getByRole('button', { name: 'Clear search' }));
    expect(searchInput).toHaveValue('');

    // Non-matching search shows role="status" empty state + recent empty message + Reset search button
    fireEvent.change(searchInput, { target: { value: 'nonexistent-app-xyz' } });
    const emptyState = screen.getByRole('status');
    expect(emptyState).toBe(screen.getByTestId('app-launcher-empty'));
    expect(emptyState).toHaveTextContent(
      'No applications match "nonexistent-app-xyz" in Design.'
    );
    expect(screen.getByTestId('app-launcher-recent-empty')).toHaveTextContent(
      'No recent documents match "nonexistent-app-xyz".'
    );

    fireEvent.click(screen.getByRole('button', { name: 'Reset search' }));
    expect(searchInput).toHaveValue('');
    expect(screen.getByTestId('app-launcher-grid')).toBeInTheDocument();
  });

  it('handles adversarial ReDoS search payloads safely in linear time without throwing or hanging', () => {
    render(<AppLauncherMenu />);
    const searchInput = screen.getByRole('searchbox', {
      name: 'Search applications and recent files',
    });

    const payloads = [
      '(a+)+$',
      '([a-zA-Z]+)*$',
      `${'a'.repeat(5000)}!`,
    ];

    const start = performance.now();
    for (const payload of payloads) {
      fireEvent.change(searchInput, { target: { value: payload } });
      expect(screen.getByRole('status')).toBe(
        screen.getByTestId('app-launcher-empty')
      );
    }
    const elapsedMs = performance.now() - start;
    expect(elapsedMs).toBeLessThan(2000);
  });

  it('supports controlled apps mode, category fallback icons, default tone, and empty non-pinned category state', () => {
    const onTogglePin = vi.fn();
    const initialApps: ReadonlyArray<AppLauncherItem> = [
      {
        id: 'custom-design',
        name: 'Canvas Studio',
        category: 'design',
        pinned: true,
      },
      {
        id: 'custom-eng',
        name: 'Build Runner',
        category: 'engineering',
        pinned: false,
      },
      {
        id: 'custom-util',
        name: 'Disk Utility',
        category: 'utilities',
        pinned: true,
        tone: 'emerald',
      },
    ];

    const { rerender } = render(
      <AppLauncherMenu apps={initialApps} onTogglePin={onTogglePin} />
    );

    // Default tone fallback ('primary') on custom-design
    expect(screen.getByTestId('app-launcher-tile-custom-design')).toHaveAttribute(
      'data-tone',
      'primary'
    );

    // Unpinning in controlled mode calls callback without mutating controlled view until parent updates
    fireEvent.click(screen.getByRole('button', { name: 'Unpin Canvas Studio' }));
    expect(onTogglePin).toHaveBeenCalledWith('custom-design', false);
    expect(
      screen.getByTestId('app-launcher-tile-custom-design')
    ).toBeInTheDocument();

    // Parent updates controlled apps -> UI reflects updated pinned state
    const updatedApps: ReadonlyArray<AppLauncherItem> = initialApps.map((app) =>
      app.id === 'custom-design' ? { ...app, pinned: false } : app
    );
    rerender(<AppLauncherMenu apps={updatedApps} onTogglePin={onTogglePin} />);
    expect(screen.queryByTestId('app-launcher-tile-custom-design')).toBeNull();

    // Switch to All Apps to verify all 3 category fallback icons render cleanly
    fireEvent.click(screen.getByRole('button', { name: 'All Apps' }));
    expect(
      within(screen.getByTestId('app-launcher-grid')).getAllByRole('listitem')
    ).toHaveLength(3);

    // Empty controlled apps list shows non-pinned category empty message without Browse All Apps button
    rerender(<AppLauncherMenu apps={[]} onTogglePin={onTogglePin} />);
    const emptyState = screen.getByRole('status');
    expect(emptyState).toHaveTextContent(
      'No installed applications in All Apps.'
    );
    expect(
      screen.queryByRole('button', { name: 'Browse All Apps' })
    ).toBeNull();
  });

  it('disables all interactive controls and blocks callbacks when disabled={true}', () => {
    const onLaunchApp = vi.fn();
    const onTogglePin = vi.fn();
    const onOpenRecent = vi.fn();
    const onPowerAction = vi.fn();

    const { rerender } = render(
      <AppLauncherMenu
        onLaunchApp={onLaunchApp}
        onTogglePin={onTogglePin}
        onOpenRecent={onOpenRecent}
        onPowerAction={onPowerAction}
        data-testid="launcher-disabled"
      />
    );

    // Populate search query first so Clear search button is also rendered while disabled
    const searchInput = screen.getByRole('searchbox', {
      name: 'Search applications and recent files',
    });
    fireEvent.change(searchInput, { target: { value: 'Prism' } });

    rerender(
      <AppLauncherMenu
        disabled
        onLaunchApp={onLaunchApp}
        onTogglePin={onTogglePin}
        onOpenRecent={onOpenRecent}
        onPowerAction={onPowerAction}
        data-testid="launcher-disabled"
      />
    );

    const root = screen.getByTestId('launcher-disabled');
    expect(root).toHaveAttribute('data-disabled', 'true');
    expect(root).toHaveAttribute('aria-disabled', 'true');

    expect(searchInput).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Clear search' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'All Apps' })).toBeDisabled();
    expect(
      screen.getByRole('button', { name: 'Launch Prism Studio' })
    ).toBeDisabled();
    expect(
      screen.getByRole('button', { name: 'Unpin Prism Studio' })
    ).toBeDisabled();
    expect(screen.getByTestId('app-launcher-recent-doc-tokens')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Shut Down' })).toBeDisabled();

    fireEvent.keyDown(searchInput, { key: 'Escape' });
    fireEvent.click(screen.getByRole('button', { name: 'Clear search' }));
    fireEvent.click(screen.getByRole('button', { name: 'All Apps' }));
    fireEvent.click(screen.getByRole('button', { name: 'Launch Prism Studio' }));
    fireEvent.keyDown(
      screen.getByRole('button', { name: 'Launch Prism Studio' }),
      { key: 'Enter' }
    );
    fireEvent.click(screen.getByRole('button', { name: 'Unpin Prism Studio' }));
    fireEvent.click(screen.getByTestId('app-launcher-recent-doc-tokens'));
    fireEvent.keyDown(screen.getByTestId('app-launcher-recent-doc-tokens'), {
      key: 'Enter',
    });
    fireEvent.click(screen.getByRole('button', { name: 'Shut Down' }));

    expect(searchInput).toHaveValue('Prism');
    expect(onLaunchApp).not.toHaveBeenCalled();
    expect(onTogglePin).not.toHaveBeenCalled();
    expect(onOpenRecent).not.toHaveBeenCalled();
    expect(onPowerAction).not.toHaveBeenCalled();

    // Also render disabled empty states (searching empty + pinned empty) to verify disabled recovery buttons
    rerender(
      <AppLauncherMenu
        disabled
        apps={[]}
        data-testid="launcher-disabled"
      />
    );
    expect(screen.getByRole('button', { name: 'Reset search' })).toBeDisabled();

    rerender(
      <AppLauncherMenu
        disabled
        apps={[
          {
            id: 'unpinned-only',
            name: 'Unpinned Only',
            category: 'utilities',
            pinned: false,
          },
        ]}
        data-testid="launcher-disabled"
      />
    );
    expect(screen.getByRole('button', { name: 'Reset search' })).toBeDisabled();
  });

  it('safely renders adversarial XSS literal strings, deduplicates duplicate IDs, handles single-word/blank metadata, and supports disabled Browse All Apps', () => {
    const xssPayload = '<img src=x onerror=alert(1)>';
    const scriptPayload = '<script>alert("xss")</script>';
    const tones: ReadonlyArray<AppLauncherTone> = [
      'primary',
      'info',
      'emerald',
      'amber',
      'rose',
    ];
    expect(tones).toHaveLength(5);

    const adversarialApps: ReadonlyArray<AppLauncherItem> = [
      {
        id: 'xss-app',
        name: xssPayload,
        category: 'design',
        pinned: true,
        badge: scriptPayload,
        tone: 'rose',
      },
      {
        id: 'xss-app',
        name: 'Duplicate Should Be Ignored',
        category: 'design',
        pinned: true,
      },
      {
        id: 'blank-app',
        name: '   ',
        category: 'utilities',
        pinned: true,
        badge: '   ',
      },
    ];

    const adversarialDocs: ReadonlyArray<AppLauncherRecentDoc> = [
      {
        id: 'xss-doc',
        title: scriptPayload,
        appName: xssPayload,
        openedAt: 'just now',
      },
      {
        id: 'xss-doc',
        title: 'Duplicate Doc',
        appName: 'Ignored',
        openedAt: '1m ago',
      },
      {
        id: 'blank-doc',
        title: '   ',
        appName: '   ',
        openedAt: '   ',
      },
    ];

    const { container, rerender } = render(
      <AppLauncherMenu
        userName="Nova"
        userRole={scriptPayload}
        defaultApps={adversarialApps}
        recentDocs={adversarialDocs}
      />
    );

    // Single-word userName initials
    expect(screen.getByTestId('app-launcher-avatar')).toHaveTextContent('NO');

    // XSS rendered strictly as inert text, never executed as DOM elements
    expect(container.querySelector('script')).toBeNull();
    expect(container.querySelector('img')).toBeNull();
    expect(screen.getByTestId('app-launcher-user-role')).toHaveTextContent(
      scriptPayload
    );
    expect(
      within(screen.getByTestId('app-launcher-tile-xss-app')).getByText(
        xssPayload
      )
    ).toBeInTheDocument();
    expect(
      within(screen.getByTestId('app-launcher-tile-xss-app')).getByText(
        scriptPayload
      )
    ).toBeInTheDocument();
    expect(screen.queryByText('Duplicate Should Be Ignored')).toBeNull();

    // Blank fallbacks for app and recent doc
    expect(
      screen.getByRole('button', { name: 'Launch Application' })
    ).toBeInTheDocument();
    const blankDocBtn = screen.getByTestId('app-launcher-recent-blank-doc');
    expect(blankDocBtn).toHaveTextContent('Untitled document');
    expect(blankDocBtn).toHaveTextContent('Application');
    expect(blankDocBtn).toHaveTextContent('Recently');
    expect(screen.queryByText('Duplicate Doc')).toBeNull();

    // Clicking blank recent doc triggers fallback status message cleanly
    fireEvent.click(blankDocBtn);
    expect(screen.getByTestId('app-launcher-status')).toHaveTextContent(
      'Opened Untitled document in Application.'
    );

    // Blank userName/userRole fall back to defaults, and disabled Browse All Apps renders cleanly
    rerender(
      <AppLauncherMenu
        userName="   "
        userRole="   "
        disabled
        apps={[
          {
            id: 'only-unpinned',
            name: 'Utility Tool',
            category: 'utilities',
            pinned: false,
          },
        ]}
      />
    );
    expect(screen.getByTestId('app-launcher-user-name')).toHaveTextContent(
      'Clara Vance'
    );
    expect(screen.getByTestId('app-launcher-user-role')).toHaveTextContent(
      'Principal Designer'
    );
    expect(
      screen.getByRole('button', { name: 'Browse All Apps' })
    ).toBeDisabled();
  });
});
