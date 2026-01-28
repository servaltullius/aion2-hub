import { describe, expect, it } from "vitest";

import { addCharacter, loadCharacters, removeCharacter, saveCharacters, updateCharacter } from "./charactersStore";

function createMemoryStorage() {
  const map = new Map<string, string>();
  return {
    getItem(key: string) {
      return map.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      map.set(key, value);
    }
  };
}

describe("charactersStore", () => {
  it("loads/saves characters", () => {
    const storage = createMemoryStorage();
    saveCharacters([{ id: "1", name: "A" }], storage);
    expect(loadCharacters(storage)).toEqual([{ id: "1", name: "A", server: undefined }]);
  });

  it("prevents duplicate names", () => {
    const chars = [{ id: "1", name: "A" }];
    expect(() => addCharacter(chars, { name: "A" })).toThrow(/Duplicate/);
    expect(() => updateCharacter(chars, { id: "1", name: "A" })).not.toThrow();
  });

  it("removes by id", () => {
    const chars = [
      { id: "1", name: "A" },
      { id: "2", name: "B" }
    ];
    expect(removeCharacter(chars, "1").map((c) => c.id)).toEqual(["2"]);
  });
});

