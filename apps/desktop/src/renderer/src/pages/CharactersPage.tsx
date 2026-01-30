import { useMemo, useState } from "react";

import { Badge } from "../components/ui/badge.js";
import { Button } from "../components/ui/button.js";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card.js";
import { Input } from "../components/ui/input.js";
import { Label } from "../components/ui/label.js";

type AppCharacter = {
  id: string;
  name: string;
  server: string | null;
  class: string | null;
};

export function CharactersPage(props: {
  characters: AppCharacter[];
  activeCharacterId: string | null;
  onChanged: () => void;
}) {
  const [name, setName] = useState("");
  const [server, setServer] = useState("");
  const [klass, setKlass] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const editing = useMemo(
    () => (editingId ? props.characters.find((c) => c.id === editingId) ?? null : null),
    [editingId, props.characters]
  );
  const [editName, setEditName] = useState("");
  const [editServer, setEditServer] = useState("");
  const [editClass, setEditClass] = useState("");

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Characters</h2>
          <p className="text-sm text-muted-foreground">캐릭터를 수동 등록하고 활성 캐릭터를 선택합니다.</p>
        </div>
        <Badge variant="muted">local-only</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>추가</CardTitle>
          <CardDescription>Planner는 활성 캐릭터 기준으로 표시됩니다.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="space-y-2">
              <Label>닉</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="캐릭터명" />
            </div>
            <div className="space-y-2">
              <Label>서버</Label>
              <Input value={server} onChange={(e) => setServer(e.target.value)} placeholder="선택" />
            </div>
            <div className="space-y-2">
              <Label>직업</Label>
              <Input value={klass} onChange={(e) => setKlass(e.target.value)} placeholder="선택" />
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={async () => {
                const trimmed = name.trim();
                if (!trimmed) return;
                await window.aion2Hub.characters.create({
                  name: trimmed,
                  server: server.trim() || null,
                  class: klass.trim() || null
                });
                setName("");
                setServer("");
                setKlass("");
                props.onChanged();
              }}
            >
              Add
            </Button>
          </div>
        </CardContent>
      </Card>

      {props.characters.length === 0 ? (
        <p className="text-sm text-muted-foreground">등록된 캐릭터가 없습니다.</p>
      ) : (
        <div className="space-y-2">
          {props.characters.map((c) => (
            <Card key={c.id} className="bg-background/40">
              <CardContent className="pt-4">
                <div className="flex flex-wrap items-center gap-2">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      className="h-4 w-4 accent-primary"
                      type="radio"
                      name="activeChar"
                      checked={props.activeCharacterId === c.id}
                      onChange={async () => {
                        await window.aion2Hub.app.setActiveCharacterId(c.id);
                        props.onChanged();
                      }}
                    />
                    <span className="font-medium">{c.name}</span>
                  </label>
                  <Badge variant="muted">{c.server ?? "-"}</Badge>
                  <Badge variant="muted">{c.class ?? "-"}</Badge>

                  <div className="ml-auto flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingId(c.id);
                        setEditName(c.name);
                        setEditServer(c.server ?? "");
                        setEditClass(c.class ?? "");
                      }}
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={async () => {
                        if (!confirm(`삭제할까요? (${c.name})`)) return;
                        await window.aion2Hub.characters.delete(c.id);
                        props.onChanged();
                      }}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {editing ? (
        <Card>
          <CardHeader>
            <CardTitle>Edit</CardTitle>
            <CardDescription>닉/서버/직업을 수정합니다.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="space-y-2">
                <Label>닉</Label>
                <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>서버</Label>
                <Input value={editServer} onChange={(e) => setEditServer(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>직업</Label>
                <Input value={editClass} onChange={(e) => setEditClass(e.target.value)} />
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                onClick={async () => {
                  const trimmed = editName.trim();
                  if (!trimmed) return;
                  await window.aion2Hub.characters.update({
                    id: editing.id,
                    name: trimmed,
                    server: editServer.trim() || null,
                    class: editClass.trim() || null
                  });
                  setEditingId(null);
                  props.onChanged();
                }}
              >
                Save
              </Button>
              <Button variant="outline" onClick={() => setEditingId(null)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </section>
  );
}
