import { CanvasRenderer } from '@/core/render/canvas-renderer';
import type { Renderer } from '@/core/render/renderer';
import { WebGLRenderer } from '@/core/render/webgl-renderer';

const DEFAULT_MAX_TEXTURE_SIZE = 4096;

export function maxTextureSize(): number {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') ?? canvas.getContext('experimental-webgl');
    if (!gl) {
      return DEFAULT_MAX_TEXTURE_SIZE;
    }
    return (gl as WebGLRenderingContext).getParameter(
      (gl as WebGLRenderingContext).MAX_TEXTURE_SIZE,
    ) as number;
  } catch {
    return DEFAULT_MAX_TEXTURE_SIZE;
  }
}

export function createRenderer(
  canvas: HTMLCanvasElement,
  source: { width: number; height: number },
  getMaxTextureSize: () => number = maxTextureSize,
): Renderer {
  if (WebGLRenderer.isSupported()) {
    const limit = getMaxTextureSize();
    const fitsGl = source.width <= limit && source.height <= limit;
    if (fitsGl) {
      return new WebGLRenderer(canvas);
    }
  }
  return new CanvasRenderer(canvas);
}
