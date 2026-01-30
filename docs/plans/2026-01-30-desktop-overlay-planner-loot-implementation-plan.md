# Desktop Overlay (Planner + Quick Loot Log) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task.

**Goal:** Add a Windows-only overlay window to the Electron desktop app that (1) shows a Today mini planner + timer and (2) supports quick manual loot logging, toggled by `Ctrl+Alt+O` and auto-shown only while AION2 is the foreground window.

**Architecture:** Main process owns an `overlayWindow` (`BrowserWindow`) and an optional foreground watcher. Renderer adds a new `#/overlay` route with a minimal UI shell. Preload exposes a small set of new app-level IPC calls (toggle overlay, show main window, navigate events).

**Tech Stack:** Electron (BrowserWindow, globalShortcut), React + Tailwind UI, existing IPC bridge (`window.aion2Hub`), vitest for unit tests.

---

### Task 1: Add overlay routing (pure, testable)

**Files:**
- Create: `apps/desktop/src/renderer/src/router.ts`
- Create: `apps/desktop/src/renderer/src/router.test.ts`
- Modify: `apps/desktop/src/renderer/src/App.tsx`

**Step 1: Write the failing test**

`apps/desktop/src/renderer/src/router.test.ts`

```ts
import { describe, expect, it } from "vitest";
import { parseRoute } from "./router";

describe("parseRoute", () => {
  it("parses overlay route + tab", () => {
    expect(parseRoute("#/overlay?tab=loot")).toEqual({ name: "overlay", tab: "loot" });
  });

  it("defaults overlay tab to planner", () => {
    expect(parseRoute("#/overlay")).toEqual({ name: "overlay", tab: "planner" });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm --filter desktop test -- --run apps/desktop/src/renderer/src/router.test.ts`
Expected: FAIL (missing module / parseRoute)

**Step 3: Implement router module**

`apps/desktop/src/renderer/src/router.ts`

- Export `Route` type and `parseRoute(hash: string)`.
- Add `overlay` route support:
  - Path: `/overlay`
  - Query: `tab=planner|loot` default `planner`

**Step 4: Update App.tsx to use router module**

- Replace inline `Route` and `parseRoute` with imports from `./router`.

**Step 5: Run tests**

Run: `pnpm --filter desktop test`
Expected: PASS

**Step 6: Commit**

Run:
```bash
git add apps/desktop/src/renderer/src/router.ts apps/desktop/src/renderer/src/router.test.ts apps/desktop/src/renderer/src/App.tsx
git commit -m "feat(desktop): add overlay route parsing"
```

---

### Task 2: Renderer overlay shell (no main sidebar)

**Files:**
- Create: `apps/desktop/src/renderer/src/pages/OverlayPage.tsx`
- Modify: `apps/desktop/src/renderer/src/App.tsx`

**Step 1: Implement minimal overlay UI**

`OverlayPage.tsx` requirements:
- Header: title + character select + buttons: Hide, Open Main
- Body: tab switch (Planner / Loot) driven by route query (`#/overlay?tab=`)
- No heavy features yet (placeholder cards are fine)

**Step 2: Wire route rendering**

- In `App.tsx`, add conditional: when `route.name === "overlay"`, render only `OverlayPage` (no main shell/sidebar)

**Step 3: Manual verify in dev**

Run: `pnpm --filter desktop dev`
Expected: `#/overlay` loads overlay shell UI

**Step 4: Commit**

```bash
git add apps/desktop/src/renderer/src/pages/OverlayPage.tsx apps/desktop/src/renderer/src/App.tsx
git commit -m "feat(desktop): add overlay renderer shell"
```

---

### Task 3: IPC additions for overlay control + navigation

**Files:**
- Modify: `apps/desktop/src/main/ipcHandlers/appHandlers.ts`
- Modify: `apps/desktop/src/preload/index.ts`
- Modify: `apps/desktop/src/renderer/src/App.tsx`

**Step 1: Add IPC channels**

Add handlers:
- `app:toggleOverlay` → toggles overlay enabled/disabled
- `app:showMainWindow` (payload: `{ hash?: string }`) → show/focus main window; optionally navigate it

**Step 2: Add navigate event plumbing**

- Main sends `app:navigate` to target window when it should change hash.
- Preload exposes:
  - `app.toggleOverlay(): Promise<{ enabled: boolean }>`
  - `app.showMainWindow(input?: { hash?: string }): Promise<{ ok: true }>`
  - `app.onNavigate(cb: (hash: string) => void): () => void`

**Step 3: Renderer listens to navigate events**

- In `App.tsx`, subscribe to `window.aion2Hub.app.onNavigate` and set `window.location.hash = hash`.

**Step 4: Commit**

```bash
git add apps/desktop/src/main/ipcHandlers/appHandlers.ts apps/desktop/src/preload/index.ts apps/desktop/src/renderer/src/App.tsx
git commit -m "feat(desktop): add IPC for overlay toggle and navigation"
```

---

### Task 4: Main-process overlay window manager + hotkey

**Files:**
- Create: `apps/desktop/src/main/overlay/overlayManager.ts`
- Modify: `apps/desktop/src/main/index.ts`

**Step 1: Create overlay window factory**

- Create a hidden `BrowserWindow` with:
  - `alwaysOnTop: true`, `skipTaskbar: true`, `resizable: true`
  - Default bounds ~`380x620` top-right
  - Load renderer with hash `/overlay?tab=planner`

**Step 2: Register global shortcut**

- On `app.whenReady`, register `CommandOrControl+Alt+O`.
- Callback toggles overlay enabled.

**Step 3: Persist overlay bounds**

- DB key: `overlayWindowState` (JSON with bounds + isMaximized=false)
- Persist on hide / before-quit.

**Step 4: Commit**

```bash
git add apps/desktop/src/main/overlay/overlayManager.ts apps/desktop/src/main/index.ts
git commit -m "feat(desktop): add overlay window + hotkey"
```

---

### Task 5: Foreground window watcher (PowerShell) + visibility logic

**Files:**
- Create: `apps/desktop/src/main/overlay/foregroundWatcher.ts`
- Create: `apps/desktop/src/main/overlay/foregroundWatcher.test.ts`
- Modify: `apps/desktop/src/main/overlay/overlayManager.ts`

**Step 1: Write failing parser test**

- Test parsing tab-delimited lines into `{ title, pid, processName }`.

**Step 2: Implement watcher**

- Windows only: spawn hidden `powershell.exe` in watch loop.
- Emit only on change.
- If watcher fails: overlay manager switches to manual mode (hotkey only).

**Step 3: Implement visibility decision as pure function**

- Inputs: `{ enabled, watcherAvailable, gameFocused, overlayFocused }`
- Output: `"show" | "hide"`
- Unit test it (optional but recommended).

**Step 4: Commit**

```bash
git add apps/desktop/src/main/overlay/foregroundWatcher.ts apps/desktop/src/main/overlay/foregroundWatcher.test.ts apps/desktop/src/main/overlay/overlayManager.ts
git commit -m "feat(desktop): auto-show overlay when AION2 focused"
```

---

### Task 6: Overlay Planner mini (feature 1)

**Files:**
- Modify: `apps/desktop/src/renderer/src/pages/OverlayPage.tsx`
- Create: `apps/desktop/src/renderer/src/pages/overlay/OverlayPlanner.tsx`

**Steps:**
- Implement the mini planner per design:
  - Reset countdowns
  - Budget buttons 30/60/90 + include weekly toggle
  - Recommended list (max 5): checkbox + Start timer
  - Active timer: elapsed + Stop & Save / Cancel
- Reuse existing planner utilities from `apps/desktop/src/renderer/src/planner/*`.
- Manual verify in dev.

**Commit**

```bash
git add apps/desktop/src/renderer/src/pages/OverlayPage.tsx apps/desktop/src/renderer/src/pages/overlay/OverlayPlanner.tsx
git commit -m "feat(desktop): overlay planner mini"
```

---

### Task 7: Overlay Quick Loot Log (feature 2)

**Files:**
- Modify: `apps/desktop/src/renderer/src/pages/OverlayPage.tsx`
- Create: `apps/desktop/src/renderer/src/pages/overlay/OverlayLootQuickLog.tsx`

**Steps:**
- Implement quick run logging:
  - Content name + recent suggestions (optional)
  - Start/Stop timer → seconds
  - Drops rows + costs rows
  - Save via `window.aion2Hub.loot.createRun`
- Manual verify: open main Loot Logbook and confirm entries.

**Commit**

```bash
git add apps/desktop/src/renderer/src/pages/OverlayPage.tsx apps/desktop/src/renderer/src/pages/overlay/OverlayLootQuickLog.tsx
git commit -m "feat(desktop): overlay quick loot log"
```

---

### Task 8: Verification + portable packaging

**Step 1: Run full checks**

Run:
- `pnpm -r build`
- `pnpm -r test`

Expected: PASS

**Step 2: Build portable EXE**

Run (WSL-safe):
- `pnpm --filter desktop build`
- `pnpm --dir apps/desktop exec electron-builder --win portable --config.win.signAndEditExecutable=false`

Expected: artifact at `apps/desktop/release/AION2-HUB-<version>.exe`

**Step 3: Commit and PR**

- Bump desktop version
- `gh pr create` and merge after checks
