import { createRef, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import {
  PerAppAudioMixer,
  type AudioMixerAppChannel,
  type AudioMixerChannelToneMap,
  type AudioMixerDeviceOption,
  type PerAppAudioMixerState,
} from './index';

describe('PerAppAudioMixer', () => {
  it('renders defaults, 3 output & 2 input devices, master 80%, 4 app channels, ref, theme overrides, and zero raw colors', () => {
    const ref = createRef<HTMLDivElement>();
    const toneMapKeys: ReadonlyArray<keyof AudioMixerChannelToneMap> = [
      'primary',
      'info',
      'emerald',
      'amber',
    ];
    expect(toneMapKeys).toHaveLength(4);

    const { container } = render(
      <PrismThemeProvider
        theme={{
          components: {
            PerAppAudioMixer: {
              className: 'theme-audio-mixer',
              style: { maxWidth: '420px' },
            },
          },
        }}
      >
        <PerAppAudioMixer
          ref={ref}
          className="consumer-audio-mixer"
          xstyle={{ '--prism-blur-px': '20px' }}
          data-testid="mixer-root"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('mixer-root');
    expect(ref.current).toBe(root);
    expect(PerAppAudioMixer.displayName).toBe('PerAppAudioMixer');
    expect(root).toHaveAttribute('role', 'region');
    expect(root).toHaveClass(
      'refractor-per-app-audio-mixer',
      'prism-slab',
      'min-w-0',
      'max-w-full',
      'theme-audio-mixer',
      'consumer-audio-mixer'
    );
    expect(root).toHaveStyle({ maxWidth: '420px' });
    expect(root).toHaveAttribute('data-master-band', 'warning');
    expect(root).not.toHaveAttribute('data-master-muted');

    expect(screen.getByTestId('per-app-audio-mixer-title')).toHaveTextContent(
      'Audio Mixer'
    );
    expect(
      screen.getByTestId('per-app-audio-mixer-active-output')
    ).toHaveTextContent('Studio Monitors (USB-C)');

    const outputSelect = screen.getByLabelText(
      'Audio output device'
    ) as HTMLSelectElement;
    expect(Array.from(outputSelect.options).map((o) => o.text)).toEqual([
      'Studio Monitors (USB-C)',
      'Prism Headphones',
      'Built-in Speakers',
    ]);
    expect(outputSelect.value).toBe('studio-monitors');

    const inputSelect = screen.getByLabelText(
      'Audio input device'
    ) as HTMLSelectElement;
    expect(Array.from(inputSelect.options).map((o) => o.text)).toEqual([
      'Broadcast Mic',
      'Built-in Array',
    ]);
    expect(inputSelect.value).toBe('broadcast-mic');

    // Master bus defaults
    const masterMuteBtn = screen.getByRole('button', { name: 'Mute master' });
    expect(masterMuteBtn).toHaveAttribute('aria-pressed', 'false');
    const masterSlider = screen.getByLabelText(
      'Master volume'
    ) as HTMLInputElement;
    expect(masterSlider.value).toBe('80');
    expect(
      screen.getByTestId('per-app-audio-mixer-master-readout')
    ).toHaveTextContent('80%');

    // Default 4 application channels and their effective outputs (channelVol * 80 / 100)
    expect(
      screen.getByTestId('per-app-audio-mixer-active-count')
    ).toHaveTextContent('4 / 4 active');
    expect(
      screen.getByTestId('per-app-audio-mixer-channel-readout-refractor-studio')
    ).toHaveTextContent('72%');
    expect(
      screen.getByTestId('per-app-audio-mixer-channel-readout-optical-browser')
    ).toHaveTextContent('58%');
    expect(
      screen.getByTestId('per-app-audio-mixer-channel-readout-voice-comms')
    ).toHaveTextContent('68%');
    expect(
      screen.getByTestId('per-app-audio-mixer-channel-readout-system-sounds')
    ).toHaveTextContent('36%');

    // Semantic tone dots use strictly --prism-* CSS variables
    expect(
      screen.getByTestId('per-app-audio-mixer-channel-dot-refractor-studio')
        .style.backgroundColor
    ).toBe('var(--prism-primary-main)');
    expect(
      screen.getByTestId('per-app-audio-mixer-channel-dot-optical-browser')
        .style.backgroundColor
    ).toBe('var(--prism-info-main)');
    expect(
      screen.getByTestId('per-app-audio-mixer-channel-dot-voice-comms').style
        .backgroundColor
    ).toBe('var(--prism-success-main)');
    expect(
      screen.getByTestId('per-app-audio-mixer-channel-dot-system-sounds').style
        .backgroundColor
    ).toBe('var(--prism-warning-main)');

    // Polite live status initialized cleanly
    const liveStatus = screen.getByTestId('per-app-audio-mixer-live-status');
    expect(liveStatus).toHaveAttribute('aria-live', 'polite');
    expect(liveStatus).toHaveTextContent(
      'Output Studio Monitors (USB-C), Master volume 80%, 4 applications'
    );

    // Zero raw hex/rgb/hsl color literals in rendered DOM
    expect(container.innerHTML).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(container.innerHTML).not.toMatch(/\b(?:rgba?|hsla?)\s*\(/);
  });

  it('switches output and input devices, updates the active output pill, announces politely, and handles empty device lists', () => {
    const onChange = vi.fn();
    const { rerender } = render(<PerAppAudioMixer onChange={onChange} />);

    const outputSelect = screen.getByLabelText('Audio output device');
    fireEvent.change(outputSelect, { target: { value: 'prism-headphones' } });

    expect(
      screen.getByTestId('per-app-audio-mixer-active-output')
    ).toHaveTextContent('Prism Headphones');
    expect(
      screen.getByTestId('per-app-audio-mixer-live-status')
    ).toHaveTextContent('Audio output switched to Prism Headphones');
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ outputDeviceId: 'prism-headphones' })
    );

    const inputSelect = screen.getByLabelText('Audio input device');
    fireEvent.change(inputSelect, { target: { value: 'built-in-array' } });
    expect(
      screen.getByTestId('per-app-audio-mixer-live-status')
    ).toHaveTextContent('Audio input switched to Built-in Array');
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ inputDeviceId: 'built-in-array' })
    );

    // Empty outputDevices & inputDevices render disabled fallback options cleanly
    rerender(<PerAppAudioMixer outputDevices={[]} inputDevices={[]} />);
    expect(
      screen.getByTestId('per-app-audio-mixer-active-output')
    ).toHaveTextContent('No output device');
    expect(screen.getByLabelText('Audio output device')).toBeDisabled();
    expect(screen.getByLabelText('Audio input device')).toBeDisabled();
    expect(screen.getByText('No output devices')).toBeInTheDocument();
    expect(screen.getByText('No input devices')).toBeInTheDocument();
  });

  it('transitions master segmented level bar across all 3 color bands and propagates master mute to all app readouts', () => {
    const onChange = vi.fn();
    render(<PerAppAudioMixer onChange={onChange} data-testid="mixer-bands" />);

    const masterSlider = screen.getByLabelText('Master volume');
    const masterLevel = screen.getByTestId('per-app-audio-mixer-master-level');
    const firstSegment = screen.getByTestId(
      'per-app-audio-mixer-master-segment-0'
    );

    // Default 80% -> warning band (71–88%)
    expect(masterLevel).toHaveAttribute('data-band', 'warning');
    expect(masterLevel).toHaveAttribute('aria-valuenow', '80');
    expect(firstSegment.style.backgroundColor).toBe('var(--prism-warning-main)');

    // <= 70% -> nominal (--prism-success-main)
    fireEvent.change(masterSlider, { target: { value: '70' } });
    expect(masterLevel).toHaveAttribute('data-band', 'nominal');
    expect(firstSegment.style.backgroundColor).toBe('var(--prism-success-main)');
    expect(
      screen.getByTestId('per-app-audio-mixer-master-readout')
    ).toHaveTextContent('70%');
    // Refractor Studio 90% * 70% = 63%
    expect(
      screen.getByTestId('per-app-audio-mixer-channel-readout-refractor-studio')
    ).toHaveTextContent('63%');

    // 0% -> nominal with 0 lit segments
    fireEvent.change(masterSlider, { target: { value: '0' } });
    expect(masterLevel).toHaveAttribute('data-lit-segments', '0');
    expect(firstSegment).toHaveAttribute('data-lit', 'false');
    expect(
      screen.getByTestId('per-app-audio-mixer-channel-readout-refractor-studio')
    ).toHaveTextContent('0%');

    // 71% -> warning boundary (--prism-warning-main)
    fireEvent.change(masterSlider, { target: { value: '71' } });
    expect(masterLevel).toHaveAttribute('data-band', 'warning');
    expect(firstSegment.style.backgroundColor).toBe('var(--prism-warning-main)');

    // 88% -> upper warning boundary (--prism-warning-main)
    fireEvent.change(masterSlider, { target: { value: '88' } });
    expect(masterLevel).toHaveAttribute('data-band', 'warning');
    expect(firstSegment.style.backgroundColor).toBe('var(--prism-warning-main)');

    // > 88% (89% & 95%) -> high (--prism-error-main)
    fireEvent.change(masterSlider, { target: { value: '89' } });
    expect(masterLevel).toHaveAttribute('data-band', 'high');
    expect(firstSegment.style.backgroundColor).toBe('var(--prism-error-main)');

    fireEvent.change(masterSlider, { target: { value: '95' } });
    expect(
      screen.getByTestId('per-app-audio-mixer-master-readout')
    ).toHaveTextContent('95%');
    // Refractor Studio 90% * 95% = 85.5 -> 86%
    expect(
      screen.getByTestId('per-app-audio-mixer-channel-readout-refractor-studio')
    ).toHaveTextContent('86%');

    // Mute master propagates 'Muted' across master & all app channels
    const masterMuteBtn = screen.getByRole('button', { name: 'Mute master' });
    fireEvent.click(masterMuteBtn);

    expect(masterMuteBtn).toHaveAttribute('aria-pressed', 'true');
    expect(
      screen.getByTestId('per-app-audio-mixer-master-readout')
    ).toHaveTextContent('Muted');
    expect(masterLevel).toHaveAttribute('data-band', 'muted');
    expect(masterLevel).toHaveAttribute('data-lit-segments', '0');
    expect(masterLevel).toHaveAttribute('aria-valuenow', '0');
    expect(
      screen.getByTestId('per-app-audio-mixer-active-count')
    ).toHaveTextContent('0 / 4 active');
    expect(
      screen.getByTestId('per-app-audio-mixer-channel-readout-refractor-studio')
    ).toHaveTextContent('Muted');
    expect(
      screen.getByTestId('per-app-audio-mixer-channel-readout-optical-browser')
    ).toHaveTextContent('Muted');
    expect(
      screen.getByTestId('per-app-audio-mixer-channel-readout-voice-comms')
    ).toHaveTextContent('Muted');
    expect(
      screen.getByTestId('per-app-audio-mixer-channel-readout-system-sounds')
    ).toHaveTextContent('Muted');
    expect(
      screen.getByTestId('per-app-audio-mixer-live-status')
    ).toHaveTextContent('Master audio muted');

    // Changing master volume while muted updates value & live announcement without unmuting
    fireEvent.change(masterSlider, { target: { value: '60' } });
    expect(
      screen.getByTestId('per-app-audio-mixer-live-status')
    ).toHaveTextContent('Master volume set to 60% while muted');
    expect(
      screen.getByTestId('per-app-audio-mixer-master-readout')
    ).toHaveTextContent('Muted');

    // Unmute master restores scaled effective outputs (90 * 60 / 100 = 54%)
    fireEvent.click(masterMuteBtn);
    expect(masterMuteBtn).toHaveAttribute('aria-pressed', 'false');
    expect(
      screen.getByTestId('per-app-audio-mixer-master-readout')
    ).toHaveTextContent('60%');
    expect(
      screen.getByTestId('per-app-audio-mixer-channel-readout-refractor-studio')
    ).toHaveTextContent('54%');
    expect(
      screen.getByTestId('per-app-audio-mixer-live-status')
    ).toHaveTextContent('Master audio unmuted at 60%');
  });

  it('adjusts and mutes individual per-app channels, supports IME-safe keyboard shortcuts, and resets via Reset Mix', () => {
    const onChange = vi.fn();
    render(<PerAppAudioMixer onChange={onChange} />);

    // Adjust Voice Comms volume slider from 85 -> 50 (effective 50 * 80 / 100 = 40%)
    const voiceSlider = screen.getByLabelText('Voice Comms volume');
    fireEvent.change(voiceSlider, { target: { value: '50' } });
    expect(
      screen.getByTestId('per-app-audio-mixer-channel-readout-voice-comms')
    ).toHaveTextContent('40%');
    expect(
      screen.getByTestId('per-app-audio-mixer-live-status')
    ).toHaveTextContent('Voice Comms volume set to 50%, effective output 40%');

    // Mute individual channel Voice Comms without affecting sibling channels
    const voiceMuteBtn = screen.getByRole('button', {
      name: 'Mute Voice Comms',
    });
    fireEvent.click(voiceMuteBtn);
    expect(voiceMuteBtn).toHaveAttribute('aria-pressed', 'true');
    expect(
      screen.getByTestId('per-app-audio-mixer-channel-readout-voice-comms')
    ).toHaveTextContent('Muted');
    expect(
      screen.getByTestId('per-app-audio-mixer-channel-readout-refractor-studio')
    ).toHaveTextContent('72%');
    expect(
      screen.getByTestId('per-app-audio-mixer-active-count')
    ).toHaveTextContent('3 / 4 active');
    expect(
      screen.getByTestId('per-app-audio-mixer-live-status')
    ).toHaveTextContent('Voice Comms muted');

    // Changing muted app slider announces effective output muted
    fireEvent.change(voiceSlider, { target: { value: '65' } });
    expect(
      screen.getByTestId('per-app-audio-mixer-live-status')
    ).toHaveTextContent(
      'Voice Comms volume set to 65%, effective output muted'
    );

    // IME-safe M shortcut: ignored when isComposing is true, toggles mute when false
    fireEvent.keyDown(voiceSlider, { key: 'm', isComposing: true });
    expect(voiceMuteBtn).toHaveAttribute('aria-pressed', 'true');
    fireEvent.keyDown(voiceSlider, { key: 'a' });
    expect(voiceMuteBtn).toHaveAttribute('aria-pressed', 'true');
    fireEvent.keyDown(voiceSlider, { key: 'M' });
    expect(voiceMuteBtn).toHaveAttribute('aria-pressed', 'false');
    expect(
      screen.getByTestId('per-app-audio-mixer-channel-readout-voice-comms')
    ).toHaveTextContent('52%');

    // Master slider IME-safe M shortcut
    const masterSlider = screen.getByLabelText('Master volume');
    const masterMuteBtn = screen.getByRole('button', { name: 'Mute master' });
    fireEvent.keyDown(masterSlider, { key: 'm', isComposing: true });
    expect(masterMuteBtn).toHaveAttribute('aria-pressed', 'false');
    fireEvent.keyDown(masterSlider, { key: 'k' });
    expect(masterMuteBtn).toHaveAttribute('aria-pressed', 'false');
    fireEvent.keyDown(masterSlider, { key: 'm' });
    expect(masterMuteBtn).toHaveAttribute('aria-pressed', 'true');

    // Unmuting an app while master is muted reports master output muted
    fireEvent.click(voiceMuteBtn);
    fireEvent.click(voiceMuteBtn);
    expect(
      screen.getByTestId('per-app-audio-mixer-live-status')
    ).toHaveTextContent('Voice Comms unmuted, master output muted');

    // Change output device then click Reset Mix -> restores full default state
    fireEvent.change(screen.getByLabelText('Audio output device'), {
      target: { value: 'built-in-speakers' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Reset Mix' }));

    expect(
      (screen.getByLabelText('Audio output device') as HTMLSelectElement).value
    ).toBe('studio-monitors');
    expect(
      (screen.getByLabelText('Audio input device') as HTMLSelectElement).value
    ).toBe('broadcast-mic');
    expect(masterMuteBtn).toHaveAttribute('aria-pressed', 'false');
    expect(
      screen.getByTestId('per-app-audio-mixer-master-readout')
    ).toHaveTextContent('80%');
    expect(
      screen.getByTestId('per-app-audio-mixer-channel-readout-voice-comms')
    ).toHaveTextContent('68%');
    expect(
      screen.getByTestId('per-app-audio-mixer-live-status')
    ).toHaveTextContent('Audio mix reset to defaults');
  });

  it('sanitizes NaN, Infinity, out-of-bounds volumes, invalid device IDs, duplicate/prototype keys, and XSS payloads', () => {
    const adversarialOutputs: ReadonlyArray<AudioMixerDeviceOption> = [
      { id: '__proto__', label: '<script>alert("out")</script>' },
      { id: '__proto__', label: 'Duplicate Output' },
      { id: '   ', label: '   ' },
    ];
    const adversarialInputs: ReadonlyArray<AudioMixerDeviceOption> = [
      { id: 'constructor', label: 'Studio Condenser' },
    ];
    const adversarialChannels: ReadonlyArray<AudioMixerAppChannel> = [
      {
        id: '__proto__',
        appName: '<img src=x onerror=alert(1)>',
        volumePct: Number.NaN,
        muted: false,
      },
      {
        id: '__proto__',
        appName: 'Overdrive App',
        volumePct: 185,
        muted: false,
      },
      {
        id: 'neg-inf',
        appName: 'Silent App',
        volumePct: Number.NEGATIVE_INFINITY,
        muted: false,
      },
      {
        id: 'pos-inf',
        appName: 'Inf App',
        volumePct: Number.POSITIVE_INFINITY,
        muted: false,
      },
      {
        id: '   ',
        appName: '   ',
        volumePct: -40,
        muted: false,
      },
    ];

    const { container } = render(
      <PerAppAudioMixer
        title="   "
        outputDevices={adversarialOutputs}
        inputDevices={adversarialInputs}
        defaultValue={{
          outputDeviceId: 'non-existent-output',
          inputDeviceId: 'non-existent-input',
          masterVolumePct: 150,
          masterMuted: false,
          channels: adversarialChannels,
        }}
      />
    );

    // Whitespace title falls back to Audio Mixer
    expect(screen.getByTestId('per-app-audio-mixer-title')).toHaveTextContent(
      'Audio Mixer'
    );
    // Invalid device IDs fall back to first valid option
    expect(
      (screen.getByLabelText('Audio output device') as HTMLSelectElement).value
    ).toBe('__proto__');
    expect(
      (screen.getByLabelText('Audio input device') as HTMLSelectElement).value
    ).toBe('constructor');

    // Out-of-bounds master volume 150 -> clamped to 100%
    expect(
      screen.getByTestId('per-app-audio-mixer-master-readout')
    ).toHaveTextContent('100%');

    // NaN / Infinity / -40 sanitized to 0%, 185 clamped to 100%
    expect(
      screen.getByTestId('per-app-audio-mixer-channel-readout-__proto__')
    ).toHaveTextContent('0%');
    expect(
      screen.getByTestId('per-app-audio-mixer-channel-readout-__proto__#2')
    ).toHaveTextContent('100%');
    expect(
      screen.getByTestId('per-app-audio-mixer-channel-readout-neg-inf')
    ).toHaveTextContent('0%');
    expect(
      screen.getByTestId('per-app-audio-mixer-channel-readout-pos-inf')
    ).toHaveTextContent('0%');
    expect(
      screen.getByTestId('per-app-audio-mixer-channel-name-app')
    ).toHaveTextContent('Application');
    expect(
      screen.getByTestId('per-app-audio-mixer-channel-readout-app')
    ).toHaveTextContent('0%');

    // Omitted tone falls back to primary
    expect(
      screen.getByTestId('per-app-audio-mixer-channel-dot-__proto__')
    ).toHaveAttribute('data-tone', 'primary');

    // XSS strings rendered strictly as text nodes
    expect(container.querySelector('script')).toBeNull();
    expect(container.querySelector('img')).toBeNull();
    expect(
      screen.getByTestId('per-app-audio-mixer-channel-name-__proto__')
    ).toHaveTextContent('<img src=x onerror=alert(1)>');
  });

  it('handles empty channels={[]} cleanly with a single role="status" fallback and singular application count', () => {
    const { rerender } = render(
      <PerAppAudioMixer
        defaultValue={{ channels: [] }}
        data-testid="mixer-empty"
      />
    );

    expect(screen.getByTestId('mixer-empty')).toHaveAttribute(
      'data-empty',
      'true'
    );
    const statusFallback = screen.getByRole('status');
    expect(statusFallback).toHaveTextContent(
      /No active application audio channels/i
    );
    expect(
      screen.getByTestId('per-app-audio-mixer-active-count')
    ).toHaveTextContent('0 / 0 active');
    expect(
      screen.getByTestId('per-app-audio-mixer-live-status')
    ).toHaveTextContent('no active applications');

    // Singular application grammar in default live summary
    rerender(
      <PerAppAudioMixer
        value={{
          outputDeviceId: 'studio-monitors',
          inputDeviceId: 'broadcast-mic',
          masterVolumePct: 50,
          masterMuted: true,
          channels: [
            {
              id: 'solo-app',
              appName: 'Solo App',
              volumePct: 60,
              muted: false,
              tone: 'info',
            },
          ],
        }}
      />
    );
    expect(
      screen.getByTestId('per-app-audio-mixer-live-status')
    ).toHaveTextContent('Master muted, 1 application');
  });

  it('supports controlled mode without internal mutation and reflects parent state updates', () => {
    const onChange = vi.fn();
    const initialControlled: PerAppAudioMixerState = {
      outputDeviceId: 'prism-headphones',
      inputDeviceId: 'built-in-array',
      masterVolumePct: 64,
      masterMuted: false,
      channels: [
        {
          id: 'daw',
          appName: 'Prism DAW',
          volumePct: 80,
          muted: false,
          tone: 'emerald',
        },
      ],
    };

    function ControlledHarness() {
      const [state, setState] =
        useState<PerAppAudioMixerState>(initialControlled);
      return (
        <PerAppAudioMixer
          value={state}
          onChange={(next) => {
            onChange(next);
            setState(next);
          }}
        />
      );
    }

    // Locked controlled instance ignores internal mutation unless value updates
    const lockedOnChange = vi.fn();
    const { unmount } = render(
      <PerAppAudioMixer value={initialControlled} onChange={lockedOnChange} />
    );
    fireEvent.change(screen.getByLabelText('Master volume'), {
      target: { value: '25' },
    });
    expect(lockedOnChange).toHaveBeenCalledWith(
      expect.objectContaining({ masterVolumePct: 25 })
    );
    // Still shows controlled 64%
    expect(
      screen.getByTestId('per-app-audio-mixer-master-readout')
    ).toHaveTextContent('64%');
    unmount();

    // Stateful controlled harness updates cleanly
    render(<ControlledHarness />);
    expect(
      screen.getByTestId('per-app-audio-mixer-channel-readout-daw')
    ).toHaveTextContent('51%');

    fireEvent.change(screen.getByLabelText('Prism DAW volume'), {
      target: { value: '100' },
    });
    expect(
      screen.getByTestId('per-app-audio-mixer-channel-readout-daw')
    ).toHaveTextContent('64%');
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        masterVolumePct: 64,
        channels: [
          expect.objectContaining({ id: 'daw', volumePct: 100, muted: false }),
        ],
      })
    );
  });

  it('enforces disabled state across all controls and blocks programmatic events', () => {
    const onChange = vi.fn();
    render(
      <PerAppAudioMixer
        disabled
        onChange={onChange}
        data-testid="mixer-disabled"
      />
    );

    const root = screen.getByTestId('mixer-disabled');
    expect(root).toHaveAttribute('aria-disabled', 'true');
    expect(root).toHaveAttribute('data-disabled', 'true');

    // Explicit aria-label supersedes aria-labelledby cleanly
    const { unmount: unmountAria } = render(
      <PerAppAudioMixer
        aria-label="System tray sound mixer"
        data-testid="mixer-aria-label"
      />
    );
    const labeledRoot = screen.getByTestId('mixer-aria-label');
    expect(labeledRoot).toHaveAttribute('aria-label', 'System tray sound mixer');
    expect(labeledRoot).not.toHaveAttribute('aria-labelledby');
    unmountAria();

    const outputSelect = screen.getByLabelText('Audio output device');
    const inputSelect = screen.getByLabelText('Audio input device');
    const masterSlider = screen.getByLabelText('Master volume');
    const masterMute = screen.getByRole('button', { name: 'Mute master' });
    const appSlider = screen.getByLabelText('Refractor Studio volume');
    const appMute = screen.getByRole('button', {
      name: 'Mute Refractor Studio',
    });
    const resetBtn = screen.getByRole('button', { name: 'Reset Mix' });

    expect(outputSelect).toBeDisabled();
    expect(inputSelect).toBeDisabled();
    expect(masterSlider).toBeDisabled();
    expect(masterMute).toBeDisabled();
    expect(appSlider).toBeDisabled();
    expect(appMute).toBeDisabled();
    expect(resetBtn).toBeDisabled();

    // Programmatic events are blocked when disabled
    fireEvent.change(outputSelect, { target: { value: 'prism-headphones' } });
    fireEvent.change(inputSelect, { target: { value: 'built-in-array' } });
    fireEvent.change(masterSlider, { target: { value: '10' } });
    fireEvent.keyDown(masterSlider, { key: 'm' });
    fireEvent.click(masterMute);
    fireEvent.change(appSlider, { target: { value: '10' } });
    fireEvent.keyDown(appSlider, { key: 'm' });
    fireEvent.click(appMute);
    fireEvent.click(resetBtn);

    expect(onChange).not.toHaveBeenCalled();
    expect(
      screen.getByTestId('per-app-audio-mixer-master-readout')
    ).toHaveTextContent('80%');
  });
});
