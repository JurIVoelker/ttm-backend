import { Team, TeamType } from "../prisma/generated";
import { prisma } from "../prisma/prisma";
import { TeamService } from "./team-service";


const teamService = new TeamService();

export class LocationService {
  public async locationService(slug: string) {
    const players = await prisma.player.findMany({
      where: {
        teams: {
          some: { slug }
        }
      }
    })
    return players;
  }
}