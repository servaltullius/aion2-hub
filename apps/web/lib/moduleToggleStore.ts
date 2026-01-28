const STORAGE_KEY = "aion2hub.modules.enabled.v1";

export function loadEnabledModuleIds(storage: Pick<Storage, "getItem"> = localStorage): string[] {
  const raw = storage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((v): v is string => typeof v === "string");
  } catch {
    return [];
  }
}

export function saveEnabledModuleIds(
  moduleIds: string[],
  storage: Pick<Storage, "setItem"> = localStorage
): void {
  storage.setItem(STORAGE_KEY, JSON.stringify(moduleIds));
}

