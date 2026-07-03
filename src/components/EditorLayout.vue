<script setup lang="ts">
import AdjustmentsPanel from '@/components/AdjustmentsPanel.vue';
import EditorCanvas from '@/components/EditorCanvas.vue';
</script>

<template>
  <div class="editor-layout">
    <div class="editor-layout__stage">
      <EditorCanvas />
    </div>
    <aside class="editor-layout__panels">
      <AdjustmentsPanel />
    </aside>
  </div>
</template>

<style scoped lang="scss">
.editor-layout {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;

  @media (min-width: 60rem) {
    flex-direction: row;
  }

  &__stage {
    flex: 1 1 auto;
    min-height: 20rem;
    min-width: 0;
  }

  &__panels {
    flex: 0 0 auto;
    width: 100%;
    padding: 1rem;

    @media (min-width: 60rem) {
      width: 20rem;
    }
  }
}
</style>
