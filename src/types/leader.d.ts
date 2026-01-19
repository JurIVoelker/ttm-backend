import { TeamType } from "../prisma/generated";

export type TeamDTO = {
  name: string;
  slug: string;
  groupIndex: number;
  type: TeamType;
};
