import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const connectionString =
  process.env.DATABASE_URL ?? "postgresql://aion2:aion2@localhost:5432/aion2hub?schema=public";

const adapter = new PrismaPg({ connectionString });

export const prisma = new PrismaClient({ adapter });

export { PrismaClient };
export type * from "@prisma/client";
