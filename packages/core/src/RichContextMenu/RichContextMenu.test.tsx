import { createRef, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import {
  RichContextMenu,
  type RichContextMenuAction,
  type RichContextMenuProps,
  type RichContextQuickActionId,
  type RichContextQuickActionIdMap,
  type RichContextTagTone,
  type RichContextTagToneMap,
} from './index';

function dispatchComposingKeyDown(target: HTMLElement, key: string): void {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
  Object.defineProperty(event, 'isComposing', { value: true });
  target.dispatchEvent(event);
}

describe('RichContextMenu', () => {
  it('renders inline prism-slab menu by default with quick actions, 6 token-mapped color tags, vertical commands, React 19 ref, and theme overrides', () => {
    const ref = createRef<HTMLDivElement>();

    render(
      <PrismThemeProvider
        theme={{
          components: {
            RichContextMenu: {
              className: 'theme-rich-context-menu',
              style: { maxWidth: '540px' },
            },
          },
        }}
      >
        <RichContextMenu
          ref={ref}
          className="local-rich-context-menu"
          xstyle={{ '--prism-blur-px': '20px' }}
          style={{ padding: '18px' }}
          data-testid="rich-menu-root"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('rich-menu-root');
    expect(RichContextMenu.displayName).toBe('RichContextMenu');
    expect(ref.current).toBe(root);
    expect(root).toHaveClass(
      'refractor-rich-context-menu',
      'prism-slab',
      'theme-rich-context-menu',
      'local-rich-context-menu'
    );
    expect(root).toHaveStyle({ maxWidth: '540px', padding: '18px' });
    expect(root).toHaveAttribute('role', 'region');
    expect(root).toHaveAttribute('aria-label', 'Rich Context Menu');
    expect(root).toHaveAttribute('data-open', 'true');
    expect(root).toHaveAttribute('data-tag-count', '0');

    // Default target context header & open toggle
    expect(screen.getByTestId('rich-context-target-label')).toHaveTextContent('HeroPrism_v4.png');
    const toggle = screen.getByTestId('rich-context-toggle');
    expect(toggle).toHaveTextContent('Hide Menu');
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByTestId('rich-context-menu-panel')).toBeInTheDocument();

    // Quick-action icon strip
    const toolbar = screen.getByRole('toolbar', { name: 'Quick actions' });
    expect(toolbar).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cut' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Copy' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Paste' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Rename' })).toBeEnabled();
    const deleteQuickBtn = screen.getByRole('button', { name: 'Delete' });
    expect(deleteQuickBtn).toHaveAttribute('data-destructive', 'true');
    expect(deleteQuickBtn.style.color).toBe('var(--prism-error-main)');

    // 6 semantic optical color-tag dots strictly mapped to --prism-* tokens
    const tagsGroup = screen.getByRole('group', { name: 'Color tags' });
    expect(tagsGroup).toBeInTheDocument();
    const expectedTags: ReadonlyArray<{ tone: RichContextTagTone; label: string; token: string }> =
      [
        { tone: 'primary', label: 'Amber', token: 'var(--prism-primary-main)' },
        { tone: 'rose', label: 'Crimson', token: 'var(--prism-error-main)' },
        { tone: 'emerald', label: 'Emerald', token: 'var(--prism-success-main)' },
        { tone: 'info', label: 'Cobalt', token: 'var(--prism-info-main)' },
        { tone: 'amber', label: 'Gold', token: 'var(--prism-warning-main)' },
        { tone: 'secondary', label: 'Violet', token: 'var(--prism-secondary-main)' },
      ];

    for (const tag of expectedTags) {
      const dot = screen.getByTestId(`rich-context-tag-${tag.tone}`);
      expect(dot).toHaveAttribute('aria-label', tag.label);
      expect(dot).toHaveAttribute('aria-pressed', 'false');
      expect(dot.style.backgroundColor).toBe(tag.token);
    }

    // Zero raw hex/rgb/hsl color literals anywhere in rendered DOM
    const rawColorRe = /(?:#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?)\s*\()/;
    expect(root.innerHTML).not.toMatch(rawColorRe);

    // Default vertical menu items + separator + destructive row
    const menu = screen.getByRole('menu', { name: 'HeroPrism_v4.png actions' });
    expect(menu).toBeInTheDocument();
    const menuItems = screen.getAllByRole('menuitem');
    expect(menuItems).toHaveLength(5);
    expect(screen.getByTestId('rich-context-action-get-info')).toHaveTextContent('Get Info⌘I');
    expect(screen.getByTestId('rich-context-action-duplicate')).toHaveTextContent('Duplicate⌘D');
    expect(screen.getByTestId('rich-context-action-compress')).toHaveTextContent(
      'Compress to Archive'
    );
    expect(screen.getByTestId('rich-context-action-share-link')).toHaveTextContent('Share Link…');
    expect(screen.getByTestId('rich-context-divider-move-to-trash')).toHaveAttribute(
      'role',
      'separator'
    );
    const trashRow = screen.getByTestId('rich-context-action-move-to-trash');
    expect(trashRow).toHaveTextContent('Move to Trash⌘⌫');
    expect(trashRow).toHaveAttribute('data-destructive', 'true');
    expect(trashRow.style.color).toBe('var(--prism-error-main)');

    // Polite live status strip starts ready
    const status = screen.getByTestId('rich-context-status');
    expect(status).toHaveAttribute('role', 'status');
    expect(status).toHaveAttribute('aria-live', 'polite');
    expect(status).toHaveTextContent('Ready · HeroPrism_v4.png');
  });

  it('triggers all 5 quick actions, respects disablePaste, and supports toolbar keyboard navigation & Escape', () => {
    const onQuickAction = vi.fn<(actionId: RichContextQuickActionId) => void>();

    const { rerender } = render(<RichContextMenu onQuickAction={onQuickAction} />);

    const allQuickIds: ReadonlyArray<RichContextQuickActionId> = [
      'cut',
      'copy',
      'paste',
      'rename',
      'delete',
    ];
    for (const id of allQuickIds) {
      fireEvent.click(screen.getByTestId(`rich-context-quick-${id}`));
      expect(onQuickAction).toHaveBeenLastCalledWith(id);
    }
    expect(onQuickAction).toHaveBeenCalledTimes(5);
    expect(screen.getByTestId('rich-context-status')).toHaveTextContent(
      'Quick action: Delete (⌫) — HeroPrism_v4.png'
    );
    expect(screen.getByTestId('rich-context-status-dot').style.backgroundColor).toBe(
      'var(--prism-error-main)'
    );

    // Keyboard Enter and Space activate quick actions
    fireEvent.keyDown(screen.getByTestId('rich-context-quick-cut'), { key: 'Enter' });
    expect(onQuickAction).toHaveBeenLastCalledWith('cut');
    fireEvent.keyDown(screen.getByTestId('rich-context-quick-rename'), { key: ' ' });
    expect(onQuickAction).toHaveBeenLastCalledWith('rename');
    expect(screen.getByTestId('rich-context-status-dot').style.backgroundColor).toBe(
      'var(--prism-primary-main)'
    );

    // Unrelated key does nothing
    fireEvent.keyDown(screen.getByTestId('rich-context-quick-cut'), { key: 'Tab' });
    expect(onQuickAction).toHaveBeenCalledTimes(7);

    // Enable disablePaste -> Paste button disabled and skipped during ArrowRight/ArrowLeft/Home/End navigation
    rerender(<RichContextMenu disablePaste onQuickAction={onQuickAction} />);

    const cutBtn = screen.getByTestId('rich-context-quick-cut');
    const copyBtn = screen.getByTestId('rich-context-quick-copy');
    const pasteBtn = screen.getByTestId('rich-context-quick-paste');
    const renameBtn = screen.getByTestId('rich-context-quick-rename');
    const deleteBtn = screen.getByTestId('rich-context-quick-delete');

    expect(pasteBtn).toBeDisabled();
    expect(pasteBtn.style.color).toBe('var(--prism-text-disabled)');
    fireEvent.click(pasteBtn);
    fireEvent.keyDown(pasteBtn, { key: 'Enter' });
    expect(onQuickAction).toHaveBeenCalledTimes(7);

    // ArrowRight from Copy skips disabled Paste -> Rename
    copyBtn.focus();
    fireEvent.keyDown(copyBtn, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(renameBtn);

    // ArrowLeft from Rename skips disabled Paste -> Copy
    fireEvent.keyDown(renameBtn, { key: 'ArrowLeft' });
    expect(document.activeElement).toBe(copyBtn);

    // End jumps to Delete, Home jumps to Cut
    fireEvent.keyDown(copyBtn, { key: 'End' });
    expect(document.activeElement).toBe(deleteBtn);
    fireEvent.keyDown(deleteBtn, { key: 'Home' });
    expect(document.activeElement).toBe(cutBtn);

    // Escape on a quick-action button dismisses the menu and restores focus to toggle button
    fireEvent.keyDown(cutBtn, { key: 'Escape' });
    expect(screen.queryByTestId('rich-context-menu-panel')).not.toBeInTheDocument();
    expect(document.activeElement).toBe(screen.getByTestId('rich-context-toggle'));
  });

  it('toggles all 6 semantic color tags in both uncontrolled and controlled modes with keyboard support', () => {
    const onTagsChange = vi.fn<(tags: ReadonlyArray<RichContextTagTone>) => void>();

    const { unmount } = render(
      <RichContextMenu defaultSelectedTags={['primary']} onTagsChange={onTagsChange} />
    );

    expect(screen.getByTestId('rich-context-tag-primary')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('rich-context-header-tag-dots')).toBeInTheDocument();
    expect(screen.getByTestId('rich-context-surface-tag-summary')).toHaveTextContent('Tags: Amber');

    // Add remaining 5 tones via click, Enter, and Space
    fireEvent.click(screen.getByTestId('rich-context-tag-rose'));
    expect(onTagsChange).toHaveBeenLastCalledWith(['primary', 'rose']);
    expect(screen.getByTestId('rich-context-status')).toHaveTextContent(
      'Tag added: Crimson (2 active)'
    );

    fireEvent.keyDown(screen.getByTestId('rich-context-tag-emerald'), { key: 'Enter' });
    expect(onTagsChange).toHaveBeenLastCalledWith(['primary', 'rose', 'emerald']);

    fireEvent.keyDown(screen.getByTestId('rich-context-tag-info'), { key: ' ' });
    expect(onTagsChange).toHaveBeenLastCalledWith(['primary', 'rose', 'emerald', 'info']);

    fireEvent.click(screen.getByTestId('rich-context-tag-amber'));
    fireEvent.click(screen.getByTestId('rich-context-tag-secondary'));
    expect(onTagsChange).toHaveBeenLastCalledWith([
      'primary',
      'rose',
      'emerald',
      'info',
      'amber',
      'secondary',
    ]);
    expect(screen.getByTestId('rich-context-surface-tag-summary')).toHaveTextContent(
      'Tags: Amber, Crimson, Emerald, Cobalt, Gold, Violet'
    );

    // Unrelated key on tag dot does nothing
    fireEvent.keyDown(screen.getByTestId('rich-context-tag-primary'), { key: 'a' });
    expect(onTagsChange).toHaveBeenCalledTimes(5);

    // Toggle off primary -> Tag removed announcement
    fireEvent.click(screen.getByTestId('rich-context-tag-primary'));
    expect(onTagsChange).toHaveBeenLastCalledWith([
      'rose',
      'emerald',
      'info',
      'amber',
      'secondary',
    ]);
    expect(screen.getByTestId('rich-context-tag-primary')).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByTestId('rich-context-status')).toHaveTextContent(
      'Tag removed: Amber (5 active)'
    );

    // Escape on tag dot dismisses menu and focuses toggle button
    fireEvent.keyDown(screen.getByTestId('rich-context-tag-rose'), { key: 'Escape' });
    expect(screen.queryByTestId('rich-context-menu-panel')).not.toBeInTheDocument();
    expect(document.activeElement).toBe(screen.getByTestId('rich-context-toggle'));
    unmount();

    // Controlled mode harness
    const controlledSpy = vi.fn<(tags: ReadonlyArray<RichContextTagTone>) => void>();
    function ControlledTagsHarness() {
      const [tags, setTags] = useState<ReadonlyArray<RichContextTagTone>>(['info']);
      return (
        <RichContextMenu
          selectedTags={tags}
          onTagsChange={(next) => {
            controlledSpy(next);
            setTags(next);
          }}
        />
      );
    }

    render(<ControlledTagsHarness />);
    expect(screen.getByTestId('rich-context-tag-info')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('rich-context-tag-emerald')).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(screen.getByTestId('rich-context-tag-emerald'));
    expect(controlledSpy).toHaveBeenLastCalledWith(['info', 'emerald']);
    expect(screen.getByTestId('rich-context-tag-emerald')).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(screen.getByTestId('rich-context-tag-info'));
    expect(controlledSpy).toHaveBeenLastCalledWith(['emerald']);
    expect(screen.getByTestId('rich-context-tag-info')).toHaveAttribute('aria-pressed', 'false');
  });

  it('supports vertical menu commands, destructive styling, disabled item skipping, Arrow/Home/End/Enter/Space, and dynamic active fallback', () => {
    const onSelectAction = vi.fn<(actionId: string) => void>();
    const customActions: ReadonlyArray<RichContextMenuAction> = [
      { id: 'info', label: 'Get Info', shortcut: '⌘I' },
      { id: 'locked', label: 'Unlock Asset', shortcut: '⌘L', disabled: true },
      { id: 'archive', label: 'Compress to Archive' },
      { id: 'trash', label: 'Move to Trash', shortcut: '⌘⌫', destructive: true, dividerBefore: true },
    ];

    const { rerender } = render(
      <RichContextMenu actions={customActions} onSelectAction={onSelectAction} />
    );

    const menu = screen.getByRole('menu');
    const infoBtn = screen.getByTestId('rich-context-action-info');
    const lockedBtn = screen.getByTestId('rich-context-action-locked');
    const archiveBtn = screen.getByTestId('rich-context-action-archive');
    const trashBtn = screen.getByTestId('rich-context-action-trash');

    expect(infoBtn).toHaveAttribute('tabindex', '0');
    expect(lockedBtn).toBeDisabled();
    expect(lockedBtn).toHaveAttribute('aria-disabled', 'true');
    expect(lockedBtn).toHaveAttribute('tabindex', '-1');
    expect(lockedBtn.style.color).toBe('var(--prism-text-disabled)');

    // Clicking or pressing Enter on disabled row is ignored
    fireEvent.click(lockedBtn);
    fireEvent.keyDown(lockedBtn, { key: 'Enter' });
    expect(onSelectAction).not.toHaveBeenCalled();

    // ArrowDown from disabled row falls back safely to index 0 -> moves to Archive
    fireEvent.keyDown(lockedBtn, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(archiveBtn);

    // ArrowDown from Info skips Locked -> Archive -> Trash -> wraps to Info
    act(() => {
      infoBtn.focus();
    });
    fireEvent.keyDown(infoBtn, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(archiveBtn);
    expect(archiveBtn).toHaveAttribute('tabindex', '0');

    fireEvent.keyDown(archiveBtn, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(trashBtn);

    fireEvent.keyDown(trashBtn, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(infoBtn);

    // ArrowUp wraps to Trash, then Archive, then skips Locked -> Info
    fireEvent.keyDown(infoBtn, { key: 'ArrowUp' });
    expect(document.activeElement).toBe(trashBtn);

    fireEvent.keyDown(trashBtn, { key: 'ArrowUp' });
    expect(document.activeElement).toBe(archiveBtn);

    fireEvent.keyDown(archiveBtn, { key: 'ArrowUp' });
    expect(document.activeElement).toBe(infoBtn);

    // End jumps to Trash, Home jumps to Info
    fireEvent.keyDown(infoBtn, { key: 'End' });
    expect(document.activeElement).toBe(trashBtn);
    fireEvent.keyDown(trashBtn, { key: 'Home' });
    expect(document.activeElement).toBe(infoBtn);

    // Enter activates Get Info (with shortcut)
    fireEvent.keyDown(infoBtn, { key: 'Enter' });
    expect(onSelectAction).toHaveBeenLastCalledWith('info');
    expect(screen.getByTestId('rich-context-status')).toHaveTextContent(
      'Action executed: Get Info (⌘I)'
    );

    // Space activates Compress to Archive (no shortcut)
    fireEvent.keyDown(archiveBtn, { key: ' ' });
    expect(onSelectAction).toHaveBeenLastCalledWith('archive');
    expect(screen.getByTestId('rich-context-status')).toHaveTextContent(
      'Action executed: Compress to Archive'
    );

    // Clicking destructive action fires callback and tints status dot with --prism-error-main
    fireEvent.click(trashBtn);
    expect(onSelectAction).toHaveBeenLastCalledWith('trash');
    expect(screen.getByTestId('rich-context-status')).toHaveTextContent(
      'Action executed: Move to Trash (⌘⌫)'
    );
    expect(screen.getByTestId('rich-context-status-dot').style.backgroundColor).toBe(
      'var(--prism-error-main)'
    );

    // KeyDown dispatched directly on role="menu" uses effectiveActiveActionId ('trash')
    fireEvent.keyDown(menu, { key: 'Enter' });
    expect(onSelectAction).toHaveBeenLastCalledWith('trash');

    // Unrelated key on menu does nothing
    const callsBeforeTab = onSelectAction.mock.calls.length;
    fireEvent.keyDown(menu, { key: 'Tab' });
    expect(onSelectAction).toHaveBeenCalledTimes(callsBeforeTab);

    // Disabling the currently active action ('trash') falls back roving tabIndex to first enabled ('info')
    rerender(
      <RichContextMenu
        actions={customActions.map((act) =>
          act.id === 'trash' ? { ...act, disabled: true } : act
        )}
        onSelectAction={onSelectAction}
      />
    );
    expect(screen.getByTestId('rich-context-action-info')).toHaveAttribute('tabindex', '0');
    expect(screen.getByTestId('rich-context-action-trash')).toHaveAttribute('tabindex', '-1');
  });

  it('dismisses on Hide Menu or Escape and reopens via Open Menu or right-click contextmenu', () => {
    render(<RichContextMenu defaultOpen={false} />);

    const toggle = screen.getByTestId('rich-context-toggle');
    const surface = screen.getByTestId('rich-context-surface');

    expect(toggle).toHaveTextContent('Open Menu');
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByTestId('rich-context-menu-panel')).not.toBeInTheDocument();

    // Right-click on preview surface opens menu and prevents default browser context menu
    const ctxEvent = new MouseEvent('contextmenu', { bubbles: true, cancelable: true });
    fireEvent(surface, ctxEvent);
    expect(ctxEvent.defaultPrevented).toBe(true);
    expect(screen.getByTestId('rich-context-menu-panel')).toBeInTheDocument();
    expect(toggle).toHaveTextContent('Hide Menu');
    expect(screen.getByTestId('rich-context-status')).toHaveTextContent(
      'Context menu opened for HeroPrism_v4.png'
    );

    // Escape on vertical menu dismisses cleanly and focuses toggle
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' });
    expect(screen.queryByTestId('rich-context-menu-panel')).not.toBeInTheDocument();
    expect(toggle).toHaveTextContent('Open Menu');
    expect(document.activeElement).toBe(toggle);
    expect(screen.getByTestId('rich-context-status')).toHaveTextContent(
      'Context menu hidden for HeroPrism_v4.png'
    );

    // Toggle button opens and hides menu cleanly
    fireEvent.click(toggle);
    expect(screen.getByTestId('rich-context-menu-panel')).toBeInTheDocument();
    expect(toggle).toHaveTextContent('Hide Menu');

    fireEvent.click(toggle);
    expect(screen.queryByTestId('rich-context-menu-panel')).not.toBeInTheDocument();
    expect(toggle).toHaveTextContent('Open Menu');
  });

  it('guards all keyboard handlers during active IME composition', () => {
    const onQuickAction = vi.fn<(actionId: RichContextQuickActionId) => void>();
    const onSelectAction = vi.fn<(actionId: string) => void>();
    const onTagsChange = vi.fn<(tags: ReadonlyArray<RichContextTagTone>) => void>();

    render(
      <RichContextMenu
        onQuickAction={onQuickAction}
        onSelectAction={onSelectAction}
        onTagsChange={onTagsChange}
      />
    );

    const cutBtn = screen.getByTestId('rich-context-quick-cut');
    const amberTag = screen.getByTestId('rich-context-tag-primary');
    const menu = screen.getByRole('menu');
    const getInfoRow = screen.getByTestId('rich-context-action-get-info');

    for (const key of ['Enter', ' ', 'ArrowRight', 'Escape']) {
      dispatchComposingKeyDown(cutBtn, key);
    }
    for (const key of ['Enter', ' ', 'Escape']) {
      dispatchComposingKeyDown(amberTag, key);
    }
    for (const key of ['ArrowDown', 'ArrowUp', 'Home', 'End', 'Enter', ' ', 'Escape']) {
      dispatchComposingKeyDown(getInfoRow, key);
      dispatchComposingKeyDown(menu, key);
    }

    expect(onQuickAction).not.toHaveBeenCalled();
    expect(onTagsChange).not.toHaveBeenCalled();
    expect(onSelectAction).not.toHaveBeenCalled();
    expect(screen.getByTestId('rich-context-menu-panel')).toBeInTheDocument();
  });

  it('blocks all interactions cleanly when disabled', () => {
    const onQuickAction = vi.fn<(actionId: RichContextQuickActionId) => void>();
    const onSelectAction = vi.fn<(actionId: string) => void>();
    const onTagsChange = vi.fn<(tags: ReadonlyArray<RichContextTagTone>) => void>();

    const { rerender } = render(
      <RichContextMenu
        disabled
        onQuickAction={onQuickAction}
        onSelectAction={onSelectAction}
        onTagsChange={onTagsChange}
        data-testid="disabled-root"
      />
    );

    const root = screen.getByTestId('disabled-root');
    expect(root).toHaveAttribute('aria-disabled', 'true');
    expect(root).toHaveAttribute('data-disabled', 'true');

    const toggle = screen.getByTestId('rich-context-toggle');
    const surface = screen.getByTestId('rich-context-surface');
    const cutBtn = screen.getByTestId('rich-context-quick-cut');
    const deleteBtn = screen.getByTestId('rich-context-quick-delete');
    const amberTag = screen.getByTestId('rich-context-tag-primary');
    const infoRow = screen.getByTestId('rich-context-action-get-info');
    const menu = screen.getByRole('menu');

    expect(toggle).toBeDisabled();
    expect(cutBtn).toBeDisabled();
    expect(deleteBtn).toBeDisabled();
    expect(deleteBtn.style.color).toBe('var(--prism-text-disabled)');
    expect(amberTag).toBeDisabled();
    expect(infoRow).toBeDisabled();

    fireEvent.click(toggle);
    fireEvent.contextMenu(surface);
    fireEvent.click(cutBtn);
    fireEvent.keyDown(cutBtn, { key: 'Enter' });
    fireEvent.keyDown(cutBtn, { key: 'Escape' });
    fireEvent.click(amberTag);
    fireEvent.keyDown(amberTag, { key: 'Enter' });
    fireEvent.keyDown(amberTag, { key: 'Escape' });
    fireEvent.click(infoRow);
    fireEvent.keyDown(infoRow, { key: 'Enter' });
    fireEvent.keyDown(menu, { key: 'ArrowDown' });
    fireEvent.keyDown(menu, { key: 'Escape' });

    expect(onQuickAction).not.toHaveBeenCalled();
    expect(onTagsChange).not.toHaveBeenCalled();
    expect(onSelectAction).not.toHaveBeenCalled();
    expect(screen.getByTestId('rich-context-menu-panel')).toBeInTheDocument();

    // Also verify disabled with defaultOpen={false} stays closed on right-click
    rerender(<RichContextMenu key="closed-disabled" disabled defaultOpen={false} />);
    fireEvent.contextMenu(screen.getByTestId('rich-context-surface'));
    expect(screen.queryByTestId('rich-context-menu-panel')).not.toBeInTheDocument();
  });

  it('handles empty actions, all-disabled actions, blank targetLabel fallback, XSS literal targetLabel, and exported type maps', () => {
    const onSelectAction = vi.fn<(actionId: string) => void>();

    // 1. Empty actions & blank targetLabel fallback
    const { rerender } = render(
      <RichContextMenu targetLabel="   " actions={[]} onSelectAction={onSelectAction} />
    );

    expect(screen.getByTestId('rich-context-target-label')).toHaveTextContent('HeroPrism_v4.png');
    expect(screen.getByTestId('rich-context-menu-empty')).toHaveTextContent('No actions available');
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'ArrowDown' });
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'Enter' });
    expect(onSelectAction).not.toHaveBeenCalled();

    // 2. All-disabled vertical actions
    rerender(
      <RichContextMenu
        actions={[
          { id: 'd1', label: 'Locked One', disabled: true },
          { id: 'd2', label: 'Locked Two', disabled: true },
        ]}
        onSelectAction={onSelectAction}
      />
    );
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'ArrowDown' });
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'Enter' });
    expect(onSelectAction).not.toHaveBeenCalled();

    // 3. Adversarial XSS payload in targetLabel renders strictly as escaped literal text
    const xssPayload = '<img src=x onerror=alert(1)><script>window.__xss=1</script>';
    rerender(<RichContextMenu targetLabel={xssPayload} data-testid="xss-root" />);

    const xssRoot = screen.getByTestId('xss-root');
    expect(screen.getByTestId('rich-context-target-label')).toHaveTextContent(xssPayload);
    expect(screen.getByTestId('rich-context-status')).toHaveTextContent(`Ready · ${xssPayload}`);
    expect(xssRoot.querySelector('img')).toBeNull();
    expect(xssRoot.querySelector('script')).toBeNull();

    // 4. Extensible variant maps & strict typed props contract
    const quickMap: RichContextQuickActionIdMap = {
      cut: true,
      copy: true,
      paste: true,
      rename: true,
      delete: true,
    };
    const toneMap: RichContextTagToneMap = {
      primary: true,
      rose: true,
      emerald: true,
      info: true,
      amber: true,
      secondary: true,
    };
    const typedProps: RichContextMenuProps = {
      targetLabel: 'OpticalPrism.png',
      defaultSelectedTags: ['primary', 'emerald'],
      disablePaste: false,
      actions: [{ id: 'open', label: 'Open', shortcut: '⌘O' }],
    };

    expect(Object.keys(quickMap)).toEqual(['cut', 'copy', 'paste', 'rename', 'delete']);
    expect(Object.keys(toneMap)).toEqual([
      'primary',
      'rose',
      'emerald',
      'info',
      'amber',
      'secondary',
    ]);
    expect(typedProps.targetLabel).toBe('OpticalPrism.png');
  });
});
