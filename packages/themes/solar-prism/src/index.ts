import { defineTheme } from '@refractor-ui/core';

export const solarPrismTheme = defineTheme({
  name: 'solar-prism',
  palette: {
    mode: 'light',
    primary: { main: '#D97706', light: '#FBBF24', dark: '#92400E', contrastText: '#FFFFFF' },
    secondary: { main: '#2563EB', light: '#93C5FD', dark: '#1E40AF', contrastText: '#151E2C' },
    info: { main: '#1D4ED8', light: '#60A5FA', dark: '#1E3A8A', contrastText: '#FFFFFF' },
    success: { main: '#059669', light: '#34D399', dark: '#065F46', contrastText: '#FFFFFF' },
  },
  optics: {
    refraction: 'vivid',
    blurPx: 20,
    specularHighlight: true,
  },
});

export default solarPrismTheme;
