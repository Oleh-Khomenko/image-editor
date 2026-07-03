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
});
