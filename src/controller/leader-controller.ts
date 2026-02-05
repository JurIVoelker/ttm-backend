import { Hono } from "hono"
import { access, jwtMiddleware } from "../lib/auth"
import { validateJSON, validatePath } from "../lib/validate"
import { TeamService } from "../service/team-service"
import { TEAM_SLUG_PATH } from "../validation/team-schema"
import { LeaderService } from "../service/leader-service"
import { ADD_LEADER_SCHEMA, REMOVE_LEADER_SCHEMA, UPDATE_LEADER_SCHEMA } from "../validation/leader-schema"
import logger from "../lib/logger"
import { HTTPException } from "hono/http-exception"

// Config
export const leaderController = new Hono()
leaderController.use(jwtMiddleware)

// Services
const teamService = new TeamService()
const leaderService = new LeaderService()

// Routes
leaderController.get("/leaders/:teamSlug", access("admin"), validatePath(TEAM_SLUG_PATH), async (c) => {
  //* Get leaders of a team
  const { teamSlug } = c.get("path")
  const leaders = await leaderService.getLeadersByTeamSlug(teamSlug);
  return c.json({ leaders });
})

leaderController.get("/leaders", access("admin"), async (c) => {
  //* Get all leaders
  const leaders = await leaderService.findAll();
  return c.json(leaders);
})

leaderController.post("/leader/:teamSlug", access("admin"), validatePath(TEAM_SLUG_PATH), validateJSON(ADD_LEADER_SCHEMA), async (c) => {
  //* Add leader to a team
  const { teamSlug } = c.get("path")
  const { email, fullName } = c.get("json")

  let leader = await leaderService.findByEmail(email);
  if (!leader) {
    leader = await leaderService.create({ email, fullName });
    logger.info({ email, fullName }, "Created new leader");
  } else {
    logger.debug({ email }, "Found existing leader");
  }

  await teamService.addLeader({ teamSlug, leaderId: leader.id });
  logger.info({ teamSlug, leaderId: leader.id }, "Added leader to team");
  return c.json({ message: "Leader added to team" });
})

leaderController.delete("/leader/:teamSlug", access("admin"), validatePath(TEAM_SLUG_PATH), validateJSON(REMOVE_LEADER_SCHEMA), async (c) => {
  //* Remove leader from a team
  const { teamSlug } = c.get("path")
  const { id } = c.get("json")

  let leader = await leaderService.find(id);
  if (!leader) {
    throw new HTTPException(404, { message: "Leader not found" });
  }

  await leaderService.remove({
    id, slug: teamSlug
  })

  return c.json({ message: "Leader removed from team" });
})

leaderController.put("/leader", access("admin"), validateJSON(UPDATE_LEADER_SCHEMA), async (c) => {
  //* Remove leader from a team
  const { id, email, fullName } = c.get("json")

  let leader = await leaderService.find(id);
  if (!leader) {
    throw new HTTPException(404, { message: "Leader not found" });
  }

  const updatedLeader = await leaderService.update({
    id, email, fullName
  })

  return c.json({ message: "Leader updated", leader: updatedLeader });
})
