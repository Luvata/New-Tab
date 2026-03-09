import { useEffect, useSyncExternalStore } from 'react';
import { appStore } from '../lib/store';

export function useAppSnapshot() {
  const snapshot = useSyncExternalStore(
    (listener) => appStore.subscribe(listener),
    () => appStore.getSnapshot(),
    () => appStore.getSnapshot()
  );

  useEffect(() => {
    void appStore.init();
    return () => {
      appStore.destroy();
    };
  }, []);

  return snapshot;
}
