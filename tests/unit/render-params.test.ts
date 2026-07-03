import { describe, expect, it } from 'vitest';
import { toCssFilter, toRenderParams } from '@/core/render/params';
import { FRAGMENT_SRC } from '@/core/render/shaders';
import type { EditOperation } from '@/core/operations/types';

describe('render params', () => {
  it('maps slider values to factors', () => {
    const ops: EditOperation[] = [
      { type: 'adjust', brightness: 0, contrast: 100, saturation: -100 },
    ];
    const p = toRenderParams(ops);
    expect(p.brightness).toBe(1);
    expect(p.contrast).toBe(2);
    expect(p.saturation).toBe(0);
  });

  it('maps filter name to enum', () => {
    expect(toRenderParams([]).filter).toBe(0);
    expect(toRenderParams([{ type: 'filter', name: 'grayscale' }]).filter).toBe(1);
    expect(toRenderParams([{ type: 'filter', name: 'sepia' }]).filter).toBe(2);
  });

  it('builds css filter string for the fallback', () => {
    expect(toCssFilter([])).toBeNull();
    expect(toCssFilter([{ type: 'filter', name: 'grayscale' }])).toContain('grayscale(1)');
    const css = toCssFilter([{ type: 'adjust', brightness: 100, contrast: 0, saturation: 0 }]);
    expect(css).toContain('brightness(2)');
  });

  it('exposes a fragment shader source', () => {
    expect(typeof FRAGMENT_SRC).toBe('string');
    expect(FRAGMENT_SRC).toContain('gl_FragColor');
  });
});
