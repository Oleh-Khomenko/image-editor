import type { EditOperation } from '@/shared/models/edit-operation';
import type { EditDocument, SourceMeta } from '@/shared/models/edit-document';
import { isEditOperation, isSourceMeta } from '@/shared/helpers/document-validation';

export class DocumentError extends Error {}

export function serializeDocument(
  source: SourceMeta,
  operations: EditOperation[],
  opts: { embedded?: string } = {},
): string {
  const doc: EditDocument = { version: 1, source, operations };
  if (opts.embedded) {
    doc.embedded = opts.embedded;
  }
  return JSON.stringify(doc, null, 2);
}

export function parseDocument(json: string): EditDocument {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    throw new DocumentError('Invalid JSON');
  }

  if (typeof raw !== 'object' || raw === null) {
    throw new DocumentError('Not an object');
  }
  const obj = raw as Record<string, unknown>;
  if (obj.version !== 1) {
    throw new DocumentError('Unsupported document version');
  }
  if (!isSourceMeta(obj.source)) {
    throw new DocumentError('Invalid source metadata');
  }
  if (!Array.isArray(obj.operations) || !obj.operations.every(isEditOperation)) {
    throw new DocumentError('Invalid operations');
  }
  const doc: EditDocument = {
    version: 1,
    source: obj.source,
    operations: obj.operations,
  };
  if (typeof obj.embedded === 'string') {
    doc.embedded = obj.embedded;
  }
  return doc;
}
