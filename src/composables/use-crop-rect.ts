// utils
import { onScopeDispose, ref } from 'vue';
import type { Ref } from 'vue';
// models
import type { CropOp } from '@/shared/models/edit-operation';

export interface NormRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type HandleId = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

export const MIN_CROP = 0.05;

const DEFAULT_RECT: NormRect = { x: 0.1, y: 0.1, width: 0.8, height: 0.8 };

// size is clamped before position so the position clamp uses the final size
export function clampRect(rect: NormRect): NormRect {
  const width = Math.min(1, Math.max(MIN_CROP, rect.width));
  const height = Math.min(1, Math.max(MIN_CROP, rect.height));
  const x = Math.min(1 - width, Math.max(0, rect.x));
  const y = Math.min(1 - height, Math.max(0, rect.y));
  return { x, y, width, height };
}

// resize handles keep the opposite edge fixed: the moved edge is clamped to
// [0,1] and against the fixed edge's MIN_CROP margin, never the fixed edge itself
export function applyHandle(handle: HandleId | 'move', start: NormRect, dx: number, dy: number): NormRect {
  if (handle === 'move') {
    return clampRect({ x: start.x + dx, y: start.y + dy, width: start.width, height: start.height });
  }
  const startRight = start.x + start.width;
  const startBottom = start.y + start.height;
  let left = start.x;
  let right = startRight;
  let top = start.y;
  let bottom = startBottom;
  if (handle.includes('w')) {
    left = Math.min(right - MIN_CROP, Math.max(0, start.x + dx));
  }
  if (handle.includes('e')) {
    right = Math.min(1, Math.max(left + MIN_CROP, start.x + start.width + dx));
  }
  if (handle.includes('n')) {
    top = Math.min(bottom - MIN_CROP, Math.max(0, start.y + dy));
  }
  if (handle.includes('s')) {
    bottom = Math.min(1, Math.max(top + MIN_CROP, start.y + start.height + dy));
  }
  return { x: left, y: top, width: right - left, height: bottom - top };
}

interface DragState {
  handle: HandleId | 'move';
  startX: number;
  startY: number;
  startRect: NormRect;
}

export interface UseCropRect {
  draft: Ref<NormRect>;
  onHandlePointerDown: (handle: HandleId, e: PointerEvent) => void;
  onBodyPointerDown: (e: PointerEvent) => void;
}

export default function useCropRect(
  getContainer: () => HTMLElement | null,
  initial: () => CropOp | null,
): UseCropRect {
  // state
  const initialOp = initial();
  const draft = ref<NormRect>(
    initialOp
      ? { x: initialOp.x, y: initialOp.y, width: initialOp.width, height: initialOp.height }
      : { ...DEFAULT_RECT },
  );
  let drag: DragState | null = null;

  // helpers
  function toNormDelta(e: PointerEvent): { dx: number; dy: number } {
    const container = getContainer();
    if (!container || !drag) {
      return { dx: 0, dy: 0 };
    }
    const box = container.getBoundingClientRect();
    const dx = box.width > 0 ? (e.clientX - drag.startX) / box.width : 0;
    const dy = box.height > 0 ? (e.clientY - drag.startY) / box.height : 0;
    return { dx, dy };
  }

  function onPointerMove(e: PointerEvent): void {
    if (!drag) {
      return;
    }
    const { dx, dy } = toNormDelta(e);
    draft.value = applyHandle(drag.handle, drag.startRect, dx, dy);
  }

  function onPointerUp(): void {
    drag = null;
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);
  }

  function startDrag(handle: HandleId | 'move', e: PointerEvent): void {
    drag = { handle, startX: e.clientX, startY: e.clientY, startRect: { ...draft.value } };
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  }

  function onHandlePointerDown(handle: HandleId, e: PointerEvent): void {
    e.stopPropagation();
    startDrag(handle, e);
  }

  function onBodyPointerDown(e: PointerEvent): void {
    startDrag('move', e);
  }

  onScopeDispose(onPointerUp);

  return { draft, onHandlePointerDown, onBodyPointerDown };
}
