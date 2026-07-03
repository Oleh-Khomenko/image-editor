<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { useTemplateRef } from 'vue';
import useEditorStore from '@/stores/editor';
import { createRenderer } from '@/core/render/select-renderer';
import { download, downloadText, exportFilename } from '@/core/util/download';

// stores
const store = useEditorStore();
const { viewingOriginal, canUndo, canRedo, hasImage, error } = storeToRefs(store);

// template refs
const fileInputRef = useTemplateRef<HTMLInputElement>('fileInput');

// helpers

// mime types the renderer can produce; anything else falls back to png
function extFromMime(mime: string): string {
  if (mime === 'image/jpeg') {
    return 'jpg';
  }
  if (mime === 'image/webp') {
    return 'webp';
  }
  if (mime === 'image/png') {
    return 'png';
  }
  return 'png';
}

// handlers

function onViewOriginal(): void {
  store.toggleViewOriginal();
}

function onUndo(): void {
  store.undo();
}

function onRedo(): void {
  store.redo();
}

function onReset(): void {
  store.resetAll();
}

// exports the real edits (store.operations), never the view-original preview
async function onExportImage(): Promise<void> {
  const source = store.source;
  const sourceBitmap = store.sourceBitmap;
  if (!source || !sourceBitmap) {
    return;
  }
  const canvas = document.createElement('canvas');
  const renderer = createRenderer(canvas, { width: source.width, height: source.height });
  const blob = await renderer.toBlob(sourceBitmap, store.operations, source.mimeType);
  renderer.dispose();
  download(blob, exportFilename(source.name, '-edited', extFromMime(source.mimeType)));
}

async function onExportJson(embed: boolean): Promise<void> {
  const source = store.source;
  if (!source) {
    return;
  }
  const json = await store.exportJson(embed);
  downloadText(json, exportFilename(source.name, '-edits', 'json'), 'application/json');
}

function onImportClick(): void {
  fileInputRef.value?.click();
}

async function onFileChange(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) {
    return;
  }
  await store.importJson(await file.text());
  // reset so re-selecting the same file still fires a change event
  input.value = '';
}
</script>

<template>
  <v-card class="actions-panel">
    <v-card-title class="actions-panel__title">
      Actions
    </v-card-title>
    <v-card-text class="actions-panel__actions">
      <v-btn
        variant="tonal"
        block
        :color="viewingOriginal ? 'primary' : undefined"
        :disabled="!hasImage"
        @click="onViewOriginal"
      >
        View original
      </v-btn>
      <div class="actions-panel__row">
        <v-btn
          variant="tonal"
          :disabled="!canUndo"
          @click="onUndo"
        >
          Undo
        </v-btn>
        <v-btn
          variant="tonal"
          :disabled="!canRedo"
          @click="onRedo"
        >
          Redo
        </v-btn>
      </div>
      <v-btn
        variant="tonal"
        block
        :disabled="!hasImage"
        @click="onReset"
      >
        Reset
      </v-btn>
      <v-btn
        variant="tonal"
        block
        :disabled="!hasImage"
        @click="onExportImage"
      >
        Export image
      </v-btn>
      <v-menu>
        <template #activator="{ props }">
          <v-btn
            variant="tonal"
            block
            :disabled="!hasImage"
            v-bind="props"
          >
            Export JSON
          </v-btn>
        </template>
        <v-list>
          <v-list-item
            title="Operations only"
            @click="onExportJson(false)"
          />
          <v-list-item
            title="With image"
            @click="onExportJson(true)"
          />
        </v-list>
      </v-menu>
      <v-btn
        variant="tonal"
        block
        @click="onImportClick"
      >
        Import JSON
      </v-btn>
      <input
        ref="fileInput"
        class="actions-panel__file-input"
        type="file"
        accept="application/json,.json"
        @change="onFileChange"
      >
      <v-alert
        v-if="error"
        class="actions-panel__error"
        type="error"
        density="compact"
        variant="tonal"
      >
        {{ error }}
      </v-alert>
    </v-card-text>
  </v-card>
</template>

<style scoped lang="scss">
.actions-panel {
  width: 100%;

  &__title {
    font-size: 1rem;
  }

  &__actions {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  &__row {
    display: flex;
    gap: 0.5rem;

    .v-btn {
      flex: 1 1 0;
    }
  }

  &__file-input {
    display: none;
  }

  &__error {
    margin-top: 0.5rem;
  }
}
</style>
