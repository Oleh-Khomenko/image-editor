import { afterEach, describe, expect, it, vi } from 'vitest';
import { CanvasRenderer } from '@/core/render/canvas-renderer';
import * as selectRenderer from '@/core/render/select-renderer';
import { WebGLRenderer } from '@/core/render/webgl-renderer';

const { createRenderer, maxTextureSize } = selectRenderer;

// Replaces the real WebGL class with a stub that satisfies the Renderer shape
// so createRenderer's happy path is testable without a real GL context (not
// available in happy-dom). Non-class exports (cropOutputSize, cropToUv) stay
// real since CanvasRenderer depends on them.
vi.mock('@/core/render/webgl-renderer', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/core/render/webgl-renderer')>();
  class StubWebGLRenderer {
    static isSupported = actual.WebGLRenderer.isSupported;
    render = vi.fn();
    toBlob = vi.fn(async () => new Blob());
    dispose = vi.fn();
  }
  return { ...actual, WebGLRenderer: StubWebGLRenderer };
});

function expectRendererShape(renderer: {
  render: unknown;
  toBlob: unknown;
  dispose: unknown;
}): void {
  expect(typeof renderer.render).toBe('function');
  expect(typeof renderer.toBlob).toBe('function');
  expect(typeof renderer.dispose).toBe('function');
}

// happy-dom has no built-in canvas adapter, so getContext('2d') returns null;
// stub just that call so CanvasRenderer's real constructor/class is exercised.
function stub2dContext(canvas: HTMLCanvasElement): void {
  const fakeCtx = {
    clearRect: vi.fn(),
    drawImage: vi.fn(),
    filter: 'none',
  } as unknown as CanvasRenderingContext2D;
  vi.spyOn(canvas, 'getContext').mockReturnValue(fakeCtx);
}

describe('createRenderer', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('falls back to CanvasRenderer when WebGL is unsupported', () => {
    vi.spyOn(WebGLRenderer, 'isSupported').mockReturnValue(false);
    const canvas = document.createElement('canvas');
    stub2dContext(canvas);

    const renderer = createRenderer(canvas, { width: 100, height: 100 });

    expect(renderer).toBeInstanceOf(CanvasRenderer);
    expectRendererShape(renderer);
  });

  it('falls back to CanvasRenderer when the source exceeds the max texture size', () => {
    vi.spyOn(WebGLRenderer, 'isSupported').mockReturnValue(true);
    vi.spyOn(selectRenderer, 'maxTextureSize').mockReturnValue(256);
    const canvas = document.createElement('canvas');
    stub2dContext(canvas);

    const renderer = createRenderer(canvas, { width: 2000, height: 2000 });

    expect(renderer).toBeInstanceOf(CanvasRenderer);
    expectRendererShape(renderer);
  });

  it('selects WebGLRenderer when supported and within the max texture size', () => {
    vi.spyOn(WebGLRenderer, 'isSupported').mockReturnValue(true);
    const canvas = document.createElement('canvas');

    const renderer = createRenderer(canvas, { width: 100, height: 100 });

    expect(renderer).toBeInstanceOf(WebGLRenderer);
    expectRendererShape(renderer);
  });
});

describe('maxTextureSize', () => {
  it('returns a positive number', () => {
    expect(maxTextureSize()).toBeGreaterThan(0);
  });
});
