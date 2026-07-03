<script setup lang="ts">
import { storeToRefs } from 'pinia';
import EditorLayout from '@/components/EditorLayout.vue';
import UploadCard from '@/components/UploadCard.vue';
import useEditorStore from '@/stores/editor';

// stores
const store = useEditorStore();
const { hasImage } = storeToRefs(store);
</script>

<template>
  <v-app>
    <EditorLayout v-if="hasImage" />
    <UploadCard v-else />
  </v-app>
</template>
