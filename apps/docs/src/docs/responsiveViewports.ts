export type ViewportCategory = 'mobile' | 'tablet' | 'desktop';
export type DevicePlatform = 'ios' | 'android' | 'desktop';
export type ViewportOrientation = 'portrait' | 'landscape';

export interface DeviceViewportSpec {
  id: string;
  name: string;
  platform: DevicePlatform;
  category: ViewportCategory;
  width: number;
  height: number;
  dpr: number;
  aspectRatio: string;
  orientation: ViewportOrientation;
}

/**
 * Authoritative modern multi-device viewport matrix covering the latest iOS,
 * Android (including Google Pixel 10 series), tablet, and desktop aspect ratios.
 */
export const DEVICE_VIEWPORTS: ReadonlyArray<DeviceViewportSpec> = [
  // Android Mobile (Latest Flagships & Ultra-Narrow Cover)
  {
    id: 'galaxy-z-fold7-cover',
    name: 'Samsung Galaxy Z Fold7 Cover',
    platform: 'android',
    category: 'mobile',
    width: 344,
    height: 882,
    dpr: 3,
    aspectRatio: '23:9',
    orientation: 'portrait',
  },
  {
    id: 'galaxy-s25',
    name: 'Samsung Galaxy S25',
    platform: 'android',
    category: 'mobile',
    width: 360,
    height: 780,
    dpr: 3,
    aspectRatio: '19.5:9',
    orientation: 'portrait',
  },
  {
    id: 'pixel-10-pro',
    name: 'Google Pixel 10 Pro',
    platform: 'android',
    category: 'mobile',
    width: 410,
    height: 914,
    dpr: 3,
    aspectRatio: '20:9',
    orientation: 'portrait',
  },
  {
    id: 'pixel-10',
    name: 'Google Pixel 10',
    platform: 'android',
    category: 'mobile',
    width: 412,
    height: 924,
    dpr: 2.625,
    aspectRatio: '20:9',
    orientation: 'portrait',
  },
  {
    id: 'pixel-10-pro-xl',
    name: 'Google Pixel 10 Pro XL',
    platform: 'android',
    category: 'mobile',
    width: 448,
    height: 997,
    dpr: 3,
    aspectRatio: '20:9',
    orientation: 'portrait',
  },

  // iOS Mobile (Latest Apple Lineup + Compact Baseline)
  {
    id: 'iphone-compact',
    name: 'iPhone Compact / SE',
    platform: 'ios',
    category: 'mobile',
    width: 375,
    height: 667,
    dpr: 2,
    aspectRatio: '16:9',
    orientation: 'portrait',
  },
  {
    id: 'iphone-17',
    name: 'iPhone 17 / 16',
    platform: 'ios',
    category: 'mobile',
    width: 393,
    height: 852,
    dpr: 3,
    aspectRatio: '19.5:9',
    orientation: 'portrait',
  },
  {
    id: 'iphone-17-pro',
    name: 'iPhone 17 / 16 Pro',
    platform: 'ios',
    category: 'mobile',
    width: 402,
    height: 874,
    dpr: 3,
    aspectRatio: '19.5:9',
    orientation: 'portrait',
  },
  {
    id: 'iphone-17-pro-max',
    name: 'iPhone 17 / 16 Pro Max',
    platform: 'ios',
    category: 'mobile',
    width: 440,
    height: 956,
    dpr: 3,
    aspectRatio: '19.5:9',
    orientation: 'portrait',
  },

  // Tablets (Latest iPad & Android Tablets)
  {
    id: 'ipad-mini',
    name: 'iPad mini (A17 Pro)',
    platform: 'ios',
    category: 'tablet',
    width: 744,
    height: 1133,
    dpr: 2,
    aspectRatio: '3:2',
    orientation: 'portrait',
  },
  {
    id: 'pixel-tablet',
    name: 'Google Pixel Tablet',
    platform: 'android',
    category: 'tablet',
    width: 800,
    height: 1280,
    dpr: 2,
    aspectRatio: '16:10',
    orientation: 'portrait',
  },
  {
    id: 'ipad-pro-11',
    name: 'iPad Pro 11" (M4)',
    platform: 'ios',
    category: 'tablet',
    width: 834,
    height: 1194,
    dpr: 2,
    aspectRatio: '10:7',
    orientation: 'portrait',
  },
  {
    id: 'ipad-pro-13',
    name: 'iPad Pro 13" (M4)',
    platform: 'ios',
    category: 'tablet',
    width: 1024,
    height: 1366,
    dpr: 2,
    aspectRatio: '4:3',
    orientation: 'portrait',
  },

  // Desktop Viewports
  {
    id: 'desktop-compact',
    name: 'Desktop Compact (1280×800)',
    platform: 'desktop',
    category: 'desktop',
    width: 1280,
    height: 800,
    dpr: 1,
    aspectRatio: '16:10',
    orientation: 'landscape',
  },
  {
    id: 'desktop-standard',
    name: 'Desktop Standard (1440×900)',
    platform: 'desktop',
    category: 'desktop',
    width: 1440,
    height: 900,
    dpr: 1,
    aspectRatio: '16:10',
    orientation: 'landscape',
  },
];

export function getViewportById(id: string): DeviceViewportSpec {
  const match = DEVICE_VIEWPORTS.find((v) => v.id === id);
  if (!match) {
    throw new Error(`Unknown device viewport id: ${id}`);
  }
  return match;
}

/**
 * Evaluates common responsive CSS media queries deterministically against a DeviceViewportSpec.
 */
export function evaluateMediaQuery(query: string, viewport: DeviceViewportSpec): boolean {
  const normalized = query.trim().toLowerCase();
  const minWidthMatch = /\(min-width:\s*(\d+(?:\.\d+)?)px\)/.exec(normalized);
  if (minWidthMatch && minWidthMatch[1]) {
    if (viewport.width < Number(minWidthMatch[1])) return false;
  }

  const maxWidthMatch = /\(max-width:\s*(\d+(?:\.\d+)?)px\)/.exec(normalized);
  if (maxWidthMatch && maxWidthMatch[1]) {
    if (viewport.width > Number(maxWidthMatch[1])) return false;
  }

  if (normalized.includes('(orientation: portrait)') && viewport.height < viewport.width) {
    return false;
  }

  if (normalized.includes('(orientation: landscape)') && viewport.width < viewport.height) {
    return false;
  }

  if (normalized.includes('(pointer: coarse)') && viewport.category === 'desktop') {
    return false;
  }

  if (normalized.includes('(pointer: fine)') && viewport.category !== 'desktop') {
    return false;
  }

  return true;
}

export function applyViewportToWindow(viewport: DeviceViewportSpec): void {
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
  Object.defineProperty(window, 'devicePixelRatio', {
    configurable: true,
    writable: true,
    value: viewport.dpr,
  });
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: (query: string): MediaQueryList => ({
      matches: evaluateMediaQuery(query, viewport),
      media: query,
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
    }),
  });
  Object.defineProperty(window, 'scrollTo', {
    configurable: true,
    writable: true,
    value: () => undefined,
  });
  window.dispatchEvent(new Event('resize'));
}
