import z from "zod";

export const ADD_LEADER_SCHEMA = z.object({
  email: z.email(),
  fullName: z.string().min(3).max(100),
})


export const REMOVE_LEADER_SCHEMA = z.object({
  id: z.string().min(1),
})

export const UPDATE_LEADER_SCHEMA = z.object({
  id: z.string().min(1),
  email: z.email().optional(),
  fullName: z.string().min(3).max(100).optional(),
})