<script setup lang="ts">
import { storeToRefs } from 'pinia';
import useEditorStore from '@/stores/editor';

// stores
const store = useEditorStore();
const { adjustments } = storeToRefs(store);

// helpers
function onAdjust(field: 'brightness' | 'contrast' | 'saturation', value: number): void {
  store.setAdjustment({ [field]: value });
}
</script>

<template>
  <v-card class="adjustments-panel">
    <v-card-title class="adjustments-panel__title">
      Adjustments
    </v-card-title>
    <v-card-text>
      <div class="adjustments-panel__field">
        <span class="adjustments-panel__label">Brightness</span>
        <v-slider
          :model-value="adjustments.brightness"
          :min="-100"
          :max="100"
          :step="1"
          thumb-label
          hide-details
          @update:model-value="(value: number) => onAdjust('brightness', value)"
        />
      </div>
      <div class="adjustments-panel__field">
        <span class="adjustments-panel__label">Contrast</span>
        <v-slider
          :model-value="adjustments.contrast"
          :min="-100"
          :max="100"
          :step="1"
          thumb-label
          hide-details
          @update:model-value="(value: number) => onAdjust('contrast', value)"
        />
      </div>
      <div class="adjustments-panel__field">
        <span class="adjustments-panel__label">Saturation</span>
        <v-slider
          :model-value="adjustments.saturation"
          :min="-100"
          :max="100"
          :step="1"
          thumb-label
          hide-details
          @update:model-value="(value: number) => onAdjust('saturation', value)"
        />
      </div>
      <v-btn
        class="adjustments-panel__reset"
        variant="tonal"
        block
        @click="store.resetAdjustments()"
      >
        Reset
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
    margin-bottom: 0.5rem;
  }

  &__label {
    display: block;
    margin-bottom: -0.5rem;
    font-size: 0.875rem;
    opacity: 0.8;
  }

  &__reset {
    margin-top: 0.5rem;
  }
}
</style>
