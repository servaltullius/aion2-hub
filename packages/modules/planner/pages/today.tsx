"use client";

import { useEffect, useMemo, useState } from "react";

import { getOrCreatePlannerSettings, plannerDb } from "../lib/db.js";
import { loadHubCharacters, loadSelectedCharacterId, saveSelectedCharacterId } from "../lib/hubCharacters.js";
import { getDailyPeriodKey, getWeeklyPeriodKey } from "../lib/period.js";
import { recommendForBudget, type RecommendCandidate } from "../lib/recommend.js";
import type { HubCharacter } from "../lib/hubCharacters.js";
import type { PlannerSettings, PlannerTemplate } from "../lib/types.js";

type ActiveTimer = {
  templateId: string;
  startedAt: number;
};

type ChargeInfo = {
  available: number;
  maxStacks: number;
  nextRechargeAt: number | null;
};

function formatSeconds(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes <= 0) return `${seconds}s`;
  return `${minutes}m ${seconds}s`;
}

function formatCountdownMs(ms: number): string {
  const clamped = Math.max(0, ms);
  const totalSeconds = Math.floor(clamped / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m ${seconds}s`;
}

export default function PlannerTodayPage() {
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

  const [dailyDone, setDailyDone] = useState<Set<string>>(new Set());
  const [weeklyDone, setWeeklyDone] = useState<Set<string>>(new Set());
  const [avgSecondsByTemplateId, setAvgSecondsByTemplateId] = useState<Map<string, number>>(new Map());
  const [chargeInfoByTemplateId, setChargeInfoByTemplateId] = useState<Map<string, ChargeInfo>>(new Map());
  const [activeTimer, setActiveTimer] = useState<ActiveTimer | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [recommendation, setRecommendation] = useState<{ budgetMinutes: number; ids: string[]; totalSeconds: number } | null>(
    null
  );

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
      const loaded = await getOrCreatePlannerSettings();
      setSettings(loaded);
    })();
  }, []);

  async function reloadTemplates() {
    const loaded = await plannerDb.templates.orderBy("sort").toArray();
    setTemplates(loaded);
  }

  async function reloadStatus() {
    if (!selectedCharacterId) {
      setDailyDone(new Set());
      setWeeklyDone(new Set());
      setAvgSecondsByTemplateId(new Map());
      setChargeInfoByTemplateId(new Map());
      return;
    }

    const now = new Date();
    const dailyKey = getDailyPeriodKey(now, settings.dailyResetHour);
    const weeklyKey = getWeeklyPeriodKey(now, settings.weeklyResetDay, settings.weeklyResetHour);

    const [dailyRows, weeklyRows, durationRows] = await Promise.all([
      plannerDb.completions.where("[characterId+periodKey]").equals([selectedCharacterId, dailyKey]).toArray(),
      plannerDb.completions.where("[characterId+periodKey]").equals([selectedCharacterId, weeklyKey]).toArray(),
      plannerDb.durations.where("characterId").equals(selectedCharacterId).toArray()
    ]);

    setDailyDone(new Set(dailyRows.map((r) => r.templateId)));
    setWeeklyDone(new Set(weeklyRows.map((r) => r.templateId)));

    const durationsByTemplate = new Map<string, number[]>();
    for (const row of durationRows) {
      const list = durationsByTemplate.get(row.templateId) ?? [];
      list.push(row.seconds);
      durationsByTemplate.set(row.templateId, list);
    }

    const avg = new Map<string, number>();
    for (const [templateId, list] of durationsByTemplate.entries()) {
      const total = list.reduce((sum, v) => sum + v, 0);
      if (list.length > 0) avg.set(templateId, Math.round(total / list.length));
    }
    setAvgSecondsByTemplateId(avg);

    const chargeInfo = new Map<string, ChargeInfo>();
    const chargeTemplates = templates.filter((t) => t.type === "charge" && t.enabled);
    await Promise.all(
      chargeTemplates.map(async (template) => {
        const maxStacks = Math.max(1, template.maxStacks ?? 1);
        const rechargeHours = Math.max(1, template.rechargeHours ?? 24);
        const rechargeMs = rechargeHours * 60 * 60 * 1000;
        const windowStart = Date.now() - rechargeMs;
        const uses = await plannerDb.chargeUses
          .where("[characterId+templateId]")
          .equals([selectedCharacterId, template.id])
          .toArray();

        const active = uses.filter((u) => u.usedAt >= windowStart);
        const depleted = active.length;
        const available = Math.max(0, maxStacks - depleted);
        const nextRechargeAt =
          depleted > 0 ? Math.min(...active.map((u) => u.usedAt + rechargeMs)) : null;

        chargeInfo.set(template.id, { available, maxStacks, nextRechargeAt });
      })
    );
    setChargeInfoByTemplateId(chargeInfo);
  }

  useEffect(() => {
    void reloadTemplates();
  }, []);

  useEffect(() => {
    void reloadStatus();
  }, [selectedCharacterId, settings.dailyResetHour, settings.weeklyResetDay, settings.weeklyResetHour, templates]);

  const now = new Date();
  const dailyKey = useMemo(
    () => getDailyPeriodKey(now, settings.dailyResetHour),
    [now, settings.dailyResetHour]
  );
  const weeklyKey = useMemo(
    () => getWeeklyPeriodKey(now, settings.weeklyResetDay, settings.weeklyResetHour),
    [now, settings.weeklyResetDay, settings.weeklyResetHour]
  );

  const filteredTemplates = useMemo(() => {
    const q = filter.trim().toLowerCase();
    const base = templates.filter((t) => t.enabled);
    if (!q) return base;
    return base.filter((t) => t.title.toLowerCase().includes(q));
  }, [filter, templates]);

  const dailyTemplates = filteredTemplates.filter((t) => t.type === "daily");
  const weeklyTemplates = filteredTemplates.filter((t) => t.type === "weekly");
  const chargeTemplates = filteredTemplates.filter((t) => t.type === "charge");

  const dailyCounts = {
    done: dailyTemplates.filter((t) => dailyDone.has(t.id)).length,
    total: dailyTemplates.length
  };

  async function toggleCompletion(templateId: string, periodKey: string, completed: boolean) {
    if (!selectedCharacterId) return;
    if (completed) {
      await plannerDb.completions.put({
        characterId: selectedCharacterId,
        templateId,
        periodKey,
        completedAt: Date.now()
      });
    } else {
      await plannerDb.completions.delete([selectedCharacterId, templateId, periodKey]);
    }
    await reloadStatus();
  }

  async function useCharge(template: PlannerTemplate) {
    if (!selectedCharacterId) return;
    const info = chargeInfoByTemplateId.get(template.id);
    if (!info || info.available <= 0) return;
    await plannerDb.chargeUses.add({
      characterId: selectedCharacterId,
      templateId: template.id,
      usedAt: Date.now()
    });
    await reloadStatus();
  }

  async function undoCharge(template: PlannerTemplate) {
    if (!selectedCharacterId) return;
    const uses = await plannerDb.chargeUses
      .where("[characterId+templateId]")
      .equals([selectedCharacterId, template.id])
      .toArray();
    const latest = uses.sort((a, b) => b.usedAt - a.usedAt)[0];
    if (!latest?.id) return;
    await plannerDb.chargeUses.delete(latest.id);
    await reloadStatus();
  }

  async function startTimer(templateId: string) {
    setNotice(null);
    setActiveTimer({ templateId, startedAt: Date.now() });
  }

  async function stopTimer() {
    if (!activeTimer || !selectedCharacterId) return;
    const endedAt = Date.now();
    const seconds = Math.max(1, Math.round((endedAt - activeTimer.startedAt) / 1000));

    await plannerDb.durations.add({
      characterId: selectedCharacterId,
      templateId: activeTimer.templateId,
      startedAt: activeTimer.startedAt,
      endedAt,
      seconds
    });

    setActiveTimer(null);
    setNotice(`Saved duration: ${formatSeconds(seconds)}`);
    await reloadStatus();
  }

  function buildCandidatesForRecommend(): RecommendCandidate[] {
    const candidates: RecommendCandidate[] = [];

    for (const template of dailyTemplates) {
      if (dailyDone.has(template.id)) continue;
      const avgSeconds = avgSecondsByTemplateId.get(template.id);
      const estimatedSeconds = avgSeconds ?? Math.round((template.estimatedMinutes ?? 5) * 60);
      candidates.push({ id: template.id, estimatedSeconds });
    }

    for (const template of weeklyTemplates) {
      if (weeklyDone.has(template.id)) continue;
      const avgSeconds = avgSecondsByTemplateId.get(template.id);
      const estimatedSeconds = avgSeconds ?? Math.round((template.estimatedMinutes ?? 10) * 60);
      candidates.push({ id: template.id, estimatedSeconds });
    }

    for (const template of chargeTemplates) {
      const info = chargeInfoByTemplateId.get(template.id);
      if (!info || info.available <= 0) continue;
      const avgSeconds = avgSecondsByTemplateId.get(template.id);
      const estimatedSeconds = avgSeconds ?? Math.round((template.estimatedMinutes ?? 10) * 60);
      candidates.push({ id: template.id, estimatedSeconds });
    }

    return candidates;
  }

  function applyRecommendation(budgetMinutes: number) {
    const candidates = buildCandidatesForRecommend();
    const result = recommendForBudget(candidates, budgetMinutes * 60);
    setRecommendation({
      budgetMinutes,
      ids: result.selected.map((c) => c.id),
      totalSeconds: result.totalSeconds
    });
  }

  function selectCharacter(id: string) {
    setSelectedCharacterId(id);
    saveSelectedCharacterId(id);
    setRecommendation(null);
  }

  const activeElapsed = activeTimer ? Math.floor((Date.now() - activeTimer.startedAt) / 1000) : 0;

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div className="card" style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
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
            disabled={!!activeTimer}
          >
            {characters.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.server ? ` (${c.server})` : ""}
              </option>
            ))}
          </select>
        )}

        <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <a className="secondaryButton" href="/m/planner/templates" style={{ lineHeight: "34px", textDecoration: "none" }}>
            Templates
          </a>
          <input
            className="textInput"
            placeholder="Filter…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            style={{ minWidth: 180 }}
          />
        </div>
      </div>

      <div className="card" style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <div>
          <div style={{ fontWeight: 700 }}>Today</div>
          <div style={{ opacity: 0.75, fontSize: 14 }}>
            daily: <code>{dailyKey}</code> · weekly: <code>{weeklyKey}</code>
          </div>
        </div>

        <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <button className="secondaryButton" onClick={() => applyRecommendation(30)} disabled={!selectedCharacterId}>
            Recommend 30m
          </button>
          <button className="secondaryButton" onClick={() => applyRecommendation(60)} disabled={!selectedCharacterId}>
            Recommend 60m
          </button>
        </div>
      </div>

      {recommendation ? (
        <div className="card">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ fontWeight: 700 }}>Recommendation</div>
            <div style={{ opacity: 0.75, fontSize: 14 }}>
              budget: {recommendation.budgetMinutes}m · total: {Math.round(recommendation.totalSeconds / 60)}m
            </div>
            <button className="secondaryButton" style={{ marginLeft: "auto" }} onClick={() => setRecommendation(null)}>
              Clear
            </button>
          </div>
          {recommendation.ids.length === 0 ? (
            <p style={{ marginBottom: 0, opacity: 0.8 }}>No tasks fit the budget.</p>
          ) : (
            <ul style={{ marginBottom: 0 }}>
              {recommendation.ids.map((id) => {
                const template = templates.find((t) => t.id === id);
                if (!template) return null;
                const avgSeconds = avgSecondsByTemplateId.get(id);
                const estimate = avgSeconds ? `${Math.round(avgSeconds / 60)}m avg` : `${template.estimatedMinutes ?? "?"}m est`;
                return (
                  <li key={id}>
                    {template.title} <span style={{ opacity: 0.75 }}>({estimate})</span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : null}

      {notice ? (
        <div className="card" style={{ borderColor: "#c7d2fe", background: "#eef2ff" }}>
          {notice}
        </div>
      ) : null}

      {activeTimer ? (
        <div className="card" style={{ borderColor: "#fcd34d", background: "#fffbeb" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <div style={{ fontWeight: 700 }}>
              Timer running:{" "}
              <span style={{ fontWeight: 600 }}>
                {templates.find((t) => t.id === activeTimer.templateId)?.title ?? activeTimer.templateId}
              </span>
            </div>
            <div style={{ opacity: 0.75 }}>elapsed: {formatSeconds(activeElapsed)}</div>
            <button className="primaryButton" style={{ marginLeft: "auto" }} onClick={() => void stopTimer()}>
              Stop & Save
            </button>
          </div>
        </div>
      ) : null}

      <div className="card">
        <div style={{ fontWeight: 700, marginBottom: 6 }}>
          Daily ({dailyCounts.done}/{dailyCounts.total})
        </div>
        {dailyTemplates.length === 0 ? (
          <p style={{ margin: 0, opacity: 0.75 }}>
            No daily templates. Create some in <a href="/m/planner/templates">Templates</a>.
          </p>
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            {dailyTemplates.map((template) => {
              const done = dailyDone.has(template.id);
              const avgSeconds = avgSecondsByTemplateId.get(template.id);
              return (
                <label
                  key={template.id}
                  style={{ display: "flex", gap: 10, alignItems: "center", justifyContent: "space-between" }}
                >
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <input
                      type="checkbox"
                      checked={done}
                      disabled={!selectedCharacterId}
                      onChange={(e) => void toggleCompletion(template.id, dailyKey, e.target.checked)}
                    />
                    <div>
                      <div style={{ fontWeight: 600 }}>{template.title}</div>
                      <div style={{ opacity: 0.75, fontSize: 13 }}>
                        {avgSeconds ? `avg ${Math.round(avgSeconds / 60)}m` : `est ${template.estimatedMinutes ?? "?"}m`}
                      </div>
                    </div>
                  </div>
                  <button
                    className="secondaryButton"
                    disabled={!selectedCharacterId || !!activeTimer}
                    onClick={() => void startTimer(template.id)}
                    type="button"
                  >
                    Start
                  </button>
                </label>
              );
            })}
          </div>
        )}
      </div>

      <div className="card">
        <div style={{ fontWeight: 700, marginBottom: 6 }}>Weekly</div>
        {weeklyTemplates.length === 0 ? (
          <p style={{ margin: 0, opacity: 0.75 }}>No weekly templates.</p>
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            {weeklyTemplates.map((template) => {
              const done = weeklyDone.has(template.id);
              const avgSeconds = avgSecondsByTemplateId.get(template.id);
              return (
                <label
                  key={template.id}
                  style={{ display: "flex", gap: 10, alignItems: "center", justifyContent: "space-between" }}
                >
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <input
                      type="checkbox"
                      checked={done}
                      disabled={!selectedCharacterId}
                      onChange={(e) => void toggleCompletion(template.id, weeklyKey, e.target.checked)}
                    />
                    <div>
                      <div style={{ fontWeight: 600 }}>{template.title}</div>
                      <div style={{ opacity: 0.75, fontSize: 13 }}>
                        {avgSeconds ? `avg ${Math.round(avgSeconds / 60)}m` : `est ${template.estimatedMinutes ?? "?"}m`}
                      </div>
                    </div>
                  </div>
                  <button
                    className="secondaryButton"
                    disabled={!selectedCharacterId || !!activeTimer}
                    onClick={() => void startTimer(template.id)}
                    type="button"
                  >
                    Start
                  </button>
                </label>
              );
            })}
          </div>
        )}
      </div>

      <div className="card">
        <div style={{ fontWeight: 700, marginBottom: 6 }}>Charge</div>
        {chargeTemplates.length === 0 ? (
          <p style={{ margin: 0, opacity: 0.75 }}>No charge templates.</p>
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            {chargeTemplates.map((template) => {
              const info = chargeInfoByTemplateId.get(template.id);
              const avgSeconds = avgSecondsByTemplateId.get(template.id);
              const nextMs = info?.nextRechargeAt ? info.nextRechargeAt - Date.now() : null;
              return (
                <div
                  key={template.id}
                  style={{ display: "flex", gap: 10, alignItems: "center", justifyContent: "space-between" }}
                >
                  <div>
                    <div style={{ fontWeight: 600 }}>{template.title}</div>
                    <div style={{ opacity: 0.75, fontSize: 13 }}>
                      {info ? (
                        <>
                          stacks: {info.available}/{info.maxStacks}
                          {nextMs !== null ? ` · next in ${formatCountdownMs(nextMs)}` : ""}
                        </>
                      ) : (
                        "loading…"
                      )}
                      {" · "}
                      {avgSeconds ? `avg ${Math.round(avgSeconds / 60)}m` : `est ${template.estimatedMinutes ?? "?"}m`}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      className="secondaryButton"
                      disabled={!selectedCharacterId || !!activeTimer}
                      onClick={() => void startTimer(template.id)}
                      type="button"
                    >
                      Start
                    </button>
                    <button
                      className="primaryButton"
                      disabled={!selectedCharacterId || !info || info.available <= 0}
                      onClick={() => void useCharge(template)}
                      type="button"
                    >
                      Use
                    </button>
                    <button
                      className="dangerButton"
                      disabled={!selectedCharacterId}
                      onClick={() => void undoCharge(template)}
                      type="button"
                    >
                      Undo
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
