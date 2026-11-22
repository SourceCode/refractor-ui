import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import {
  WindowSwitcherOverlay,
  type SwitcherWindowItem,
  type SwitcherWindowTone,
  type SwitcherWindowToneMap,
  type WindowSwitcherMode,
  type WindowSwitcherModeMap,
} from './index';

function dispatchComposingKeyDown(
  target: Element | Node | Document | Window,
  key: string
): void {
  const event = new KeyboardEvent('keydown', {
    key,
    bubbles: true,
    cancelable: true,
  });
  Object.defineProperty(event, 'isComposing', { value: true });
  fireEvent(target, event);
}

describe('WindowSwitcherOverlay', () => {
  it('renders 5 realistic default active windows in inline mode with miniature previews, ref passthrough, optical tokens, and theme overrides', () => {
    const ref = createRef<HTMLDivElement>();

    render(
      <PrismThemeProvider
        theme={{
          components: {
            WindowSwitcherOverlay: {
              className: 'theme-switcher-override',
              style: { opacity: '0.97' },
            },
          },
        }}
      >
        <WindowSwitcherOverlay
          ref={ref}
          className="local-switcher-class"
          style={{ letterSpacing: '0.01em' }}
          xstyle={{ '--prism-blur-px': '20px' }}
          aria-label="Workspace window switcher"
          data-testid="switcher-root"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('switcher-root');
    expect(ref.current).toBe(root);
    expect(root).toHaveAttribute('role', 'region');
    expect(root).toHaveAttribute('aria-label', 'Workspace window switcher');
    expect(root).toHaveClass(
      'refractor-window-switcher-overlay',
      'prism-slab',
      'theme-switcher-override',
      'local-switcher-class'
    );
    expect(root).toHaveAttribute('data-mode', 'inline');
    expect(root).toHaveAttribute('data-open', 'true');
    expect(root).toHaveAttribute('data-count', '5');
    expect(root).not.toHaveAttribute('data-disabled');
    expect(root).not.toHaveAttribute('data-empty');
    expect(root).toHaveStyle({ opacity: '0.97' });
    expect(root.style.letterSpacing).toBe('0.01em');
    expect(root.style.getPropertyValue('--prism-blur-px')).toBe('20px');

    const listbox = screen.getByRole('listbox', { name: 'Active windows' });
    expect(listbox).toHaveClass('overflow-x-auto', 'prism-focus-ring');
    expect(listbox).toHaveAttribute('aria-orientation', 'horizontal');
    expect(listbox).toHaveAttribute('tabindex', '0');

    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(5);
    expect(options[0]).toHaveAttribute('aria-selected', 'true');
    expect(options[0]).toHaveAttribute('data-highlighted', 'true');
    expect(options[0]).toHaveAttribute('data-active', 'true');
    expect(options[1]).toHaveAttribute('aria-selected', 'false');
    expect(listbox.getAttribute('aria-activedescendant')).toBe(options[0]?.id);

    // Verify all 5 default realistic applications render
    expect(screen.getByText('Refractor IDE')).toBeInTheDocument();
    expect(screen.getByText('Optical Shader Preview')).toBeInTheDocument();
    expect(screen.getByText('Terminal Multiplexer')).toBeInTheDocument();
    expect(screen.getByText('Design Specs')).toBeInTheDocument();
    expect(screen.getByText('Audio DSP Mixer')).toBeInTheDocument();

    // Miniature optical window thumbnail with tinted header, traffic lights, skeleton lines, workspace pill & close button
    const firstOption = options[0] as HTMLElement;
    expect(
      firstOption.querySelector('[data-part="thumbnail"]')
    ).not.toBeNull();
    expect(
      firstOption.querySelector('[data-part="thumbnail-header"]')
    ).not.toBeNull();
    expect(
      firstOption.querySelector('[data-part="thumbnail-skeleton"]')
    ).not.toBeNull();
    expect(
      firstOption.querySelector('[data-part="workspace-pill"]')
    ).toHaveTextContent('Workspace 1');
    expect(
      within(firstOption).getByRole('button', {
        name: 'Close WindowSwitcherOverlay.tsx',
      })
    ).toBeInTheDocument();

    // Footer telemetry bar
    expect(screen.getByTestId('window-switcher-count')).toHaveTextContent(
      '5 active'
    );
    expect(
      screen.getByTestId('window-switcher-active-title')
    ).toHaveTextContent('Refractor IDE — WindowSwitcherOverlay.tsx');
    expect(
      screen.getByRole('button', { name: 'Previous' })
    ).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Next' })).toBeEnabled();
    expect(
      screen.getByRole('button', { name: 'Focus Window' })
    ).toBeEnabled();

    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-live', 'polite');
    expect(status).toHaveTextContent(
      'Highlighted Refractor IDE — WindowSwitcherOverlay.tsx (1 of 5).'
    );
  });

  it('returns null in overlay mode when open={false} and renders centered frosted modal dialog with backdrop, button, and Escape dismissal when open={true}', () => {
    const onDismiss = vi.fn();
    const ref = createRef<HTMLDivElement>();

    const { container, rerender } = render(
      <WindowSwitcherOverlay
        mode="overlay"
        open={false}
        onDismiss={onDismiss}
      />
    );

    expect(container.firstChild).toBeNull();
    expect(screen.queryByRole('dialog')).toBeNull();

    rerender(
      <WindowSwitcherOverlay
        ref={ref}
        mode="overlay"
        open={true}
        onDismiss={onDismiss}
        className="overlay-custom"
      />
    );

    const backdrop = screen.getByTestId('window-switcher-backdrop');
    expect(ref.current).toBe(backdrop);
    expect(backdrop).toHaveClass(
      'refractor-window-switcher-overlay',
      'fixed',
      'inset-0',
      'overlay-custom'
    );
    expect(backdrop).toHaveAttribute('data-mode', 'overlay');

    const dialog = screen.getByRole('dialog', { name: 'Window switcher' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveClass('prism-slab');

    // Auto-focuses listbox in overlay mode when non-empty
    const listbox = screen.getByRole('listbox', { name: 'Active windows' });
    expect(document.activeElement).toBe(listbox);

    // Clicking inside the dialog panel does NOT dismiss
    fireEvent.click(dialog);
    expect(onDismiss).not.toHaveBeenCalled();

    // Clicking frosted backdrop dismisses
    fireEvent.click(backdrop);
    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('status')).toHaveTextContent(
      'Dismissed window switcher via backdrop.'
    );

    // Clicking the overlay dismiss button calls onDismiss
    fireEvent.click(
      screen.getByRole('button', { name: 'Dismiss window switcher' })
    );
    expect(onDismiss).toHaveBeenCalledTimes(2);
    expect(screen.getByRole('status')).toHaveTextContent(
      'Dismissed window switcher.'
    );

    // Pressing Escape on listbox calls onDismiss exactly once (no double-fire with window listener)
    fireEvent.keyDown(listbox, { key: 'Escape' });
    expect(onDismiss).toHaveBeenCalledTimes(3);
    expect(screen.getByRole('status')).toHaveTextContent(
      'Dismissed window switcher via Escape.'
    );

    // Pressing Escape on dialog itself calls onDismiss exactly once
    fireEvent.keyDown(dialog, { key: 'Escape' });
    expect(onDismiss).toHaveBeenCalledTimes(4);

    // Pressing Escape on window directly calls onDismiss once
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onDismiss).toHaveBeenCalledTimes(5);

    // Non-Escape key on window does nothing
    fireEvent.keyDown(window, { key: 'a' });
    expect(onDismiss).toHaveBeenCalledTimes(5);
  });

  it('auto-focuses the dialog panel when overlay opens with an empty window list', () => {
    render(<WindowSwitcherOverlay mode="overlay" open={true} windows={[]} />);
    const dialog = screen.getByRole('dialog');
    expect(document.activeElement).toBe(dialog);
    expect(screen.getByRole('status')).toHaveTextContent('No active windows');
  });

  it('supports full ArrowRight, ArrowLeft, Tab, Shift+Tab, Home, End wraparound cycling and footer Previous/Next buttons', () => {
    render(<WindowSwitcherOverlay />);

    const listbox = screen.getByRole('listbox', { name: 'Active windows' });
    const getSelectedId = () =>
      screen
        .getAllByRole('option')
        .find((opt) => opt.getAttribute('aria-selected') === 'true')
        ?.getAttribute('data-window-id');

    expect(getSelectedId()).toBe('refractor-ide');

    // ArrowRight -> 2nd window
    fireEvent.keyDown(listbox, { key: 'ArrowRight' });
    expect(getSelectedId()).toBe('optical-shader-preview');

    // Tab -> 3rd window
    fireEvent.keyDown(listbox, { key: 'Tab' });
    expect(getSelectedId()).toBe('terminal-multiplexer');

    // End -> last window (5th)
    fireEvent.keyDown(listbox, { key: 'End' });
    expect(getSelectedId()).toBe('audio-dsp-mixer');
    expect(
      screen.getByTestId('window-switcher-active-title')
    ).toHaveTextContent('Audio DSP Mixer — Master Bus · 48 kHz');

    // ArrowRight wraps from last to first
    fireEvent.keyDown(listbox, { key: 'ArrowRight' });
    expect(getSelectedId()).toBe('refractor-ide');

    // ArrowLeft wraps from first to last
    fireEvent.keyDown(listbox, { key: 'ArrowLeft' });
    expect(getSelectedId()).toBe('audio-dsp-mixer');

    // Shift+Tab cycles backward to 4th
    fireEvent.keyDown(listbox, { key: 'Tab', shiftKey: true });
    expect(getSelectedId()).toBe('design-specs');

    // Home jumps to 1st
    fireEvent.keyDown(listbox, { key: 'Home' });
    expect(getSelectedId()).toBe('refractor-ide');

    // Unhandled key leaves highlight unchanged
    fireEvent.keyDown(listbox, { key: 'x' });
    expect(getSelectedId()).toBe('refractor-ide');

    // Footer Previous wraps to last; Next wraps back to first
    fireEvent.click(screen.getByRole('button', { name: 'Previous' }));
    expect(getSelectedId()).toBe('audio-dsp-mixer');

    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(getSelectedId()).toBe('refractor-ide');

    // Direct keyDown on inline root region (target === currentTarget) also navigates
    const region = screen.getByRole('region', { name: 'Window switcher' });
    fireEvent.keyDown(region, { key: 'ArrowRight' });
    expect(getSelectedId()).toBe('optical-shader-preview');

    // Bubbling non-Escape key from child button does not double-cycle on container
    const nextButton = screen.getByRole('button', { name: 'Next' });
    fireEvent.keyDown(nextButton, { key: 'ArrowRight' });
    expect(getSelectedId()).toBe('optical-shader-preview');
  });

  it('commits window focus via Enter, Space, card click, and Focus Window button', () => {
    const onFocusWindow = vi.fn();
    render(<WindowSwitcherOverlay onFocusWindow={onFocusWindow} />);

    const listbox = screen.getByRole('listbox', { name: 'Active windows' });
    const options = screen.getAllByRole('option');

    // Navigate to 2nd window and commit with Enter
    fireEvent.keyDown(listbox, { key: 'ArrowRight' });
    fireEvent.keyDown(listbox, { key: 'Enter' });
    expect(onFocusWindow).toHaveBeenCalledTimes(1);
    expect(onFocusWindow).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: 'optical-shader-preview' })
    );
    expect(options[1]).toHaveAttribute('data-active', 'true');
    expect(options[0]).not.toHaveAttribute('data-active');
    expect(screen.getByRole('status')).toHaveTextContent(
      'Focused Optical Shader Preview — Caustic Dispersion Pass.'
    );

    // Navigate to 3rd window and commit with Space
    fireEvent.keyDown(listbox, { key: 'ArrowRight' });
    fireEvent.keyDown(listbox, { key: ' ' });
    expect(onFocusWindow).toHaveBeenCalledTimes(2);
    expect(onFocusWindow).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: 'terminal-multiplexer' })
    );

    // Click 5th card directly -> highlights and commits focus
    fireEvent.click(options[4] as HTMLElement);
    expect(onFocusWindow).toHaveBeenCalledTimes(3);
    expect(onFocusWindow).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: 'audio-dsp-mixer' })
    );
    expect(options[4]).toHaveAttribute('aria-selected', 'true');
    expect(options[4]).toHaveAttribute('data-active', 'true');

    // Click Focus Window footer button -> commits currently highlighted window
    fireEvent.click(screen.getByRole('button', { name: 'Focus Window' }));
    expect(onFocusWindow).toHaveBeenCalledTimes(4);
    expect(onFocusWindow).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: 'audio-dsp-mixer' })
    );
  });

  it('closes windows via quick Close button, Delete, and Backspace, adjusts highlight index safely, and transitions to empty state', () => {
    const onCloseWindow = vi.fn();
    const onFocusWindow = vi.fn();
    const onDismiss = vi.fn();

    render(
      <WindowSwitcherOverlay
        onCloseWindow={onCloseWindow}
        onFocusWindow={onFocusWindow}
        onDismiss={onDismiss}
      />
    );

    const listbox = screen.getByRole('listbox', { name: 'Active windows' });

    // Highlight 3rd window ('terminal-multiplexer', index 2)
    fireEvent.keyDown(listbox, { key: 'ArrowRight' });
    fireEvent.keyDown(listbox, { key: 'ArrowRight' });
    expect(
      screen.getAllByRole('option')[2]?.getAttribute('aria-selected')
    ).toBe('true');

    // Close 1st window via its quick Close button -> does NOT call onFocusWindow, keeps highlight on 'terminal-multiplexer' (now index 1)
    const firstCloseBtn = screen.getByRole('button', {
      name: 'Close WindowSwitcherOverlay.tsx',
    });

    // Pressing Enter on the close button is ignored by listbox handler (won't call onFocusWindow)
    fireEvent.keyDown(firstCloseBtn, { key: 'Enter' });
    expect(onFocusWindow).not.toHaveBeenCalled();

    // Pressing Escape on the close button calls onDismiss
    fireEvent.keyDown(firstCloseBtn, { key: 'Escape' });
    expect(onDismiss).toHaveBeenCalledTimes(1);

    fireEvent.click(firstCloseBtn);
    expect(onFocusWindow).not.toHaveBeenCalled();
    expect(onCloseWindow).toHaveBeenLastCalledWith('refractor-ide');
    expect(screen.getAllByRole('option')).toHaveLength(4);
    expect(
      screen.getAllByRole('option')[1]?.getAttribute('data-window-id')
    ).toBe('terminal-multiplexer');
    expect(
      screen.getAllByRole('option')[1]?.getAttribute('aria-selected')
    ).toBe('true');

    // Jump to last window ('audio-dsp-mixer', index 3) and close via Delete -> clamps highlight safely to index 2 ('design-specs')
    fireEvent.keyDown(listbox, { key: 'End' });
    fireEvent.keyDown(listbox, { key: 'Delete' });
    expect(onCloseWindow).toHaveBeenLastCalledWith('audio-dsp-mixer');
    expect(screen.getAllByRole('option')).toHaveLength(3);
    expect(
      screen.getAllByRole('option')[2]?.getAttribute('data-window-id')
    ).toBe('design-specs');
    expect(
      screen.getAllByRole('option')[2]?.getAttribute('aria-selected')
    ).toBe('true');

    // Jump to 1st window ('optical-shader-preview', index 0) and close 3rd window ('design-specs', index 2) -> highlight stays at index 0
    fireEvent.keyDown(listbox, { key: 'Home' });
    fireEvent.click(
      screen.getByRole('button', { name: 'Close Prism Optical Token Matrix' })
    );
    expect(onCloseWindow).toHaveBeenLastCalledWith('design-specs');
    expect(screen.getAllByRole('option')).toHaveLength(2);
    expect(
      screen.getAllByRole('option')[0]?.getAttribute('data-window-id')
    ).toBe('optical-shader-preview');
    expect(
      screen.getAllByRole('option')[0]?.getAttribute('aria-selected')
    ).toBe('true');

    // Close remaining 2 windows via Backspace & Delete down to 1 (singular phrasing) and 0 (empty state)
    fireEvent.keyDown(listbox, { key: 'End' });
    fireEvent.keyDown(listbox, { key: 'Backspace' });
    expect(onCloseWindow).toHaveBeenLastCalledWith('terminal-multiplexer');
    expect(screen.getAllByRole('option')).toHaveLength(1);
    expect(screen.getByRole('status')).toHaveTextContent(
      '1 active window remaining.'
    );

    fireEvent.keyDown(listbox, { key: 'Delete' });
    expect(onCloseWindow).toHaveBeenLastCalledWith('optical-shader-preview');

    // Clean role="status" empty state
    expect(screen.queryByRole('listbox')).toBeNull();
    const emptyStatus = screen.getByRole('status');
    expect(emptyStatus).toHaveTextContent('No active windows');
    expect(screen.getByTestId('window-switcher-status')).toHaveTextContent(
      'Closed Caustic Dispersion Pass. No active windows remaining.'
    );
    expect(
      screen.getByTestId('window-switcher-active-title')
    ).toHaveTextContent('No window selected');
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Focus Window' })).toBeDisabled();

    // Navigation keys on empty root do not crash, while Escape still dismisses
    const region = screen.getByRole('region', { name: 'Window switcher' });
    fireEvent.keyDown(region, { key: 'ArrowRight' });
    fireEvent.keyDown(region, { key: 'Home' });
    fireEvent.keyDown(region, { key: 'Enter' });
    fireEvent.keyDown(region, { key: 'Delete' });
    fireEvent.keyDown(region, { key: 'Escape' });
    expect(onDismiss).toHaveBeenCalledTimes(2);
  });

  it('supports controlled windows, duplicate-ID deduplication, active-item initialization, tone tokens, and external shrinking', () => {
    const modeMapCheck: WindowSwitcherModeMap = { inline: true, overlay: true };
    const modes: ReadonlyArray<WindowSwitcherMode> = ['inline', 'overlay'];
    for (const modeKey of modes) {
      expect(modeMapCheck[modeKey]).toBe(true);
    }

    const toneMapCheck: SwitcherWindowToneMap = {
      primary: true,
      info: true,
      emerald: true,
      amber: true,
      rose: true,
    };
    const tones: ReadonlyArray<SwitcherWindowTone> = [
      'primary',
      'info',
      'emerald',
      'amber',
      'rose',
    ];
    for (const toneKey of tones) {
      expect(toneMapCheck[toneKey]).toBe(true);
    }

    const controlledWindows: ReadonlyArray<SwitcherWindowItem> = [
      {
        id: 'w1',
        appName: 'Notes',
        title: 'Scratchpad',
        // omitted tone defaults to 'primary'; omitted workspaceLabel renders '#1'
      },
      {
        id: 'w2',
        appName: 'Browser',
        title: 'Refractor Docs',
        workspaceLabel: 'Desktop B',
        tone: 'info',
        active: true,
      },
      {
        id: 'w2', // duplicate ID safely ignored
        appName: 'Duplicate Browser',
        title: 'Ignored Duplicate',
        tone: 'rose',
      },
      {
        id: 'w3',
        appName: 'Monitor',
        title: 'GPU Frame Graph',
        workspaceLabel: 'Desktop C',
        tone: 'emerald',
      },
    ];

    const onFocusWindow = vi.fn();
    const onCloseWindow = vi.fn();

    const { rerender } = render(
      <WindowSwitcherOverlay
        windows={controlledWindows}
        onFocusWindow={onFocusWindow}
        onCloseWindow={onCloseWindow}
      />
    );

    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(3);
    expect(screen.queryByText('Ignored Duplicate')).toBeNull();

    // Initial highlight picked active: true item (index 1, 'w2')
    expect(options[1]).toHaveAttribute('aria-selected', 'true');
    expect(options[1]).toHaveAttribute('data-active', 'true');
    expect(options[0]).toHaveAttribute('data-tone', 'primary');
    expect(options[0]).toHaveTextContent('#1');
    expect(options[1]).toHaveAttribute('data-tone', 'info');
    expect(options[2]).toHaveAttribute('data-tone', 'emerald');

    // Controlled focus passes exact object reference
    fireEvent.click(options[2] as HTMLElement);
    expect(onFocusWindow).toHaveBeenCalledWith(controlledWindows[3]);

    // Controlled close calls callback without mutating rendered controlled list
    fireEvent.click(
      screen.getByRole('button', { name: 'Close GPU Frame Graph' })
    );
    expect(onCloseWindow).toHaveBeenCalledWith('w3');
    expect(screen.getAllByRole('option')).toHaveLength(3);

    // Parent shrinks controlled windows -> highlighted index clamps safely to new tail
    rerender(
      <WindowSwitcherOverlay
        windows={[controlledWindows[0] as SwitcherWindowItem]}
        onFocusWindow={onFocusWindow}
        onCloseWindow={onCloseWindow}
      />
    );
    expect(screen.getAllByRole('option')).toHaveLength(1);
    expect(screen.getAllByRole('option')[0]).toHaveAttribute(
      'aria-selected',
      'true'
    );

    // Parent passes empty controlled windows={[]}
    rerender(
      <WindowSwitcherOverlay
        windows={[]}
        onFocusWindow={onFocusWindow}
        onCloseWindow={onCloseWindow}
      />
    );
    expect(screen.getByRole('status')).toHaveTextContent('No active windows');
    expect(screen.getByTestId('window-switcher-status')).toHaveTextContent(
      'Closed GPU Frame Graph.'
    );
  });

  it('guards keyboard cycling, focusing, closing, and Escape dismissal during active IME composition', () => {
    const onFocusWindow = vi.fn();
    const onCloseWindow = vi.fn();
    const onDismiss = vi.fn();

    render(
      <WindowSwitcherOverlay
        mode="overlay"
        open={true}
        onFocusWindow={onFocusWindow}
        onCloseWindow={onCloseWindow}
        onDismiss={onDismiss}
      />
    );

    const listbox = screen.getByRole('listbox', { name: 'Active windows' });
    const dialog = screen.getByRole('dialog');

    dispatchComposingKeyDown(listbox, 'ArrowRight');
    dispatchComposingKeyDown(listbox, 'Tab');
    dispatchComposingKeyDown(listbox, 'Enter');
    dispatchComposingKeyDown(listbox, 'Delete');
    dispatchComposingKeyDown(listbox, 'Escape');
    dispatchComposingKeyDown(dialog, 'Escape');
    dispatchComposingKeyDown(window, 'Escape');

    expect(onFocusWindow).not.toHaveBeenCalled();
    expect(onCloseWindow).not.toHaveBeenCalled();
    expect(onDismiss).not.toHaveBeenCalled();
    expect(screen.getAllByRole('option')).toHaveLength(5);
    expect(screen.getAllByRole('option')[0]).toHaveAttribute(
      'aria-selected',
      'true'
    );
  });

  it('respects disabled state across card clicks, buttons, keyboard shortcuts, backdrop click, and window Escape', () => {
    const onFocusWindow = vi.fn();
    const onCloseWindow = vi.fn();
    const onDismiss = vi.fn();

    render(
      <WindowSwitcherOverlay
        mode="overlay"
        open={true}
        disabled
        onFocusWindow={onFocusWindow}
        onCloseWindow={onCloseWindow}
        onDismiss={onDismiss}
      />
    );

    const backdrop = screen.getByTestId('window-switcher-backdrop');
    expect(backdrop).toHaveAttribute('data-disabled', 'true');

    const listbox = screen.getByRole('listbox', { name: 'Active windows' });
    expect(listbox).toHaveAttribute('aria-disabled', 'true');
    expect(listbox).toHaveAttribute('tabindex', '-1');

    const options = screen.getAllByRole('option');
    expect(options[0]).toHaveAttribute('aria-disabled', 'true');

    // Attempt all interactions while disabled
    fireEvent.click(options[1] as HTMLElement);
    fireEvent.click(backdrop);
    fireEvent.keyDown(listbox, { key: 'ArrowRight' });
    fireEvent.keyDown(listbox, { key: 'Enter' });
    fireEvent.keyDown(listbox, { key: 'Delete' });
    fireEvent.keyDown(listbox, { key: 'Escape' });
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    fireEvent.keyDown(window, { key: 'Escape' });

    expect(
      screen.getByRole('button', { name: 'Dismiss window switcher' })
    ).toBeDisabled();
    expect(
      screen.getByRole('button', { name: 'Close WindowSwitcherOverlay.tsx' })
    ).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Focus Window' })).toBeDisabled();

    expect(onFocusWindow).not.toHaveBeenCalled();
    expect(onCloseWindow).not.toHaveBeenCalled();
    expect(onDismiss).not.toHaveBeenCalled();
    expect(options[0]).toHaveAttribute('aria-selected', 'true');
  });

  it('handles defaultWindows={[]}, blank label fallbacks, omitted callbacks, composed handlers, and adversarial XSS titles safely', () => {
    const xssPayload =
      '<script>window.__switcherXss=1</script><img src=x onerror=alert(1)>';
    const customOnKeyDown = vi.fn();

    const { rerender } = render(
      <WindowSwitcherOverlay
        defaultWindows={[]}
        aria-label="   "
        onKeyDown={customOnKeyDown}
      />
    );

    const emptyRegion = screen.getByRole('region', { name: 'Window switcher' });
    expect(screen.getByRole('status')).toHaveTextContent('No active windows');
    expect(screen.getByTestId('window-switcher-status')).toHaveTextContent(
      'No active windows open.'
    );
    fireEvent.keyDown(emptyRegion, { key: 'Escape' });
    expect(customOnKeyDown).toHaveBeenCalledTimes(1);

    // Blank strings & XSS payload in controlled windows with omitted callbacks
    rerender(
      <WindowSwitcherOverlay
        windows={[
          {
            id: 'blank-win',
            appName: '   ',
            title: '   ',
            workspaceLabel: '   ',
          },
          {
            id: 'xss-win',
            appName: xssPayload,
            title: xssPayload,
            workspaceLabel: xssPayload,
            tone: 'amber',
          },
          {
            id: 'rose-win',
            appName: 'Mixer',
            title: 'Master',
            tone: 'rose',
          },
        ]}
      />
    );

    expect(document.querySelector('script')).toBeNull();
    expect(document.querySelector('img')).toBeNull();
    expect(screen.getByText('Application')).toBeInTheDocument();
    expect(screen.getByText('Untitled window')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Close Untitled window' })
    ).toBeInTheDocument();
    expect(screen.getAllByText(xssPayload).length).toBeGreaterThanOrEqual(3);

    // Omitted callbacks never throw
    const listbox = screen.getByRole('listbox', { name: 'Active windows' });
    fireEvent.keyDown(listbox, { key: 'ArrowRight' });
    fireEvent.keyDown(listbox, { key: 'Enter' });
    fireEvent.keyDown(listbox, { key: 'Delete' });
    fireEvent.keyDown(listbox, { key: 'Escape' });
  });

  it('defaults initial highlight to index 0 when no window item has active: true', () => {
    render(
      <WindowSwitcherOverlay
        defaultWindows={[
          { id: 'alpha', appName: 'Alpha', title: 'Alpha Session' },
          { id: 'beta', appName: 'Beta', title: 'Beta Session' },
        ]}
      />
    );

    const options = screen.getAllByRole('option');
    expect(options[0]).toHaveAttribute('aria-selected', 'true');
    expect(options[0]).not.toHaveAttribute('data-active');
    expect(options[1]).toHaveAttribute('aria-selected', 'false');
  });
});
