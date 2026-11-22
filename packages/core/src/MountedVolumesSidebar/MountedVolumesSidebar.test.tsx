import { createRef, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import {
  MountedVolumesSidebar,
  type MountedVolumeSpec,
  type PlacesNavItem,
  type PlacesSectionKindMap,
  type VolumeMountKindMap,
} from './index';

describe('MountedVolumesSidebar', () => {
  it('renders all 4 default grouped sections with PrismThemeProvider overrides, xstyle, React 19 ref, and active optical highlight', () => {
    const ref = createRef<HTMLDivElement>();
    const kindMap: VolumeMountKindMap = {
      local: true,
      network: true,
      cloud: true,
      removable: true,
    };
    const sectionMap: PlacesSectionKindMap = {
      favorite: true,
      smart: true,
    };
    expect(Object.keys(kindMap)).toEqual(['local', 'network', 'cloud', 'removable']);
    expect(Object.keys(sectionMap)).toEqual(['favorite', 'smart']);
    expect(MountedVolumesSidebar.displayName).toBe('MountedVolumesSidebar');

    render(
      <PrismThemeProvider
        theme={{
          components: {
            MountedVolumesSidebar: {
              className: 'theme-volumes-override',
              style: { letterSpacing: '0.15px' },
            },
          },
        }}
      >
        <MountedVolumesSidebar
          ref={ref}
          className="custom-volumes-rail"
          xstyle={{ '--prism-blur-px': '20px' }}
          style={{ maxWidth: '340px' }}
          data-testid="volumes-sidebar"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('volumes-sidebar');
    expect(ref.current).toBe(root);
    expect(root).toHaveClass(
      'refractor-mounted-volumes-sidebar',
      'prism-slab',
      'theme-volumes-override',
      'custom-volumes-rail'
    );
    expect(root).toHaveAttribute('role', 'region');
    expect(root).toHaveAttribute('data-mounted-count', '5');
    expect(root).toHaveAttribute('data-volume-count', '5');
    expect(root).not.toHaveAttribute('data-disabled');
    expect(root).toHaveStyle({ letterSpacing: '0.15px', maxWidth: '340px' });

    expect(
      screen.getByRole('heading', { name: 'Places & Mounted Volumes' })
    ).toBeInTheDocument();
    expect(screen.getByTestId('mounted-volumes-summary')).toHaveTextContent('5/5 Mounted');

    // All 4 sections expanded by default with accurate counts
    expect(screen.getByTestId('volumes-section-toggle-favorites')).toHaveAttribute(
      'aria-expanded',
      'true'
    );
    expect(screen.getByTestId('volumes-section-count-favorites')).toHaveTextContent('4');

    expect(screen.getByTestId('volumes-section-toggle-smart')).toHaveAttribute(
      'aria-expanded',
      'true'
    );
    expect(screen.getByTestId('volumes-section-count-smart')).toHaveTextContent('3');

    expect(screen.getByTestId('volumes-section-toggle-local')).toHaveAttribute(
      'aria-expanded',
      'true'
    );
    expect(screen.getByTestId('volumes-section-count-local')).toHaveTextContent('2');

    expect(screen.getByTestId('volumes-section-toggle-mounts')).toHaveAttribute(
      'aria-expanded',
      'true'
    );
    expect(screen.getByTestId('volumes-section-count-mounts')).toHaveTextContent('3');

    // Favorites default items & initial active highlight
    const desktop = screen.getByTestId('places-item-fav-desktop');
    expect(desktop).toHaveAttribute('aria-current', 'location');
    expect(desktop).toHaveAttribute('data-active', 'true');
    expect(screen.getByTestId('places-item-fav-documents')).not.toHaveAttribute('aria-current');
    expect(screen.getByTestId('places-count-fav-downloads')).toHaveTextContent('14');
    expect(screen.getByTestId('places-count-fav-projects')).toHaveTextContent('8');

    // Smart folders default items & count badges
    expect(screen.getByTestId('places-count-smart-recent')).toHaveTextContent('24');
    expect(screen.getByTestId('places-count-smart-starred')).toHaveTextContent('9');
    expect(screen.getByTestId('places-count-smart-trash')).toHaveTextContent('3');

    // Local drives default items & capacity readouts
    expect(screen.getByTestId('volume-capacity-label-vol-system-nvme')).toHaveTextContent(
      '612/1000 GB (61%)'
    );
    expect(screen.getByTestId('volume-capacity-fill-vol-system-nvme').style.backgroundColor).toBe(
      'var(--prism-info-main)'
    );
    expect(screen.queryByTestId('volume-eject-vol-system-nvme')).toBeNull();

    expect(screen.getByTestId('volume-capacity-label-vol-render-scratch')).toHaveTextContent(
      '1840/2000 GB (92%)'
    );
    expect(
      screen.getByTestId('volume-capacity-fill-vol-render-scratch').style.backgroundColor
    ).toBe('var(--prism-error-main)');

    // Network, cloud & removable mounts default items
    expect(screen.getByTestId('volume-row-vol-studio-nas')).toHaveAttribute(
      'data-volume-kind',
      'network'
    );
    expect(screen.getByTestId('volume-capacity-fill-vol-studio-nas').style.backgroundColor).toBe(
      'var(--prism-warning-main)'
    );
    expect(screen.getByRole('button', { name: 'Eject Studio NAS (SMB)' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Eject Prism Cloud Drive' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Eject CFexpress Card' })).toBeInTheDocument();

    // Polite status footer
    const status = screen.getByTestId('mounted-volumes-status');
    expect(status).toHaveAttribute('aria-live', 'polite');
    expect(status).toHaveTextContent('Active: Desktop (/Users/studio/Desktop)');
  });

  it('selects favorites, smart folders, local drives, and network/cloud volumes while updating aria-current and polite status', () => {
    const onSelectLocation = vi.fn();
    render(<MountedVolumesSidebar onSelectLocation={onSelectLocation} />);

    // Select a favorite
    const documents = screen.getByTestId('places-item-fav-documents');
    fireEvent.click(documents);
    expect(documents).toHaveAttribute('aria-current', 'location');
    expect(screen.getByTestId('places-item-fav-desktop')).not.toHaveAttribute('aria-current');
    expect(onSelectLocation).toHaveBeenNthCalledWith(
      1,
      'fav-documents',
      '/Users/studio/Documents',
      'Documents'
    );
    expect(screen.getByTestId('mounted-volumes-status')).toHaveTextContent(
      'Selected Documents (/Users/studio/Documents)'
    );

    // Select a smart folder
    const starred = screen.getByTestId('places-item-smart-starred');
    fireEvent.click(starred);
    expect(starred).toHaveAttribute('aria-current', 'location');
    expect(documents).not.toHaveAttribute('aria-current');
    expect(onSelectLocation).toHaveBeenNthCalledWith(
      2,
      'smart-starred',
      'smart://starred',
      'Starred'
    );
    expect(screen.getByTestId('mounted-volumes-status')).toHaveTextContent(
      'Selected Starred (smart://starred)'
    );

    // Select a local drive
    const nvme = screen.getByTestId('volume-select-vol-system-nvme');
    fireEvent.click(nvme);
    expect(nvme).toHaveAttribute('aria-current', 'location');
    expect(starred).not.toHaveAttribute('aria-current');
    expect(onSelectLocation).toHaveBeenNthCalledWith(3, 'vol-system-nvme', '/', 'System NVMe');
    expect(screen.getByTestId('mounted-volumes-status')).toHaveTextContent(
      'Selected System NVMe (/)'
    );

    // Select a network mount
    const nas = screen.getByTestId('volume-select-vol-studio-nas');
    fireEvent.click(nas);
    expect(nas).toHaveAttribute('aria-current', 'location');
    expect(nvme).not.toHaveAttribute('aria-current');
    expect(onSelectLocation).toHaveBeenNthCalledWith(
      4,
      'vol-studio-nas',
      '/Volumes/StudioNAS',
      'Studio NAS (SMB)'
    );
    expect(screen.getByTestId('mounted-volumes-status')).toHaveTextContent(
      'Selected Studio NAS (SMB) (/Volumes/StudioNAS)'
    );
  });

  it('collapses and expands all 4 sections via pointer click and IME-safe ArrowLeft/ArrowRight keys', () => {
    render(<MountedVolumesSidebar />);

    const sectionKeys: Array<'favorites' | 'smart' | 'local' | 'mounts'> = [
      'favorites',
      'smart',
      'local',
      'mounts',
    ];

    for (const key of sectionKeys) {
      const toggle = screen.getByTestId(`volumes-section-toggle-${key}`);
      expect(toggle).toHaveAttribute('aria-expanded', 'true');
      expect(screen.getByTestId(`volumes-panel-${key}`)).toBeInTheDocument();

      // Collapse by click
      fireEvent.click(toggle);
      expect(toggle).toHaveAttribute('aria-expanded', 'false');
      expect(screen.queryByTestId(`volumes-panel-${key}`)).toBeNull();

      // Expand by click
      fireEvent.click(toggle);
      expect(toggle).toHaveAttribute('aria-expanded', 'true');
      expect(screen.getByTestId(`volumes-panel-${key}`)).toBeInTheDocument();
    }

    // Keyboard ArrowLeft collapses, second ArrowLeft is no-op, ArrowRight expands, second ArrowRight is no-op
    const favToggle = screen.getByTestId('volumes-section-toggle-favorites');
    fireEvent.keyDown(favToggle, { key: 'ArrowLeft' });
    expect(favToggle).toHaveAttribute('aria-expanded', 'false');
    fireEvent.keyDown(favToggle, { key: 'ArrowLeft' });
    expect(favToggle).toHaveAttribute('aria-expanded', 'false');

    // IME composing ArrowRight must be ignored
    const composingEvent = new KeyboardEvent('keydown', {
      key: 'ArrowRight',
      bubbles: true,
      cancelable: true,
    });
    Object.defineProperty(composingEvent, 'isComposing', { value: true });
    act(() => {
      favToggle.dispatchEvent(composingEvent);
    });
    expect(favToggle).toHaveAttribute('aria-expanded', 'false');

    fireEvent.keyDown(favToggle, { key: 'ArrowRight' });
    expect(favToggle).toHaveAttribute('aria-expanded', 'true');
    fireEvent.keyDown(favToggle, { key: 'ArrowRight' });
    expect(favToggle).toHaveAttribute('aria-expanded', 'true');
  });

  it('applies semantic capacity bar tokens across <75%, 75-89%, >=90% thresholds and sanitizes NaN, Infinity, negative, overflow, and zero-total values', () => {
    const thresholdVolumes: MountedVolumeSpec[] = [
      {
        id: 'cap-74',
        name: 'Info 74',
        mountPath: '/mnt/info74',
        kind: 'local',
        usedGb: 74,
        totalGb: 100,
        ejectable: false,
        mounted: true,
      },
      {
        id: 'cap-75',
        name: 'Warn 75',
        mountPath: '/mnt/warn75',
        kind: 'local',
        usedGb: 75,
        totalGb: 100,
        ejectable: false,
        mounted: true,
      },
      {
        id: 'cap-89',
        name: 'Warn 89',
        mountPath: '/mnt/warn89',
        kind: 'local',
        usedGb: 89,
        totalGb: 100,
        ejectable: false,
        mounted: true,
      },
      {
        id: 'cap-90',
        name: 'Error 90',
        mountPath: '/mnt/err90',
        kind: 'local',
        usedGb: 90,
        totalGb: 100,
        ejectable: false,
        mounted: true,
      },
      {
        id: 'cap-overflow',
        name: 'Overflow',
        mountPath: '/mnt/overflow',
        kind: 'network',
        usedGb: 150,
        totalGb: 100,
        ejectable: true,
        mounted: true,
      },
      {
        id: 'cap-nan-used',
        name: 'NaN Used',
        mountPath: '/mnt/nan',
        kind: 'cloud',
        usedGb: Number.NaN,
        totalGb: 500,
        ejectable: true,
        mounted: true,
      },
      {
        id: 'cap-zero-total',
        name: 'Zero Total',
        mountPath: '/mnt/zero',
        kind: 'removable',
        usedGb: 250,
        totalGb: 0,
        ejectable: true,
        mounted: true,
      },
      {
        id: 'cap-neg-total',
        name: 'Negative Total',
        mountPath: '/mnt/neg-total',
        kind: 'removable',
        usedGb: 50,
        totalGb: -200,
        ejectable: true,
        mounted: true,
      },
      {
        id: 'cap-inf',
        name: 'Infinite Metrics',
        mountPath: '/mnt/inf',
        kind: 'cloud',
        usedGb: Number.POSITIVE_INFINITY,
        totalGb: Number.NaN,
        ejectable: true,
        mounted: true,
      },
      {
        id: 'cap-neg-used',
        name: 'Negative Used',
        mountPath: '/mnt/neg-used',
        kind: 'network',
        usedGb: -40,
        totalGb: 100,
        ejectable: true,
        mounted: true,
      },
    ];

    render(<MountedVolumesSidebar defaultVolumes={thresholdVolumes} />);

    const expectations: Array<{
      id: string;
      label: string;
      percent: string;
      tone: string;
      color: string;
    }> = [
      {
        id: 'cap-74',
        label: '74/100 GB (74%)',
        percent: '74',
        tone: 'info',
        color: 'var(--prism-info-main)',
      },
      {
        id: 'cap-75',
        label: '75/100 GB (75%)',
        percent: '75',
        tone: 'warning',
        color: 'var(--prism-warning-main)',
      },
      {
        id: 'cap-89',
        label: '89/100 GB (89%)',
        percent: '89',
        tone: 'warning',
        color: 'var(--prism-warning-main)',
      },
      {
        id: 'cap-90',
        label: '90/100 GB (90%)',
        percent: '90',
        tone: 'error',
        color: 'var(--prism-error-main)',
      },
      {
        id: 'cap-overflow',
        label: '100/100 GB (100%)',
        percent: '100',
        tone: 'error',
        color: 'var(--prism-error-main)',
      },
      {
        id: 'cap-nan-used',
        label: '0/500 GB (0%)',
        percent: '0',
        tone: 'info',
        color: 'var(--prism-info-main)',
      },
      {
        id: 'cap-zero-total',
        label: '0/0 GB (0%)',
        percent: '0',
        tone: 'info',
        color: 'var(--prism-info-main)',
      },
      {
        id: 'cap-neg-total',
        label: '0/0 GB (0%)',
        percent: '0',
        tone: 'info',
        color: 'var(--prism-info-main)',
      },
      {
        id: 'cap-inf',
        label: '0/0 GB (0%)',
        percent: '0',
        tone: 'info',
        color: 'var(--prism-info-main)',
      },
      {
        id: 'cap-neg-used',
        label: '0/100 GB (0%)',
        percent: '0',
        tone: 'info',
        color: 'var(--prism-info-main)',
      },
    ];

    for (const item of expectations) {
      expect(screen.getByTestId(`volume-capacity-label-${item.id}`)).toHaveTextContent(item.label);
      const bar = screen.getByTestId(`volume-capacity-bar-${item.id}`);
      expect(bar).toHaveAttribute('role', 'progressbar');
      expect(bar).toHaveAttribute('aria-valuenow', item.percent);
      expect(bar).toHaveAttribute('data-capacity-tone', item.tone);
      const fill = screen.getByTestId(`volume-capacity-fill-${item.id}`);
      expect(fill.style.width).toBe(`${item.percent}%`);
      expect(fill.style.backgroundColor).toBe(item.color);
    }
  });

  it('ejects and remounts network, cloud, and removable mounts via unmounted chips and fires callbacks', () => {
    const onEjectVolume = vi.fn();
    const onRemountVolume = vi.fn();
    render(
      <MountedVolumesSidebar
        onEjectVolume={onEjectVolume}
        onRemountVolume={onRemountVolume}
      />
    );

    // Eject non-active removable mount (CFexpress Card)
    fireEvent.click(screen.getByRole('button', { name: 'Eject CFexpress Card' }));

    expect(onEjectVolume).toHaveBeenCalledWith('vol-cfexpress');
    expect(screen.queryByTestId('volume-row-vol-cfexpress')).toBeNull();
    const unmountedChip = screen.getByTestId('volume-unmounted-chip-vol-cfexpress');
    expect(unmountedChip).toHaveAttribute('data-mounted', 'false');
    expect(unmountedChip).toHaveTextContent('CFexpress Card');
    expect(unmountedChip).toHaveTextContent('Unmounted');
    expect(screen.getByTestId('mounted-volumes-summary')).toHaveTextContent('4/5 Mounted');
    expect(screen.getByTestId('places-item-fav-desktop')).toHaveAttribute(
      'aria-current',
      'location'
    );
    expect(screen.getByTestId('mounted-volumes-status')).toHaveTextContent(
      'Ejected CFexpress Card.'
    );

    // Remount via Mount recovery trigger inside unmounted chip
    fireEvent.click(screen.getByRole('button', { name: 'Mount CFexpress Card' }));

    expect(onRemountVolume).toHaveBeenCalledWith('vol-cfexpress');
    expect(screen.queryByTestId('volume-unmounted-chip-vol-cfexpress')).toBeNull();
    expect(screen.getByTestId('volume-row-vol-cfexpress')).toHaveAttribute('data-mounted', 'true');
    expect(screen.getByTestId('mounted-volumes-summary')).toHaveTextContent('5/5 Mounted');
    expect(screen.getByTestId('mounted-volumes-status')).toHaveTextContent(
      'Remounted CFexpress Card at /Volumes/CFexpress_A.'
    );
  });

  it('resets active selection safely when ejecting the currently active volume across favorite, smart, volume, and empty fallbacks', () => {
    // 1. Default setup: active volume falls back to first favorite (Desktop)
    const onSelectLocation = vi.fn();
    const onEjectVolume = vi.fn();
    const { unmount } = render(
      <MountedVolumesSidebar
        onSelectLocation={onSelectLocation}
        onEjectVolume={onEjectVolume}
      />
    );

    fireEvent.click(screen.getByTestId('volume-select-vol-studio-nas'));
    expect(screen.getByTestId('volume-select-vol-studio-nas')).toHaveAttribute(
      'aria-current',
      'location'
    );

    fireEvent.click(screen.getByRole('button', { name: 'Eject Studio NAS (SMB)' }));
    expect(onEjectVolume).toHaveBeenCalledWith('vol-studio-nas');
    expect(onSelectLocation).toHaveBeenLastCalledWith(
      'fav-desktop',
      '/Users/studio/Desktop',
      'Desktop'
    );
    expect(screen.getByTestId('places-item-fav-desktop')).toHaveAttribute(
      'aria-current',
      'location'
    );
    expect(screen.getByTestId('mounted-volumes-status')).toHaveTextContent(
      'Ejected Studio NAS (SMB). Active location reset to Desktop.'
    );
    unmount();

    // 2. Smart-folder-only places: falls back to first smart folder
    const smartOnlyPlaces: PlacesNavItem[] = [
      { id: 'smart-vault', label: 'Archives', path: 'smart://archives', section: 'smart' },
    ];
    const singleCloud: MountedVolumeSpec[] = [
      {
        id: 'cloud-1',
        name: 'Cloud Vault',
        mountPath: '/Volumes/CloudVault',
        kind: 'cloud',
        usedGb: 100,
        totalGb: 500,
        ejectable: true,
        mounted: true,
      },
    ];
    const onSelectSmartFallback = vi.fn();
    const { unmount: unmountSmart } = render(
      <MountedVolumesSidebar
        places={smartOnlyPlaces}
        defaultVolumes={singleCloud}
        defaultActiveId="cloud-1"
        onSelectLocation={onSelectSmartFallback}
      />
    );

    expect(screen.getByTestId('volume-select-cloud-1')).toHaveAttribute('aria-current', 'location');
    fireEvent.click(screen.getByRole('button', { name: 'Eject Cloud Vault' }));
    expect(onSelectSmartFallback).toHaveBeenCalledWith(
      'smart-vault',
      'smart://archives',
      'Archives'
    );
    expect(screen.getByTestId('places-item-smart-vault')).toHaveAttribute(
      'aria-current',
      'location'
    );
    unmountSmart();

    // 3. No places, two volumes: falls back to remaining mounted volume
    const twoVolumes: MountedVolumeSpec[] = [
      {
        id: 'rem-1',
        name: 'Card A',
        mountPath: '/Volumes/CardA',
        kind: 'removable',
        usedGb: 50,
        totalGb: 128,
        ejectable: true,
        mounted: true,
      },
      {
        id: 'local-1',
        name: 'Internal SSD',
        mountPath: '/',
        kind: 'local',
        usedGb: 200,
        totalGb: 500,
        ejectable: false,
        mounted: true,
      },
    ];
    const onSelectVolFallback = vi.fn();
    const { unmount: unmountVol } = render(
      <MountedVolumesSidebar
        places={[]}
        defaultVolumes={twoVolumes}
        onSelectLocation={onSelectVolFallback}
      />
    );

    // Initial selection picks first mounted volume ('rem-1') when places is empty
    expect(screen.getByTestId('volume-select-rem-1')).toHaveAttribute('aria-current', 'location');
    fireEvent.click(screen.getByRole('button', { name: 'Eject Card A' }));
    expect(onSelectVolFallback).toHaveBeenCalledWith('local-1', '/', 'Internal SSD');
    expect(screen.getByTestId('volume-select-local-1')).toHaveAttribute('aria-current', 'location');
    unmountVol();

    // 4. No places, single ejectable volume: clears selection cleanly without invoking onSelectLocation
    const onSelectNone = vi.fn();
    render(
      <MountedVolumesSidebar
        places={[]}
        defaultVolumes={singleCloud}
        onSelectLocation={onSelectNone}
      />
    );
    expect(screen.getByTestId('volume-select-cloud-1')).toHaveAttribute('aria-current', 'location');
    fireEvent.click(screen.getByRole('button', { name: 'Eject Cloud Vault' }));
    expect(onSelectNone).not.toHaveBeenCalled();
    expect(screen.getByTestId('mounted-volumes-summary')).toHaveTextContent('0/1 Mounted');
    expect(screen.getByTestId('mounted-volumes-status')).toHaveTextContent(
      'Ejected Cloud Vault. No active location selected.'
    );
  });

  it('supports controlled activeId mode and uncontrolled defaultActiveId mode', () => {
    const onEjectVolume = vi.fn();

    function ControlledHarness() {
      const [activeId, setActiveId] = useState<string>('fav-projects');
      return (
        <MountedVolumesSidebar
          title="Controlled Studio Rail"
          activeId={activeId}
          onSelectLocation={(id) => setActiveId(id)}
          onEjectVolume={onEjectVolume}
        />
      );
    }

    const { unmount } = render(<ControlledHarness />);
    expect(screen.getByRole('heading', { name: 'Controlled Studio Rail' })).toBeInTheDocument();
    expect(screen.getByTestId('places-item-fav-projects')).toHaveAttribute(
      'aria-current',
      'location'
    );

    fireEvent.click(screen.getByTestId('volume-select-vol-prism-cloud'));
    expect(screen.getByTestId('volume-select-vol-prism-cloud')).toHaveAttribute(
      'aria-current',
      'location'
    );
    expect(screen.getByTestId('places-item-fav-projects')).not.toHaveAttribute('aria-current');

    // Ejecting active volume in controlled mode notifies parent to reset selection
    fireEvent.click(screen.getByRole('button', { name: 'Eject Prism Cloud Drive' }));
    expect(onEjectVolume).toHaveBeenCalledWith('vol-prism-cloud');
    expect(screen.getByTestId('places-item-fav-desktop')).toHaveAttribute(
      'aria-current',
      'location'
    );
    unmount();

    // Uncontrolled defaultActiveId
    render(<MountedVolumesSidebar defaultActiveId="smart-trash" />);
    expect(screen.getByTestId('places-item-smart-trash')).toHaveAttribute(
      'aria-current',
      'location'
    );
    expect(screen.getByTestId('mounted-volumes-status')).toHaveTextContent(
      'Active: Trash (smart://trash)'
    );
  });

  it('supports IME-safe ArrowDown, ArrowUp, Home, and End keyboard traversal across visible expanded locations', () => {
    render(<MountedVolumesSidebar />);

    const desktop = screen.getByTestId('places-item-fav-desktop');
    const documents = screen.getByTestId('places-item-fav-documents');
    const cfexpress = screen.getByTestId('volume-select-vol-cfexpress');

    act(() => {
      desktop.focus();
    });
    expect(document.activeElement).toBe(desktop);

    // ArrowDown -> Documents
    fireEvent.keyDown(desktop, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(documents);

    // End -> last visible mounted volume (CFexpress Card)
    fireEvent.keyDown(documents, { key: 'End' });
    expect(document.activeElement).toBe(cfexpress);

    // ArrowDown wraps back to Desktop
    fireEvent.keyDown(cfexpress, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(desktop);

    // ArrowUp wraps to CFexpress Card
    fireEvent.keyDown(desktop, { key: 'ArrowUp' });
    expect(document.activeElement).toBe(cfexpress);

    // Home -> Desktop
    fireEvent.keyDown(cfexpress, { key: 'Home' });
    expect(document.activeElement).toBe(desktop);

    // Unhandled key leaves focus unchanged
    fireEvent.keyDown(desktop, { key: 'x' });
    expect(document.activeElement).toBe(desktop);

    // IME composing keydown must be ignored
    const composingEvent = new KeyboardEvent('keydown', {
      key: 'ArrowDown',
      bubbles: true,
      cancelable: true,
    });
    Object.defineProperty(composingEvent, 'isComposing', { value: true });
    act(() => {
      desktop.dispatchEvent(composingEvent);
    });
    expect(document.activeElement).toBe(desktop);

    // Collapsing sections and ejecting a mount excludes them from traversal cleanly
    fireEvent.click(screen.getByTestId('volumes-section-toggle-smart'));
    fireEvent.click(screen.getByTestId('volumes-section-toggle-local'));
    fireEvent.click(screen.getByRole('button', { name: 'Eject CFexpress Card' }));

    act(() => {
      desktop.focus();
    });
    fireEvent.keyDown(desktop, { key: 'End' });
    expect(document.activeElement).toBe(screen.getByTestId('volume-select-vol-prism-cloud'));
  });

  it('blocks all interactions when disabled is true across sections, items, eject, and remount controls', () => {
    const onSelectLocation = vi.fn();
    const onEjectVolume = vi.fn();
    const onRemountVolume = vi.fn();

    const mixedVolumes: MountedVolumeSpec[] = [
      {
        id: 'mounted-nas',
        name: 'Mounted NAS',
        mountPath: '/Volumes/NAS',
        kind: 'network',
        usedGb: 400,
        totalGb: 1000,
        ejectable: true,
        mounted: true,
      },
      {
        id: 'unmounted-usb',
        name: 'Unmounted USB',
        mountPath: '/Volumes/USB',
        kind: 'removable',
        usedGb: 10,
        totalGb: 64,
        ejectable: true,
        mounted: false,
      },
    ];

    render(
      <MountedVolumesSidebar
        disabled
        defaultVolumes={mixedVolumes}
        onSelectLocation={onSelectLocation}
        onEjectVolume={onEjectVolume}
        onRemountVolume={onRemountVolume}
        data-testid="disabled-rail"
      />
    );

    const root = screen.getByTestId('disabled-rail');
    expect(root).toHaveAttribute('aria-disabled', 'true');
    expect(root).toHaveAttribute('data-disabled', 'true');

    const favToggle = screen.getByTestId('volumes-section-toggle-favorites');
    const docsBtn = screen.getByTestId('places-item-fav-documents');
    const nasSelect = screen.getByTestId('volume-select-mounted-nas');
    const nasEject = screen.getByTestId('volume-eject-mounted-nas');
    const usbMount = screen.getByTestId('volume-mount-unmounted-usb');

    expect(favToggle).toBeDisabled();
    expect(docsBtn).toBeDisabled();
    expect(nasSelect).toBeDisabled();
    expect(nasEject).toBeDisabled();
    expect(usbMount).toBeDisabled();

    fireEvent.click(favToggle);
    fireEvent.keyDown(favToggle, { key: 'ArrowLeft' });
    fireEvent.click(docsBtn);
    fireEvent.keyDown(docsBtn, { key: 'ArrowDown' });
    fireEvent.click(nasSelect);
    fireEvent.click(nasEject);
    fireEvent.click(usbMount);

    expect(favToggle).toHaveAttribute('aria-expanded', 'true');
    expect(onSelectLocation).not.toHaveBeenCalled();
    expect(onEjectVolume).not.toHaveBeenCalled();
    expect(onRemountVolume).not.toHaveBeenCalled();
    expect(screen.getByTestId('mounted-volumes-summary')).toHaveTextContent('1/2 Mounted');
  });

  it('renders XSS payloads strictly as literal text, deduplicates IDs, sanitizes blank metadata, and handles empty states cleanly', () => {
    const adversarialPlaces: PlacesNavItem[] = [
      {
        id: 'xss-fav',
        label: '<script>alert("xss")</script>',
        path: '<img src=x onerror=alert(1)>',
        section: 'favorite',
        count: -7,
      },
      {
        id: 'xss-fav',
        label: 'Duplicate Place Dropped',
        path: '/dup',
        section: 'favorite',
      },
      {
        id: 'blank-smart',
        label: '   ',
        path: '   ',
        section: 'smart',
        count: Number.NaN,
      },
    ];

    const adversarialVolumes: MountedVolumeSpec[] = [
      {
        id: 'xss-vol',
        name: '<svg onload=alert(1)>',
        mountPath: '<script>evil()</script>',
        kind: 'network',
        usedGb: 120,
        totalGb: 400,
        ejectable: true,
        mounted: true,
      },
      {
        id: 'xss-vol',
        name: 'Duplicate Volume Dropped',
        mountPath: '/dup-vol',
        kind: 'network',
        usedGb: 10,
        totalGb: 100,
        ejectable: true,
        mounted: true,
      },
      {
        id: 'blank-vol',
        name: '   ',
        mountPath: '   ',
        kind: 'local',
        usedGb: 50,
        totalGb: 200,
        ejectable: false,
        mounted: true,
      },
    ];

    const { container, unmount } = render(
      <MountedVolumesSidebar
        title="   "
        places={adversarialPlaces}
        defaultVolumes={adversarialVolumes}
      />
    );

    // Blank title falls back cleanly
    expect(
      screen.getByRole('heading', { name: 'Places & Mounted Volumes' })
    ).toBeInTheDocument();

    // XSS strings rendered strictly as literal text with zero injected tags
    expect(screen.getByTestId('places-item-xss-fav')).toHaveTextContent(
      '<script>alert("xss")</script>'
    );
    expect(screen.getByTestId('places-item-xss-fav')).toHaveTextContent(
      '<img src=x onerror=alert(1)>'
    );
    expect(screen.getByTestId('places-count-xss-fav')).toHaveTextContent('0');
    expect(screen.getByTestId('places-item-blank-smart')).toHaveTextContent('blank-smart');
    expect(screen.getByTestId('places-count-blank-smart')).toHaveTextContent('0');
    expect(screen.getByTestId('volume-select-xss-vol')).toHaveTextContent('<svg onload=alert(1)>');
    expect(screen.getByTestId('volume-select-xss-vol')).toHaveTextContent(
      '<script>evil()</script>'
    );
    expect(screen.getByTestId('volume-select-blank-vol')).toHaveTextContent('blank-vol');
    expect(screen.queryByText('Duplicate Place Dropped')).toBeNull();
    expect(screen.queryByText('Duplicate Volume Dropped')).toBeNull();
    expect(container.querySelector('script')).toBeNull();
    expect(container.querySelector('img')).toBeNull();
    unmount();

    // Fully empty sidebar renders all 4 section empty states and 0/0 Mounted
    render(<MountedVolumesSidebar places={[]} defaultVolumes={[]} />);
    expect(screen.getByTestId('volumes-empty-favorites')).toHaveTextContent('No favorite places');
    expect(screen.getByTestId('volumes-empty-smart')).toHaveTextContent('No smart folders');
    expect(screen.getByTestId('volumes-empty-local')).toHaveTextContent(
      'No local drives attached'
    );
    expect(screen.getByTestId('volumes-empty-mounts')).toHaveTextContent(
      'No network or cloud mounts'
    );
    expect(screen.getByTestId('mounted-volumes-summary')).toHaveTextContent('0/0 Mounted');
    expect(screen.getByTestId('mounted-volumes-status')).toHaveTextContent(
      'No active location selected'
    );
  });
});
