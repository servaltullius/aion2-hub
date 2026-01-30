"use client";

import { useEffect, useState } from "react";

import { plannerDb } from "../lib/db.js";
import type { PlannerTemplate, PlannerTemplateType } from "../lib/types.js";

type Draft = {
  title: string;
  type: PlannerTemplateType;
  estimatedMinutes: string;
  maxStacks: string;
  rechargeHours: string;
};

function sortTemplates(a: PlannerTemplate, b: PlannerTemplate): number {
  return a.sort - b.sort;
}

export default function PlannerTemplatesPage() {
  const [templates, setTemplates] = useState<PlannerTemplate[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>({
    title: "",
    type: "daily",
    estimatedMinutes: "",
    maxStacks: "1",
    rechargeHours: "24"
  });

  async function reload() {
    const loaded = await plannerDb.templates.toArray();
    setTemplates(loaded.sort(sortTemplates));
  }

  useEffect(() => {
    void reload();
  }, []);

  async function addTemplate() {
    setNotice(null);
    const title = draft.title.trim();
    if (!title) {
      setNotice("Title is required.");
      return;
    }

    const estimatedMinutes = Number(draft.estimatedMinutes);
    const maxStacks = Number(draft.maxStacks);
    const rechargeHours = Number(draft.rechargeHours);

    const id = crypto.randomUUID();
    const base: PlannerTemplate = {
      id,
      title,
      type: draft.type,
      enabled: true,
      sort: Date.now()
    };

    const next: PlannerTemplate =
      draft.type === "charge"
        ? {
            ...base,
            estimatedMinutes: Number.isFinite(estimatedMinutes) && estimatedMinutes > 0 ? estimatedMinutes : undefined,
            maxStacks: Number.isFinite(maxStacks) && maxStacks > 0 ? maxStacks : 1,
            rechargeHours: Number.isFinite(rechargeHours) && rechargeHours > 0 ? rechargeHours : 24
          }
        : {
            ...base,
            estimatedMinutes: Number.isFinite(estimatedMinutes) && estimatedMinutes > 0 ? estimatedMinutes : undefined,
            maxStacks: undefined,
            rechargeHours: undefined
          };

    await plannerDb.templates.put(next);
    setDraft((d) => ({ ...d, title: "" }));
    await reload();
  }

  async function updateTemplate(template: PlannerTemplate) {
    setNotice(null);
    const title = template.title.trim();
    if (!title) {
      setNotice("Title is required.");
      return;
    }

    const estimatedMinutes =
      template.estimatedMinutes !== undefined && Number.isFinite(template.estimatedMinutes) && template.estimatedMinutes > 0
        ? template.estimatedMinutes
        : undefined;

    const normalized: PlannerTemplate =
      template.type === "charge"
        ? {
            ...template,
            title,
            estimatedMinutes,
            maxStacks:
              template.maxStacks !== undefined && Number.isFinite(template.maxStacks) && template.maxStacks > 0
                ? Math.floor(template.maxStacks)
                : 1,
            rechargeHours:
              template.rechargeHours !== undefined && Number.isFinite(template.rechargeHours) && template.rechargeHours > 0
                ? Math.floor(template.rechargeHours)
                : 24
          }
        : { ...template, title, estimatedMinutes, maxStacks: undefined, rechargeHours: undefined };

    await plannerDb.templates.put(normalized);
    await reload();
  }

  async function removeTemplate(id: string) {
    setNotice(null);
    await plannerDb.templates.delete(id);
    await plannerDb.completions.where("templateId").equals(id).delete();
    await plannerDb.durations.where("templateId").equals(id).delete();
    await plannerDb.chargeUses.where("templateId").equals(id).delete();
    await reload();
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div className="card" style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontWeight: 700 }}>Templates</div>
          <div style={{ opacity: 0.75, fontSize: 14 }}>숙제 정의(일일/주간/충전형)</div>
        </div>
        <a
          className="secondaryButton"
          href="/m/planner/today"
          style={{ marginLeft: "auto", lineHeight: "34px", textDecoration: "none" }}
        >
          Back to Today
        </a>
      </div>

      {notice ? (
        <div className="card" style={{ borderColor: "#fecaca", background: "#fef2f2", color: "#991b1b" }}>
          {notice}
        </div>
      ) : null}

      <div className="card" style={{ display: "grid", gap: 10 }}>
        <div style={{ fontWeight: 700 }}>Add template</div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <input
            className="textInput"
            placeholder="Title"
            value={draft.title}
            onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
          />
          <select
            className="textInput"
            value={draft.type}
            onChange={(e) => setDraft((d) => ({ ...d, type: e.target.value as PlannerTemplateType }))}
          >
            <option value="daily">daily</option>
            <option value="weekly">weekly</option>
            <option value="charge">charge</option>
          </select>
          <input
            className="textInput"
            style={{ width: 130, minWidth: 130 }}
            placeholder="Est (min)"
            inputMode="numeric"
            value={draft.estimatedMinutes}
            onChange={(e) => setDraft((d) => ({ ...d, estimatedMinutes: e.target.value }))}
          />
          {draft.type === "charge" ? (
            <>
              <input
                className="textInput"
                style={{ width: 130, minWidth: 130 }}
                placeholder="Max stacks"
                inputMode="numeric"
                value={draft.maxStacks}
                onChange={(e) => setDraft((d) => ({ ...d, maxStacks: e.target.value }))}
              />
              <input
                className="textInput"
                style={{ width: 130, minWidth: 130 }}
                placeholder="Recharge (h)"
                inputMode="numeric"
                value={draft.rechargeHours}
                onChange={(e) => setDraft((d) => ({ ...d, rechargeHours: e.target.value }))}
              />
            </>
          ) : null}
          <button className="primaryButton" onClick={() => void addTemplate()}>
            Add
          </button>
        </div>
      </div>

      <div className="card" style={{ display: "grid", gap: 10 }}>
        <div style={{ fontWeight: 700 }}>Existing</div>
        {templates.length === 0 ? (
          <p style={{ margin: 0, opacity: 0.75 }}>No templates yet.</p>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {templates.map((template) => (
              <div key={template.id} style={{ display: "grid", gap: 8, padding: 10, border: "1px solid #e5e7eb", borderRadius: 12 }}>
                <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                  <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input
                      type="checkbox"
                      checked={template.enabled}
                      onChange={(e) =>
                        setTemplates((list) =>
                          list.map((t) => (t.id === template.id ? { ...t, enabled: e.target.checked } : t))
                        )
                      }
                    />
                    enabled
                  </label>
                  <code style={{ opacity: 0.7 }}>{template.id.slice(0, 8)}</code>
                </div>

                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                  <input
                    className="textInput"
                    value={template.title}
                    onChange={(e) =>
                      setTemplates((list) =>
                        list.map((t) => (t.id === template.id ? { ...t, title: e.target.value } : t))
                      )
                    }
                  />
                  <select
                    className="textInput"
                    value={template.type}
                    onChange={(e) =>
                      setTemplates((list) =>
                        list.map((t) =>
                          t.id === template.id ? { ...t, type: e.target.value as PlannerTemplateType } : t
                        )
                      )
                    }
                  >
                    <option value="daily">daily</option>
                    <option value="weekly">weekly</option>
                    <option value="charge">charge</option>
                  </select>
                  <input
                    className="textInput"
                    style={{ width: 130, minWidth: 130 }}
                    placeholder="Est (min)"
                    inputMode="numeric"
                    value={template.estimatedMinutes ?? ""}
                    onChange={(e) =>
                      setTemplates((list) =>
                        list.map((t) =>
                          t.id === template.id
                            ? { ...t, estimatedMinutes: e.target.value ? Number(e.target.value) : undefined }
                            : t
                        )
                      )
                    }
                  />
                  {template.type === "charge" ? (
                    <>
                      <input
                        className="textInput"
                        style={{ width: 130, minWidth: 130 }}
                        placeholder="Max stacks"
                        inputMode="numeric"
                        value={template.maxStacks ?? 1}
                        onChange={(e) =>
                          setTemplates((list) =>
                            list.map((t) =>
                              t.id === template.id ? { ...t, maxStacks: Number(e.target.value) } : t
                            )
                          )
                        }
                      />
                      <input
                        className="textInput"
                        style={{ width: 130, minWidth: 130 }}
                        placeholder="Recharge (h)"
                        inputMode="numeric"
                        value={template.rechargeHours ?? 24}
                        onChange={(e) =>
                          setTemplates((list) =>
                            list.map((t) =>
                              t.id === template.id ? { ...t, rechargeHours: Number(e.target.value) } : t
                            )
                          )
                        }
                      />
                    </>
                  ) : null}
                  <button className="secondaryButton" onClick={() => void updateTemplate(template)}>
                    Save
                  </button>
                  <button className="dangerButton" onClick={() => void removeTemplate(template.id)}>
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
