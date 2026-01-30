import { describe, expect, it } from "vitest";

import { startTimerWithConfirm } from "./timer.js";

describe("startTimerWithConfirm", () => {
  it("starts when no current timer", () => {
    const res = startTimerWithConfirm({
      current: null,
      nextTemplateId: "t1",
      nowMs: 1234,
      resolveTitle: (id) => (id === "t1" ? "일일 원정" : id),
      confirmFn: () => {
        throw new Error("should not prompt");
      }
    });

    expect(res.next).toEqual({ templateId: "t1", startedAtMs: 1234 });
    expect(res.notice).toBe("타이머 시작: 일일 원정");
  });

  it("keeps current when same template clicked", () => {
    const res = startTimerWithConfirm({
      current: { templateId: "t1", startedAtMs: 1000 },
      nextTemplateId: "t1",
      nowMs: 2000,
      resolveTitle: (id) => (id === "t1" ? "일일 원정" : id),
      confirmFn: () => true
    });

    expect(res.next).toEqual({ templateId: "t1", startedAtMs: 1000 });
    expect(res.notice).toBe("이미 실행 중: 일일 원정");
  });

  it("does not switch when user cancels", () => {
    const res = startTimerWithConfirm({
      current: { templateId: "t1", startedAtMs: 1000 },
      nextTemplateId: "t2",
      nowMs: 2000,
      resolveTitle: (id) => (id === "t1" ? "일일 원정" : id === "t2" ? "주간 토벌" : id),
      confirmFn: () => false
    });

    expect(res.next).toEqual({ templateId: "t1", startedAtMs: 1000 });
    expect(res.notice).toBe("전환을 취소했습니다.");
  });

  it("switches when user confirms", () => {
    const res = startTimerWithConfirm({
      current: { templateId: "t1", startedAtMs: 1000 },
      nextTemplateId: "t2",
      nowMs: 2000,
      resolveTitle: (id) => (id === "t1" ? "일일 원정" : id === "t2" ? "주간 토벌" : id),
      confirmFn: () => true
    });

    expect(res.next).toEqual({ templateId: "t2", startedAtMs: 2000 });
    expect(res.notice).toBe("타이머 전환: 일일 원정 → 주간 토벌");
  });
});

