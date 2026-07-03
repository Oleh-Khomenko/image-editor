<script setup lang="ts">
import { useTemplateRef } from 'vue';
import useRenderer from '@/composables/use-renderer';

// template refs
const canvasRef = useTemplateRef<HTMLCanvasElement>('canvas');

useRenderer(canvasRef);

// CropOverlay needs the live canvas element to measure its letterboxed
// rendered box, so it can position itself pixel-for-pixel over it.
defineExpose({ getCanvas: (): HTMLCanvasElement | null => canvasRef.value });
</script>

<template>
  <div class="editor-canvas">
    <canvas
      ref="canvas"
      class="editor-canvas__surface"
    />
    <slot name="overlay" />
  </div>
</template>

<style scoped lang="scss">
.editor-canvas {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  min-height: 20rem;
  background-color: #121212;
  overflow: hidden;

  &__surface {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
  }
}
</style>
