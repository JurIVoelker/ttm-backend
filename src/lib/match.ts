import { Match } from "../prisma/generated"
import { TTApiMatch } from "../types/sync"

export const isRRMatch = (match: Match | TTApiMatch) => {
  const regularMatch = match as Match;
  const ttApiMatch = match as TTApiMatch;
  const dateParam = regularMatch.time || ttApiMatch.datetime;
  const dateObject = dateParam ? new Date(dateParam) : new Date();

  return dateObject.getMonth() >= 0 && dateObject.getMonth() <= 5;
}

export const isRR = () => {
  const currentDate = new Date();
  return currentDate.getMonth() >= 0 && currentDate.getMonth() <= 5;
}