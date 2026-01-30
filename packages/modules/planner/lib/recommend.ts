export type RecommendCandidate = {
  id: string;
  estimatedSeconds: number;
};

export type RecommendResult = {
  selected: RecommendCandidate[];
  totalSeconds: number;
  remainingSeconds: number;
};

export function recommendForBudget(
  candidates: RecommendCandidate[],
  budgetSeconds: number
): RecommendResult {
  const sorted = [...candidates]
    .filter((c) => Number.isFinite(c.estimatedSeconds) && c.estimatedSeconds > 0)
    .sort((a, b) => a.estimatedSeconds - b.estimatedSeconds);

  const selected: RecommendCandidate[] = [];
  let remainingSeconds = Math.max(0, budgetSeconds);

  for (const candidate of sorted) {
    if (candidate.estimatedSeconds <= remainingSeconds) {
      selected.push(candidate);
      remainingSeconds -= candidate.estimatedSeconds;
    }
  }

  const totalSeconds = budgetSeconds - remainingSeconds;
  return { selected, totalSeconds, remainingSeconds };
}

