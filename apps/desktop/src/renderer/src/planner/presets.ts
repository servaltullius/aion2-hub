export type PlannerTemplateType = "DAILY" | "WEEKLY" | "CHARGE";

export type PlannerPresetTemplate = {
  title: string;
  type: PlannerTemplateType;
  estimateMinutes: number;
  rechargeHours: number | null;
  maxStacks: number | null;
};

export type PlannerPreset = {
  id: string;
  name: string;
  description: string;
  templates: PlannerPresetTemplate[];
};

export const PLANNER_PRESETS: PlannerPreset[] = [
  {
    id: "aion2-content-v1",
    name: "아이온2 컨텐츠 프리셋 (v1)",
    description: "원정/토벌/어비스 등 대표 컨텐츠를 기준으로 템플릿을 한 번에 추가합니다. 서버/패치에 따라 조정이 필요할 수 있어요.",
    templates: [
      // DAILY
      { title: "일일 원정", type: "DAILY", estimateMinutes: 25, rechargeHours: null, maxStacks: null },
      { title: "일일 토벌", type: "DAILY", estimateMinutes: 20, rechargeHours: null, maxStacks: null },
      { title: "일일 어비스", type: "DAILY", estimateMinutes: 20, rechargeHours: null, maxStacks: null },
      { title: "일일 임무/퀘스트", type: "DAILY", estimateMinutes: 20, rechargeHours: null, maxStacks: null },
      { title: "일일 이벤트", type: "DAILY", estimateMinutes: 15, rechargeHours: null, maxStacks: null },
      { title: "일일 필드보스/필드 컨텐츠", type: "DAILY", estimateMinutes: 15, rechargeHours: null, maxStacks: null },
      { title: "일일 제작/채집", type: "DAILY", estimateMinutes: 10, rechargeHours: null, maxStacks: null },
      { title: "일일 강화/재료 정리", type: "DAILY", estimateMinutes: 10, rechargeHours: null, maxStacks: null },

      // WEEKLY
      { title: "주간 원정", type: "WEEKLY", estimateMinutes: 60, rechargeHours: null, maxStacks: null },
      { title: "주간 토벌", type: "WEEKLY", estimateMinutes: 60, rechargeHours: null, maxStacks: null },
      { title: "주간 어비스", type: "WEEKLY", estimateMinutes: 60, rechargeHours: null, maxStacks: null },
      { title: "주간 임무/주간 보상", type: "WEEKLY", estimateMinutes: 45, rechargeHours: null, maxStacks: null },
      { title: "주간 이벤트", type: "WEEKLY", estimateMinutes: 30, rechargeHours: null, maxStacks: null },

      // CHARGE (티켓/충전형)
      { title: "원정 티켓", type: "CHARGE", estimateMinutes: 0, rechargeHours: 24, maxStacks: 1 },
      { title: "토벌 티켓", type: "CHARGE", estimateMinutes: 0, rechargeHours: 24, maxStacks: 1 },
      { title: "어비스 티켓", type: "CHARGE", estimateMinutes: 0, rechargeHours: 24, maxStacks: 1 },
      { title: "추가 보상/드랍 티켓", type: "CHARGE", estimateMinutes: 0, rechargeHours: 24, maxStacks: 1 }
    ]
  }
];

