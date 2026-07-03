<script setup lang="ts">
// utils
import { onBeforeUnmount, onMounted, ref, useTemplateRef } from 'vue';
import { storeToRefs } from 'pinia';
// stores
import useEditorStore from '@/stores/editor';
// composables
import useCropRect, { clampRect } from '@/composables/use-crop-rect';
// models
import type { HandleId } from '@/composables/use-crop-rect';

// props
interface Props {
  getCanvas: () => HTMLCanvasElement | null;
}
const props = defineProps<Props>();

// constants
const HANDLES: HandleId[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
const GRID_LINES = [33.33, 66.66];
const NUDGE_STEP = 0.01;
const NUDGE_STEP_LARGE = 0.1;
const ARROW_DELTAS: Record<string, { dx: number; dy: number }> = {
  ArrowUp: { dx: 0, dy: -1 },
  ArrowDown: { dx: 0, dy: 1 },
  ArrowLeft: { dx: -1, dy: 0 },
  ArrowRight: { dx: 1, dy: 0 },
};

// stores
const store = useEditorStore();
const { cropDraft } = storeToRefs(store);

// template refs
const rootRef = useTemplateRef<HTMLDivElement>('root');
const frameRef = useTemplateRef<HTMLDivElement>('frame');

// state
// mirrors the canvas's letterboxed rendered rect, measured directly so the
// overlay lines up with the object-fit:contain image
const box = ref<{ left: number; top: number; width: number; height: number }>({
  left: 0,
  top: 0,
  width: 0,
  height: 0,
});

// composables
const { onHandlePointerDown, onBodyPointerDown } = useCropRect(
  () => rootRef.value,
  cropDraft,
  () => store.cropAspect,
);

// helpers
function measure(): void {
  const canvas = props.getCanvas();
  const parent = rootRef.value?.offsetParent as HTMLElement | null;
  if (!canvas || !parent) {
    return;
  }
  const canvasRect = canvas.getBoundingClientRect();
  const parentRect = parent.getBoundingClientRect();
  box.value = {
    left: canvasRect.left - parentRect.left,
    top: canvasRect.top - parentRect.top,
    width: canvasRect.width,
    height: canvasRect.height,
  };
}

function pct(value: number): string {
  return `${value * 100}%`;
}

// handles live inside the frame, so their offsets are frame-local (0..1),
// independent of the draft rect's size or the image aspect ratio
function handleStyle(handle: HandleId): Record<string, string> {
  const positions: Record<HandleId, { x: number; y: number }> = {
    nw: { x: 0, y: 0 },
    n: { x: 0.5, y: 0 },
    ne: { x: 1, y: 0 },
    e: { x: 1, y: 0.5 },
    se: { x: 1, y: 1 },
    s: { x: 0.5, y: 1 },
    sw: { x: 0, y: 1 },
    w: { x: 0, y: 0.5 },
  };
  const { x, y } = positions[handle];
  return { left: pct(x), top: pct(y) };
}

function onFrameKeydown(e: KeyboardEvent): void {
  if (e.key === 'Escape') {
    e.preventDefault();
    store.stopCropEditing();
    return;
  }
  if (e.key === 'Enter') {
    e.preventDefault();
    store.applyCrop();
    return;
  }
  const delta = ARROW_DELTAS[e.key];
  if (!delta) {
    return;
  }
  e.preventDefault();
  const step = e.shiftKey ? NUDGE_STEP_LARGE : NUDGE_STEP;
  store.setCropDraft(
    clampRect({
      ...store.cropDraft,
      x: store.cropDraft.x + delta.dx * step,
      y: store.cropDraft.y + delta.dy * step,
    }),
  );
}

// lifecycle
let resizeObserver: ResizeObserver | null = null;

onMounted(() => {
  measure();
  const canvas = props.getCanvas();
  resizeObserver = new ResizeObserver(measure);
  if (canvas) {
    resizeObserver.observe(canvas);
  }
  window.addEventListener('resize', measure);
  frameRef.value?.focus();
});

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  resizeObserver = null;
  window.removeEventListener('resize', measure);
});
</script>

<template>
  <div
    ref="root"
    class="crop-overlay"
    :style="{
      left: `${box.left}px`,
      top: `${box.top}px`,
      width: `${box.width}px`,
      height: `${box.height}px`,
    }"
  >
    <svg
      class="crop-overlay__svg"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
    >
      <path
        class="crop-overlay__mask"
        fill-rule="evenodd"
        :d="`M0,0 H100 V100 H0 Z M${cropDraft.x * 100},${cropDraft.y * 100} h${cropDraft.width * 100} v${cropDraft.height * 100} h${-cropDraft.width * 100} Z`"
      />
    </svg>
    <div
      ref="frame"
      class="crop-overlay__frame"
      :style="{
        left: pct(cropDraft.x),
        top: pct(cropDraft.y),
        width: pct(cropDraft.width),
        height: pct(cropDraft.height),
      }"
      tabindex="0"
      role="group"
      aria-label="Crop region, use arrow keys to move"
      @pointerdown="onBodyPointerDown"
      @keydown="onFrameKeydown"
    >
      <div
        class="crop-overlay__grid"
        aria-hidden="true"
      >
        <span
          v-for="pos in GRID_LINES"
          :key="`v-${pos}`"
          class="crop-overlay__grid-line crop-overlay__grid-line--v"
          :style="{ left: `${pos}%` }"
        />
        <span
          v-for="pos in GRID_LINES"
          :key="`h-${pos}`"
          class="crop-overlay__grid-line crop-overlay__grid-line--h"
          :style="{ top: `${pos}%` }"
        />
      </div>
      <div
        v-if="store.cropPixelSize"
        class="crop-overlay__dims"
      >
        {{ store.cropPixelSize.width }} × {{ store.cropPixelSize.height }} px
      </div>
      <button
        v-for="handle in HANDLES"
        :key="handle"
        type="button"
        :class="`crop-overlay__handle crop-overlay__handle--${handle}`"
        :style="handleStyle(handle)"
        @pointerdown="(e: PointerEvent) => onHandlePointerDown(handle, e)"
      />
    </div>
  </div>
</template>

<style scoped lang="scss">
.crop-overlay {
  position: absolute;
  z-index: 2;

  &__svg {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
  }

  &__mask {
    fill: rgb(0 0 0 / 55%);
  }

  &__frame {
    position: absolute;
    box-sizing: border-box;
    border: 0.0625rem solid #fff;
    cursor: move;
  }

  &__grid {
    position: absolute;
    inset: 0;
    pointer-events: none;
  }

  &__grid-line {
    position: absolute;
    background: rgb(255 255 255 / 0.35);
    pointer-events: none;

    &--v {
      top: 0;
      width: 0.0625rem;
      height: 100%;
    }

    &--h {
      left: 0;
      width: 100%;
      height: 0.0625rem;
    }
  }

  &__dims {
    position: absolute;
    top: 0.375rem;
    left: 0.375rem;
    padding: 0.125rem 0.375rem;
    color: #fff;
    font-size: 0.75rem;
    font-variant-numeric: tabular-nums;
    background: rgb(0 0 0 / 65%);
    border-radius: 0.1875rem;
    pointer-events: none;
  }

  &__handle {
    position: absolute;
    width: 1rem;
    height: 1rem;
    padding: 0;
    background: #fff;
    border: 0.0625rem solid #333;
    border-radius: 50%;
    box-shadow: 0 0 0 0.0625rem rgb(0 0 0 / 25%), 0 0.0625rem 0.1875rem rgb(0 0 0 / 40%);
    transform: translate(-50%, -50%);

    // transparent, oversized hit area so the handle stays easy to grab without
    // visually growing the circle itself
    &::before {
      position: absolute;
      top: 50%;
      left: 50%;
      width: 1.75rem;
      height: 1.75rem;
      content: '';
      transform: translate(-50%, -50%);
    }

    &--n,
    &--s {
      cursor: ns-resize;
    }

    &--e,
    &--w {
      cursor: ew-resize;
    }

    &--nw,
    &--se {
      cursor: nwse-resize;
    }

    &--ne,
    &--sw {
      cursor: nesw-resize;
    }
  }
}
</style>
