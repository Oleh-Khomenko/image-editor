import { beforeEach, describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useEditorStore } from '@/stores/editor';

describe('editor store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('sets an adjustment and tracks undo history', () => {
    const store = useEditorStore();
    store.setAdjustment({ brightness: 20 });
    expect(store.adjustments.brightness).toBe(20);
    expect(store.canUndo).toBe(true);
  });

  it('undoes and redoes an adjustment', () => {
    const store = useEditorStore();
    store.setAdjustment({ brightness: 20 });

    store.undo();
    expect(store.operations).toEqual([]);
    expect(store.adjustments.brightness).toBe(0);
    expect(store.canRedo).toBe(true);

    store.redo();
    expect(store.adjustments.brightness).toBe(20);
  });

  it('resets all operations, clearing the filter', () => {
    const store = useEditorStore();
    store.setFilter('sepia');
    store.resetAll();
    expect(store.operations.length).toBe(0);
    expect(store.filter).toBeNull();
  });

  it('toggles view-original without destroying edits', () => {
    const store = useEditorStore();
    store.setAdjustment({ brightness: 20 });

    store.toggleViewOriginal();

    expect(store.viewingOriginal).toBe(true);
    expect(store.effectiveOperations).toEqual([]);
    expect(store.operations.length).toBe(1);
  });

  it('sets and clears a crop', () => {
    const store = useEditorStore();
    store.setCrop({ x: 0, y: 0, width: 0.5, height: 0.5 });
    expect(store.crop).toEqual({ type: 'crop', x: 0, y: 0, width: 0.5, height: 0.5 });

    store.clearCrop();
    expect(store.crop).toBeNull();
  });

  it('coalesces a slider drag into a single undo step', () => {
    const store = useEditorStore();
    store.setAdjustment({ brightness: 10 });
    store.setAdjustment({ brightness: 20 });
    store.setAdjustment({ brightness: 30 });

    expect(store.canUndo).toBe(true);

    store.undo();
    expect(store.adjustments.brightness).toBe(0);
  });

  it('keeps a filter change and an adjustment as separate undo steps', () => {
    const store = useEditorStore();
    store.setFilter('sepia');
    store.setAdjustment({ brightness: 10 });

    store.undo();
    expect(store.adjustments.brightness).toBe(0);
    expect(store.filter).toBe('sepia');

    store.undo();
    expect(store.filter).toBeNull();
  });

  it('keeps resetAdjustments after a drag as its own undo step', () => {
    const store = useEditorStore();
    store.setCrop({ x: 0, y: 0, width: 0.5, height: 0.5 });
    store.setAdjustment({ brightness: 10 });
    store.setAdjustment({ brightness: 20 });
    store.setAdjustment({ brightness: 30 });
    store.resetAdjustments();

    expect(store.adjustments.brightness).toBe(0);

    store.undo();
    expect(store.adjustments.brightness).toBe(30);

    store.undo();
    expect(store.adjustments.brightness).toBe(0);
  });

  it('edits crop against the uncropped image without touching history', () => {
    const store = useEditorStore();
    store.setAdjustment({ brightness: 10 });
    store.setCrop({ x: 0, y: 0, width: 0.5, height: 0.5 });

    store.cropEditing = true;

    expect(store.effectiveOperations.some((op) => op.type === 'crop')).toBe(false);
    expect(store.effectiveOperations.some((op) => op.type === 'adjust')).toBe(true);
    expect(store.operations.some((op) => op.type === 'crop')).toBe(true);
  });

  it('endAdjustGesture separates drags into distinct undo steps', () => {
    const store = useEditorStore();
    store.setAdjustment({ brightness: 10 });
    store.setAdjustment({ brightness: 20 });

    store.endAdjustGesture();

    store.setAdjustment({ contrast: 30 });

    expect(store.adjustments.brightness).toBe(20);
    expect(store.adjustments.contrast).toBe(30);

    store.undo();
    expect(store.adjustments.contrast).toBe(0);
    expect(store.adjustments.brightness).toBe(20);

    store.undo();
    expect(store.adjustments.brightness).toBe(0);
  });

  it('importJson applies operations-only doc against matching source and clamps adjustments', async () => {
    const store = useEditorStore();
    store.source = { name: 'a.png', mimeType: 'image/png', width: 10, height: 10, sha256: 'abc' };

    await store.importJson(
      JSON.stringify({
        version: 1,
        source: { name: 'a.png', mimeType: 'image/png', width: 10, height: 10, sha256: 'abc' },
        operations: [{ type: 'adjust', brightness: 500, contrast: -999, saturation: 0 }],
      }),
    );

    expect(store.error).toBeNull();
    expect(store.adjustments.brightness).toBe(100);
    expect(store.adjustments.contrast).toBe(-100);
  });

  it('importJson rejects a document whose source sha does not match the loaded image', async () => {
    const store = useEditorStore();
    store.source = { name: 'a.png', mimeType: 'image/png', width: 10, height: 10, sha256: 'abc' };

    await store.importJson(
      JSON.stringify({
        version: 1,
        source: { name: 'a.png', mimeType: 'image/png', width: 10, height: 10, sha256: 'zzz' },
        operations: [{ type: 'filter', name: 'sepia' }],
      }),
    );

    expect(store.error).toBe('Document does not match the loaded image');
    expect(store.operations).toEqual([]);
  });

  it('importJson surfaces the DocumentError message for invalid JSON', async () => {
    const store = useEditorStore();

    await store.importJson('{ not json');

    expect(typeof store.error).toBe('string');
    expect(store.error).not.toBeNull();
  });

  it('importJson rejects an out-of-range crop operation', async () => {
    const store = useEditorStore();
    store.source = { name: 'a.png', mimeType: 'image/png', width: 10, height: 10, sha256: 'abc' };

    await store.importJson(
      JSON.stringify({
        version: 1,
        source: { name: 'a.png', mimeType: 'image/png', width: 10, height: 10, sha256: 'abc' },
        operations: [{ type: 'crop', x: 0, y: 0, width: 2, height: 1 }],
      }),
    );

    expect(store.error).not.toBeNull();
    expect(store.operations).toEqual([]);
  });

  it('exportJson round-trips operations-only without an embedded image', async () => {
    const store = useEditorStore();
    store.source = { name: 'a.png', mimeType: 'image/png', width: 10, height: 10, sha256: 'abc' };
    store.operations = [{ type: 'filter', name: 'sepia' }];

    const json = await store.exportJson(false);
    const doc = JSON.parse(json);

    expect(doc.version).toBe(1);
    expect(doc.operations).toEqual([{ type: 'filter', name: 'sepia' }]);
    expect(doc.embedded).toBeUndefined();
  });

  it('importJson is a no-op while busy', async () => {
    const store = useEditorStore();
    store.busy = true;

    await store.importJson('{}');

    expect(store.error).toBeNull();

    store.busy = false;
  });

  it('sets a crop side from a pixel value anchored at the top-left', () => {
    const store = useEditorStore();
    store.source = { name: 'a.png', mimeType: 'image/png', width: 1000, height: 500, sha256: 'x' };
    store.startCropEditing();

    store.setCropSize('width', 400);

    expect(store.cropDraft.x).toBe(0.1);
    expect(store.cropDraft.y).toBe(0.1);
    expect(store.cropPixelSize?.width).toBe(400);
  });

  it('keeps the locked aspect when setting one crop side', () => {
    const store = useEditorStore();
    store.source = { name: 'a.png', mimeType: 'image/png', width: 1000, height: 1000, sha256: 'x' };
    store.startCropEditing();
    store.setCropAspect(1);

    store.setCropSize('width', 300);

    expect(store.cropPixelSize?.width).toBe(300);
    expect(store.cropPixelSize?.height).toBe(300);
  });
});
