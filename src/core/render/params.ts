import type { EditOperation } from '@/core/operations/types';
import { clampAdjustment, getAdjustments, getFilter } from '@/core/operations/model';

export interface RenderParams {
  brightness: number;
  contrast: number;
  saturation: number;
  filter: 0 | 1 | 2;
}

function factor(value: number): number {
  return (100 + clampAdjustment(value)) / 100;
}

export function toRenderParams(ops: EditOperation[]): RenderParams {
  const adjustments = getAdjustments(ops);
  const name = getFilter(ops);
  let filter: 0 | 1 | 2 = 0;
  if (name === 'grayscale') {
    filter = 1;
  } else if (name === 'sepia') {
    filter = 2;
  }
  return {
    brightness: factor(adjustments.brightness),
    contrast: factor(adjustments.contrast),
    saturation: factor(adjustments.saturation),
    filter,
  };
}

export function toCssFilter(ops: EditOperation[]): string | null {
  const params = toRenderParams(ops);
  const parts: string[] = [];
  if (params.brightness !== 1) {
    parts.push(`brightness(${params.brightness})`);
  }
  if (params.contrast !== 1) {
    parts.push(`contrast(${params.contrast})`);
  }
  if (params.saturation !== 1) {
    parts.push(`saturate(${params.saturation})`);
  }
  if (params.filter === 1) {
    parts.push('grayscale(1)');
  }
  if (params.filter === 2) {
    parts.push('sepia(1)');
  }
  return parts.length > 0 ? parts.join(' ') : null;
}
