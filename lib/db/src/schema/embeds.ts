import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const embedsTable = pgTable("embeds", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  url: text("url"),
  embedCode: text("embed_code").notNull(),
  thumbnail: text("thumbnail"),
  description: text("description"),
  source: text("source"),
  folderId: integer("folder_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertEmbedSchema = createInsertSchema(embedsTable).omit({ id: true, createdAt: true });
export type InsertEmbed = z.infer<typeof insertEmbedSchema>;
export type Embed = typeof embedsTable.$inferSelect;
