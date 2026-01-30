export type BuildScoreUnit = "flat" | "percent";

export type BuildScoreCatalogItem = {
  id: string;
  label: string;
  unit: BuildScoreUnit;
};

// NOTE: This is a convenience catalog (users can add custom fields too).
// Labels aim to match commonly referenced AION2 terms (UI/community). Users can still rename them.
export const BUILD_SCORE_CATALOG: BuildScoreCatalogItem[] = [
  // Base attributes (주신 포인트/펫 등에서 자주 언급)
  { id: "builtin:power", label: "위력", unit: "flat" },
  { id: "builtin:agility", label: "민첩", unit: "flat" },
  { id: "builtin:accuracyStat", label: "정확", unit: "flat" },
  { id: "builtin:will", label: "의지", unit: "flat" },
  { id: "builtin:knowledge", label: "지식", unit: "flat" },
  { id: "builtin:stamina", label: "체력", unit: "flat" },

  // Offense
  { id: "builtin:atkFlat", label: "추가 공격력", unit: "flat" },
  { id: "builtin:atkMax", label: "최대 공격력", unit: "flat" },
  { id: "builtin:crit", label: "치명타", unit: "flat" },
  { id: "builtin:critDmgAmp", label: "치명타 피해 증폭", unit: "percent" },
  { id: "builtin:combatSpeed", label: "전투 속도", unit: "percent" },
  { id: "builtin:double", label: "강타", unit: "percent" },
  { id: "builtin:perfect", label: "완벽", unit: "percent" },
  { id: "builtin:pveAmp", label: "PvE 피해 증폭", unit: "percent" },
  { id: "builtin:pvpAmp", label: "PvP 피해 증폭", unit: "percent" },
  { id: "builtin:weaponAmp", label: "무기 피해 증폭", unit: "percent" },
  { id: "builtin:backAmp", label: "후방 피해 증폭", unit: "percent" },

  // Defense
  { id: "builtin:hp", label: "생명력", unit: "flat" },
  { id: "builtin:defense", label: "방어력", unit: "percent" },
  { id: "builtin:evasion", label: "회피", unit: "percent" },
  { id: "builtin:accuracy", label: "명중", unit: "percent" },
  { id: "builtin:block", label: "막기", unit: "percent" },
  { id: "builtin:critResist", label: "치명타 저항", unit: "percent" },
  { id: "builtin:ironwall", label: "철벽", unit: "percent" },
  { id: "builtin:regeneration", label: "재생", unit: "percent" },

  // CC
  { id: "builtin:ccHit", label: "상태이상 적중", unit: "percent" },
  { id: "builtin:ccResist", label: "상태이상 저항", unit: "percent" },

  // Utility / special (주신의 흔적/장비 옵션에서 자주 보이는 항목들)
  { id: "builtin:moveSpeed", label: "이동 속도", unit: "percent" },
  { id: "builtin:cooldownReduce", label: "재사용 시간 감소", unit: "percent" },
  { id: "builtin:spirit", label: "정신력", unit: "flat" },
  { id: "builtin:spiritCostReduce", label: "정신력 소모 감소", unit: "percent" },
  { id: "builtin:doubleResist", label: "강타 저항", unit: "percent" },
  { id: "builtin:perfectResist", label: "완벽 저항", unit: "percent" },
  { id: "builtin:ironwallPen", label: "철벽 관통", unit: "percent" },
  { id: "builtin:regenerationPen", label: "재생 관통", unit: "percent" },
  { id: "builtin:damageResist", label: "피해 내성", unit: "percent" },
  { id: "builtin:critDmgResist", label: "치명타 피해 내성", unit: "percent" },
  { id: "builtin:healTaken", label: "받는 치유량", unit: "percent" }
];
