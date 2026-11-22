import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import {
  DesktopWidgetFrame,
  type DesktopWidgetConfig,
  type DesktopWidgetKindMap,
  type DesktopWidgetSizeMap,
  type DesktopWidgetToneMap,
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

describe('DesktopWidgetFrame', () => {
  it('renders default telemetry optical widget with theme override, xstyle, className, style, ref passthrough, and zero raw colors', () => {
    const ref = createRef<HTMLDivElement>();
    const sizeKeys: ReadonlyArray<keyof DesktopWidgetSizeMap> = [
      'sm',
      'md',
      'lg',
    ];
    const kindKeys: ReadonlyArray<keyof DesktopWidgetKindMap> = [
      'telemetry',
      'weather',
      'notes',
      'clock',
      'custom',
    ];
    const toneKeys: ReadonlyArray<keyof DesktopWidgetToneMap> = [
      'primary',
      'info',
      'success',
      'warning',
    ];
    expect(sizeKeys).toHaveLength(3);
    expect(kindKeys).toHaveLength(5);
    expect(toneKeys).toHaveLength(4);
    expect(DesktopWidgetFrame.displayName).toBe('DesktopWidgetFrame');

    const { container } = render(
      <PrismThemeProvider
        theme={{
          components: {
            DesktopWidgetFrame: {
              className: 'theme-widget-override',
              style: { opacity: '0.96' },
            },
          },
        }}
      >
        <DesktopWidgetFrame
          ref={ref}
          className="local-widget-class"
          style={{ minHeight: '220px' }}
          xstyle={{ '--prism-blur-px': '20px' }}
          data-testid="widget-root"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('widget-root');
    expect(ref.current).toBe(root);
    expect(root).toHaveAttribute('role', 'region');
    expect(root).toHaveAttribute('aria-label', 'System Telemetry');
    expect(root).toHaveClass(
      'refractor-desktop-widget-frame',
      'prism-slab',
      'max-w-full',
      'min-w-0',
      'theme-widget-override',
      'local-widget-class'
    );
    expect(root).toHaveStyle({ opacity: '0.96', minHeight: '220px' });
    expect(root).toHaveAttribute('data-kind', 'telemetry');
    expect(root).toHaveAttribute('data-size', 'md');
    expect(root).toHaveAttribute('data-tone', 'primary');
    expect(root).toHaveAttribute('data-pinned', 'true');
    expect(root).toHaveAttribute('data-locked', 'false');
    expect(root).toHaveAttribute('data-editing', 'false');
    expect(root).not.toHaveAttribute('data-disabled');

    expect(screen.getByTestId('desktop-widget-title')).toHaveTextContent(
      'System Telemetry'
    );
    expect(screen.getByTestId('desktop-widget-pinned-badge')).toHaveTextContent(
      'Pinned'
    );
    expect(screen.queryByTestId('desktop-widget-locked-badge')).toBeNull();
    expect(screen.getByTestId('desktop-widget-size-badge')).toHaveTextContent(
      '2×1'
    );

    expect(
      screen.getByTestId('desktop-widget-view-telemetry')
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('desktop-widget-telemetry-cpu')
    ).toHaveTextContent('42%');
    expect(
      screen.getByTestId('desktop-widget-telemetry-memory')
    ).toHaveTextContent('18.4 / 32 GB');
    expect(
      screen.getByTestId('desktop-widget-telemetry-gpu')
    ).toHaveTextContent('28%');
    expect(
      screen.getByTestId('desktop-widget-refresh-count')
    ).toHaveTextContent('Sync #0');
    expect(
      screen.getByTestId('desktop-widget-last-updated')
    ).toHaveTextContent('Just now');
    expect(
      screen.getByTestId('desktop-widget-cadence-label')
    ).toHaveTextContent('Every 1m');

    expect(container.innerHTML).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(container.innerHTML).not.toMatch(/\b(?:rgba?|hsla?)\s*\(/);
  });

  it('renders all 5 widget kinds (telemetry, weather, notes, clock, custom) across sm, md, and lg sizes plus supplementary children', () => {
    // 1. Telemetry lg with supplementary children
    const { rerender } = render(
      <DesktopWidgetFrame kind="telemetry" size="lg" tone="info">
        <span data-testid="extra-footer">Node US-West-02</span>
      </DesktopWidgetFrame>
    );
    expect(
      screen.getByTestId('desktop-widget-telemetry-extended')
    ).toHaveTextContent('Thermal 54°C');
    expect(screen.getByTestId('desktop-widget-extra-content')).toHaveTextContent(
      'Node US-West-02'
    );
    expect(screen.getByTestId('desktop-widget-size-badge')).toHaveTextContent(
      '2×2'
    );

    // 2. Weather sm (no forecast) -> md (with 3-hour forecast) -> lg (with extended humidity)
    rerender(<DesktopWidgetFrame kind="weather" size="sm" tone="warning" />);
    expect(screen.getByTestId('desktop-widget-title')).toHaveTextContent(
      'Local Weather'
    );
    expect(
      screen.getByTestId('desktop-widget-weather-temp')
    ).toHaveTextContent('68°');
    expect(
      screen.getByTestId('desktop-widget-view-weather')
    ).toHaveTextContent('Clear Optics');
    expect(
      screen.getByTestId('desktop-widget-view-weather')
    ).toHaveTextContent('H 72° / L 58°');
    expect(screen.queryByTestId('desktop-widget-weather-forecast')).toBeNull();
    expect(screen.queryByTestId('desktop-widget-weather-extended')).toBeNull();

    rerender(<DesktopWidgetFrame kind="weather" size="md" tone="warning" />);
    const forecast = screen.getByTestId('desktop-widget-weather-forecast');
    expect(forecast).toHaveTextContent('15:00');
    expect(forecast).toHaveTextContent('16:00');
    expect(forecast).toHaveTextContent('17:00');
    expect(screen.queryByTestId('desktop-widget-weather-extended')).toBeNull();

    rerender(<DesktopWidgetFrame kind="weather" size="lg" tone="warning" />);
    expect(
      screen.getByTestId('desktop-widget-weather-extended')
    ).toHaveTextContent('Humidity 44%');

    // 3. Notes across sm, md, lg with live character count, bounded length, and Escape blur
    rerender(<DesktopWidgetFrame kind="notes" size="sm" tone="success" />);
    expect(screen.getByTestId('desktop-widget-title')).toHaveTextContent(
      'Sticky Notes'
    );
    const textarea = screen.getByTestId(
      'desktop-widget-notes-textarea'
    ) as HTMLTextAreaElement;
    expect(textarea).toHaveAttribute('rows', '3');
    expect(textarea).not.toHaveAttribute('readonly');
    expect(screen.getByTestId('desktop-widget-notes-status')).toHaveTextContent(
      'Editable'
    );

    fireEvent.change(textarea, { target: { value: 'Ship v1.45.0 optics' } });
    expect(textarea.value).toBe('Ship v1.45.0 optics');
    expect(screen.getByTestId('desktop-widget-notes-count')).toHaveTextContent(
      '19 / 280'
    );

    // Over-length note text is strictly bounded to 280 chars
    fireEvent.change(textarea, { target: { value: 'N'.repeat(320) } });
    expect(textarea.value).toHaveLength(280);
    expect(screen.getByTestId('desktop-widget-notes-count')).toHaveTextContent(
      '280 / 280'
    );

    // Escape blurs textarea when not composing; non-Escape key leaves focus intact
    textarea.focus();
    expect(document.activeElement).toBe(textarea);
    fireEvent.keyDown(textarea, { key: 'a' });
    expect(document.activeElement).toBe(textarea);
    const composingNoteEsc = dispatchComposingKeyDown(textarea, 'Escape');
    expect(composingNoteEsc.defaultPrevented).toBe(false);
    expect(document.activeElement).toBe(textarea);
    fireEvent.keyDown(textarea, { key: 'Escape' });
    expect(document.activeElement).not.toBe(textarea);

    rerender(<DesktopWidgetFrame kind="notes" size="md" />);
    expect(
      screen.getByTestId('desktop-widget-notes-textarea')
    ).toHaveAttribute('rows', '4');
    rerender(<DesktopWidgetFrame kind="notes" size="lg" />);
    expect(
      screen.getByTestId('desktop-widget-notes-textarea')
    ).toHaveAttribute('rows', '6');

    // 4. Clock across sm (no zones) -> md (with zones) -> lg (with PTP sync row)
    rerender(<DesktopWidgetFrame kind="clock" size="sm" />);
    expect(screen.getByTestId('desktop-widget-title')).toHaveTextContent(
      'Studio Clock'
    );
    expect(screen.getByTestId('desktop-widget-clock-time')).toHaveTextContent(
      '14:28 UTC'
    );
    expect(screen.getByTestId('desktop-widget-clock-date')).toHaveTextContent(
      'Thu, Nov 22 · Studio Reference'
    );
    expect(screen.queryByTestId('desktop-widget-clock-zones')).toBeNull();

    rerender(<DesktopWidgetFrame kind="clock" size="md" />);
    const zones = screen.getByTestId('desktop-widget-clock-zones');
    expect(zones).toHaveTextContent('SFO');
    expect(zones).toHaveTextContent('NYC');
    expect(zones).toHaveTextContent('TYO');
    expect(screen.queryByTestId('desktop-widget-clock-extended')).toBeNull();

    rerender(<DesktopWidgetFrame kind="clock" size="lg" />);
    expect(
      screen.getByTestId('desktop-widget-clock-extended')
    ).toHaveTextContent('PTP Sync Lock');

    // 5. Custom kind with empty fallback and with custom children
    rerender(<DesktopWidgetFrame kind="custom" />);
    expect(screen.getByTestId('desktop-widget-title')).toHaveTextContent(
      'Desktop Widget'
    );
    expect(
      screen.getByTestId('desktop-widget-custom-empty')
    ).toBeInTheDocument();

    rerender(
      <DesktopWidgetFrame kind="custom" title="Build Pipeline">
        <div data-testid="custom-widget-slot">Pipeline Green · 14/14</div>
      </DesktopWidgetFrame>
    );
    expect(screen.getByTestId('custom-widget-slot')).toHaveTextContent(
      'Pipeline Green · 14/14'
    );
    expect(screen.queryByTestId('desktop-widget-custom-empty')).toBeNull();
  });

  it('handles Refresh with deterministic counter and polite live-region announcements, plus Pin and Lock toggles', () => {
    const onRefresh = vi.fn();
    const onConfigChange = vi.fn();

    render(
      <DesktopWidgetFrame
        kind="telemetry"
        defaultTitle="Cluster Ops"
        lastUpdatedLabel="14:28 UTC"
        onRefresh={onRefresh}
        onConfigChange={onConfigChange}
        data-testid="chrome-widget"
      />
    );

    const refreshBtn = screen.getByRole('button', { name: 'Refresh widget' });
    const pinBtn = screen.getByRole('button', { name: 'Pin to desktop' });
    const lockBtn = screen.getByRole('button', { name: 'Lock position' });
    const liveRegion = screen.getByTestId('desktop-widget-live-region');

    expect(liveRegion).toHaveAttribute('role', 'status');
    expect(liveRegion).toHaveAttribute('aria-live', 'polite');

    // Trigger Refresh twice
    fireEvent.click(refreshBtn);
    expect(onRefresh).toHaveBeenCalledTimes(1);
    expect(
      screen.getByTestId('desktop-widget-refresh-count')
    ).toHaveTextContent('Sync #1');
    expect(
      screen.getByTestId('desktop-widget-last-updated')
    ).toHaveTextContent('14:28 UTC · #1');
    expect(liveRegion).toHaveTextContent('Refreshed Cluster Ops (update 1)');

    fireEvent.click(refreshBtn);
    expect(onRefresh).toHaveBeenCalledTimes(2);
    expect(
      screen.getByTestId('desktop-widget-refresh-count')
    ).toHaveTextContent('Sync #2');

    // Toggle Pin off -> on
    expect(pinBtn).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(pinBtn);
    expect(pinBtn).toHaveAttribute('aria-pressed', 'false');
    expect(screen.queryByTestId('desktop-widget-pinned-badge')).toBeNull();
    expect(liveRegion).toHaveTextContent('Unpinned Cluster Ops from desktop');
    expect(onConfigChange).toHaveBeenLastCalledWith({
      title: 'Cluster Ops',
      size: 'md',
      tone: 'primary',
      refreshSeconds: 60,
      locked: false,
      pinned: false,
    });

    fireEvent.click(pinBtn);
    expect(pinBtn).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('desktop-widget-pinned-badge')).toBeInTheDocument();
    expect(liveRegion).toHaveTextContent('Pinned Cluster Ops to desktop');

    // Toggle Lock on -> Refresh still works while locked, Pin & Remove are disabled -> unlock
    expect(lockBtn).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(lockBtn);
    expect(lockBtn).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('desktop-widget-locked-badge')).toHaveTextContent(
      'Locked'
    );
    expect(pinBtn).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Remove widget' })).toBeDisabled();
    expect(liveRegion).toHaveTextContent('Locked Cluster Ops position');

    fireEvent.click(refreshBtn);
    expect(onRefresh).toHaveBeenCalledTimes(3);

    fireEvent.click(lockBtn);
    expect(lockBtn).toHaveAttribute('aria-pressed', 'false');
    expect(screen.queryByTestId('desktop-widget-locked-badge')).toBeNull();
    expect(pinBtn).not.toBeDisabled();
    expect(liveRegion).toHaveTextContent('Unlocked Cluster Ops position');
  });

  it('enforces safe two-step inline removal confirmation (cancel and confirm) and suppresses confirmation when locked', () => {
    const onRemove = vi.fn();

    render(
      <DesktopWidgetFrame
        kind="clock"
        defaultTitle="Desk Clock"
        onRemove={onRemove}
      />
    );

    const removeBtn = screen.getByRole('button', { name: 'Remove widget' });
    const lockBtn = screen.getByRole('button', { name: 'Lock position' });
    const editBtn = screen.getByRole('button', { name: 'Edit widget' });

    // Step 1: Click Remove -> confirmation bar opens, onRemove NOT called yet
    fireEvent.click(removeBtn);
    expect(onRemove).not.toHaveBeenCalled();
    const confirmBar = screen.getByRole('alertdialog', {
      name: 'Confirm widget removal',
    });
    expect(confirmBar).toBeInTheDocument();

    // Cancel closes confirmation bar without calling onRemove
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(
      screen.queryByTestId('desktop-widget-remove-confirm-bar')
    ).toBeNull();
    expect(onRemove).not.toHaveBeenCalled();
    expect(
      screen.getByTestId('desktop-widget-live-region')
    ).toHaveTextContent('Widget removal cancelled');

    // Locking while confirmation bar is open immediately suppresses confirmation
    fireEvent.click(removeBtn);
    expect(
      screen.getByTestId('desktop-widget-remove-confirm-bar')
    ).toBeInTheDocument();
    fireEvent.click(lockBtn);
    expect(
      screen.queryByTestId('desktop-widget-remove-confirm-bar')
    ).toBeNull();
    fireEvent.click(lockBtn);

    // Opening Edit while confirmation is open dismisses confirmation; clicking Remove closes Edit
    fireEvent.click(removeBtn);
    fireEvent.click(editBtn);
    expect(
      screen.queryByTestId('desktop-widget-remove-confirm-bar')
    ).toBeNull();
    expect(
      screen.getByTestId('desktop-widget-edit-panel')
    ).toBeInTheDocument();
    fireEvent.click(removeBtn);
    expect(screen.queryByTestId('desktop-widget-edit-panel')).toBeNull();
    expect(
      screen.getByTestId('desktop-widget-remove-confirm-bar')
    ).toBeInTheDocument();

    // Step 2: Confirm Remove triggers onRemove exactly once
    fireEvent.click(screen.getByRole('button', { name: 'Confirm Remove' }));
    expect(onRemove).toHaveBeenCalledTimes(1);
    expect(
      screen.queryByTestId('desktop-widget-remove-confirm-bar')
    ).toBeNull();
    expect(
      screen.getByTestId('desktop-widget-live-region')
    ).toHaveTextContent('Removed Desk Clock');
  });

  it('edits size, title (trimmed/bounded), tone, and refresh cadence in inline configuration panel with Done, Enter, and IME-safe Escape', () => {
    const onSizeChange = vi.fn();
    const onConfigChange = vi.fn();

    render(
      <DesktopWidgetFrame
        kind="telemetry"
        onSizeChange={onSizeChange}
        onConfigChange={onConfigChange}
        data-testid="editable-widget"
      />
    );

    const root = screen.getByTestId('editable-widget');
    const editBtn = screen.getByRole('button', { name: 'Edit widget' });

    expect(editBtn).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(editBtn);
    expect(editBtn).toHaveAttribute('aria-expanded', 'true');
    expect(root).toHaveAttribute('data-editing', 'true');

    // Test IME-safe Escape & Enter on title input
    const titleInput = screen.getByTestId(
      'desktop-widget-title-input'
    ) as HTMLInputElement;
    fireEvent.change(titleInput, { target: { value: 'Unsaved Draft' } });

    dispatchComposingKeyDown(titleInput, 'Escape');
    expect(
      screen.getByTestId('desktop-widget-edit-panel')
    ).toBeInTheDocument();
    dispatchComposingKeyDown(titleInput, 'Enter');
    expect(
      screen.getByTestId('desktop-widget-edit-panel')
    ).toBeInTheDocument();
    expect(onConfigChange).not.toHaveBeenCalled();

    // Regular key does not close edit panel
    fireEvent.keyDown(titleInput, { key: 'a' });
    expect(
      screen.getByTestId('desktop-widget-edit-panel')
    ).toBeInTheDocument();

    // Non-composing Escape closes edit mode without saving draft title
    fireEvent.keyDown(titleInput, { key: 'Escape' });
    expect(screen.queryByTestId('desktop-widget-edit-panel')).toBeNull();
    expect(screen.getByTestId('desktop-widget-title')).toHaveTextContent(
      'System Telemetry'
    );
    expect(onConfigChange).not.toHaveBeenCalled();

    // Re-open Edit, toggle closed via Edit button, then re-open to commit changes
    fireEvent.click(editBtn);
    fireEvent.click(editBtn);
    expect(screen.queryByTestId('desktop-widget-edit-panel')).toBeNull();

    fireEvent.click(editBtn);
    const activeTitleInput = screen.getByTestId(
      'desktop-widget-title-input'
    ) as HTMLInputElement;
    fireEvent.change(activeTitleInput, {
      target: { value: '   GPU Cluster   ' },
    });

    // Select size 2×2 ('lg')
    const lgBtn = screen.getByTestId('desktop-widget-size-opt-lg');
    expect(lgBtn).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(lgBtn);
    expect(lgBtn).toHaveAttribute('aria-pressed', 'true');
    expect(onSizeChange).toHaveBeenCalledWith('lg');
    expect(root).toHaveAttribute('data-size', 'lg');

    // Select tone 'success'
    const successBtn = screen.getByTestId('desktop-widget-tone-opt-success');
    fireEvent.click(successBtn);
    expect(successBtn).toHaveAttribute('aria-pressed', 'true');
    expect(root).toHaveAttribute('data-tone', 'success');

    // Cycle refresh cadence across Manual (0), 15s (15), 5m (300)
    fireEvent.click(screen.getByTestId('desktop-widget-refresh-opt-0'));
    expect(
      screen.getByTestId('desktop-widget-cadence-label')
    ).toHaveTextContent('Manual');

    fireEvent.click(screen.getByTestId('desktop-widget-refresh-opt-300'));
    expect(
      screen.getByTestId('desktop-widget-cadence-label')
    ).toHaveTextContent('Every 5m');

    fireEvent.click(screen.getByTestId('desktop-widget-refresh-opt-15'));
    expect(
      screen.getByTestId('desktop-widget-refresh-opt-15')
    ).toHaveAttribute('aria-pressed', 'true');
    expect(
      screen.getByTestId('desktop-widget-cadence-label')
    ).toHaveTextContent('Every 15s');

    // Click Done -> commits trimmed title and fires onConfigChange
    fireEvent.click(screen.getByRole('button', { name: 'Done' }));
    expect(screen.queryByTestId('desktop-widget-edit-panel')).toBeNull();
    expect(screen.getByTestId('desktop-widget-title')).toHaveTextContent(
      'GPU Cluster'
    );
    expect(onConfigChange).toHaveBeenCalledTimes(1);
    const expectedConfig: DesktopWidgetConfig = {
      title: 'GPU Cluster',
      size: 'lg',
      tone: 'success',
      refreshSeconds: 15,
      locked: false,
      pinned: true,
    };
    expect(onConfigChange).toHaveBeenLastCalledWith(expectedConfig);

    // Re-open, clear title to whitespace, press Enter -> falls back cleanly to canonical kind title
    fireEvent.click(editBtn);
    const clearTitleInput = screen.getByTestId('desktop-widget-title-input');
    fireEvent.change(clearTitleInput, { target: { value: '     ' } });
    fireEvent.keyDown(clearTitleInput, { key: 'Enter' });
    expect(screen.queryByTestId('desktop-widget-edit-panel')).toBeNull();
    expect(screen.getByTestId('desktop-widget-title')).toHaveTextContent(
      'System Telemetry'
    );
  });

  it('respects all controlled props without mutating internal DOM state until parent rerenders', () => {
    const onSizeChange = vi.fn();
    const onConfigChange = vi.fn();

    const { rerender } = render(
      <DesktopWidgetFrame
        kind="weather"
        title="Studio Sky"
        size="md"
        tone="info"
        locked={false}
        pinned={true}
        refreshSeconds={60}
        onSizeChange={onSizeChange}
        onConfigChange={onConfigChange}
        data-testid="controlled-widget"
      />
    );

    const root = screen.getByTestId('controlled-widget');

    // Pin toggle emits onConfigChange with pinned: false, while root stays controlled at true
    fireEvent.click(screen.getByRole('button', { name: 'Pin to desktop' }));
    expect(onConfigChange).toHaveBeenLastCalledWith({
      title: 'Studio Sky',
      size: 'md',
      tone: 'info',
      refreshSeconds: 60,
      locked: false,
      pinned: false,
    });
    expect(root).toHaveAttribute('data-pinned', 'true');

    // Lock toggle emits onConfigChange with locked: true, while root stays controlled at false
    fireEvent.click(screen.getByRole('button', { name: 'Lock position' }));
    expect(onConfigChange).toHaveBeenLastCalledWith({
      title: 'Studio Sky',
      size: 'md',
      tone: 'info',
      refreshSeconds: 60,
      locked: true,
      pinned: true,
    });
    expect(root).toHaveAttribute('data-locked', 'false');

    // Edit panel updates draft and fires callbacks without mutating controlled props
    fireEvent.click(screen.getByRole('button', { name: 'Edit widget' }));
    fireEvent.change(screen.getByTestId('desktop-widget-title-input'), {
      target: { value: 'Rooftop Sensor' },
    });
    fireEvent.click(screen.getByTestId('desktop-widget-size-opt-sm'));
    expect(onSizeChange).toHaveBeenCalledWith('sm');
    expect(root).toHaveAttribute('data-size', 'md');

    fireEvent.click(screen.getByTestId('desktop-widget-tone-opt-warning'));
    fireEvent.click(screen.getByTestId('desktop-widget-refresh-opt-300'));
    fireEvent.click(screen.getByRole('button', { name: 'Done' }));

    expect(onConfigChange).toHaveBeenLastCalledWith({
      title: 'Rooftop Sensor',
      size: 'sm',
      tone: 'warning',
      refreshSeconds: 300,
      locked: false,
      pinned: true,
    });
    expect(screen.getByTestId('desktop-widget-title')).toHaveTextContent(
      'Studio Sky'
    );
    expect(root).toHaveAttribute('data-tone', 'info');

    // Parent applies controlled updates -> DOM reflects new props cleanly
    rerender(
      <DesktopWidgetFrame
        kind="weather"
        title="Rooftop Sensor"
        size="sm"
        tone="warning"
        locked={true}
        pinned={false}
        refreshSeconds={300}
        onSizeChange={onSizeChange}
        onConfigChange={onConfigChange}
        data-testid="controlled-widget"
      />
    );
    expect(screen.getByTestId('desktop-widget-title')).toHaveTextContent(
      'Rooftop Sensor'
    );
    expect(root).toHaveAttribute('data-size', 'sm');
    expect(root).toHaveAttribute('data-tone', 'warning');
    expect(root).toHaveAttribute('data-locked', 'true');
    expect(root).toHaveAttribute('data-pinned', 'false');
    expect(
      screen.getByTestId('desktop-widget-cadence-label')
    ).toHaveTextContent('Every 5m');
  });

  it('adversarially guards locked widgets against resize, unpinning, sticky-note editing, and removal even if DOM disabled attributes are stripped', () => {
    const onSizeChange = vi.fn();
    const onConfigChange = vi.fn();
    const onRemove = vi.fn();

    const { rerender } = render(
      <DesktopWidgetFrame
        kind="notes"
        defaultSize="md"
        defaultLocked={true}
        defaultPinned={true}
        onSizeChange={onSizeChange}
        onConfigChange={onConfigChange}
        onRemove={onRemove}
        data-testid="locked-widget"
      />
    );

    const root = screen.getByTestId('locked-widget');
    expect(root).toHaveAttribute('data-locked', 'true');

    // Sticky note is readOnly and refuses synthetic change events
    const textarea = screen.getByTestId(
      'desktop-widget-notes-textarea'
    ) as HTMLTextAreaElement;
    const originalNote = textarea.value;
    expect(textarea).toHaveAttribute('readonly');
    expect(screen.getByTestId('desktop-widget-notes-status')).toHaveTextContent(
      'Read-only (locked)'
    );
    fireEvent.change(textarea, { target: { value: 'Tampered while locked' } });
    expect(textarea.value).toBe(originalNote);

    // Strip disabled attribute from Pin and Remove buttons and click them adversarially
    const pinBtn = screen.getByRole('button', { name: 'Pin to desktop' });
    const removeBtn = screen.getByRole('button', { name: 'Remove widget' });
    expect(pinBtn).toBeDisabled();
    expect(removeBtn).toBeDisabled();

    pinBtn.removeAttribute('disabled');
    fireEvent.click(pinBtn);
    expect(root).toHaveAttribute('data-pinned', 'true');
    expect(onConfigChange).not.toHaveBeenCalled();

    removeBtn.removeAttribute('disabled');
    fireEvent.click(removeBtn);
    expect(
      screen.queryByTestId('desktop-widget-remove-confirm-bar')
    ).toBeNull();
    expect(onRemove).not.toHaveBeenCalled();

    // Open Edit while locked: size hint shown, size pills disabled and guarded even when stripped
    fireEvent.click(screen.getByRole('button', { name: 'Edit widget' }));
    expect(
      screen.getByTestId('desktop-widget-size-locked-hint')
    ).toHaveTextContent('Unlock to resize');

    const lgOption = screen.getByTestId('desktop-widget-size-opt-lg');
    expect(lgOption).toBeDisabled();
    lgOption.removeAttribute('disabled');
    fireEvent.click(lgOption);
    expect(onSizeChange).not.toHaveBeenCalled();
    expect(root).toHaveAttribute('data-size', 'md');

    // Done while locked preserves locked size cleanly
    fireEvent.click(screen.getByRole('button', { name: 'Done' }));
    expect(onConfigChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ size: 'md', locked: true, pinned: true })
    );

    // Test controlled lock transition blocking confirmRemove even if triggered programmatically
    rerender(
      <DesktopWidgetFrame
        kind="notes"
        locked={false}
        onRemove={onRemove}
        data-testid="locked-widget"
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Remove widget' }));
    expect(
      screen.getByTestId('desktop-widget-remove-confirm-bar')
    ).toBeInTheDocument();

    // Controlled locked becomes true -> confirmation bar disappears immediately
    rerender(
      <DesktopWidgetFrame
        kind="notes"
        locked={true}
        onRemove={onRemove}
        data-testid="locked-widget"
      />
    );
    expect(
      screen.queryByTestId('desktop-widget-remove-confirm-bar')
    ).toBeNull();
    expect(onRemove).not.toHaveBeenCalled();
  });

  it('enforces disabled state across chrome, edit panel, and notes even when DOM disabled attributes are stripped, plus IME button guards', () => {
    const onRefresh = vi.fn();
    const onSizeChange = vi.fn();
    const onConfigChange = vi.fn();
    const onRemove = vi.fn();

    // Open edit panel first, then flip disabled=true to adversarially test edit panel handler guards
    const { rerender, unmount } = render(
      <DesktopWidgetFrame
        kind="notes"
        onRefresh={onRefresh}
        onSizeChange={onSizeChange}
        onConfigChange={onConfigChange}
        onRemove={onRemove}
        data-testid="disabled-widget"
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Edit widget' }));
    expect(
      screen.getByTestId('desktop-widget-edit-panel')
    ).toBeInTheDocument();

    rerender(
      <DesktopWidgetFrame
        kind="notes"
        disabled
        onRefresh={onRefresh}
        onSizeChange={onSizeChange}
        onConfigChange={onConfigChange}
        onRemove={onRemove}
        data-testid="disabled-widget"
      />
    );

    const root = screen.getByTestId('disabled-widget');
    expect(root).toHaveAttribute('aria-disabled', 'true');
    expect(root).toHaveAttribute('data-disabled', 'true');

    // Adversarially strip disabled on edit panel controls and invoke handlers
    const titleInput = screen.getByTestId('desktop-widget-title-input');
    titleInput.removeAttribute('disabled');
    fireEvent.change(titleInput, { target: { value: 'Blocked Title' } });
    expect((titleInput as HTMLInputElement).value).toBe('Sticky Notes');
    fireEvent.keyDown(titleInput, { key: 'Enter' });
    fireEvent.keyDown(titleInput, { key: 'Escape' });
    expect(
      screen.getByTestId('desktop-widget-edit-panel')
    ).toBeInTheDocument();

    const smOpt = screen.getByTestId('desktop-widget-size-opt-sm');
    smOpt.removeAttribute('disabled');
    fireEvent.click(smOpt);

    const toneOpt = screen.getByTestId('desktop-widget-tone-opt-warning');
    toneOpt.removeAttribute('disabled');
    fireEvent.click(toneOpt);

    const refreshOpt = screen.getByTestId('desktop-widget-refresh-opt-0');
    refreshOpt.removeAttribute('disabled');
    fireEvent.click(refreshOpt);

    const doneBtn = screen.getByTestId('desktop-widget-edit-done');
    doneBtn.removeAttribute('disabled');
    fireEvent.click(doneBtn);

    // Also strip disabled on all chrome buttons and invoke handlers
    const chromeButtons = [
      screen.getByRole('button', { name: 'Refresh widget' }),
      screen.getByRole('button', { name: 'Pin to desktop' }),
      screen.getByRole('button', { name: 'Lock position' }),
      screen.getByRole('button', { name: 'Edit widget' }),
      screen.getByRole('button', { name: 'Remove widget' }),
    ];
    for (const btn of chromeButtons) {
      expect(btn).toBeDisabled();
      btn.removeAttribute('disabled');
      fireEvent.click(btn);
    }

    expect(onRefresh).not.toHaveBeenCalled();
    expect(onSizeChange).not.toHaveBeenCalled();
    expect(onConfigChange).not.toHaveBeenCalled();
    expect(onRemove).not.toHaveBeenCalled();

    unmount();

    // Render disabled in display mode for notes status + IME keydown check after re-enabling
    const { rerender: rerenderNotes } = render(
      <DesktopWidgetFrame kind="notes" disabled />
    );
    expect(screen.getByTestId('desktop-widget-notes-status')).toHaveTextContent(
      'Disabled'
    );

    rerenderNotes(<DesktopWidgetFrame kind="notes" />);
    const refreshBtnEnabled = screen.getByRole('button', {
      name: 'Refresh widget',
    });
    const composingEvt = dispatchComposingKeyDown(refreshBtnEnabled, 'Enter');
    expect(composingEvt.defaultPrevented).toBe(true);

    const normalEvt = new KeyboardEvent('keydown', {
      key: 'Enter',
      bubbles: true,
      cancelable: true,
      isComposing: false,
    });
    refreshBtnEnabled.dispatchEvent(normalEvt);
    expect(normalEvt.defaultPrevented).toBe(false);
  });

  it('sanitizes whitespace, overly long defaultTitle, and XSS payloads in title and lastUpdatedLabel without injecting HTML', () => {
    const xssPayload =
      '<script>window.__dwXss=1</script><img src=x onerror=alert(1)>';

    const { rerender } = render(
      <DesktopWidgetFrame
        kind="telemetry"
        defaultTitle="   "
        lastUpdatedLabel="   "
      />
    );
    expect(screen.getByTestId('desktop-widget-title')).toHaveTextContent(
      'System Telemetry'
    );
    expect(
      screen.getByTestId('desktop-widget-last-updated')
    ).toHaveTextContent('Just now');

    // XSS payload in controlled title & lastUpdatedLabel renders strictly as escaped text
    rerender(
      <DesktopWidgetFrame
        kind="telemetry"
        title={xssPayload}
        lastUpdatedLabel={xssPayload}
      />
    );
    expect(document.querySelector('script')).toBeNull();
    expect(document.querySelector('img')).toBeNull();
    expect(screen.getByTestId('desktop-widget-title')).toHaveTextContent(
      xssPayload
    );
    expect(
      screen.getByTestId('desktop-widget-last-updated')
    ).toHaveTextContent(xssPayload);

    // Over-length controlled title is strictly bounded to 64 characters
    rerender(
      <DesktopWidgetFrame kind="telemetry" title={'W'.repeat(90)} />
    );
    expect(
      screen.getByTestId('desktop-widget-title').textContent
    ).toHaveLength(64);
  });
});
