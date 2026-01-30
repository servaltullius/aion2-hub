# Desktop Overlay (Planner + Quick Loot Log) — Design

**Goal:** Provide an optional, always-on-top *overlay window* for AION2 HUB (Windows) that helps during play without touching the game client. Priority features:

1) **Overlay Planner (Today mini):** time-budget based task recommendations + quick checklist + timer.
2) **Overlay Quick Loot Log:** fast manual logging for expedition/raid runs (duration, drops, costs).

**Non-goals / Safety:**
- No memory/process/packet access, no hooking/injection, no auto-input/macros.
- Overlay is just a separate Electron window.

## User-facing Behavior

- **Hotkey:** `Ctrl+Alt+O` toggles overlay enabled/disabled.
- **Auto visibility (preferred):** When enabled, overlay is shown **only when AION2 is the foreground window**.
  - If the user clicks the overlay (overlay becomes foreground), it stays visible for editing.
- **Fallback:** If foreground-window detection fails/unavailable, **auto-hide is disabled** and overlay is controlled only by the hotkey.

## Desktop Architecture

- Add a second `BrowserWindow` (**overlayWindow**) managed by the main process.
- The overlay window loads the same renderer bundle but starts on `#/overlay` (hash route).
- Overlay uses the same preload bridge (`window.aion2Hub`) and existing IPC domains:
  - Planner: `planner:getOverview`, `planner:toggleComplete`, `planner:addDuration`, `planner:getDurationStats`.
  - Loot: `loot:createRun` (+ optional `loot:listRuns` for recent content suggestions).

### Foreground Window Detection (Win32)

- Best-effort watcher runs **only when overlay is enabled**.
- Implementation (MVP): spawn a hidden, long-lived `powershell.exe` process that calls Win32 APIs (`GetForegroundWindow`, `GetWindowText`, `GetWindowThreadProcessId`) and emits a line when foreground changes.
- Match rule (MVP): window title contains `"AION2"`.
- Future: make match strings configurable (settings page) and/or replace PowerShell with a tiny native helper.

## Overlay UI

Common header:
- App title + active character selector
- Buttons: **Hide** (same as hotkey), **Open Main** (bring main window to front)

### Overlay 1 — Planner (Today mini)
- Reset countdowns (daily/weekly)
- Time budget buttons: `30m / 60m / 90m` + include weekly toggle
- Recommended list (max 5): checkbox + Start timer
- Active timer: elapsed + Stop & Save / Cancel

### Overlay 2 — Quick Loot Log
- Content name (with recent suggestions)
- Optional: role / power bracket
- Start/Stop timer to auto-fill duration
- 1–3 quick rows for drops (itemName/qty) and optional costs
- Save → `loot:createRun` + toast + reset form

## Persistence

- Persist overlay window bounds to DB setting key `overlayWindowState` (similar to main window state):
  - Default size ~`380x620`, placed top-right within current display work area.
  - Clamp to current display on restore.
- Overlay enabled/disabled state is *not* persisted in MVP (starts disabled).

## IPC Additions

- `app:toggleOverlay` → toggles overlay enabled/disabled.
- `app:showMainWindow` (+ optional route hash) → show/focus main window.
- `app:overlayStatus` (optional) → report overlay state to renderer (enabled/auto-mode).

## Testing & Verification

- Unit tests for:
  - Overlay route parsing (`#/overlay?tab=`)
  - Visibility decision logic (enabled + gameFocused + overlayFocused)
  - Foreground watcher line parser (tab-delimited)
- Manual verification on Windows:
  - Windowed-mode AION2: overlay shows when game focused; hides when alt-tab away.
  - Hotkey toggles overlay reliably.
  - Quick loot log saves and appears in main Loot Logbook.
