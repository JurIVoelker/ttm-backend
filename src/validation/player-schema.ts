import z from "zod";
import { PlayerService } from "../service/player-service";
import { TeamType } from "../prisma/generated";

const playerService = new PlayerService();

export const POST_PLAYER_SCHEMA = z.object({
  fullName: z.string().min(3).max(100),
  position: z.number(),
});

export const playerIdSchema = z
  .string()
  .refine(async (val) => await playerService.exists(val), {
    message: "Player with the given ID does not exist",
  });

export const PLAYER_IDS_SCHEMA = z.object({
  playerIds: z.array(playerIdSchema),
});


export const POST_PLAYER_POSITIONS_SCHEMA = z.object({
  players: z.array(z.object({
    id: z.string(),
    fullName: z.string().min(3).max(100),
    positions: z.array(z.object({
      teamType: z.enum(TeamType),
      teamIndex: z.number(),
      position: z.number(),
    }).loose()),
  }))
});
