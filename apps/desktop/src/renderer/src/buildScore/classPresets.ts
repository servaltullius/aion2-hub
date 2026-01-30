export type BuildScoreClassId =
  | "gladiator"
  | "templar"
  | "assassin"
  | "ranger"
  | "sorcerer"
  | "spiritmaster"
  | "cleric"
  | "chanter";

export type BuildScorePresetMode = "pve" | "pvp";

export type BuildScoreClassDef = {
  id: BuildScoreClassId;
  label: string;
  aliases: string[];
};

export const BUILD_SCORE_CLASSES: BuildScoreClassDef[] = [
  { id: "gladiator", label: "검성", aliases: ["검성", "gladiator"] },
  { id: "templar", label: "수호성", aliases: ["수호성", "templar"] },
  { id: "assassin", label: "살성", aliases: ["살성", "assassin"] },
  { id: "ranger", label: "궁성", aliases: ["궁성", "ranger"] },
  { id: "sorcerer", label: "마도성", aliases: ["마도성", "sorcerer"] },
  { id: "spiritmaster", label: "정령성", aliases: ["정령성", "spiritmaster"] },
  { id: "cleric", label: "치유성", aliases: ["치유성", "cleric"] },
  { id: "chanter", label: "호법성", aliases: ["호법성", "chanter"] }
];

export type BuildScorePresetStat = {
  id: string;
  enabled: boolean;
  weight: number;
};

export type BuildScoreClassPreset = {
  id: string;
  label: string;
  description: string;
  classId: BuildScoreClassId;
  stats: BuildScorePresetStat[];
};

function normalize(raw: string) {
  return raw.trim().replace(/\s+/g, "").toLowerCase();
}

export function detectBuildScoreClassId(raw: string | null): BuildScoreClassId | null {
  const input = typeof raw === "string" ? normalize(raw) : "";
  if (!input) return null;
  for (const cls of BUILD_SCORE_CLASSES) {
    for (const alias of cls.aliases) {
      if (normalize(alias) === input) return cls.id;
    }
  }
  return null;
}

// NOTE: These are recommended *starting points* (PvE-ish) based on commonly referenced scoring priorities
// (전투 속도 / 위력 / 피해 증폭 / 치명타 피해 증폭 등). Users are expected to tune weights.
export const BUILD_SCORE_CLASS_PRESETS: BuildScoreClassPreset[] = [
  {
    id: "pve:gladiator",
    classId: "gladiator",
    label: "검성 (추천 · PvE)",
    description: "전투 속도/위력/피해 증폭을 기본으로, 강타(다단 히트 계열)를 조금 더 반영합니다.",
    stats: [
      { id: "builtin:combatSpeed", enabled: true, weight: 3 },
      { id: "builtin:power", enabled: true, weight: 2 },
      { id: "builtin:pveAmp", enabled: true, weight: 3 },
      { id: "builtin:weaponAmp", enabled: true, weight: 2 },
      { id: "builtin:critDmgAmp", enabled: true, weight: 2 },
      { id: "builtin:double", enabled: true, weight: 2 },
      { id: "builtin:crit", enabled: true, weight: 1 }
    ]
  },
  {
    id: "pve:templar",
    classId: "templar",
    label: "수호성 (추천 · PvE)",
    description: "딜 중심 세팅 점수용. 생존 지표(생명력/방어력)를 소폭 포함합니다.",
    stats: [
      { id: "builtin:combatSpeed", enabled: true, weight: 3 },
      { id: "builtin:power", enabled: true, weight: 2 },
      { id: "builtin:pveAmp", enabled: true, weight: 3 },
      { id: "builtin:weaponAmp", enabled: true, weight: 2 },
      { id: "builtin:critDmgAmp", enabled: true, weight: 2 },
      { id: "builtin:hp", enabled: true, weight: 1 },
      { id: "builtin:defense", enabled: true, weight: 1 }
    ]
  },
  {
    id: "pve:assassin",
    classId: "assassin",
    label: "살성 (추천 · PvE)",
    description: "전투 속도/위력/피해 증폭 중심 + 후방 피해 증폭을 조금 더 반영합니다.",
    stats: [
      { id: "builtin:combatSpeed", enabled: true, weight: 3 },
      { id: "builtin:power", enabled: true, weight: 2 },
      { id: "builtin:pveAmp", enabled: true, weight: 3 },
      { id: "builtin:weaponAmp", enabled: true, weight: 2 },
      { id: "builtin:critDmgAmp", enabled: true, weight: 2 },
      { id: "builtin:backAmp", enabled: true, weight: 2 },
      { id: "builtin:crit", enabled: true, weight: 1 }
    ]
  },
  {
    id: "pve:ranger",
    classId: "ranger",
    label: "궁성 (추천 · PvE)",
    description: "전투 속도/위력/피해 증폭 중심 + 명중/치명타를 조금 더 반영합니다.",
    stats: [
      { id: "builtin:combatSpeed", enabled: true, weight: 3 },
      { id: "builtin:power", enabled: true, weight: 2 },
      { id: "builtin:pveAmp", enabled: true, weight: 3 },
      { id: "builtin:weaponAmp", enabled: true, weight: 2 },
      { id: "builtin:critDmgAmp", enabled: true, weight: 2 },
      { id: "builtin:accuracy", enabled: true, weight: 1 },
      { id: "builtin:crit", enabled: true, weight: 1 }
    ]
  },
  {
    id: "pve:sorcerer",
    classId: "sorcerer",
    label: "마도성 (추천 · PvE)",
    description: "전투 속도/위력/피해 증폭/치명타 피해 증폭 위주(강타·완벽은 비중을 낮게).",
    stats: [
      { id: "builtin:combatSpeed", enabled: true, weight: 3 },
      { id: "builtin:power", enabled: true, weight: 2 },
      { id: "builtin:pveAmp", enabled: true, weight: 3 },
      { id: "builtin:weaponAmp", enabled: true, weight: 2 },
      { id: "builtin:critDmgAmp", enabled: true, weight: 2 },
      { id: "builtin:crit", enabled: true, weight: 1 }
    ]
  },
  {
    id: "pve:spiritmaster",
    classId: "spiritmaster",
    label: "정령성 (추천 · PvE)",
    description: "마도성 계열과 유사 + 정신력(마나) 지표를 소폭 포함합니다.",
    stats: [
      { id: "builtin:combatSpeed", enabled: true, weight: 3 },
      { id: "builtin:power", enabled: true, weight: 2 },
      { id: "builtin:pveAmp", enabled: true, weight: 3 },
      { id: "builtin:weaponAmp", enabled: true, weight: 2 },
      { id: "builtin:critDmgAmp", enabled: true, weight: 2 },
      { id: "builtin:spirit", enabled: true, weight: 1 }
    ]
  },
  {
    id: "pve:cleric",
    classId: "cleric",
    label: "치유성 (추천 · PvE)",
    description: "기본 딜 지표 중심. 강타/완벽은 취향에 따라 추가로 올리는 편이라 가중치는 낮게 둡니다.",
    stats: [
      { id: "builtin:combatSpeed", enabled: true, weight: 3 },
      { id: "builtin:power", enabled: true, weight: 2 },
      { id: "builtin:pveAmp", enabled: true, weight: 3 },
      { id: "builtin:weaponAmp", enabled: true, weight: 2 },
      { id: "builtin:critDmgAmp", enabled: true, weight: 2 },
      { id: "builtin:double", enabled: true, weight: 1 },
      { id: "builtin:perfect", enabled: true, weight: 1 }
    ]
  },
  {
    id: "pve:chanter",
    classId: "chanter",
    label: "호법성 (추천 · PvE)",
    description: "기본 딜 지표 중심 + 생존(생명력)을 소폭 포함합니다.",
    stats: [
      { id: "builtin:combatSpeed", enabled: true, weight: 3 },
      { id: "builtin:power", enabled: true, weight: 2 },
      { id: "builtin:pveAmp", enabled: true, weight: 3 },
      { id: "builtin:weaponAmp", enabled: true, weight: 2 },
      { id: "builtin:critDmgAmp", enabled: true, weight: 2 },
      { id: "builtin:hp", enabled: true, weight: 1 }
    ]
  },

  // PvP presets (recommended starting points; tune as needed)
  {
    id: "pvp:gladiator",
    classId: "gladiator",
    label: "검성 (추천 · PvP)",
    description: "PvP 피해 증폭/전투 속도/위력 중심 + 생존 지표(피해 내성/치명 저항/상저)를 소폭 포함합니다.",
    stats: [
      { id: "builtin:pvpAmp", enabled: true, weight: 3 },
      { id: "builtin:combatSpeed", enabled: true, weight: 2 },
      { id: "builtin:power", enabled: true, weight: 2 },
      { id: "builtin:weaponAmp", enabled: true, weight: 2 },
      { id: "builtin:critDmgAmp", enabled: true, weight: 2 },
      { id: "builtin:damageResist", enabled: true, weight: 1 },
      { id: "builtin:critResist", enabled: true, weight: 1 },
      { id: "builtin:ccResist", enabled: true, weight: 1 }
    ]
  },
  {
    id: "pvp:templar",
    classId: "templar",
    label: "수호성 (추천 · PvP)",
    description: "생존 지표 비중을 조금 높이고, 기본 딜 지표도 같이 봅니다.",
    stats: [
      { id: "builtin:pvpAmp", enabled: true, weight: 2 },
      { id: "builtin:combatSpeed", enabled: true, weight: 2 },
      { id: "builtin:power", enabled: true, weight: 1 },
      { id: "builtin:weaponAmp", enabled: true, weight: 1 },
      { id: "builtin:damageResist", enabled: true, weight: 2 },
      { id: "builtin:critResist", enabled: true, weight: 2 },
      { id: "builtin:ccResist", enabled: true, weight: 1 },
      { id: "builtin:hp", enabled: true, weight: 1 }
    ]
  },
  {
    id: "pvp:assassin",
    classId: "assassin",
    label: "살성 (추천 · PvP)",
    description: "PvP 피해 증폭/전투 속도/후방 피해 증폭 중심 + 기동성(이동 속도)을 소폭 포함합니다.",
    stats: [
      { id: "builtin:pvpAmp", enabled: true, weight: 3 },
      { id: "builtin:combatSpeed", enabled: true, weight: 2 },
      { id: "builtin:power", enabled: true, weight: 2 },
      { id: "builtin:weaponAmp", enabled: true, weight: 2 },
      { id: "builtin:critDmgAmp", enabled: true, weight: 2 },
      { id: "builtin:backAmp", enabled: true, weight: 2 },
      { id: "builtin:moveSpeed", enabled: true, weight: 1 }
    ]
  },
  {
    id: "pvp:ranger",
    classId: "ranger",
    label: "궁성 (추천 · PvP)",
    description: "PvP 피해 증폭/전투 속도 중심 + 명중/기동성(이동 속도)을 소폭 포함합니다.",
    stats: [
      { id: "builtin:pvpAmp", enabled: true, weight: 3 },
      { id: "builtin:combatSpeed", enabled: true, weight: 2 },
      { id: "builtin:power", enabled: true, weight: 2 },
      { id: "builtin:weaponAmp", enabled: true, weight: 2 },
      { id: "builtin:critDmgAmp", enabled: true, weight: 2 },
      { id: "builtin:accuracy", enabled: true, weight: 1 },
      { id: "builtin:moveSpeed", enabled: true, weight: 1 }
    ]
  },
  {
    id: "pvp:sorcerer",
    classId: "sorcerer",
    label: "마도성 (추천 · PvP)",
    description: "PvP 피해 증폭/전투 속도/치명 피해 증폭 중심 + 상태이상 적중/재감(취향)을 소폭 포함합니다.",
    stats: [
      { id: "builtin:pvpAmp", enabled: true, weight: 3 },
      { id: "builtin:combatSpeed", enabled: true, weight: 2 },
      { id: "builtin:power", enabled: true, weight: 2 },
      { id: "builtin:weaponAmp", enabled: true, weight: 2 },
      { id: "builtin:critDmgAmp", enabled: true, weight: 2 },
      { id: "builtin:ccHit", enabled: true, weight: 1 },
      { id: "builtin:cooldownReduce", enabled: true, weight: 1 }
    ]
  },
  {
    id: "pvp:spiritmaster",
    classId: "spiritmaster",
    label: "정령성 (추천 · PvP)",
    description: "마도성 계열과 유사 + 정신력/상태이상 적중을 소폭 포함합니다.",
    stats: [
      { id: "builtin:pvpAmp", enabled: true, weight: 3 },
      { id: "builtin:combatSpeed", enabled: true, weight: 2 },
      { id: "builtin:power", enabled: true, weight: 2 },
      { id: "builtin:weaponAmp", enabled: true, weight: 2 },
      { id: "builtin:critDmgAmp", enabled: true, weight: 2 },
      { id: "builtin:ccHit", enabled: true, weight: 1 },
      { id: "builtin:spirit", enabled: true, weight: 1 }
    ]
  },
  {
    id: "pvp:cleric",
    classId: "cleric",
    label: "치유성 (추천 · PvP)",
    description: "딜 지표 + 생존/유틸(받는 치유량/피해 내성/상저)을 함께 봅니다.",
    stats: [
      { id: "builtin:pvpAmp", enabled: true, weight: 2 },
      { id: "builtin:combatSpeed", enabled: true, weight: 2 },
      { id: "builtin:power", enabled: true, weight: 1 },
      { id: "builtin:weaponAmp", enabled: true, weight: 1 },
      { id: "builtin:healTaken", enabled: true, weight: 2 },
      { id: "builtin:damageResist", enabled: true, weight: 1 },
      { id: "builtin:ccResist", enabled: true, weight: 1 }
    ]
  },
  {
    id: "pvp:chanter",
    classId: "chanter",
    label: "호법성 (추천 · PvP)",
    description: "딜 지표 + 생존(생명력/피해 내성)을 소폭 포함합니다.",
    stats: [
      { id: "builtin:pvpAmp", enabled: true, weight: 2 },
      { id: "builtin:combatSpeed", enabled: true, weight: 2 },
      { id: "builtin:power", enabled: true, weight: 1 },
      { id: "builtin:weaponAmp", enabled: true, weight: 1 },
      { id: "builtin:hp", enabled: true, weight: 1 },
      { id: "builtin:damageResist", enabled: true, weight: 1 },
      { id: "builtin:ccResist", enabled: true, weight: 1 }
    ]
  }
];

export function getBuildScoreClassPreset(presetId: string): BuildScoreClassPreset | null {
  return BUILD_SCORE_CLASS_PRESETS.find((p) => p.id === presetId) ?? null;
}

export function getBuildScoreClassPresetBy(mode: BuildScorePresetMode, classId: BuildScoreClassId): BuildScoreClassPreset | null {
  return getBuildScoreClassPreset(`${mode}:${classId}`);
}

export function getSuggestedPresetIdForClass(rawClass: string | null, mode: BuildScorePresetMode): string | null {
  const classId = detectBuildScoreClassId(rawClass);
  if (!classId) return null;
  const preset = getBuildScoreClassPresetBy(mode, classId);
  return preset?.id ?? null;
}
