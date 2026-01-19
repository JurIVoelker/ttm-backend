import { Player, PlayerPosition } from "../prisma/generated";

export type PlayerWithPositions = Player & {
  positions: PlayerPosition[]
}

export type PlayerWithPositionDTO = Player & {
  position: PlayerPosition
}