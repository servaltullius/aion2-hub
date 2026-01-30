import { appendFile } from "node:fs/promises";
import { mkdir } from "node:fs/promises";
import path from "node:path";

export type Logger = {
  info: (msg: string, extra?: unknown) => void;
  error: (msg: string, extra?: unknown) => void;
};

function toLine(level: "INFO" | "ERROR", msg: string, extra?: unknown) {
  const ts = new Date().toISOString();
  if (extra === undefined) return `[${ts}] ${level} ${msg}\n`;
  let extraText = "";
  try {
    extraText = JSON.stringify(extra);
  } catch {
    extraText = String(extra);
  }
  return `[${ts}] ${level} ${msg} ${extraText}\n`;
}

export function createFileLogger(filePath: string): Logger {
  void mkdir(path.dirname(filePath), { recursive: true }).catch(() => undefined);

  async function write(line: string) {
    try {
      await appendFile(filePath, line, { encoding: "utf8" });
    } catch {
      // ignore logging failures
    }
  }

  return {
    info: (msg, extra) => void write(toLine("INFO", msg, extra)),
    error: (msg, extra) => void write(toLine("ERROR", msg, extra))
  };
}

export function createMultiFileLogger(filePaths: string[]): Logger {
  const unique = [...new Set(filePaths.filter((p) => p.trim().length > 0))];
  const loggers = unique.map((p) => createFileLogger(p));
  return {
    info: (msg, extra) => {
      for (const logger of loggers) logger.info(msg, extra);
    },
    error: (msg, extra) => {
      for (const logger of loggers) logger.error(msg, extra);
    }
  };
}
