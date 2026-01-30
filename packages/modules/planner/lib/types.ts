export type PlannerTemplateType = "daily" | "weekly" | "charge";

export type PlannerTemplate = {
  id: string;
  title: string;
  type: PlannerTemplateType;
  enabled: boolean;
  sort: number;
  estimatedMinutes?: number | undefined;
  maxStacks?: number | undefined;
  rechargeHours?: number | undefined;
};

export type PlannerCompletion = {
  characterId: string;
  templateId: string;
  periodKey: string;
  completedAt: number;
};

export type PlannerDuration = {
  id?: number | undefined;
  characterId: string;
  templateId: string;
  startedAt: number;
  endedAt: number;
  seconds: number;
};

export type PlannerChargeUse = {
  id?: number | undefined;
  characterId: string;
  templateId: string;
  usedAt: number;
};

export type PlannerSettings = {
  id: "settings";
  dailyResetHour: number;
  weeklyResetDay: number; // 0(Sun)~6(Sat)
  weeklyResetHour: number;
};

