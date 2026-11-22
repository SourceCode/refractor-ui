import { createRef, useState, type KeyboardEvent } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import {
  TransportControlBar,
  type TransportPlaybackState,
  type TransportStateMap,
} from './index';

describe('TransportControlBar', () => {
  it('renders prism-slab toolbar with ref, theme override, responsive classes, and transitions across all playback states via clicks', () => {
    const ref = createRef<HTMLDivElement>();
    const onPlaybackStateChange = vi.fn<(state: TransportPlaybackState) => void>();
    const onLoopChange = vi.fn<(loop: boolean) => void>();
    const onJumpStart = vi.fn();
    const onJumpEnd = vi.fn();

    render(
      <PrismThemeProvider
        theme={{
          components: {
            TransportControlBar: {
              className: 'theme-transport-bar',
              style: { maxWidth: '680px' },
            },
          },
        }}
      >
        <TransportControlBar
          ref={ref}
          statusLabel="REC · Ch 1–2"
          onPlaybackStateChange={onPlaybackStateChange}
          onLoopChange={onLoopChange}
          onJumpStart={onJumpStart}
          onJumpEnd={onJumpEnd}
          className="local-transport-bar"
          xstyle={{ '--prism-blur-px': '20px' }}
          data-testid="transport-deck"
        />
      </PrismThemeProvider>
    );

    expect(TransportControlBar.displayName).toBe('TransportControlBar');

    const toolbar = screen.getByRole('toolbar', { name: 'Media transport controls' });
    expect(ref.current).toBe(toolbar);
    expect(toolbar).toHaveClass(
      'refractor-transport-control-bar',
      'prism-slab',
      'flex-wrap',
      'max-w-full',
      'theme-transport-bar',
      'local-transport-bar'
    );
    expect(toolbar).toHaveStyle({ maxWidth: '680px' });
    expect(toolbar).toHaveAttribute('tabindex', '0');
    expect(toolbar).toHaveAttribute('data-state', 'stopped');
    expect(toolbar).not.toHaveAttribute('data-loop');
    expect(toolbar).not.toHaveAttribute('data-disabled');

    const statusBadge = screen.getByTestId('transport-status-badge');
    expect(statusBadge).toHaveClass('prism-well', 'refractor-transport-control-bar__status');
    expect(statusBadge).toHaveAttribute('role', 'status');
    expect(statusBadge).toHaveAttribute('aria-live', 'polite');
    expect(screen.getByTestId('transport-state-text')).toHaveTextContent('STOPPED');
    expect(screen.getByTestId('transport-status-label')).toHaveTextContent('REC · Ch 1–2');
    expect(screen.queryByTestId('transport-loop-pill')).not.toBeInTheDocument();

    // Jump Start & Jump End callbacks
    fireEvent.click(screen.getByRole('button', { name: 'Jump to start' }));
    fireEvent.click(screen.getByRole('button', { name: 'Jump to end' }));
    expect(onJumpStart).toHaveBeenCalledTimes(1);
    expect(onJumpEnd).toHaveBeenCalledTimes(1);

    // Play -> playing (prism-btn-primary, aria-pressed=true, pulsing dot)
    const playBtn = screen.getByRole('button', { name: 'Play' });
    expect(playBtn).toHaveClass('prism-crystal');
    expect(playBtn).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(playBtn);

    expect(onPlaybackStateChange).toHaveBeenLastCalledWith('playing');
    expect(toolbar).toHaveAttribute('data-state', 'playing');
    expect(screen.getByTestId('transport-state-text')).toHaveTextContent('PLAYING');
    expect(screen.getByTestId('transport-status-dot')).toHaveClass('animate-pulse');

    const pauseBtn = screen.getByRole('button', { name: 'Pause' });
    expect(pauseBtn).toHaveClass('prism-btn-primary');
    expect(pauseBtn).toHaveAttribute('aria-pressed', 'true');

    // Pause -> paused
    fireEvent.click(pauseBtn);
    expect(onPlaybackStateChange).toHaveBeenLastCalledWith('paused');
    expect(toolbar).toHaveAttribute('data-state', 'paused');
    expect(screen.getByTestId('transport-state-text')).toHaveTextContent('PAUSED');
    expect(screen.getByTestId('transport-status-dot')).not.toHaveClass('animate-pulse');

    // Record -> recording (armed with --prism-error-main and pulse)
    const recordBtn = screen.getByRole('button', { name: 'Record' });
    expect(recordBtn).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(recordBtn);

    expect(onPlaybackStateChange).toHaveBeenLastCalledWith('recording');
    expect(toolbar).toHaveAttribute('data-state', 'recording');
    expect(recordBtn).toHaveAttribute('aria-pressed', 'true');
    expect(recordBtn).toHaveAttribute('data-recording', 'true');
    expect(recordBtn.style.color).toBe('var(--prism-error-main)');
    expect(recordBtn.style.boxShadow).toBe('inset 0 0 0 1.5px var(--prism-error-main)');
    expect(screen.getByTestId('transport-record-indicator')).toHaveClass('animate-pulse');
    expect(screen.getByTestId('transport-state-text')).toHaveTextContent('RECORDING');

    // Clicking Record while recording toggles back to stopped
    fireEvent.click(recordBtn);
    expect(onPlaybackStateChange).toHaveBeenLastCalledWith('stopped');
    expect(toolbar).toHaveAttribute('data-state', 'stopped');
    expect(recordBtn).toHaveAttribute('aria-pressed', 'false');
    expect(recordBtn).not.toHaveAttribute('data-recording');

    // Record -> Stop resets cleanly to stopped
    fireEvent.click(recordBtn);
    expect(toolbar).toHaveAttribute('data-state', 'recording');
    fireEvent.click(screen.getByRole('button', { name: 'Stop' }));
    expect(onPlaybackStateChange).toHaveBeenLastCalledWith('stopped');
    expect(toolbar).toHaveAttribute('data-state', 'stopped');
    expect(screen.getByTestId('transport-state-text')).toHaveTextContent('STOPPED');

    // Loop toggle -> prism-emerald + LOOP pill -> toggle off
    const loopBtn = screen.getByRole('button', { name: 'Loop' });
    expect(loopBtn).toHaveClass('prism-crystal');
    expect(loopBtn).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(loopBtn);
    expect(onLoopChange).toHaveBeenLastCalledWith(true);
    expect(toolbar).toHaveAttribute('data-loop', 'true');
    expect(loopBtn).toHaveClass('prism-emerald');
    expect(loopBtn).toHaveAttribute('aria-pressed', 'true');
    const loopPill = screen.getByTestId('transport-loop-pill');
    expect(loopPill).toHaveClass('prism-emerald');
    expect(loopPill).toHaveTextContent('LOOP');

    fireEvent.click(loopBtn);
    expect(onLoopChange).toHaveBeenLastCalledWith(false);
    expect(toolbar).not.toHaveAttribute('data-loop');
    expect(loopBtn).toHaveClass('prism-crystal');
    expect(loopBtn).toHaveAttribute('aria-pressed', 'false');
    expect(screen.queryByTestId('transport-loop-pill')).not.toBeInTheDocument();
  });

  it('supports controlled playbackState and loop props alongside defaultLoop and defaultPlaybackState', () => {
    const stateKeys: Array<keyof TransportStateMap> = ['stopped', 'playing', 'paused', 'recording'];
    expect(stateKeys).toHaveLength(4);

    function ControlledTransportHarness() {
      const [playbackState, setPlaybackState] = useState<TransportPlaybackState>('paused');
      const [loop, setLoop] = useState<boolean>(true);
      return (
        <TransportControlBar
          playbackState={playbackState}
          onPlaybackStateChange={setPlaybackState}
          loop={loop}
          onLoopChange={setLoop}
        />
      );
    }

    render(<ControlledTransportHarness />);

    expect(screen.getByTestId('transport-state-text')).toHaveTextContent('PAUSED');
    expect(screen.getByTestId('transport-loop-pill')).toHaveTextContent('LOOP');
    expect(screen.queryByTestId('transport-status-label')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Play' }));
    expect(screen.getByTestId('transport-state-text')).toHaveTextContent('PLAYING');

    fireEvent.click(screen.getByRole('button', { name: 'Loop' }));
    expect(screen.queryByTestId('transport-loop-pill')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Stop' }));
    expect(screen.getByTestId('transport-state-text')).toHaveTextContent('STOPPED');
  });

  it('supports keyboard shortcuts on the toolbar (Space, Home, End, l/L, r/R) and forwards consumer onKeyDown', () => {
    const onPlaybackStateChange = vi.fn<(state: TransportPlaybackState) => void>();
    const onLoopChange = vi.fn<(loop: boolean) => void>();
    const onJumpStart = vi.fn();
    const onJumpEnd = vi.fn();
    const onKeyDown = vi.fn<(event: KeyboardEvent<HTMLDivElement>) => void>();

    render(
      <TransportControlBar
        onPlaybackStateChange={onPlaybackStateChange}
        onLoopChange={onLoopChange}
        onJumpStart={onJumpStart}
        onJumpEnd={onJumpEnd}
        onKeyDown={onKeyDown}
      />
    );

    const toolbar = screen.getByRole('toolbar', { name: 'Media transport controls' });
    toolbar.focus();

    // Space toggles Play -> Pause
    fireEvent.keyDown(toolbar, { key: ' ' });
    expect(onPlaybackStateChange).toHaveBeenLastCalledWith('playing');
    expect(screen.getByTestId('transport-state-text')).toHaveTextContent('PLAYING');

    fireEvent.keyDown(toolbar, { key: ' ' });
    expect(onPlaybackStateChange).toHaveBeenLastCalledWith('paused');
    expect(screen.getByTestId('transport-state-text')).toHaveTextContent('PAUSED');

    // Home / End invoke jump handlers
    fireEvent.keyDown(toolbar, { key: 'Home' });
    fireEvent.keyDown(toolbar, { key: 'End' });
    expect(onJumpStart).toHaveBeenCalledTimes(1);
    expect(onJumpEnd).toHaveBeenCalledTimes(1);

    // l / L toggle loop
    fireEvent.keyDown(toolbar, { key: 'l' });
    expect(onLoopChange).toHaveBeenLastCalledWith(true);
    expect(screen.getByTestId('transport-loop-pill')).toBeInTheDocument();

    fireEvent.keyDown(toolbar, { key: 'L' });
    expect(onLoopChange).toHaveBeenLastCalledWith(false);
    expect(screen.queryByTestId('transport-loop-pill')).not.toBeInTheDocument();

    // r / R toggle recording when allowRecord is true
    fireEvent.keyDown(toolbar, { key: 'r' });
    expect(onPlaybackStateChange).toHaveBeenLastCalledWith('recording');
    expect(screen.getByTestId('transport-state-text')).toHaveTextContent('RECORDING');

    fireEvent.keyDown(toolbar, { key: 'R' });
    expect(onPlaybackStateChange).toHaveBeenLastCalledWith('stopped');
    expect(screen.getByTestId('transport-state-text')).toHaveTextContent('STOPPED');

    // Unrelated key is a safe no-op
    fireEvent.keyDown(toolbar, { key: 'x' });
    expect(onPlaybackStateChange).toHaveBeenCalledTimes(4);
    expect(onKeyDown).toHaveBeenCalledTimes(9);
  });

  it('omits Record button and ignores r/R shortcut when allowRecord is false, and handles missing jump callbacks gracefully', () => {
    const onPlaybackStateChange = vi.fn<(state: TransportPlaybackState) => void>();

    render(
      <TransportControlBar
        allowRecord={false}
        defaultPlaybackState="stopped"
        defaultLoop
        onPlaybackStateChange={onPlaybackStateChange}
      />
    );

    expect(screen.queryByRole('button', { name: 'Record' })).not.toBeInTheDocument();
    expect(screen.getByTestId('transport-loop-pill')).toHaveTextContent('LOOP');

    const toolbar = screen.getByRole('toolbar', { name: 'Media transport controls' });
    fireEvent.keyDown(toolbar, { key: 'r' });
    fireEvent.keyDown(toolbar, { key: 'R' });
    expect(onPlaybackStateChange).not.toHaveBeenCalled();

    // Home/End without onJumpStart/onJumpEnd should not throw
    expect(() => {
      fireEvent.keyDown(toolbar, { key: 'Home' });
      fireEvent.keyDown(toolbar, { key: 'End' });
    }).not.toThrow();
  });

  it('guards IME composition, modifier chords, child-button Space, and consumer defaultPrevented (negative tests)', () => {
    const onPlaybackStateChange = vi.fn<(state: TransportPlaybackState) => void>();
    const onLoopChange = vi.fn<(loop: boolean) => void>();
    const onJumpStart = vi.fn();
    const onJumpEnd = vi.fn();
    let blockShortcuts = false;

    render(
      <TransportControlBar
        onPlaybackStateChange={onPlaybackStateChange}
        onLoopChange={onLoopChange}
        onJumpStart={onJumpStart}
        onJumpEnd={onJumpEnd}
        onKeyDown={(event) => {
          if (blockShortcuts) {
            event.preventDefault();
          }
        }}
      />
    );

    const toolbar = screen.getByRole('toolbar', { name: 'Media transport controls' });
    const stopBtn = screen.getByRole('button', { name: 'Stop' });

    // IME composing keystrokes are ignored
    fireEvent.keyDown(toolbar, { key: ' ', isComposing: true });
    fireEvent.keyDown(toolbar, { key: 'l', isComposing: true });
    fireEvent.keyDown(toolbar, { key: 'r', isComposing: true });
    fireEvent.keyDown(toolbar, { key: 'Home', isComposing: true });
    fireEvent.keyDown(toolbar, { key: 'End', isComposing: true });

    // Modifier chords (Ctrl, Meta, Alt) do not trigger transport shortcuts
    fireEvent.keyDown(toolbar, { key: 'r', ctrlKey: true });
    fireEvent.keyDown(toolbar, { key: 'l', metaKey: true });
    fireEvent.keyDown(toolbar, { key: 'Home', altKey: true });

    // Pressing Space while focused on a child button does not hijack into toolbar Play/Pause
    fireEvent.keyDown(stopBtn, { key: ' ' });

    // Consumer preventDefault cancels built-in shortcut
    blockShortcuts = true;
    fireEvent.keyDown(toolbar, { key: ' ' });
    blockShortcuts = false;

    expect(onPlaybackStateChange).not.toHaveBeenCalled();
    expect(onLoopChange).not.toHaveBeenCalled();
    expect(onJumpStart).not.toHaveBeenCalled();
    expect(onJumpEnd).not.toHaveBeenCalled();
  });

  it('disables all buttons and ignores keyboard shortcuts when disabled is true (negative test)', () => {
    const onPlaybackStateChange = vi.fn<(state: TransportPlaybackState) => void>();
    const onLoopChange = vi.fn<(loop: boolean) => void>();
    const onJumpStart = vi.fn();
    const onJumpEnd = vi.fn();

    render(
      <TransportControlBar
        disabled
        onPlaybackStateChange={onPlaybackStateChange}
        onLoopChange={onLoopChange}
        onJumpStart={onJumpStart}
        onJumpEnd={onJumpEnd}
      />
    );

    const toolbar = screen.getByRole('toolbar', { name: 'Media transport controls' });
    expect(toolbar).toHaveAttribute('data-disabled', 'true');
    expect(toolbar).toHaveAttribute('aria-disabled', 'true');
    expect(toolbar).toHaveAttribute('tabindex', '-1');

    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(6);
    for (const button of buttons) {
      expect(button).toBeDisabled();
      fireEvent.click(button);
    }

    fireEvent.keyDown(toolbar, { key: ' ' });
    fireEvent.keyDown(toolbar, { key: 'Home' });
    fireEvent.keyDown(toolbar, { key: 'End' });
    fireEvent.keyDown(toolbar, { key: 'l' });
    fireEvent.keyDown(toolbar, { key: 'L' });
    fireEvent.keyDown(toolbar, { key: 'r' });
    fireEvent.keyDown(toolbar, { key: 'R' });

    expect(onPlaybackStateChange).not.toHaveBeenCalled();
    expect(onLoopChange).not.toHaveBeenCalled();
    expect(onJumpStart).not.toHaveBeenCalled();
    expect(onJumpEnd).not.toHaveBeenCalled();
  });

  it('renders adversarial XSS payloads in statusLabel as literal text and withstands rapid state thrashing', () => {
    const payload = '<script>window.__transportBarXss=1</script><img src=x onerror=alert(1)>';

    render(<TransportControlBar statusLabel={payload} />);

    expect(document.querySelector('script')).toBeNull();
    expect(document.querySelector('img')).toBeNull();
    expect(screen.getByTestId('transport-status-label')).toHaveTextContent(payload);

    const toolbar = screen.getByRole('toolbar', { name: 'Media transport controls' });
    for (let i = 0; i < 5; i += 1) {
      fireEvent.keyDown(toolbar, { key: ' ' });
      fireEvent.keyDown(toolbar, { key: 'r' });
      fireEvent.keyDown(toolbar, { key: 'l' });
      fireEvent.click(screen.getByRole('button', { name: 'Stop' }));
    }

    expect(toolbar).toHaveAttribute('data-state', 'stopped');
    expect(screen.getByTestId('transport-state-text')).toHaveTextContent('STOPPED');
    expect(screen.getByTestId('transport-loop-pill')).toHaveTextContent('LOOP');
  });
});
