import { describe, expect, it } from 'vitest';
import { cropOutputSize } from '@/shared/helpers/canvas-renderer';

describe('cropOutputSize', () => {
  it('returns the rounded source size when there is no crop', () => {
    expect(cropOutputSize(200, 100, null)).toEqual({ width: 200, height: 100 });
  });

  it('scales by the crop rect and rounds, never below 1px', () => {
    const crop = { type: 'crop' as const, x: 0.1, y: 0.2, width: 0.5, height: 0.4 };
    expect(cropOutputSize(200, 100, crop)).toEqual({ width: 100, height: 40 });
    expect(cropOutputSize(1, 1, { ...crop, width: 0.001, height: 0.001 })).toEqual({
      width: 1,
      height: 1,
    });
  });
});
