import { Hono } from "hono";
import { access, jwtMiddleware } from "../lib/auth";
import { validateJSON, validatePath } from "../lib/validate";
import { TEAM_SLUG_PATH } from "../validation/team-schema";
import { PlayerService } from "../service/player-service";
import { POST_PLAYER_SCHEMA } from "../validation/player-schema";
import { LeaderService } from "../service/leader-service";
import { jwtPayload } from "../types/auth";
import { HTTPException } from "hono/http-exception";

// Config
export const playerController = new Hono();
playerController.use(jwtMiddleware);

// Services
const playerService = new PlayerService();
const leaderService = new LeaderService();

playerController.get("/players", access(["leader", "admin"]), async (c) => {
  const players = await playerService.findAll();
  return c.json({ players });
});

playerController.get(
  "/players/:teamSlug",
  access(["player", "leader", "admin"]),
  validatePath(TEAM_SLUG_PATH),
  async (c) => {
    const { teamSlug } = c.get("path");
    const players = await playerService.findByTeamSlug(teamSlug);
    return c.json({ players });
  },
);

playerController.post(
  "/player/:teamSlug",
  access(["leader", "admin"]),
  validateJSON(POST_PLAYER_SCHEMA),
  validatePath(TEAM_SLUG_PATH),
  async (c) => {
    const { teamSlug } = c.get("path");
    const { fullName, position } = c.get("json");
    const { leader, roles } = c.get("jwtPayload") as jwtPayload;

    if (!roles.includes("admin")) {
      await leaderService.isLeaderAtTeam({
        leaderId: leader?.id,
        teamSlug: teamSlug,
      });
    }

    const positionExists = await playerService.positionExistsBySlug({
      position,
      teamSlug,
    });

    if (positionExists)
      throw new HTTPException(400, {
        message: "Position already exists in team",
      });

    let player = await playerService.findByFullName(fullName);

    if (player) {
      await playerService.createPosition({
        playerId: player.id,
        position,
        teamSlug,
      });
    } else {
      player = await playerService.create({ fullName, position, teamSlug });
    }

    return c.json({ player });
  },
);
