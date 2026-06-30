import { dropAll } from "../../lib/db";
import { beforeEach, expect, test } from "bun:test";
import { AdminService } from "../../service/admin-service";
import { AuthService } from "../../service/auth-service";
import { LeaderService } from "../../service/leader-service";
import { TeamService } from "../../service/team-service";
import { defaultPassword, defaultTeam, defaultUser } from "../helpers/test-constants";
import { authenticate } from "../helpers/request-helper";
import { request } from "../../lib/request";
import { SyncLogService } from "../../service/sync-log-service";

beforeEach(async () => {
  await dropAll();
});

const adminService = new AdminService();
const authService = new AuthService();
const leaderService = new LeaderService();
const teamService = new TeamService();
const syncLogService = new SyncLogService();

test("GET /api/sync/players: returns grouped players for admin", async () => {
  // Setup
  await adminService.create(defaultUser);
  await authService.createUserCredentials(defaultUser.email, defaultPassword);
  const jwt = await authenticate();

  // Execute
  const res = await request({
    path: "/api/sync/players",
    token: jwt.data.jwt,
  });

  // Assert
  expect(res.res?.status).toBe(200);
  expect(Array.isArray(res.data)).toBe(true);
  for (const group of res.data) {
    expect(typeof group.teamType).toBe("string");
    expect(Array.isArray(group.players)).toBe(true);
    for (const player of group.players) {
      expect(typeof player.name).toBe("string");
      expect(typeof player.QTTR).toBe("number");
      expect(typeof player.position).toBe("string");
      expect(typeof player.teamIndex).toBe("string");
    }
  }
});

test("GET /api/sync/players: 401 without token", async () => {
  const res = await request({
    path: "/api/sync/players",
    allowError: true,
  });

  expect(res.error?.status).toBe(401);
});

test("GET /api/sync/logs: returns logs for admin", async () => {
  // Setup
  await adminService.create(defaultUser);
  await authService.createUserCredentials(defaultUser.email, defaultPassword);
  const jwt = await authenticate();
  await syncLogService.create({
    trigger: "AUTO",
    status: "COMPLETED",
    includeRRSync: false,
    autoSync: true,
    successfulSyncsCount: 1,
  });

  // Execute
  const res = await request({
    path: "/api/sync/logs",
    token: jwt.data.jwt,
  });

  // Assert
  expect(res.res?.status).toBe(200);
  expect(Array.isArray(res.data)).toBe(true);
  expect(res.data.length).toBeGreaterThanOrEqual(1);
  expect(res.data[0].trigger).toBe("AUTO");
  expect(res.data[0].status).toBe("COMPLETED");
});

test("GET /api/sync/logs: 401 without token", async () => {
  const res = await request({
    path: "/api/sync/logs",
    allowError: true,
  });

  expect(res.error?.status).toBe(401);
});

test("GET /api/sync/logs: 403 for non-admin", async () => {
  // Setup - create leader
  const team = await teamService.create(defaultTeam);
  const leader = await leaderService.create(defaultUser);
  await teamService.addLeader({ teamSlug: team.slug, leaderId: leader.id });
  await authService.createUserCredentials(defaultUser.email, defaultPassword);
  const jwt = await authenticate();

  // Execute
  const res = await request({
    path: "/api/sync/logs",
    token: jwt.data.jwt,
    allowError: true,
  });

  expect(res.error?.status).toBe(403);
});

test("GET /api/sync/players: 403 for non-admin", async () => {
  // Setup - create leader
  const team = await teamService.create(defaultTeam);
  const leader = await leaderService.create(defaultUser);
  await teamService.addLeader({ teamSlug: team.slug, leaderId: leader.id });
  await authService.createUserCredentials(defaultUser.email, defaultPassword);
  const jwt = await authenticate();

  // Execute
  const res = await request({
    path: "/api/sync/players",
    token: jwt.data.jwt,
    allowError: true,
  });

  expect(res.error?.status).toBe(403);
});
