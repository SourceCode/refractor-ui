import { createRef } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import {
  DEFAULT_PREFERENCE_SECTIONS,
  SystemPreferencesShell,
  type PreferenceControlKindMap,
  type PreferenceSection,
  type PreferenceSectionIconMap,
  type PreferenceValue,
} from './index';

function dispatchComposingKeyDown(target: Element, key: string): KeyboardEvent {
  const event = new KeyboardEvent('keydown', {
    key,
    bubbles: true,
    cancelable: true,
    isComposing: true,
  });
  Object.defineProperty(event, 'isComposing', { value: true });
  target.dispatchEvent(event);
  return event;
}

describe('SystemPreferencesShell', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders default 6-section optical shell with ref, theme override, xstyle, responsive two-pane layout, and zero raw colors', () => {
    const ref = createRef<HTMLDivElement>();
    const controlKinds: ReadonlyArray<keyof PreferenceControlKindMap> = [
      'toggle',
      'select',
      'slider',
      'segmented',
    ];
    const sectionIcons: ReadonlyArray<keyof PreferenceSectionIconMap> = [
      'sliders',
      'sparkles',
      'monitor',
      'volume',
      'wifi',
      'shield',
    ];
    expect(controlKinds).toHaveLength(4);
    expect(sectionIcons).toHaveLength(6);
    expect(DEFAULT_PREFERENCE_SECTIONS).toHaveLength(6);
    expect(SystemPreferencesShell.displayName).toBe('SystemPreferencesShell');

    const { container } = render(
      <PrismThemeProvider
        theme={{
          components: {
            SystemPreferencesShell: {
              className: 'theme-prefs-override',
              style: { opacity: '0.98' },
            },
          },
        }}
      >
        <SystemPreferencesShell
          ref={ref}
          className="local-prefs-class"
          style={{ maxWidth: '920px' }}
          xstyle={{ '--prism-blur-px': '20px' }}
          data-testid="prefs-root"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('prefs-root');
    expect(ref.current).toBe(root);
    expect(root).toHaveAttribute('role', 'region');
    expect(root).toHaveAttribute('aria-label', 'System Settings');
    expect(root).toHaveClass(
      'refractor-system-preferences-shell',
      'prism-slab',
      'min-w-0',
      'theme-prefs-override',
      'local-prefs-class'
    );
    expect(root).toHaveStyle({ opacity: '0.98', maxWidth: '920px' });
    expect(root).toHaveAttribute('data-active-section', 'general');
    expect(root).not.toHaveAttribute('data-disabled');

    const nav = screen.getByRole('navigation', {
      name: 'System preference categories',
    });
    expect(nav).toHaveClass(
      'refractor-system-preferences-shell__sidebar',
      'min-w-0'
    );
    expect(nav.parentElement).toHaveClass('flex-col', 'md:flex-row', 'min-w-0');

    const detailPane = screen.getByTestId('preferences-detail-pane');
    expect(detailPane).toHaveClass(
      'refractor-system-preferences-shell__detail',
      'min-w-0'
    );

    expect(screen.getByTestId('preferences-category-count')).toHaveTextContent(
      '6 categories'
    );
    expect(screen.getByTestId('preferences-category-general')).toHaveAttribute(
      'aria-current',
      'page'
    );
    expect(screen.getByTestId('preferences-section-title')).toHaveTextContent(
      'General'
    );
    expect(screen.getByTestId('preferences-modified-pill')).toHaveTextContent(
      '0 modified'
    );
    expect(
      screen.getByRole('button', { name: 'Reset Section Defaults' })
    ).toBeDisabled();

    // Grouped prism-crystal cards for General section
    const sessionCard = screen.getByTestId('preferences-group-Session & Updates');
    const continuityCard = screen.getByTestId('preferences-group-Continuity');
    expect(sessionCard).toHaveClass('prism-crystal');
    expect(continuityCard).toHaveClass('prism-crystal');

    const statusBanner = screen.getByTestId('preferences-status-banner');
    expect(statusBanner).toHaveAttribute('role', 'status');
    expect(statusBanner).toHaveAttribute('aria-live', 'polite');
    expect(statusBanner).toHaveTextContent('General — 0 modified.');

    // Zero raw color literals anywhere in rendered DOM
    expect(container.innerHTML).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(container.innerHTML).not.toMatch(/\b(?:rgba?|hsla?)\s*\(/);
  });

  it('navigates all 6 default categories and operates toggle, select, slider, segmented controls plus section reset', () => {
    const onActiveSectionChange = vi.fn();
    const onSettingChange = vi.fn();
    const onResetSection = vi.fn();

    render(
      <SystemPreferencesShell
        onActiveSectionChange={onActiveSectionChange}
        onSettingChange={onSettingChange}
        onResetSection={onResetSection}
      />
    );

    // Clicking already-active section is a no-op
    fireEvent.click(screen.getByTestId('preferences-category-general'));
    expect(onActiveSectionChange).not.toHaveBeenCalled();

    // 1. Select control in General
    const startupSelect = screen.getByRole('combobox', {
      name: 'Startup Behavior',
    });
    expect(startupSelect).toHaveValue('restore-windows');
    fireEvent.change(startupSelect, { target: { value: 'clean-desktop' } });
    expect(startupSelect).toHaveValue('clean-desktop');
    expect(onSettingChange).toHaveBeenLastCalledWith(
      'general.startup-behavior',
      'clean-desktop',
      'general'
    );
    expect(screen.getByTestId('preferences-modified-pill')).toHaveTextContent(
      '1 modified'
    );
    expect(screen.getByTestId('preferences-status-banner')).toHaveTextContent(
      'Startup Behavior set to Clean Desktop.'
    );

    // 2. Toggle control in General
    const autoUpdatesSwitch = screen.getByRole('switch', {
      name: 'Automatic System Updates',
    });
    expect(autoUpdatesSwitch).toHaveAttribute('aria-checked', 'true');
    fireEvent.click(autoUpdatesSwitch);
    expect(autoUpdatesSwitch).toHaveAttribute('aria-checked', 'false');
    expect(onSettingChange).toHaveBeenLastCalledWith(
      'general.auto-updates',
      false,
      'general'
    );
    expect(screen.getByTestId('preferences-modified-pill')).toHaveTextContent(
      '2 modified'
    );
    expect(screen.getByTestId('preferences-status-banner')).toHaveTextContent(
      'Automatic System Updates set to Off.'
    );

    // Toggling back to default removes modified marker and updates count
    fireEvent.click(autoUpdatesSwitch);
    expect(autoUpdatesSwitch).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByTestId('preferences-modified-pill')).toHaveTextContent(
      '1 modified'
    );
    expect(screen.getByTestId('preferences-status-banner')).toHaveTextContent(
      'Automatic System Updates set to On.'
    );

    // Reset General section defaults
    const resetBtn = screen.getByRole('button', {
      name: 'Reset Section Defaults',
    });
    expect(resetBtn).toBeEnabled();
    fireEvent.click(resetBtn);
    expect(onResetSection).toHaveBeenCalledWith('general');
    expect(startupSelect).toHaveValue('restore-windows');
    expect(screen.getByTestId('preferences-modified-pill')).toHaveTextContent(
      '0 modified'
    );
    expect(resetBtn).toBeDisabled();
    expect(screen.getByTestId('preferences-status-banner')).toHaveTextContent(
      'Reset General preferences to defaults.'
    );

    // 3. Switch to Appearance & Glass -> test segmented + slider controls
    fireEvent.click(screen.getByTestId('preferences-category-appearance'));
    expect(onActiveSectionChange).toHaveBeenCalledWith('appearance');
    expect(screen.getByTestId('preferences-section-title')).toHaveTextContent(
      'Appearance & Glass'
    );

    const colorModeGroup = screen.getByRole('group', { name: 'Color Mode' });
    const autoOption = within(colorModeGroup).getByRole('button', {
      name: 'Auto',
    });
    const darkOption = within(colorModeGroup).getByRole('button', {
      name: 'Dark',
    });
    expect(autoOption).toHaveAttribute('aria-pressed', 'true');
    expect(darkOption).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(darkOption);
    expect(darkOption).toHaveAttribute('aria-pressed', 'true');
    expect(autoOption).toHaveAttribute('aria-pressed', 'false');
    expect(onSettingChange).toHaveBeenLastCalledWith(
      'appearance.theme-mode',
      'dark',
      'appearance'
    );
    expect(screen.getByTestId('preferences-status-banner')).toHaveTextContent(
      'Color Mode set to Dark.'
    );

    const blurSlider = screen.getByRole('slider', {
      name: 'Optical Blur Depth',
    });
    expect(blurSlider).toHaveValue('20');
    expect(
      screen.getByTestId('preferences-slider-readout-appearance.blur-radius')
    ).toHaveTextContent('20px');
    fireEvent.change(blurSlider, { target: { value: '28' } });
    expect(blurSlider).toHaveValue('28');
    expect(
      screen.getByTestId('preferences-slider-readout-appearance.blur-radius')
    ).toHaveTextContent('28px');
    expect(onSettingChange).toHaveBeenLastCalledWith(
      'appearance.blur-radius',
      28,
      'appearance'
    );
    expect(screen.getByTestId('preferences-status-banner')).toHaveTextContent(
      'Optical Blur Depth set to 28px.'
    );
    expect(screen.getByTestId('preferences-modified-pill')).toHaveTextContent(
      '2 modified'
    );

    // 4. Visit remaining categories (Displays, Sound, Network, Privacy & Security) to verify icons & sections
    for (const [id, expectedTitle] of [
      ['displays', 'Displays'],
      ['sound', 'Sound'],
      ['network', 'Network'],
      ['privacy', 'Privacy & Security'],
    ] as const) {
      fireEvent.click(screen.getByTestId(`preferences-category-${id}`));
      expect(screen.getByTestId('preferences-section-title')).toHaveTextContent(
        expectedTitle
      );
      expect(screen.getByTestId(`preferences-category-${id}`)).toHaveAttribute(
        'aria-current',
        'page'
      );
    }
  });

  it('supports linear-time search across section titles, setting labels/descriptions/groups, literal highlights, Escape clear, and zero-match empty state', () => {
    const onActiveSectionChange = vi.fn();
    render(
      <SystemPreferencesShell onActiveSectionChange={onActiveSectionChange} />
    );

    const searchInput = screen.getByRole('searchbox', {
      name: 'Search settings',
    });

    // Escape when search is empty does not break or emit spurious clear
    fireEvent.keyDown(searchInput, { key: 'Escape' });
    expect(screen.getByTestId('preferences-category-count')).toHaveTextContent(
      '6 categories'
    );

    // Search matching setting label in another category auto-focuses that category & renders match badge + highlight <mark>
    fireEvent.change(searchInput, { target: { value: 'Firewall' } });
    expect(screen.getByTestId('preferences-category-count')).toHaveTextContent(
      '1 category'
    );
    expect(screen.getByTestId('preferences-match-badge-privacy')).toHaveTextContent(
      '1'
    );
    expect(screen.getByTestId('preferences-section-title')).toHaveTextContent(
      'Privacy & Security'
    );
    expect(screen.getByTestId('preferences-status-banner')).toHaveTextContent(
      'Showing 1 matching setting in Privacy & Security.'
    );

    const firewallRow = screen.getByTestId('preferences-row-privacy.firewall');
    const marks = firewallRow.querySelectorAll('mark');
    expect(marks.length).toBeGreaterThanOrEqual(1);
    expect(marks[0]?.textContent).toBe('Firewall');

    // Clicking the auto-displayed filtered section pins it as the user's selected section
    fireEvent.click(screen.getByTestId('preferences-category-privacy'));
    expect(onActiveSectionChange).toHaveBeenCalledWith('privacy');

    // Search matching a section title with no setting containing the plural word shows all settings of that section
    fireEvent.change(searchInput, { target: { value: 'Displays' } });
    expect(screen.getByTestId('preferences-match-badge-displays')).toHaveTextContent(
      '3'
    );
    expect(screen.getByTestId('preferences-section-title')).toHaveTextContent(
      'Displays'
    );
    expect(screen.getByTestId('preferences-status-banner')).toHaveTextContent(
      'Showing 3 matching settings in Displays.'
    );

    // Search matching a group name ('Diagnostics')
    fireEvent.change(searchInput, { target: { value: 'Diagnostics' } });
    expect(screen.getByTestId('preferences-match-badge-privacy')).toHaveTextContent(
      '1'
    );
    expect(
      screen.getByTestId('preferences-row-privacy.telemetry-level')
    ).toBeInTheDocument();

    // Search matching a description ('WireGuard')
    fireEvent.change(searchInput, { target: { value: 'WireGuard' } });
    expect(screen.getByTestId('preferences-match-badge-network')).toHaveTextContent(
      '1'
    );

    // Clear button inside search well resets query and focuses input
    const inlineClearBtn = screen.getByRole('button', { name: 'Clear search' });
    fireEvent.click(inlineClearBtn);
    expect(searchInput).toHaveValue('');
    expect(document.activeElement).toBe(searchInput);
    expect(screen.getByTestId('preferences-category-count')).toHaveTextContent(
      '6 categories'
    );
    expect(screen.getByTestId('preferences-status-banner')).toHaveTextContent(
      'Search cleared.'
    );

    // Adversarial regex metacharacters / ReDoS payload must execute cleanly in linear time with zero matches
    const redosQuery = '(.*)+[';
    fireEvent.change(searchInput, { target: { value: redosQuery } });
    expect(screen.getByTestId('preferences-category-count')).toHaveTextContent(
      '0 categories'
    );
    expect(screen.getByTestId('preferences-sidebar-empty')).toHaveTextContent(
      'No matching categories.'
    );
    expect(screen.getByTestId('preferences-empty-state')).toHaveTextContent(
      `No settings match "${redosQuery}"`
    );

    // IME composing Escape must NOT clear search
    dispatchComposingKeyDown(searchInput, 'Escape');
    expect(searchInput).toHaveValue(redosQuery);

    // Clear Search button inside empty state restores catalog & focuses search input
    fireEvent.click(screen.getByRole('button', { name: 'Clear Search' }));
    expect(searchInput).toHaveValue('');
    expect(document.activeElement).toBe(searchInput);
    expect(screen.getByTestId('preferences-category-count')).toHaveTextContent(
      '6 categories'
    );

    // Non-composing Escape clears active search query
    fireEvent.change(searchInput, { target: { value: 'Sound' } });
    expect(searchInput).toHaveValue('Sound');
    fireEvent.keyDown(searchInput, { key: 'Escape' });
    expect(searchInput).toHaveValue('');
  });

  it('supports roving keyboard navigation (ArrowDown, ArrowUp, Home, End) with IME composition guards', () => {
    const onActiveSectionChange = vi.fn();

    render(
      <SystemPreferencesShell onActiveSectionChange={onActiveSectionChange} />
    );

    const generalBtn = screen.getByTestId('preferences-category-general');
    const appearanceBtn = screen.getByTestId('preferences-category-appearance');
    const privacyBtn = screen.getByTestId('preferences-category-privacy');

    expect(generalBtn).toHaveAttribute('tabindex', '0');
    expect(appearanceBtn).toHaveAttribute('tabindex', '-1');

    generalBtn.focus();

    // IME composing ArrowDown must be ignored
    dispatchComposingKeyDown(generalBtn, 'ArrowDown');
    expect(generalBtn).toHaveAttribute('aria-current', 'page');
    expect(onActiveSectionChange).not.toHaveBeenCalled();

    // Non-navigation key is ignored
    fireEvent.keyDown(generalBtn, { key: 'Tab' });
    expect(generalBtn).toHaveAttribute('aria-current', 'page');

    // ArrowDown moves to Appearance & Glass
    fireEvent.keyDown(generalBtn, { key: 'ArrowDown' });
    expect(appearanceBtn).toHaveAttribute('aria-current', 'page');
    expect(document.activeElement).toBe(appearanceBtn);

    // End jumps to last category (Privacy & Security)
    fireEvent.keyDown(appearanceBtn, { key: 'End' });
    expect(privacyBtn).toHaveAttribute('aria-current', 'page');
    expect(document.activeElement).toBe(privacyBtn);

    // ArrowDown from last wraps around to first (General)
    fireEvent.keyDown(privacyBtn, { key: 'ArrowDown' });
    expect(generalBtn).toHaveAttribute('aria-current', 'page');
    expect(document.activeElement).toBe(generalBtn);

    // ArrowUp from first wraps around to last (Privacy & Security)
    fireEvent.keyDown(generalBtn, { key: 'ArrowUp' });
    expect(privacyBtn).toHaveAttribute('aria-current', 'page');
    expect(document.activeElement).toBe(privacyBtn);

    // Home jumps back to first (General)
    fireEvent.keyDown(privacyBtn, { key: 'Home' });
    expect(generalBtn).toHaveAttribute('aria-current', 'page');
    expect(document.activeElement).toBe(generalBtn);

    // IME composition guard on interactive switch button
    const toggleBtn = screen.getByRole('switch', {
      name: 'Automatic System Updates',
    });
    const composingEnter = dispatchComposingKeyDown(toggleBtn, 'Enter');
    expect(composingEnter.defaultPrevented).toBe(true);

    const normalEnter = new KeyboardEvent('keydown', {
      key: 'Enter',
      bubbles: true,
      cancelable: true,
      isComposing: false,
    });
    toggleBtn.dispatchEvent(normalEnter);
    expect(normalEnter.defaultPrevented).toBe(false);
  });

  it('supports controlled activeSectionId, controlled Map & tuple-array values, defaultValues, and invalid defaultActiveSectionId fallback', () => {
    const onActiveSectionChange = vi.fn();
    const onSettingChange = vi.fn();
    const onResetSection = vi.fn();

    const controlledMap = new Map<string, PreferenceValue>([
      ['appearance.theme-mode', 'light'],
      ['appearance.blur-radius', 30],
    ]);

    const { rerender } = render(
      <SystemPreferencesShell
        activeSectionId="appearance"
        values={controlledMap}
        onActiveSectionChange={onActiveSectionChange}
        onSettingChange={onSettingChange}
        onResetSection={onResetSection}
      />
    );

    expect(screen.getByTestId('preferences-section-title')).toHaveTextContent(
      'Appearance & Glass'
    );
    expect(screen.getByTestId('preferences-modified-pill')).toHaveTextContent(
      '2 modified'
    );
    expect(
      screen.getByTestId('preferences-slider-readout-appearance.blur-radius')
    ).toHaveTextContent('30px');

    // Attempting to switch section notifies parent without mutating controlled activeSectionId
    fireEvent.click(screen.getByTestId('preferences-category-sound'));
    expect(onActiveSectionChange).toHaveBeenCalledWith('sound');
    expect(screen.getByTestId('preferences-section-title')).toHaveTextContent(
      'Appearance & Glass'
    );

    // Attempting to edit setting notifies parent without mutating controlled values
    fireEvent.change(
      screen.getByRole('slider', { name: 'Optical Blur Depth' }),
      { target: { value: '12' } }
    );
    expect(onSettingChange).toHaveBeenCalledWith(
      'appearance.blur-radius',
      12,
      'appearance'
    );
    expect(
      screen.getByTestId('preferences-slider-readout-appearance.blur-radius')
    ).toHaveTextContent('30px');

    // Controlled reset fires onResetSection without mutating controlled values
    fireEvent.click(
      screen.getByRole('button', { name: 'Reset Section Defaults' })
    );
    expect(onResetSection).toHaveBeenCalledWith('appearance');
    expect(screen.getByTestId('preferences-modified-pill')).toHaveTextContent(
      '2 modified'
    );

    // Controlled tuple-array input works identically to Map
    rerender(
      <SystemPreferencesShell
        activeSectionId="appearance"
        values={[['appearance.blur-radius', 16]]}
      />
    );
    expect(
      screen.getByTestId('preferences-slider-readout-appearance.blur-radius')
    ).toHaveTextContent('16px');
    expect(screen.getByTestId('preferences-modified-pill')).toHaveTextContent(
      '1 modified'
    );
  });

  it('initializes from valid defaultActiveSectionId and defaultValues and falls back cleanly on unknown defaultActiveSectionId', () => {
    const { unmount } = render(
      <SystemPreferencesShell
        defaultActiveSectionId="network"
        defaultValues={[['network.wifi-enabled', false]]}
      />
    );

    expect(screen.getByTestId('preferences-section-title')).toHaveTextContent(
      'Network'
    );
    expect(
      screen.getByRole('switch', { name: 'Wi-Fi Radio' })
    ).toHaveAttribute('aria-checked', 'false');
    expect(screen.getByTestId('preferences-modified-pill')).toHaveTextContent(
      '1 modified'
    );
    unmount();

    render(
      <SystemPreferencesShell
        title="   "
        defaultActiveSectionId="does-not-exist"
      />
    );
    expect(screen.getByRole('region', { name: 'System Settings' })).toBeInTheDocument();
    expect(screen.getByTestId('preferences-section-title')).toHaveTextContent(
      'General'
    );
  });

  it('defends against prototype-polluting IDs, empty/duplicate sections, NaN/Infinity/out-of-range sliders, missing options, and XSS payloads', () => {
    const xssTitle = '<script>window.__prefsXss=1</script><img src=x onerror=alert(1)>';
    const onSettingChange = vi.fn();

    const emptyCategorySection: PreferenceSection = {
      id: 'empty-cat',
      title: 'Empty Category',
      subtitle: 'No settings yet',
      icon: 'sliders',
      settings: [],
    };

    const adversarialSections: ReadonlyArray<PreferenceSection> = [
      {
        id: '__proto__',
        title: xssTitle,
        subtitle: 'Adversarial prototype & bounds harness',
        icon: 'shield',
        settings: [
          {
            id: '__proto__',
            label: 'Prototype Toggle',
            kind: 'toggle',
            defaultValue: false,
            group: '__proto__',
          },
          {
            id: 'constructor',
            label: 'Out-Of-Range Slider',
            kind: 'slider',
            defaultValue: Number.NaN,
            min: 50,
            max: 10,
            step: -5,
            group: '   ',
          },
          {
            id: 'prototype',
            label: 'Unbounded Default Slider',
            kind: 'slider',
            defaultValue: 'not-a-number',
            group: 'Bounds',
          },
          {
            id: 'empty-select',
            label: 'Empty Select',
            kind: 'select',
            defaultValue: 'custom-val',
            group: 'Bounds',
          },
          {
            id: 'invalid-segmented',
            label: 'Validated Segmented',
            kind: 'segmented',
            defaultValue: 'missing-default',
            options: [
              { value: 'alpha', label: 'Alpha' },
              { value: 'beta', label: 'Beta' },
            ],
            group: 'Bounds',
          },
          {
            id: 'fallback-select',
            label: 'Fallback Select',
            kind: 'select',
            defaultValue: 'beta',
            options: [
              { value: 'alpha', label: 'Alpha' },
              { value: 'beta', label: 'Beta' },
            ],
            group: 'Bounds',
          },
          {
            id: 'empty-segmented',
            label: 'Empty Segmented',
            kind: 'segmented',
            defaultValue: 'raw',
            group: 'Bounds',
          },
        ],
      },
      // Duplicate section ID must be deduplicated cleanly
      {
        id: '__proto__',
        title: 'Duplicate Ignored Section',
        subtitle: 'Should not appear',
        icon: 'wifi',
        settings: [],
      },
      // Valid second section with zero settings
      emptyCategorySection,
    ];

    const adversarialValues = new Map<string, PreferenceValue>([
      ['__proto__', true],
      ['constructor', Number.POSITIVE_INFINITY],
      ['prototype', 999],
      ['invalid-segmented', 'nonexistent-option'],
      ['fallback-select', 'nonexistent-option'],
    ]);

    const { rerender } = render(
      <SystemPreferencesShell
        title={xssTitle}
        sections={adversarialSections}
        defaultValues={adversarialValues}
        onSettingChange={onSettingChange}
      />
    );

    // Zero prototype pollution & zero XSS DOM injection
    expect(({} as Record<string, PreferenceValue>)['__proto__']).toBe(
      Object.prototype
    );
    expect(({} as Record<string, PreferenceValue>)['constructor']).toBe(Object);
    expect(Object.keys(Object.prototype)).toHaveLength(0);
    expect(document.querySelector('script')).toBeNull();
    expect(document.querySelector('img')).toBeNull();
    expect(screen.getByTestId('preferences-section-title')).toHaveTextContent(
      xssTitle
    );

    // Duplicate section deduplicated: only 2 categories remain
    expect(screen.getByTestId('preferences-category-count')).toHaveTextContent(
      '2 categories'
    );

    // __proto__ toggle works safely inside Map
    const protoToggle = screen.getByRole('switch', { name: 'Prototype Toggle' });
    expect(protoToggle).toHaveAttribute('aria-checked', 'true');
    fireEvent.click(protoToggle);
    expect(protoToggle).toHaveAttribute('aria-checked', 'false');
    expect(onSettingChange).toHaveBeenCalledWith('__proto__', false, '__proto__');

    // Reversed min/max (50, 10) + negative step (-5) + NaN default + Infinity stored value -> clamped safely to min=10, max=50, step=1
    const rangeSlider = screen.getByRole('slider', {
      name: 'Out-Of-Range Slider',
    });
    expect(rangeSlider).toHaveAttribute('min', '10');
    expect(rangeSlider).toHaveAttribute('max', '50');
    expect(rangeSlider).toHaveAttribute('step', '1');
    expect(
      screen.getByTestId('preferences-slider-readout-constructor')
    ).toHaveTextContent('10');

    // Moving unitless slider formats value cleanly without unit suffix and clamps to bounds
    fireEvent.change(rangeSlider, { target: { value: '25' } });
    expect(
      screen.getByTestId('preferences-slider-readout-constructor')
    ).toHaveTextContent('25');
    expect(screen.getByTestId('preferences-status-banner')).toHaveTextContent(
      'Out-Of-Range Slider set to 25.'
    );

    // Out-of-range stored value (999) on default [0..100] slider clamps strictly to 100
    expect(
      screen.getByTestId('preferences-slider-readout-prototype')
    ).toHaveTextContent('100');

    // Invalid option values fall back to valid default or first option
    const validatedGroup = screen.getByRole('group', {
      name: 'Validated Segmented',
    });
    expect(
      within(validatedGroup).getByRole('button', { name: 'Alpha' })
    ).toHaveAttribute('aria-pressed', 'true');
    expect(
      screen.getByRole('combobox', { name: 'Fallback Select' })
    ).toHaveValue('beta');

    // Empty-options select change formats raw string cleanly in status announcement
    fireEvent.change(screen.getByRole('combobox', { name: 'Empty Select' }), {
      target: { value: '' },
    });
    expect(onSettingChange).toHaveBeenLastCalledWith(
      'empty-select',
      '',
      '__proto__'
    );

    // Empty group name falls back to 'General'
    expect(screen.getByTestId('preferences-group-General')).toBeInTheDocument();

    // Section with zero settings displays clean empty state
    fireEvent.click(screen.getByTestId('preferences-category-empty-cat'));
    expect(screen.getByTestId('preferences-section-empty')).toHaveTextContent(
      'No preferences configured in Empty Category.'
    );

    // Single-section keyboard nav early-returns cleanly
    const { unmount } = render(
      <SystemPreferencesShell sections={[emptyCategorySection]} />
    );
    const onlyCategory = screen.getAllByTestId('preferences-category-empty-cat')[1]!;
    fireEvent.keyDown(onlyCategory, { key: 'ArrowDown' });
    expect(onlyCategory).toHaveAttribute('aria-current', 'page');
    unmount();

    // Fresh mount with empty sections array renders clean empty state without crashing
    rerender(<SystemPreferencesShell sections={[]} />);
    const { unmount: unmountEmpty } = render(
      <SystemPreferencesShell sections={[]} data-testid="empty-fresh" />
    );
    expect(
      within(screen.getByTestId('empty-fresh')).getByTestId(
        'preferences-category-count'
      )
    ).toHaveTextContent('0 categories');
    expect(
      within(screen.getByTestId('empty-fresh')).getByTestId(
        'preferences-sidebar-empty'
      )
    ).toHaveTextContent('No preference categories.');
    expect(
      within(screen.getByTestId('empty-fresh')).getByTestId(
        'preferences-empty-state'
      )
    ).toHaveTextContent('No preference categories configured');
    expect(
      within(screen.getByTestId('empty-fresh')).getByTestId(
        'preferences-status-banner'
      )
    ).toHaveTextContent('No preference categories available.');
    unmountEmpty();
  });

  it('enforces shell-level and per-setting disabled states even if DOM disabled attributes are removed', () => {
    const onActiveSectionChange = vi.fn();
    const onSettingChange = vi.fn();
    const onResetSection = vi.fn();

    const customSections: ReadonlyArray<PreferenceSection> = [
      {
        id: 'sec-a',
        title: 'Section A',
        subtitle: 'Mixed disabled controls',
        icon: 'sliders',
        settings: [
          {
            id: 'locked-toggle',
            label: 'Locked Policy Toggle',
            kind: 'toggle',
            defaultValue: true,
            group: 'Policy',
            disabled: true,
          },
          {
            id: 'locked-slider',
            label: 'Locked Policy Slider',
            kind: 'slider',
            defaultValue: 40,
            min: 0,
            max: 100,
            step: 5,
            unit: '%',
            group: 'Policy',
            disabled: true,
          },
          {
            id: 'open-toggle',
            label: 'Open Toggle',
            kind: 'toggle',
            defaultValue: false,
            group: 'Policy',
          },
        ],
      },
      {
        id: 'sec-b',
        title: 'Section B',
        subtitle: 'Secondary section',
        icon: 'monitor',
        settings: [
          {
            id: 'sec-b-toggle',
            label: 'Secondary Toggle',
            kind: 'toggle',
            defaultValue: false,
            group: 'General',
          },
        ],
      },
    ];

    const { rerender } = render(
      <SystemPreferencesShell
        sections={customSections}
        defaultValues={[['open-toggle', true]]}
        onActiveSectionChange={onActiveSectionChange}
        onSettingChange={onSettingChange}
        onResetSection={onResetSection}
      />
    );

    // Individual setting.disabled blocks only that control (including synthetic change on slider)
    const lockedSwitch = screen.getByRole('switch', {
      name: 'Locked Policy Toggle',
    });
    expect(lockedSwitch).toBeDisabled();
    lockedSwitch.removeAttribute('disabled');
    fireEvent.click(lockedSwitch);

    const lockedSlider = screen.getByRole('slider', {
      name: 'Locked Policy Slider',
    });
    expect(lockedSlider).toBeDisabled();
    lockedSlider.removeAttribute('disabled');
    fireEvent.change(lockedSlider, { target: { value: '80' } });
    expect(onSettingChange).not.toHaveBeenCalled();

    // Sibling control remains enabled
    const openSwitch = screen.getByRole('switch', { name: 'Open Toggle' });
    expect(openSwitch).toBeEnabled();
    fireEvent.click(openSwitch);
    expect(onSettingChange).toHaveBeenCalledWith('open-toggle', false, 'sec-a');

    // Now test full shell disabled mode (including search input, clear button, category switch, reset button)
    const searchInput = screen.getByRole('searchbox', {
      name: 'Search settings',
    });
    fireEvent.change(searchInput, { target: { value: 'Section' } });

    rerender(
      <SystemPreferencesShell
        sections={customSections}
        values={[['open-toggle', true]]}
        disabled
        onActiveSectionChange={onActiveSectionChange}
        onSettingChange={onSettingChange}
        onResetSection={onResetSection}
        data-testid="prefs-disabled"
      />
    );

    const root = screen.getByTestId('prefs-disabled');
    expect(root).toHaveAttribute('aria-disabled', 'true');
    expect(root).toHaveAttribute('data-disabled', 'true');

    onActiveSectionChange.mockClear();
    onSettingChange.mockClear();
    onResetSection.mockClear();

    // Strip disabled attributes adversarially and verify handler guards hold
    searchInput.removeAttribute('disabled');
    fireEvent.change(searchInput, { target: { value: 'hacked' } });
    expect(searchInput).toHaveValue('Section');

    fireEvent.keyDown(searchInput, { key: 'Escape' });
    expect(searchInput).toHaveValue('Section');

    const clearBtn = screen.getByRole('button', { name: 'Clear search' });
    expect(clearBtn).toBeDisabled();
    clearBtn.removeAttribute('disabled');
    fireEvent.click(clearBtn);
    expect(searchInput).toHaveValue('Section');

    const secBBtn = screen.getByTestId('preferences-category-sec-b');
    expect(secBBtn).toBeDisabled();
    secBBtn.removeAttribute('disabled');
    fireEvent.click(secBBtn);
    fireEvent.keyDown(secBBtn, { key: 'ArrowDown' });
    expect(onActiveSectionChange).not.toHaveBeenCalled();

    const resetBtn = screen.getByRole('button', {
      name: 'Reset Section Defaults',
    });
    expect(resetBtn).toBeDisabled();
    resetBtn.removeAttribute('disabled');
    fireEvent.click(resetBtn);
    expect(onResetSection).not.toHaveBeenCalled();
  });
});
