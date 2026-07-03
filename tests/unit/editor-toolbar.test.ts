import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import EditorToolbar from '@/components/EditorToolbar.vue';
import useEditorStore from '@/stores/editor';
import { vuetifyGlobal } from '../helpers/vuetify';

describe('EditorToolbar', () => {
  it('disables Undo/Redo when there is no history', () => {
    const wrapper = mount(EditorToolbar, { global: vuetifyGlobal() });

    const undoBtn = wrapper.find('[aria-label="Undo"]');
    const redoBtn = wrapper.find('[aria-label="Redo"]');

    expect(undoBtn.attributes('disabled')).toBeDefined();
    expect(redoBtn.attributes('disabled')).toBeDefined();
  });

  it('enables Undo once an edit creates history', async () => {
    const wrapper = mount(EditorToolbar, { global: vuetifyGlobal() });
    const store = useEditorStore();

    store.setFilter('sepia');
    await wrapper.vm.$nextTick();

    const undoBtn = wrapper.find('[aria-label="Undo"]');
    expect(undoBtn.attributes('disabled')).toBeUndefined();
  });
});
