import { BrowserWindow, app, globalShortcut, screen } from "electron";
import path from "node:path";

type Logger = {
  info: (msg: string, extra?: unknown) => void;
  error: (msg: string, extra?: unknown) => void;
};

type WindowBounds = { x: number; y: number; width: number; height: number };
type WindowState = { bounds: WindowBounds; isMaximized: boolean };

type SettingsDb = {
  getSetting: (key: string) => string | null;
  setSetting: (key: string, value: string | null) => void;
  persist: () => Promise<void>;
};

const OVERLAY_WINDOW_STATE_KEY = "overlayWindowState";
const DEFAULT_OVERLAY_WIDTH = 380;
const DEFAULT_OVERLAY_HEIGHT = 620;

function defaultOverlayState(): WindowState {
  const point = screen.getCursorScreenPoint();
  const display = screen.getDisplayNearestPoint(point);
  const area = display.workArea;

  const width = Math.min(Math.max(320, DEFAULT_OVERLAY_WIDTH), area.width);
  const height = Math.min(Math.max(420, DEFAULT_OVERLAY_HEIGHT), area.height);

  const margin = 16;
  const x = area.x + Math.max(0, area.width - width - margin);
  const y = area.y + margin;

  return { bounds: { x, y, width, height }, isMaximized: false };
}

function parseWindowState(raw: string | null): WindowState | null {
  if (!raw) return null;
  try {
    const obj = JSON.parse(raw) as unknown;
    if (!obj || typeof obj !== "object") return null;
    const state = obj as Partial<WindowState> & { bounds?: Partial<WindowBounds> };
    const bounds = state.bounds;
    if (!bounds) return null;
    const x = typeof bounds.x === "number" && Number.isFinite(bounds.x) ? Math.floor(bounds.x) : null;
    const y = typeof bounds.y === "number" && Number.isFinite(bounds.y) ? Math.floor(bounds.y) : null;
    const width = typeof bounds.width === "number" && Number.isFinite(bounds.width) ? Math.floor(bounds.width) : null;
    const height = typeof bounds.height === "number" && Number.isFinite(bounds.height) ? Math.floor(bounds.height) : null;
    if (x === null || y === null || width === null || height === null) return null;
    if (width < 240 || height < 240) return null;
    return { bounds: { x, y, width, height }, isMaximized: false };
  } catch {
    return null;
  }
}

function clampBoundsToDisplay(bounds: WindowBounds): WindowBounds {
  const display = screen.getDisplayMatching(bounds);
  const area = display.workArea;

  const width = Math.min(Math.max(bounds.width, 240), area.width);
  const height = Math.min(Math.max(bounds.height, 240), area.height);

  let x = bounds.x;
  let y = bounds.y;

  if (x < area.x) x = area.x;
  if (y < area.y) y = area.y;
  if (x + width > area.x + area.width) x = area.x + area.width - width;
  if (y + height > area.y + area.height) y = area.y + area.height - height;

  return { x, y, width, height };
}

function computeWindowState(win: BrowserWindow): WindowState {
  const bounds = win.getBounds();
  return { bounds: { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height }, isMaximized: false };
}

async function loadOverlayRenderer(win: BrowserWindow, rendererIndexPath: string, tab: "planner" | "loot") {
  const devUrl = process.env.ELECTRON_RENDERER_URL;
  if (!app.isPackaged && devUrl) {
    await win.loadURL(`${devUrl}#/overlay?tab=${tab}`);
    return;
  }
  await win.loadFile(rendererIndexPath, { hash: `/overlay?tab=${tab}` });
}

export function createOverlayManager(input: {
  getDb: () => SettingsDb | null;
  preloadPath: string;
  rendererIndexPath: string;
  log: Logger;
  shortcut?: string;
}) {
  const shortcut = input.shortcut ?? "CommandOrControl+Alt+O";

  let enabled = false;
  let overlayWindow: BrowserWindow | null = null;
  let quitting = false;
  let saving = false;

  function getInitialState(): WindowState {
    const db = input.getDb();
    const stored = db ? parseWindowState(db.getSetting(OVERLAY_WINDOW_STATE_KEY)) : null;
    const state = stored ?? defaultOverlayState();
    return { ...state, bounds: clampBoundsToDisplay(state.bounds) };
  }

  async function persistState() {
    const db = input.getDb();
    if (!db) return;
    if (!overlayWindow) return;
    if (saving) return;
    saving = true;
    try {
      const state = computeWindowState(overlayWindow);
      db.setSetting(OVERLAY_WINDOW_STATE_KEY, JSON.stringify(state));
      await db.persist();
    } catch (e: unknown) {
      input.log.error("overlay persist failed", { err: e instanceof Error ? e.message : String(e) });
    } finally {
      saving = false;
    }
  }

  async function ensureWindow() {
    if (overlayWindow && !overlayWindow.isDestroyed()) return overlayWindow;

    const initial = getInitialState();
    const win = new BrowserWindow({
      x: initial.bounds.x,
      y: initial.bounds.y,
      width: initial.bounds.width,
      height: initial.bounds.height,
      show: false,
      alwaysOnTop: true,
      skipTaskbar: true,
      frame: false,
      resizable: true,
      minimizable: false,
      maximizable: false,
      backgroundColor: "#0b1020",
      webPreferences: {
        preload: input.preloadPath
      }
    });
    overlayWindow = win;

    win.on("close", (event) => {
      if (quitting) return;
      event.preventDefault();
      win.hide();
    });

    win.on("hide", () => {
      void persistState();
    });

    win.on("moved", () => {
      // no-op; persisted on hide/quit
    });
    win.on("resized", () => {
      // no-op; persisted on hide/quit
    });

    win.on("closed", () => {
      overlayWindow = null;
    });

    await loadOverlayRenderer(win, input.rendererIndexPath, "planner");
    return win;
  }

  async function setEnabled(next: boolean) {
    enabled = next;
    const win = await ensureWindow();
    if (enabled) {
      try {
        win.setAlwaysOnTop(true, "screen-saver");
      } catch {
        // ignore mode errors
      }
      win.showInactive();
    } else {
      win.hide();
      await persistState();
    }
    return { enabled };
  }

  function registerHotkey() {
    if (globalShortcut.isRegistered(shortcut)) return;
    const ok = globalShortcut.register(shortcut, () => {
      void setEnabled(!enabled);
    });
    if (!ok) input.log.error("globalShortcut register failed", { shortcut });
  }

  function unregisterHotkey() {
    try {
      globalShortcut.unregister(shortcut);
    } catch {
      // ignore
    }
  }

  async function dispose() {
    quitting = true;
    unregisterHotkey();
    await persistState();
    if (overlayWindow && !overlayWindow.isDestroyed()) {
      overlayWindow.destroy();
    }
    overlayWindow = null;
  }

  return {
    registerHotkey,
    unregisterHotkey,
    get enabled() {
      return enabled;
    },
    toggle: async () => setEnabled(!enabled),
    setEnabled,
    persistState,
    dispose,
    ensureWindow
  };
}

