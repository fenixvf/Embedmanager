import { Router } from "express";
import { db, embedsTable, foldersTable } from "@workspace/db";
import { eq, isNull, inArray, desc } from "drizzle-orm";
import {
  CreateEmbedBody,
  UpdateEmbedBody,
  GetEmbedParams,
  UpdateEmbedParams,
  DeleteEmbedParams,
  ListEmbedsQueryParams,
  BulkDeleteEmbedsBody,
  BulkMoveEmbedsBody,
} from "@workspace/api-zod";

const router = Router();

function parseSource(url?: string | null): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    const host = u.hostname.replace("www.", "");
    if (host.includes("youtube.com") || host.includes("youtu.be")) return "YouTube";
    if (host.includes("vimeo.com")) return "Vimeo";
    if (host.includes("twitch.tv")) return "Twitch";
    if (host.includes("dailymotion.com")) return "Dailymotion";
    if (host.includes("facebook.com")) return "Facebook";
    if (host.includes("instagram.com")) return "Instagram";
    if (host.includes("tiktok.com")) return "TikTok";
    if (host.includes("twitter.com") || host.includes("x.com")) return "X";
    if (host.includes("rumble.com")) return "Rumble";
    if (host.includes("odysee.com")) return "Odysee";
    return host;
  } catch {
    return null;
  }
}

async function enrichEmbed(embed: typeof embedsTable.$inferSelect) {
  let folderName: string | null = null;
  if (embed.folderId) {
    const [f] = await db.select().from(foldersTable).where(eq(foldersTable.id, embed.folderId));
    folderName = f?.name ?? null;
  }
  return {
    id: embed.id,
    title: embed.title,
    url: embed.url,
    embedCode: embed.embedCode,
    thumbnail: embed.thumbnail,
    description: embed.description,
    source: embed.source,
    folderId: embed.folderId,
    folderName,
    createdAt: embed.createdAt.toISOString(),
  };
}

router.get("/embeds", async (req, res) => {
  const params = ListEmbedsQueryParams.parse({
    folderId: req.query.folderId !== undefined ? Number(req.query.folderId) : undefined,
    unorganized: req.query.unorganized !== undefined ? req.query.unorganized === "true" : undefined,
  });

  let rows;
  if (params.unorganized) {
    rows = await db
      .select()
      .from(embedsTable)
      .where(isNull(embedsTable.folderId))
      .orderBy(desc(embedsTable.createdAt));
  } else if (params.folderId !== undefined && params.folderId !== null) {
    rows = await db
      .select()
      .from(embedsTable)
      .where(eq(embedsTable.folderId, params.folderId))
      .orderBy(desc(embedsTable.createdAt));
  } else {
    rows = await db.select().from(embedsTable).orderBy(desc(embedsTable.createdAt));
  }

  const folders = await db.select().from(foldersTable);
  const folderMap = new Map(folders.map((f) => [f.id, f.name]));

  const result = rows.map((e) => ({
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

  res.json(result);
});

router.post("/embeds/bulk-delete", async (req, res) => {
  const body = BulkDeleteEmbedsBody.parse(req.body);
  if (body.ids.length === 0) {
    res.json({ count: 0 });
    return;
  }
  const deleted = await db
    .delete(embedsTable)
    .where(inArray(embedsTable.id, body.ids))
    .returning();
  res.json({ count: deleted.length });
});

router.post("/embeds/bulk-move", async (req, res) => {
  const body = BulkMoveEmbedsBody.parse(req.body);
  if (body.ids.length === 0) {
    res.json({ count: 0 });
    return;
  }
  const updated = await db
    .update(embedsTable)
    .set({ folderId: body.folderId ?? null })
    .where(inArray(embedsTable.id, body.ids))
    .returning();
  res.json({ count: updated.length });
});

router.post("/embeds", async (req, res) => {
  const body = CreateEmbedBody.parse(req.body);
  const source = body.source ?? parseSource(body.url);
  const [embed] = await db
    .insert(embedsTable)
    .values({ ...body, source })
    .returning();
  res.status(201).json(await enrichEmbed(embed));
});

router.get("/embeds/:id", async (req, res) => {
  const { id } = GetEmbedParams.parse({ id: Number(req.params.id) });
  const [embed] = await db.select().from(embedsTable).where(eq(embedsTable.id, id));
  if (!embed) {
    res.status(404).json({ error: "Embed not found" });
    return;
  }
  res.json(await enrichEmbed(embed));
});

router.patch("/embeds/:id", async (req, res) => {
  const { id } = UpdateEmbedParams.parse({ id: Number(req.params.id) });
  const body = UpdateEmbedBody.parse(req.body);
  const source = body.source ?? (body.url !== undefined ? parseSource(body.url) : undefined);
  const updateData = source !== undefined ? { ...body, source } : body;
  const [embed] = await db
    .update(embedsTable)
    .set(updateData)
    .where(eq(embedsTable.id, id))
    .returning();
  if (!embed) {
    res.status(404).json({ error: "Embed not found" });
    return;
  }
  res.json(await enrichEmbed(embed));
});

router.delete("/embeds/:id", async (req, res) => {
  const { id } = DeleteEmbedParams.parse({ id: Number(req.params.id) });
  const [embed] = await db.select().from(embedsTable).where(eq(embedsTable.id, id));
  if (!embed) {
    res.status(404).json({ error: "Embed not found" });
    return;
  }
  await db.delete(embedsTable).where(eq(embedsTable.id, id));
  res.status(204).send();
});

export default router;
