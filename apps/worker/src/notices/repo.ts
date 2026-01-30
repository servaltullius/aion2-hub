import { prisma, type NoticeSource, type Prisma } from "@aion2/db";

export type NoticeSnapshotSummary = {
  id: string;
  contentHash: string;
  normalizedText: string;
};

export type NoticeSyncRepo = {
  findLatestSnapshot(input: { source: NoticeSource; externalId: string }): Promise<NoticeSnapshotSummary | null>;
  upsertItem(input: {
    source: NoticeSource;
    externalId: string;
    url: string;
    title: string;
    publishedAt: Date | null;
  }): Promise<{ id: string }>;
  upsertSnapshot(input: {
    noticeItemId: string;
    contentHash: string;
    normalizedText: string;
  }): Promise<{ id: string; contentHash: string }>;
  upsertDiff(input: {
    noticeItemId: string;
    fromSnapshotId: string;
    toSnapshotId: string;
    diffJson: Prisma.InputJsonValue;
  }): Promise<void>;
};

export const prismaNoticeSyncRepo: NoticeSyncRepo = {
  async findLatestSnapshot({ source, externalId }) {
    return await prisma.noticeSnapshot.findFirst({
      where: {
        noticeItem: {
          source,
          externalId
        }
      },
      orderBy: { fetchedAt: "desc" },
      select: { id: true, contentHash: true, normalizedText: true }
    });
  },

  async upsertItem({ source, externalId, url, title, publishedAt }) {
    return await prisma.noticeItem.upsert({
      where: { source_externalId: { source, externalId } },
      create: {
        source,
        externalId,
        url,
        title,
        publishedAt
      },
      update: {
        url,
        title,
        publishedAt
      },
      select: { id: true }
    });
  },

  async upsertSnapshot({ noticeItemId, contentHash, normalizedText }) {
    return await prisma.noticeSnapshot.upsert({
      where: { noticeItemId_contentHash: { noticeItemId, contentHash } },
      create: { noticeItemId, contentHash, normalizedText },
      update: {},
      select: { id: true, contentHash: true }
    });
  },

  async upsertDiff({ noticeItemId, fromSnapshotId, toSnapshotId, diffJson }) {
    await prisma.noticeDiff.upsert({
      where: {
        fromSnapshotId_toSnapshotId: {
          fromSnapshotId,
          toSnapshotId
        }
      },
      create: {
        noticeItemId,
        fromSnapshotId,
        toSnapshotId,
        diffJson
      },
      update: { diffJson },
      select: { id: true }
    });
  }
};
