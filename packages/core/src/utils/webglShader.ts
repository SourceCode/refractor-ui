import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { isDocumentVisible } from '../hooks/useRafCallback';

export type OpticalShaderKind =
  | 'fluid-mesh'
  | 'refractive-lens'
  | 'chromatic-dispersion'
  | 'caustic-light'
  | 'frosted-grain'
  | 'liquid-ripple'
  | 'holographic-foil'
  | 'metaball-fluid'
  | 'optical-vignette'
  | 'thinking-orb';

export type OpticalShaderRendererMode = 'webgl' | 'css-fallback';

export interface OpticalShaderUniforms {
  /** Normalized pointer coordinates [0..1, 0..1]. */
  pointerX: number;
  pointerY: number;
  /** Effect intensity [0..2]. */
  intensity: number;
  /** Time speed multiplier [0..3]. */
  speed: number;
  /** Secondary effect parameter (IOR, dispersion, aperture, or orb count). */
  paramA: number;
  /** Tertiary effect parameter (blur radius, grain scale, or state energy). */
  paramB: number;
  /** Click/shockwave origin [0..1, 0..1] and elapsed pulse age [0..1]. */
  pulseX: number;
  pulseY: number;
  pulseProgress: number;
}

export interface OpticalShaderMountOptions {
  kind: OpticalShaderKind;
  animated?: boolean;
  maxDpr?: number;
  maxDimensionPx?: number;
  disableWebGL?: boolean;
  initialUniforms?: Partial<OpticalShaderUniforms>;
}

export interface OpticalShaderHandle {
  readonly renderer: OpticalShaderRendererMode;
  readonly active: boolean;
  updateUniforms: (patch: Partial<OpticalShaderUniforms>) => void;
  triggerPulse: (x: number, y: number) => void;
  dispose: () => void;
}

export const DEFAULT_OPTICAL_UNIFORMS: Readonly<OpticalShaderUniforms> = /*#__PURE__*/ Object.freeze({
  pointerX: 0.5,
  pointerY: 0.5,
  intensity: 0.85,
  speed: 1.0,
  paramA: 1.25,
  paramB: 0.5,
  pulseX: 0.5,
  pulseY: 0.5,
  pulseProgress: 1.0,
});

export const FULLSCREEN_VERTEX_SHADER = `
attribute vec2 a_position;
varying vec2 v_uv;
void main() {
  v_uv = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`.trim();

/**
 * Shared GLSL fragment shaders for Refractor Optical FX components.
 * Precision-bounded mediump float programs designed for < 0.4ms GPU frame time at capped DPR.
 */
export const OPTICAL_FRAGMENT_SHADERS: Readonly<Record<OpticalShaderKind, string>> =
  /*#__PURE__*/ Object.freeze({
    'fluid-mesh': `
precision mediump float;
varying vec2 v_uv;
uniform float u_time;
uniform vec2 u_pointer;
uniform float u_intensity;
uniform float u_paramA;
uniform float u_paramB;
void main() {
  vec2 uv = v_uv;
  float t = u_time * (0.28 + u_paramB * 0.35);
  vec2 p = uv - u_pointer;
  float dist = length(p);
  float w1 = sin(uv.x * 3.4 + t + sin(uv.y * 2.7 - t * 0.8)) * 0.5 + 0.5;
  float w2 = cos(uv.y * 3.1 - t * 0.9 + cos(uv.x * 2.3 + t * 0.6)) * 0.5 + 0.5;
  float spot = exp(-dist * dist * 5.2);
  vec3 c1 = vec3(0.91, 0.36, 0.14);
  vec3 c2 = vec3(0.22, 0.74, 0.97);
  vec3 c3 = vec3(0.55, 0.36, 0.96);
  vec3 col = mix(mix(c1, c2, w1), c3, w2 * 0.75) + spot * 0.22;
  gl_FragColor = vec4(col, clamp(0.18 + u_intensity * 0.32, 0.0, 0.78));
}
`.trim(),
    'refractive-lens': `
precision mediump float;
varying vec2 v_uv;
uniform float u_time;
uniform vec2 u_pointer;
uniform float u_intensity;
uniform float u_paramA;
uniform float u_paramB;
void main() {
  vec2 d = v_uv - u_pointer;
  float r = length(d);
  float radius = max(0.12, u_paramB);
  float lens = smoothstep(radius, 0.0, r);
  vec2 refracted = v_uv + d * (u_paramA - 1.0) * lens * 0.35;
  float caustics = sin(refracted.x * 16.0 + u_time) * cos(refracted.y * 16.0 - u_time * 0.8);
  float rim = smoothstep(radius, radius * 0.78, r) * smoothstep(radius * 0.52, radius * 0.86, r);
  vec3 tint = vec3(0.75 + caustics * 0.12, 0.88 + rim * 0.1, 0.98);
  float alpha = clamp((lens * 0.18 + rim * 0.36) * u_intensity, 0.0, 0.65);
  gl_FragColor = vec4(tint, alpha);
}
`.trim(),
    'chromatic-dispersion': `
precision mediump float;
varying vec2 v_uv;
uniform float u_time;
uniform vec2 u_pointer;
uniform float u_intensity;
uniform float u_paramA;
void main() {
  vec2 edge = min(v_uv, 1.0 - v_uv);
  float borderDist = min(edge.x, edge.y);
  float spread = max(0.015, u_paramA * 0.045);
  float bandR = smoothstep(spread * 1.4, 0.0, borderDist);
  float bandG = smoothstep(spread * 1.05, 0.0, borderDist + 0.004);
  float bandB = smoothstep(spread * 0.85, 0.0, borderDist + 0.008);
  float angle = atan(v_uv.y - u_pointer.y, v_uv.x - u_pointer.x) + u_time * 0.6;
  float wave = 0.5 + 0.5 * sin(angle * 2.0);
  vec3 col = vec3(bandR * (0.85 + 0.15 * wave), bandG * 0.9, bandB * (1.0 - 0.15 * wave));
  gl_FragColor = vec4(col, clamp(max(bandR, max(bandG, bandB)) * u_intensity * 0.75, 0.0, 0.85));
}
`.trim(),
    'caustic-light': `
precision mediump float;
varying vec2 v_uv;
uniform float u_time;
uniform float u_intensity;
uniform float u_paramA;
void main() {
  vec2 p = v_uv * (4.0 + u_paramA * 2.0);
  float t = u_time * 0.7;
  float v = sin(p.x + sin(p.y + t)) + cos(p.y + cos(p.x - t * 0.85));
  float filament = pow(clamp(1.0 - abs(v) * 0.62, 0.0, 1.0), 4.0);
  vec3 col = mix(vec3(0.45, 0.84, 1.0), vec3(1.0, 0.78, 0.54), v_uv.x);
  gl_FragColor = vec4(col, clamp(filament * u_intensity * 0.52, 0.0, 0.72));
}
`.trim(),
    'frosted-grain': `
precision mediump float;
varying vec2 v_uv;
uniform float u_time;
uniform float u_intensity;
uniform float u_paramA;
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}
void main() {
  float scale = max(64.0, u_paramA * 180.0);
  float n = hash(floor(v_uv * scale) + floor(u_time * 12.0));
  gl_FragColor = vec4(vec3(n), clamp(u_intensity * 0.14, 0.0, 0.28));
}
`.trim(),
    'liquid-ripple': `
precision mediump float;
varying vec2 v_uv;
uniform vec2 u_pulseOrigin;
uniform float u_pulseProgress;
uniform float u_intensity;
uniform float u_paramA;
void main() {
  float dist = length(v_uv - u_pulseOrigin);
  float ring = abs(dist - u_pulseProgress * 0.95);
  float wave = exp(-ring * (18.0 + u_paramA * 8.0)) * sin((dist - u_pulseProgress * 0.95) * 42.0);
  float fade = (1.0 - u_pulseProgress) * step(u_pulseProgress, 0.99);
  vec3 col = mix(vec3(0.32, 0.82, 1.0), vec3(0.95, 0.45, 0.22), clamp(dist, 0.0, 1.0));
  gl_FragColor = vec4(col, clamp(abs(wave) * fade * u_intensity * 0.8, 0.0, 0.75));
}
`.trim(),
    'holographic-foil': `
precision mediump float;
varying vec2 v_uv;
uniform float u_time;
uniform vec2 u_pointer;
uniform float u_intensity;
uniform float u_paramA;
void main() {
  float shift = dot(v_uv - 0.5, normalize(u_pointer - 0.4999)) * (2.5 + u_paramA) + u_time * 0.35;
  vec3 rainbow = 0.55 + 0.45 * cos(6.28318 * (shift + vec3(0.0, 0.33, 0.67)));
  float sheen = smoothstep(0.45, 0.0, abs(v_uv.x - u_pointer.x + (v_uv.y - u_pointer.y) * 0.45));
  gl_FragColor = vec4(rainbow, clamp((0.12 + sheen * 0.42) * u_intensity, 0.0, 0.68));
}
`.trim(),
    'metaball-fluid': `
precision mediump float;
varying vec2 v_uv;
uniform float u_time;
uniform vec2 u_pointer;
uniform float u_intensity;
uniform float u_paramA;
void main() {
  float t = u_time * 0.65;
  vec2 b1 = vec2(0.32 + 0.16 * sin(t), 0.42 + 0.18 * cos(t * 1.1));
  vec2 b2 = vec2(0.68 + 0.14 * cos(t * 0.9), 0.58 + 0.15 * sin(t * 0.8));
  vec2 b3 = mix(vec2(0.5 + 0.18 * sin(t * 0.6), 0.5), u_pointer, 0.45);
  float field = 0.028 / (dot(v_uv - b1, v_uv - b1) + 0.014)
              + 0.028 / (dot(v_uv - b2, v_uv - b2) + 0.014)
              + (0.022 + 0.008 * u_paramA) / (dot(v_uv - b3, v_uv - b3) + 0.014);
  float mask = smoothstep(1.35, 1.95, field);
  vec3 col = mix(vec3(0.22, 0.74, 0.97), vec3(0.91, 0.36, 0.14), clamp(v_uv.x, 0.0, 1.0));
  gl_FragColor = vec4(col, clamp(mask * u_intensity * 0.55, 0.0, 0.72));
}
`.trim(),
    'optical-vignette': `
precision mediump float;
varying vec2 v_uv;
uniform vec2 u_pointer;
uniform float u_intensity;
uniform float u_paramA;
void main() {
  float dist = length(v_uv - u_pointer);
  float aperture = clamp(u_paramA, 0.12, 0.85);
  float vig = smoothstep(aperture, aperture + 0.48, dist);
  gl_FragColor = vec4(vec3(0.03, 0.05, 0.11), clamp(vig * u_intensity * 0.72, 0.0, 0.86));
}
`.trim(),
    'thinking-orb': `
precision mediump float;
varying vec2 v_uv;
uniform float u_time;
uniform float u_intensity;
uniform float u_paramA;
uniform float u_paramB;
void main() {
  vec2 p = v_uv * 2.0 - 1.0;
  float angle = atan(p.y, p.x);
  float wobble = 0.08 * sin(angle * 3.0 + u_time * (1.8 + u_paramB * 2.0))
               + 0.05 * cos(angle * 5.0 - u_time * 1.4);
  float r = length(p);
  float orb = smoothstep(0.76 + wobble, 0.42, r);
  float core = smoothstep(0.45, 0.0, r);
  vec3 c1 = vec3(0.22, 0.74, 0.97);
  vec3 c2 = vec3(0.62, 0.35, 0.96);
  vec3 c3 = vec3(0.94, 0.42, 0.18);
  vec3 col = mix(mix(c1, c2, 0.5 + 0.5 * sin(u_time + angle)), c3, core * 0.75 + u_paramA * 0.15);
  gl_FragColor = vec4(col, clamp(orb * u_intensity, 0.0, 0.95));
}
`.trim(),
  });

export function clampFinite(value: number, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function isMaxPerformanceMode(): boolean {
  if (typeof document === 'undefined') return false;
  return document.documentElement.getAttribute('data-refractor-performance') === 'max';
}

function compileGlShader(
  gl: WebGLRenderingContext,
  type: number,
  source: string
): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

export function compileShaderProgram(
  gl: WebGLRenderingContext,
  vertexSource: string,
  fragmentSource: string
): WebGLProgram | null {
  const vs = compileGlShader(gl, gl.VERTEX_SHADER, vertexSource);
  const fs = compileGlShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
  if (!vs || !fs) {
    if (vs) gl.deleteShader(vs);
    if (fs) gl.deleteShader(fs);
    return null;
  }
  const program = gl.createProgram();
  if (!program) {
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    return null;
  }
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl.deleteProgram(program);
    return null;
  }
  return program;
}

/**
 * Mounts a DPR-capped, visibility-aware, context-loss-safe WebGL optical fragment shader
 * onto a canvas element, falling back seamlessly to a no-op CSS fallback controller when
 * WebGL is unavailable, disabled, or running under performanceMode="max".
 */
export function mountOpticalShaderCanvas(
  canvas: HTMLCanvasElement,
  options: OpticalShaderMountOptions
): OpticalShaderHandle {
  const uniforms: OpticalShaderUniforms = {
    ...DEFAULT_OPTICAL_UNIFORMS,
    ...options.initialUniforms,
  };

  const fallbackHandle: OpticalShaderHandle = {
    renderer: 'css-fallback',
    active: false,
    updateUniforms: (patch) => {
      Object.assign(uniforms, patch);
    },
    triggerPulse: (x, y) => {
      uniforms.pulseX = clampFinite(x, 0, 1, 0.5);
      uniforms.pulseY = clampFinite(y, 0, 1, 0.5);
      uniforms.pulseProgress = 0;
    },
    dispose: () => {},
  };

  if (options.disableWebGL || isMaxPerformanceMode()) {
    return fallbackHandle;
  }

  let gl: WebGLRenderingContext | null = null;
  try {
    const ctx = canvas.getContext('webgl', {
      alpha: true,
      antialias: false,
      depth: false,
      stencil: false,
      powerPreference: 'low-power',
      preserveDrawingBuffer: false,
    });
    if (ctx && typeof (ctx as WebGLRenderingContext).createProgram === 'function') {
      gl = ctx as WebGLRenderingContext;
    }
  } catch {
    gl = null;
  }

  if (!gl) {
    return fallbackHandle;
  }

  const fragmentSource = OPTICAL_FRAGMENT_SHADERS[options.kind];
  const program = compileShaderProgram(gl, FULLSCREEN_VERTEX_SHADER, fragmentSource);
  if (!program) {
    return fallbackHandle;
  }

  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
    gl.STATIC_DRAW
  );

  const posLoc = gl.getAttribLocation(program, 'a_position');
  const uTimeLoc = gl.getUniformLocation(program, 'u_time');
  const uPointerLoc = gl.getUniformLocation(program, 'u_pointer');
  const uIntensityLoc = gl.getUniformLocation(program, 'u_intensity');
  const uParamALoc = gl.getUniformLocation(program, 'u_paramA');
  const uParamBLoc = gl.getUniformLocation(program, 'u_paramB');
  const uPulseOriginLoc = gl.getUniformLocation(program, 'u_pulseOrigin');
  const uPulseProgressLoc = gl.getUniformLocation(program, 'u_pulseProgress');

  const maxDpr = clampFinite(options.maxDpr ?? 1.5, 0.5, 2, 1.5);
  const maxDim = clampFinite(options.maxDimensionPx ?? 768, 64, 1024, 768);
  const reducedMotion = prefersReducedMotion();
  const shouldAnimate = (options.animated ?? true) && !reducedMotion;

  let disposed = false;
  let visibleInViewport = true;
  let rafId: number | null = null;
  let elapsedSeconds = 0;
  let lastFrameMs = 0;
  let pulseStartMs = -1;

  const syncSize = () => {
    const dpr = Math.min(typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1, maxDpr);
    const rect = canvas.getBoundingClientRect();
    const cssW = Math.max(1, rect.width || canvas.clientWidth || 300);
    const cssH = Math.max(1, rect.height || canvas.clientHeight || 150);
    const targetW = Math.min(maxDim, Math.max(1, Math.round(cssW * dpr)));
    const targetH = Math.min(maxDim, Math.max(1, Math.round(cssH * dpr)));
    if (canvas.width !== targetW || canvas.height !== targetH) {
      canvas.width = targetW;
      canvas.height = targetH;
    }
    gl.viewport(0, 0, canvas.width, canvas.height);
  };

  const drawFrame = (nowMs: number) => {
    if (disposed) return;
    if (lastFrameMs > 0) {
      const dt = Math.min(0.05, Math.max(0, (nowMs - lastFrameMs) / 1000));
      elapsedSeconds += dt * clampFinite(uniforms.speed, 0, 3, 1);
    }
    lastFrameMs = nowMs;

    if (pulseStartMs >= 0) {
      const progress = clampFinite((nowMs - pulseStartMs) / 750, 0, 1, 1);
      uniforms.pulseProgress = progress;
      if (progress >= 1) {
        pulseStartMs = -1;
      }
    }

    syncSize();
    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    if (posLoc >= 0) {
      gl.enableVertexAttribArray(posLoc);
      gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
    }
    if (uTimeLoc) gl.uniform1f(uTimeLoc, elapsedSeconds);
    if (uPointerLoc) gl.uniform2f(uPointerLoc, uniforms.pointerX, 1.0 - uniforms.pointerY);
    if (uIntensityLoc) gl.uniform1f(uIntensityLoc, uniforms.intensity);
    if (uParamALoc) gl.uniform1f(uParamALoc, uniforms.paramA);
    if (uParamBLoc) gl.uniform1f(uParamBLoc, uniforms.paramB);
    if (uPulseOriginLoc) gl.uniform2f(uPulseOriginLoc, uniforms.pulseX, 1.0 - uniforms.pulseY);
    if (uPulseProgressLoc) gl.uniform1f(uPulseProgressLoc, uniforms.pulseProgress);

    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  };

  const scheduleLoop = () => {
    if (disposed || !shouldAnimate || !visibleInViewport || !isDocumentVisible()) {
      rafId = null;
      return;
    }
    rafId = requestAnimationFrame((now) => {
      drawFrame(now);
      scheduleLoop();
    });
  };

  // Render an immediate initial frame
  drawFrame(typeof performance !== 'undefined' ? performance.now() : 0);
  if (shouldAnimate && typeof requestAnimationFrame === 'function') {
    scheduleLoop();
  }

  let io: IntersectionObserver | null = null;
  if (typeof IntersectionObserver === 'function') {
    io = new IntersectionObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      visibleInViewport = entry.isIntersecting;
      if (visibleInViewport && rafId === null && shouldAnimate && !disposed) {
        lastFrameMs = 0;
        scheduleLoop();
      }
    });
    io.observe(canvas);
  }

  const onContextLost = (e: Event) => {
    e.preventDefault();
    if (rafId !== null && typeof cancelAnimationFrame === 'function') {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  };
  canvas.addEventListener('webglcontextlost', onContextLost);

  return {
    renderer: 'webgl',
    active: true,
    updateUniforms: (patch) => {
      Object.assign(uniforms, patch);
      if (!shouldAnimate && !disposed) {
        drawFrame(typeof performance !== 'undefined' ? performance.now() : 0);
      }
    },
    triggerPulse: (x, y) => {
      uniforms.pulseX = clampFinite(x, 0, 1, 0.5);
      uniforms.pulseY = clampFinite(y, 0, 1, 0.5);
      uniforms.pulseProgress = 0;
      pulseStartMs = typeof performance !== 'undefined' ? performance.now() : 0;
      if (!disposed) {
        drawFrame(pulseStartMs);
      }
    },
    dispose: () => {
      if (disposed) return;
      disposed = true;
      if (rafId !== null && typeof cancelAnimationFrame === 'function') {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      io?.disconnect();
      canvas.removeEventListener('webglcontextlost', onContextLost);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
    },
  };
}

export interface UseOpticalShaderResult {
  renderer: OpticalShaderRendererMode;
  updateUniforms: (patch: Partial<OpticalShaderUniforms>) => void;
  triggerPulse: (x: number, y: number) => void;
}

/**
 * React hook mounting a visibility-aware WebGL fragment shader onto a `<canvas>` ref
 * with automatic disposal and CSS fallback telemetry.
 */
export function useOpticalShader(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  options: OpticalShaderMountOptions
): UseOpticalShaderResult {
  const handleRef = useRef<OpticalShaderHandle | null>(null);
  const [renderer, setRenderer] = useState<OpticalShaderRendererMode>('css-fallback');

  const { kind, animated = true, maxDpr = 1.5, maxDimensionPx = 768, disableWebGL = false } =
    options;
  const initialUniformsRef = useRef(options.initialUniforms);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const handle = mountOpticalShaderCanvas(canvas, {
      kind,
      animated,
      maxDpr,
      maxDimensionPx,
      disableWebGL,
      initialUniforms: initialUniformsRef.current,
    });
    handleRef.current = handle;
    setRenderer(handle.renderer);
    return () => {
      handle.dispose();
      handleRef.current = null;
    };
  }, [canvasRef, kind, animated, maxDpr, maxDimensionPx, disableWebGL]);

  const updateUniforms = useCallback((patch: Partial<OpticalShaderUniforms>) => {
    handleRef.current?.updateUniforms(patch);
  }, []);

  const triggerPulse = useCallback((x: number, y: number) => {
    handleRef.current?.triggerPulse(x, y);
  }, []);

  return { renderer, updateUniforms, triggerPulse };
}
