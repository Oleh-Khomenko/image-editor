import type { EditOperation, FilterName } from '@/core/operations/types';
import type { SourceMeta } from '@/core/document/document';

const FILTER_NAMES: readonly FilterName[] = ['grayscale', 'sepia'];

function isFiniteNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

function isCropOp(v: Record<string, unknown>): boolean {
  return (
    isFiniteNumber(v.x) &&
    isFiniteNumber(v.y) &&
    isFiniteNumber(v.width) &&
    isFiniteNumber(v.height)
  );
}

function isAdjustOp(v: Record<string, unknown>): boolean {
  return isFiniteNumber(v.brightness) && isFiniteNumber(v.contrast) && isFiniteNumber(v.saturation);
}

function isFilterOp(v: Record<string, unknown>): boolean {
  return typeof v.name === 'string' && FILTER_NAMES.includes(v.name as FilterName);
}

export function isEditOperation(v: unknown): v is EditOperation {
  if (typeof v !== 'object' || v === null) {
    return false;
  }
  const obj = v as Record<string, unknown>;
  switch (obj.type) {
    case 'crop':
      return isCropOp(obj);
    case 'adjust':
      return isAdjustOp(obj);
    case 'filter':
      return isFilterOp(obj);
    default:
      return false;
  }
}

export function isSourceMeta(v: unknown): v is SourceMeta {
  if (typeof v !== 'object' || v === null) {
    return false;
  }
  const obj = v as Record<string, unknown>;
  return (
    typeof obj.name === 'string' &&
    typeof obj.mimeType === 'string' &&
    isFiniteNumber(obj.width) &&
    isFiniteNumber(obj.height) &&
    typeof obj.sha256 === 'string'
  );
}
