// utils
import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
// helpers
import {
  clampAdjustment,
  getAdjustments,
  getCrop,
  getFilter,
  removeOperation,
  upsertOperation,
} from '@/shared/helpers/operations';
import { DocumentError, parseDocument, serializeDocument } from '@/shared/helpers/document';
import { CanvasRenderer } from '@/shared/helpers/canvas-renderer';
import { sha256Hex } from '@/shared/helpers/sha256';
import { fitToAspect, MIN_CROP } from '@/composables/use-crop-rect';
// models
import type { Adjustments, CropOp, EditOperation, FilterName } from '@/shared/models/edit-operation';
import type { SourceMeta } from '@/shared/models/edit-document';
import type { NormRect } from '@/composables/use-crop-rect';

export const useEditorStore = defineStore('editor', () => {
  // refs
  const source = ref<SourceMeta | null>(null);
  const sourceBitmap = ref<ImageBitmap | null>(null);
  const originalBlob = ref<Blob | null>(null);
  const operations = ref<EditOperation[]>([]);
  const viewingOriginal = ref(false);
  const cropEditing = ref(false);
  const cropDraft = ref<NormRect>({ x: 0.1, y: 0.1, width: 0.8, height: 0.8 });
  const cropAspect = ref<number | null>(null);
  const undoStack = ref<EditOperation[][]>([]);
  const redoStack = ref<EditOperation[][]>([]);
  const error = ref<string | null>(null);
  const busy = ref(false);
  // true while a slider drag is in progress, so its ticks coalesce into one undo step
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
  const cropPixelSize = computed<{ width: number; height: number } | null>(() =>
    source.value
      ? {
          width: Math.round(source.value.width * cropDraft.value.width),
          height: Math.round(source.value.height * cropDraft.value.height),
        }
      : null,
  );
  const aspectOptions = computed<{ label: string; value: number | null }[]>(() => {
    if (!source.value) {
      return [{ label: 'Free', value: null }];
    }
    const w = source.value.width;
    const h = source.value.height;
    return [
      { label: 'Free', value: null },
      { label: 'Original', value: 1 },
      { label: '1:1', value: h / w },
      { label: '4:3', value: (4 / 3) * (h / w) },
      { label: '16:9', value: (16 / 9) * (h / w) },
    ];
  });

  // helpers
  function isAdjustOnlyChange(current: EditOperation[], next: EditOperation[]): boolean {
    const currentAdjustments = getAdjustments(current);
    const nextAdjustments = getAdjustments(next);
    const adjustChanged =
      currentAdjustments.brightness !== nextAdjustments.brightness ||
      currentAdjustments.contrast !== nextAdjustments.contrast ||
      currentAdjustments.saturation !== nextAdjustments.saturation;
    const currentCrop = getCrop(current);
    const nextCrop = getCrop(next);
    const sameCrop =
      (currentCrop === null && nextCrop === null) ||
      (currentCrop !== null &&
        nextCrop !== null &&
        currentCrop.x === nextCrop.x &&
        currentCrop.y === nextCrop.y &&
        currentCrop.width === nextCrop.width &&
        currentCrop.height === nextCrop.height);
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

  // display toggle only; must not touch operations or history
  function toggleViewOriginal(): void {
    viewingOriginal.value = !viewingOriginal.value;
  }

  // called when a slider drag ends so the next drag starts a fresh undo step
  function endAdjustGesture(): void {
    lastCommitWasLiveAdjust = false;
  }

  function startCropEditing(): void {
    const existingCrop = getCrop(operations.value);
    cropDraft.value = existingCrop
      ? { x: existingCrop.x, y: existingCrop.y, width: existingCrop.width, height: existingCrop.height }
      : { x: 0.1, y: 0.1, width: 0.8, height: 0.8 };
    cropAspect.value = null;
    cropEditing.value = true;
  }

  function stopCropEditing(): void {
    cropEditing.value = false;
  }

  function setCropDraft(rect: NormRect): void {
    cropDraft.value = rect;
  }

  function setCropAspect(ratio: number | null): void {
    cropAspect.value = ratio;
    if (ratio !== null) {
      cropDraft.value = fitToAspect(cropDraft.value, ratio);
    }
  }

  // sets one crop side from a pixel value, anchored at the top-left corner
  function setCropSize(axis: 'width' | 'height', px: number): void {
    const src = source.value;
    if (!src || !Number.isFinite(px) || px <= 0) {
      return;
    }
    const draft = cropDraft.value;
    const ratio = cropAspect.value;
    let width = draft.width;
    let height = draft.height;
    if (axis === 'width') {
      width = px / src.width;
      if (ratio !== null) {
        height = width / ratio;
      }
    } else {
      height = px / src.height;
      if (ratio !== null) {
        width = height * ratio;
      }
    }
    if (ratio !== null) {
      const fit = Math.min((1 - draft.x) / width, (1 - draft.y) / height, 1);
      width *= fit;
      height *= fit;
      const grow = Math.max(MIN_CROP / width, MIN_CROP / height, 1);
      width *= grow;
      height *= grow;
    } else {
      width = Math.min(1 - draft.x, Math.max(MIN_CROP, width));
      height = Math.min(1 - draft.y, Math.max(MIN_CROP, height));
    }
    cropDraft.value = { x: draft.x, y: draft.y, width, height };
  }

  function applyCrop(): void {
    setCrop(cropDraft.value);
    stopCropEditing();
  }

  function clearError(): void {
    error.value = null;
  }

  function setError(message: string): void {
    error.value = message;
  }

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
  function blobToDataUrl(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = (): void => resolve(reader.result as string);
      reader.onerror = (): void => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  }

  async function loadImage(file: File): Promise<void> {
    if (busy.value) {
      return;
    }
    error.value = null;
    lastCommitWasLiveAdjust = false;
    busy.value = true;
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
      cropEditing.value = false;
    } catch {
      error.value = 'Failed to load image';
    } finally {
      busy.value = false;
    }
  }

  async function importJson(text: string): Promise<void> {
    if (busy.value) {
      return;
    }
    error.value = null;
    lastCommitWasLiveAdjust = false;
    busy.value = true;
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
      operations.value = doc.operations.map((op) =>
        op.type === 'adjust'
          ? {
              ...op,
              brightness: clampAdjustment(op.brightness),
              contrast: clampAdjustment(op.contrast),
              saturation: clampAdjustment(op.saturation),
            }
          : op,
      );
      undoStack.value = [];
      redoStack.value = [];
      viewingOriginal.value = false;
      cropEditing.value = false;
    } catch (e) {
      error.value = e instanceof DocumentError ? e.message : 'Invalid document';
    } finally {
      busy.value = false;
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

  async function exportImageBlob(): Promise<Blob | null> {
    if (!source.value || !sourceBitmap.value) {
      return null;
    }
    busy.value = true;
    try {
      // yield one frame so a busy spinner can paint before the synchronous render blocks the thread
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      const canvas = document.createElement('canvas');
      const blob = await new CanvasRenderer(canvas).toBlob(
        sourceBitmap.value,
        operations.value,
        source.value.mimeType,
      );
      return blob;
    } finally {
      busy.value = false;
    }
  }

  return {
    source,
    sourceBitmap,
    originalBlob,
    operations,
    viewingOriginal,
    cropEditing,
    cropDraft,
    cropAspect,
    error,
    busy,
    effectiveOperations,
    adjustments,
    filter,
    crop,
    hasImage,
    canUndo,
    canRedo,
    cropPixelSize,
    aspectOptions,
    setAdjustment,
    setFilter,
    setCrop,
    clearCrop,
    resetAdjustments,
    resetAll,
    toggleViewOriginal,
    endAdjustGesture,
    startCropEditing,
    stopCropEditing,
    setCropDraft,
    setCropAspect,
    setCropSize,
    applyCrop,
    clearError,
    setError,
    undo,
    redo,
    loadImage,
    importJson,
    exportJson,
    exportImageBlob,
  };
});

export default useEditorStore;
