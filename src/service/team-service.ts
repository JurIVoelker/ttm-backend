import slugify from "slugify";
import { prisma } from "../prisma/prisma";
import { generateInviteToken } from "../lib/auth";
import { Player, Team, TeamType } from "../prisma/generated/client";
import { dtoFromKeys } from "../lib/dto";
import { getTeamType } from "../lib/team";
import { TeamDTO } from "../types/leader";
import { HTTPException } from "hono/http-exception";
import { PlayerService } from "./player-service";

export class TeamService {
  public async create({
    name,
    groupIndex,
    _type,
  }: {
    name: string;
    groupIndex: number;
    _type?: TeamType;
  }) {
    const inviteToken = generateInviteToken();

    const type = _type ?? getTeamType(name);

    const team = await prisma.team.create({
      data: {
        name: name,
        slug: slugify(name),
        groupIndex,
        inviteToken,
        type,
      },
    });

    return this.toDTO(team);
  }

  public async getInviteToken(teamSlug: string): Promise<string | null> {
    const team = await prisma.team.findUnique({
      where: { slug: teamSlug },
      select: { inviteToken: true },
    });

    return team ? team.inviteToken : null;
  }

  public toDTO(team: Team) {
    return dtoFromKeys(team, ["name", "slug", "groupIndex", "type"]) as TeamDTO;
  }

  public async addLeader({
    teamSlug,
    leaderId,
  }: {
    teamSlug: string;
    leaderId: string;
  }): Promise<void> {
    await prisma.team.update({
      where: { slug: teamSlug },
      data: {
        leaders: {
          connect: { id: leaderId },
        },
      },
    });
  }

  public async exists(teamSlug: string): Promise<boolean> {
    const slug = await prisma.team.findUnique({
      where: {
        slug: teamSlug,
      },
    });
    return slug !== null;
  }

  public async nameExists(name: string): Promise<boolean> {
    const slug = slugify(name);
    const exists = await this.exists(slug);
    return exists;
  }

  public async playerInTeam(
    player: Player,
    teamSlug: string,
  ): Promise<boolean> {
    const team = await prisma.team.findUnique({
      where: { slug: teamSlug, members: { some: { id: player.id } } },
    });
    return team !== null;
  }

  public async getTeams() {
    const teams = await prisma.team.findMany();
    return teams.map((team) => this.toDTO(team));
  }

  public async getTeamsWithPositions() {
    const positions = await prisma.player.findMany({
      include: {
        positions: true,
      },
    });

    const teamTypes = Object.values(TeamType);

    const returnValue: { teamType: TeamType; players: Player[] }[] =
      teamTypes.map((teamType) => ({ teamType, players: [] }));

    for (const position of positions) {
      const teamTypeEntry = returnValue.find(
        (entry) => entry.teamType === position.positions[0]?.teamType,
      );
      if (!teamTypeEntry) continue;
      const playerDTO = PlayerService.toSinglePositionDTO(position);
      teamTypeEntry.players.push(playerDTO);
    }

    return returnValue;
  }

  public async getTeamType(teamSlug: string) {
    const team = await prisma.team.findUnique({
      where: { slug: teamSlug },
      select: { type: true },
    });

    if (!team) {
      throw new HTTPException(404, { message: "Team not found" });
    }

    return team.type;
  }

  public async resetTeamMembers(teamSlug: string) {
    await prisma.team.update({
      where: { slug: teamSlug },
      data: {
        members: {
          set: [],
        },
      },
    });
  }

  public async getTeamBySlug(teamSlug: string) {
    const team = await prisma.team.findUnique({
      where: { slug: teamSlug },
    });

    if (!team) {
      throw new HTTPException(404, { message: "Team not found" });
    }
    return team;
  }
}
