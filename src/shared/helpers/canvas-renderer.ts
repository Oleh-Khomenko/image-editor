// models
import type { CropOp, EditOperation } from '@/shared/models/edit-operation';
// helpers
import { getCrop } from '@/shared/helpers/operations';
import { toCssFilter } from '@/shared/helpers/css-filter';

// caps preview backing-store size; export renders full (maxSize = Infinity)
const PREVIEW_MAX_SIZE = 2000;

export function cropOutputSize(
  sourceW: number,
  sourceH: number,
  crop: CropOp | null,
): { width: number; height: number } {
  if (!crop) {
    return { width: Math.round(sourceW), height: Math.round(sourceH) };
  }
  return {
    width: Math.max(1, Math.round(sourceW * crop.width)),
    height: Math.max(1, Math.round(sourceH * crop.height)),
  };
}

export class CanvasRenderer {
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
    this.draw(source, ops, PREVIEW_MAX_SIZE);
  }

  async toBlob(source: ImageBitmap, ops: EditOperation[], mime: string): Promise<Blob> {
    this.draw(source, ops, Infinity);
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

  private draw(source: ImageBitmap, ops: EditOperation[], maxSize: number): void {
    const crop = getCrop(ops);
    const sx = crop ? crop.x * source.width : 0;
    const sy = crop ? crop.y * source.height : 0;
    const sw = crop ? crop.width * source.width : source.width;
    const sh = crop ? crop.height * source.height : source.height;

    const native = cropOutputSize(source.width, source.height, crop);
    const scale = Math.min(1, maxSize / Math.max(native.width, native.height));
    const width = Math.max(1, Math.round(native.width * scale));
    const height = Math.max(1, Math.round(native.height * scale));
    this.canvas.width = width;
    this.canvas.height = height;

    const ctx = this.ctx;
    ctx.filter = toCssFilter(ops) ?? 'none';
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(source, sx, sy, sw, sh, 0, 0, width, height);
    ctx.filter = 'none';
  }
}
