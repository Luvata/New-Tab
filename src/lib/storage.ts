import type { AppState } from '../types';

const STORAGE_KEY = 'intend.app-state';

type StorageListener = (nextState: AppState | null) => void;

function isChromeStorageAvailable(): boolean {
  return typeof chrome !== 'undefined' && typeof chrome.storage?.local !== 'undefined';
}

export async function readPersistedState(): Promise<AppState | null> {
  if (isChromeStorageAvailable()) {
    const result = await chrome.storage.local.get(STORAGE_KEY);
    return (result[STORAGE_KEY] as AppState | undefined) ?? null;
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  return raw ? (JSON.parse(raw) as AppState) : null;
}

export async function writePersistedState(state: AppState): Promise<void> {
  if (isChromeStorageAvailable()) {
    await chrome.storage.local.set({ [STORAGE_KEY]: state });
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function subscribeToPersistedState(listener: StorageListener): () => void {
  if (isChromeStorageAvailable()) {
    const handleChange = (
      changes: Record<string, chrome.storage.StorageChange>,
      areaName: string
    ) => {
      if (areaName !== 'local' || !changes[STORAGE_KEY]) {
        return;
      }

      listener((changes[STORAGE_KEY].newValue as AppState | undefined) ?? null);
    };

    chrome.storage.onChanged.addListener(handleChange);
    return () => chrome.storage.onChanged.removeListener(handleChange);
  }

  const handleStorage = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY) {
      return;
    }

    listener(event.newValue ? (JSON.parse(event.newValue) as AppState) : null);
  };

  window.addEventListener('storage', handleStorage);
  return () => window.removeEventListener('storage', handleStorage);
}
