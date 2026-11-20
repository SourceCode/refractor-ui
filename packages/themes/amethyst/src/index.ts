import { defineTheme } from '@refractor-ui/core';

export const amethystTheme = defineTheme({
  name: 'amethyst',
  palette: {
    mode: 'light',
    primary: { main: '#7C3AED', light: '#A78BFA', dark: '#5B21B6', contrastText: '#FFFFFF' },
    secondary: { main: '#06B6D4', light: '#A5F3FC', dark: '#0E7490', contrastText: '#151E2C' },
    info: { main: '#4F46E5', light: '#818CF8', dark: '#312E81', contrastText: '#FFFFFF' },
    success: { main: '#10B981', light: '#6EE7B7', dark: '#047857', contrastText: '#FFFFFF' },
  },
  optics: {
    refraction: 'vivid',
    blurPx: 20,
    specularHighlight: true,
  },
});

export default amethystTheme;
