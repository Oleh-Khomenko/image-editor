// models
import type { EditOperation } from '@/shared/models/edit-operation';

export interface SourceMeta {
  name: string;
  mimeType: string;
  width: number;
  height: number;
  sha256: string;
}

export interface EditDocument {
  version: 1;
  source: SourceMeta;
  operations: EditOperation[];
  embedded?: string;
}
