import z from "zod";

export const POST_SUBSCRIBE_NOTIFICATION_SCHEMA = z
  .object({
    endpoint: z.url(),
    expirationTime: z.number().nullable(),
    keys: z.object({
      p256dh: z.string(),
      auth: z.string(),
    }),
  })
  .loose();
