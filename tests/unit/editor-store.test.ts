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
});
