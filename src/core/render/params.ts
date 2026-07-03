import type { EditOperation } from '@/core/operations/types';
import { clampAdjustment, getAdjustments, getFilter } from '@/core/operations/model';

// -100..100 slider value -> CSS filter factor (0 -> 1.0 neutral, 100 -> 2.0)
function factor(value: number): number {
  return (100 + clampAdjustment(value)) / 100;
}

export function toCssFilter(ops: EditOperation[]): string | null {
  const adjustments = getAdjustments(ops);
  const filter = getFilter(ops);
  const brightness = factor(adjustments.brightness);
  const contrast = factor(adjustments.contrast);
  const saturation = factor(adjustments.saturation);

  const parts: string[] = [];
  if (brightness !== 1) {
    parts.push(`brightness(${brightness})`);
  }
  if (contrast !== 1) {
    parts.push(`contrast(${contrast})`);
  }
  if (saturation !== 1) {
    parts.push(`saturate(${saturation})`);
  }
  if (filter === 'grayscale') {
    parts.push('grayscale(1)');
  }
  if (filter === 'sepia') {
    parts.push('sepia(1)');
  }
  return parts.length > 0 ? parts.join(' ') : null;
}
