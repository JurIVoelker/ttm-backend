import { TeamType } from "../prisma/generated";
import { romanToInt } from "./roman";

const getAgeGroup = (teamName: string, teamTypeRaw: "M" | "F") => {
  const ageGroup = teamName.split(" ")[1];
  let age = 0;
  switch (ageGroup) {
    case "U12": age = 12; break;
    case "U15": age = 15; break;
    case "U19": age = 19; break;
    default: throw new Error(`Unknown age group in team name: ${teamName}`);
  }

  if (teamTypeRaw === "F") {
    switch (age) {
      case 12: return TeamType.MADCHEN_12;
      case 15: return TeamType.MADCHEN_15;
      case 19: return TeamType.MADCHEN_19;
    }
  } else {
    switch (age) {
      case 12: return TeamType.JUGEND_12;
      case 15: return TeamType.JUGEND_15;
      case 19: return TeamType.JUGEND_19;
    }
  }
  throw new Error(`Could not determine team type for team name: ${teamName}`);
}

export const getTeamType = (teamName: string): TeamType => {
  const lowerTeamName = teamName.toLowerCase();

  if (lowerTeamName.includes("erwachsene")) {
    return TeamType.ERWACHSENE;
  }
  if (lowerTeamName.includes("damen")) {
    return TeamType.DAMEN;
  }
  if (lowerTeamName.includes("jugend")) {
    return getAgeGroup(teamName, "M")
  } else if (lowerTeamName.includes("maedchen") || lowerTeamName.includes("mädchen") || lowerTeamName.includes("madchen")) {
    return getAgeGroup(teamName, "F")
  }
  throw new Error(`Could not determine team type for team name: ${teamName}`);
}

export const getTeamIndex = (teamName: string): number => {
  const parts = teamName.split(" ");
  const indexPart = parts[parts.length - 1];
  const index = romanToInt(indexPart);
  return index;
}

export const translateTeamType = (type: TeamType): string => {
  switch (type) {
    case "DAMEN":
      return "Damen";
    case "ERWACHSENE":
      return "Erwachsene";
    case "JUGEND_12":
      return "Jugend U12";
    case "JUGEND_15":
      return "Jugend U15";
    case "JUGEND_19":
      return "Jugend U19";
    case "MADCHEN_12":
      return "Mädchen U12";
    case "MADCHEN_15":
      return "Mädchen U15";
    case "MADCHEN_19":
      return "Mädchen U19";
    default:
      return "Unbekannt";
  }
};