import "dotenv/config";

import { prisma } from "@aion2/db";

import { syncNotices } from "./notices/sync.js";

function parseArgs(argv: string[]) {
  const args = new Map<string, string | boolean>();
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--") continue;
    if (!token?.startsWith("--")) continue;
    const key = token.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) {
      args.set(key, true);
    } else {
      args.set(key, next);
      i += 1;
    }
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));

const sourceArg = String(args.get("source") ?? "all").toLowerCase();
const sources =
  sourceArg === "notice"
    ? (["NOTICE"] as const)
    : sourceArg === "update"
      ? (["UPDATE"] as const)
      : (["NOTICE", "UPDATE"] as const);

const maxPages = Number(args.get("maxPages") ?? 5);
const pageSize = Number(args.get("pageSize") ?? 18);
const includePinned = args.get("noPinned") ? false : true;
const dryRun = args.get("dryRun") ? true : false;

const startedAt = Date.now();

try {
  const result = await syncNotices({
    sources: [...sources],
    maxPages: Number.isFinite(maxPages) && maxPages > 0 ? maxPages : 5,
    pageSize: Number.isFinite(pageSize) && pageSize > 0 ? pageSize : 18,
    includePinned,
    dryRun
  });

  console.log(JSON.stringify({ ...result, durationMs: Date.now() - startedAt }, null, 2));
} finally {
  await prisma.$disconnect().catch(() => undefined);
}
