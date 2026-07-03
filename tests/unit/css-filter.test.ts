import { describe, expect, it } from 'vitest';
import { toCssFilter } from '@/shared/helpers/css-filter';

describe('toCssFilter', () => {
  it('returns null when nothing is applied', () => {
    expect(toCssFilter([])).toBeNull();
    expect(toCssFilter([{ type: 'adjust', brightness: 0, contrast: 0, saturation: 0 }])).toBeNull();
  });

  it('maps slider values to filter factors', () => {
    const css = toCssFilter([{ type: 'adjust', brightness: 100, contrast: -100, saturation: 0 }]);
    expect(css).toContain('brightness(2)');
    expect(css).toContain('contrast(0)');
    expect(css).not.toContain('saturate');
  });

  it('appends the named filter', () => {
    expect(toCssFilter([{ type: 'filter', name: 'grayscale' }])).toBe('grayscale(1)');
    expect(toCssFilter([{ type: 'filter', name: 'sepia' }])).toBe('sepia(1)');
  });
});
