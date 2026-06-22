import { beforeEach, expect, test } from "bun:test"
import { createDefaultTeam, createDefaultTeamWithLeader } from "../helpers/default-helper";
import { authenticate } from "../helpers/request-helper";
import { dropAll } from "../../lib/db";
import { TeamService } from "../../service/team-service";
import { LeaderService } from "../../service/leader-service";
import { AdminService } from "../../service/admin-service";
import { AuthService } from "../../service/auth-service";
import { PlayerService } from "../../service/player-service";
import { defaultPassword, defaultPlayer, defaultTeam, defaultUser } from "../helpers/test-constants";
import { request } from "../../lib/request";

beforeEach(async () => {
  await dropAll();
})

const teamService = new TeamService();
const leaderService = new LeaderService();
const authService = new AuthService();
const playerService = new PlayerService();

test("getTeams does not return teams with 0 Meldungen", async () => {
  await teamService.create(defaultTeam);

  const teams = await teamService.getTeams();

  expect(teams).toHaveLength(0);
});

test("getTeams returns a team with Meldungen but no members added", async () => {
  const team = await teamService.create(defaultTeam);
  // Creating a player with a position registers a "Meldung" without adding the
  // player to the team's members.
  await playerService.create({
    fullName: defaultPlayer.fullName,
    position: 1,
    teamSlug: team.slug,
  });

  const teams = await teamService.getTeams();

  expect(teams).toHaveLength(1);
  expect(teams[0].slug).toBe(team.slug);
});
