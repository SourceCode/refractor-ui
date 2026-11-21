import { createRef, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import {
  TrackHeaderStrip,
  type TrackHeaderHeight,
  type TrackHeaderState,
  type TrackLaneType,
  type TrackLaneTypeMap,
} from './index';

describe('TrackHeaderStrip', () => {
  it('renders default compact video lane header with PrismThemeProvider overrides, xstyle, and React 19 ref', () => {
    const ref = createRef<HTMLDivElement>();
    const laneMap: TrackLaneTypeMap = {
      video: true,
      audio: true,
      effect: true,
      subtitle: true,
    };
    expect(Object.keys(laneMap)).toEqual(['video', 'audio', 'effect', 'subtitle']);

    render(
      <PrismThemeProvider
        theme={{
          components: {
            TrackHeaderStrip: {
              className: 'theme-track-strip',
              style: { letterSpacing: '0.2px' },
            },
          },
        }}
      >
        <TrackHeaderStrip
          ref={ref}
          name="V1 · Main Camera"
          className="custom-track-strip"
          xstyle={{ '--prism-blur-px': '20px' }}
          style={{ minWidth: '240px' }}
          data-testid="track-strip"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('track-strip');
    expect(ref.current).toBe(root);
    expect(root).toHaveClass(
      'refractor-track-header-strip',
      'prism-slab',
      'theme-track-strip',
      'custom-track-strip'
    );
    expect(root).toHaveAttribute('role', 'group');
    expect(root).toHaveAttribute('aria-label', 'V1 · Main Camera track header');
    expect(root).toHaveAttribute('data-track-type', 'video');
    expect(root).toHaveAttribute('data-height', 'compact');
    expect(root).not.toHaveAttribute('data-muted');
    expect(root).not.toHaveAttribute('data-solo');
    expect(root).not.toHaveAttribute('data-armed');
    expect(root).not.toHaveAttribute('data-locked');
    expect(root).not.toHaveAttribute('data-disabled');
    expect(root).toHaveStyle({ letterSpacing: '0.2px', minWidth: '240px' });

    const accent = screen.getByTestId('track-header-accent');
    expect(accent).toHaveAttribute('data-track-type', 'video');
    expect(accent.style.backgroundColor).toBe('var(--prism-primary-main)');

    const iconBadge = screen.getByTestId('track-type-icon');
    expect(iconBadge.style.color).toBe('var(--prism-primary-main)');

    expect(screen.getByTestId('track-header-name')).toHaveTextContent('V1 · Main Camera');
    expect(screen.queryByTestId('track-rename-trigger')).toBeNull();
    expect(screen.queryByTestId('track-status-well')).toBeNull();

    const heightToggle = screen.getByTestId('track-height-toggle');
    expect(heightToggle).toHaveAttribute('aria-expanded', 'false');
    expect(heightToggle).toHaveAttribute('aria-label', 'Expand V1 · Main Camera');
    expect(heightToggle).not.toHaveAttribute('aria-controls');
  });

  it('renders semantic accent stripe, icon badge, and expanded lane type label for all four TrackLaneType variants', () => {
    const cases: Array<{ lane: TrackLaneType; token: string; label: string }> = [
      { lane: 'video', token: 'var(--prism-primary-main)', label: 'Video' },
      { lane: 'audio', token: 'var(--prism-secondary-main)', label: 'Audio' },
      { lane: 'effect', token: 'var(--prism-success-main)', label: 'Effect' },
      { lane: 'subtitle', token: 'var(--prism-warning-main)', label: 'Subtitle' },
    ];

    const { rerender } = render(
      <TrackHeaderStrip
        name="Lane 1"
        trackType="video"
        defaultHeightMode="expanded"
        data-testid="lane-strip"
      />
    );

    for (const item of cases) {
      rerender(
        <TrackHeaderStrip
          name="Lane 1"
          trackType={item.lane}
          defaultHeightMode="expanded"
          data-testid="lane-strip"
        />
      );

      expect(screen.getByTestId('lane-strip')).toHaveAttribute('data-track-type', item.lane);
      expect(screen.getByTestId('track-header-accent').style.backgroundColor).toBe(item.token);
      expect(screen.getByTestId('track-type-icon').style.color).toBe(item.token);
      expect(screen.getByTestId('track-type-label')).toHaveTextContent(item.label);
    }
  });

  it('toggles M, S, R, and Lock in uncontrolled mode with crisp aria-labels, aria-pressed, and optical styling', () => {
    const onMutedChange = vi.fn();
    const onSoloChange = vi.fn();
    const onArmedChange = vi.fn();
    const onLockedChange = vi.fn();

    render(
      <TrackHeaderStrip
        name="V1"
        onMutedChange={onMutedChange}
        onSoloChange={onSoloChange}
        onArmedChange={onArmedChange}
        onLockedChange={onLockedChange}
        data-testid="daw-strip"
      />
    );

    const root = screen.getByTestId('daw-strip');
    const muteBtn = screen.getByRole('button', { name: 'Mute V1' });
    const soloBtn = screen.getByRole('button', { name: 'Solo V1' });
    const armBtn = screen.getByRole('button', { name: 'Record arm V1' });
    const lockBtn = screen.getByRole('button', { name: 'Lock V1' });

    expect(muteBtn).toHaveAttribute('aria-pressed', 'false');
    expect(soloBtn).toHaveAttribute('aria-pressed', 'false');
    expect(armBtn).toHaveAttribute('aria-pressed', 'false');
    expect(lockBtn).toHaveAttribute('aria-pressed', 'false');

    // Mute toggle on/off
    fireEvent.click(muteBtn);
    expect(onMutedChange).toHaveBeenLastCalledWith(true);
    expect(muteBtn).toHaveAttribute('aria-pressed', 'true');
    expect(muteBtn).toHaveAttribute('data-active', 'true');
    expect(muteBtn.style.backgroundColor).toBe('var(--prism-warning-main)');
    expect(muteBtn.style.color).toBe('var(--prism-warning-contrast)');
    expect(root).toHaveAttribute('data-muted', 'true');
    expect(screen.getByTestId('track-header-name').style.color).toBe('var(--prism-text-secondary)');

    fireEvent.click(muteBtn);
    expect(onMutedChange).toHaveBeenLastCalledWith(false);
    expect(muteBtn).toHaveAttribute('aria-pressed', 'false');
    expect(root).not.toHaveAttribute('data-muted');

    // Solo toggle on/off
    fireEvent.click(soloBtn);
    expect(onSoloChange).toHaveBeenLastCalledWith(true);
    expect(soloBtn).toHaveAttribute('aria-pressed', 'true');
    expect(soloBtn).toHaveClass('prism-emerald');
    expect(root).toHaveAttribute('data-solo', 'true');

    fireEvent.click(soloBtn);
    expect(onSoloChange).toHaveBeenLastCalledWith(false);
    expect(soloBtn).not.toHaveClass('prism-emerald');
    expect(soloBtn).toHaveClass('prism-crystal');
    expect(root).not.toHaveAttribute('data-solo');

    // Record Arm toggle on/off
    fireEvent.click(armBtn);
    expect(onArmedChange).toHaveBeenLastCalledWith(true);
    expect(armBtn).toHaveAttribute('aria-pressed', 'true');
    expect(armBtn.style.backgroundColor).toBe('var(--prism-error-main)');
    expect(armBtn.style.color).toBe('var(--prism-error-contrast)');
    expect(root).toHaveAttribute('data-armed', 'true');

    fireEvent.click(armBtn);
    expect(onArmedChange).toHaveBeenLastCalledWith(false);
    expect(armBtn).toHaveAttribute('aria-pressed', 'false');
    expect(root).not.toHaveAttribute('data-armed');

    // Lock toggle on/off
    fireEvent.click(lockBtn);
    expect(onLockedChange).toHaveBeenLastCalledWith(true);
    expect(lockBtn).toHaveAttribute('aria-pressed', 'true');
    expect(lockBtn.style.color).toBe('var(--prism-primary-main)');
    expect(root).toHaveAttribute('data-locked', 'true');

    fireEvent.click(lockBtn);
    expect(onLockedChange).toHaveBeenLastCalledWith(false);
    expect(lockBtn).toHaveAttribute('aria-pressed', 'false');
    expect(root).not.toHaveAttribute('data-locked');
  });

  it('blocks Record Arm while locked while keeping Mute, Solo, and height toggle operational', () => {
    const onArmedChange = vi.fn();
    const onMutedChange = vi.fn();
    const onSoloChange = vi.fn();
    const onLockedChange = vi.fn();
    const onHeightModeChange = vi.fn();

    render(
      <TrackHeaderStrip
        name="A1"
        trackType="audio"
        defaultLocked
        onArmedChange={onArmedChange}
        onMutedChange={onMutedChange}
        onSoloChange={onSoloChange}
        onLockedChange={onLockedChange}
        onHeightModeChange={onHeightModeChange}
      />
    );

    const armBtn = screen.getByRole('button', { name: 'Record arm A1' });
    const lockBtn = screen.getByRole('button', { name: 'Lock A1' });
    const muteBtn = screen.getByRole('button', { name: 'Mute A1' });
    const soloBtn = screen.getByRole('button', { name: 'Solo A1' });
    const heightToggle = screen.getByTestId('track-height-toggle');

    expect(armBtn).toBeDisabled();
    expect(armBtn).toHaveAttribute('data-blocked', 'true');
    expect(armBtn.style.color).toBe('var(--prism-text-disabled)');
    fireEvent.click(armBtn);
    expect(onArmedChange).not.toHaveBeenCalled();

    // Mute, Solo, and Height remain interactive when locked
    fireEvent.click(muteBtn);
    expect(onMutedChange).toHaveBeenCalledWith(true);
    fireEvent.click(soloBtn);
    expect(onSoloChange).toHaveBeenCalledWith(true);
    fireEvent.click(heightToggle);
    expect(onHeightModeChange).toHaveBeenCalledWith('expanded');

    // Unlocking re-enables Record Arm
    fireEvent.click(lockBtn);
    expect(onLockedChange).toHaveBeenCalledWith(false);
    expect(armBtn).not.toBeDisabled();
    expect(armBtn).not.toHaveAttribute('data-blocked');

    fireEvent.click(armBtn);
    expect(onArmedChange).toHaveBeenCalledWith(true);
    expect(armBtn).toHaveAttribute('aria-pressed', 'true');
  });

  it('toggles heightMode between compact and expanded and displays recessed prism-well status badges (ACTIVE, MUTED, SOLO, ARMED, LOCKED)', () => {
    const onHeightModeChange = vi.fn();

    render(
      <TrackHeaderStrip
        name="FX1"
        trackType="effect"
        onHeightModeChange={onHeightModeChange}
        data-testid="fx-strip"
      />
    );

    const root = screen.getByTestId('fx-strip');
    const toggle = screen.getByTestId('track-height-toggle');

    expect(root).toHaveAttribute('data-height', 'compact');
    expect(screen.queryByTestId('track-status-well')).toBeNull();

    // Expand -> shows ACTIVE badge by default
    fireEvent.click(toggle);
    expect(onHeightModeChange).toHaveBeenLastCalledWith('expanded');
    expect(root).toHaveAttribute('data-height', 'expanded');
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(toggle).toHaveAttribute('aria-label', 'Collapse FX1');

    const statusWell = screen.getByTestId('track-status-well');
    expect(statusWell).toHaveClass('prism-well');
    expect(statusWell).toHaveAttribute('role', 'status');
    expect(statusWell).toHaveAttribute('aria-live', 'polite');
    expect(toggle).toHaveAttribute('aria-controls', statusWell.id);
    expect(screen.getByTestId('track-status-badge-active')).toHaveTextContent('ACTIVE');

    // Activate Mute, Solo, Armed, then Lock -> all four badges appear, ACTIVE disappears
    fireEvent.click(screen.getByTestId('track-mute-button'));
    expect(screen.queryByTestId('track-status-badge-active')).toBeNull();
    expect(screen.getByTestId('track-status-badge-muted')).toHaveTextContent('MUTED');

    fireEvent.click(screen.getByTestId('track-solo-button'));
    expect(screen.getByTestId('track-status-badge-solo')).toHaveTextContent('SOLO');

    fireEvent.click(screen.getByTestId('track-arm-button'));
    expect(screen.getByTestId('track-status-badge-armed')).toHaveTextContent('ARMED');

    fireEvent.click(screen.getByTestId('track-lock-button'));
    expect(screen.getByTestId('track-status-badge-locked')).toHaveTextContent('LOCKED');

    // Collapse -> hides status well
    fireEvent.click(toggle);
    expect(onHeightModeChange).toHaveBeenLastCalledWith('compact');
    expect(root).toHaveAttribute('data-height', 'compact');
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByTestId('track-status-well')).toBeNull();
  });

  it('supports fully controlled state across muted, solo, armed, locked, and heightMode', () => {
    const spy = vi.fn<(snapshot: TrackHeaderState) => void>();

    function ControlledHarness() {
      const [state, setState] = useState<TrackHeaderState>({
        muted: false,
        solo: true,
        armed: false,
        locked: false,
        height: 'compact',
      });

      const update = (patch: Partial<TrackHeaderState>) => {
        setState((prev) => {
          const next: TrackHeaderState = { ...prev, ...patch };
          spy(next);
          return next;
        });
      };

      return (
        <TrackHeaderStrip
          name="S1 · English CC"
          trackType="subtitle"
          muted={state.muted}
          onMutedChange={(muted) => update({ muted })}
          solo={state.solo}
          onSoloChange={(solo) => update({ solo })}
          armed={state.armed}
          onArmedChange={(armed) => update({ armed })}
          locked={state.locked}
          onLockedChange={(locked) => update({ locked })}
          heightMode={state.height}
          onHeightModeChange={(height: TrackHeaderHeight) => update({ height })}
          data-testid="controlled-strip"
        />
      );
    }

    render(<ControlledHarness />);
    const root = screen.getByTestId('controlled-strip');
    expect(root).toHaveAttribute('data-solo', 'true');
    expect(root).toHaveAttribute('data-height', 'compact');

    fireEvent.click(screen.getByTestId('track-height-toggle'));
    expect(root).toHaveAttribute('data-height', 'expanded');
    expect(screen.getByTestId('track-status-badge-solo')).toHaveTextContent('SOLO');

    fireEvent.click(screen.getByTestId('track-mute-button'));
    fireEvent.click(screen.getByTestId('track-arm-button'));
    fireEvent.click(screen.getByTestId('track-lock-button'));

    expect(root).toHaveAttribute('data-muted', 'true');
    expect(root).toHaveAttribute('data-armed', 'true');
    expect(root).toHaveAttribute('data-locked', 'true');
    expect(spy).toHaveBeenLastCalledWith({
      muted: true,
      solo: true,
      armed: true,
      locked: true,
      height: 'expanded',
    });
  });

  it('supports inline rename via edit button, double-click, Enter commit, Escape cancel, confirm/cancel buttons, and blur', () => {
    const onRename = vi.fn();

    render(
      <TrackHeaderStrip
        name="V1 · Main"
        onRename={onRename}
        data-testid="rename-strip"
      />
    );

    const root = screen.getByTestId('rename-strip');
    const renameTrigger = screen.getByRole('button', { name: 'Rename V1 · Main' });

    // 1. Open via edit trigger and commit with Enter (trimmed)
    fireEvent.click(renameTrigger);
    expect(root).toHaveAttribute('data-editing', 'true');
    const input = screen.getByTestId('track-rename-input') as HTMLInputElement;
    expect(document.activeElement).toBe(input);
    expect(input.value).toBe('V1 · Main');

    fireEvent.change(input, { target: { value: '  V1 · B-Roll  ' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onRename).toHaveBeenCalledTimes(1);
    expect(onRename).toHaveBeenLastCalledWith('V1 · B-Roll');
    expect(root).not.toHaveAttribute('data-editing');
    expect(document.activeElement).toBe(screen.getByTestId('track-rename-trigger'));

    // 2. Open via double-click on track name and cancel with Escape
    fireEvent.doubleClick(screen.getByTestId('track-header-name'));
    const input2 = screen.getByTestId('track-rename-input') as HTMLInputElement;
    fireEvent.change(input2, { target: { value: 'Discarded' } });
    fireEvent.keyDown(input2, { key: 'Escape' });

    expect(onRename).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('track-rename-input')).toBeNull();
    expect(document.activeElement).toBe(screen.getByTestId('track-rename-trigger'));

    // 3. Open and commit via Confirm micro-button (with mouseDown guard)
    fireEvent.click(screen.getByTestId('track-rename-trigger'));
    const input3 = screen.getByTestId('track-rename-input');
    const confirmBtn = screen.getByTestId('track-rename-confirm');
    fireEvent.change(input3, { target: { value: 'V1 · Cam B' } });
    const confirmMouseDown = fireEvent.mouseDown(confirmBtn);
    expect(confirmMouseDown).toBe(false);
    fireEvent.click(confirmBtn);
    expect(onRename).toHaveBeenCalledTimes(2);
    expect(onRename).toHaveBeenLastCalledWith('V1 · Cam B');

    // 4. Open and cancel via Cancel micro-button (blur moving inside edit group does NOT commit)
    fireEvent.click(screen.getByTestId('track-rename-trigger'));
    const input4 = screen.getByTestId('track-rename-input');
    const cancelBtn = screen.getByTestId('track-rename-cancel');
    fireEvent.change(input4, { target: { value: 'Never Saved' } });
    fireEvent.blur(input4, { relatedTarget: cancelBtn });
    expect(screen.getByTestId('track-rename-input')).toBeInTheDocument();
    expect(onRename).toHaveBeenCalledTimes(2);

    fireEvent.mouseDown(cancelBtn);
    fireEvent.click(cancelBtn);
    expect(screen.queryByTestId('track-rename-input')).toBeNull();
    expect(onRename).toHaveBeenCalledTimes(2);

    // 5. Commit on blur outside the rename group
    fireEvent.click(screen.getByTestId('track-rename-trigger'));
    const input5 = screen.getByTestId('track-rename-input');
    fireEvent.change(input5, { target: { value: 'V1 · Blur Commit' } });
    fireEvent.blur(input5, { relatedTarget: null });
    expect(onRename).toHaveBeenCalledTimes(3);
    expect(onRename).toHaveBeenLastCalledWith('V1 · Blur Commit');

    // 6. Reject empty / whitespace-only or unchanged draft cleanly without invoking onRename
    fireEvent.click(screen.getByTestId('track-rename-trigger'));
    const input6 = screen.getByTestId('track-rename-input');
    fireEvent.change(input6, { target: { value: '   ' } });
    fireEvent.keyDown(input6, { key: 'Enter' });
    expect(onRename).toHaveBeenCalledTimes(3);

    fireEvent.click(screen.getByTestId('track-rename-trigger'));
    const input7 = screen.getByTestId('track-rename-input');
    fireEvent.keyDown(input7, { key: 'Enter' });
    expect(onRename).toHaveBeenCalledTimes(3);
  });

  it('guards inline rename Enter and Escape handling during IME composition (isComposing: true)', () => {
    const onRename = vi.fn();
    render(<TrackHeaderStrip name="V1" onRename={onRename} />);

    fireEvent.click(screen.getByTestId('track-rename-trigger'));
    const input = screen.getByTestId('track-rename-input');
    fireEvent.change(input, { target: { value: '日本語トラック' } });

    const imeEnter = new KeyboardEvent('keydown', {
      key: 'Enter',
      bubbles: true,
      cancelable: true,
    });
    Object.defineProperty(imeEnter, 'isComposing', { value: true });
    input.dispatchEvent(imeEnter);
    expect(imeEnter.defaultPrevented).toBe(false);
    expect(onRename).not.toHaveBeenCalled();
    expect(screen.getByTestId('track-rename-input')).toBeInTheDocument();

    const imeEscape = new KeyboardEvent('keydown', {
      key: 'Escape',
      bubbles: true,
      cancelable: true,
    });
    Object.defineProperty(imeEscape, 'isComposing', { value: true });
    input.dispatchEvent(imeEscape);
    expect(imeEscape.defaultPrevented).toBe(false);
    expect(screen.getByTestId('track-rename-input')).toBeInTheDocument();

    // Non-Enter/Escape key leaves edit mode active without preventing default
    const otherKey = new KeyboardEvent('keydown', {
      key: 'a',
      bubbles: true,
      cancelable: true,
    });
    input.dispatchEvent(otherKey);
    expect(otherKey.defaultPrevented).toBe(false);
    expect(screen.getByTestId('track-rename-input')).toBeInTheDocument();

    // Normal Enter after composition ends commits cleanly
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onRename).toHaveBeenCalledWith('日本語トラック');
  });

  it('disables all controls when disabled and exits active inline rename if disabled dynamically', () => {
    const onMutedChange = vi.fn();
    const onSoloChange = vi.fn();
    const onArmedChange = vi.fn();
    const onLockedChange = vi.fn();
    const onHeightModeChange = vi.fn();
    const onRename = vi.fn();

    const { rerender } = render(
      <TrackHeaderStrip
        name="A2 · Synth"
        trackType="audio"
        onMutedChange={onMutedChange}
        onSoloChange={onSoloChange}
        onArmedChange={onArmedChange}
        onLockedChange={onLockedChange}
        onHeightModeChange={onHeightModeChange}
        onRename={onRename}
        data-testid="disable-strip"
      />
    );

    // Start editing, then disable dynamically -> exits edit mode cleanly
    fireEvent.click(screen.getByTestId('track-rename-trigger'));
    expect(screen.getByTestId('track-rename-input')).toBeInTheDocument();

    rerender(
      <TrackHeaderStrip
        name="A2 · Synth"
        trackType="audio"
        disabled
        onMutedChange={onMutedChange}
        onSoloChange={onSoloChange}
        onArmedChange={onArmedChange}
        onLockedChange={onLockedChange}
        onHeightModeChange={onHeightModeChange}
        onRename={onRename}
        data-testid="disable-strip"
      />
    );

    const root = screen.getByTestId('disable-strip');
    expect(root).toHaveAttribute('data-disabled', 'true');
    expect(root).toHaveAttribute('aria-disabled', 'true');
    expect(screen.queryByTestId('track-rename-input')).toBeNull();

    const buttons = screen.getAllByRole('button');
    for (const button of buttons) {
      expect(button).toBeDisabled();
      fireEvent.click(button);
    }

    fireEvent.doubleClick(screen.getByTestId('track-header-name'));
    expect(screen.queryByTestId('track-rename-input')).toBeNull();

    expect(onMutedChange).not.toHaveBeenCalled();
    expect(onSoloChange).not.toHaveBeenCalled();
    expect(onArmedChange).not.toHaveBeenCalled();
    expect(onLockedChange).not.toHaveBeenCalled();
    expect(onHeightModeChange).not.toHaveBeenCalled();
    expect(onRename).not.toHaveBeenCalled();
  });

  it('handles adversarial XSS payloads, blank track names, missing onRename, and BaseProps passthrough safely', () => {
    const payload = '<script>window.__xss=1</script><img src=x onerror=alert(1)>';
    const onKeyDown = vi.fn();

    const { rerender } = render(
      <TrackHeaderStrip
        name={payload}
        aria-label="Custom track landmark"
        onKeyDown={onKeyDown}
        data-testid="xss-strip"
      />
    );

    const root = screen.getByTestId('xss-strip');
    expect(root).toHaveAttribute('aria-label', 'Custom track landmark');
    expect(screen.getByTestId('track-header-name')).toHaveTextContent(payload);
    expect(document.querySelector('script')).toBeNull();

    // Double-click without onRename is a safe no-op
    fireEvent.doubleClick(screen.getByTestId('track-header-name'));
    expect(screen.queryByTestId('track-rename-input')).toBeNull();

    fireEvent.keyDown(root, { key: 'ArrowDown' });
    expect(onKeyDown).toHaveBeenCalledTimes(1);

    // Blank / whitespace-only name falls back gracefully for display and aria-labels
    rerender(<TrackHeaderStrip name="   " data-testid="xss-strip" />);
    expect(screen.getByTestId('track-header-name')).toHaveTextContent('Untitled track');
    expect(screen.getByRole('button', { name: 'Mute Untitled track' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Solo Untitled track' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Record arm Untitled track' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Lock Untitled track' })).toBeInTheDocument();
  });
});
