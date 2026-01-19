import { beforeEach, expect, expectTypeOf, test, } from "bun:test"
import { createAdminWithoutCredentials, createDefaultTeamWithLeader } from "../helpers/default-helper";
import { request } from "../../lib/request";
import { authenticate } from "../helpers/request-helper";
import { dropAll } from "../../lib/db";
import { LeaderService } from "../../service/leader-service";
import { TeamService } from "../../service/team-service";

beforeEach(async () => {
  await dropAll();
})

const leaderService = new LeaderService();
const teamService = new TeamService();

test("Authenticate", async () => {
  await createDefaultTeamWithLeader()
  await authenticate()
})

test("Authenticate with wrong credentials", async () => {
  await createDefaultTeamWithLeader()
  try {
    await authenticate("wrong@example.com", "wrongpassword")
    throw new Error("Should not reach here")
  } catch (error) {
    if (error instanceof Error) {
      if (!error.message.includes("Request failed with status 403")) {
        throw error;
      }
    } else {
      throw error;
    }
  }
})

test("Request invite token", async () => {
  const { team, inviteToken } = await createDefaultTeamWithLeader()

  const token = await authenticate()

  const response = await request({
    path: `/api/team/${team.slug}/inviteToken`,
    token: token.data.jwt
  })

  expect(response.data.inviteToken).toBe(inviteToken);
});


test("Delete leader from team", async () => {
  const { leader, team } = await createDefaultTeamWithLeader()
  await createAdminWithoutCredentials();

  const token = await authenticate()

  const { res } = await request({
    path: `/api/leader/${team.slug}`,
    token: token.data.jwt,
    method: "DELETE",
    body: { id: leader.id }
  })

  const leaderData = await leaderService.findAll();

  expect(leaderData.length).toBe(0);
  expect(res?.status).toBe(200);
});

test("Delete leader from team while still being in another team", async () => {
  const { leader, team } = await createDefaultTeamWithLeader()
  await createAdminWithoutCredentials();
  const { slug } = await teamService.create({ name: "Erwachsene II", groupIndex: 2 });
  await teamService.addLeader({ leaderId: leader.id, teamSlug: slug });

  const token = await authenticate()

  const { res } = await request({
    path: `/api/leader/${team.slug}`,
    token: token.data.jwt,
    method: "DELETE",
    body: { id: leader.id }
  })

  const leaderData = await leaderService.findAll();

  expect(leaderData.length).toBe(1);
  expect(res?.status).toBe(200);
});


test("Delete leader from non existing team", async () => {
  const { leader } = await createDefaultTeamWithLeader()
  await createAdminWithoutCredentials();
  const token = await authenticate()

  const { error } = await request({
    path: `/api/leader/unknown-slug`,
    token: token.data.jwt,
    method: "DELETE",
    body: { id: leader.id },
    allowError: true
  })

  expect(error?.status).toBe(404);
});

test("Delete non existing leader", async () => {
  const { team } = await createDefaultTeamWithLeader()
  await createAdminWithoutCredentials();
  const token = await authenticate()

  const { error } = await request({
    path: `/api/leader/${team.slug}`,
    token: token.data.jwt,
    method: "DELETE",
    body: { id: "unknown-id" },
    allowError: true
  })

  expect(error?.status).toBe(404);
});


test("Find two leaders", async () => {
  await createDefaultTeamWithLeader()
  await leaderService.create({ email: "test@mail.de", fullName: "Test User" });
  await createAdminWithoutCredentials();
  const token = await authenticate()

  const { res, data } = await request({
    path: `/api/leaders`,
    token: token.data.jwt,
    method: "GET",
  })

  expect(res?.status).toBe(200);
  expect(data.leaders.length).toBe(2);
});

test("Update leader", async () => {
  const { leader } = await createDefaultTeamWithLeader()
  await createAdminWithoutCredentials();
  const token = await authenticate()

  const { res, data } = await request({
    path: `/api/leader`,
    token: token.data.jwt,
    method: "PUT",
    body: { id: leader.id, email: "updated@mail.de", fullName: "Updated User" }
  })

  expect(res?.status).toBe(200);
  expect(data.leader.email).toBe("updated@mail.de");
  expect(data.leader.fullName).toBe("Updated User");
});

test("Update leader with only email", async () => {
  const { leader } = await createDefaultTeamWithLeader()
  await createAdminWithoutCredentials();
  const token = await authenticate()

  const { res, data } = await request({
    path: `/api/leader`,
    token: token.data.jwt,
    method: "PUT",
    body: { id: leader.id, email: "updated@mail.de" }
  })

  expect(res?.status).toBe(200);
  expect(data.leader.email).toBe("updated@mail.de");
  expect(data.leader.fullName).toBe(leader.fullName);
});