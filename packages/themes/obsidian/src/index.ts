import { defineTheme } from '@refractor-ui/core';

export const obsidianTheme = defineTheme({
  name: 'obsidian',
  palette: {
    mode: 'dark',
    primary: { main: '#F06429', light: '#FBA93B', dark: '#C84312', contrastText: '#FFFFFF' },
    secondary: { main: '#38BDF8', light: '#7DD3FC', dark: '#0369A1', contrastText: '#F1F5F9' },
    info: { main: '#2563EB', light: '#38BDF8', dark: '#1E3A8A', contrastText: '#FFFFFF' },
    success: { main: '#22C58E', light: '#5EEAD4', dark: '#0F766E', contrastText: '#FFFFFF' },
  },
  optics: {
    refraction: 'standard',
    blurPx: 20,
    specularHighlight: true,
  },
});

export default obsidianTheme;
