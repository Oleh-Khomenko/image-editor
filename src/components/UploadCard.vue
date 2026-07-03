<script setup lang="ts">
// utils
import { ref } from 'vue';
// stores
import useEditorStore from '@/stores/editor';

// stores
const store = useEditorStore();

// refs / state
const isDragging = ref(false);

// template refs
const fileInputRef = ref<HTMLInputElement | null>(null);

// helpers
function acceptFile(file: File | undefined): void {
  if (!file || !file.type.startsWith('image/')) {
    return;
  }
  void store.loadImage(file);
}

function openFileDialog(): void {
  fileInputRef.value?.click();
}

function handleFileInput(event: Event): void {
  const target = event.target as HTMLInputElement;
  acceptFile(target.files?.[0]);
  target.value = '';
}

function handleDragOver(): void {
  isDragging.value = true;
}

function handleDragLeave(): void {
  isDragging.value = false;
}

function handleDrop(event: DragEvent): void {
  isDragging.value = false;
  acceptFile(event.dataTransfer?.files?.[0]);
}
</script>

<template>
  <div class="upload-card">
    <v-card
      class="upload-card__drop-zone"
      :class="{ 'upload-card__drop-zone--active': isDragging }"
      max-width="30rem"
      width="100%"
      @dragover.prevent="handleDragOver"
      @dragleave.prevent="handleDragLeave"
      @drop.prevent="handleDrop"
    >
      <v-card-title>Upload an image</v-card-title>
      <v-card-text>
        <p class="upload-card__hint">
          Drag and drop an image here, or choose a file.
        </p>
        <v-btn
          color="primary"
          block
          @click="openFileDialog"
        >
          Choose image
        </v-btn>
        <input
          ref="fileInputRef"
          type="file"
          accept="image/*"
          class="upload-card__input"
          @change="handleFileInput"
        >
        <v-alert
          v-if="store.error"
          type="error"
          class="upload-card__alert"
          density="compact"
        >
          {{ store.error }}
        </v-alert>
      </v-card-text>
    </v-card>
  </div>
</template>

<style scoped lang="scss">
.upload-card {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  padding: 1rem;

  &__drop-zone {
    border: 0.125rem dashed rgba(255, 255, 255, 0.3);
    transition: border-color 0.15s ease-in-out;

    &--active {
      border-color: rgb(var(--v-theme-primary));
    }
  }

  &__hint {
    margin-bottom: 1rem;
    opacity: 0.7;
  }

  &__input {
    display: none;
  }

  &__alert {
    margin-top: 1rem;
  }
}
</style>
