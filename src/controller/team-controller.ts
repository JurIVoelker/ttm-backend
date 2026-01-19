import { Hono } from "hono";
import { access, jwtMiddleware } from "../lib/auth";
import {
  validateIsLeaderOfTeam,
  validateJSON,
  validatePath,
} from "../lib/validate";
import { TeamService } from "../service/team-service";
import { POST_TEAM_SCHEMA, TEAM_SLUG_PATH } from "../validation/team-schema";
import { romanToInt } from "../lib/roman";
import { HTTPException } from "hono/http-exception";
import { LeaderService } from "../service/leader-service";
import logger from "../lib/logger";
import { PLAYER_IDS_SCHEMA } from "../validation/player-schema";
import { PlayerService } from "../service/player-service";

// Config
export const teamController = new Hono();
teamController.use(jwtMiddleware);

// Services
const teamService = new TeamService();
const leaderService = new LeaderService();
const playerService = new PlayerService();

// Routes
teamController.get(
  "/teams",
  access(["player", "leader", "admin"]),
  async (c) => {
    const teams = await teamService.getTeams();
    return c.json({ teams });
  },
);

teamController.get(
  "/teams/types/positions",
  access(["player", "leader", "admin"]),
  async (c) => {
    const teams = await teamService.getTeamsWithPositions();
    return c.json({ teams });
  },
);

teamController.post(
  "/team",
  access("admin"),
  validateJSON(POST_TEAM_SCHEMA),
  async (c) => {
    const { name } = c.get("json");
    let groupIndex;
    try {
      groupIndex = romanToInt(name.split(" ").pop() || "");
    } catch (e) {
      logger.error({ name }, "Could not parse team index");
      throw new HTTPException(400, { message: "Could not parse team index" });
    }

    const exists = await teamService.nameExists(name);
    if (exists) {
      logger.warn({ name }, "Team with this name already exists");
      throw new HTTPException(409, {
        message: "Team with this name already exists",
      });
    }

    const team = await teamService.create({ groupIndex, name });
    logger.info({ name, groupIndex }, "Created new team");
    return c.json(team);
  },
);

teamController.post(
  "/team/:teamSlug/players",
  access(["leader", "admin"]),
  validatePath(TEAM_SLUG_PATH),
  validateJSON(PLAYER_IDS_SCHEMA),
  validateIsLeaderOfTeam(),
  async (c) => {
    const { teamSlug } = c.get("path");
    const { playerIds } = c.get("json");

    await teamService.resetTeamMembers(teamSlug);

    for (const playerId of playerIds) {
      await playerService.addToTeam(playerId, teamSlug);
    }

    return c.json({ message: "Players added to team" });
  },
);

teamController.get(
  "/team/:teamSlug/inviteToken",
  access(["leader", "admin"]),
  validatePath(TEAM_SLUG_PATH),
  validateIsLeaderOfTeam(),
  async (c) => {
    const { teamSlug } = c.get("path");

    const inviteToken = await teamService.getInviteToken(teamSlug);

    return c.json({ inviteToken });
  },
);
