import slugify from "slugify";
import z from "zod";
import { CREATE_MATCH_SCHEMA } from "../../validation/match-schema";
import { TEST_DEFAULT_EMAIL } from "../../config";

export const defaultEmail = TEST_DEFAULT_EMAIL;

if (!defaultEmail)
  throw new Error("TEST_DEFAULT_EMAIL is not set in environment variables");

export const defaultUser = {
  email: defaultEmail,
  fullName: "Juri Völker",
};

export const defaultTeam = { name: "Erwachsene I", groupIndex: 1 };
export const secondDefaultTeam = { name: "Erwachsene II", groupIndex: 2 };

export const defaultPlayer = {
  fullName: "Default Player",
  teamSlug: slugify(defaultTeam.name),
  position: 1,
};

export const defaultPassword = "password123";

export const defaultMatchData: z.infer<typeof CREATE_MATCH_SCHEMA> = {
  enemyName: "Rival Team I",
  time: new Date(new Date().getTime() + 86400000).toISOString(), // +1 day
  isHomeGame: true,
  location: {
    hallName: "Main Sports Hall",
    streetAddress: "1234 Sporty St",
    city: "Sportstown",
  },
  type: "REGULAR",
};
