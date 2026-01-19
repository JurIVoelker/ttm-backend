import { dropAll } from "../../lib/db";
import { AdminService } from "../../service/admin-service";
import { AuthService } from "../../service/auth-service";
import { LeaderService } from "../../service/leader-service";
import { MatchService } from "../../service/match-service";
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
const matchService = new MatchService();

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

  await matchService.create({
    data: {
      time: new Date(
        new Date().getTime() + 7 * 24 * 60 * 60 * 1000,
      ).toISOString(),
      location: {
        city: "Berlin",
        hallName: "Sporthalle Mitte",
        streetAddress: "Musterstraße 1",
      },
      isHomeGame: true,
      enemyName: "FC Beispiel",
      type: "REGULAR",
    },
    teamSlug: team.slug,
  });

  const match = await matchService.create({
    data: {
      time: new Date(
        new Date().getTime() + 7 * 24 * 60 * 60 * 1000,
      ).toISOString(),
      location: {
        city: "Berlin",
        hallName: "Sporthalle Zentrum",
        streetAddress: "Musterstraße 2",
      },
      isHomeGame: false,
      enemyName: "FC Beispiel 2",
      type: "CUP",
    },
    teamSlug: team.slug,
  });

  await matchService.vote({
    availability: "AVAILABLE",
    matchId: match.id,
    playerId: player.id,
    teamSlug: defaultPlayer.teamSlug,
  });

  console.log("Database seeded.");
  process.exit(0);
})();
