export type ActiveTimer = { templateId: string; startedAtMs: number };

export function startTimerWithConfirm(input: {
  current: ActiveTimer | null;
  nextTemplateId: string;
  nowMs: number;
  resolveTitle: (templateId: string) => string;
  confirmFn: (message: string) => boolean;
}): { next: ActiveTimer | null; notice: string | null } {
  const nextTitle = input.resolveTitle(input.nextTemplateId) || input.nextTemplateId;

  if (!input.current) {
    return { next: { templateId: input.nextTemplateId, startedAtMs: input.nowMs }, notice: `타이머 시작: ${nextTitle}` };
  }

  const currentTitle = input.resolveTitle(input.current.templateId) || input.current.templateId;

  if (input.current.templateId === input.nextTemplateId) {
    return { next: input.current, notice: `이미 실행 중: ${currentTitle}` };
  }

  const ok = input.confirmFn(
    `타이머가 실행 중입니다.\n\n현재: ${currentTitle}\n새로 시작: ${nextTitle}\n\n기존 타이머를 취소하고 전환할까요?\n(저장되지 않습니다)`
  );
  if (!ok) return { next: input.current, notice: "전환을 취소했습니다." };

  return { next: { templateId: input.nextTemplateId, startedAtMs: input.nowMs }, notice: `타이머 전환: ${currentTitle} → ${nextTitle}` };
}

