import z from "zod";

export const ADD_ADMIN_SCHEMA = z.object({
  email: z.email(),
  fullName: z.string().min(3).max(100),
})