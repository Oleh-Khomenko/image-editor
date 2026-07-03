import { describe, expect, it } from 'vitest';
import { clampRect } from '@/composables/use-crop-rect';
import type { NormRect } from '@/composables/use-crop-rect';

describe('clampRect', () => {
  it('passes an in-bounds rect through unchanged', () => {
    const rect: NormRect = { x: 0.1, y: 0.1, width: 0.5, height: 0.5 };
    const result = clampRect(rect);
    expect(result.x).toBeCloseTo(0.1);
    expect(result.y).toBeCloseTo(0.1);
    expect(result.width).toBeCloseTo(0.5);
    expect(result.height).toBeCloseTo(0.5);
  });

  it('clamps x overflow so the rect stays within [0,1]', () => {
    const result = clampRect({ x: 0.8, y: 0, width: 0.5, height: 0.2 });
    expect(result.x).toBeCloseTo(0.5);
    expect(result.width).toBeCloseTo(0.5);
  });

  it('grows a sub-min rect up to MIN_CROP', () => {
    const result = clampRect({ x: 0, y: 0, width: 0.01, height: 0.01 });
    expect(result.width).toBeCloseTo(0.05);
    expect(result.height).toBeCloseTo(0.05);
  });

  it('clamps a negative origin to 0', () => {
    const result = clampRect({ x: -0.2, y: -0.3, width: 0.4, height: 0.4 });
    expect(result.x).toBeCloseTo(0);
    expect(result.y).toBeCloseTo(0);
  });

  it('never mutates the input object', () => {
    const rect: NormRect = { x: 0.8, y: 0, width: 0.5, height: 0.2 };
    const original = { ...rect };
    clampRect(rect);
    expect(rect).toEqual(original);
  });
});
