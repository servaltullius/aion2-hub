"use client";

import { useEffect, useMemo, useState } from "react";

import {
  addCharacter,
  loadCharacters,
  removeCharacter,
  saveCharacters,
  updateCharacter,
  type Character
} from "../../lib/charactersStore";

export default function CharactersPage() {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [name, setName] = useState("");
  const [server, setServer] = useState("");
  const [error, setError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const editing = useMemo(
    () => characters.find((c) => c.id === editingId) ?? null,
    [characters, editingId]
  );
  const [editingName, setEditingName] = useState("");
  const [editingServer, setEditingServer] = useState("");

  useEffect(() => {
    const initial = loadCharacters();
    setCharacters(initial);
  }, []);

  useEffect(() => {
    saveCharacters(characters);
  }, [characters]);

  useEffect(() => {
    if (!editing) return;
    setEditingName(editing.name);
    setEditingServer(editing.server ?? "");
  }, [editing]);

  return (
    <main>
      <h1>Characters</h1>

      <section className="card">
        <h2>Add character</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);

            try {
              const next = addCharacter(characters, { name, server });
              setCharacters(next);
              setName("");
              setServer("");
            } catch (err) {
              setError(err instanceof Error ? err.message : "Unknown error");
            }
          }}
        >
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input
              className="textInput"
              value={name}
              placeholder="Name"
              onChange={(e) => setName(e.target.value)}
            />
            <input
              className="textInput"
              value={server}
              placeholder="Server (optional)"
              onChange={(e) => setServer(e.target.value)}
            />
            <button className="primaryButton" type="submit">
              Add
            </button>
          </div>
          {error ? (
            <p style={{ color: "#b91c1c", marginTop: 8, marginBottom: 0 }}>{error}</p>
          ) : null}
        </form>
      </section>

      <section className="card" style={{ marginTop: 12 }}>
        <h2>List</h2>
        {characters.length === 0 ? (
          <p style={{ margin: 0, opacity: 0.75 }}>No characters yet.</p>
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            {characters.map((c) => (
              <div
                key={c.id}
                style={{
                  display: "flex",
                  gap: 10,
                  alignItems: "center",
                  justifyContent: "space-between"
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700 }}>{c.name}</div>
                  <div style={{ opacity: 0.75, fontSize: 14 }}>{c.server ?? "—"}</div>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <button
                    className="secondaryButton"
                    type="button"
                    onClick={() => setEditingId(c.id)}
                  >
                    Edit
                  </button>
                  <button
                    className="dangerButton"
                    type="button"
                    onClick={() => {
                      setError(null);
                      try {
                        setCharacters(removeCharacter(characters, c.id));
                        if (editingId === c.id) setEditingId(null);
                      } catch (err) {
                        setError(err instanceof Error ? err.message : "Unknown error");
                      }
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {editing ? (
        <section className="card" style={{ marginTop: 12 }}>
          <h2>Edit</h2>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setError(null);
              try {
                const next = updateCharacter(characters, {
                  id: editing.id,
                  name: editingName,
                  server: editingServer
                });
                setCharacters(next);
                setEditingId(null);
              } catch (err) {
                setError(err instanceof Error ? err.message : "Unknown error");
              }
            }}
          >
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <input
                className="textInput"
                value={editingName}
                placeholder="Name"
                onChange={(e) => setEditingName(e.target.value)}
              />
              <input
                className="textInput"
                value={editingServer}
                placeholder="Server (optional)"
                onChange={(e) => setEditingServer(e.target.value)}
              />
              <button className="primaryButton" type="submit">
                Save
              </button>
              <button
                className="secondaryButton"
                type="button"
                onClick={() => setEditingId(null)}
              >
                Cancel
              </button>
            </div>
          </form>
        </section>
      ) : null}
    </main>
  );
}
