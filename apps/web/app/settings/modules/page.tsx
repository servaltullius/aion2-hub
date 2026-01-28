"use client";

import { getModules } from "@aion2/core";
import { useEffect, useMemo, useState } from "react";

import "../../../lib/moduleRegistry";
import { loadEnabledModuleIds, saveEnabledModuleIds } from "../../../lib/moduleToggleStore";

export default function SettingsModulesPage() {
  const modules = useMemo(() => getModules(), []);
  const [enabled, setEnabled] = useState<Set<string>>(new Set(modules.map((m) => m.id)));

  useEffect(() => {
    const saved = loadEnabledModuleIds();
    if (saved.length > 0) setEnabled(new Set(saved));
  }, []);

  function toggle(id: string) {
    const next = new Set(enabled);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setEnabled(next);
    saveEnabledModuleIds(Array.from(next));
  }

  return (
    <main>
      <h2>Modules</h2>
      <p style={{ marginTop: 0 }}>
        모듈 토글은 로컬에 저장됩니다. (현재는 UI만 제공 — nav/라우팅 필터링은 다음 단계에서 적용)
      </p>

      <div style={{ display: "grid", gap: 10 }}>
        {modules.map((module) => (
          <label key={module.id} style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <input
              type="checkbox"
              checked={enabled.has(module.id)}
              onChange={() => toggle(module.id)}
            />
            <div>
              <div style={{ fontWeight: 700 }}>{module.name}</div>
              <div style={{ opacity: 0.75, fontSize: 14 }}>
                <code>{module.id}</code> · permission: <code>{module.permission}</code>
              </div>
            </div>
          </label>
        ))}
      </div>
    </main>
  );
}
