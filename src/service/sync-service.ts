import slugify from "slugify";
import logger from "../lib/logger";
import { prisma } from "../prisma/prisma";
import { TTApiMatch, TTApiMatchesReturnType } from "../types/sync";
import { format, isEqual, previousMonday } from "date-fns";
import { Match, MatchType } from "../prisma/generated";
import { romanToInt } from "../lib/roman";
import { getTeamType } from "../lib/team";
import { generateInviteToken } from "../lib/auth";
import { NotificationService } from "./notification-service";

const { TT_API_KEY } = process.env;
if (!TT_API_KEY) {
  logger.fatal("TT_API_KEY is not set in environment variables");
  1
}

export class SyncService {
  private notificationService: NotificationService = new NotificationService();

  public async getData() {
    const matchesPromise = await fetch(
      "https://tt-api.ttc-klingenmuenster.de/api/v1/matches",
      {
        headers: {
          "Content-Type": "application/json",
          ...(TT_API_KEY && { Authorization: TT_API_KEY }),
        },
        cache: "no-store",
      }
    );

    const data = await matchesPromise.json();
    return data as TTApiMatchesReturnType;
  }

  public async filterMatchesBySettings(matches: TTApiMatch[]) {
    let filteredMatches: TTApiMatch[] = [];

    const settings = await prisma.settings.findFirst();
    if (settings?.includeRRSync === false) {
      filteredMatches = matches.filter((match) => {
        const isRRMatch = new Date(match.datetime)
          .getMonth() >= 0 && new Date(match.datetime).getMonth() <= 5

        return !isRRMatch;
      });
    } else {
      filteredMatches = matches;
    }

    return filteredMatches;
  }

  public async filterMatchesInFuture(matches: TTApiMatch[]) {
    let filteredMatches: TTApiMatch[] = [];

    filteredMatches = matches.filter((match) => {
      const matchDate = new Date(match.datetime);
      const currentDate = new Date();
      currentDate.setHours(0, 0, 0, 0);
      return matchDate >= currentDate;
    })

    return filteredMatches;
  }

  public async categorizeInconsistencies(matches: TTApiMatch[]) {
    const missingMatches: TTApiMatch[] = [];
    const unequalTimeMatches: TTApiMatch[] = [];
    const unequalTimeMatchesBefore: Match[] = [];
    const unequalHomeGameMatches: TTApiMatch[] = [];
    const unequalLocationMatches: TTApiMatch[] = [];
    const unequalLocationMatchesBefore: Match[] = [];

    for (const fetchedMatch of matches) {
      const match = await prisma.match.findFirst({
        where: {
          id: fetchedMatch.id,
        },
        include: {
          location: true,
        },
      });

      if (!match) {
        missingMatches.push(fetchedMatch);
        continue;
      }

      if (
        !isEqual(new Date(match.time), new Date(fetchedMatch.datetime))
      ) {
        unequalTimeMatchesBefore.push(match);
        unequalTimeMatches.push(fetchedMatch);
      }

      if (match.isHomeGame !== fetchedMatch.isHomeGame) {
        unequalHomeGameMatches.push(fetchedMatch);
      }

      const { city, street, zip } = fetchedMatch.location.address;

      if (
        match.location?.city !== city + " " + zip ||
        match.location?.streetAddress !== street ||
        match.location?.hallName !== fetchedMatch.location.name
      ) {
        unequalLocationMatches.push(fetchedMatch);
        unequalLocationMatchesBefore.push(match);
      }
    }

    return {
      missingMatches,
      unequalTimeMatches,
      unequalTimeMatchesBefore,
      unequalHomeGameMatches,
      unequalLocationMatches,
      unequalLocationMatchesBefore,
    };
  }

  public async getChanges() {
    const fetchedMatches = (await this.getData()).matches;
    const filteredMatches = await this.filterMatchesBySettings(fetchedMatches);
    const filteredMatchesByDate = await this.filterMatchesInFuture(filteredMatches);
    const inconsistencies = await this.categorizeInconsistencies(filteredMatchesByDate);

    return inconsistencies;
  }

  public async addMissingMatches(missingMatches: TTApiMatch[]) {
    const existingTeams = await prisma.team.findMany();
    logger.info({ missingMatches: missingMatches.length }, "Number of missing matches to sync");

    const successfulSyncs = [];
    const failedSyncs = [];

    for (const match of missingMatches) {
      const allayTeamName = match.isHomeGame ? match.teams.home.name : match.teams.away.name;
      const allyTeamSlug = slugify(allayTeamName);
      const enemyName = match.isHomeGame ? match.teams.away.name : match.teams.home.name;
      const existingTeam = existingTeams.find((team) => team.slug === allyTeamSlug);
      if (!existingTeam) {
        logger.warn({ teamName: allayTeamName }, "Team does not exist in database, skipping match sync");
        failedSyncs.push(match);
        continue;
      }
      const matchType: MatchType = match.league.name.toLowerCase().includes("pokal") ? "CUP" : "REGULAR";

      await prisma.match.create({
        data: {
          id: match.id,
          time: new Date(match.datetime),
          isHomeGame: match.isHomeGame,
          teamSlug: existingTeam.slug,
          enemyName,
          type: matchType,
          location: {
            create: {
              city: match.location.address.city + " " + match.location.address.zip,
              streetAddress: match.location.address.street,
              hallName: match.location.name,
            }
          }
        }
      })
      logger.info({ matchId: match.id, time: format(new Date(match.datetime), "yyyy-MM-dd HH:mm") }, "Added missing match to database");
      successfulSyncs.push(match);
    }

    return {
      successfulSyncs,
      failedSyncs,
    }
  }

  public async updateMatches(matches: TTApiMatch[]) {
    for (const match of matches) {
      await prisma.match.update({
        where: {
          id: match.id,
        },
        data: {
          isHomeGame: match.isHomeGame,
          time: new Date(match.datetime),
          location: {
            update: {
              city: match.location.address.city + " " + match.location.address.zip,
              streetAddress: match.location.address.street,
              hallName: match.location.name,
            }
          },
        }
      })
    }
    return matches;
  }

  public async autoSync() {
    const settings = await prisma.settings.findFirst();
    if (settings?.autoSync === false) {
      logger.info("Auto sync is disabled in settings, skipping auto sync");
      return;
    }

    // todo account ignored matches

    const changes = await this.getChanges();
    const missingMatchesResult = await this.addMissingMatches(changes.missingMatches);
    const updatedMatchesResult = await this.updateMatches([
      ...changes.unequalTimeMatches,
      ...changes.unequalHomeGameMatches,
      ...changes.unequalLocationMatches
    ]);

    let reportMessage =
      `## Auto Sync Report (v1)`

    const successfulSyncsReport = `Successful syncs: ${missingMatchesResult.successfulSyncs.length}`;
    const failedSyncsReport =
      `Failed syncs: ${missingMatchesResult.failedSyncs.length}:
${missingMatchesResult.failedSyncs.slice(0, 10).map((match) => `- ${match.teams.home.name} vs ${match.teams.away.name} on ${format(new Date(match.datetime), "yyyy-MM-dd HH:mm")}`).join("\n")}
${missingMatchesResult.failedSyncs.length > 10 ? `...and ${missingMatchesResult.failedSyncs.length - 10} more` : ""}`;

    const missingMatchesReport =
      `### New Matches
${successfulSyncsReport}
${missingMatchesResult.failedSyncs.length > 0 ? failedSyncsReport : ""}`;

    if (missingMatchesResult.successfulSyncs.length > 0 || missingMatchesResult.failedSyncs.length > 0) {
      reportMessage += "\n" + missingMatchesReport;
    }

    if (updatedMatchesResult.length > 0) {
      reportMessage += `\n### Updated Matches: ${updatedMatchesResult.length}`;
    }

    if (reportMessage === "## Auto Sync Report (v1)") {
      reportMessage += "\nNo changes detected, no sync needed.";
    }

    await this.notificationService.sendDiscordNotification(reportMessage);
  }

  public async manualSync(ids: string[]) {
    const matches = (await this.getData()).matches;
    const filteredMatches = matches.filter((match) => ids.includes(match.id));
    for (const match of filteredMatches) {
      const existingMatch = await prisma.match.findUnique({
        where: {
          id: match.id,
        },
        include: {
          team: true,
        }
      })

      let team = existingMatch && existingMatch.team ? existingMatch.team : null;
      if (!existingMatch) {
        team = await prisma.team.findUnique({
          where: {
            slug: slugify(match.isHomeGame ? match.teams.home.name : match.teams.away.name),
          }
        })
      }
      if (!team) {
        const teamName = match.isHomeGame ? match.teams.home.name : match.teams.away.name;
        const splitTeamName = teamName.split(" ");
        const teamIndex = romanToInt(splitTeamName[splitTeamName.length - 1]);
        const teamType = getTeamType(teamName);

        if (teamType === undefined || teamIndex === undefined) {
          logger.warn({ teamName }, "Could not determine team type or index, skipping match sync");
          continue;
        }

        team = await prisma.team.create({
          data: {
            name: teamName,
            slug: slugify(teamName),
            type: teamType,
            groupIndex: teamIndex,
            inviteToken: generateInviteToken(),
          }
        })

        logger.info({ teamName, teamIndex, teamType }, "Created missing team in database");
      }

      const newLocation = {
        city: match.location.address.city + " " + match.location.address.zip,
        streetAddress: match.location.address.street,
        hallName: match.location.name,
      }

      if (!existingMatch) {
        await prisma.match.create({
          data: {
            id: match.id,
            time: new Date(match.datetime),
            isHomeGame: match.isHomeGame,
            teamSlug: slugify(match.isHomeGame ? match.teams.home.name : match.teams.away.name),
            enemyName: match.isHomeGame ? match.teams.away.name : match.teams.home.name,
            location: {
              create: newLocation,
            },
            type: match.league.name.toLowerCase().includes("pokal") ? "CUP" : "REGULAR",
          }
        })
        logger.info({ matchId: match.id, time: format(new Date(match.datetime), "yyyy-MM-dd HH:mm") }, "Added missing match to database");
      } else {
        await prisma.match.update({
          where: {
            id: match.id,
          },
          data: {
            isHomeGame: match.isHomeGame,
            time: new Date(match.datetime),
            location: {
              upsert: {
                create: newLocation,
                update: newLocation,
              }
            }
          }
        })
        logger.info({ matchId: match.id, time: format(new Date(match.datetime), "yyyy-MM-dd HH:mm") }, "Updated existing match in database");
      }
    }
  }
}

// // export const categorizeMatchInconsistencies = async (

//   const missingMatches = [];
//   const unequalTimeMatches = [];
//   const unequalTimeMatchesBefore = [];
//   const unequalHomeGameMatches = [];
//   const unequalLocationMatches = [];
//   const unequalLocationMatchesBefore = [];

//   for (const fetchedMatch of filteredMatches) {
//     const match = await prisma.match.findFirst({
//       where: {
//         id: fetchedMatch.id,
//       },
//       include: {
//         location: true,
//       },
//     });

//     if (!match) {
//       missingMatches.push(fetchedMatch);
//       continue;
//     }

//     if (
//       !isEqual(new Date(match.matchDateTime), new Date(fetchedMatch.datetime))
//     ) {
//       unequalTimeMatchesBefore.push(match);
//       unequalTimeMatches.push(fetchedMatch);
//     }

//     if (match.isHomeGame !== fetchedMatch.isHomeGame) {
//       unequalHomeGameMatches.push(fetchedMatch);
//     }

//     const { city, street, zip } = fetchedMatch.location.address;

//     if (
//       match.location?.city !== city + " " + zip ||
//
// match.location?.streetAddress !== street ||
//       match.location?.hallName !== fetchedMatch.location.name
//     ) {
//       unequalLocationMatches.push(fetchedMatch);
//       unequalLocationMatchesBefore.push(match);
//     }
//   }

//   return {
//     missingMatches,
//     unequalTimeMatches,
//     unequalHomeGameMatches,
//     unequalLocationMatches,
//   };
// };