import z from "zod";

export const POST_SYNC_IDS_SCHEMA = z.object({
  ids: z.array(z.string()),
});
