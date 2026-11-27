'use client';

import { useCallback, useEffect, useRef } from 'react';

/**
 * Synthesized Micro-Audio Engine (`sensory/microAudio.ts`)
 *
 * Optional, opt-in Web Audio API sound layer generating subtle, low-latency
 * physical glass clicks, soft hover ticks, slider detents, and chime confirmations
 * procedurally without loading external MP3/WAV assets.
 */

export type MicroAudioSoundKind =
  | 'glass-click'
  | 'hover-tick'
  | 'chime-confirm'
  | 'detent-tick'
  | 'error-thud';

export interface MicroAudioOptions {
  /** Must be explicitly opted in (default: false). */
  enabled?: boolean;
  /** Master volume multiplier [0..1] (default: 0.18). */
  volume?: number;
}

interface AudioSynthSpec {
  readonly freqStart: number;
  readonly freqEnd: number;
  readonly durationSec: number;
  readonly wave: OscillatorType;
  readonly gainPeak: number;
}

const SOUND_SPECS: Readonly<Record<MicroAudioSoundKind, AudioSynthSpec>> = /*#__PURE__*/ Object.freeze({
  'glass-click': { freqStart: 1320, freqEnd: 680, durationSec: 0.045, wave: 'sine', gainPeak: 0.45 },
  'hover-tick': { freqStart: 1850, freqEnd: 1420, durationSec: 0.022, wave: 'triangle', gainPeak: 0.2 },
  'chime-confirm': { freqStart: 880, freqEnd: 1320, durationSec: 0.14, wave: 'sine', gainPeak: 0.35 },
  'detent-tick': { freqStart: 960, freqEnd: 520, durationSec: 0.018, wave: 'triangle', gainPeak: 0.28 },
  'error-thud': { freqStart: 220, freqEnd: 110, durationSec: 0.11, wave: 'sine', gainPeak: 0.42 },
});

interface WindowWithWebkitAudio {
  AudioContext?: typeof AudioContext;
  webkitAudioContext?: typeof AudioContext;
}

function createAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const win = window as Window & WindowWithWebkitAudio;
  const Ctor = win.AudioContext ?? win.webkitAudioContext;
  if (typeof Ctor !== 'function') return null;
  try {
    return new Ctor();
  } catch {
    return null;
  }
}

export interface MicroAudioParamLike {
  setValueAtTime: (value: number, startTime: number) => void;
  exponentialRampToValueAtTime: (value: number, endTime: number) => void;
}

export interface MicroAudioOscillatorLike {
  type: OscillatorType;
  frequency: MicroAudioParamLike;
  connect: (dest: GainNode) => void;
  start: (when?: number) => void;
  stop: (when?: number) => void;
}

export interface MicroAudioContextLike {
  readonly currentTime: number;
  readonly destination: AudioDestinationNode;
  createOscillator: () => MicroAudioOscillatorLike;
  createGain: () => GainNode;
}

/** Plays a single synthesized procedural sound on a provided AudioContext. */
export function synthesizeMicroSound(
  ctx: MicroAudioContextLike,
  kind: MicroAudioSoundKind,
  volume = 0.18
): boolean {
  const spec = SOUND_SPECS[kind];
  const safeVol = Math.min(1, Math.max(0, Number.isFinite(volume) ? volume : 0.18));
  if (safeVol <= 0) return false;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = spec.wave;
  osc.frequency.setValueAtTime(spec.freqStart, now);
  osc.frequency.exponentialRampToValueAtTime(Math.max(40, spec.freqEnd), now + spec.durationSec);

  const peak = Math.max(0.0001, spec.gainPeak * safeVol);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(peak, now + 0.004);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + spec.durationSec);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + spec.durationSec + 0.01);
  return true;
}

/** Opt-in React hook exposing low-latency procedural optical glass sound triggers. */
export function useMicroAudio(options: MicroAudioOptions = {}) {
  const { enabled = false, volume = 0.18 } = options;
  const ctxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    return () => {
      const ctx = ctxRef.current;
      ctxRef.current = null;
      if (ctx && typeof ctx.close === 'function') {
        void ctx.close().catch(() => undefined);
      }
    };
  }, []);

  const play = useCallback(
    (kind: MicroAudioSoundKind): boolean => {
      if (!enabled) return false;
      if (!ctxRef.current) {
        ctxRef.current = createAudioContext();
      }
      const ctx = ctxRef.current;
      if (!ctx) return false;
      if (ctx.state === 'suspended' && typeof ctx.resume === 'function') {
        void ctx.resume().catch(() => undefined);
      }
      return synthesizeMicroSound(ctx, kind, volume);
    },
    [enabled, volume]
  );

  return {
    play,
    playGlassClick: useCallback(() => play('glass-click'), [play]),
    playHoverTick: useCallback(() => play('hover-tick'), [play]),
    playChimeConfirm: useCallback(() => play('chime-confirm'), [play]),
    playDetentTick: useCallback(() => play('detent-tick'), [play]),
    playErrorThud: useCallback(() => play('error-thud'), [play]),
  };
}
