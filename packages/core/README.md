# `@refractor-ui/core`

Tactile optical-glass **React 19 & TypeScript** component library with **179 accessible components across 32 categories**, **MUI-simple color & optical theming**, **Astryx Open-Internals architecture**, and **zero `any`/`unknown` types**.

- **Live Interactive Docs & Theme Studio:** https://sourcecode.github.io/refractor-ui/
- **Repository:** https://github.com/SourceCode/refractor-ui
- **License:** Apache-2.0

## Installation

```bash
pnpm add @refractor-ui/core lucide-react
```

## Quick Start

Import the `@layer`-safe stylesheets in your app entry CSS (`src/index.css`):

```css
@import "tailwindcss";
@source "../node_modules/@refractor-ui/core/dist";
@custom-variant dark (&:where(.dark, .dark *, [data-color-mode="dark"], [data-color-mode="dark"] *));

@import "@refractor-ui/core/reset.css";
@import "@refractor-ui/core/refractor.css";
```

Wrap your app in `<PrismThemeProvider>` and import components via barrel or tree-shakeable subpaths:

```tsx
import { createPrismTheme, PrismThemeProvider } from '@refractor-ui/core';
import { PrimaryButton } from '@refractor-ui/core/PrimaryButton';
import { PrismCard } from '@refractor-ui/core/PrismCard';

const theme = createPrismTheme({
  palette: {
    mode: 'light',
    primary: { main: '#E75C24' },
    secondary: { main: '#38BDF8' },
  },
  optics: { refraction: 'standard', blurPx: 18 },
});

export function Example() {
  return (
    <PrismThemeProvider theme={theme}>
      <PrismCard title="Refractor Optical Glass" kicker="v1.21.0">
        <PrimaryButton size="md">Start Project</PrimaryButton>
      </PrismCard>
    </PrismThemeProvider>
  );
}
```
