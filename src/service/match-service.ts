import z from "zod";
import { prisma } from "../prisma/prisma";
import {
  CREATE_MATCH_SCHEMA,
  UPDATE_MATCH_SCHEMA,
} from "../validation/match-schema";
import { HTTPException } from "hono/http-exception";
import { Availability } from "../prisma/generated";

export class MatchService {
  public async getMatchesByTeamSlug(teamSlug: string) {
    const targetTeam = await prisma.team.findUnique({
      where: { slug: teamSlug },
    });

    if (!targetTeam)
      throw new HTTPException(404, {
        message: "Team not found",
        cause: `Team with slug "${teamSlug}" does not exist`,
      });

    const matches = await prisma.match.findMany({
      where: {
        team: {
          slug: teamSlug,
        },
      },
      include: {
        location: true,
        matchAvailabilityVotes: true,
        lineup: {
          where: {
            positions: {
              some: {
                AND: {
                  teamType: targetTeam.type,
                  teamIndex: {
                    lte: targetTeam.groupIndex,
                  },
                },
              },
            },
          },
        },
      },
    });

    const playerPositions = await prisma.playerPosition.findMany({
      where: {
        teamType: targetTeam.type,
        teamIndex: {
          lte: targetTeam.groupIndex,
        },
      },
      orderBy: {
        position: "asc",
      },
    });

    const matchesWithSortedLineup = matches.map((match) => ({
      ...match,
      lineup: match.lineup.sort((a, b) => {
        const posA = playerPositions.findIndex((pp) => pp.playerId === a.id);
        const posB = playerPositions.findIndex((pp) => pp.playerId === b.id);
        return posA - posB;
      }),
    }));

    return matchesWithSortedLineup;
  }

  public async getMatchById(matchId: string) {
    const match = await prisma.match.findUnique({
      where: {
        id: matchId,
      },
      include: {
        location: true,
      },
    });

    return match;
  }

  public async create({
    data,
    teamSlug,
  }: {
    data: z.infer<typeof CREATE_MATCH_SCHEMA>;
    teamSlug: string;
  }) {
    const team = await prisma.team.findUnique({ where: { slug: teamSlug } });
    if (!team)
      throw new HTTPException(404, {
        message: "Team not found",
        cause: `Team with slug "${teamSlug}" does not exist`,
      });
    const { enemyName, isHomeGame, time, type, location } = data;

    const match = await prisma.match.create({
      data: {
        time: new Date(time),
        enemyName,
        isHomeGame,
        type,
        location: !location
          ? undefined
          : {
            create: {
              city: location.city,
              hallName: location.hallName,
              streetAddress: location.streetAddress,
            },
          },
        team: {
          connect: { slug: teamSlug },
        },
      },
      include: {
        location: true,
      },
    });

    return match;
  }

  public async exists(matchId: string) {
    const match = await prisma.match.findUnique({ where: { id: matchId } });
    return Boolean(match);
  }

  public async isMatchOfTeam(matchId: string, teamSlug: string) {
    const match = await prisma.match.findFirst({
      where: {
        id: matchId,
        team: {
          slug: teamSlug,
        },
      },
    });

    return Boolean(match);
  }

  public async update({
    data,
    matchId,
  }: {
    data: z.infer<typeof UPDATE_MATCH_SCHEMA>;
    matchId: string;
  }) {
    const txResult = await prisma.$transaction(async (tx) => {
      const existingLocation = await tx.location.findFirst({
        where: {
          matchId: matchId,
        },
      });

      if (existingLocation && data.location) {
        await tx.location.update({
          where: { id: existingLocation.id },
          data: {
            city: data.location.city,
            hallName: data.location.hallName,
            streetAddress: data.location.streetAddress,
          },
        });
      } else if (!existingLocation && data.location) {
        await tx.location.create({
          data: {
            city: data.location.city,
            hallName: data.location.hallName,
            streetAddress: data.location.streetAddress,
            matchId,
          },
        });
      } else if (existingLocation && !data.location) {
        await tx.location.delete({ where: { id: existingLocation.id } });
      }

      const match = await tx.match.update({
        where: { id: matchId },
        data: {
          time: new Date(data.time),
          isHomeGame: data.isHomeGame,
          type: data.type,
        },
        include: { location: true },
      });

      return match;
    });

    return txResult;
  }

  public async delete(matchId: string) {
    await prisma.match.delete({ where: { id: matchId } });
  }

  public async matchBelongsToTeamAndPlayer({
    matchId,
    teamSlug,
    playerId,
  }: {
    matchId: string;
    teamSlug: string;
    playerId: string;
  }) {
    const match = await prisma.match.findUnique({
      where: {
        id: matchId,
        team: {
          slug: teamSlug,
          members: {
            some: {
              id: playerId,
            },
          },
        },
      },
    });

    return Boolean(match);
  }

  public async vote({
    availability,
    matchId,
    teamSlug,
    playerId,
  }: {
    availability: Availability;
    matchId: string;
    teamSlug: string;
    playerId: string;
  }) {
    const vote = await prisma.matchAvailabilityVote.upsert({
      where: {
        matchId_playerId: {
          matchId,
          playerId,
        },
        match: {
          team: {
            slug: teamSlug,
          },
        },
      },
      create: {
        availability,
        matchId,
        playerId,
      },
      update: {
        availability,
      },
    });
    return vote;
  }

  public async setLineup({
    matchId,
    playerIds,
  }: {
    matchId: string;
    playerIds: string[];
  }) {
    const txResult = await prisma.$transaction(async (tx) => {
      // Remove all existing players from the lineup
      await tx.match.update({
        where: { id: matchId },
        data: {
          lineup: {
            set: [],
          },
        },
      });

      const players = await tx.player.findMany({
        where: {
          id: { in: playerIds },
        },
      });

      const match = await tx.match.update({
        where: { id: matchId },
        data: {
          lineup: {
            connect: players,
          },
        },
        include: {
          lineup: true,
          location: true,
          matchAvailabilityVotes: true,
        },
      });

      return match;
    });
    return txResult;
  }
}
