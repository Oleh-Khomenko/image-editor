import type { Plugin } from 'vue';
import { createVuetify } from 'vuetify';
import * as components from 'vuetify/components';
import * as directives from 'vuetify/directives';
import { createPinia, setActivePinia } from 'pinia';
import { icons } from '@/plugins/icons';

export function vuetifyGlobal(): { plugins: Plugin[] } {
  const pinia = createPinia();
  setActivePinia(pinia);
  return { plugins: [createVuetify({ components, directives, icons }), pinia] };
}
