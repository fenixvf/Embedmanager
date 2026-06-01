import { Router } from "express";
import { db, foldersTable, embedsTable } from "@workspace/db";
import { eq, sql, count } from "drizzle-orm";
import {
  CreateFolderBody,
  UpdateFolderBody,
  GetFolderParams,
  UpdateFolderParams,
  DeleteFolderParams,
} from "@workspace/api-zod";

const router = Router();

router.get("/folders", async (req, res) => {
  const folders = await db.select().from(foldersTable).orderBy(foldersTable.name);

  const counts = await db
    .select({ folderId: embedsTable.folderId, count: count() })
    .from(embedsTable)
    .groupBy(embedsTable.folderId);

  const countMap = new Map(counts.map((c) => [c.folderId, c.count]));

  const result = folders.map((f) => ({
    id: f.id,
    name: f.name,
    parentId: f.parentId,
    createdAt: f.createdAt.toISOString(),
    embedCount: countMap.get(f.id) ?? 0,
  }));

  res.json(result);
});

router.post("/folders", async (req, res) => {
  const body = CreateFolderBody.parse(req.body);
  const [folder] = await db.insert(foldersTable).values(body).returning();
  res.status(201).json({
    id: folder.id,
    name: folder.name,
    parentId: folder.parentId,
    createdAt: folder.createdAt.toISOString(),
    embedCount: 0,
  });
});

router.get("/folders/:id", async (req, res) => {
  const { id } = GetFolderParams.parse({ id: Number(req.params.id) });
  const [folder] = await db.select().from(foldersTable).where(eq(foldersTable.id, id));
  if (!folder) {
    res.status(404).json({ error: "Folder not found" });
    return;
  }
  const [countRow] = await db
    .select({ count: count() })
    .from(embedsTable)
    .where(eq(embedsTable.folderId, id));

  res.json({
    id: folder.id,
    name: folder.name,
    parentId: folder.parentId,
    createdAt: folder.createdAt.toISOString(),
    embedCount: countRow?.count ?? 0,
  });
});

router.patch("/folders/:id", async (req, res) => {
  const { id } = UpdateFolderParams.parse({ id: Number(req.params.id) });
  const body = UpdateFolderBody.parse(req.body);
  const [folder] = await db
    .update(foldersTable)
    .set(body)
    .where(eq(foldersTable.id, id))
    .returning();
  if (!folder) {
    res.status(404).json({ error: "Folder not found" });
    return;
  }
  const [countRow] = await db
    .select({ count: count() })
    .from(embedsTable)
    .where(eq(embedsTable.folderId, id));

  res.json({
    id: folder.id,
    name: folder.name,
    parentId: folder.parentId,
    createdAt: folder.createdAt.toISOString(),
    embedCount: countRow?.count ?? 0,
  });
});

router.delete("/folders/:id", async (req, res) => {
  const { id } = DeleteFolderParams.parse({ id: Number(req.params.id) });
  const [folder] = await db.select().from(foldersTable).where(eq(foldersTable.id, id));
  if (!folder) {
    res.status(404).json({ error: "Folder not found" });
    return;
  }
  await db.update(embedsTable).set({ folderId: null }).where(eq(embedsTable.folderId, id));
  await db.delete(foldersTable).where(eq(foldersTable.id, id));
  res.status(204).send();
});

export default router;
