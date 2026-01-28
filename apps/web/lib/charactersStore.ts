export type Character = {
  id: string;
  name: string;
  server?: string | undefined;
};

const STORAGE_KEY = "aion2hub.characters.v1";

export function loadCharacters(storage: Pick<Storage, "getItem"> = localStorage): Character[] {
  const raw = storage.getItem(STORAGE_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((value): value is Character => {
        if (!value || typeof value !== "object") return false;
        const v = value as Partial<Character>;
        return typeof v.id === "string" && typeof v.name === "string";
      })
      .map((value) => ({ id: value.id, name: value.name, server: value.server }));
  } catch {
    return [];
  }
}

export function saveCharacters(
  characters: Character[],
  storage: Pick<Storage, "setItem"> = localStorage
): void {
  storage.setItem(STORAGE_KEY, JSON.stringify(characters));
}

export function addCharacter(
  characters: Character[],
  input: { name: string; server?: string }
): Character[] {
  const name = input.name.trim();
  const server = input.server?.trim() || undefined;

  if (!name) throw new Error("Name is required");
  if (characters.some((c) => c.name === name)) throw new Error("Duplicate character name");

  const id = crypto.randomUUID();
  return [...characters, { id, name, server }];
}

export function updateCharacter(
  characters: Character[],
  input: { id: string; name: string; server?: string }
): Character[] {
  const name = input.name.trim();
  const server = input.server?.trim() || undefined;

  if (!name) throw new Error("Name is required");
  if (characters.some((c) => c.id !== input.id && c.name === name))
    throw new Error("Duplicate character name");

  let updated = false;

  const next = characters.map((c) => {
    if (c.id !== input.id) return c;
    updated = true;
    return { ...c, name, server };
  });

  if (!updated) throw new Error("Character not found");
  return next;
}

export function removeCharacter(characters: Character[], id: string): Character[] {
  const next = characters.filter((c) => c.id !== id);
  if (next.length === characters.length) throw new Error("Character not found");
  return next;
}
