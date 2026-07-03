// utils
import { onScopeDispose } from 'vue';
import type { Ref } from 'vue';

export interface NormRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type HandleId = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

export const MIN_CROP = 0.05;

// size is clamped before position so the position clamp uses the final size
export function clampRect(rect: NormRect): NormRect {
  const width = Math.min(1, Math.max(MIN_CROP, rect.width));
  const height = Math.min(1, Math.max(MIN_CROP, rect.height));
  const x = Math.min(1 - width, Math.max(0, rect.x));
  const y = Math.min(1 - height, Math.max(0, rect.y));
  return { x, y, width, height };
}

// fits `ratio` inside the rect, keeps its center, clamps to [0,1] and >= MIN_CROP
export function fitToAspect(rect: NormRect, ratio: number): NormRect {
  const cx = rect.x + rect.width / 2;
  const cy = rect.y + rect.height / 2;
  let width = Math.min(rect.width, rect.height * ratio);
  let height = width / ratio;
  if (width > 1) {
    width = 1;
    height = width / ratio;
  }
  if (height > 1) {
    height = 1;
    width = height * ratio;
  }
  // MIN_CROP applies per-axis, so the ratio-consistent floor for width is
  // whichever of MIN_CROP or MIN_CROP*ratio is larger
  const minWidth = Math.max(MIN_CROP, MIN_CROP * ratio);
  if (width < minWidth) {
    width = minWidth;
    height = width / ratio;
  }
  const x = Math.min(1 - width, Math.max(0, cx - width / 2));
  const y = Math.min(1 - height, Math.max(0, cy - height / 2));
  return { x, y, width, height };
}

// the dragged edge is clamped against the fixed opposite edge, which never moves
function applyFreeHandle(handle: HandleId, start: NormRect, dx: number, dy: number): NormRect {
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

// the diagonally-opposite corner is the anchor; height is derived from `aspect`
function applyLockedCorner(handle: 'nw' | 'ne' | 'se' | 'sw', start: NormRect, dx: number, aspect: number): NormRect {
  const minWidth = Math.max(MIN_CROP, MIN_CROP * aspect);
  const startRight = start.x + start.width;
  const startBottom = start.y + start.height;
  if (handle === 'se') {
    const ax = start.x;
    const ay = start.y;
    const maxWidth = Math.min(1 - ax, (1 - ay) * aspect);
    const width = Math.min(maxWidth, Math.max(minWidth, start.width + dx));
    const height = width / aspect;
    return { x: ax, y: ay, width, height };
  }
  if (handle === 'nw') {
    const bx = startRight;
    const by = startBottom;
    const maxWidth = Math.min(bx, by * aspect);
    const width = Math.min(maxWidth, Math.max(minWidth, start.width - dx));
    const height = width / aspect;
    return { x: bx - width, y: by - height, width, height };
  }
  if (handle === 'ne') {
    const ax = start.x;
    const by = startBottom;
    const maxWidth = Math.min(1 - ax, by * aspect);
    const width = Math.min(maxWidth, Math.max(minWidth, start.width + dx));
    const height = width / aspect;
    return { x: ax, y: by - height, width, height };
  }
  const bx = startRight;
  const ay = start.y;
  const maxWidth = Math.min(bx, (1 - ay) * aspect);
  const width = Math.min(maxWidth, Math.max(minWidth, start.width - dx));
  const height = width / aspect;
  return { x: bx - width, y: ay, width, height };
}

// opposite edge stays fixed; the perpendicular side grows symmetrically to hold the ratio
function applyLockedEdge(handle: 'n' | 's' | 'e' | 'w', start: NormRect, dx: number, dy: number, aspect: number): NormRect {
  const startRight = start.x + start.width;
  const startBottom = start.y + start.height;
  if (handle === 'e' || handle === 'w') {
    const centerY = start.y + start.height / 2;
    const maxSpan = 2 * Math.min(centerY, 1 - centerY);
    const minWidth = Math.max(MIN_CROP, MIN_CROP * aspect);
    if (handle === 'e') {
      const left = start.x;
      const maxWidth = Math.min(1 - left, aspect * maxSpan);
      const width = Math.min(maxWidth, Math.max(minWidth, start.width + dx));
      const height = width / aspect;
      return { x: left, y: centerY - height / 2, width, height };
    }
    const right = startRight;
    const maxWidth = Math.min(right, aspect * maxSpan);
    const width = Math.min(maxWidth, Math.max(minWidth, start.width - dx));
    const height = width / aspect;
    return { x: right - width, y: centerY - height / 2, width, height };
  }
  const centerX = start.x + start.width / 2;
  const maxSpan = 2 * Math.min(centerX, 1 - centerX);
  const minHeight = Math.max(MIN_CROP, MIN_CROP / aspect);
  if (handle === 's') {
    const top = start.y;
    const maxHeight = Math.min(1 - top, maxSpan / aspect);
    const height = Math.min(maxHeight, Math.max(minHeight, start.height + dy));
    const width = height * aspect;
    return { x: centerX - width / 2, y: top, width, height };
  }
  const bottom = startBottom;
  const maxHeight = Math.min(bottom, maxSpan / aspect);
  const height = Math.min(maxHeight, Math.max(minHeight, start.height - dy));
  const width = height * aspect;
  return { x: centerX - width / 2, y: bottom - height, width, height };
}

export function applyHandle(
  handle: HandleId | 'move',
  start: NormRect,
  dx: number,
  dy: number,
  aspect: number | null = null,
): NormRect {
  if (handle === 'move') {
    return clampRect({ x: start.x + dx, y: start.y + dy, width: start.width, height: start.height });
  }
  if (aspect === null) {
    return applyFreeHandle(handle, start, dx, dy);
  }
  if (handle === 'n' || handle === 's' || handle === 'e' || handle === 'w') {
    return applyLockedEdge(handle, start, dx, dy, aspect);
  }
  return applyLockedCorner(handle, start, dx, aspect);
}

interface DragState {
  handle: HandleId | 'move';
  startX: number;
  startY: number;
  startRect: NormRect;
}

export interface UseCropRect {
  onHandlePointerDown: (handle: HandleId, e: PointerEvent) => void;
  onBodyPointerDown: (e: PointerEvent) => void;
}

export default function useCropRect(
  getContainer: () => HTMLElement | null,
  draft: Ref<NormRect>,
  getAspect: () => number | null,
): UseCropRect {
  // state
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
    draft.value = applyHandle(drag.handle, drag.startRect, dx, dy, getAspect());
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

  return { onHandlePointerDown, onBodyPointerDown };
}
