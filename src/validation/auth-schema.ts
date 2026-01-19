import z from "zod";

export const LOGIN_SCHEMA = z.object({
  email: z.email(),
  password: z.string().min(6),
  playerId: z.string().optional(),
  inviteToken: z.string().optional(),
})

export const JOIN_TEAM_SCHEMA = z.object({
  playerId: z.string().optional(),
  inviteToken: z.string().optional(),
})

export const REGISTER_SCHEMA = z.object({
  email: z.email(),
  password: z.string().min(6),
})

export const REFRESH_TOKEN_SCHEMA = z.object({
  refreshToken: z.string(),
})