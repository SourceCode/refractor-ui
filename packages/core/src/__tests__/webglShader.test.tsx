import { describe, expect, it, vi } from 'vitest';
import {
  clampFinite,
  compileShaderProgram,
  DEFAULT_OPTICAL_UNIFORMS,
  FULLSCREEN_VERTEX_SHADER,
  isMaxPerformanceMode,
  mountOpticalShaderCanvas,
  OPTICAL_FRAGMENT_SHADERS,
  prefersReducedMotion,
  type OpticalShaderKind,
} from '../utils/webglShader';

interface MockGlState {
  compileOk: boolean;
  linkOk: boolean;
  drawCalls: number;
  deletedBuffers: number;
  deletedPrograms: number;
  deletedShaders: number;
}

function createMockWebGLContext(state: MockGlState): WebGLRenderingContext {
  const fakeShader = {} as WebGLShader;
  const fakeProgram = {} as WebGLProgram;
  const fakeBuffer = {} as WebGLBuffer;
  const fakeLoc = {} as WebGLUniformLocation;

  const mock: Partial<WebGLRenderingContext> = {
    VERTEX_SHADER: 35633,
    FRAGMENT_SHADER: 35632,
    COMPILE_STATUS: 35713,
    LINK_STATUS: 35714,
    ARRAY_BUFFER: 34962,
    STATIC_DRAW: 35044,
    FLOAT: 5126,
    COLOR_BUFFER_BIT: 16384,
    TRIANGLES: 4,
    createShader: vi.fn(() => fakeShader),
    shaderSource: vi.fn(),
    compileShader: vi.fn(),
    getShaderParameter: vi.fn(() => state.compileOk),
    deleteShader: vi.fn(() => {
      state.deletedShaders += 1;
    }),
    createProgram: vi.fn(() => fakeProgram),
    attachShader: vi.fn(),
    linkProgram: vi.fn(),
    getProgramParameter: vi.fn(() => state.linkOk),
    deleteProgram: vi.fn(() => {
      state.deletedPrograms += 1;
    }),
    createBuffer: vi.fn(() => fakeBuffer),
    bindBuffer: vi.fn(),
    bufferData: vi.fn(),
    deleteBuffer: vi.fn(() => {
      state.deletedBuffers += 1;
    }),
    getAttribLocation: vi.fn(() => 0),
    getUniformLocation: vi.fn(() => fakeLoc),
    enableVertexAttribArray: vi.fn(),
    vertexAttribPointer: vi.fn(),
    useProgram: vi.fn(),
    viewport: vi.fn(),
    uniform1f: vi.fn(),
    uniform2f: vi.fn(),
    clearColor: vi.fn(),
    clear: vi.fn(),
    drawArrays: vi.fn(() => {
      state.drawCalls += 1;
    }),
  };
  return mock as WebGLRenderingContext;
}

describe('webglShader utility', () => {
  it('provides valid GLSL source for all 10 optical shader kinds and clamps non-finite numbers safely', () => {
    const kinds: OpticalShaderKind[] = [
      'fluid-mesh',
      'refractive-lens',
      'chromatic-dispersion',
      'caustic-light',
      'frosted-grain',
      'liquid-ripple',
      'holographic-foil',
      'metaball-fluid',
      'optical-vignette',
      'thinking-orb',
    ];
    for (const kind of kinds) {
      expect(OPTICAL_FRAGMENT_SHADERS[kind]).toContain('precision mediump float;');
      expect(OPTICAL_FRAGMENT_SHADERS[kind]).toContain('gl_FragColor');
    }
    expect(FULLSCREEN_VERTEX_SHADER).toContain('gl_Position');
    expect(DEFAULT_OPTICAL_UNIFORMS.intensity).toBeGreaterThan(0);

    expect(clampFinite(NaN, 0, 1, 0.5)).toBe(0.5);
    expect(clampFinite(Infinity, 0, 1, 0.5)).toBe(0.5);
    expect(clampFinite(2.5, 0, 1, 0.5)).toBe(1);
    expect(clampFinite(-3, 0, 1, 0.5)).toBe(0);
    expect(prefersReducedMotion()).toBe(false);
    expect(isMaxPerformanceMode()).toBe(false);
  });

  it('falls back cleanly to css-fallback in jsdom or max performance mode without leaking', () => {
    const canvas = document.createElement('canvas');
    const handle = mountOpticalShaderCanvas(canvas, { kind: 'fluid-mesh' });
    expect(handle.renderer).toBe('css-fallback');
    expect(handle.active).toBe(false);
    handle.updateUniforms({ pointerX: 0.25, pointerY: 0.75 });
    handle.triggerPulse(0.4, 0.6);
    handle.dispose();

    document.documentElement.setAttribute('data-refractor-performance', 'max');
    expect(isMaxPerformanceMode()).toBe(true);
    const maxHandle = mountOpticalShaderCanvas(canvas, { kind: 'refractive-lens' });
    expect(maxHandle.renderer).toBe('css-fallback');
    document.documentElement.removeAttribute('data-refractor-performance');
  });

  it('compiles programs, draws frames, handles uniforms/pulse/context-loss, and cleans up resources on WebGL canvas', () => {
    const state: MockGlState = {
      compileOk: true,
      linkOk: true,
      drawCalls: 0,
      deletedBuffers: 0,
      deletedPrograms: 0,
      deletedShaders: 0,
    };
    const mockGl = createMockWebGLContext(state);
    const canvas = document.createElement('canvas');
    const getCtxSpy = vi.spyOn(canvas, 'getContext').mockReturnValue(mockGl);
    const rafQueue: FrameRequestCallback[] = [];
    const rafSpy = vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      rafQueue.push(cb);
      return 12;
    });
    const cafSpy = vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});

    try {
      const handle = mountOpticalShaderCanvas(canvas, {
        kind: 'liquid-ripple',
        animated: true,
        maxDpr: 1.5,
      });
      expect(handle.renderer).toBe('webgl');
      expect(handle.active).toBe(true);
      expect(state.drawCalls).toBe(1);

      handle.updateUniforms({ intensity: 1.1, pointerX: 0.3, pointerY: 0.7 });
      handle.triggerPulse(0.5, 0.5);
      rafQueue.shift()?.(16.7);
      expect(state.drawCalls).toBeGreaterThanOrEqual(2);

      // Simulate WebGL context loss
      const lostEvent = new Event('webglcontextlost', { cancelable: true });
      canvas.dispatchEvent(lostEvent);
      expect(lostEvent.defaultPrevented).toBe(true);

      handle.dispose();
      handle.dispose(); // idempotent
      expect(state.deletedBuffers).toBe(1);
      expect(state.deletedPrograms).toBe(1);
    } finally {
      getCtxSpy.mockRestore();
      rafSpy.mockRestore();
      cafSpy.mockRestore();
    }
  });

  it('returns null on shader compile/link failure and falls back gracefully', () => {
    const failCompileState: MockGlState = {
      compileOk: false,
      linkOk: true,
      drawCalls: 0,
      deletedBuffers: 0,
      deletedPrograms: 0,
      deletedShaders: 0,
    };
    expect(
      compileShaderProgram(
        createMockWebGLContext(failCompileState),
        FULLSCREEN_VERTEX_SHADER,
        OPTICAL_FRAGMENT_SHADERS['caustic-light']
      )
    ).toBeNull();

    const failLinkState: MockGlState = {
      compileOk: true,
      linkOk: false,
      drawCalls: 0,
      deletedBuffers: 0,
      deletedPrograms: 0,
      deletedShaders: 0,
    };
    const linkFailGl = createMockWebGLContext(failLinkState);
    const canvas = document.createElement('canvas');
    const spy = vi.spyOn(canvas, 'getContext').mockReturnValue(linkFailGl);
    try {
      const handle = mountOpticalShaderCanvas(canvas, { kind: 'metaball-fluid' });
      expect(handle.renderer).toBe('css-fallback');
      expect(failLinkState.deletedPrograms).toBe(1);
    } finally {
      spy.mockRestore();
    }
  });
});
