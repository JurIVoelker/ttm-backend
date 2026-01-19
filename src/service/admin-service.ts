import { prisma } from "../prisma/prisma";

export class AdminService {
  public async create({ email, fullName }: { email: string; fullName: string }) {
    const admin = await prisma.admin.create({
      data: {
        email,
        fullName
      }
    })
    return admin;
  }

  public async findByEmail(email: string) {
    const admin = await prisma.admin.findFirst({
      where: {
        email
      }
    })
    return admin;
  }

  public async exists(email: string): Promise<boolean> {
    const admin = await prisma.admin.findFirst({
      where: {
        email
      }
    })
    return admin !== null;
  }

  public async findMany() {
    const admins = await prisma.admin.findMany();
    return admins;
  }
}