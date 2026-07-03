<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, useTemplateRef } from 'vue';
import useEditorStore from '@/stores/editor';
import useCropRect from '@/composables/use-crop-rect';
import type { HandleId, NormRect } from '@/composables/use-crop-rect';

// props
interface Props {
  getCanvas: () => HTMLCanvasElement | null;
}
const props = defineProps<Props>();

// emits
interface Emits {
  (e: 'apply', rect: NormRect): void;
  (e: 'cancel'): void;
}
const emit = defineEmits<Emits>();

// constants
const HANDLES: HandleId[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];

// stores
const store = useEditorStore();

// template refs
const rootRef = useTemplateRef<HTMLDivElement>('root');

// state

// pixel box (relative to the offset parent) that mirrors the canvas's
// letterboxed rendered rect; the canvas is object-fit:contain inside the
// same positioned parent, so measuring it directly is the only reliable way
// to line this overlay up with it exactly.
const box = ref<{ left: number; top: number; width: number; height: number }>({
  left: 0,
  top: 0,
  width: 0,
  height: 0,
});

// composables
const { draft, onHandlePointerDown, onBodyPointerDown } = useCropRect(
  () => rootRef.value,
  () => store.crop,
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

// percentage strings so the SVG scales with the measured box (0..1 -> 0..100%)
function pct(value: number): string {
  return `${value * 100}%`;
}

function handleStyle(handle: HandleId): Record<string, string> {
  const positions: Record<HandleId, { x: number; y: number }> = {
    nw: { x: draft.value.x, y: draft.value.y },
    n: { x: draft.value.x + draft.value.width / 2, y: draft.value.y },
    ne: { x: draft.value.x + draft.value.width, y: draft.value.y },
    e: { x: draft.value.x + draft.value.width, y: draft.value.y + draft.value.height / 2 },
    se: { x: draft.value.x + draft.value.width, y: draft.value.y + draft.value.height },
    s: { x: draft.value.x + draft.value.width / 2, y: draft.value.y + draft.value.height },
    sw: { x: draft.value.x, y: draft.value.y + draft.value.height },
    w: { x: draft.value.x, y: draft.value.y + draft.value.height / 2 },
  };
  const { x, y } = positions[handle];
  return { left: pct(x), top: pct(y) };
}

function onApply(): void {
  emit('apply', { ...draft.value });
}

function onCancel(): void {
  emit('cancel');
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
        :d="`M0,0 H100 V100 H0 Z M${draft.x * 100},${draft.y * 100} h${draft.width * 100} v${draft.height * 100} h${-draft.width * 100} Z`"
      />
    </svg>
    <div
      class="crop-overlay__frame"
      :style="{
        left: pct(draft.x),
        top: pct(draft.y),
        width: pct(draft.width),
        height: pct(draft.height),
      }"
      @pointerdown="onBodyPointerDown"
    >
      <button
        v-for="handle in HANDLES"
        :key="handle"
        type="button"
        :class="`crop-overlay__handle crop-overlay__handle--${handle}`"
        :style="handleStyle(handle)"
        @pointerdown="(e: PointerEvent) => onHandlePointerDown(handle, e)"
      />
    </div>
    <div class="crop-overlay__actions">
      <v-btn
        size="small"
        color="primary"
        @click="onApply"
      >
        Apply
      </v-btn>
      <v-btn
        size="small"
        variant="tonal"
        @click="onCancel"
      >
        Cancel
      </v-btn>
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

  &__handle {
    position: absolute;
    width: 0.75rem;
    height: 0.75rem;
    padding: 0;
    background: #fff;
    border: 0.0625rem solid #333;
    border-radius: 50%;
    transform: translate(-50%, -50%);

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

  &__actions {
    position: absolute;
    right: 0.5rem;
    bottom: 0.5rem;
    display: flex;
    gap: 0.5rem;
  }
}
</style>
