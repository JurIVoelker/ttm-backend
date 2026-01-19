import { HTTPException } from "hono/http-exception";
import { prisma } from "../prisma/prisma";

export class LeaderService {
  public async create({ email, fullName }: { email: string; fullName: string }) {
    const leader = await prisma.teamLeader.create({
      data: {
        email,
        fullName
      }
    })
    return leader;
  }

  public async findByEmail(email: string) {
    const leader = await prisma.teamLeader.findFirst({
      where: {
        email
      }
    })
    return leader;
  }

  public async find(id: string) {
    const leader = await prisma.teamLeader.findFirst({
      where: {
        id
      }
    })
    return leader;
  }

  public async findAll() {
    const leaders = await prisma.teamLeader.findMany({
      include: {
        team: true
      }
    });
    return leaders;
  }

  public async exists(email: string): Promise<boolean> {
    const leader = await prisma.teamLeader.findFirst({
      where: {
        email
      }
    })
    return leader !== null;
  }

  public async getLeadersByTeamSlug(teamSlug: string) {
    const leaders = await prisma.teamLeader.findMany({
      where: {
        team: {
          some: {
            slug: teamSlug
          }
        }
      }
    })
    return leaders;
  }

  public async isLeaderAtTeam({ leaderId, teamSlug }: { leaderId?: string; teamSlug: string }) {
    if (!leaderId) throw new Error("leaderId is required");

    const leader = await prisma.teamLeader.findFirst({
      where: {
        id: leaderId,
        team: {
          some: {
            slug: teamSlug
          }
        }
      }
    })

    if (!leader) {
      throw new HTTPException(403, { message: "You are not a leader at this team" });
    }

    return Boolean(leader);
  }

  public async getTeamsOfLeader(email: string) {
    const leader = await prisma.teamLeader.findFirst({
      where: { email },
      include: {
        team: true
      }
    })

    const teams = leader?.team.map((t) => t.slug);

    return { leaderId: leader?.id, teams: teams || [] }
  }

  public async remove({ id, slug }: { id: string, slug?: string }) {
    await prisma.$transaction(async (tx) => {
      const leader = await tx.teamLeader.findUnique({
        where: { id },
        include: {
          team: true
        }
      })

      if (!leader) {
        throw new HTTPException(404, { message: "Leader not found" });
      }

      if (leader.team.length === 0) await tx.teamLeader.delete({ where: { id } });

      const updatedLeader = await tx.teamLeader.update({
        where: { id },
        data: {
          team: {
            disconnect: slug ? { slug } : undefined
          }
        },
        include: {
          team: true
        }
      })

      if (updatedLeader.team.length === 0) await tx.teamLeader.delete({ where: { id } });
    });
  }

  public async update({ id, email, fullName }: { id: string; email?: string; fullName?: string }) {
    const updatedLeader = await prisma.teamLeader.update({
      where: { id },
      data: {
        email,
        fullName
      }
    });

    return updatedLeader;
  }
}