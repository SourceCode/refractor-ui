import '@testing-library/jest-dom/vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { Provider } from 'react-redux';
import { describe, expect, it } from 'vitest';
import { PrismThemeProvider } from '@refractor-ui/core';
import { createDocsStore } from '../../system/store';
import { DocsShell } from '../DocsShell';
import { COMPONENT_REGISTRY } from '../registry';
import {
  applyViewportToWindow,
  getViewportById,
  type DeviceViewportSpec,
} from '../responsiveViewports';
import { EXAMPLE_DOMAINS, EXAMPLE_SCREENS } from './registry';

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

describe('Refractor UI Example Demo Screens (30 Screens · Web, Tablet & Mobile)', () => {
  it('registers 30 unique example screens across 6 domains covering web, tablet, and mobile with >= 9.5 UX scores and complete zero-any TSX code', () => {
    expect(EXAMPLE_SCREENS).toHaveLength(30);
    expect(EXAMPLE_DOMAINS).toHaveLength(6);

    const uniqueIds = new Set(EXAMPLE_SCREENS.map((s) => s.id));
    expect(uniqueIds.size).toBe(30);

    const validExports = new Set(COMPONENT_REGISTRY.map((c) => c.exportName));
    const webCount = EXAMPLE_SCREENS.filter((s) => s.devices.includes('web')).length;
    const tabletCount = EXAMPLE_SCREENS.filter((s) => s.devices.includes('tablet')).length;
    const mobileCount = EXAMPLE_SCREENS.filter((s) => s.devices.includes('mobile')).length;
    expect(webCount).toBeGreaterThanOrEqual(20);
    expect(tabletCount).toBeGreaterThanOrEqual(15);
    expect(mobileCount).toBeGreaterThanOrEqual(8);

    const forbiddenTypeRe = new RegExp(
      `(?::\\s*|\\bas\\s+|<)(?:${['an' + 'y', 'unkn' + 'own'].join('|')})\\b`
    );

    for (const screenSpec of EXAMPLE_SCREENS) {
      expect(screenSpec.uxScore, `${screenSpec.id} UX score below 9.5`).toBeGreaterThanOrEqual(9.5);
      expect(screenSpec.uxHighlights.length, `${screenSpec.id} missing UX highlights`).toBeGreaterThanOrEqual(2);
      expect(screenSpec.devices.length, `${screenSpec.id} missing device targets`).toBeGreaterThanOrEqual(1);
      expect(screenSpec.componentsUsed.length, `${screenSpec.id} needs >= 3 primitives`).toBeGreaterThanOrEqual(3);

      for (const comp of screenSpec.componentsUsed) {
        expect(validExports.has(comp), `${screenSpec.id} references unknown component ${comp}`).toBe(true);
      }

      const codeLines = screenSpec.fullCode.trim().split(/\r?\n/);
      expect(codeLines.length, `${screenSpec.id} fullCode too short`).toBeGreaterThanOrEqual(25);
      expect(screenSpec.fullCode, `${screenSpec.id} fullCode must import @refractor-ui/core`).toContain(
        '@refractor-ui/core'
      );
      expect(
        forbiddenTypeRe.test(screenSpec.fullCode),
        `${screenSpec.id} fullCode must not use any or unknown`
      ).toBe(false);
    }

    // Verify all 6 domains are balanced (5 screens each)
    for (const dom of EXAMPLE_DOMAINS) {
      const domScreens = EXAMPLE_SCREENS.filter((s) => s.domain === dom.id);
      expect(domScreens, `Domain ${dom.id} should have 5 screens`).toHaveLength(5);
    }
  });

  const TARGET_VIEWPORTS: ReadonlyArray<DeviceViewportSpec> = [
    getViewportById('galaxy-s25'),
    getViewportById('pixel-10'),
    getViewportById('ipad-pro-11'),
    getViewportById('desktop-standard'),
  ];

  it.each(TARGET_VIEWPORTS)(
    'renders ALL 30 interactive example screens cleanly with responsive table/SVG invariants on $name ($width×$height)',
    (viewport) => {
      applyViewportToWindow(viewport);
      const testStore = createDocsStore();

      const { container, unmount } = render(
        <Provider store={testStore}>
          <PrismThemeProvider>
            <div data-example-matrix={viewport.id}>
              {EXAMPLE_SCREENS.map((ex) => (
                <div key={ex.id} data-example-slot={ex.id} className="w-full min-w-0">
                  {ex.render()}
                </div>
              ))}
            </div>
          </PrismThemeProvider>
        </Provider>
      );

      for (const ex of EXAMPLE_SCREENS) {
        const slot = container.querySelector<HTMLElement>(`[data-example-slot="${ex.id}"]`);
        expect(slot, `Missing rendered slot for ${ex.id} on ${viewport.name}`).not.toBeNull();
        if (slot) {
          expect(slot.childElementCount, `${ex.id} rendered empty`).toBeGreaterThan(0);
          const tables = Array.from(slot.querySelectorAll('table'));
          for (const table of tables) {
            expect(
              hasScrollableAncestor(table, slot),
              `${ex.id} rendered a <table> without overflow-x-auto on ${viewport.name}`
            ).toBe(true);
          }
        }
      }

      unmount();
    },
    30_000
  );

  it('supports full DocsShell #/examples gallery, device filtering, frame switching, Full TSX viewer, and deep-linking', () => {
    applyViewportToWindow(getViewportById('pixel-10'));
    window.location.hash = '#/examples/login-screen';
    const testStore = createDocsStore();

    const { unmount } = render(
      <Provider store={testStore}>
        <PrismThemeProvider>
          <DocsShell />
        </PrismThemeProvider>
      </Provider>
    );

    // Deep-linked focused screen renders cleanly
    const loginArticle = screen.getByTestId('example-screen-login-screen');
    expect(loginArticle).toBeInTheDocument();
    expect(within(loginArticle).getByText(/9\.8\/10 UX/)).toBeInTheDocument();

    // Switch live device preview frame from Mobile -> Tablet -> Web
    fireEvent.click(within(loginArticle).getByRole('button', { name: 'Tablet (768px) frame' }));
    expect(loginArticle.querySelector('[data-preview-frame="tablet"]')).not.toBeNull();

    fireEvent.click(within(loginArticle).getByRole('button', { name: 'Web Desktop frame' }));
    expect(loginArticle.querySelector('[data-preview-frame="web"]')).not.toBeNull();

    // Toggle to Full TSX code tab and verify standalone imports appear
    fireEvent.click(within(loginArticle).getByRole('tab', { name: 'Full TSX' }));
    expect(within(loginArticle).getByText(/login-screen\.tsx/i)).toBeInTheDocument();
    expect(within(loginArticle).getByText(/@refractor-ui\/core/)).toBeInTheDocument();

    // Return to full 30-screen gallery
    fireEvent.click(screen.getByRole('button', { name: /All 30 Example Screens/i }));
    expect(
      screen.getByText(/30 Interactive Example Screens — Web, Tablet & Mobile/i)
    ).toBeInTheDocument();

    // Filter by Mobile device form factor and verify mobile screens appear while web-only screens filter out
    const deviceGroup = screen.getByRole('group', {
      name: 'Filter example screens by device form factor',
    });
    fireEvent.click(within(deviceGroup).getByRole('button', { name: 'Mobile' }));
    expect(screen.getByTestId('example-screen-mobile-ai-copilot')).toBeInTheDocument();
    expect(screen.getByTestId('example-screen-mobile-banking-dashboard')).toBeInTheDocument();
    expect(screen.queryByTestId('example-screen-database-query-explorer')).not.toBeInTheDocument();

    // Search filter + Reset Filters
    const searchInput = screen.getByLabelText('Filter example screens');
    fireEvent.change(searchInput, { target: { value: 'nonexistent-screen-xyz' } });
    expect(screen.getByText(/No example screens matched your filter/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Reset Filters' }));
    expect(screen.getByTestId('example-screen-ai-chat-workspace')).toBeInTheDocument();

    // Verify hash change deep-linking into another focused screen
    act(() => {
      window.location.hash = '#/examples/product-detail-page';
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    });
    expect(screen.getByTestId('example-screen-product-detail-page')).toBeInTheDocument();

    unmount();
  }, 30_000);
});
