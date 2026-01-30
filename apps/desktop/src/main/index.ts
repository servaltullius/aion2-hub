import { BrowserWindow, app, dialog, shell } from "electron";
import { appendFile, mkdir, readdir, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { registerIpcHandlers } from "./ipc.js";
import { resolvePortableBaseDir, resolvePortableDataDir } from "./portableDataDir.js";
import { createMultiFileLogger } from "./log.js";
import { openDesktopDb, type DesktopDb } from "./storage/db.js";
import { startNoticesScheduler } from "./scheduler.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let db: DesktopDb | null = null;
let scheduler: ReturnType<typeof startNoticesScheduler> | null = null;

type Logger = {
  info: (msg: string, extra?: unknown) => void;
  error: (msg: string, extra?: unknown) => void;
};

let log: Logger = {
  info: (msg, extra) => console.log("[AION2 HUB]", msg, extra ?? ""),
  error: (msg, extra) => console.error("[AION2 HUB]", msg, extra ?? "")
};
let logPaths: { attempted: string[]; writable: string[] } = { attempted: [], writable: [] };
let mainWindow: BrowserWindow | null = null;

function resolveBaseDirEarly() {
  const portableDir = process.env.PORTABLE_EXECUTABLE_DIR?.trim();
  if (portableDir) return portableDir;

  const portableFile = process.env.PORTABLE_EXECUTABLE_FILE?.trim();
  if (portableFile) return path.dirname(portableFile);

  return path.dirname(process.execPath);
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function toDataUrlHtml(html: string) {
  return `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;
}

const writableLogPaths = new Set<string>();

async function probeLogPaths(paths: string[]) {
  for (const p of paths) {
    try {
      await mkdir(path.dirname(p), { recursive: true });
      await appendFile(p, `[${new Date().toISOString()}] INFO log probe\n`, { encoding: "utf8" });
      writableLogPaths.add(p);
    } catch {
      // keep probing other locations
    }
  }
}

async function firstWritablePath(paths: string[], probeLine: string) {
  for (const p of paths) {
    try {
      await mkdir(path.dirname(p), { recursive: true });
      await appendFile(p, probeLine, { encoding: "utf8" });
      return p;
    } catch {
      // keep probing
    }
  }
  return null;
}

async function safeStat(filePath: string) {
  try {
    const s = await stat(filePath);
    return { exists: true, size: s.size };
  } catch {
    return { exists: false, size: null as number | null };
  }
}

async function safeListDir(dirPath: string) {
  try {
    const names = await readdir(dirPath);
    return names.slice(0, 80);
  } catch {
    return null as string[] | null;
  }
}

function rebuildLogger(attempted: string[]) {
  const writable = [...writableLogPaths];
  logPaths = { attempted, writable };
  if (writable.length === 0) {
    log.error("no writable log path", { attempted });
    return;
  }
  log = createMultiFileLogger(writable);
}

function splashHtml(extra?: unknown) {
  const info = {
    isPackaged: app.isPackaged,
    exe: app.getPath("exe"),
    cwd: process.cwd(),
    portableDir: process.env.PORTABLE_EXECUTABLE_DIR ?? null,
    portableFile: process.env.PORTABLE_EXECUTABLE_FILE ?? null,
    logPaths,
    ...(extra ? { extra } : {})
  };

  return `
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>AION2 HUB</title>
    <style>
      body { font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; margin: 0; padding: 18px; background: #0b1020; color: #e8ecff; }
      h1 { margin: 0 0 12px; font-size: 18px; }
      p { margin: 0 0 12px; color: #b7c0ff; }
      pre { background: rgba(255,255,255,0.06); padding: 12px; border-radius: 10px; overflow: auto; }
      code { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 12px; }
    </style>
  </head>
  <body>
    <h1>AION2 HUB</h1>
    <p>Starting… (if this screen stays, check log file paths below)</p>
    <pre><code>${escapeHtml(JSON.stringify(info, null, 2))}</code></pre>
  </body>
</html>`;
}

function errorHtml(title: string, details: unknown) {
  return `
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>AION2 HUB - Error</title>
    <style>
      body { font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; margin: 0; padding: 18px; background: #200b0b; color: #ffe8e8; }
      h1 { margin: 0 0 12px; font-size: 18px; }
      p { margin: 0 0 12px; color: #ffc0c0; }
      pre { background: rgba(255,255,255,0.08); padding: 12px; border-radius: 10px; overflow: auto; }
      code { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 12px; }
    </style>
  </head>
  <body>
    <h1>${escapeHtml(title)}</h1>
    <p>Log files (first writable should exist):</p>
    <pre><code>${escapeHtml(JSON.stringify(logPaths, null, 2))}</code></pre>
    <p>Details:</p>
    <pre><code>${escapeHtml(JSON.stringify(details, null, 2))}</code></pre>
  </body>
</html>`;
}

async function createWindow() {
  const win = new BrowserWindow({
    width: 1100,
    height: 800,
    show: true,
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.cjs")
    }
  });
  mainWindow = win;

  win.once("ready-to-show", () => {
    log.info("ready-to-show");
    win.focus();
  });

  win.on("closed", () => {
    if (mainWindow === win) mainWindow = null;
  });

  win.webContents.on("did-fail-load", (_event, errorCode, errorDescription, validatedURL, isMainFrame) => {
    if (!isMainFrame) return;
    log.error("did-fail-load", { errorCode, errorDescription, validatedURL });
    void win.loadURL(toDataUrlHtml(errorHtml("Renderer failed to load", { errorCode, errorDescription, validatedURL })));
  });

  win.webContents.on("render-process-gone", (_event, details) => {
    log.error("render-process-gone", details);
    void win.loadURL(toDataUrlHtml(errorHtml("Renderer process gone", details)));
  });

  win.webContents.on("did-finish-load", () => {
    log.info("did-finish-load", { url: win.webContents.getURL() });
  });

  win.webContents.on("console-message", (_event, level, message, line, sourceId) => {
    log.info("renderer console", { level, message, line, sourceId });
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: "deny" };
  });

  await win.loadURL(toDataUrlHtml(splashHtml()));
  return win;
}

async function loadRenderer(win: BrowserWindow) {
  const devUrl = process.env.ELECTRON_RENDERER_URL;
  const loadPromise =
    !app.isPackaged && devUrl ? win.loadURL(devUrl) : win.loadFile(path.join(__dirname, "../renderer/index.html"));

  const timeoutMs = 15_000;
  const timeoutPromise = new Promise<never>((_resolve, reject) => {
    setTimeout(() => reject(new Error(`Renderer load timeout after ${timeoutMs}ms`)), timeoutMs);
  });

  try {
    await Promise.race([loadPromise, timeoutPromise]);
  } catch (e: unknown) {
    log.error("renderer load failed/timeout", { err: e instanceof Error ? e.message : String(e) });
    await win.loadURL(toDataUrlHtml(errorHtml("Renderer load failed/timeout", { err: String(e) })));
  }
}

async function run() {
  try {
    const baseDirEarly = app.isPackaged ? resolveBaseDirEarly() : path.join(process.cwd(), "apps/desktop");
    const attemptedEarly = [path.join(baseDirEarly, "aion2-hub.log"), path.join(os.tmpdir(), "aion2-hub.log")];
    await probeLogPaths(attemptedEarly);
    rebuildLogger(attemptedEarly);

    const appDirEarly = path.dirname(process.execPath);
    const preflight = {
      appDirEarly,
      appDirList: await safeListDir(appDirEarly),
      resourcesDirList: await safeListDir(path.join(appDirEarly, "resources")),
      files: {
        "icudtl.dat": await safeStat(path.join(appDirEarly, "icudtl.dat")),
        "resources.pak": await safeStat(path.join(appDirEarly, "resources.pak")),
        "chrome_100_percent.pak": await safeStat(path.join(appDirEarly, "chrome_100_percent.pak")),
        "chrome_200_percent.pak": await safeStat(path.join(appDirEarly, "chrome_200_percent.pak")),
        "resources/app.asar": await safeStat(path.join(appDirEarly, "resources", "app.asar")),
        "resources/electron.asar": await safeStat(path.join(appDirEarly, "resources", "electron.asar")),
        "locales/en-US.pak": await safeStat(path.join(appDirEarly, "locales", "en-US.pak"))
      }
    };

    const chromeLogPath = await firstWritablePath(
      [path.join(baseDirEarly, "chrome.log"), path.join(os.tmpdir(), "chrome.log")],
      `[${new Date().toISOString()}] chrome log probe\n`
    );

    log.info("pre-ready", {
      isPackaged: app.isPackaged,
      execPath: process.execPath,
      preflight,
      baseDirEarly,
      portableDir: process.env.PORTABLE_EXECUTABLE_DIR ?? null,
      portableFile: process.env.PORTABLE_EXECUTABLE_FILE ?? null,
      argv: process.argv,
      chromeLogPath,
      logPaths
    });

    let whenReadyResolved = false;
    const startedAt = Date.now();
    const readyPromise = app.whenReady().then(
      () => {
        whenReadyResolved = true;
        log.info("whenReady resolved", { ms: Date.now() - startedAt });
      },
      (e: unknown) => {
        whenReadyResolved = true;
        log.error("whenReady rejected", { err: e instanceof Error ? e.message : String(e) });
      }
    );

    app.on("will-finish-launching", () => log.info("event: will-finish-launching"));
    app.on("ready", () => log.info("event: ready"));

    setInterval(() => {
      if (whenReadyResolved) return;
      log.info("waiting for whenReady", { ms: Date.now() - startedAt });
    }, 2000).unref();

    setTimeout(() => {
      if (whenReadyResolved) return;
      log.error("whenReady timeout", { ms: Date.now() - startedAt });
    }, 60_000).unref();

    await readyPromise;

    {
      const baseDir = app.isPackaged ? resolvePortableBaseDir() : path.join(process.cwd(), "apps/desktop");
      const attempted = [
        path.join(baseDir, "aion2-hub.log"),
        path.join(app.getPath("userData"), "aion2-hub.log"),
        path.join(app.getPath("logs"), "aion2-hub.log"),
        path.join(os.tmpdir(), "aion2-hub.log")
      ];
      await probeLogPaths(attempted);
      rebuildLogger(attempted);
      log.info("app starting", {
        isPackaged: app.isPackaged,
        exe: app.getPath("exe"),
        cwd: process.cwd(),
        portableDir: process.env.PORTABLE_EXECUTABLE_DIR ?? null,
        portableFile: process.env.PORTABLE_EXECUTABLE_FILE ?? null,
        baseDir,
        logPaths
      });
    }

    process.on("uncaughtException", (err) => {
      log.error("uncaughtException", { message: err.message, stack: err.stack });
      dialog.showErrorBox("AION2 HUB", `Unhandled error: ${err.message}`);
    });
    process.on("unhandledRejection", (reason) => {
      log.error("unhandledRejection", { reason });
      dialog.showErrorBox("AION2 HUB", `Unhandled promise rejection: ${String(reason)}`);
    });

    log.info("creating window (splash)");
    const win = await createWindow();
    log.info("splash window created");

    const dataDir = await resolvePortableDataDir().catch((e: unknown) => {
      const baseDir = app.isPackaged ? resolvePortableBaseDir() : path.join(process.cwd(), "apps/desktop");
      const message =
        `데이터 폴더에 쓸 수 없습니다.\n\n` +
        `이 앱은 포터블(A1) 모드라서 EXE 옆에 data 폴더를 만듭니다.\n` +
        `쓰기 가능한 폴더(예: 바탕화면/문서)로 EXE를 옮겨서 실행해 주세요.\n\n` +
        `대상 폴더: ${path.join(baseDir, "data")}\n\n` +
        `원인: ${e instanceof Error ? e.message : String(e)}`;
      log.error("resolvePortableDataDir failed", { message, cause: e instanceof Error ? e.message : String(e) });
      throw new Error(message);
    });

    log.info("data dir ready", { dataDir });

    db = await openDesktopDb(dataDir);
    log.info("db opened", { filePath: db.filePath });
    scheduler = startNoticesScheduler(db);
    log.info("scheduler started");

    registerIpcHandlers({
      getDb: () => db,
      getScheduler: () => scheduler
    });
    log.info("ipc handlers registered");

    log.info("loading renderer");
    await loadRenderer(win);
    log.info("renderer loaded (or error page shown)");

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length !== 0) return;
      void (async () => {
        const next = await createWindow();
        await loadRenderer(next);
      })();
    });

    app.on("window-all-closed", () => {
      app.quit();
    });

    app.on("before-quit", () => {
      scheduler?.stop();
      scheduler = null;
      db?.db.close();
      db = null;
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log.error("startup failed", { message, err: err instanceof Error ? { stack: err.stack } : String(err) });
    dialog.showErrorBox("AION2 HUB", message);
    app.quit();
  }
}

void run();
