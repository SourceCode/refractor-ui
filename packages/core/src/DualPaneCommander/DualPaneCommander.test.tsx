import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import {
  DualPaneCommander as BarrelDualPaneCommander,
  type CommanderActionKindMap,
  type CommanderPaneSideMap,
} from './index';
import {
  DualPaneCommander,
  type CommanderActionKind,
  type CommanderFileEntry,
  type CommanderPaneSide,
} from './DualPaneCommander';

describe('DualPaneCommander', () => {
  it('renders default dual panes, optical styling, formatted sizes, React 19 ref, and theme overrides', () => {
    const ref = createRef<HTMLDivElement>();

    render(
      <PrismThemeProvider
        theme={{
          components: {
            DualPaneCommander: {
              className: 'theme-dual-pane',
              style: { letterSpacing: '0.2px' },
            },
          },
        }}
      >
        <DualPaneCommander
          ref={ref}
          className="local-dual-pane"
          xstyle={{ '--prism-slab-blur-px': '20px' }}
          style={{ marginTop: '8px' }}
          data-testid="commander-root"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('commander-root');
    expect(ref.current).toBe(root);
    expect(DualPaneCommander.displayName).toBe('DualPaneCommander');
    expect(root).toHaveAttribute('role', 'region');
    expect(root).toHaveAttribute('aria-labelledby');
    expect(root).toHaveAttribute('data-active-pane', 'left');
    expect(root).toHaveClass(
      'refractor-dual-pane-commander',
      'prism-slab',
      'theme-dual-pane',
      'local-dual-pane'
    );
    expect(root).toHaveStyle({ letterSpacing: '0.2px', marginTop: '8px' });
    expect(root.style.getPropertyValue('--prism-slab-blur-px')).toBe('20px');

    expect(screen.getByRole('heading', { name: 'Dual-Pane Commander' })).toBeInTheDocument();
    expect(screen.getByTestId('dual-pane-active-indicator')).toHaveTextContent('Active: Left Pane');

    // Default paths & optical active highlight on left pane
    expect(screen.getByTestId('dual-pane-path-left')).toHaveTextContent(
      '/Volumes/StudioNVMe/Masters'
    );
    expect(screen.getByTestId('dual-pane-path-right')).toHaveTextContent(
      '/Volumes/NAS-Backup/Masters'
    );
    expect(screen.getByTestId('dual-pane-left')).toHaveAttribute('data-active', 'true');
    expect(screen.getByTestId('dual-pane-right')).not.toHaveAttribute('data-active');
    expect(screen.getByTestId('dual-pane-left').style.boxShadow).toContain(
      'var(--prism-primary-main)'
    );

    // Formatted sizes (Folder, MB, KB)
    expect(screen.getByTestId('dual-pane-row-left-left-luts')).toHaveTextContent('Folder');
    expect(screen.getByTestId('dual-pane-row-left-left-grade')).toHaveTextContent('46.0 MB');
    expect(screen.getByTestId('dual-pane-row-left-left-notes')).toHaveTextContent('18.0 KB');
    expect(screen.getByTestId('dual-pane-row-right-right-manifest')).toHaveTextContent('6.0 KB');

    // Initial directional labels & disabled transfer buttons until selection is made
    expect(screen.getByTestId('dual-pane-action-copy')).toHaveTextContent('Copy ->');
    expect(screen.getByTestId('dual-pane-action-copy')).toBeDisabled();
    expect(screen.getByTestId('dual-pane-action-move')).toHaveTextContent('Move ->');
    expect(screen.getByTestId('dual-pane-action-move')).toBeDisabled();
    expect(screen.getByTestId('dual-pane-action-compare')).toHaveAttribute('aria-pressed', 'false');

    // Polite live status region
    const status = screen.getByTestId('dual-pane-status');
    expect(status).toHaveAttribute('role', 'status');
    expect(status).toHaveAttribute('aria-live', 'polite');
    expect(status).toHaveTextContent('Left Pane active');
  });

  it('switches active pane between left and right via pane surface clicks and header buttons', () => {
    render(<DualPaneCommander data-testid="switch-commander" />);

    const root = screen.getByTestId('switch-commander');
    expect(root).toHaveAttribute('data-active-pane', 'left');

    // Click right pane section container
    fireEvent.click(screen.getByTestId('dual-pane-right'));
    expect(root).toHaveAttribute('data-active-pane', 'right');
    expect(screen.getByTestId('dual-pane-right')).toHaveAttribute('data-active', 'true');
    expect(screen.getByTestId('dual-pane-left')).not.toHaveAttribute('data-active');
    expect(screen.getByTestId('dual-pane-activate-right')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('dual-pane-activate-left')).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByTestId('dual-pane-action-copy')).toHaveTextContent('<- Copy');
    expect(screen.getByTestId('dual-pane-action-move')).toHaveTextContent('<- Move');
    expect(screen.getByTestId('dual-pane-active-indicator')).toHaveTextContent(
      'Active: Right Pane'
    );

    // Click left pane header activation button
    fireEvent.click(screen.getByTestId('dual-pane-activate-left'));
    expect(root).toHaveAttribute('data-active-pane', 'left');
    expect(screen.getByTestId('dual-pane-action-copy')).toHaveTextContent('Copy ->');
    expect(screen.getByTestId('dual-pane-action-move')).toHaveTextContent('Move ->');

    // Click right pane header activation button
    fireEvent.click(screen.getByTestId('dual-pane-activate-right'));
    expect(root).toHaveAttribute('data-active-pane', 'right');
  });

  it('supports multi-select, deselect toggle, Select All, and Clear in both panes', () => {
    render(<DualPaneCommander />);

    const notesRow = screen.getByTestId('dual-pane-row-left-left-notes');
    const gradeRow = screen.getByTestId('dual-pane-row-left-left-grade');

    expect(screen.getByTestId('dual-pane-clear-left')).toBeDisabled();

    // Multi-select two items on left pane
    fireEvent.click(notesRow);
    fireEvent.click(gradeRow);
    expect(notesRow).toHaveAttribute('aria-selected', 'true');
    expect(gradeRow).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByTestId('dual-pane-count-left')).toHaveTextContent('2/5 selected');
    expect(screen.getByTestId('dual-pane-action-copy')).toBeEnabled();
    expect(screen.getByTestId('dual-pane-action-move')).toBeEnabled();

    // Toggle deselect one item
    fireEvent.click(gradeRow);
    expect(gradeRow).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByTestId('dual-pane-count-left')).toHaveTextContent('1/5 selected');

    // Select All on left pane
    fireEvent.click(screen.getByTestId('dual-pane-select-all-left'));
    expect(screen.getByTestId('dual-pane-count-left')).toHaveTextContent('5/5 selected');
    expect(screen.getByTestId('dual-pane-status')).toHaveTextContent(
      'Selected all 5 items in Left Pane.'
    );

    // Clear on left pane
    fireEvent.click(screen.getByTestId('dual-pane-clear-left'));
    expect(screen.getByTestId('dual-pane-count-left')).toHaveTextContent('5 items');
    expect(screen.getByTestId('dual-pane-clear-left')).toBeDisabled();
    expect(screen.getByTestId('dual-pane-action-copy')).toBeDisabled();
    expect(screen.getByTestId('dual-pane-status')).toHaveTextContent(
      'Cleared selection in Left Pane.'
    );

    // Select All & Clear on right pane also activates right pane
    fireEvent.click(screen.getByTestId('dual-pane-select-all-right'));
    expect(screen.getByTestId('dual-pane-right')).toHaveAttribute('data-active', 'true');
    expect(screen.getByTestId('dual-pane-count-right')).toHaveTextContent('5/5 selected');
    fireEvent.click(screen.getByTestId('dual-pane-clear-right'));
    expect(screen.getByTestId('dual-pane-count-right')).toHaveTextContent('5 items');
  });

  it('copies selected items left->right and right->left (updating same-name entries and appending unique items with collision-safe IDs)', () => {
    const onAction = vi.fn<
      (
        action: CommanderActionKind,
        sourceSide: CommanderPaneSide,
        affectedNames: ReadonlyArray<string>
      ) => void
    >();

    render(<DualPaneCommander onAction={onAction} />);

    // Select 1 unique (Studio_Cut_Notes.md) and 1 same-name newer (Final_Color_Grade.mov) in left pane
    fireEvent.click(screen.getByTestId('dual-pane-row-left-left-grade'));
    fireEvent.click(screen.getByTestId('dual-pane-row-left-left-notes'));
    fireEvent.click(screen.getByTestId('dual-pane-action-copy'));

    expect(onAction).toHaveBeenLastCalledWith('copy', 'left', [
      'Final_Color_Grade.mov',
      'Studio_Cut_Notes.md',
    ]);
    expect(screen.getByTestId('dual-pane-status')).toHaveTextContent(
      'Copied 2 items from Left Pane to Right Pane: Final_Color_Grade.mov, Studio_Cut_Notes.md.'
    );

    // Left pane keeps all 5 items intact
    expect(screen.getByTestId('dual-pane-count-left')).toHaveTextContent('5 items');
    // Right pane now has 6 items (existing Final_Color_Grade.mov updated in place, Studio_Cut_Notes.md appended)
    expect(screen.getByTestId('dual-pane-count-right')).toHaveTextContent('6 items');
    expect(screen.getByTestId('dual-pane-row-right-right-grade')).toHaveTextContent('46.0 MB');
    expect(screen.getByTestId('dual-pane-row-right-right-grade')).toHaveTextContent('Today, 14:40');
    expect(
      within(screen.getByTestId('dual-pane-list-right')).getByText('Studio_Cut_Notes.md')
    ).toBeInTheDocument();

    // Now select 1 unique file on right pane (Archive_Manifest.json) and copy right -> left
    fireEvent.click(screen.getByTestId('dual-pane-row-right-right-manifest'));
    expect(screen.getByTestId('dual-pane-action-copy')).toHaveTextContent('<- Copy');
    fireEvent.click(screen.getByTestId('dual-pane-action-copy'));

    expect(onAction).toHaveBeenLastCalledWith('copy', 'right', ['Archive_Manifest.json']);
    expect(screen.getByTestId('dual-pane-status')).toHaveTextContent(
      'Copied 1 item from Right Pane to Left Pane: Archive_Manifest.json.'
    );
    expect(screen.getByTestId('dual-pane-count-left')).toHaveTextContent('6 items');
    expect(
      within(screen.getByTestId('dual-pane-list-left')).getByText('Archive_Manifest.json')
    ).toBeInTheDocument();
  });

  it('moves selected items in both directions and removes them from the source pane', () => {
    const onAction = vi.fn();
    render(<DualPaneCommander onAction={onAction} />);

    // Move Studio_Cut_Notes.md from Left -> Right
    fireEvent.click(screen.getByTestId('dual-pane-row-left-left-notes'));
    fireEvent.click(screen.getByTestId('dual-pane-action-move'));

    expect(onAction).toHaveBeenLastCalledWith('move', 'left', ['Studio_Cut_Notes.md']);
    expect(screen.getByTestId('dual-pane-status')).toHaveTextContent(
      'Moved 1 item from Left Pane to Right Pane: Studio_Cut_Notes.md.'
    );
    expect(screen.getByTestId('dual-pane-count-left')).toHaveTextContent('4 items');
    expect(screen.getByTestId('dual-pane-count-right')).toHaveTextContent('6 items');
    expect(screen.queryByTestId('dual-pane-row-left-left-notes')).toBeNull();
    expect(
      within(screen.getByTestId('dual-pane-list-right')).getByText('Studio_Cut_Notes.md')
    ).toBeInTheDocument();

    // Move Poster_Hero_4K.png (same-name update) and Archive_Manifest.json (unique) from Right -> Left
    fireEvent.click(screen.getByTestId('dual-pane-row-right-right-poster'));
    fireEvent.click(screen.getByTestId('dual-pane-row-right-right-manifest'));
    fireEvent.click(screen.getByTestId('dual-pane-action-move'));

    expect(onAction).toHaveBeenLastCalledWith('move', 'right', [
      'Poster_Hero_4K.png',
      'Archive_Manifest.json',
    ]);
    expect(screen.getByTestId('dual-pane-count-right')).toHaveTextContent('4 items');
    expect(screen.getByTestId('dual-pane-count-left')).toHaveTextContent('5 items');
    expect(screen.queryByTestId('dual-pane-row-right-right-poster')).toBeNull();
    expect(screen.queryByTestId('dual-pane-row-right-right-manifest')).toBeNull();
    expect(screen.getByTestId('dual-pane-row-left-left-poster')).toHaveTextContent('4.0 MB');
  });

  it('toggles Compare mode with Only Here, Newer, Match, and Older optical badges and handles identical/single-diff cases', () => {
    const onAction = vi.fn();
    render(<DualPaneCommander onAction={onAction} data-testid="compare-commander" />);

    const compareBtn = screen.getByTestId('dual-pane-action-compare');
    fireEvent.click(compareBtn);

    expect(compareBtn).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('compare-commander')).toHaveAttribute('data-compare-active', 'true');
    expect(screen.getByTestId('dual-pane-compare-indicator')).toHaveTextContent('Compare Active');
    expect(onAction).toHaveBeenLastCalledWith('compare', 'left', [
      'Final_Color_Grade.mov',
      'Studio_Cut_Notes.md',
      'Poster_Hero_4K.png',
      'Archive_Manifest.json',
    ]);
    expect(screen.getByTestId('dual-pane-status')).toHaveTextContent('4 differences highlighted');

    // Verify all 4 compare badge statuses and their semantic CSS tokens
    const leftOnlyHere = screen.getByTestId('dual-pane-badge-left-left-notes');
    expect(leftOnlyHere).toHaveTextContent('Only Here');
    expect(leftOnlyHere.style.color).toBe('var(--prism-info-main)');

    const leftNewer = screen.getByTestId('dual-pane-badge-left-left-grade');
    expect(leftNewer).toHaveTextContent('Newer');
    expect(leftNewer.style.color).toBe('var(--prism-warning-main)');

    const leftMatch = screen.getByTestId('dual-pane-badge-left-left-score');
    expect(leftMatch).toHaveTextContent('Match');
    expect(leftMatch.style.color).toBe('var(--prism-success-main)');

    const leftOlder = screen.getByTestId('dual-pane-badge-left-left-poster');
    expect(leftOlder).toHaveTextContent('Older');
    expect(leftOlder.style.color).toBe('var(--prism-text-secondary)');

    const rightNewer = screen.getByTestId('dual-pane-badge-right-right-poster');
    expect(rightNewer).toHaveTextContent('Newer');
    const rightOnlyHere = screen.getByTestId('dual-pane-badge-right-right-manifest');
    expect(rightOnlyHere).toHaveTextContent('Only Here');

    // Toggle Compare OFF
    fireEvent.click(compareBtn);
    expect(compareBtn).toHaveAttribute('aria-pressed', 'false');
    expect(screen.queryByTestId('dual-pane-badge-left-left-notes')).toBeNull();
    expect(screen.getByTestId('dual-pane-status')).toHaveTextContent('Compare mode disabled.');
  });

  it('announces identical match and singular difference counts in Compare mode', () => {
    const sharedFile: CommanderFileEntry = {
      id: 'same-1',
      name: 'Release.iso',
      kind: 'file',
      sizeBytes: 2_147_483_648,
      modifiedTimestamp: 1732200000000,
      modifiedLabel: 'Today, 12:00',
    };

    const { unmount } = render(
      <DualPaneCommander
        defaultLeftItems={[sharedFile]}
        defaultRightItems={[{ ...sharedFile, id: 'same-2' }]}
      />
    );

    // Also verifies GB size formatting
    expect(screen.getByTestId('dual-pane-row-left-same-1')).toHaveTextContent('2.00 GB');

    fireEvent.click(screen.getByTestId('dual-pane-action-compare'));
    expect(screen.getByTestId('dual-pane-status')).toHaveTextContent(
      'Compare mode enabled — both panes match identically.'
    );
    unmount();

    // Single difference case
    render(
      <DualPaneCommander
        defaultLeftItems={[sharedFile]}
        defaultRightItems={[]}
      />
    );
    fireEvent.click(screen.getByTestId('dual-pane-action-compare'));
    expect(screen.getByTestId('dual-pane-status')).toHaveTextContent(
      'Compare mode enabled — 1 difference highlighted across panes.'
    );
  });

  it('syncs missing and newer files in one click from either active pane and reports up-to-date when repeated', () => {
    const onAction = vi.fn();
    render(<DualPaneCommander onAction={onAction} />);

    // Left -> Right sync copies Final_Color_Grade.mov (newer) and Studio_Cut_Notes.md (missing)
    fireEvent.click(screen.getByTestId('dual-pane-action-sync'));
    expect(onAction).toHaveBeenLastCalledWith('sync', 'left', [
      'Final_Color_Grade.mov',
      'Studio_Cut_Notes.md',
    ]);
    expect(screen.getByTestId('dual-pane-status')).toHaveTextContent(
      'Synced 2 items from Left Pane to Right Pane: Final_Color_Grade.mov, Studio_Cut_Notes.md.'
    );
    expect(screen.getByTestId('dual-pane-count-right')).toHaveTextContent('6 items');

    // Syncing again Left -> Right has nothing missing or newer
    fireEvent.click(screen.getByTestId('dual-pane-action-sync'));
    expect(onAction).toHaveBeenLastCalledWith('sync', 'left', []);
    expect(screen.getByTestId('dual-pane-status')).toHaveTextContent(
      'Right Pane is already up to date with Left Pane.'
    );

    // Switch to Right pane and sync Right -> Left (Poster_Hero_4K.png newer + Archive_Manifest.json missing)
    fireEvent.click(screen.getByTestId('dual-pane-activate-right'));
    fireEvent.click(screen.getByTestId('dual-pane-action-sync'));
    expect(onAction).toHaveBeenLastCalledWith('sync', 'right', [
      'Poster_Hero_4K.png',
      'Archive_Manifest.json',
    ]);
    expect(screen.getByTestId('dual-pane-count-left')).toHaveTextContent('6 items');
  });

  it('swaps left and right paths, file lists, and selections cleanly via Swap Panes', () => {
    const onAction = vi.fn();
    render(<DualPaneCommander onAction={onAction} />);

    // Select one entry on left pane before swapping
    fireEvent.click(screen.getByTestId('dual-pane-row-left-left-notes'));
    expect(screen.getByTestId('dual-pane-count-left')).toHaveTextContent('1/5 selected');

    fireEvent.click(screen.getByTestId('dual-pane-action-swap'));

    expect(onAction).toHaveBeenLastCalledWith('swap', 'left', [
      '/Volumes/NAS-Backup/Masters',
      '/Volumes/StudioNVMe/Masters',
    ]);
    expect(screen.getByTestId('dual-pane-path-left')).toHaveTextContent(
      '/Volumes/NAS-Backup/Masters'
    );
    expect(screen.getByTestId('dual-pane-path-right')).toHaveTextContent(
      '/Volumes/StudioNVMe/Masters'
    );
    expect(
      within(screen.getByTestId('dual-pane-list-left')).getByText('Archive_Manifest.json')
    ).toBeInTheDocument();
    expect(
      within(screen.getByTestId('dual-pane-list-right')).getByText('Studio_Cut_Notes.md')
    ).toBeInTheDocument();
    // Left selection migrated cleanly to right pane
    expect(screen.getByTestId('dual-pane-count-right')).toHaveTextContent('1/5 selected');
    expect(screen.getByTestId('dual-pane-count-left')).toHaveTextContent('5 items');
    expect(screen.getByTestId('dual-pane-status')).toHaveTextContent('Swapped panes');
  });

  it('handles empty pane states, blank title/paths, custom aria-label, and edge-case byte formatting', () => {
    const edgeEntries: ReadonlyArray<CommanderFileEntry> = [
      {
        id: 'tiny-file',
        name: 'flag.txt',
        kind: 'file',
        sizeBytes: 512,
        modifiedTimestamp: 1732200000000,
        modifiedLabel: 'Just now',
      },
      {
        id: 'bad-size-file',
        name: 'corrupt.bin',
        kind: 'file',
        sizeBytes: -42,
        modifiedTimestamp: 1732200000000,
        modifiedLabel: 'Unknown',
      },
      {
        id: 'sized-folder',
        name: 'Bundles',
        kind: 'folder',
        sizeBytes: 4096,
        modifiedTimestamp: 1732200000000,
        modifiedLabel: 'Today',
      },
    ];

    render(
      <DualPaneCommander
        title="   "
        leftPath="   "
        rightPath="  "
        aria-label="Custom Storage Commander"
        defaultLeftItems={edgeEntries}
        defaultRightItems={[]}
        data-testid="empty-right-commander"
      />
    );

    const root = screen.getByTestId('empty-right-commander');
    expect(root).toHaveAttribute('aria-label', 'Custom Storage Commander');
    expect(root).not.toHaveAttribute('aria-labelledby');
    expect(screen.getByRole('heading', { name: 'Dual-Pane Commander' })).toBeInTheDocument();
    expect(screen.getByTestId('dual-pane-path-left')).toHaveTextContent(
      '/Volumes/StudioNVMe/Masters'
    );
    expect(screen.getByTestId('dual-pane-path-right')).toHaveTextContent(
      '/Volumes/NAS-Backup/Masters'
    );

    expect(screen.getByTestId('dual-pane-row-left-tiny-file')).toHaveTextContent('512 B');
    expect(screen.getByTestId('dual-pane-row-left-bad-size-file')).toHaveTextContent('0 B');
    expect(screen.getByTestId('dual-pane-row-left-sized-folder')).toHaveTextContent('4.0 KB');

    // Empty right pane status and disabled mini controls
    expect(screen.getByTestId('dual-pane-empty-right')).toHaveTextContent('Empty directory');
    expect(screen.getByTestId('dual-pane-select-all-right')).toBeDisabled();
    expect(screen.getByTestId('dual-pane-clear-right')).toBeDisabled();
  });

  it('supports IME-safe Space and Enter keyboard selection on file rows', () => {
    render(<DualPaneCommander />);

    const rightRow = screen.getByTestId('dual-pane-row-right-right-manifest');

    // IME composing Enter & Space must be ignored
    fireEvent.keyDown(rightRow, { key: 'Enter', isComposing: true });
    fireEvent.keyDown(rightRow, { key: ' ', isComposing: true });
    expect(rightRow).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByTestId('dual-pane-left')).toHaveAttribute('data-active', 'true');

    // Unrelated key must be ignored
    fireEvent.keyDown(rightRow, { key: 'Escape' });
    expect(rightRow).toHaveAttribute('aria-selected', 'false');

    // Space toggles selection ON and activates right pane
    fireEvent.keyDown(rightRow, { key: ' ' });
    expect(rightRow).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByTestId('dual-pane-right')).toHaveAttribute('data-active', 'true');

    // Enter toggles selection OFF
    fireEvent.keyDown(rightRow, { key: 'Enter' });
    expect(rightRow).toHaveAttribute('aria-selected', 'false');
  });

  it('enforces disabled state across all panes, rows, and toolbar controls', () => {
    const onAction = vi.fn();
    render(
      <DualPaneCommander disabled onAction={onAction} data-testid="disabled-commander" />
    );

    const root = screen.getByTestId('disabled-commander');
    expect(root).toHaveAttribute('aria-disabled', 'true');
    expect(root).toHaveAttribute('data-disabled', 'true');

    expect(screen.getByTestId('dual-pane-activate-left')).toBeDisabled();
    expect(screen.getByTestId('dual-pane-activate-right')).toBeDisabled();
    expect(screen.getByTestId('dual-pane-select-all-left')).toBeDisabled();
    expect(screen.getByTestId('dual-pane-clear-left')).toBeDisabled();
    expect(screen.getByTestId('dual-pane-row-left-left-notes')).toBeDisabled();
    expect(screen.getByTestId('dual-pane-action-copy')).toBeDisabled();
    expect(screen.getByTestId('dual-pane-action-move')).toBeDisabled();
    expect(screen.getByTestId('dual-pane-action-compare')).toBeDisabled();
    expect(screen.getByTestId('dual-pane-action-sync')).toBeDisabled();
    expect(screen.getByTestId('dual-pane-action-swap')).toBeDisabled();

    // Clicking disabled pane container or triggering keydown on disabled row does nothing
    fireEvent.click(screen.getByTestId('dual-pane-right'));
    fireEvent.keyDown(screen.getByTestId('dual-pane-row-left-left-notes'), { key: 'Enter' });
    expect(root).toHaveAttribute('data-active-pane', 'left');
    expect(screen.getByTestId('dual-pane-row-left-left-notes')).toHaveAttribute(
      'aria-selected',
      'false'
    );
    expect(onAction).not.toHaveBeenCalled();
  });

  it('neutralizes __proto__ prototype pollution, XSS payloads, duplicate IDs, and colliding copy IDs while verifying barrel exports', () => {
    const sideMap: CommanderPaneSideMap = { left: true, right: true };
    const actionMap: CommanderActionKindMap = {
      copy: true,
      move: true,
      compare: true,
      sync: true,
      swap: true,
    };
    expect(sideMap.left && sideMap.right).toBe(true);
    expect(actionMap.copy && actionMap.swap).toBe(true);

    const xssPayload = '<script>window.__commanderXss=1</script><img src=x onerror=alert(1)>';
    const onAction = vi.fn();

    const leftAdversarial: ReadonlyArray<CommanderFileEntry> = [
      {
        id: 'proto-left',
        name: '__proto__',
        kind: 'file',
        sizeBytes: 2048,
        modifiedTimestamp: 1732300000000,
        modifiedLabel: 'Today, 16:00',
      },
      {
        id: 'dup-id',
        name: xssPayload,
        kind: 'file',
        sizeBytes: 1024,
        modifiedTimestamp: 1732300000000,
        modifiedLabel: xssPayload,
      },
      {
        id: 'dup-id',
        name: 'constructor',
        kind: 'file',
        sizeBytes: 3072,
        modifiedTimestamp: 1732200000000,
        modifiedLabel: 'Yesterday',
      },
    ];

    const rightAdversarial: ReadonlyArray<CommanderFileEntry> = [
      {
        id: 'proto-left-copy-1',
        name: 'toString',
        kind: 'file',
        sizeBytes: 1536,
        modifiedTimestamp: 1732100000000,
        modifiedLabel: 'Nov 19',
      },
      {
        id: 'ctor-right',
        name: 'constructor',
        kind: 'file',
        sizeBytes: 3072,
        modifiedTimestamp: 1732200000000,
        modifiedLabel: 'Yesterday',
      },
    ];

    render(
      <BarrelDualPaneCommander
        title={xssPayload}
        leftPath={xssPayload}
        rightPath="/safe/backup"
        defaultLeftItems={leftAdversarial}
        defaultRightItems={rightAdversarial}
        onAction={onAction}
      />
    );

    // XSS rendered strictly as literal text — zero injected DOM elements
    expect(screen.getByRole('heading', { name: xssPayload })).toBeInTheDocument();
    expect(document.querySelector('script')).toBeNull();
    expect(document.querySelector('img')).toBeNull();

    // Compare mode accurately classifies __proto__ as Only Here and constructor as Match
    fireEvent.click(screen.getByTestId('dual-pane-action-compare'));
    expect(screen.getByTestId('dual-pane-badge-left-proto-left')).toHaveTextContent('Only Here');
    expect(screen.getByTestId('dual-pane-badge-right-ctor-right')).toHaveTextContent('Match');
    expect(screen.getByTestId('dual-pane-badge-right-proto-left-copy-1')).toHaveTextContent(
      'Only Here'
    );

    // Copying proto-left when 'proto-left-copy-1' already exists in right pane skips to a collision-safe ID ('proto-left-copy-2')
    fireEvent.click(screen.getByTestId('dual-pane-row-left-proto-left'));
    fireEvent.click(screen.getByTestId('dual-pane-action-copy'));

    expect(onAction).toHaveBeenLastCalledWith('copy', 'left', ['__proto__']);
    expect(screen.getByTestId('dual-pane-row-right-proto-left-copy-2')).toHaveTextContent(
      '__proto__'
    );
    expect(screen.getByTestId('dual-pane-badge-left-proto-left')).toHaveTextContent('Match');
    expect(Object.prototype.hasOwnProperty.call(Object.prototype, 'proto-left')).toBe(false);
  });
});
