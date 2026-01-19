import { prisma } from "../prisma/prisma"

export const dropAll = async () => {
  await prisma.admin.deleteMany();
  await prisma.emailsSent.deleteMany();
  await prisma.hiddenMatch.deleteMany();
  await prisma.match.deleteMany();
  await prisma.matchAvailabilityVote.deleteMany();
  await prisma.passwordReset.deleteMany();
  await prisma.player.deleteMany();
  await prisma.playerPosition.deleteMany();
  await prisma.settings.deleteMany();
  await prisma.team.deleteMany();
  await prisma.teamLeader.deleteMany();
  await prisma.userCredentials.deleteMany();
}