import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import type { Adjustments, CropOp, EditOperation, FilterName } from '@/core/operations/types';
import {
  clampAdjustment,
  getAdjustments,
  getCrop,
  getFilter,
  removeOperation,
  upsertOperation,
} from '@/core/operations/model';
import type { SourceMeta } from '@/core/document/document';
import { parseDocument, serializeDocument } from '@/core/document/document';
import { sha256Hex } from '@/core/util/sha256';

export const useEditorStore = defineStore('editor', () => {
  // refs
  const source = ref<SourceMeta | null>(null);
  const sourceBitmap = ref<ImageBitmap | null>(null);
  const originalBlob = ref<Blob | null>(null);
  const operations = ref<EditOperation[]>([]);
  const viewingOriginal = ref(false);
  const cropEditing = ref(false);
  const undoStack = ref<EditOperation[][]>([]);
  const redoStack = ref<EditOperation[][]>([]);
  const error = ref<string | null>(null);

  // tracks whether the last commit was a continuous slider tick, so consecutive
  // setAdjustment ticks coalesce into a single undo step instead of one per tick
  let lastCommitWasLiveAdjust = false;

  // computed
  const effectiveOperations = computed<EditOperation[]>(() => {
    if (viewingOriginal.value) {
      return [];
    }
    if (cropEditing.value) {
      return removeOperation(operations.value, 'crop');
    }
    return operations.value;
  });
  const adjustments = computed<Adjustments>(() => getAdjustments(operations.value));
  const filter = computed<FilterName | null>(() => getFilter(operations.value));
  const crop = computed<CropOp | null>(() => getCrop(operations.value));
  const hasImage = computed<boolean>(() => sourceBitmap.value !== null);
  const canUndo = computed<boolean>(() => undoStack.value.length > 0);
  const canRedo = computed<boolean>(() => redoStack.value.length > 0);

  // helpers

  function isAdjustOnlyChange(current: EditOperation[], next: EditOperation[]): boolean {
    const adjustChanged =
      JSON.stringify(getAdjustments(current)) !== JSON.stringify(getAdjustments(next));
    const sameCrop = JSON.stringify(getCrop(current)) === JSON.stringify(getCrop(next));
    const sameFilter = getFilter(current) === getFilter(next);
    return adjustChanged && sameCrop && sameFilter;
  }

  // every mutation goes through commit so undo/redo stay consistent
  function commit(next: EditOperation[], liveAdjust = false): void {
    const current = operations.value;
    const canCoalesce =
      liveAdjust && lastCommitWasLiveAdjust && isAdjustOnlyChange(current, next);
    if (!canCoalesce) {
      undoStack.value.push([...current]);
    }
    redoStack.value = [];
    operations.value = next;
    lastCommitWasLiveAdjust = liveAdjust;
  }

  function setAdjustment(partial: Partial<Adjustments>): void {
    const current = adjustments.value;
    const merged: Adjustments = {
      brightness: clampAdjustment(partial.brightness ?? current.brightness),
      contrast: clampAdjustment(partial.contrast ?? current.contrast),
      saturation: clampAdjustment(partial.saturation ?? current.saturation),
    };
    commit(upsertOperation(operations.value, { type: 'adjust', ...merged }), true);
  }

  function setFilter(name: FilterName | null): void {
    if (name === null) {
      commit(removeOperation(operations.value, 'filter'));
      return;
    }
    commit(upsertOperation(operations.value, { type: 'filter', name }));
  }

  function setCrop(rect: { x: number; y: number; width: number; height: number }): void {
    commit(upsertOperation(operations.value, { type: 'crop', ...rect }));
  }

  function clearCrop(): void {
    commit(removeOperation(operations.value, 'crop'));
  }

  function resetAdjustments(): void {
    commit(removeOperation(operations.value, 'adjust'));
  }

  function resetAll(): void {
    commit([]);
  }

  // view-original is a display toggle only; it must not touch history
  function toggleViewOriginal(): void {
    viewingOriginal.value = !viewingOriginal.value;
  }

  // undo/redo move snapshots between stacks directly, bypassing commit
  function undo(): void {
    lastCommitWasLiveAdjust = false;
    if (!canUndo.value) {
      return;
    }
    redoStack.value.push([...operations.value]);
    operations.value = undoStack.value.pop() ?? [];
  }

  function redo(): void {
    lastCommitWasLiveAdjust = false;
    if (!canRedo.value) {
      return;
    }
    undoStack.value.push([...operations.value]);
    operations.value = redoStack.value.pop() ?? [];
  }

  // async helpers

  // FileReader's data-URL read has no promise-based API
  async function blobToDataUrl(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = (): void => resolve(reader.result as string);
      reader.onerror = (): void => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  }

  async function loadImage(file: File): Promise<void> {
    error.value = null;
    lastCommitWasLiveAdjust = false;
    try {
      const buf = await file.arrayBuffer();
      const hash = await sha256Hex(buf);
      const bitmap = await createImageBitmap(file);
      sourceBitmap.value?.close();
      sourceBitmap.value = bitmap;
      originalBlob.value = file;
      source.value = {
        name: file.name,
        mimeType: file.type,
        width: bitmap.width,
        height: bitmap.height,
        sha256: hash,
      };
      operations.value = [];
      undoStack.value = [];
      redoStack.value = [];
      viewingOriginal.value = false;
    } catch {
      error.value = 'Failed to load image';
    }
  }

  async function importJson(text: string): Promise<void> {
    error.value = null;
    lastCommitWasLiveAdjust = false;
    try {
      const doc = parseDocument(text);
      if (doc.embedded) {
        const blob = await (await fetch(doc.embedded)).blob();
        const bitmap = await createImageBitmap(blob);
        sourceBitmap.value?.close();
        sourceBitmap.value = bitmap;
        originalBlob.value = blob;
        source.value = doc.source;
      } else if (!source.value || source.value.sha256 !== doc.source.sha256) {
        error.value = 'Document does not match the loaded image';
        return;
      }
      operations.value = doc.operations;
      undoStack.value = [];
      redoStack.value = [];
      viewingOriginal.value = false;
    } catch {
      error.value = 'Invalid document';
    }
  }

  async function exportJson(embed: boolean): Promise<string> {
    if (!source.value) {
      throw new Error('No image loaded');
    }
    const opts: { embedded?: string } = {};
    if (embed && originalBlob.value) {
      opts.embedded = await blobToDataUrl(originalBlob.value);
    }
    return serializeDocument(source.value, operations.value, opts);
  }

  return {
    source,
    sourceBitmap,
    originalBlob,
    operations,
    viewingOriginal,
    cropEditing,
    undoStack,
    redoStack,
    error,
    effectiveOperations,
    adjustments,
    filter,
    crop,
    hasImage,
    canUndo,
    canRedo,
    setAdjustment,
    setFilter,
    setCrop,
    clearCrop,
    resetAdjustments,
    resetAll,
    toggleViewOriginal,
    undo,
    redo,
    loadImage,
    importJson,
    exportJson,
  };
});

export default useEditorStore;
