import z from "zod"
import { TeamService } from "../service/team-service"
import { validateMatchId } from "./match-schema"
import { Availability } from "../prisma/generated"
import { playerIdSchema } from "./player-schema"

const teamService = new TeamService()

export const validateTeamSlug = z.string().refine(async (teamSlug: string) => {
  return await teamService.exists(teamSlug)
}, {
  message: "Team with the given slug does not exist",
})

export const POST_TEAM_SCHEMA = z.object({
  name: z.string().min(3).max(50),
})

export const POST_VOTE_SCHEMA = z.object({
  availability: z.enum(Availability),
})

export const POST_LINEUP_SCHEMA = z.object({
  playerIds: z.array(playerIdSchema).min(1),
})

export const TEAM_SLUG_PATH = z.object({
  teamSlug: validateTeamSlug
})

export const TEAM_SLUG_AND_MATCH_ID_PATH = z.object({
  teamSlug: validateTeamSlug,
  matchId: validateMatchId
})
