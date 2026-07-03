<script setup lang="ts">
// utils
import { defineAsyncComponent, onMounted } from 'vue';
import { storeToRefs } from 'pinia';
// components
import UploadCard from '@/components/UploadCard.vue';
// composables
import useUnsavedGuard from '@/composables/use-unsaved-guard';
// stores
import useEditorStore from '@/stores/editor';
// helpers
import { loadEditor } from '@/editor-loader';

// custom constants
const EditorLayout = defineAsyncComponent(loadEditor);

// stores
const store = useEditorStore();
const { hasImage, error } = storeToRefs(store);

// composables
useUnsavedGuard(() => hasImage.value);

// helpers
function onSnackbar(value: boolean): void {
  if (!value) {
    store.clearError();
  }
}

// lifecycle
onMounted(() => {
  const idle = window.requestIdleCallback;
  if (idle) {
    idle(() => void loadEditor());
    return;
  }
  window.setTimeout(() => void loadEditor(), 200);
});
</script>

<template>
  <v-app>
    <EditorLayout v-if="hasImage" />
    <UploadCard v-else />
    <v-snackbar
      :model-value="error !== null"
      color="error"
      timeout="4000"
      @update:model-value="onSnackbar"
    >
      {{ error }}
    </v-snackbar>
  </v-app>
</template>
