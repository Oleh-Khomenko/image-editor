import { describe, expect, it } from 'vitest';
import {
  clampAdjustment,
  getAdjustments,
  getCrop,
  getFilter,
  orderOperations,
  removeOperation,
  upsertOperation,
} from '@/core/operations/model';
import type { EditOperation } from '@/core/operations/types';

describe('operations model', () => {
  it('clamps and rounds adjustments', () => {
    expect(clampAdjustment(150)).toBe(100);
    expect(clampAdjustment(-150)).toBe(-100);
    expect(clampAdjustment(12.6)).toBe(13);
  });

  it('upsert replaces same-type op and keeps canonical order', () => {
    let ops: EditOperation[] = [];
    ops = upsertOperation(ops, { type: 'filter', name: 'sepia' });
    ops = upsertOperation(ops, { type: 'adjust', brightness: 10, contrast: 0, saturation: 0 });
    ops = upsertOperation(ops, { type: 'crop', x: 0, y: 0, width: 0.5, height: 0.5 });
    expect(ops.map((o) => o.type)).toEqual(['crop', 'adjust', 'filter']);

    ops = upsertOperation(ops, { type: 'adjust', brightness: 20, contrast: 0, saturation: 0 });
    expect(ops.filter((o) => o.type === 'adjust')).toHaveLength(1);
    expect(getAdjustments(ops).brightness).toBe(20);
  });

  it('remove drops one op type', () => {
    const ops: EditOperation[] = [{ type: 'filter', name: 'grayscale' }];
    expect(getFilter(removeOperation(ops, 'filter'))).toBeNull();
  });

  it('accessors return defaults when absent', () => {
    expect(getAdjustments([])).toEqual({ brightness: 0, contrast: 0, saturation: 0 });
    expect(getCrop([])).toBeNull();
    expect(orderOperations([{ type: 'filter', name: 'sepia' }])).toHaveLength(1);
  });
});
