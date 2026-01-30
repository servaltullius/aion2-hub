"use client";

import { useEffect, useMemo, useState } from "react";

import { getOrCreatePlannerSettings, plannerDb } from "../lib/db.js";
import { loadHubCharacters, loadSelectedCharacterId, saveSelectedCharacterId } from "../lib/hubCharacters.js";
import { getNextWeeklyResetAt, getWeeklyPeriodKey } from "../lib/period.js";
import type { HubCharacter } from "../lib/hubCharacters.js";
import type { PlannerSettings, PlannerTemplate } from "../lib/types.js";

function formatCountdownMs(ms: number): string {
  const clamped = Math.max(0, ms);
  const totalSeconds = Math.floor(clamped / 1000);
  const days = Math.floor(totalSeconds / (24 * 3600));
  const hours = Math.floor((totalSeconds % (24 * 3600)) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export default function PlannerWeekPage() {
  const [characters, setCharacters] = useState<HubCharacter[]>([]);
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(() =>
    loadSelectedCharacterId()
  );

  const [settings, setSettings] = useState<PlannerSettings>({
    id: "settings",
    dailyResetHour: 0,
    weeklyResetDay: 1,
    weeklyResetHour: 0
  });
  const [templates, setTemplates] = useState<PlannerTemplate[]>([]);
  const [weeklyDone, setWeeklyDone] = useState<Set<string>>(new Set());
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsNotice, setSettingsNotice] = useState<string | null>(null);

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
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    void (async () => {
      const loaded = await getOrCreatePlannerSettings();
      setSettings(loaded);
    })();
  }, []);

  useEffect(() => {
    void (async () => {
      const loaded = await plannerDb.templates.orderBy("sort").toArray();
      setTemplates(loaded.filter((t) => t.enabled && t.type === "weekly"));
    })();
  }, []);

  const weeklyKey = useMemo(
    () => getWeeklyPeriodKey(new Date(nowMs), settings.weeklyResetDay, settings.weeklyResetHour),
    [nowMs, settings.weeklyResetDay, settings.weeklyResetHour]
  );

  const nextResetAt = useMemo(
    () => getNextWeeklyResetAt(new Date(nowMs), settings.weeklyResetDay, settings.weeklyResetHour),
    [nowMs, settings.weeklyResetDay, settings.weeklyResetHour]
  );

  useEffect(() => {
    void (async () => {
      if (!selectedCharacterId) {
        setWeeklyDone(new Set());
        return;
      }

      const rows = await plannerDb.completions
        .where("[characterId+periodKey]")
        .equals([selectedCharacterId, weeklyKey])
        .toArray();
      setWeeklyDone(new Set(rows.map((r) => r.templateId)));
    })();
  }, [selectedCharacterId, weeklyKey]);

  async function toggle(templateId: string, completed: boolean) {
    if (!selectedCharacterId) return;
    if (completed) {
      await plannerDb.completions.put({
        characterId: selectedCharacterId,
        templateId,
        periodKey: weeklyKey,
        completedAt: Date.now()
      });
    } else {
      await plannerDb.completions.delete([selectedCharacterId, templateId, weeklyKey]);
    }

    const rows = await plannerDb.completions
      .where("[characterId+periodKey]")
      .equals([selectedCharacterId, weeklyKey])
      .toArray();
    setWeeklyDone(new Set(rows.map((r) => r.templateId)));
  }

  function selectCharacter(id: string) {
    setSelectedCharacterId(id);
    saveSelectedCharacterId(id);
  }

  const remaining = nextResetAt.getTime() - nowMs;

  async function saveSettings() {
    setSavingSettings(true);
    setSettingsNotice(null);
    try {
      const dailyResetHour = Math.min(23, Math.max(0, Math.floor(settings.dailyResetHour)));
      const weeklyResetDay = Math.min(6, Math.max(0, Math.floor(settings.weeklyResetDay)));
      const weeklyResetHour = Math.min(23, Math.max(0, Math.floor(settings.weeklyResetHour)));

      const next = { ...settings, dailyResetHour, weeklyResetDay, weeklyResetHour };
      await plannerDb.settings.put(next);
      setSettings(next);
      setSettingsNotice("Saved.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setSettingsNotice(`Error: ${message}`);
    } finally {
      setSavingSettings(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div className="card" style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontWeight: 700 }}>Week</div>
          <div style={{ opacity: 0.75, fontSize: 14 }}>
            period: <code>{weeklyKey}</code> · reset in: <strong>{formatCountdownMs(remaining)}</strong>
          </div>
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
          <select
            className="textInput"
            value={selectedCharacterId ?? ""}
            onChange={(e) => selectCharacter(e.target.value)}
          >
            {characters.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.server ? ` (${c.server})` : ""}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="card" style={{ display: "grid", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <div style={{ fontWeight: 700 }}>Reset settings</div>
          {settingsNotice ? <div style={{ opacity: 0.8 }}>{settingsNotice}</div> : null}
          <button
            className="secondaryButton"
            style={{ marginLeft: "auto" }}
            onClick={() => void saveSettings()}
            disabled={savingSettings}
          >
            {savingSettings ? "Saving…" : "Save"}
          </button>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
            daily reset hour
            <input
              className="textInput"
              type="number"
              min={0}
              max={23}
              style={{ width: 110, minWidth: 110 }}
              inputMode="numeric"
              value={settings.dailyResetHour}
              onChange={(e) =>
                setSettings((s) => ({ ...s, dailyResetHour: Number(e.target.value || "0") }))
              }
            />
          </label>
          <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
            weekly reset day
            <select
              className="textInput"
              value={settings.weeklyResetDay}
              onChange={(e) => setSettings((s) => ({ ...s, weeklyResetDay: Number(e.target.value) }))}
            >
              <option value={0}>Sun</option>
              <option value={1}>Mon</option>
              <option value={2}>Tue</option>
              <option value={3}>Wed</option>
              <option value={4}>Thu</option>
              <option value={5}>Fri</option>
              <option value={6}>Sat</option>
            </select>
          </label>
          <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
            weekly reset hour
            <input
              className="textInput"
              type="number"
              min={0}
              max={23}
              style={{ width: 110, minWidth: 110 }}
              inputMode="numeric"
              value={settings.weeklyResetHour}
              onChange={(e) =>
                setSettings((s) => ({ ...s, weeklyResetHour: Number(e.target.value || "0") }))
              }
            />
          </label>
        </div>
        <div style={{ opacity: 0.75, fontSize: 13 }}>
          Week countdown uses these settings. (Local time)
        </div>
      </div>

      <div className="card">
        <div style={{ fontWeight: 700, marginBottom: 6 }}>Weekly tasks</div>
        {templates.length === 0 ? (
          <p style={{ margin: 0, opacity: 0.75 }}>
            No weekly templates. Create some in <a href="/m/planner/templates">Templates</a>.
          </p>
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            {templates.map((template) => (
              <label key={template.id} style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <input
                  type="checkbox"
                  checked={weeklyDone.has(template.id)}
                  disabled={!selectedCharacterId}
                  onChange={(e) => void toggle(template.id, e.target.checked)}
                />
                <div style={{ fontWeight: 600 }}>{template.title}</div>
              </label>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
