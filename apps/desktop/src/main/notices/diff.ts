import { diffLines } from "diff";

export type NoticeLineDiffBlock =
  | { type: "same"; lines: string[] }
  | { type: "added"; lines: string[] }
  | { type: "removed"; lines: string[] };

function splitLines(value: string) {
  const normalized = value.replaceAll("\r\n", "\n").replaceAll("\r", "\n");
  const parts = normalized.split("\n");
  if (parts.length > 0 && parts.at(-1) === "") parts.pop();
  return parts;
}

function ensureTrailingNewline(value: string) {
  const normalized = value.replaceAll("\r\n", "\n").replaceAll("\r", "\n");
  return normalized.endsWith("\n") ? normalized : `${normalized}\n`;
}

export function buildLineDiffJson(fromText: string, toText: string): NoticeLineDiffBlock[] {
  const from = ensureTrailingNewline(fromText);
  const to = ensureTrailingNewline(toText);

  const changes = diffLines(from, to);
  const blocks: NoticeLineDiffBlock[] = [];

  for (const change of changes) {
    const type = change.added ? "added" : change.removed ? "removed" : "same";
    const lines = splitLines(change.value);
    if (lines.length === 0) continue;

    const last = blocks.at(-1);
    if (last && last.type === type) {
      last.lines.push(...lines);
      continue;
    }

    blocks.push({ type, lines } as NoticeLineDiffBlock);
  }

  return blocks;
}

