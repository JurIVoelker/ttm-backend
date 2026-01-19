import { HTTPException } from "hono/http-exception";
import z from "zod";
import { createMiddleware } from 'hono/factory'
import { jwtPayload } from "../types/auth";
import { isAdmin, isLeaderAtTeam } from "./auth";
import logger from "./logger";

export const validateJSON = <T>(json: z.ZodType<T>) => {
  return createMiddleware<{
    Variables: {
      json: T;
    }
  }>(async (c, next) => {
    let body;
    try {
      body = await c.req.json();
    } catch (e) {
      console.error(e)
      throw new HTTPException(400, { message: "Invalid JSON body" });
    }
    const validationResult = await json.safeParseAsync(body);

    if (!validationResult.success) {
      throw new HTTPException(400, { message: validationResult.error.message });
    }

    c.set("json", validationResult.data);
    await next();
  });
}

export const validatePath = <T>(pathSchema: z.ZodType<T>) => {
  return createMiddleware<{
    Variables: {
      path: T;
    }
  }>(async (c, next) => {
    const paths = c.req.param();
    const validationResult = await pathSchema.safeParseAsync(paths);

    if (!validationResult.success) {
      throw new HTTPException(404, { message: validationResult.error.message });
    }

    c.set("path", validationResult.data);
    await next();
  });
}

export const validateIsLeaderOfTeam = () => {
  return createMiddleware(async (c, next) => {
    const { teamSlug } = c.get("path") as { teamSlug: string };
    const payload = c.get("jwtPayload") as jwtPayload;

    if (!payload) {
      logger.debug("No JWT payload found");
      throw new HTTPException(401, { message: "Unauthorized" });
    }

    if (!payload.roles.includes("leader") && !payload.roles.includes("admin")) {
      logger.debug(`User with roles ${payload.roles.join(", ")} is not a leader or admin`);
      throw new HTTPException(403, { message: "You are neither a leader nor an admin" });
    }

    if (!isLeaderAtTeam(payload, teamSlug) && !isAdmin(payload)) {
      logger.debug(`User with id ${payload.leader?.id} is not a leader at team ${teamSlug} and not an admin`);
      throw new HTTPException(403, { message: "Only team leaders of that team or admins can perform this action" });
    }

    await next();
  });
}