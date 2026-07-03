import { describe, expect, it } from 'vitest';
import { MIN_CROP, applyHandle, clampRect, fitToAspect } from '@/composables/use-crop-rect';
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

describe('applyHandle', () => {
  it('dragging e past the right edge keeps the left edge (x) fixed', () => {
    const start: NormRect = { x: 0.1, y: 0.1, width: 0.8, height: 0.8 };
    const result = applyHandle('e', start, 0.3, 0);
    expect(result.x).toBeCloseTo(0.1);
    expect(result.width + result.x).toBeLessThanOrEqual(1);
    expect(result.width + result.x).toBeCloseTo(1);
  });

  it('dragging w past the minimum keeps the right edge (x+width) fixed', () => {
    const start: NormRect = { x: 0.1, y: 0.1, width: 0.8, height: 0.8 };
    const result = applyHandle('w', start, 0.9, 0);
    expect(result.x + result.width).toBeCloseTo(0.9);
    expect(result.width).toBeCloseTo(0.05);
  });

  it('dragging s past the bottom edge keeps the top edge (y) fixed', () => {
    const start: NormRect = { x: 0.1, y: 0.1, width: 0.8, height: 0.8 };
    const result = applyHandle('s', start, 0, 0.3);
    expect(result.y).toBeCloseTo(0.1);
    expect(result.height + result.y).toBeCloseTo(1);
  });

  it('dragging n past the minimum keeps the bottom edge (y+height) fixed', () => {
    const start: NormRect = { x: 0.1, y: 0.1, width: 0.8, height: 0.8 };
    const result = applyHandle('n', start, 0, 0.9);
    expect(result.y + result.height).toBeCloseTo(0.9);
    expect(result.height).toBeCloseTo(0.05);
  });

  it('dragging a corner (se) keeps the opposite corner (nw) fixed', () => {
    const start: NormRect = { x: 0.1, y: 0.1, width: 0.8, height: 0.8 };
    const result = applyHandle('se', start, 0.5, 0.5);
    expect(result.x).toBeCloseTo(0.1);
    expect(result.y).toBeCloseTo(0.1);
    expect(result.x + result.width).toBeCloseTo(1);
    expect(result.y + result.height).toBeCloseTo(1);
  });

  it('dragging a corner (nw) keeps the opposite corner (se) fixed', () => {
    const start: NormRect = { x: 0.1, y: 0.1, width: 0.8, height: 0.8 };
    const result = applyHandle('nw', start, -0.5, -0.5);
    expect(result.x + result.width).toBeCloseTo(0.9);
    expect(result.y + result.height).toBeCloseTo(0.9);
    expect(result.x).toBeCloseTo(0);
    expect(result.y).toBeCloseTo(0);
  });

  it('move keeps size and shifts position, clamped into [0, 1-size]', () => {
    const start: NormRect = { x: 0.1, y: 0.1, width: 0.5, height: 0.5 };
    const result = applyHandle('move', start, 0.8, -0.5);
    expect(result.width).toBeCloseTo(0.5);
    expect(result.height).toBeCloseTo(0.5);
    expect(result.x).toBeCloseTo(0.5);
    expect(result.y).toBeCloseTo(0);
  });
});

describe('fitToAspect', () => {
  it('ratio 1 on a wide rect shrinks width to match height, centered, in-bounds', () => {
    const rect: NormRect = { x: 0.2, y: 0.2, width: 0.6, height: 0.4 };
    const result = fitToAspect(rect, 1);
    expect(result.width).toBeCloseTo(result.height);
    expect(result.width).toBeCloseTo(0.4);
    expect(result.x + result.width / 2).toBeCloseTo(rect.x + rect.width / 2);
    expect(result.y + result.height / 2).toBeCloseTo(rect.y + rect.height / 2);
    expect(result.x).toBeGreaterThanOrEqual(0);
    expect(result.y).toBeGreaterThanOrEqual(0);
    expect(result.x + result.width).toBeLessThanOrEqual(1);
    expect(result.y + result.height).toBeLessThanOrEqual(1);
    expect(result.width).toBeGreaterThanOrEqual(MIN_CROP);
    expect(result.height).toBeGreaterThanOrEqual(MIN_CROP);
  });

  it('ratio 2 produces width == 2 * height, in-bounds', () => {
    const rect: NormRect = { x: 0.2, y: 0.2, width: 0.6, height: 0.4 };
    const result = fitToAspect(rect, 2);
    expect(result.width).toBeCloseTo(2 * result.height);
    expect(result.x).toBeGreaterThanOrEqual(0);
    expect(result.y).toBeGreaterThanOrEqual(0);
    expect(result.x + result.width).toBeLessThanOrEqual(1);
    expect(result.y + result.height).toBeLessThanOrEqual(1);
    expect(result.width).toBeGreaterThanOrEqual(MIN_CROP);
    expect(result.height).toBeGreaterThanOrEqual(MIN_CROP);
  });

  it('never shrinks below MIN_CROP even for a tiny input rect', () => {
    const rect: NormRect = { x: 0.5, y: 0.5, width: 0.06, height: 0.06 };
    const result = fitToAspect(rect, 3);
    expect(result.width).toBeGreaterThanOrEqual(MIN_CROP);
    expect(result.height).toBeGreaterThanOrEqual(MIN_CROP);
    expect(result.width).toBeCloseTo(3 * result.height);
  });
});

describe('applyHandle with a locked aspect', () => {
  it('corner resize (se) keeps the aspect and leaves the anchor (nw) corner fixed', () => {
    const start: NormRect = { x: 0.1, y: 0.1, width: 0.4, height: 0.4 };
    const result = applyHandle('se', start, 0.2, 0, 1);
    expect(result.width / result.height).toBeCloseTo(1);
    expect(result.x).toBeCloseTo(0.1);
    expect(result.y).toBeCloseTo(0.1);
  });

  it('corner resize (se) clamps to bounds while preserving the aspect', () => {
    const start: NormRect = { x: 0.1, y: 0.1, width: 0.4, height: 0.4 };
    const result = applyHandle('se', start, 5, 5, 1);
    expect(result.width / result.height).toBeCloseTo(1);
    expect(result.x).toBeCloseTo(0.1);
    expect(result.y).toBeCloseTo(0.1);
    expect(result.x + result.width).toBeLessThanOrEqual(1 + 1e-9);
    expect(result.y + result.height).toBeLessThanOrEqual(1 + 1e-9);
  });

  it('corner resize (nw) keeps the opposite (se) corner fixed', () => {
    const start: NormRect = { x: 0.2, y: 0.2, width: 0.4, height: 0.4 };
    const result = applyHandle('nw', start, -0.1, -0.1, 1);
    expect(result.width / result.height).toBeCloseTo(1);
    expect(result.x + result.width).toBeCloseTo(0.6);
    expect(result.y + result.height).toBeCloseTo(0.6);
  });

  it('corner resize (nw) with a non-1 aspect keeps the opposite corner fixed', () => {
    const aspect = 16 / 9;
    const start: NormRect = { x: 0.3, y: 0.3, width: 0.4, height: 0.2 };
    const result = applyHandle('nw', start, -0.05, -0.02, aspect);
    expect(result.width / result.height).toBeCloseTo(aspect);
    expect(result.x + result.width).toBeCloseTo(start.x + start.width);
    expect(result.y + result.height).toBeCloseTo(start.y + start.height);
  });

  it('edge resize (e) keeps the aspect, growing height symmetrically about the vertical center', () => {
    const start: NormRect = { x: 0.1, y: 0.3, width: 0.4, height: 0.2 };
    const result = applyHandle('e', start, 0.2, 0, 2);
    expect(result.width / result.height).toBeCloseTo(2);
    expect(result.x).toBeCloseTo(0.1);
    const startCenterY = start.y + start.height / 2;
    const resultCenterY = result.y + result.height / 2;
    expect(resultCenterY).toBeCloseTo(startCenterY);
  });

  it('never returns an out-of-bounds or sub-MIN_CROP rect under a locked aspect', () => {
    const start: NormRect = { x: 0.4, y: 0.4, width: 0.2, height: 0.2 };
    const result = applyHandle('sw', start, -5, 5, 1);
    expect(result.x).toBeGreaterThanOrEqual(0);
    expect(result.y).toBeGreaterThanOrEqual(0);
    expect(result.x + result.width).toBeLessThanOrEqual(1 + 1e-9);
    expect(result.y + result.height).toBeLessThanOrEqual(1 + 1e-9);
    expect(result.width).toBeGreaterThanOrEqual(MIN_CROP - 1e-9);
    expect(result.height).toBeGreaterThanOrEqual(MIN_CROP - 1e-9);
  });
});
