# Desktop Hotspots Split Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Reduce maintenance risk by splitting the largest Desktop renderer pages into smaller files (components + small helper modules) **without behavior changes**.

**Architecture:** Keep page entrypoints stable (App imports stay the same). Move pure parsing/formatting helpers into `apps/desktop/src/renderer/src/pages/planner/*/model.ts` and split big JSX sections into focused components under the same folder tree.

**Tech Stack:** React (Electron renderer), TypeScript, Vitest, Tailwind.

---

## Scope (Top 3 hotspots)

- `apps/desktop/src/renderer/src/pages/BuildScorePage.tsx`
- `apps/desktop/src/renderer/src/pages/PlannerTodayPage.tsx`
- `apps/desktop/src/renderer/src/pages/PlannerTemplatesPage.tsx`

Non-goals:
- No styling redesign
- No behavior or data model changes
- No IPC changes

---

### Task 0: Baseline verification (worktree)

**Files:** none

**Step 1: Run desktop tests**

Run: `pnpm --filter desktop test`
Expected: PASS

**Step 2: Run full repo tests (optional)**

Run: `pnpm test`
Expected: PASS

**Step 3: Commit?**

No commit (baseline).

---

### Task 1: Extract Planner Today parsing/helpers into `model.ts`

**Files:**
- Create: `apps/desktop/src/renderer/src/pages/planner/today/model.ts`
- Create: `apps/desktop/src/renderer/src/pages/planner/today/model.test.ts`
- Modify: `apps/desktop/src/renderer/src/pages/PlannerTodayPage.tsx`

**Step 1: Write failing tests for parsing**

Create `apps/desktop/src/renderer/src/pages/planner/today/model.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { asOverview, asDurationStats } from "./model.js";

describe("planner today model parsing", () => {
  it("returns null for invalid overview payload", () => {
    expect(asOverview(null)).toBeNull();
    expect(asOverview({})).toBeNull();
  });

  it("parses duration stats list", () => {
    const out = asDurationStats([{ templateId: "t1", count: 1, totalSeconds: 10, avgSeconds: 10 }]);
    expect(out?.[0]?.templateId).toBe("t1");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm --filter desktop test -- pages/planner/today/model.test.ts`
Expected: FAIL (module not found / exports missing)

**Step 3: Implement `model.ts`**

Create `apps/desktop/src/renderer/src/pages/planner/today/model.ts` and move these from `PlannerTodayPage.tsx`:
- Types: `PlannerTemplateType`, `ChecklistItem`, `ChargeItem`, `PlannerOverview`, `PlannerDurationStat`
- Parsers: `asOverview`, `asDurationStats`
- Helpers: `formatDate`, `estimateForBudget`

**Step 4: Run test to verify it passes**

Run: `pnpm --filter desktop test -- pages/planner/today/model.test.ts`
Expected: PASS

**Step 5: Wire page to import model**

Update `apps/desktop/src/renderer/src/pages/PlannerTodayPage.tsx`:
- Remove inline type/parser/helper declarations
- Import from `./planner/today/model.js`

**Step 6: Run desktop tests**

Run: `pnpm --filter desktop test`
Expected: PASS

**Step 7: Commit**

```bash
git add apps/desktop/src/renderer/src/pages/planner/today/model.ts \
  apps/desktop/src/renderer/src/pages/planner/today/model.test.ts \
  apps/desktop/src/renderer/src/pages/PlannerTodayPage.tsx
git commit -m "refactor(desktop): extract planner today model"
```

---

### Task 2: Split Planner Today UI into small components

**Files:**
- Create: `apps/desktop/src/renderer/src/pages/planner/today/PlannerTimerCard.tsx`
- Create: `apps/desktop/src/renderer/src/pages/planner/today/PlannerTaskListCard.tsx`
- Create: `apps/desktop/src/renderer/src/pages/planner/today/PlannerChargesCard.tsx`
- Modify: `apps/desktop/src/renderer/src/pages/PlannerTodayPage.tsx`

**Step 1: Extract Timer card**

Move the JSX block rendered when `activeTimer` exists into `PlannerTimerCard`.

**Step 2: Run desktop tests**

Run: `pnpm --filter desktop test`
Expected: PASS

**Step 3: Extract Daily/Weekly list card**

Create a reusable component that renders:
- title (DAILY/WEEKLY)
- done/total badge
- list rows with checkbox + Start button

**Step 4: Run desktop tests**

Run: `pnpm --filter desktop test`
Expected: PASS

**Step 5: Extract Charges card**

Move CHARGE list rendering into a `PlannerChargesCard`.

**Step 6: Run desktop tests**

Run: `pnpm --filter desktop test`
Expected: PASS

**Step 7: Commit**

```bash
git add apps/desktop/src/renderer/src/pages/planner/today/PlannerTimerCard.tsx \
  apps/desktop/src/renderer/src/pages/planner/today/PlannerTaskListCard.tsx \
  apps/desktop/src/renderer/src/pages/planner/today/PlannerChargesCard.tsx \
  apps/desktop/src/renderer/src/pages/PlannerTodayPage.tsx
git commit -m "refactor(desktop): split planner today page"
```

---

### Task 3: Extract Planner Templates parsing/helpers into `model.ts`

**Files:**
- Create: `apps/desktop/src/renderer/src/pages/planner/templates/model.ts`
- Create: `apps/desktop/src/renderer/src/pages/planner/templates/model.test.ts`
- Modify: `apps/desktop/src/renderer/src/pages/PlannerTemplatesPage.tsx`

**Step 1: Write failing tests**

Create `apps/desktop/src/renderer/src/pages/planner/templates/model.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { asTemplates, asSettingsBundle } from "./model.js";

describe("planner templates model parsing", () => {
  it("parses templates list", () => {
    const out = asTemplates([{ id: "t1", title: "X", type: "DAILY", estimateMinutes: 10, rechargeHours: null, maxStacks: null }]);
    expect(out?.[0]?.id).toBe("t1");
  });

  it("returns null for invalid settings bundle", () => {
    expect(asSettingsBundle({})).toBeNull();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm --filter desktop test -- pages/planner/templates/model.test.ts`
Expected: FAIL

**Step 3: Implement `model.ts`**

Move from `PlannerTemplatesPage.tsx` into `model.ts`:
- Types: `PlannerTemplateType`, `PlannerTemplate`, `PlannerSettings`, `PlannerSettingsBundle`, `ApplyPresetResult`
- Parsers: `asTemplates`, `asSettings`, `asSettingsBundle`, `asApplyPresetResult`, `asServersFromCharacters`

**Step 4: Run test to verify it passes**

Run: `pnpm --filter desktop test -- pages/planner/templates/model.test.ts`
Expected: PASS

**Step 5: Update page imports**

Update `apps/desktop/src/renderer/src/pages/PlannerTemplatesPage.tsx` to import model helpers.

**Step 6: Run desktop tests**

Run: `pnpm --filter desktop test`
Expected: PASS

**Step 7: Commit**

```bash
git add apps/desktop/src/renderer/src/pages/planner/templates/model.ts \
  apps/desktop/src/renderer/src/pages/planner/templates/model.test.ts \
  apps/desktop/src/renderer/src/pages/PlannerTemplatesPage.tsx
git commit -m "refactor(desktop): extract planner templates model"
```

---

### Task 4: Split Planner Templates UI into small components

**Files:**
- Create: `apps/desktop/src/renderer/src/pages/planner/templates/PresetCard.tsx`
- Create: `apps/desktop/src/renderer/src/pages/planner/templates/ResetSettingsCard.tsx`
- Create: `apps/desktop/src/renderer/src/pages/planner/templates/TemplatesList.tsx`
- Create: `apps/desktop/src/renderer/src/pages/planner/templates/EditTemplateCard.tsx`
- Modify: `apps/desktop/src/renderer/src/pages/PlannerTemplatesPage.tsx`

**Step 1: Extract Preset card**

Move preset selection + apply buttons into `PresetCard`.

**Step 2: Extract Reset settings card**

Move server selector + reset inputs + save/clear into `ResetSettingsCard`.

**Step 3: Extract templates list**

Move filtering UI + visible templates render into `TemplatesList`.

**Step 4: Extract edit section**

Move edit form into `EditTemplateCard`.

**Step 5: Run desktop tests**

Run: `pnpm --filter desktop test`
Expected: PASS

**Step 6: Commit**

```bash
git add apps/desktop/src/renderer/src/pages/planner/templates/*.tsx \
  apps/desktop/src/renderer/src/pages/PlannerTemplatesPage.tsx
git commit -m "refactor(desktop): split planner templates page"
```

---

### Task 5: Split Build Score page into small components

**Files:**
- Create: `apps/desktop/src/renderer/src/pages/buildScore/BuildScoreHeader.tsx`
- Create: `apps/desktop/src/renderer/src/pages/buildScore/ClassPresetCard.tsx`
- Create: `apps/desktop/src/renderer/src/pages/buildScore/UserPresetsCard.tsx`
- Create: `apps/desktop/src/renderer/src/pages/buildScore/ResultsCard.tsx`
- Create: `apps/desktop/src/renderer/src/pages/buildScore/StatsTableCard.tsx`
- Modify: `apps/desktop/src/renderer/src/pages/BuildScorePage.tsx`

**Step 1: Extract header (title + Save/Reload/Reset)**

Create `BuildScoreHeader` and move the top section.

**Step 2: Extract preset cards**

Move “직업 프리셋(추천)” into `ClassPresetCard` and “내 프리셋” into `UserPresetsCard`.

**Step 3: Extract results + stats table**

Move “결과” into `ResultsCard` and the large “항목(가중치)” list into `StatsTableCard`.

**Step 4: Run desktop tests**

Run: `pnpm --filter desktop test`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/desktop/src/renderer/src/pages/buildScore/*.tsx \
  apps/desktop/src/renderer/src/pages/BuildScorePage.tsx
git commit -m "refactor(desktop): split build score page"
```

---

### Task 6: Final verification and boundary check

**Files:** none

**Step 1: Run full desktop test + typecheck**

Run:
- `pnpm --filter desktop test`
- `pnpm --filter desktop typecheck`
Expected: PASS

**Step 2: Run vibe boundaries (optional)**

Run: `python3 scripts/vibe.py boundaries`
Expected: no violations

**Step 3: Commit & push branch**

```bash
git status -sb
git push -u origin refactor/desktop-hotspots-split
```

