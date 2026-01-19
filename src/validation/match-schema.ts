import z from "zod";
import { MatchType } from "../prisma/generated";
import { MatchService } from "../service/match-service";

const MATCH_TIME_SCHEMA = z.string().refine((date) => !isNaN(Date.parse(date)), { message: "Invalid date format" }).refine((date) => {
  const parsedDate = new Date(date);
  return parsedDate > new Date();
}, { message: "Match time must be in the future" });

export const CREATE_MATCH_SCHEMA = z.object({
  time: MATCH_TIME_SCHEMA,
  enemyName: z.string().min(1),
  isHomeGame: z.boolean(),
  location: z.object({
    hallName: z.string().min(1),
    streetAddress: z.string().min(1),
    city: z.string().min(1),
  }).optional(),
  type: z.enum(Object.values(MatchType)).optional().default(MatchType.REGULAR),
})

const matchService = new MatchService()

export const validateMatchId = z.string().refine(async (matchId: string) => {
  return await matchService.exists(matchId)
}, {
  message: "Match with the given ID does not exist",
})

export const MATCH_ID_PATH = z.object({
  matchId: validateMatchId
})

export const UPDATE_MATCH_SCHEMA = z.object({
  time: MATCH_TIME_SCHEMA,
  isHomeGame: z.boolean(),
  location: z.object({
    hallName: z.string().min(1),
    streetAddress: z.string().min(1),
    city: z.string().min(1),
  }).optional(),
  type: z.enum(Object.values(MatchType)).optional().default(MatchType.REGULAR),
})