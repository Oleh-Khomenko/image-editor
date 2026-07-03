// models
import type { Adjustments, CropOp, EditOperation, FilterName } from '@/shared/models/edit-operation';
// constants
import { DEFAULT_ADJUSTMENTS } from '@/shared/constants/adjustments';

const ORDER: Record<EditOperation['type'], number> = {
  crop: 0,
  adjust: 1,
  filter: 2,
};

export function clampAdjustment(value: number): number {
  return Math.min(100, Math.max(-100, Math.round(value)));
}

export function orderOperations(ops: EditOperation[]): EditOperation[] {
  return [...ops].sort((a, b) => ORDER[a.type] - ORDER[b.type]);
}

export function upsertOperation(ops: EditOperation[], op: EditOperation): EditOperation[] {
  const next = ops.filter((existing) => existing.type !== op.type);
  next.push(op);
  return orderOperations(next);
}

export function removeOperation(ops: EditOperation[], type: EditOperation['type']): EditOperation[] {
  return ops.filter((op) => op.type !== type);
}

export function getAdjustments(ops: EditOperation[]): Adjustments {
  const op = ops.find((o) => o.type === 'adjust');
  if (!op) {
    return { ...DEFAULT_ADJUSTMENTS };
  }
  return { brightness: op.brightness, contrast: op.contrast, saturation: op.saturation };
}

export function getFilter(ops: EditOperation[]): FilterName | null {
  const op = ops.find((o) => o.type === 'filter');
  return op ? op.name : null;
}

export function getCrop(ops: EditOperation[]): CropOp | null {
  const op = ops.find((o) => o.type === 'crop');
  return op ?? null;
}
