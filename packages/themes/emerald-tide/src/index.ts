import { defineTheme } from '@refractor-ui/core';

export const emeraldTideTheme = defineTheme({
  name: 'emerald-tide',
  palette: {
    mode: 'light',
    primary: { main: '#0D9488', light: '#2DD4BF', dark: '#115E59', contrastText: '#FFFFFF' },
    secondary: { main: '#0EA5E9', light: '#BAE6FD', dark: '#0369A1', contrastText: '#151E2C' },
    info: { main: '#0284C7', light: '#38BDF8', dark: '#0C4A6E', contrastText: '#FFFFFF' },
    success: { main: '#16A34A', light: '#4ADE80', dark: '#166534', contrastText: '#FFFFFF' },
  },
  optics: {
    refraction: 'standard',
    blurPx: 18,
    specularHighlight: true,
  },
});

export default emeraldTideTheme;
