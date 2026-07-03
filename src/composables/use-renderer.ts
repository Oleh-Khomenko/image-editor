// utils
import { onBeforeUnmount, onMounted, watch } from 'vue';
import type { Ref } from 'vue';
// stores
import useEditorStore from '@/stores/editor';
// helpers
import { CanvasRenderer } from '@/shared/helpers/canvas-renderer';

export default function useRenderer(canvasRef: Ref<HTMLCanvasElement | null>): void {
  // stores
  const store = useEditorStore();

  // state
  let renderer: CanvasRenderer | null = null;
  let frame = 0;

  // helpers
  function draw(): void {
    const canvas = canvasRef.value;
    const bitmap = store.sourceBitmap;
    if (!canvas || !bitmap) {
      return;
    }
    // one renderer serves every source; it is bound to the canvas, not the image
    if (!renderer) {
      renderer = new CanvasRenderer(canvas);
    }
    renderer.render(bitmap, store.effectiveOperations);
  }

  function schedule(): void {
    if (frame) {
      return;
    }
    frame = requestAnimationFrame(() => {
      frame = 0;
      draw();
    });
  }

  // lifecycle
  onMounted(() => {
    schedule();
  });

  watch([() => store.sourceBitmap, () => store.effectiveOperations], schedule, {
    immediate: false,
  });

  onBeforeUnmount(() => {
    if (frame) {
      cancelAnimationFrame(frame);
      frame = 0;
    }
  });
}
