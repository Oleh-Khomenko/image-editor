<script setup lang="ts">
// utils
import { storeToRefs } from 'pinia';
// components
import EditorLayout from '@/components/EditorLayout.vue';
import UploadCard from '@/components/UploadCard.vue';
// composables
import useUnsavedGuard from '@/composables/use-unsaved-guard';
// stores
import useEditorStore from '@/stores/editor';

// stores
const store = useEditorStore();
const { hasImage, error } = storeToRefs(store);

// composables
useUnsavedGuard(() => hasImage.value);

// helpers
function onSnackbar(value: boolean): void {
  if (!value) {
    store.error = null;
  }
}
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
