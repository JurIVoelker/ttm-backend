import { AdminService } from "../../service/admin-service";
import { AuthService } from "../../service/auth-service";
import { LeaderService } from "../../service/leader-service";
import { MatchService } from "../../service/match-service";
import { PlayerService } from "../../service/player-service";
import { TeamService } from "../../service/team-service";
import { defaultMatchData, defaultPassword, defaultPlayer, defaultTeam, defaultUser } from "./test-constants";

const teamService = new TeamService();
const leaderService = new LeaderService();
const adminService = new AdminService();
const authService = new AuthService();
const playerService = new PlayerService();
const matchService = new MatchService();

export const createDefaultTeamWithLeader = async () => {
  const team = await teamService.create(defaultTeam);
  const leader = await leaderService.create(defaultUser);
  await teamService.addLeader({ teamSlug: team.slug, leaderId: leader.id })
  await authService.createUserCredentials(defaultUser.email, defaultPassword);
  const inviteToken = await teamService.getInviteToken(team.slug);
  return { team, leader, inviteToken }
}


export const createDefaultTeam = async () => {
  const team = await teamService.create(defaultTeam);
  const leader = await leaderService.create(defaultUser);
  await teamService.addLeader({ teamSlug: team.slug, leaderId: leader.id })
  await authService.createUserCredentials(defaultUser.email, defaultPassword);
  const inviteToken = await teamService.getInviteToken(team.slug);
  return { team, leader, inviteToken }
}

export const createTeamWithPlayer = async () => {
  const team = await teamService.create(defaultTeam);
  const inviteToken = await teamService.getInviteToken(team.slug);
  const player = await playerService.create(defaultPlayer);

  return { team, inviteToken, player }
}

export const createTeamWithPlayerAndAdd = async () => {
  const data = await createTeamWithPlayer()
  await playerService.addToTeam(data.player.id, data.team.slug);

  return data
}


export const createAdminWithoutCredentials = async () => {
  const admin = await adminService.create({ email: defaultUser.email, fullName: defaultUser.fullName });
  return { admin }
}

export const createTeamWithLeaderAndDefaultMatch = async () => {
  const team = await teamService.create(defaultTeam);
  const leader = await leaderService.create(defaultUser);
  await teamService.addLeader({ teamSlug: team.slug, leaderId: leader.id })
  await authService.createUserCredentials(defaultUser.email, defaultPassword);
  const inviteToken = await teamService.getInviteToken(team.slug);
  const match = await matchService.create({
    data: defaultMatchData, teamSlug: team.slug
  })
  return { team, leader, inviteToken, match }
}