import { Hono } from "hono";
import { access, jwtMiddleware } from "../lib/auth";
import {
  validateIsLeaderOfTeam,
  validateJSON,
  validatePath,
} from "../lib/validate";
import { MatchService } from "../service/match-service";
import {
  POST_LINEUP_SCHEMA,
  POST_VOTE_SCHEMA,
  TEAM_SLUG_AND_MATCH_ID_PATH,
  TEAM_SLUG_PATH,
} from "../validation/team-schema";
import {
  CREATE_MATCH_SCHEMA,
  UPDATE_MATCH_SCHEMA,
} from "../validation/match-schema";
import { HTTPException } from "hono/http-exception";
import { jwtPayload } from "../types/auth";
import logger from "../lib/logger";
import { PlayerService } from "../service/player-service";
import { TeamService } from "../service/team-service";

// Config
export const matchController = new Hono();
matchController.use(jwtMiddleware);

// Services
const matchService = new MatchService();
const playerService = new PlayerService();
const teamService = new TeamService();

// Routes
matchController.get(
  "/matches/:teamSlug",
  access(["player", "leader", "admin"]),
  validatePath(TEAM_SLUG_PATH),
  async (c) => {
    const { teamSlug } = c.get("path");
    const matches = await matchService.getMatchesByTeamSlug(teamSlug);
    return c.json(matches);
  },
);

matchController.get(
  "/matches/:teamSlug/:matchId",
  access(["player", "leader", "admin"]),
  validatePath(TEAM_SLUG_AND_MATCH_ID_PATH),
  async (c) => {
    const { matchId } = c.get("path");
    const match = await matchService.getMatchById(matchId);
    return c.json(match);
  },
);

matchController.post(
  "/match/:teamSlug",
  access("leader"),
  validatePath(TEAM_SLUG_PATH),
  validateJSON(CREATE_MATCH_SCHEMA),
  validateIsLeaderOfTeam(),
  async (c) => {
    const { teamSlug } = c.get("path");
    const matchData = c.get("json");

    console.log({ matchData });

    const match = await matchService.create({ data: matchData, teamSlug });
    const response = c.json(match, 201);
    response.headers.set("Location", `/api/match/${teamSlug}/${match.id}`);
    return response;
  },
);

matchController.put(
  "/match/:teamSlug/:matchId",
  access("leader"),
  validatePath(TEAM_SLUG_AND_MATCH_ID_PATH),
  validateJSON(UPDATE_MATCH_SCHEMA),
  validateIsLeaderOfTeam(),
  async (c) => {
    const { matchId, teamSlug } = c.get("path");
    const matchData = c.get("json");

    console.log("TEST");
    console.log({ matchData });

    const matchBelongsToTeam = await matchService.isMatchOfTeam(
      matchId,
      teamSlug,
    );

    if (!matchBelongsToTeam) {
      throw new HTTPException(403, {
        message: "Match does not belong to the given team",
        cause: `Match with ID "${matchId}" does not belong to team with slug "${teamSlug}"`,
      });
    }

    const match = await matchService.update({ data: matchData, matchId });
    return c.json(match, 200);
  },
);

matchController.delete(
  "/match/:teamSlug/:matchId",
  access("leader"),
  validatePath(TEAM_SLUG_AND_MATCH_ID_PATH),
  validateIsLeaderOfTeam(),
  async (c) => {
    const { matchId, teamSlug } = c.get("path");

    const matchBelongsToTeam = await matchService.isMatchOfTeam(
      matchId,
      teamSlug,
    );
    if (!matchBelongsToTeam) {
      throw new HTTPException(404, {
        message: "Match not found for the given team",
        cause: `Match with ID "${matchId}" does not belong to team with slug "${teamSlug}"`,
      });
    }

    await matchService.delete(matchId);
    return c.json({ message: "Match deleted successfully" }, 200);
  },
);

matchController.post(
  "/match/:teamSlug/vote/:matchId",
  access("player"),
  validateJSON(POST_VOTE_SCHEMA),
  validatePath(TEAM_SLUG_AND_MATCH_ID_PATH),
  async (c) => {
    const { teamSlug, matchId } = c.get("path");
    const { availability } = c.get("json");
    const { player } = c.get("jwtPayload") as jwtPayload;

    if (!player?.id) throw new HTTPException(401, { message: "Unauthorized" });

    const permitted = await matchService.matchBelongsToTeamAndPlayer({
      matchId,
      teamSlug,
      playerId: player.id,
    });

    if (!permitted) {
      logger.debug(
        `Player with id ${player!.id} is not permitted to vote for match ${matchId} of team ${teamSlug}`,
      );
      throw new HTTPException(403, {
        message: "You are not permitted to vote for this match",
      });
    }

    const vote = await matchService.vote({
      availability,
      matchId,
      teamSlug,
      playerId: player.id,
    });
    return c.json({ message: "Vote recorded successfully", vote }, 200);
  },
);

matchController.post(
  "/match/:teamSlug/lineup/:matchId",
  access("leader"),
  validateJSON(POST_LINEUP_SCHEMA),
  validatePath(TEAM_SLUG_AND_MATCH_ID_PATH),
  validateIsLeaderOfTeam(),
  async (c) => {
    const { teamSlug, matchId } = c.get("path");
    const { playerIds } = c.get("json");

    const permitted = await matchService.matchBelogsToTeam({
      matchId,
      teamSlug,
    });

    if (!permitted) {
      logger.error(
        `Match with id ${matchId} does not belong to team ${teamSlug}`,
      );
      throw new HTTPException(403, {
        message: "You are not permitted to set the lineup for this match",
      });
    }

    const team = await teamService.getTeamBySlug(teamSlug);

    for (const playerId of playerIds) {
      const permitted = await playerService.isOfType({
        playerId,
        teamType: team.type,
      });

      if (!permitted) {
        logger.error(
          `Player with id ${playerId} is not permitted to be in the lineup for match ${matchId} of team ${teamSlug}`,
        );
        throw new HTTPException(403, {
          message: `Player with ID ${playerId} is not permitted in the lineup for this match`,
        });
      }
    }

    const match = await matchService.setLineup({ matchId, playerIds });

    return c.json({ message: "Lineup set successfully", match }, 200);
  },
);
