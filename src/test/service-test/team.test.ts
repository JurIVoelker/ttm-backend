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
