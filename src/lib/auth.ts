import { MiddlewareHandler } from "hono";
import { jwt } from "hono/jwt";
import { HTTPException } from "hono/http-exception";
import { jwtPayload, Role } from "../types/auth";
import { BASE_URL, GOOGLE_CLIENT_ID, JWT_SECRET } from "../config";
import { sign } from "hono/jwt";
import { hashSync } from "bcryptjs";
import { OAuth2Client } from "oslo/oauth2";
import { Context } from "hono/jsx";

export const jwtMiddleware = jwt({
  secret: JWT_SECRET,
  alg: "HS256",
});

export const generateJWT = async ({ payload }: { payload: jwtPayload }) => {
  payload.exp = Math.floor(Date.now() / 1000) + 60 * 5;
  payload.iat = Math.floor(Date.now() / 1000);
  return await sign(payload, JWT_SECRET, "HS256");
};

export const access = (_allowedRoles: Role[] | Role): MiddlewareHandler => {
  const allowedRoles = Array.isArray(_allowedRoles)
    ? _allowedRoles
    : [_allowedRoles];

  return async (c, next) => {
    const payload = c.get("jwtPayload") as jwtPayload | undefined;
    if (!payload) {
      throw new HTTPException(401, { message: "Unauthorized" });
    }

    const userRole = payload.roles;

    if (userRole.some((role) => role === "server")) {
      await next();
    }

    if (!allowedRoles.some((role) => userRole.includes(role))) {
      throw new HTTPException(403, { message: "Forbidden" });
    }
    await next();
  };
};

export const generateInviteToken = () => {
  return (
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15)
  );
};

export const isLeaderAtTeam = (payload: jwtPayload, teamSlug: string) => {
  return payload.leader?.teams.some((t) => t === teamSlug);
};

export const isAdmin = (payload: jwtPayload) => {
  return payload.roles.includes("admin");
};

export const hashPassword = (password: string) => {
  const passwordHash = hashSync(password, 10);
  return passwordHash;
};

export const googleOAuth2Client = new OAuth2Client(
  GOOGLE_CLIENT_ID,
  "https://accounts.google.com/o/oauth2/v2/auth",
  "https://oauth2.googleapis.com/token",
  {
    redirectURI: BASE_URL + "/api/auth/login/google/callback",
  },
);

export const getGoogleUser = async (accessToken: string) => {
  const response = await fetch(
    "https://www.googleapis.com/oauth2/v3/userinfo",
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );
  return await response.json();
};

export const getRandomString = (length: number) =>
  Array.from(crypto.getRandomValues(new Uint8Array(length)))
    .map((b) => b.toString(36))
    .join("");


// @ts-expect-error
export const getJwtOrThrow = (c: Context) => {
  const authHeader = c.req.header("Authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.replace("Bearer ", "") : authHeader
  console.log({ authHeader })
  if (!token) {
    throw new HTTPException(401, { message: "Unauthorized" });
  }

  return token as string;
};