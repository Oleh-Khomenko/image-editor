import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import { VSelect } from 'vuetify/components';
import FilterPanel from '@/components/FilterPanel.vue';
import useEditorStore from '@/stores/editor';
import { vuetifyGlobal } from '../helpers/vuetify';

describe('FilterPanel', () => {
  it('sets the filter from the select', async () => {
    const wrapper = mount(FilterPanel, { global: vuetifyGlobal() });
    const store = useEditorStore();

    wrapper.findComponent(VSelect).vm.$emit('update:modelValue', 'sepia');
    await wrapper.vm.$nextTick();

    expect(store.filter).toBe('sepia');
  });

  it('clears the filter when None is chosen', async () => {
    const wrapper = mount(FilterPanel, { global: vuetifyGlobal() });
    const store = useEditorStore();
    store.setFilter('grayscale');

    wrapper.findComponent(VSelect).vm.$emit('update:modelValue', null);
    await wrapper.vm.$nextTick();

    expect(store.filter).toBeNull();
  });
});
