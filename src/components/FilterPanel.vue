<script setup lang="ts">
import { storeToRefs } from 'pinia';
import useEditorStore from '@/stores/editor';
import { FILTER_OPTIONS } from '@/core/operations/filters';
import type { FilterName } from '@/core/operations/types';

// stores
const store = useEditorStore();
const { filter } = storeToRefs(store);

// helpers
function onSelect(value: FilterName | null): void {
  store.setFilter(value);
}
</script>

<template>
  <v-card class="filter-panel">
    <v-card-title class="filter-panel__title">
      Filter
    </v-card-title>
    <v-card-text>
      <v-select
        label="Filter"
        :items="FILTER_OPTIONS"
        item-title="title"
        item-value="value"
        :model-value="filter"
        hide-details
        @update:model-value="onSelect"
      />
    </v-card-text>
  </v-card>
</template>

<style scoped lang="scss">
.filter-panel {
  width: 100%;

  &__title {
    font-size: 1rem;
  }
}
</style>
