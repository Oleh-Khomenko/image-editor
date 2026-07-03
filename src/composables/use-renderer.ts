import { onBeforeUnmount, onMounted, watch } from 'vue';
import type { Ref } from 'vue';
import { CanvasRenderer } from '@/core/render/canvas-renderer';
import useEditorStore from '@/stores/editor';

export default function useRenderer(canvasRef: Ref<HTMLCanvasElement | null>): void {
  // stores
  const store = useEditorStore();

  // renderer state
  let renderer: CanvasRenderer | null = null;
  let frame = 0;

  // helpers

  function draw(): void {
    const canvas = canvasRef.value;
    const bitmap = store.sourceBitmap;
    if (!canvas || !bitmap) {
      return;
    }
    // the renderer is bound to the canvas element, not the image, so one
    // instance serves every source for this component's lifetime
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
