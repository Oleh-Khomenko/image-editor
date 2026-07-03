<script setup lang="ts">
// stores
import useEditorStore from '@/stores/editor';

// stores
const store = useEditorStore();
</script>

<template>
  <v-card class="crop-panel">
    <v-card-title class="crop-panel__title">
      Crop
    </v-card-title>
    <v-card-text class="crop-panel__actions">
      <v-btn
        variant="tonal"
        block
        prepend-icon="mdi-crop"
        :disabled="!store.hasImage || store.cropEditing"
        @click="store.startCropEditing()"
      >
        Crop
      </v-btn>
      <v-btn
        v-if="store.crop"
        variant="tonal"
        block
        prepend-icon="mdi-crop-free"
        @click="store.clearCrop()"
      >
        Remove crop
      </v-btn>
    </v-card-text>
  </v-card>
</template>

<style scoped lang="scss">
.crop-panel {
  width: 100%;

  &__title {
    font-size: 1rem;
  }

  &__actions {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
}
</style>
