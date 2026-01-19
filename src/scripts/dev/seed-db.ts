import { dropAll } from "../../lib/db";
import { AdminService } from "../../service/admin-service";
import { AuthService } from "../../service/auth-service";
import { LeaderService } from "../../service/leader-service";
import { PlayerService } from "../../service/player-service";
import { TeamService } from "../../service/team-service";
import {
  defaultPassword,
  defaultPlayer,
  defaultTeam,
  defaultUser,
  secondDefaultTeam,
} from "../../test/helpers/test-constants";

console.log("Seeding database...");

const teamService = new TeamService();
const leaderService = new LeaderService();
const adminService = new AdminService();
const authService = new AuthService();
const playerService = new PlayerService();

(async () => {
  await dropAll();

  const team = await teamService.create(defaultTeam);
  const team2 = await teamService.create(secondDefaultTeam);
  const team3 = await teamService.create({
    name: "Erwachsene III",
    groupIndex: 3,
  });
  const leader = await leaderService.create(defaultUser);

  await teamService.addLeader({ teamSlug: team.slug, leaderId: leader.id });

  await adminService.create(defaultUser);
  await authService.createUserCredentials(defaultUser.email, defaultPassword);

  const player = await playerService.create(defaultPlayer);
  const player2 = await playerService.create({
    fullName: "Juri Völker",
    teamSlug: team.slug,
    position: 2,
  });
  await playerService.create({
    fullName: "Other Player",
    teamSlug: team.slug,
    position: 3,
  });
  await playerService.create({
    fullName: "Another Player",
    teamSlug: team.slug,
    position: 4,
  });
  await playerService.create({
    fullName: "Another Player 2",
    teamSlug: team.slug,
    position: 5,
  });
  await playerService.create({
    fullName: "Another Player 3",
    teamSlug: team2.slug,
    position: 1,
  });
  await playerService.create({
    fullName: "Another Player 4",
    teamSlug: team2.slug,
    position: 2,
  });
  await playerService.create({
    fullName: "Another Player 5",
    teamSlug: team3.slug,
    position: 1,
  });

  await playerService.addToTeam(player.id, defaultPlayer.teamSlug);
  await playerService.addToTeam(player2.id, defaultPlayer.teamSlug);

  console.log("Database seeded.");
  process.exit(0);
})();
