import { Router } from "express";
import { db, embedsTable, foldersTable } from "@workspace/db";
import { isNull, count, desc } from "drizzle-orm";

const router = Router();

router.get("/stats", async (req, res) => {
  const [totalEmbedsRow] = await db.select({ count: count() }).from(embedsTable);
  const [totalFoldersRow] = await db.select({ count: count() }).from(foldersTable);
  const [unorganizedRow] = await db
    .select({ count: count() })
    .from(embedsTable)
    .where(isNull(embedsTable.folderId));

  const recentRows = await db
    .select()
    .from(embedsTable)
    .orderBy(desc(embedsTable.createdAt))
    .limit(6);

  const folders = await db.select().from(foldersTable);
  const folderMap = new Map(folders.map((f) => [f.id, f.name]));

  const recentEmbeds = recentRows.map((e) => ({
    id: e.id,
    title: e.title,
    url: e.url,
    embedCode: e.embedCode,
    thumbnail: e.thumbnail,
    description: e.description,
    source: e.source,
    folderId: e.folderId,
    folderName: e.folderId ? (folderMap.get(e.folderId) ?? null) : null,
    createdAt: e.createdAt.toISOString(),
  }));

  res.json({
    totalEmbeds: totalEmbedsRow?.count ?? 0,
    totalFolders: totalFoldersRow?.count ?? 0,
    unorganizedCount: unorganizedRow?.count ?? 0,
    recentEmbeds,
  });
});

export default router;
