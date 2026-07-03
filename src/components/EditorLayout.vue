<script setup lang="ts">
// utils
import { useTemplateRef } from 'vue';
// components
import AdjustmentsPanel from '@/components/AdjustmentsPanel.vue';
import CropOverlay from '@/components/CropOverlay.vue';
import CropPanel from '@/components/CropPanel.vue';
import EditorCanvas from '@/components/EditorCanvas.vue';
import EditorToolbar from '@/components/EditorToolbar.vue';
import FilterPanel from '@/components/FilterPanel.vue';
// stores
import useEditorStore from '@/stores/editor';
// models
import type { NormRect } from '@/composables/use-crop-rect';

// stores
const store = useEditorStore();

// template refs
const editorCanvasRef = useTemplateRef<InstanceType<typeof EditorCanvas>>('editorCanvas');

// helpers
function getCanvas(): HTMLCanvasElement | null {
  return editorCanvasRef.value?.getCanvas() ?? null;
}

function onApply(rect: NormRect): void {
  store.setCrop(rect);
  store.cropEditing = false;
}

function onCancel(): void {
  store.cropEditing = false;
}
</script>

<template>
  <div class="editor-layout">
    <EditorToolbar />
    <div class="editor-layout__body">
      <main class="editor-layout__stage">
        <EditorCanvas ref="editorCanvas">
          <template #overlay>
            <CropOverlay
              v-if="store.cropEditing"
              :get-canvas="getCanvas"
              @apply="onApply"
              @cancel="onCancel"
            />
          </template>
        </EditorCanvas>
      </main>
      <aside class="editor-layout__panels">
        <AdjustmentsPanel />
        <FilterPanel />
        <CropPanel />
      </aside>
    </div>
  </div>
</template>

<style scoped lang="scss">
.editor-layout {
  display: flex;
  flex-direction: column;
  height: 100vh;

  &__body {
    display: flex;
    flex: 1 1 auto;
    flex-direction: column;
    // lets the panels scroll internally instead of growing the page
    min-height: 0;

    @media (min-width: 60rem) {
      flex-direction: row;
    }
  }

  &__stage {
    flex: 1 1 auto;
    min-width: 0;
    min-height: 20rem;
  }

  &__panels {
    display: flex;
    flex: 0 0 auto;
    flex-direction: column;
    gap: 1rem;
    width: 100%;
    padding: 1rem;
    overflow-y: auto;

    @media (min-width: 60rem) {
      width: 20rem;
    }
  }
}
</style>
