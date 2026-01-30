export type HubCharacter = {
  id: string;
  name: string;
  server?: string | undefined;
};

const HUB_CHARACTERS_KEY = "aion2hub.characters.v1";
const SELECTED_CHARACTER_KEY = "aion2hub.planner.selectedCharacterId.v1";

export const PLANNER_SELECTED_CHARACTER_CHANGED_EVENT = "aion2hub:plannerSelectedCharacterChanged";

export function loadHubCharacters(storage: Pick<Storage, "getItem"> = localStorage): HubCharacter[] {
  const raw = storage.getItem(HUB_CHARACTERS_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((value): value is HubCharacter => {
        if (!value || typeof value !== "object") return false;
        const v = value as Partial<HubCharacter>;
        return typeof v.id === "string" && typeof v.name === "string";
      })
      .map((value) => ({ id: value.id, name: value.name, server: value.server }));
  } catch {
    return [];
  }
}

export function loadSelectedCharacterId(storage: Pick<Storage, "getItem"> = localStorage): string | null {
  const raw = storage.getItem(SELECTED_CHARACTER_KEY);
  if (!raw) return null;
  return raw;
}

export function saveSelectedCharacterId(
  characterId: string | null,
  storage: Pick<Storage, "setItem" | "removeItem"> = localStorage
): void {
  if (!characterId) storage.removeItem(SELECTED_CHARACTER_KEY);
  else storage.setItem(SELECTED_CHARACTER_KEY, characterId);

  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(PLANNER_SELECTED_CHARACTER_CHANGED_EVENT));
  }
}

export function subscribeSelectedCharacterId(onChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};

  const handleCustom = () => onChange();
  const handleStorage = (event: StorageEvent) => {
    if (event.key === SELECTED_CHARACTER_KEY) onChange();
  };

  window.addEventListener(PLANNER_SELECTED_CHARACTER_CHANGED_EVENT, handleCustom);
  window.addEventListener("storage", handleStorage);

  return () => {
    window.removeEventListener(PLANNER_SELECTED_CHARACTER_CHANGED_EVENT, handleCustom);
    window.removeEventListener("storage", handleStorage);
  };
}

