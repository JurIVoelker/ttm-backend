import { beforeEach, expect, expectTypeOf, test } from "bun:test"
import { createDefaultTeamWithLeader, createTeamWithLeaderAndDefaultMatch, createTeamWithPlayer, createTeamWithPlayerAndAdd } from "../helpers/default-helper";
import { authenticate, authenticatePlayer } from "../helpers/request-helper";
import { request } from "../../lib/request";
import { dropAll } from "../../lib/db";
import z from "zod";
import { UPDATE_MATCH_SCHEMA } from "../../validation/match-schema";
import { defaultMatchData, defaultPassword, defaultPlayer, defaultUser } from "../helpers/test-constants";
import { TeamService } from "../../service/team-service";
import { MatchService } from "../../service/match-service";
import { Availability } from "../../prisma/generated";
import { PlayerService } from "../../service/player-service";

beforeEach(async () => {
  await dropAll();
})

const teamService = new TeamService();
const matchService = new MatchService();
const playerService = new PlayerService();

test("Create match", async () => {
  const { team, leader } = await createDefaultTeamWithLeader()
  const token = await authenticate(leader.email)

  const matchData = defaultMatchData;

  const { res, error } = await request({
    method: "POST",
    path: `/api/match/${team.slug}`,
    token: token.data.jwt,
    body: matchData,
    allowError: true,
  })

  const { data } = await request({
    method: "GET",
    path: `/api/matches/${team.slug}`,
    token: token.data.jwt,
    allowError: true,
  })

  const matchResponseData = data[0];

  expect(res?.status || error?.status).toBe(201)
  expect(matchResponseData).toBeDefined()
  expect(res?.headers.get("Location")).toBe(`/api/match/${team.slug}/${matchResponseData.id}`)
  expect(matchResponseData.enemyName).toBe(matchData.enemyName)
  expect(matchResponseData.isHomeGame).toBe(matchData.isHomeGame)
  expect(new Date(matchResponseData.time).toISOString()).toBe(matchData.time)
  expect(matchResponseData.location.city).toEqual(matchData.location?.city)
  expect(matchResponseData.location.streetAddress).toEqual(matchData.location?.streetAddress)
  expect(matchResponseData.location.hallName).toEqual(matchData.location?.hallName)
  expect(matchResponseData.type).toBe(matchData.type)
})

test("Create match in past", async () => {
  const { team, leader } = await createDefaultTeamWithLeader()
  const token = await authenticate(leader.email)

  const matchData = { ...defaultMatchData, time: new Date(Date.now() - 10000).toISOString() };

  const { error } = await request({
    method: "POST",
    path: `/api/match/${team.slug}`,
    token: token.data.jwt,
    body: matchData,
    allowError: true,
  })


  expect(error?.status).toBe(400)
})

test("Update match", async () => {
  const { team, leader, match } = await createTeamWithLeaderAndDefaultMatch()
  const token = await authenticate(leader.email)

  const updatedMatch: z.infer<typeof UPDATE_MATCH_SCHEMA> = {
    // @ts-expect-error ignore 
    ...match, enemyName: undefined, isHomeGame: false, time: new Date(Date.now() + 3000).toISOString(), location: {
      hallName: "Updated Hall",
      streetAddress: "4567 New St",
      city: "Newcity"
    }
  }

  const { data, res, error } = await request({
    method: "PUT",
    path: `/api/match/${team.slug}/${match.id}`,
    token: token.data.jwt,
    body: updatedMatch,
    allowError: true,
  })

  expect(res?.status || error?.status).toBe(200)
  expect(data.isHomeGame).toBe(updatedMatch.isHomeGame)
  expect(data.id).toBe(match.id)
  expect(new Date(data.time).toISOString()).toBe(updatedMatch.time)
  expect(data.location.city).toEqual(updatedMatch.location?.city)
  expect(data.location.streetAddress).toEqual(updatedMatch.location?.streetAddress)
  expect(data.location.hallName).toEqual(updatedMatch.location?.hallName)
  expect(data.type).toBe(updatedMatch.type)
})

test("Update match from other team", async () => {
  const { team, leader, match } = await createTeamWithLeaderAndDefaultMatch()
  const team2 = await teamService.create({ name: "Erwachsene II", groupIndex: 2 })
  const match2 = await matchService.create({ data: defaultMatchData, teamSlug: team2.slug })
  const token = await authenticate(leader.email)

  const updatedMatch: z.infer<typeof UPDATE_MATCH_SCHEMA> = {
    // @ts-expect-error ignore 
    ...match, enemyName: undefined, isHomeGame: false, time: new Date(Date.now() + 3000).toISOString(), location: {
      hallName: "Updated Hall",
      streetAddress: "4567 New St",
      city: "Newcity"
    }
  }

  const { res, error } = await request({
    method: "PUT",
    path: `/api/match/${team.slug}/${match2.id}`,
    token: token.data.jwt,
    body: updatedMatch,
    allowError: true,
  })

  const { res: res2, error: error2 } = await request({
    method: "PUT",
    path: `/api/match/${team2.slug}/${match.id}`,
    token: token.data.jwt,
    body: updatedMatch,
    allowError: true,
  })

  expect(res?.status || error?.status).toBe(403)
  expect(res2?.status || error2?.status).toBe(403)
})

test("Delete match", async () => {
  const { team, leader, match } = await createTeamWithLeaderAndDefaultMatch()
  const token = await authenticate(leader.email)

  const { res } = await request({
    method: "DELETE",
    path: `/api/match/${team.slug}/${match.id}`,
    token: token.data.jwt,
  })

  const { data: matches } = await request({
    method: "GET",
    path: `/api/matches/${team.slug}`,
    token: token.data.jwt,
  })

  expect(res?.status).toBe(200)
  expect(matches.length).toBe(0)
})


test("Vote on match", async () => {
  const { team, inviteToken, player } = await createTeamWithPlayerAndAdd()

  const token = await authenticatePlayer(player.id, inviteToken!)
  const match = await matchService.create({
    data: defaultMatchData, teamSlug: team.slug
  })

  const { res } = await request({
    method: "POST",
    path: `/api/match/${team.slug}/vote/${match.id}`,
    token: token.data.jwt,
    allowError: true,
    body: { availability: "AVAILABLE" } as { availability: Availability }
  })

  const { data: matches } = await request({
    method: "GET",
    path: `/api/matches/${team.slug}`,
    token: token.data.jwt,
  })

  const targetMatch = matches[0];

  expect(res?.status).toBe(200)
  expect(targetMatch).toBeDefined()
  expect(targetMatch.matchAvailabilityVotes.length).toBe(1)
  expect(targetMatch.matchAvailabilityVotes[0].availability).toBe("AVAILABLE")
  expect(targetMatch.matchAvailabilityVotes[0].playerId).toBe(player.id)

  const { res: res2 } = await request({
    method: "POST",
    path: `/api/match/${team.slug}/vote/${match.id}`,
    token: token.data.jwt,
    allowError: true,
    body: { availability: "UNAVAILABLE" } as { availability: Availability }
  })

  const { data: matches2 } = await request({
    method: "GET",
    path: `/api/matches/${team.slug}`,
    token: token.data.jwt,
  })

  const targetMatch2 = matches2[0];
  expect(res2?.status).toBe(200)
  expect(targetMatch2).toBeDefined()
  expect(targetMatch2.matchAvailabilityVotes.length).toBe(1)
  expect(targetMatch2.matchAvailabilityVotes[0].availability).toBe("UNAVAILABLE")
  expect(targetMatch2.matchAvailabilityVotes[0].playerId).toBe(player.id)
})

test("Lineup on match", async () => {
  const { team, leader, match } = await createTeamWithLeaderAndDefaultMatch()
  const player1 = await playerService.create(defaultPlayer);
  const player2 = await playerService.create({ fullName: "Lineup Player 2", position: 2, teamSlug: team.slug });

  await playerService.addToTeam(player2.id, team.slug);
  await playerService.addToTeam(player1.id, team.slug);

  const token = await authenticate(leader.email, defaultPassword)

  const { res } = await request({
    method: "POST",
    path: `/api/match/${team.slug}/lineup/${match.id}`,
    token: token.data.jwt,
    body: { playerIds: [player2.id, player1.id] }
  })

  const { data: matches } = await request({
    method: "GET",
    path: `/api/matches/${team.slug}`,
    token: token.data.jwt,
  })

  expect(res?.status).toBe(200)
  expect(matches[0].lineup).toEqual([
    {
      id: player1.id,
      fullName: "Default Player",
    }, {
      id: player2.id,
      fullName: "Lineup Player 2",
    }
  ])

  const { res: res2 } = await request({
    method: "POST",
    path: `/api/match/${team.slug}/lineup/${match.id}`,
    token: token.data.jwt,
    body: { playerIds: [player2.id] }
  })

  const { data: matches2 } = await request({
    method: "GET",
    path: `/api/matches/${team.slug}`,
    token: token.data.jwt,
  })

  expect(res2?.status).toBe(200)
  expect(matches2[0].lineup).toEqual([
    {
      id: player2.id,
      fullName: "Lineup Player 2",
    }
  ])
})


