import z from "zod";

export const POST_SYNC_IDS_SCHEMA = z.object({
  ids: z.array(z.string()),
});


export const POST_SYNC_SETTINGS_SCHEMA = z.object({
  autoSync: z.boolean().optional(),
  includeRRSync: z.boolean().optional(),
});
