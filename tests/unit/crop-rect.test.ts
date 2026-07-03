import { describe, expect, it } from 'vitest';
import { applyHandle, clampRect } from '@/composables/use-crop-rect';
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
