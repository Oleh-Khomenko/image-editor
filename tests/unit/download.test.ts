import { describe, expect, it } from 'vitest';
import { exportFilename } from '@/core/util/download';

describe('exportFilename', () => {
  it('inserts the suffix before a simple extension', () => {
    expect(exportFilename('a.png', '-edited', 'png')).toBe('a-edited.png');
  });

  it('supports a different source extension and target extension', () => {
    expect(exportFilename('photo.jpeg', '-edited', 'jpeg')).toBe('photo-edited.jpeg');
  });

  it('appends the extension when the source name has none', () => {
    expect(exportFilename('noext', '-edited', 'png')).toBe('noext-edited.png');
  });

  it('only strips the final extension when the name has multiple dots', () => {
    expect(exportFilename('my.photo.png', '-edited', 'png')).toBe('my.photo-edited.png');
  });
});
