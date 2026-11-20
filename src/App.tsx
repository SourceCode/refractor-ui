/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Provider } from 'react-redux';
import { DocsShell } from './apps/docs/DocsShell';
import { PrismThemeProvider } from './os/theme/prismTheme';
import { store, useAppSelector } from './system/store';

const ThemedRoot: React.FC = () => {
  const mode = useAppSelector((s) => s.system.themeMode);
  const refraction = useAppSelector((s) => s.system.refraction);

  return (
    <PrismThemeProvider mode={mode} refraction={refraction}>
      <DocsShell />
    </PrismThemeProvider>
  );
};

export default function App() {
  return (
    <Provider store={store}>
      <ThemedRoot />
    </Provider>
  );
}
