import slugify from "slugify";
import logger from "../lib/logger";
import { translateTeamType } from "../lib/team";
import { Team, TeamType } from "../prisma/generated";
import { prisma } from "../prisma/prisma";
import { PlayerWithPositions } from "../types/player";
import { TeamService } from "./team-service";
import { intToRoman } from "../lib/roman";
import { generateInviteToken } from "../lib/auth";

export class PlayerService {
  private teamService = new TeamService();

  public async findByTeamSlug(slug: string) {
    const teamType = await this.teamService.getTeamType(slug);

    const players = await prisma.player.findMany({
      where: {
        teams: {
          some: { slug },
        },
      },
      include: {
        positions: {
          where: { teamType },
        },
      },
    });

    return players.map((p) => PlayerService.toSinglePositionDTO(p));
  }

  public static toSinglePositionDTO(player: PlayerWithPositions) {
    if (player.positions.length > 1) {
      logger.fatal(
        `Player ${player.id} (${player.fullName}) has multiple positions`,
      );
      throw new Error("Player has multiple positions");
    }

    const position = player.positions[0] ?? null;

    const dto = { ...player, position, positions: undefined };
    delete dto.positions;

    return dto;
  }

  public async positionExists({
    position,
    index,
    teamType,
  }: {
    position: number;
    index: number;
    teamType: TeamType;
  }) {
    const exists = await prisma.playerPosition.findFirst({
      where: {
        position,
        teamIndex: index,
        teamType: teamType,
      },
    });

    return Boolean(exists);
  }

  public async isOfType({
    playerId,
    teamType,
  }: {
    playerId: string;
    teamType: TeamType;
  }) {
    const isOfType = await prisma.playerPosition.findFirst({
      where: {
        playerId,
        teamType,
      },
    });

    return Boolean(isOfType);
  }

  public async findByFullName(fullName: string) {
    return await prisma.player.findFirst({
      where: { fullName },
    });
  }

  public async positionExistsBySlug({
    position,
    teamSlug,
  }: {
    position: number;
    teamSlug: string;
  }) {
    const team = await this.teamService.getTeamBySlug(teamSlug);

    const exists = await prisma.playerPosition.findFirst({
      where: {
        position,
        teamIndex: team.groupIndex,
        teamType: team.type,
      },
    });

    return Boolean(exists);
  }

  public async createPosition({
    playerId,
    position,
    teamSlug,
  }: {
    playerId: string;
    position: number;
    teamSlug: string;
  }) {
    const team = await this.teamService.getTeamBySlug(teamSlug);

    return await prisma.playerPosition.create({
      data: {
        position,
        teamIndex: team.groupIndex,
        teamType: team.type,
        playerId,
      },
    });
  }

  public async create({
    fullName,
    position,
    teamSlug,
  }: {
    fullName: string;
    position?: number;
    teamSlug?: string;
  }) {
    let team: Team | null = null;
    if (teamSlug) {
      team = await this.teamService.getTeamBySlug(teamSlug);
    }

    const txResult = await prisma.$transaction(async (tx) => {
      const player = await tx.player.create({
        data: {
          fullName,
        },
      });

      if (position !== undefined && team) {
        await tx.playerPosition.create({
          data: {
            position,
            teamIndex: team.groupIndex,
            teamType: team.type,
            playerId: player.id,
          },
        });
      }

      return player;
    });

    return txResult;
  }

  public async exists(playerId: string) {
    const player = await prisma.player.findUnique({
      where: { id: playerId },
    });
    return Boolean(player);
  }

  public async existsByFullName(fullName: string) {
    const player = await this.findByFullName(fullName);
    return Boolean(player);
  }

  public async addToTeam(playerId: string, teamSlug: string) {
    const players = prisma.player.update({
      where: { id: playerId },
      data: {
        teams: {
          connect: { slug: teamSlug },
        },
      },
    });

    return players;
  }

  public async findAll() {
    return await prisma.player.findMany({
      include: { positions: true },
    });
  }

  public async getTeamMembershipsVerified(
    playerId: string,
    inviteToken: string,
  ) {
    const player = await prisma.player.findUnique({
      where: {
        id: playerId,
      },
      include: {
        teams: true,
      },
    });

    if (!player) {
      throw new Error("Player not found");
    }

    const isVerified = player.teams.some(
      (team) => team.inviteToken === inviteToken,
    );

    if (!isVerified) {
      throw new Error("Invite token does not match any of the player's teams");
    }

    return player.teams.map((team) => team.slug);
  }

  public async getTeamMemberships(playerId: string) {
    const player = await prisma.player.findUnique({
      where: {
        id: playerId,
      },
      include: {
        teams: true,
      },
    });

    if (!player) {
      throw new Error("Player not found");
    }

    return player.teams.map((team) => team.slug);
  }

  public async updatePositions(players: PlayerWithPositions[], teamType: TeamType) {
    const txResult = await prisma.$transaction(async (tx) => {
      const existingTeams = await tx.team.findMany({
        where: { type: teamType },
      })

      await tx.playerPosition.deleteMany({
        where: {
          teamType: teamType,
        }
      })

      const newTeamPositions = players
        .flatMap((player) => player.positions.find((p) => p.teamType === teamType))
        .filter((p) => Boolean(p))
        .map((p) => ({ teamIndex: p!.teamIndex, position: p!.position, teamType, playerId: p!.playerId }));

      for (const pos of newTeamPositions) {
        const team = existingTeams.find(t => t.type === pos.teamType && t.groupIndex === pos.teamIndex);
        if (!team) {
          const result = await tx.team.create({
            data: {
              name: `${translateTeamType(teamType)} ${intToRoman(pos.teamIndex)}`,
              groupIndex: pos.teamIndex,
              type: teamType,
              slug: slugify(`${translateTeamType(teamType)} ${intToRoman(pos.teamIndex)}`),
              inviteToken: generateInviteToken(),
            }
          })
          logger.info(`Created new team: ${result.name}`);
        }
      }

      await tx.playerPosition.createMany({
        data: newTeamPositions,
      });

      logger.info(`Persisted ${newTeamPositions.length} player positions for team type ${teamType}`);
    });

    return txResult;
  }
}
