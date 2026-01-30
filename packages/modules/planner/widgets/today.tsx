"use client";

import { useEffect, useState } from "react";

import { getOrCreatePlannerSettings, plannerDb } from "../lib/db.js";
import { loadSelectedCharacterId, subscribeSelectedCharacterId } from "../lib/hubCharacters.js";
import { getDailyPeriodKey } from "../lib/period.js";

export default function PlannerTodayWidget() {
  const [status, setStatus] = useState<
    | { kind: "loading" }
    | { kind: "no-character" }
    | { kind: "ready"; done: number; total: number }
    | { kind: "error"; message: string }
  >({ kind: "loading" });

  useEffect(() => {
    let active = true;

    async function refresh() {
      try {
        const characterId = loadSelectedCharacterId();
        if (!characterId) {
          if (active) setStatus({ kind: "no-character" });
          return;
        }

        const settings = await getOrCreatePlannerSettings();
        const dailyKey = getDailyPeriodKey(new Date(), settings.dailyResetHour);
        const templates = await plannerDb.templates
          .where("type")
          .equals("daily")
          .filter((t) => t.enabled)
          .toArray();
        const completions = await plannerDb.completions.where("[characterId+periodKey]").equals([characterId, dailyKey]).toArray();

        const done = completions.length;
        const total = templates.length;
        if (active) setStatus({ kind: "ready", done, total });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        if (active) setStatus({ kind: "error", message });
      }
    }

    void refresh();
    const unsubscribe = subscribeSelectedCharacterId(() => void refresh());
    const intervalId = window.setInterval(() => void refresh(), 10_000);

    return () => {
      active = false;
      unsubscribe();
      window.clearInterval(intervalId);
    };
  }, []);

  return (
    <div>
      <div style={{ fontWeight: 700 }}>오늘 숙제</div>
      {status.kind === "loading" ? <div style={{ opacity: 0.8 }}>Loading…</div> : null}
      {status.kind === "no-character" ? (
        <div style={{ opacity: 0.8 }}>Select a character in Planner.</div>
      ) : null}
      {status.kind === "ready" ? (
        <div style={{ opacity: 0.8 }}>
          {status.done}/{status.total} 완료
        </div>
      ) : null}
      {status.kind === "error" ? (
        <div style={{ opacity: 0.8 }}>
          Error: <code>{status.message}</code>
        </div>
      ) : null}
    </div>
  );
}
