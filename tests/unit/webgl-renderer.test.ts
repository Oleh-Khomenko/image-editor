import { describe, expect, it } from 'vitest';
import { cropOutputSize, cropToUv, WebGLRenderer } from '@/core/render/webgl-renderer';
import type { CropOp } from '@/core/operations/types';

describe('webgl renderer helpers', () => {
  it('cropToUv returns the full rect when there is no crop', () => {
    expect(cropToUv(null)).toEqual({ x0: 0, y0: 0, x1: 1, y1: 1 });
  });

  it('cropToUv maps a crop op to its uv sub-rect', () => {
    const crop: CropOp = { type: 'crop', x: 0.1, y: 0.2, width: 0.5, height: 0.4 };
    const uv = cropToUv(crop);
    expect(uv.x0).toBeCloseTo(0.1);
    expect(uv.y0).toBeCloseTo(0.2);
    expect(uv.x1).toBeCloseTo(0.6);
    expect(uv.y1).toBeCloseTo(0.6);
  });

  it('cropOutputSize returns the source size when there is no crop', () => {
    expect(cropOutputSize(200, 100, null)).toEqual({ width: 200, height: 100 });
  });

  it('cropOutputSize scales by the crop rect and rounds', () => {
    const crop: CropOp = { type: 'crop', x: 0, y: 0, width: 0.5, height: 0.4 };
    expect(cropOutputSize(200, 100, crop)).toEqual({ width: 100, height: 40 });
  });

  it('exposes a static support check', () => {
    expect(typeof WebGLRenderer.isSupported).toBe('function');
  });
});
