import { Hono } from "hono";
import { validateJSON, validatePath } from "../lib/validate";
import {
  JOIN_TEAM_SCHEMA,
  LOGIN_SCHEMA,
  REGISTER_SCHEMA,
} from "../validation/auth-schema";
import { getJwtOrThrow, generateJWT as signJWT } from "../lib/auth";
import { AuthService } from "../service/auth-service";
import logger from "../lib/logger";
import { decode, verify } from "hono/jwt";
import { jwtPayload } from "../types/auth";
import { HTTPException } from "hono/http-exception";
import { FRONTEND_URL, JWT_SECRET } from "../config";
import { getCookie } from "hono/cookie";
import { defaultEmail } from "../test/helpers/test-constants";
import { TEAM_SLUG_PATH } from "../validation/team-schema";
import { TeamService } from "../service/team-service";
import { PlayerService } from "../service/player-service";

const authService = new AuthService();
const teamService = new TeamService();
const playerService = new PlayerService();

export const authController = new Hono();

authController.post("/login", async (c) => {
  const jwt = await signJWT({
    payload: {
      roles: ["admin", "leader"],
      admin: {
        email: defaultEmail!,
        id: "1",
      },
      leader: {
        email: defaultEmail!,
        id: "1",
        teams: ["team-1", "team-2"],
      },
      player: {
        id: "1",
        teams: ["team-1", "team-2"],
      },
    },
  });

  return c.json({ jwt });
});

authController.post(
  "/login/credentials",
  validateJSON(LOGIN_SCHEMA),
  async (c) => {
    const { email, password, playerId, inviteToken } = c.get("json");

    await authService.verifyCredentials(email, password);

    const jwt = await authService.getJwt(email, playerId, inviteToken);
    const payload = decode(jwt).payload as jwtPayload;

    if (!payload.roles.includes("leader") && !payload.roles.includes("admin")) {
      logger.warn({ email }, "Login attempt by unauthorized user");
      throw new HTTPException(403, { message: "Forbidden" });
    }

    const refreshToken = await authService.createRefreshToken(email);
    await authService.setRefreshTokenCookie(c, refreshToken);

    return c.json({ jwt });
  },
);

authController.get("/login/google", async (c) => {
  const redirectUri = await authService.getGoogleLoginResponse(c);
  return c.redirect(redirectUri);
});

authController.get("/login/google/callback", async (c) => {
  const user = await authService.verifyGoogleCallback(c);
  const jwt = await authService.getJwt(user.email);

  const payload = decode(jwt).payload as jwtPayload;
  if (!payload.roles.includes("leader") && !payload.roles.includes("admin")) {
    logger.warn(
      { email: user.email },
      "Google login attempt by unauthorized user",
    );
    throw new HTTPException(403, { message: "Forbidden" });
  }

  const refreshToken = await authService.createRefreshToken(user.email);
  await authService.setRefreshTokenCookie(c, refreshToken);

  return c.redirect(`${FRONTEND_URL}/login/callback?jwt=${jwt}`);
});

authController.post("/team/join", validateJSON(JOIN_TEAM_SCHEMA), async (c) => {
  const { playerId, inviteToken } = c.get("json");

  const existingJwt = c.req.header("Authorization")?.replace("Bearer ", "");
  let payload: jwtPayload | null = null;

  console.log({ playerId, inviteToken, existingJwt })

  if (existingJwt) {
    try {
      await verify(existingJwt, JWT_SECRET);
      payload = decode(existingJwt).payload as jwtPayload;
    } catch (error) {
      logger.warn(
        { playerId },
        "Could not verify existing JWT provided by player",
      );
    }
  }

  const playerPayload = await authService.getJwtPlayerPayload(
    playerId,
    inviteToken,
  );

  if (playerPayload?.teams.length === 0) {
    logger.warn(
      { playerId },
      "Player could not join team with provided invite token",
    );
    return c.json({ message: "Bad Request" }, 400);
  }

  if (payload) {
    // Copy existing payload and update player payload
    const roles = payload.roles;
    if (!roles.includes("player")) {
      roles.push("player");
    }

    const jwt = await signJWT({
      payload: {
        roles,
        admin: payload.admin,
        leader: payload.leader,
        player: playerPayload,
      },
    });

    return c.json({ jwt });
  }

  const jwt = await signJWT({
    payload: {
      roles: ["player"],
      player: playerPayload,
    },
  });

  return c.json({ jwt });
});

authController.post("/register", validateJSON(REGISTER_SCHEMA), async (c) => {
  const { email, password } = c.get("json");

  const existingAdmin = await authService.findAdminByEmail(email);
  const existingLeader = await authService.findLeaderByEmail(email);

  if (!existingAdmin && !existingLeader) {
    logger.warn({ email }, "Registration attempt with unrecognized email");
    return c.json({ message: "Bad Request" }, 400);
  }

  const credentialsExist = await authService.credentialsExist(email);
  if (credentialsExist) {
    logger.warn({ email }, "Registration attempt with existing credentials");
    return c.json({ message: "Bad Request" }, 400);
  }

  await authService.createUserCredentials(email, password);
  logger.info({ email }, "Registered new user");

  return c.json({ message: "User registered successfully" });
});

// authController.post("/leader/password-reset", access(["leader"]), async (c) => {
//   throw new HTTPException(501, { message: "Not implemented" });
// })

// authController.post("/leader/password-reset/validate", access(["leader"]), async (c) => {
//   throw new HTTPException(501, { message: "Not implemented" });
// })

authController.post("/refresh", async (c) => {
  const rawJwt = c.req.header("Authorization")?.replace("Bearer ", "");

  if (!rawJwt) {
    throw new HTTPException(401, { message: "Unauthorized" });
  }

  const jwtPayload = decode(rawJwt).payload as jwtPayload;

  const refreshToken = getCookie(c, "refreshToken");

  if (!refreshToken) throw new HTTPException(401, { message: "Unauthorized" });
  if (
    !jwtPayload.roles.includes("admin") &&
    !jwtPayload.roles.includes("leader")
  ) {
    throw new HTTPException(403, { message: "Forbidden" });
  }

  const { email } = jwtPayload.admin ?? jwtPayload.leader!;
  const { player } = jwtPayload;

  const jwt = await authService.getJwtRelaxed(email, player?.id);

  const newRefreshToken = await authService.createRefreshToken(email);
  await authService.setRefreshTokenCookie(c, newRefreshToken);

  return c.json({ jwt });
});

authController.get("/inviteToken/players/:teamSlug", validatePath(TEAM_SLUG_PATH), async (c) => {
  const { teamSlug } = c.get("path");
  // console.log({ teamSlug });
  const inviteToken = getJwtOrThrow(c);
  const validInviteToken = await teamService.getInviteToken(teamSlug);

  // console.log({ inviteToken, validInviteToken });
  if (inviteToken !== validInviteToken) {
    throw new HTTPException(403, { message: "Forbidden" });
  }

  const players = await playerService.findByTeamSlug(teamSlug);

  return c.json(players);
});
