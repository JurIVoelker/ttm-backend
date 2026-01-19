import { dropAll } from "../../lib/db";
import { beforeEach, expect, test } from "bun:test"
import { TeamService } from "../../service/team-service";
import { LeaderService } from "../../service/leader-service";
import { AdminService } from "../../service/admin-service";
import { AuthService } from "../../service/auth-service";
import { PlayerService } from "../../service/player-service";
import { defaultPassword, defaultPlayer, defaultTeam, defaultUser } from "../helpers/test-constants";
import { authenticate } from "../helpers/request-helper";
import { decode, sign } from "hono/jwt";
import { jwtPayload } from "../../types/auth";
import { request } from "../../lib/request";
import { createDefaultTeamWithLeader } from "../helpers/default-helper";

beforeEach(async () => {
  await dropAll();
})

const teamService = new TeamService();
const leaderService = new LeaderService();
const authService = new AuthService();
const playerService = new PlayerService();
const adminService = new AdminService();


test("/api/auth/team/join: jwt player", async () => {
  // Setup
  const team = await teamService.create(defaultTeam)
  const player = await playerService.create(defaultPlayer)
  await playerService.addToTeam(player.id, team.slug);
  const inviteToken = await teamService.getInviteToken(team.slug);

  // Execute
  const jwtResponse = await request({
    path: `/api/auth/team/join`,
    method: "POST",
    body: {
      playerId: player.id,
      inviteToken
    }
  })

  const payload = decode(jwtResponse.data.jwt).payload as jwtPayload;

  expect(payload.admin).toBeUndefined();
  expect(payload.leader).toBeUndefined();
  expect(payload.player).toEqual({ id: player.id, teams: [team.slug] });
  expect(payload.roles).toEqual(["player"])
})


test("/api/auth/login/credentials: jwt leader", async () => {
  // Setup
  const leaderTeam = await teamService.create(defaultTeam)
  const leader = await leaderService.create(defaultUser)
  await teamService.addLeader({ teamSlug: leaderTeam.slug, leaderId: leader.id })
  await authService.createUserCredentials(defaultUser.email, defaultPassword);

  // Execute
  const jwt = await authenticate(defaultUser.email, defaultPassword);
  const payload = decode(jwt.data.jwt).payload as jwtPayload;

  expect(payload.admin).toBeUndefined();
  expect(payload.leader).toEqual({ email: defaultUser.email, id: leader.id, teams: [leaderTeam.slug] });
  expect(payload.player).toBeUndefined();
  expect(payload.roles).toEqual(["leader"])
})

test("/api/auth/team/join: jwt leader and player", async () => {
  // Setup
  const leaderTeam = await teamService.create(defaultTeam)
  const leader = await leaderService.create(defaultUser)
  const player = await playerService.create(defaultPlayer)
  await playerService.addToTeam(player.id, leaderTeam.slug);
  await teamService.addLeader({ teamSlug: leaderTeam.slug, leaderId: leader.id })
  await authService.createUserCredentials(defaultUser.email, defaultPassword);

  // Execute
  const jwt = await authenticate(defaultUser.email, defaultPassword);

  const inviteTokenResponse = await request({
    path: `/api/team/${leaderTeam.slug}/inviteToken`,
    method: "GET",
    token: jwt.data.jwt
  })

  const jwtResponse = await request({
    path: `/api/auth/team/join`,
    method: "POST",
    token: jwt.data.jwt,
    body: {
      playerId: player.id,
      inviteToken: inviteTokenResponse.data.inviteToken
    }
  })

  const payload = decode(jwtResponse.data.jwt).payload as jwtPayload;

  expect(payload.admin).toBeUndefined();
  expect(payload.leader).toEqual({ email: defaultUser.email, id: leader.id, teams: [leaderTeam.slug] });
  expect(payload.player).toEqual({ id: player.id, teams: [leaderTeam.slug] });
  expect(payload.roles).toEqual(["leader", "player"])
})

test("/api/auth/team/join: leader with self signed jwt", async () => {
  // Setup
  const leaderTeam = await teamService.create(defaultTeam)
  const leader = await leaderService.create(defaultUser)
  const player = await playerService.create(defaultPlayer)
  await playerService.addToTeam(player.id, leaderTeam.slug);
  await teamService.addLeader({ teamSlug: leaderTeam.slug, leaderId: leader.id })
  await authService.createUserCredentials(defaultUser.email, defaultPassword);

  // Execute
  const jwt = await authenticate(defaultUser.email, defaultPassword);

  const inviteTokenResponse = await request({
    path: `/api/team/${leaderTeam.slug}/inviteToken`,
    method: "GET",
    token: jwt.data.jwt
  })

  const selfSignedJwt = await sign({
    roles: ["leader"],
    admin: undefined,
    exp: Math.floor(Date.now() / 1000) + 60 * 5,
    iat: Date.now(),
    leader: {
      email: defaultUser.email,
      id: leader.id,
      teams: [leaderTeam.slug]
    },
    player: undefined
  }, "invalid-secret")

  const jwtResponse = await request({
    path: `/api/auth/team/join`,
    method: "POST",
    token: selfSignedJwt,
    body: {
      playerId: player.id,
      inviteToken: inviteTokenResponse.data.inviteToken
    }
  })

  const payload = decode(jwtResponse.data.jwt).payload as jwtPayload;

  expect(payload.admin).toBeUndefined();
  expect(payload.leader).toBeUndefined();
  expect(payload.player).toEqual({ id: player.id, teams: [leaderTeam.slug] });
  expect(payload.roles).toEqual(["player"])
})



test("/api/auth/login/credentials: jwt admin", async () => {
  // Setup
  const admin = await adminService.create(defaultUser)
  await authService.createUserCredentials(defaultUser.email, defaultPassword);

  // Execute
  const jwt = await authenticate(defaultUser.email, defaultPassword);
  const payload = decode(jwt.data.jwt).payload as jwtPayload;

  expect(payload.admin).toEqual({ email: defaultUser.email, id: admin.id });
  expect(payload.leader).toBeUndefined();
  expect(payload.player).toBeUndefined();
  expect(payload.roles).toEqual(["admin"])
})


test("/api/auth/login/credentials: jwt admin and leader", async () => {
  // Setup
  const admin = await adminService.create(defaultUser)
  await authService.createUserCredentials(defaultUser.email, defaultPassword);

  const leaderTeam = await teamService.create(defaultTeam)
  const leader = await leaderService.create(defaultUser)
  await teamService.addLeader({ teamSlug: leaderTeam.slug, leaderId: leader.id })

  // Execute
  const jwt = await authenticate(defaultUser.email, defaultPassword);
  const payload = decode(jwt.data.jwt).payload as jwtPayload;

  expect(payload.admin).toEqual({ email: defaultUser.email, id: admin.id });
  expect(payload.leader).toEqual({ email: defaultUser.email, id: leader.id, teams: [leaderTeam.slug] });
  expect(payload.player).toBeUndefined();
  expect(payload.roles).toEqual(["admin", "leader"])
})

test("/api/auth/team/join: player", async () => {
  // Setup
  const team = await teamService.create(defaultTeam)
  const player = await playerService.create(defaultPlayer)
  await playerService.addToTeam(player.id, team.slug);
  const inviteToken = await teamService.getInviteToken(team.slug);

  const jwtResponse = await request({
    path: `/api/auth/team/join`,
    method: "POST",
    body: {
      playerId: player.id,
      inviteToken
    }
  })

  const payload = decode(jwtResponse.data.jwt).payload as jwtPayload;

  expect(payload.admin).toBeUndefined();
  expect(payload.leader).toBeUndefined();
  expect(payload.player).toEqual({ id: player.id, teams: [team.slug] });
  expect(payload.roles).toEqual(["player"])
})
