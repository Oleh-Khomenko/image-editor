import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import { VSlider } from 'vuetify/components';
import AdjustmentsPanel from '@/components/AdjustmentsPanel.vue';
import useEditorStore from '@/stores/editor';
import { vuetifyGlobal } from '../helpers/vuetify';

describe('AdjustmentsPanel', () => {
  it('routes each slider to its own adjustment field', async () => {
    const wrapper = mount(AdjustmentsPanel, { global: vuetifyGlobal() });
    const store = useEditorStore();

    const sliders = wrapper.findAllComponents(VSlider);
    expect(sliders).toHaveLength(3);

    sliders[1].vm.$emit('update:modelValue', 42);
    await wrapper.vm.$nextTick();

    expect(store.adjustments.contrast).toBe(42);
    expect(store.adjustments.brightness).toBe(0);
    expect(store.adjustments.saturation).toBe(0);
  });

  it('shows the current value once an adjustment changes', async () => {
    const wrapper = mount(AdjustmentsPanel, { global: vuetifyGlobal() });
    const store = useEditorStore();

    store.setAdjustment({ brightness: 30 });
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toContain('30');
  });
});
