export function loadEditor(): Promise<typeof import('@/components/EditorLayout.vue')> {
  return import('@/components/EditorLayout.vue');
}
