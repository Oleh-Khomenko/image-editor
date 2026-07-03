import { onBeforeUnmount, onMounted, watch } from 'vue';
import type { Ref } from 'vue';
import { createRenderer } from '@/core/render/select-renderer';
import type { Renderer } from '@/core/render/renderer';
import useEditorStore from '@/stores/editor';

export default function useRenderer(canvasRef: Ref<HTMLCanvasElement | null>): void {
  // stores
  const store = useEditorStore();

  // renderer state
  let renderer: Renderer | null = null;
  let renderedBitmap: ImageBitmap | null = null;
  let frame = 0;

  // helpers

  function draw(): void {
    const canvas = canvasRef.value;
    const bitmap = store.sourceBitmap;
    if (!canvas || !bitmap) {
      return;
    }
    if (!renderer || bitmap !== renderedBitmap) {
      renderer?.dispose();
      renderer = createRenderer(canvas, { width: bitmap.width, height: bitmap.height });
      renderedBitmap = bitmap;
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
    renderer?.dispose();
    renderer = null;
  });
}
