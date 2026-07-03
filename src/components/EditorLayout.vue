<script setup lang="ts">
import { ref, useTemplateRef } from 'vue';
import ActionsPanel from '@/components/ActionsPanel.vue';
import AdjustmentsPanel from '@/components/AdjustmentsPanel.vue';
import CropOverlay from '@/components/CropOverlay.vue';
import EditorCanvas from '@/components/EditorCanvas.vue';
import FilterPanel from '@/components/FilterPanel.vue';
import useEditorStore from '@/stores/editor';
import type { NormRect } from '@/composables/use-crop-rect';

// stores
const store = useEditorStore();

// template refs
const editorCanvasRef = useTemplateRef<InstanceType<typeof EditorCanvas>>('editorCanvas');

// state

// starts false so uploading an image never drops the user straight into
// crop mode; it only opens when the Crop button is pressed
const cropEditing = ref(false);

// helpers

function getCanvas(): HTMLCanvasElement | null {
  return editorCanvasRef.value?.getCanvas() ?? null;
}

function onApply(rect: NormRect): void {
  store.setCrop(rect);
  cropEditing.value = false;
}

function onCancel(): void {
  cropEditing.value = false;
}
</script>

<template>
  <div class="editor-layout">
    <div class="editor-layout__stage">
      <EditorCanvas ref="editorCanvas">
        <template #overlay>
          <CropOverlay
            v-if="cropEditing"
            :get-canvas="getCanvas"
            @apply="onApply"
            @cancel="onCancel"
          />
        </template>
      </EditorCanvas>
    </div>
    <aside class="editor-layout__panels">
      <AdjustmentsPanel />
      <FilterPanel />
      <v-card class="editor-layout__crop-card">
        <v-card-title class="editor-layout__crop-title">
          Crop
        </v-card-title>
        <v-card-text class="editor-layout__crop-actions">
          <v-btn
            variant="tonal"
            block
            :disabled="!store.hasImage || cropEditing"
            @click="cropEditing = true"
          >
            Crop
          </v-btn>
          <v-btn
            v-if="store.crop"
            variant="tonal"
            block
            @click="store.clearCrop()"
          >
            Remove crop
          </v-btn>
        </v-card-text>
      </v-card>
      <ActionsPanel />
    </aside>
  </div>
</template>

<style scoped lang="scss">
.editor-layout {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;

  @media (min-width: 60rem) {
    flex-direction: row;
  }

  &__stage {
    flex: 1 1 auto;
    min-height: 20rem;
    min-width: 0;
  }

  &__panels {
    display: flex;
    flex: 0 0 auto;
    flex-direction: column;
    gap: 1rem;
    width: 100%;
    padding: 1rem;

    @media (min-width: 60rem) {
      width: 20rem;
    }
  }

  &__crop-title {
    font-size: 1rem;
  }

  &__crop-actions {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
}
</style>
