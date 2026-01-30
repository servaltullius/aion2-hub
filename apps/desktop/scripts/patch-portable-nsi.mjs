import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const desktopDir = path.resolve(scriptDir, "..");
const repoRoot = path.resolve(desktopDir, "..", "..");
const pnpmDir = path.join(repoRoot, "node_modules", ".pnpm");

const portableBlockNeedle = [
  '  StrCpy $INSTDIR "$PLUGINSDIR\\app"',
  "  !ifdef UNPACK_DIR_NAME",
  '    StrCpy $INSTDIR "$TEMP\\${UNPACK_DIR_NAME}"',
  "  !endif"
].join("\n");

const entries = await readdir(pnpmDir, { withFileTypes: true });
const candidates = entries
  .filter((e) => e.isDirectory() && e.name.startsWith("app-builder-lib@"))
  .map((e) => path.join(pnpmDir, e.name, "node_modules", "app-builder-lib", "templates", "nsis", "portable.nsi"));

if (candidates.length === 0) {
  console.error(`[patch-portable-nsi] no app-builder-lib found under ${pnpmDir}`);
  process.exit(1);
}

let patchedAny = false;

for (const portableNsiPath of candidates) {
  let original;
  try {
    original = await readFile(portableNsiPath, "utf8");
  } catch {
    continue;
  }

  const alreadyPatched = original.includes('StrCpy $INSTDIR "$EXEDIR\\_aion2hub_unpack"');
  if (alreadyPatched) {
    console.log(`[patch-portable-nsi] already patched: ${portableNsiPath}`);
    patchedAny = true;
    continue;
  }

  if (!original.includes(portableBlockNeedle)) {
    console.warn(`[patch-portable-nsi] unexpected template, skipping: ${portableNsiPath}`);
    continue;
  }

  const patched = original.replace(
    portableBlockNeedle,
    [
      // Extract to the same directory as the portable EXE (avoids environments that block execution from %TEMP%).
      '  StrCpy $INSTDIR "$EXEDIR\\_aion2hub_unpack"',
      "  ; NOTE: electron-builder portable normally extracts to %TEMP%.",
      "  ; This repo overrides it to extract next to the EXE instead."
    ].join("\n")
  );

  await writeFile(portableNsiPath, patched, "utf8");
  patchedAny = true;
  console.log(`[patch-portable-nsi] patched: ${portableNsiPath}`);
}

if (!patchedAny) {
  console.error("[patch-portable-nsi] did not patch any file (no matching portable.nsi found)");
  process.exit(1);
}
