import { describe, expect, it } from 'vitest';
import { DocumentError, parseDocument, serializeDocument } from '@/core/document/document';
import type { SourceMeta } from '@/core/document/document';

const meta: SourceMeta = {
  name: 'a.png',
  mimeType: 'image/png',
  width: 100,
  height: 80,
  sha256: 'abc',
};

describe('document', () => {
  it('round-trips operations-only', () => {
    const json = serializeDocument(meta, [
      { type: 'adjust', brightness: 10, contrast: 0, saturation: -5 },
    ]);
    const doc = parseDocument(json);
    expect(doc.version).toBe(1);
    expect(doc.embedded).toBeUndefined();
    expect(doc.operations).toHaveLength(1);
    expect(doc.source.sha256).toBe('abc');
  });

  it('keeps embedded source when requested', () => {
    const json = serializeDocument(meta, [], { embedded: 'data:image/png;base64,AAAA' });
    expect(parseDocument(json).embedded).toContain('base64');
  });

  it('rejects wrong version', () => {
    expect(() =>
      parseDocument(JSON.stringify({ version: 2, source: meta, operations: [] })),
    ).toThrow(DocumentError);
  });

  it('rejects unknown operation type', () => {
    const bad = JSON.stringify({ version: 1, source: meta, operations: [{ type: 'blur' }] });
    expect(() => parseDocument(bad)).toThrow(DocumentError);
  });

  it('rejects malformed json', () => {
    expect(() => parseDocument('{not json')).toThrow(DocumentError);
  });
});
