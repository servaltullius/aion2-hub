import { spawnSync } from "node:child_process";

process.env.DATABASE_URL ||= "postgresql://aion2:aion2@localhost:5432/aion2hub?schema=public";

const command = process.platform === "win32" ? "prisma.cmd" : "prisma";
const args = process.argv.slice(2);

const result = spawnSync(command, args, { stdio: "inherit" });
process.exit(result.status ?? 1);

