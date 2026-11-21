import { defineTheme } from '@refractor-ui/core';

export const alabasterTheme = defineTheme({
  name: 'alabaster',
  palette: {
    mode: 'light',
    primary: { main: '#E75C24', light: '#F59C28', dark: '#C94114', contrastText: '#FFFFFF' },
    secondary: { main: '#38BDF8', light: '#BAE6FD', dark: '#0284C7', contrastText: '#151E2C' },
    info: { main: '#1D4ED8', light: '#0EA5E9', dark: '#1E3A8A', contrastText: '#FFFFFF' },
    success: { main: '#26BC92', light: '#5CE1B8', dark: '#159673', contrastText: '#FFFFFF' },
  },
  optics: {
    refraction: 'standard',
    blurPx: 18,
    specularHighlight: true,
  },
});

export default alabasterTheme;
