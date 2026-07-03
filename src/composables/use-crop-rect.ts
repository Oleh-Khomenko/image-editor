import { ref } from 'vue';
import type { Ref } from 'vue';
import type { CropOp } from '@/core/operations/types';

export interface NormRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type HandleId = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

export const MIN_CROP = 0.05;

const DEFAULT_RECT: NormRect = { x: 0.1, y: 0.1, width: 0.8, height: 0.8 };

// Pure geometry: keeps the rect inside [0,1] on both axes and never lets it
// shrink below MIN_CROP. Order matters — size is clamped first so the
// subsequent position clamp (1 - size) uses the final size.
export function clampRect(rect: NormRect): NormRect {
  const width = Math.min(1, Math.max(MIN_CROP, rect.width));
  const height = Math.min(1, Math.max(MIN_CROP, rect.height));
  const x = Math.min(1 - width, Math.max(0, rect.x));
  const y = Math.min(1 - height, Math.max(0, rect.y));
  return { x, y, width, height };
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

  // each handle maps a pointer delta onto the edges it owns; opposite edges
  // are untouched so e.g. dragging 'e' never moves x/y.
  function applyHandle(handle: HandleId | 'move', start: NormRect, dx: number, dy: number): NormRect {
    if (handle === 'move') {
      return { x: start.x + dx, y: start.y + dy, width: start.width, height: start.height };
    }
    let { x, y, width, height } = start;
    if (handle.includes('w')) {
      x = start.x + dx;
      width = start.width - dx;
    }
    if (handle.includes('e')) {
      width = start.width + dx;
    }
    if (handle.includes('n')) {
      y = start.y + dy;
      height = start.height - dy;
    }
    if (handle.includes('s')) {
      height = start.height + dy;
    }
    return { x, y, width, height };
  }

  function onPointerMove(e: PointerEvent): void {
    if (!drag) {
      return;
    }
    const { dx, dy } = toNormDelta(e);
    draft.value = clampRect(applyHandle(drag.handle, drag.startRect, dx, dy));
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

  // handlers

  function onHandlePointerDown(handle: HandleId, e: PointerEvent): void {
    e.stopPropagation();
    startDrag(handle, e);
  }

  function onBodyPointerDown(e: PointerEvent): void {
    startDrag('move', e);
  }

  return { draft, onHandlePointerDown, onBodyPointerDown };
}
