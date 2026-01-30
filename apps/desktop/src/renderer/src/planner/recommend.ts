export type PlannerRecommendItem = {
  templateId: string;
  estimateMinutes: number;
};

export type PlannerRecommendPick = {
  templateId: string;
  estimateMinutes: number;
  source: "avg" | "estimate";
};

export function recommendPlannerItems(input: {
  budgetMinutes: number;
  items: PlannerRecommendItem[];
  avgSecondsByTemplateId?: Map<string, number>;
}): { picked: PlannerRecommendPick[]; totalMinutes: number } {
  const budgetMinutes = Math.max(0, Math.floor(input.budgetMinutes));

  const candidates: PlannerRecommendPick[] = input.items.map((it) => {
    const avgSeconds = input.avgSecondsByTemplateId?.get(it.templateId);
    if (typeof avgSeconds === "number" && Number.isFinite(avgSeconds) && avgSeconds > 0) {
      const m = Math.min(240, Math.max(1, Math.round(avgSeconds / 60)));
      return { templateId: it.templateId, estimateMinutes: m, source: "avg" };
    }

    const base = typeof it.estimateMinutes === "number" && Number.isFinite(it.estimateMinutes) ? it.estimateMinutes : 0;
    const fallback = base <= 0 ? 5 : base;
    const m = Math.min(240, Math.max(1, Math.round(fallback)));
    return { templateId: it.templateId, estimateMinutes: m, source: "estimate" };
  });

  const ordered = [...candidates].sort((a, b) => a.estimateMinutes - b.estimateMinutes);
  const picked: PlannerRecommendPick[] = [];
  let sum = 0;
  for (const it of ordered) {
    if (sum + it.estimateMinutes > budgetMinutes) continue;
    picked.push(it);
    sum += it.estimateMinutes;
  }

  return { picked, totalMinutes: sum };
}

