import '@testing-library/jest-dom/vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { Provider } from 'react-redux';
import { describe, expect, it } from 'vitest';
import { PrismThemeProvider } from '@refractor-ui/core';
import { createDocsStore, setActiveCategory, setFocusedComponent } from '../system/store';
import { ComponentLiveDemo } from './ComponentDemos';
import { DocsShell } from './DocsShell';
import { COMPONENT_REGISTRY, DOC_CATEGORIES } from './registry';
import {
  DEVICE_VIEWPORTS,
  applyViewportToWindow,
  evaluateMediaQuery,
  getViewportById,
  type DeviceViewportSpec,
} from './responsiveViewports';

function hasScrollableAncestor(element: Element, stopAt: Element): boolean {
  let cursor: Element | null = element;
  while (cursor && cursor !== stopAt) {
    const cls = cursor.getAttribute('class') ?? '';
    if (
      cls.includes('overflow-x-auto') ||
      cls.includes('overflow-auto') ||
      cls.includes('overflow-x-scroll')
    ) {
      return true;
    }
    cursor = cursor.parentElement;
  }
  return false;
}

function hasInfiniteCanvasAncestor(element: Element, stopAt: Element): boolean {
  let cursor: Element | null = element;
  while (cursor && cursor !== stopAt) {
    if (cursor.getAttribute('data-testid') === 'node-graph-viewport') {
      return true;
    }
    cursor = cursor.parentElement;
  }
  return false;
}

function assertResponsiveDomInvariants(
  container: HTMLElement,
  componentId: string,
  viewport: DeviceViewportSpec
): void {
  expect(
    container.childElementCount,
    `${componentId} rendered empty on ${viewport.name} (${viewport.width}x${viewport.height})`
  ).toBeGreaterThan(0);

  // 1. Every rendered HTML table must sit inside an overflow-x-auto scroll container for mobile/tablet safety.
  const tables = Array.from(container.querySelectorAll('table'));
  for (const table of tables) {
    expect(
      hasScrollableAncestor(table, container),
      `${componentId} rendered a <table> without an overflow-x-auto ancestor on ${viewport.name}`
    ).toBe(true);
  }

  // 2. Every non-icon SVG graphic must either declare a viewBox, fluid width="100%", or sit inside a scroll/infinite canvas.
  const svgs = Array.from(container.querySelectorAll('svg'));
  for (const svg of svgs) {
    const viewBox = svg.getAttribute('viewBox');
    const widthAttr = svg.getAttribute('width') ?? '';
    if (viewBox || widthAttr === '100%') continue;
    const rawW = Number(widthAttr || '0');
    const isTinyIcon = Number.isFinite(rawW) && rawW > 0 && rawW <= 32;
    if (isTinyIcon) continue;
    const guarded =
      hasScrollableAncestor(svg, container) || hasInfiniteCanvasAncestor(svg, container);
    expect(
      guarded,
      `${componentId} rendered a non-icon <svg> without viewBox, fluid width="100%", or scroll wrapper on ${viewport.name}`
    ).toBe(true);
  }

  // 3. No rendered element may carry unguarded fixed wide width classes without responsive max-w / sm: / min() clamps.
  const allElements = Array.from(container.querySelectorAll('*'));
  const unguardedWideRe = /\b(?:w-72|w-80|w-96|min-w-\[3[2-9]\dpx\]|min-w-\[[4-9]\d\dpx\])\b/;
  const responsiveClampRe = /\b(?:max-w-|sm:min-w-|md:w-|lg:w-|w-\[min\()/;
  for (const el of allElements) {
    const cls = el.getAttribute('class') ?? '';
    if (!cls || !unguardedWideRe.test(cls)) continue;
    if (hasScrollableAncestor(el, container)) continue;
    expect(
      responsiveClampRe.test(cls),
      `${componentId} has unguarded fixed-width class "${cls}" on ${viewport.name}`
    ).toBe(true);
  }
}

function collectCoreComponentTsxFiles(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === '__tests__' || entry.name === 'hooks' || entry.name === 'theme' || entry.name === 'utils') {
        continue;
      }
      collectCoreComponentTsxFiles(fullPath, out);
    } else if (entry.name.endsWith('.tsx') && !entry.name.endsWith('.test.tsx')) {
      out.push(fullPath);
    }
  }
  return out;
}

describe('Multi-Device Responsive Matrix (Mobile, Tablet & Desktop)', () => {
  it('defines all 15 modern iOS, Android (including Google Pixel 10), Tablet, and Desktop viewports', () => {
    expect(DEVICE_VIEWPORTS).toHaveLength(15);

    const pixel10 = getViewportById('pixel-10');
    expect(pixel10.name).toBe('Google Pixel 10');
    expect(pixel10.width).toBe(412);
    expect(pixel10.height).toBe(924);
    expect(pixel10.platform).toBe('android');

    const pixel10ProXl = getViewportById('pixel-10-pro-xl');
    expect(pixel10ProXl.width).toBe(448);

    const galaxyS25 = getViewportById('galaxy-s25');
    expect(galaxyS25.width).toBe(360);

    const iphone17 = getViewportById('iphone-17');
    expect(iphone17.width).toBe(393);

    const iphone17ProMax = getViewportById('iphone-17-pro-max');
    expect(iphone17ProMax.width).toBe(440);

    const ipadPro11 = getViewportById('ipad-pro-11');
    expect(ipadPro11.width).toBe(834);

    const pixelTablet = getViewportById('pixel-tablet');
    expect(pixelTablet.width).toBe(800);

    expect(evaluateMediaQuery('(max-width: 639px)', pixel10)).toBe(true);
    expect(evaluateMediaQuery('(min-width: 640px)', pixel10)).toBe(false);
    expect(evaluateMediaQuery('(orientation: portrait)', pixel10)).toBe(true);
    expect(evaluateMediaQuery('(pointer: coarse)', pixel10)).toBe(true);
    expect(evaluateMediaQuery('(min-width: 1024px)', getViewportById('desktop-standard'))).toBe(true);
    expect(evaluateMediaQuery('(pointer: fine)', getViewportById('desktop-standard'))).toBe(true);
  });

  const MATRIX_VIEWPORTS: ReadonlyArray<DeviceViewportSpec> = [
    getViewportById('galaxy-z-fold7-cover'),
    getViewportById('galaxy-s25'),
    getViewportById('iphone-17'),
    getViewportById('pixel-10'),
    getViewportById('iphone-17-pro-max'),
    getViewportById('pixel-10-pro-xl'),
    getViewportById('ipad-mini'),
    getViewportById('pixel-tablet'),
    getViewportById('ipad-pro-11'),
    getViewportById('ipad-pro-13'),
    getViewportById('desktop-standard'),
  ];

  it.each(MATRIX_VIEWPORTS)(
    'renders ALL 179 components with valid responsive DOM invariants on $name ($width×$height)',
    (viewport) => {
      expect(COMPONENT_REGISTRY.length).toBeGreaterThanOrEqual(179);
      expect(DOC_CATEGORIES.length).toBeGreaterThanOrEqual(32);

      applyViewportToWindow(viewport);
      const testStore = createDocsStore();

      const { container, unmount } = render(
        <Provider store={testStore}>
          <PrismThemeProvider>
            <div data-viewport-test={viewport.id}>
              {COMPONENT_REGISTRY.map((entry) => (
                <div key={entry.id} data-component-slot={entry.id} className="w-full min-w-0">
                  <ComponentLiveDemo componentId={entry.id} />
                </div>
              ))}
            </div>
          </PrismThemeProvider>
        </Provider>
      );

      for (const entry of COMPONENT_REGISTRY) {
        const slot = container.querySelector<HTMLElement>(`[data-component-slot="${entry.id}"]`);
        expect(slot, `Missing slot for ${entry.id} on ${viewport.name}`).not.toBeNull();
        if (slot) {
          assertResponsiveDomInvariants(slot, entry.id, viewport);
        }
      }

      unmount();
    },
    30_000
  );

  it.each(DEVICE_VIEWPORTS)(
    'DocsShell mobile/tablet/desktop documentation workflows work cleanly on $name ($width×$height)',
    (viewport) => {
      applyViewportToWindow(viewport);
      window.location.hash = '#/category/chart-chrome-controls';
      const testStore = createDocsStore();
      testStore.dispatch(setActiveCategory('chart-chrome-controls'));

      const { unmount } = render(
        <Provider store={testStore}>
          <PrismThemeProvider>
            <DocsShell />
          </PrismThemeProvider>
        </Provider>
      );

      // Header brand + compact mobile Search trigger
      const header = screen.getByRole('banner');
      expect(within(header).getByText('Refractor UI')).toBeInTheDocument();
      const searchBtn = within(header).getByRole('button', {
        name: 'Search components with Command Palette',
      });
      expect(searchBtn).toBeInTheDocument();

      // Open mobile drawer, verify backdrop dismissal and Escape dismissal
      const sidebarToggle = screen.getByRole('button', { name: 'Toggle component sidebar' });
      fireEvent.click(sidebarToggle);
      const backdrop = screen.getByTestId('mobile-sidebar-backdrop');
      expect(backdrop).toBeInTheDocument();
      fireEvent.click(backdrop);
      expect(screen.queryByTestId('mobile-sidebar-backdrop')).not.toBeInTheDocument();

      fireEvent.click(sidebarToggle);
      expect(screen.getByTestId('mobile-sidebar-backdrop')).toBeInTheDocument();
      fireEvent.keyDown(window, { key: 'Escape' });
      expect(screen.queryByTestId('mobile-sidebar-backdrop')).not.toBeInTheDocument();

      // Open Architecture & Security guide via sidebar and verify responsive matrix + zero Astryx/MUI mentions
      fireEvent.click(sidebarToggle);
      const archButtons = screen.getAllByRole('button', { name: /Architecture/i });
      fireEvent.click(archButtons[archButtons.length - 1]!);
      expect(screen.queryByTestId('mobile-sidebar-backdrop')).not.toBeInTheDocument();
      expect(
        screen.getByText(/Multi-Device Responsive Verification Matrix/i)
      ).toBeInTheDocument();
      expect(screen.getAllByText(/Google Pixel 10/i).length).toBeGreaterThanOrEqual(1);
      const mainText = document.querySelector('main')?.textContent ?? '';
      expect(mainText.toLowerCase()).not.toContain('astryx');
      expect(/\bmui\b/i.test(mainText)).toBe(false);

      // Verify Getting Started guide displays updated 179-component count cleanly
      fireEvent.click(sidebarToggle);
      const gettingStartedBtns = screen.getAllByRole('button', { name: /Getting Started/i });
      fireEvent.click(gettingStartedBtns[gettingStartedBtns.length - 1]!);
      expect(screen.getByText(/Browse 179 Components/i)).toBeInTheDocument();

      // Open focused single-component view with long title & verify wrapping Breadcrumbs + Prev/Next
      act(() => {
        testStore.dispatch(
          setFocusedComponent({
            componentId: 'international-phone-input',
            category: 'number-currency-fields',
          })
        );
      });
      const breadcrumbNav = screen.getByRole('navigation', { name: 'Breadcrumb' });
      expect(breadcrumbNav.className).toContain('max-w-full');
      expect(breadcrumbNav.querySelector('ol')?.className).toContain('flex-wrap');

      // Open Theme Studio SlideOverSheet and confirm 40x40 tactile Close button
      fireEvent.click(screen.getByRole('button', { name: 'Open Theme Studio customizer' }));
      const closePanelBtn = screen.getByRole('button', { name: 'Close panel' });
      expect(closePanelBtn.className).toContain('w-10');
      expect(closePanelBtn.className).toContain('h-10');
      fireEvent.click(closePanelBtn);
      expect(screen.queryByRole('button', { name: 'Close panel' })).not.toBeInTheDocument();

      // Open Command Palette and verify mobile-friendly placeholder & Escape close
      fireEvent.click(searchBtn);
      expect(
        screen.getByPlaceholderText('Search components or commands...')
      ).toBeInTheDocument();
      fireEvent.keyDown(window, { key: 'Escape' });
      expect(
        screen.queryByPlaceholderText('Search components or commands...')
      ).not.toBeInTheDocument();

      unmount();
    }
  );

  it('enforces static responsive guardrails across all 179 core component source files', () => {
    const testDir = path.dirname(fileURLToPath(import.meta.url));
    const coreSrcDir = path.resolve(testDir, '../../../../packages/core/src');
    const componentFiles = collectCoreComponentTsxFiles(coreSrcDir);
    expect(componentFiles.length).toBeGreaterThanOrEqual(179);

    const violations: string[] = [];

    for (const filePath of componentFiles) {
      const source = fs.readFileSync(filePath, 'utf8');
      const rel = path.relative(coreSrcDir, filePath).replace(/\\/g, '/');

      if (/<table\b/.test(source) && !/overflow-x-auto/.test(source)) {
        violations.push(`${rel}: renders <table> without overflow-x-auto scroll container`);
      }

      const lines = source.split(/\r?\n/);
      lines.forEach((line, idx) => {
        if (
          /\babsolute\b/.test(line) &&
          /\b(?:w-72|w-80|w-96|min-w-\[3[2-9]\dpx\])\b/.test(line) &&
          !/max-w-\[?calc\(100vw|max-w-\[calc\(100%|sm:min-w-|w-\[min\(/.test(line)
        ) {
          violations.push(`${rel}:${idx + 1}: unguarded wide absolute popover "${line.trim()}"`);
        }
      });
    }

    expect(violations).toEqual([]);
  });
});
