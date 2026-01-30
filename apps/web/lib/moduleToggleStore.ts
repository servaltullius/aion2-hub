const STORAGE_KEY = "aion2hub.modules.enabled.v1";
export const ENABLED_MODULE_IDS_CHANGED_EVENT = "aion2hub:modulesEnabledChanged";

function getDefaultStorage(): Pick<Storage, "getItem" | "setItem"> | null {
  if (typeof window === "undefined") return null;
  return window.localStorage;
}

export function loadEnabledModuleIds(storage?: Pick<Storage, "getItem">): string[] | null {
  const store = storage ?? getDefaultStorage();
  if (!store) return null;

  const raw = store.getItem(STORAGE_KEY);
  if (raw === null) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return null;
    return parsed.filter((v): v is string => typeof v === "string");
  } catch {
    return null;
  }
}

export function saveEnabledModuleIds(moduleIds: string[], storage?: Pick<Storage, "setItem">): void {
  const store = storage ?? getDefaultStorage();
  if (!store) return;
  store.setItem(STORAGE_KEY, JSON.stringify(moduleIds));
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(ENABLED_MODULE_IDS_CHANGED_EVENT));
  }
}

export function subscribeEnabledModuleIds(onChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};

  const handleCustom = () => onChange();
  const handleStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) onChange();
  };

  window.addEventListener(ENABLED_MODULE_IDS_CHANGED_EVENT, handleCustom);
  window.addEventListener("storage", handleStorage);

  return () => {
    window.removeEventListener(ENABLED_MODULE_IDS_CHANGED_EVENT, handleCustom);
    window.removeEventListener("storage", handleStorage);
  };
}
