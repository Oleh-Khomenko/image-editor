import type { EditOperation } from '@/core/operations/types';
import { getCrop } from '@/core/operations/model';
import { toCssFilter } from '@/core/render/params';
import { cropOutputSize } from '@/core/render/webgl-renderer';
import type { Renderer } from '@/core/render/renderer';

// 2D canvas fallback for environments without WebGL. Slower, but supports the
// same crop/adjust/filter pipeline via ctx.filter + drawImage sub-rects.
export class CanvasRenderer implements Renderer {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;

  constructor(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('2D canvas context is not supported');
    }
    this.canvas = canvas;
    this.ctx = ctx;
  }

  render(source: ImageBitmap, ops: EditOperation[]): void {
    this.draw(source, ops);
  }

  async toBlob(source: ImageBitmap, ops: EditOperation[], mime: string): Promise<Blob> {
    // Reuses the instance canvas; draw() always sizes it to the full
    // cropOutputSize, so the output is never a display-downscaled size.
    this.draw(source, ops);
    const canvas = this.canvas;
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to encode canvas to blob'));
        }
      }, mime);
    });
  }

  dispose(): void {
    // Nothing to release: the 2D context holds no GPU resources.
  }

  private draw(source: ImageBitmap, ops: EditOperation[]): void {
    const crop = getCrop(ops);
    const sx = crop ? crop.x * source.width : 0;
    const sy = crop ? crop.y * source.height : 0;
    const sw = crop ? crop.width * source.width : source.width;
    const sh = crop ? crop.height * source.height : source.height;

    const { width, height } = cropOutputSize(source.width, source.height, crop);
    this.canvas.width = width;
    this.canvas.height = height;

    const ctx = this.ctx;
    ctx.filter = toCssFilter(ops) ?? 'none';
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(source, sx, sy, sw, sh, 0, 0, width, height);
    ctx.filter = 'none';
  }
}
