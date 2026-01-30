import { spawn } from "node:child_process";

type Logger = {
  info: (msg: string, extra?: unknown) => void;
  error: (msg: string, extra?: unknown) => void;
};

export type ForegroundInfo = {
  pid: number;
  title: string;
  processName: string | null;
};

export function parseForegroundLine(line: string): ForegroundInfo | null {
  const trimmed = line.replaceAll("\r", "").trim();
  if (!trimmed) return null;
  const parts = trimmed.split("\t");
  if (parts.length < 2) return null;
  const pid = Number(parts[0]);
  if (!Number.isFinite(pid) || pid <= 0) return null;
  const title = parts[1] ?? "";
  const processName = parts[2] ? String(parts[2]) : null;
  return { pid, title, processName };
}

export function startForegroundWatcher(input: {
  log: Logger;
  onChange: (info: ForegroundInfo) => void;
  onUnavailable?: () => void;
}): { stop: () => void } | null {
  if (process.platform !== "win32") return null;

  const ps = "powershell.exe";
  const script = `
Add-Type @"
using System;
using System.Runtime.InteropServices;
using System.Text;
public static class Win32 {
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll", CharSet = CharSet.Unicode)] public static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int count);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);
}
"@;

$last = "";
while ($true) {
  try {
    $hwnd = [Win32]::GetForegroundWindow();
    $sb = New-Object System.Text.StringBuilder 1024;
    [void][Win32]::GetWindowText($hwnd, $sb, $sb.Capacity);
    $title = $sb.ToString();
    $title = $title -replace "\\t", " " -replace "\\r", " " -replace "\\n", " ";
    $pid = 0;
    [void][Win32]::GetWindowThreadProcessId($hwnd, [ref]$pid);
    $pname = "";
    try { $pname = (Get-Process -Id $pid -ErrorAction SilentlyContinue).ProcessName } catch {}
    $out = "$pid\\t$title\\t$pname";
    if ($out -ne $last) {
      $last = $out;
      Write-Output $out;
    }
  } catch {
    # swallow and continue
  }
  Start-Sleep -Milliseconds 250;
}
`;

  let stopped = false;
  const child = spawn(ps, ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", script], {
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"]
  });

  child.once("error", (e) => {
    input.log.error("foregroundWatcher spawn error", { err: e instanceof Error ? e.message : String(e) });
    input.onUnavailable?.();
  });
  child.once("exit", (code, signal) => {
    if (stopped) return;
    input.log.error("foregroundWatcher exited", { code, signal });
    input.onUnavailable?.();
  });

  const chunks: string[] = [];
  const flush = (data: string) => {
    chunks.push(data);
    const joined = chunks.join("");
    const lines = joined.split("\n");
    chunks.length = 0;
    chunks.push(lines.pop() ?? "");
    for (const line of lines) {
      const parsed = parseForegroundLine(line);
      if (parsed) input.onChange(parsed);
    }
  };

  child.stdout?.setEncoding("utf8");
  child.stdout?.on("data", (d: unknown) => flush(String(d)));

  child.stderr?.setEncoding("utf8");
  child.stderr?.on("data", (d: unknown) => {
    const msg = String(d).trim();
    if (msg) input.log.error("foregroundWatcher stderr", { msg });
  });

  return {
    stop: () => {
      stopped = true;
      try {
        child.kill();
      } catch {
        // ignore
      }
    }
  };
}
