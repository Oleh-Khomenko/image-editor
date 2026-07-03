import type { EditOperation } from '@/core/operations/types';

export interface Renderer {
  render(source: ImageBitmap, ops: EditOperation[]): void;
  toBlob(source: ImageBitmap, ops: EditOperation[], mime: string): Promise<Blob>;
  dispose(): void;
}
