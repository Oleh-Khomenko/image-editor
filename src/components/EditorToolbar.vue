<script setup lang="ts">
// utils
import { computed, useTemplateRef } from 'vue';
import { storeToRefs } from 'pinia';
// stores
import useEditorStore from '@/stores/editor';
// helpers
import { download, downloadText, exportFilename } from '@/shared/helpers/download';
import { formatBytes } from '@/shared/helpers/format-bytes';

// stores
const store = useEditorStore();
const { source, originalBlob, canUndo, canRedo, viewingOriginal, busy } = storeToRefs(store);

// template refs
const jsonInputRef = useTemplateRef<HTMLInputElement>('jsonInput');
const imageInputRef = useTemplateRef<HTMLInputElement>('imageInput');

// computed
const imageInfo = computed<string>(() => {
  if (!source.value) {
    return '';
  }
  const { width, height, mimeType } = source.value;
  const format = mimeType.split('/')[1]?.toUpperCase() ?? '';
  return `${width}×${height} · ${format} · ${formatBytes(originalBlob.value?.size ?? 0)}`;
});

// helpers
function extFromMime(mime: string): string {
  const exts: Record<string, string> = { 'image/jpeg': 'jpg', 'image/webp': 'webp' };
  return exts[mime] ?? 'png';
}

async function onExportImage(): Promise<void> {
  const blob = await store.exportImageBlob();
  const src = source.value;
  if (blob && src) {
    download(blob, exportFilename(src.name, '-edited', extFromMime(src.mimeType)));
  }
}

async function onExportJson(embed: boolean): Promise<void> {
  const src = source.value;
  if (!src) {
    return;
  }
  const json = await store.exportJson(embed);
  downloadText(json, exportFilename(src.name, '-edits', 'json'), 'application/json');
}

async function onJsonChange(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (file) {
    await store.importJson(await file.text());
  }
}

async function onImageChange(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (file) {
    await store.loadImage(file);
  }
}
</script>

<template>
  <v-toolbar
    density="comfortable"
    color="surface"
    class="editor-toolbar"
  >
    <v-toolbar-title class="editor-toolbar__title">
      {{ source?.name ?? 'Image editor' }}
    </v-toolbar-title>
    <span class="editor-toolbar__info">{{ imageInfo }}</span>

    <v-spacer />

    <v-tooltip
      text="Undo"
      location="bottom"
    >
      <template #activator="{ props }">
        <v-btn
          v-bind="props"
          icon="mdi-undo"
          variant="text"
          aria-label="Undo"
          :disabled="!canUndo"
          @click="store.undo()"
        />
      </template>
    </v-tooltip>
    <v-tooltip
      text="Redo"
      location="bottom"
    >
      <template #activator="{ props }">
        <v-btn
          v-bind="props"
          icon="mdi-redo"
          variant="text"
          aria-label="Redo"
          :disabled="!canRedo"
          @click="store.redo()"
        />
      </template>
    </v-tooltip>
    <v-tooltip
      text="Toggle original / edited"
      location="bottom"
    >
      <template #activator="{ props }">
        <v-btn
          v-bind="props"
          icon="mdi-eye-outline"
          variant="text"
          aria-label="Toggle original / edited"
          :aria-pressed="viewingOriginal"
          :color="viewingOriginal ? 'primary' : undefined"
          @click="store.toggleViewOriginal()"
        />
      </template>
    </v-tooltip>
    <v-tooltip
      text="Reset all edits"
      location="bottom"
    >
      <template #activator="{ props }">
        <v-btn
          v-bind="props"
          icon="mdi-restore"
          variant="text"
          aria-label="Reset all edits"
          @click="store.resetAll()"
        />
      </template>
    </v-tooltip>

    <v-divider
      vertical
      class="editor-toolbar__divider"
    />

    <v-btn
      color="primary"
      variant="flat"
      prepend-icon="mdi-download"
      :loading="busy"
      class="editor-toolbar__export"
      @click="onExportImage"
    >
      Export
    </v-btn>
    <v-menu>
      <template #activator="{ props }">
        <v-btn
          v-bind="props"
          icon="mdi-dots-vertical"
          variant="text"
          aria-label="More actions"
        />
      </template>
      <v-list density="compact">
        <v-list-item
          title="New image"
          prepend-icon="mdi-image-plus"
          :disabled="store.busy || store.cropEditing"
          @click="imageInputRef?.click()"
        />
        <v-divider />
        <v-list-item
          title="Export edits (JSON)"
          prepend-icon="mdi-code-json"
          @click="onExportJson(false)"
        />
        <v-list-item
          title="Export edits with image"
          prepend-icon="mdi-file-image"
          @click="onExportJson(true)"
        />
        <v-list-item
          title="Import edits (JSON)"
          prepend-icon="mdi-import"
          :disabled="store.busy || store.cropEditing"
          @click="jsonInputRef?.click()"
        />
      </v-list>
    </v-menu>

    <input
      ref="jsonInput"
      class="editor-toolbar__file"
      type="file"
      accept="application/json,.json"
      @change="onJsonChange"
    >
    <input
      ref="imageInput"
      class="editor-toolbar__file"
      type="file"
      accept="image/*"
      @change="onImageChange"
    >
  </v-toolbar>
</template>

<style scoped lang="scss">
.editor-toolbar {
  flex: 0 0 auto;

  &__title {
    flex: 0 1 auto;
    max-width: 16rem;
  }

  &__info {
    margin-left: 0.75rem;
    color: rgb(var(--v-theme-on-surface));
    font-size: 0.8125rem;
    opacity: 0.6;
    white-space: nowrap;
  }

  &__divider {
    margin: 0 0.25rem;
  }

  &__export {
    margin-right: 0.25rem;
  }

  &__file {
    display: none;
  }
}
</style>
