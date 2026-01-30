"use client";

import { useEffect, useMemo, useState } from "react";

import { plannerDb } from "../lib/db.js";
import { loadHubCharacters, loadSelectedCharacterId, saveSelectedCharacterId } from "../lib/hubCharacters.js";
import type { HubCharacter } from "../lib/hubCharacters.js";
import type { PlannerTemplate } from "../lib/types.js";

type TemplateStat = {
  templateId: string;
  title: string;
  count: number;
  avgSeconds: number;
};

function formatMinutes(seconds: number): string {
  return `${Math.round(seconds / 60)}m`;
}

export default function PlannerStatsPage() {
  const [characters, setCharacters] = useState<HubCharacter[]>([]);
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(() =>
    loadSelectedCharacterId()
  );
  const [templates, setTemplates] = useState<PlannerTemplate[]>([]);
  const [stats, setStats] = useState<TemplateStat[]>([]);

  useEffect(() => {
    const list = loadHubCharacters();
    setCharacters(list);

    if (list.length > 0) {
      const first = list.at(0);
      if (!first) return;
      if (!selectedCharacterId || !list.some((c) => c.id === selectedCharacterId)) {
        setSelectedCharacterId(first.id);
        saveSelectedCharacterId(first.id);
      }
    } else if (selectedCharacterId) {
      setSelectedCharacterId(null);
      saveSelectedCharacterId(null);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      const loaded = await plannerDb.templates.orderBy("sort").toArray();
      setTemplates(loaded);
    })();
  }, []);

  useEffect(() => {
    void (async () => {
      if (!selectedCharacterId) {
        setStats([]);
        return;
      }

      const durations = await plannerDb.durations.where("characterId").equals(selectedCharacterId).toArray();
      const grouped = new Map<string, number[]>();
      for (const row of durations) {
        const list = grouped.get(row.templateId) ?? [];
        list.push(row.seconds);
        grouped.set(row.templateId, list);
      }

      const next: TemplateStat[] = [];
      for (const [templateId, list] of grouped.entries()) {
        const template = templates.find((t) => t.id === templateId);
        const title = template?.title ?? templateId;
        const total = list.reduce((sum, v) => sum + v, 0);
        const avgSeconds = list.length > 0 ? Math.round(total / list.length) : 0;
        next.push({ templateId, title, count: list.length, avgSeconds });
      }

      next.sort((a, b) => b.avgSeconds - a.avgSeconds);
      setStats(next);
    })();
  }, [selectedCharacterId, templates]);

  function selectCharacter(id: string) {
    setSelectedCharacterId(id);
    saveSelectedCharacterId(id);
  }

  const empty = useMemo(() => stats.length === 0, [stats.length]);

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div className="card" style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontWeight: 700 }}>Stats</div>
          <div style={{ opacity: 0.75, fontSize: 14 }}>최근 타이머 기록 기반(평균)</div>
        </div>
        <a
          className="secondaryButton"
          href="/m/planner/today"
          style={{ marginLeft: "auto", lineHeight: "34px", textDecoration: "none" }}
        >
          Back to Today
        </a>
      </div>

      <div className="card" style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ fontWeight: 700 }}>Character</div>
        {characters.length === 0 ? (
          <div style={{ opacity: 0.8 }}>
            No characters yet. Add one in <a href="/characters">Characters</a>.
          </div>
        ) : (
          <select className="textInput" value={selectedCharacterId ?? ""} onChange={(e) => selectCharacter(e.target.value)}>
            {characters.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.server ? ` (${c.server})` : ""}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="card">
        <div style={{ fontWeight: 700, marginBottom: 6 }}>Average durations</div>
        {empty ? (
          <p style={{ margin: 0, opacity: 0.75 }}>No duration records yet. Use the timer on Today.</p>
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            {stats.map((stat) => (
              <div key={stat.templateId} style={{ display: "flex", gap: 10, justifyContent: "space-between" }}>
                <div style={{ fontWeight: 600 }}>{stat.title}</div>
                <div style={{ opacity: 0.75 }}>
                  {formatMinutes(stat.avgSeconds)} avg · {stat.count} sessions
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
