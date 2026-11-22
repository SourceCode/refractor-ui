export const docs = {
  name: 'MountedVolumesSidebar',
  displayName: 'Mounted Volumes Sidebar',
  group: 'File Explorer Navigation & Views',
  category: 'file-explorer-navigation',
  keywords: [
    'sidebar',
    'volumes',
    'mounted',
    'places',
    'favorites',
    'smart-folders',
    'drives',
    'storage',
    'capacity',
    'eject',
    'remount',
    'nas',
    'smb',
    'cloud',
    'removable',
    'file-explorer',
    'navigation',
    'rail',
  ],
  usage: {
    description:
      'Categorized optical-glass Places & Mounted Volumes navigation rail inside a prism-slab featuring four collapsible sections (Favorites, Smart Folders, Local Drives, and Network & Cloud Mounts). Displays active optical location highlighting (`aria-current="location"`), optional item count badges, sanitized token-driven semantic capacity progress bars (`< 75%` `--prism-info-main`, `75–89%` `--prism-warning-main`, `>= 90%` `--prism-error-main`), accessible `Eject <name>` buttons that safely transition volumes into unmounted recovery chips with `Mount` triggers, safe active-selection fallback on ejection, and a polite `aria-live="polite"` status footer.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Pair `activeId` and `onSelectLocation` with your file explorer viewport or breadcrumb header so clicking Favorites, Smart Folders, Local Drives, or Network & Cloud Mounts synchronizes directory state cleanly.',
      },
      {
        guidance: true,
        description:
          'Hook `onEjectVolume` and `onRemountVolume` into native filesystem or virtual mount backends; when an active volume is ejected, `MountedVolumesSidebar` automatically resets focusable selection to a safe fallback location.',
      },
      {
        guidance: false,
        description:
          'Pass unsanitized HTML expecting rich formatting or rely solely on bar color to communicate storage pressure; every label is rendered as literal text and each capacity bar exposes numeric GB/percentage readouts plus `role="progressbar"` metadata.',
      },
    ],
    accessibility: [
      {
        name: 'Collapsible Disclosure Sections & Location Landmarks',
        criterion: '1.3.1 Info and Relationships & 4.1.2 Name, Role, Value',
        requirement:
          'Uses role="region" linked via aria-labelledby, semantic <nav> and <section> landmarks, aria-expanded disclosure headers with aria-controls, aria-current="location" on the active destination, and role="progressbar" capacity meters',
        description:
          'Allows assistive technologies to navigate directly to Favorites, Smart Folders, Local Drives, or Network & Cloud Mounts while clearly announcing expanded state and current directory selection.',
      },
      {
        name: 'IME-Safe Keyboard Navigation, Focus Rings & Live Status',
        criterion: '2.1.1 Keyboard, 2.4.7 Focus Visible & 4.1.3 Status Messages',
        requirement:
          'Supports IME-safe ArrowUp/ArrowDown/Home/End focus traversal across visible locations, ArrowLeft/ArrowRight section collapse/expand on headers, keyboard-only .prism-focus-ring outlines, and an aria-live="polite" status footer',
        description:
          'Announces location changes, volume ejections, active-selection resets, and remount completions without stealing focus or disrupting active IME composition.',
      },
    ],
  },
  props: [
    {
      name: 'title',
      type: 'string',
      defaultValue: "'Places & Mounted Volumes'",
      description: 'Visible navigation rail heading linked to the region via `aria-labelledby`.',
    },
    {
      name: 'places',
      type: 'ReadonlyArray<PlacesNavItem>',
      defaultValue: 'Favorites (Desktop, Documents, Downloads, Projects) + Smart Folders (Recent, Starred, Trash)',
      description: 'Navigation entries grouped into Favorites and Smart Folders sections.',
    },
    {
      name: 'defaultVolumes',
      type: 'ReadonlyArray<MountedVolumeSpec>',
      defaultValue: 'Local Drives (System NVMe, Render Scratch) + Network/Cloud/Removable (Studio NAS (SMB), Prism Cloud Drive, CFexpress Card)',
      description: 'Initial local drives and network/cloud/removable mounts managed by mount/eject controls.',
    },
    {
      name: 'activeId',
      type: 'string',
      defaultValue: 'undefined',
      description: 'Controlled active location identifier across places and mounted volumes.',
    },
    {
      name: 'defaultActiveId',
      type: 'string',
      defaultValue: 'First available favorite place, smart folder, or mounted volume',
      description: 'Initial active location identifier when operating in uncontrolled mode.',
    },
    {
      name: 'onSelectLocation',
      type: '(id: string, path: string, label: string) => void',
      defaultValue: 'undefined',
      description: 'Callback fired when a place or mounted volume is selected or safely reset on active-volume ejection.',
    },
    {
      name: 'onEjectVolume',
      type: '(volumeId: string) => void',
      defaultValue: 'undefined',
      description: 'Callback fired when an ejectable volume is ejected into an unmounted chip.',
    },
    {
      name: 'onRemountVolume',
      type: '(volumeId: string) => void',
      defaultValue: 'undefined',
      description: 'Callback fired when an unmounted volume is recovered via its Mount button.',
    },
    {
      name: 'disabled',
      type: 'boolean',
      defaultValue: 'false',
      description: 'Disables section disclosure headers, location selection, eject/remount controls, and keyboard traversal.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed `--prism-*` CSS custom property and inline optical style overrides.',
    },
  ],
  examples: [
    `<MountedVolumesSidebar\n  onSelectLocation={(id, path, label) => console.warn(id, path, label)}\n/>`,
    `<MountedVolumesSidebar\n  title="Studio Workstation Rail"\n  activeId={activeLocationId}\n  onSelectLocation={(id) => setActiveLocationId(id)}\n  onEjectVolume={(volumeId) => console.warn('Ejected', volumeId)}\n  onRemountVolume={(volumeId) => console.warn('Remounted', volumeId)}\n/>`,
  ],
};

export default docs;
