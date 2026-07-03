// utils
import { onScopeDispose } from 'vue';

export default function useUnsavedGuard(hasUnsaved: () => boolean): void {
  function onBeforeUnload(event: BeforeUnloadEvent): void {
    if (!hasUnsaved()) {
      return;
    }
    event.preventDefault();
    // some browsers still require returnValue to be set to show the prompt
    event.returnValue = '';
  }

  window.addEventListener('beforeunload', onBeforeUnload);
  onScopeDispose(() => window.removeEventListener('beforeunload', onBeforeUnload));
}
