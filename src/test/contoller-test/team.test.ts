import { beforeEach, expect, test } from "bun:test"
import { createDefaultTeamWithLeader } from "../helpers/default-helper";
import { authenticate } from "../helpers/request-helper";
import { dropAll } from "../../lib/db";
import { TeamService } from "../../service/team-service";
import { LeaderService } from "../../service/leader-service";
import { AdminService } from "../../service/admin-service";
import { AuthService } from "../../service/auth-service";
import { PlayerService } from "../../service/player-service";
import { defaultPassword, defaultTeam, defaultUser } from "../helpers/test-constants";
import { request } from "../../lib/request";

beforeEach(async () => {
  await dropAll();
})

const teamService = new TeamService();
const leaderService = new LeaderService();
const authService = new AuthService();
const playerService = new PlayerService();


test("/team/:teamSlug/players: Add to team without this team permission", async () => {
  // Setup
  const targetTeam = await teamService.create(defaultTeam)
  const leaderTeam = await teamService.create({ name: "Erwachsene II", groupIndex: 2 })

  const testPlayer = await playerService.create({ fullName: "Test Player", teamSlug: targetTeam.slug, position: 1 })

  const leader = await leaderService.create(defaultUser)
  await teamService.addLeader({ teamSlug: leaderTeam.slug, leaderId: leader.id })

  await authService.createUserCredentials(defaultUser.email, defaultPassword);
  const { jwt } = (await authenticate(defaultUser.email, defaultPassword)).data

  // Execute
  const { error } = await request({
    path: `/api/team/${targetTeam.slug}/players`,
    token: jwt,
    method: "POST",
    body: {
      playerIds: [testPlayer.id]
    },
    allowError: true
  })

  expect(error?.status).toBe(403);
})


test("/team/:teamSlug/players: Add to team", async () => {
  const { leader, team } = await createDefaultTeamWithLeader()
  const testPlayer = await playerService.create({ fullName: "Test Player", teamSlug: team.slug, position: 1 })
  const jwt = await authenticate(leader.email, defaultPassword)

  const { res } = await request({
    path: `/api/team/${team.slug}/players`,
    token: jwt.data.jwt,
    method: "POST",
    body: {
      playerIds: [testPlayer.id]
    },
  })

  expect(res?.status).toBe(200);

  const { data } = await request({
    path: `/api/players/${team.slug}`,
    token: jwt.data.jwt,
    method: "GET",
  })

  const targetPlayer = data.players[0];

  expect(targetPlayer).toBeDefined();
  expect(targetPlayer.fullName).toBe(testPlayer.fullName);
  expect(targetPlayer.id).toBe(testPlayer.id);
  expect(targetPlayer.position).toEqual({
    position: 1,
    teamIndex: team.groupIndex,
    teamType: team.type,
    playerId: testPlayer.id,
    id: targetPlayer.position.id
  })
})