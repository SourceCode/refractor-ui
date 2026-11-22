import { afterEach, describe, expect, it } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { Provider } from 'react-redux';
import {
  BadgeStatus,
  getLoadedThemeFontKeys,
  PrimaryButton,
  PrismCard,
  PrismTabs,
  PrismThemeProvider,
  SecondaryButton,
  TextInput,
  ToggleSwitch,
} from '@refractor-ui/core';
import { ALL_THEME_ENTRIES, getThemeById } from '@refractor-ui/themes';
import { createDocsStore, setActiveSection, setCustomizerOpen } from '../system/store';
import { DocsShell } from './DocsShell';
import { getViewportById, type DeviceViewportSpec } from './responsiveViewports';

const MULTI_DEVICE_VIEWPORTS: ReadonlyArray<DeviceViewportSpec> = [
  getViewportById('galaxy-s25'),
  getViewportById('iphone-17'),
  getViewportById('pixel-10'),
  getViewportById('ipad-pro-11'),
  getViewportById('desktop-standard'),
];

function applyViewport(viewport: DeviceViewportSpec): void {
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    writable: true,
    value: viewport.width,
  });
  Object.defineProperty(window, 'innerHeight', {
    configurable: true,
    writable: true,
    value: viewport.height,
  });
  window.dispatchEvent(new Event('resize'));
}

afterEach(() => {
  document.head
    .querySelectorAll('link[data-refractor-font-key], link[data-refractor-font-preconnect]')
    .forEach((n) => n.remove());
  document.documentElement.removeAttribute('style');
  document.documentElement.classList.remove('dark');
  window.location.hash = '';
});

describe('68-Theme Multi-Material Web, Tablet & Mobile Validation Matrix', () => {
  it.each(MULTI_DEVICE_VIEWPORTS)(
    'renders ALL 68 themes cleanly with accurate material, FX, and font tokens on $name ($width×$height)',
    (viewport) => {
      applyViewport(viewport);

      const { container, unmount } = render(
        <div data-matrix-viewport={viewport.id} className="w-full min-w-0">
          {ALL_THEME_ENTRIES.map((entry) => (
            <PrismThemeProvider
              key={entry.id}
              theme={entry.theme}
              mode={entry.mode}
              scope="local"
              loadFonts={false}
              className="w-full min-w-0"
            >
              <PrismCard title={entry.name} kicker={entry.material}>
                <div className="flex flex-wrap items-center gap-2">
                  <PrimaryButton size="sm">Confirm</PrimaryButton>
                  <SecondaryButton size="sm">Cancel</SecondaryButton>
                  <BadgeStatus tone="online" label={entry.mode} />
                  <ToggleSwitch checked={true} onChange={() => undefined} label="FX" />
                </div>
                <TextInput aria-label={`${entry.id} input`} defaultValue={entry.id} />
                <PrismTabs
                  activeTabId="tab-a"
                  onChange={() => undefined}
                  tabs={[
                    { id: 'tab-a', label: 'Preview' },
                    { id: 'tab-b', label: 'Tokens' },
                  ]}
                />
              </PrismCard>
            </PrismThemeProvider>
          ))}
        </div>
      );

      for (const entry of ALL_THEME_ENTRIES) {
        const root = container.querySelector<HTMLElement>(
          `[data-refractor-theme="${entry.id}"]`
        );
        expect(root, `Missing scoped root for theme "${entry.id}" on ${viewport.name}`).not.toBeNull();
        expect(root?.getAttribute('data-refractor-material')).toBe(entry.material);
        expect(root?.getAttribute('data-refractor-fx')).toBe(entry.wallpaperOverlay);
        expect(root?.getAttribute('data-color-mode')).toBe(entry.mode);
        expect(root?.style.getPropertyValue('--prism-wallpaper')).toBeTruthy();
        expect(root?.style.getPropertyValue('--prism-font-sans')).toBeTruthy();
        expect(root?.style.getPropertyValue('--prism-primary-main')).toBeTruthy();
      }

      unmount();
    },
    30_000
  );

  it.each(MULTI_DEVICE_VIEWPORTS)(
    'supports live 68-theme Gallery & Theme Studio switching + on-demand font loading on $name ($width×$height)',
    (viewport) => {
      applyViewport(viewport);
      window.location.hash = '#/theming';
      const testStore = createDocsStore();
      testStore.dispatch(setActiveSection('theming'));

      const { rerender, unmount } = render(
        <Provider store={testStore}>
          <PrismThemeProvider theme={getThemeById('alabaster')} mode="light">
            <DocsShell />
          </PrismThemeProvider>
        </Provider>
      );

      const grid = screen.getByTestId('theme-gallery-grid');
      expect(within(grid).getAllByRole('button')).toHaveLength(68);
      expect(within(grid).queryByRole('button', { name: /New Western Gold/i })).toBeNull();

      // Filter by search query for Windows 95 and activate
      const searchInput = screen.getByRole('searchbox', { name: 'Search 68 themes' });
      fireEvent.change(searchInput, { target: { value: 'Windows 95' } });
      const win95Card = within(grid).getByRole('button', { name: /Windows 95/i });
      fireEvent.click(win95Card);
      expect(testStore.getState().system.themePreset).toBe('windows95');
      expect(testStore.getState().system.themeMode).toBe('light');

      // Re-render root provider with active theme from store & verify DOM transformation
      rerender(
        <Provider store={testStore}>
          <PrismThemeProvider
            theme={getThemeById(testStore.getState().system.themePreset)}
            mode={testStore.getState().system.themeMode}
          >
            <DocsShell />
          </PrismThemeProvider>
        </Provider>
      );
      expect(document.documentElement.getAttribute('data-refractor-theme')).toBe('windows95');
      expect(document.documentElement.getAttribute('data-refractor-material')).toBe('bevel');
      expect(document.documentElement.getAttribute('data-refractor-sharp')).toBe('true');

      // Switch to Synthwave via Theme Studio drawer & verify lazy Orbitron font injection + cyber-grid FX
      act(() => {
        testStore.dispatch(setCustomizerOpen(true));
      });
      const drawerSearch = screen.getByRole('searchbox', { name: 'Filter 68 themes' });
      fireEvent.change(drawerSearch, { target: { value: 'Synthwave' } });
      fireEvent.click(screen.getAllByRole('button', { name: /Synthwave/i })[0]!);
      expect(testStore.getState().system.themePreset).toBe('synthwave');
      expect(testStore.getState().system.themeMode).toBe('dark');

      rerender(
        <Provider store={testStore}>
          <PrismThemeProvider
            theme={getThemeById(testStore.getState().system.themePreset)}
            mode={testStore.getState().system.themeMode}
          >
            <DocsShell />
          </PrismThemeProvider>
        </Provider>
      );
      expect(document.documentElement.getAttribute('data-refractor-theme')).toBe('synthwave');
      expect(document.documentElement.getAttribute('data-refractor-material')).toBe('neon');
      expect(document.documentElement.getAttribute('data-refractor-fx')).toBe('cyber-grid');
      expect(getLoadedThemeFontKeys().some((k) => k.includes('Orbitron'))).toBe(true);

      act(() => {
        testStore.dispatch(setCustomizerOpen(false));
      });

      // Reset to Alabaster Light restores optical glass cleanly
      fireEvent.click(screen.getByRole('button', { name: /Reset to Alabaster/i }));
      expect(testStore.getState().system.themePreset).toBe('alabaster');

      unmount();
    },
    30_000
  );
});
