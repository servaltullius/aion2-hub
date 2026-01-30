import { app } from "electron";
import { access, constants, mkdir } from "node:fs/promises";
import path from "node:path";

export function resolvePortableBaseDir() {
  const portableDir = process.env.PORTABLE_EXECUTABLE_DIR?.trim();
  if (portableDir) return portableDir;

  const portableFile = process.env.PORTABLE_EXECUTABLE_FILE?.trim();
  if (portableFile) return path.dirname(portableFile);

  return path.dirname(app.getPath("exe"));
}

export async function resolvePortableDataDir() {
  const baseDir = app.isPackaged ? resolvePortableBaseDir() : path.join(process.cwd(), "apps/desktop");
  const dataDir = path.join(baseDir, "data");

  await mkdir(dataDir, { recursive: true });
  await access(dataDir, constants.W_OK);

  return dataDir;
}
