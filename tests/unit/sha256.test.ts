import { describe, expect, it } from 'vitest';
import { sha256Hex } from '@/shared/helpers/sha256';

describe('sha256Hex', () => {
  it('matches the known SHA-256 digest of "abc"', async () => {
    const bytes = new TextEncoder().encode('abc').buffer;
    const hex = await sha256Hex(bytes);
    expect(hex).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });

  it('returns 64 lowercase hex characters', async () => {
    const bytes = new TextEncoder().encode('abc').buffer;
    const hex = await sha256Hex(bytes);
    expect(hex).toMatch(/^[0-9a-f]{64}$/);
  });
});
