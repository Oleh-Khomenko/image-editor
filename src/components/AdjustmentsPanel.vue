<script setup lang="ts">
// utils
import { computed } from 'vue';
import { storeToRefs } from 'pinia';
// stores
import useEditorStore from '@/stores/editor';

// custom types
type Field = 'brightness' | 'contrast' | 'saturation';

// custom constants
const FIELDS: { key: Field; label: string }[] = [
  { key: 'brightness', label: 'Brightness' },
  { key: 'contrast', label: 'Contrast' },
  { key: 'saturation', label: 'Saturation' },
];

// stores
const store = useEditorStore();
const { adjustments } = storeToRefs(store);

// computed
const hasAdjustments = computed<boolean>(
  () =>
    adjustments.value.brightness !== 0 ||
    adjustments.value.contrast !== 0 ||
    adjustments.value.saturation !== 0,
);

// helpers
function onAdjust(field: Field, value: number): void {
  store.setAdjustment({ [field]: value });
}
</script>

<template>
  <v-card class="adjustments-panel">
    <v-card-title class="adjustments-panel__title">
      Adjustments
    </v-card-title>
    <v-card-text>
      <div
        v-for="field in FIELDS"
        :key="field.key"
        class="adjustments-panel__field"
      >
        <div class="adjustments-panel__header">
          <span class="adjustments-panel__label">{{ field.label }}</span>
          <span class="adjustments-panel__value">{{ adjustments[field.key] }}</span>
          <v-btn
            v-if="adjustments[field.key] !== 0"
            icon="$restore"
            size="x-small"
            variant="text"
            density="comfortable"
            :aria-label="`Reset ${field.label}`"
            @click="onAdjust(field.key, 0)"
          />
        </div>
        <v-slider
          :model-value="adjustments[field.key]"
          :min="-100"
          :max="100"
          :step="1"
          hide-details
          :aria-label="field.label"
          @update:model-value="(value: number) => onAdjust(field.key, value)"
          @end="store.endAdjustGesture()"
        />
      </div>
      <v-btn
        class="adjustments-panel__reset"
        variant="tonal"
        block
        prepend-icon="$restore"
        :disabled="!hasAdjustments"
        @click="store.resetAdjustments()"
      >
        Reset adjustments
      </v-btn>
    </v-card-text>
  </v-card>
</template>

<style scoped lang="scss">
.adjustments-panel {
  width: 100%;

  &__title {
    font-size: 1rem;
  }

  &__field {
    margin-bottom: 0.25rem;
  }

  &__header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    min-height: 1.75rem;
    font-size: 0.875rem;
  }

  &__label {
    opacity: 0.8;
  }

  &__value {
    margin-left: auto;
    font-variant-numeric: tabular-nums;
    opacity: 0.6;
  }

  &__reset {
    margin-top: 0.5rem;
  }
}
</style>
