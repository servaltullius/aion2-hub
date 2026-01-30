import type { FastifyInstance } from "fastify";

import { prisma, type NoticeSource } from "@aion2/db";
import { z } from "zod";

function parseNoticeSource(value: string | undefined): NoticeSource | undefined {
  const v = value?.toLowerCase();
  if (v === "notice") return "NOTICE";
  if (v === "update") return "UPDATE";
  return undefined;
}

const listQuerySchema = z.object({
  source: z.string().optional(),
  q: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20)
});

const idParamSchema = z.object({
  id: z.string().min(1)
});

export async function registerNoticesRoutes(app: FastifyInstance) {
  app.get("/notices", async (req) => {
    const query = listQuerySchema.parse(req.query);
    const source = parseNoticeSource(query.source);

    const where: {
      source?: NoticeSource;
      title?: { contains: string; mode: "insensitive" };
    } = {};

    if (source) where.source = source;
    if (query.q && query.q.trim()) {
      where.title = { contains: query.q.trim(), mode: "insensitive" };
    }

    const skip = (query.page - 1) * query.pageSize;
    const take = query.pageSize;

    const [total, items] = await prisma.$transaction([
      prisma.noticeItem.count({ where }),
      prisma.noticeItem.findMany({
        where,
        orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }],
        skip,
        take,
        select: {
          id: true,
          source: true,
          externalId: true,
          url: true,
          title: true,
          publishedAt: true,
          updatedAt: true
        }
      })
    ]);

    return { page: query.page, pageSize: query.pageSize, total, items };
  });

  app.get("/notices/:id", async (req, reply) => {
    const { id } = idParamSchema.parse(req.params);

    const item = await prisma.noticeItem.findUnique({
      where: { id },
      select: {
        id: true,
        source: true,
        externalId: true,
        url: true,
        title: true,
        publishedAt: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!item) return reply.code(404).send({ error: "not_found" });

    const latestSnapshot = await prisma.noticeSnapshot.findFirst({
      where: { noticeItemId: id },
      orderBy: { fetchedAt: "desc" },
      select: { id: true, fetchedAt: true, contentHash: true }
    });

    return { item, latestSnapshot };
  });

  app.get("/notices/:id/diff", async (req, reply) => {
    const { id } = idParamSchema.parse(req.params);

    const item = await prisma.noticeItem.findUnique({
      where: { id },
      select: { id: true }
    });
    if (!item) return reply.code(404).send({ error: "not_found" });

    const latestDiff = await prisma.noticeDiff.findFirst({
      where: { noticeItemId: id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        createdAt: true,
        diffJson: true,
        fromSnapshot: { select: { id: true, fetchedAt: true, contentHash: true } },
        toSnapshot: { select: { id: true, fetchedAt: true, contentHash: true } }
      }
    });

    return { diff: latestDiff };
  });
}

