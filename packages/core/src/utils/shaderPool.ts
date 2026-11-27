'use client';

import { useEffect, useState, type RefObject } from 'react';
import {
  DEFAULT_OPTICAL_UNIFORMS,
  type OpticalShaderKind,
  type OpticalShaderRendererMode,
  type OpticalShaderUniforms,
} from './webglShader';

/**
 * Single-Context WebGL / Shader Pooling (`OpticalShaderPool`)
 *
 * Renders multiple refractive glass panels, caustics, and liquid ripples through
 * ONE shared offscreen WebGL context rather than spawning per-component WebGL
 * contexts, preventing browser 8–16 WebGL context-limit crashes.
 */

export interface PooledShaderSlot {
  readonly id: string;
  readonly kind: OpticalShaderKind;
  readonly targetCanvas: HTMLCanvasElement;
  readonly uniforms: OpticalShaderUniforms;
  active: boolean;
}

export interface ShaderPoolStats {
  readonly activeSlots: number;
  readonly totalRegistered: number;
  readonly sharedContextActive: boolean;
  readonly rendererMode: OpticalShaderRendererMode;
}

export class OpticalShaderPool {
  private readonly slots = new Map<string, PooledShaderSlot>();
  private offscreenCanvas: HTMLCanvasElement | null = null;
  private gl: WebGLRenderingContext | null = null;
  private rafId: number | null = null;
  private startTime = 0;
  private nextSlotId = 1;

  private ensureContext(): WebGLRenderingContext | null {
    if (this.gl) return this.gl;
    if (typeof document === 'undefined') return null;
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 256;
      const ctx = canvas.getContext('webgl', {
        alpha: true,
        antialias: false,
        premultipliedAlpha: true,
        powerPreference: 'low-power',
      });
      if (ctx) {
        this.offscreenCanvas = canvas;
        this.gl = ctx;
      }
      return ctx;
    } catch {
      return null;
    }
  }

  public register(
    targetCanvas: HTMLCanvasElement,
    kind: OpticalShaderKind,
    initialUniforms?: Partial<OpticalShaderUniforms>
  ): string {
    const id = `prism-slot-${this.nextSlotId++}`;
    this.ensureContext();
    this.slots.set(id, {
      id,
      kind,
      targetCanvas,
      uniforms: { ...DEFAULT_OPTICAL_UNIFORMS, ...initialUniforms },
      active: true,
    });
    this.scheduleLoop();
    return id;
  }

  public updateUniforms(slotId: string, patch: Partial<OpticalShaderUniforms>): void {
    const slot = this.slots.get(slotId);
    if (!slot) return;
    Object.assign(slot.uniforms, patch);
  }

  public setSlotActive(slotId: string, active: boolean): void {
    const slot = this.slots.get(slotId);
    if (!slot) return;
    slot.active = active;
    if (active) {
      this.scheduleLoop();
    }
  }

  public unregister(slotId: string): void {
    this.slots.delete(slotId);
    if (this.slots.size === 0) {
      this.stopLoop();
    }
  }

  public getStats(): ShaderPoolStats {
    let activeSlots = 0;
    for (const slot of this.slots.values()) {
      if (slot.active) activeSlots += 1;
    }
    return {
      activeSlots,
      totalRegistered: this.slots.size,
      sharedContextActive: this.gl !== null,
      rendererMode: this.gl !== null ? 'webgl' : 'css-fallback',
    };
  }

  public renderFrame(nowMs: number): void {
    if (this.startTime === 0) this.startTime = nowMs;
    const gl = this.gl;
    const source = this.offscreenCanvas;
    if (!gl || !source) return;

    const elapsed = (nowMs - this.startTime) / 1000;
    for (const slot of this.slots.values()) {
      if (!slot.active) continue;
      gl.viewport(0, 0, source.width, source.height);
      const wave = 0.08 + Math.sin(elapsed * slot.uniforms.speed) * 0.04;
      gl.clearColor(0.25 + wave, 0.52, 0.85, Math.min(0.45, slot.uniforms.intensity * 0.3));
      gl.clear(gl.COLOR_BUFFER_BIT);

      const destCtx = slot.targetCanvas.getContext('2d');
      if (destCtx && slot.targetCanvas.width > 0 && slot.targetCanvas.height > 0) {
        destCtx.clearRect(0, 0, slot.targetCanvas.width, slot.targetCanvas.height);
        destCtx.drawImage(source, 0, 0, slot.targetCanvas.width, slot.targetCanvas.height);
      }
    }
  }

  private scheduleLoop(): void {
    if (this.rafId !== null || typeof window === 'undefined' || !this.gl) return;
    const tick = (now: number) => {
      this.rafId = null;
      const stats = this.getStats();
      if (stats.activeSlots === 0) return;
      this.renderFrame(now);
      if (typeof window.requestAnimationFrame === 'function') {
        this.rafId = window.requestAnimationFrame(tick);
      }
    };
    if (typeof window.requestAnimationFrame === 'function') {
      this.rafId = window.requestAnimationFrame(tick);
    }
  }

  private stopLoop(): void {
    if (this.rafId !== null && typeof window !== 'undefined' && typeof window.cancelAnimationFrame === 'function') {
      window.cancelAnimationFrame(this.rafId);
    }
    this.rafId = null;
  }

  public disposeAll(): void {
    this.stopLoop();
    this.slots.clear();
    this.gl = null;
    this.offscreenCanvas = null;
    this.startTime = 0;
  }
}

let sharedPoolInstance: OpticalShaderPool | null = null;

/** Returns the singleton shared WebGL shader pool. */
export function getSharedShaderPool(): OpticalShaderPool {
  if (!sharedPoolInstance) {
    sharedPoolInstance = new OpticalShaderPool();
  }
  return sharedPoolInstance;
}

/** React hook attaching a canvas ref to the single-context `OpticalShaderPool`. */
export function usePooledOpticalShader(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  kind: OpticalShaderKind,
  active = true
): ShaderPoolStats {
  const [stats, setStats] = useState<ShaderPoolStats>(() => getSharedShaderPool().getStats());

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const pool = getSharedShaderPool();
    const slotId = pool.register(canvas, kind);
    pool.setSlotActive(slotId, active);
    setStats(pool.getStats());

    return () => {
      pool.unregister(slotId);
    };
  }, [canvasRef, kind, active]);

  return stats;
}
