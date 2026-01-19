import { HTTPException } from "hono/http-exception";
import {
  generateJWT,
  getGoogleUser,
  getRandomString,
  googleOAuth2Client,
  hashPassword,
} from "../lib/auth";
import { prisma } from "../prisma/prisma";
import { compareSync } from "bcryptjs";
import { LeaderService } from "./leader-service";
import { AdminService } from "./admin-service";
import { PlayerService } from "./player-service";
import logger from "../lib/logger";
import { GoogleUserPayload, Role } from "../types/auth";
import { TeamService } from "./team-service";
import { Context } from "hono";
import { generateState } from "oslo/oauth2";
import { getCookie, setCookie } from "hono/cookie";
import { GOOGLE_CLIENT_SECRET, NODE_ENV } from "../config";

const leaderService = new LeaderService();
const adminService = new AdminService();
const playerService = new PlayerService();
const teamService = new TeamService();

export class AuthService {
  async findAdminByEmail(email: string) {
    return prisma.admin.findUnique({ where: { email } });
  }

  async findLeaderByEmail(email: string) {
    return prisma.teamLeader.findFirst({ where: { email } });
  }

  async credentialsExist(email: string) {
    const credentials = await prisma.userCredentials.findUnique({
      where: { email },
    });
    return Boolean(credentials);
  }

  async verifyCredentials(email: string, password: string) {
    const credentials = await prisma.userCredentials.findUnique({
      where: { email },
    });

    if (!credentials) {
      throw new HTTPException(403, { message: "Invalid credentials" });
    }
    const valid = compareSync(password, credentials.passwordHash);
    if (!valid) {
      throw new HTTPException(403, { message: "Invalid credentials" });
    }
    return valid;
  }

  async createRefreshToken(email: string) {
    const refreshTokensDeleted = (
      await prisma.refreshToken.deleteMany({
        where: {
          OR: [{ userEmail: email }, { expiresAt: { lt: new Date() } }],
        },
      })
    ).count;
    logger.info(
      `Deleted ${refreshTokensDeleted} old refresh tokens for user ${email}`,
    );

    const token = getRandomString(64);
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await prisma.refreshToken.create({
      data: {
        token,
        userEmail: email,
        expiresAt,
      },
    });

    return token;
  }

  async setRefreshTokenCookie(c: Context, refreshToken: string) {
    setCookie(c, "refreshToken", refreshToken, {
      httpOnly: true,
      secure: NODE_ENV === "production",
      sameSite: "Lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });
  }

  async getJwtAdminPayload(email: string) {
    const isAdmin = await adminService.findByEmail(email);
    const adminPayload = isAdmin
      ? {
        email,
        id: isAdmin.id,
      }
      : undefined;
    return adminPayload;
  }

  async getJwtLeaderPayload(email: string) {
    const leaderAt = await leaderService.getTeamsOfLeader(email);
    const leaderPayload =
      leaderAt.leaderId && leaderAt.teams.length > 0
        ? {
          email,
          id: leaderAt.leaderId!,
          teams: leaderAt.teams,
        }
        : undefined;

    return leaderPayload;
  }

  async getJwtPlayerPayload(playerId?: string, inviteToken?: string) {
    let teams: string[] = [];
    try {
      if (playerId && inviteToken)
        teams = await playerService.getTeamMembershipsVerified(
          playerId!,
          inviteToken!,
        );
    } catch (error) {
      logger.warn({ playerId }, "Could not verify player's team memberships");
      teams = [];
    }

    const playerPayload =
      playerId && teams
        ? {
          id: playerId,
          teams,
        }
        : undefined;

    return playerPayload;
  }

  async getJwt(email: string, playerId?: string, inviteToken?: string) {
    const adminPayload = await this.getJwtAdminPayload(email);
    const leaderPayload = await this.getJwtLeaderPayload(email);
    const playerPayload = await this.getJwtPlayerPayload(playerId, inviteToken);

    const roles: Role[] = [];

    if (adminPayload) roles.push("admin");
    if (leaderPayload) roles.push("leader");
    if (playerPayload) roles.push("player");

    const jwt = await generateJWT({
      payload: {
        roles,
        admin: adminPayload,
        leader: leaderPayload,
        player: playerPayload,
      },
    });

    logger.debug(
      { adminPayload, leaderPayload, playerPayload },
      "Generated JWT payload",
    );

    return jwt;
  }

  async getJwtRelaxed(email: string, playerId?: string) {
    const adminPayload = await this.getJwtAdminPayload(email);
    const leaderPayload = await this.getJwtLeaderPayload(email);
    let playerPayload = undefined;
    if (playerId) {
      const teams = await playerService.getTeamMemberships(playerId!);
      playerPayload = {
        id: playerId,
        teams,
      };
    }

    const roles: Role[] = [];

    if (adminPayload) roles.push("admin");
    if (leaderPayload) roles.push("leader");
    if (playerPayload) roles.push("player");

    const jwt = await generateJWT({
      payload: {
        roles,
        admin: adminPayload,
        leader: leaderPayload,
        player: playerPayload,
      },
    });

    logger.debug(
      { adminPayload, leaderPayload, playerPayload },
      "Generated JWT payload",
    );

    return jwt;
  }

  async createUserCredentials(email: string, password: string) {
    const passwordHash = hashPassword(password);

    await prisma.userCredentials.create({
      data: {
        email,
        passwordHash,
      },
    });
  }

  async getGoogleLoginResponse(c: Context) {
    const googleOAuth2State = generateState();

    const url = await googleOAuth2Client.createAuthorizationURL({
      state: googleOAuth2State,
      scopes: [
        "https://www.googleapis.com/auth/userinfo.profile",
        "https://www.googleapis.com/auth/userinfo.email",
      ],
    });

    setCookie(c, "google_oauth2_state", googleOAuth2State, {
      httpOnly: true,
      secure: false,
      path: "/",
      maxAge: 60 * 60,
    });
    return url.toString() + "&prompt=select_account";
  }

  async verifyGoogleCallback(c: Context) {
    const { state, code } = c.req.query();
    const googleOAuth2State = getCookie(c, "google_oauth2_state");

    if (!googleOAuth2State || !state || googleOAuth2State !== state) {
      logger.warn("Google OAuth2 state mismatch or missing.");
      throw new HTTPException(401, { message: "Unauthorized" });
    }

    const { access_token } = await googleOAuth2Client.validateAuthorizationCode(
      code,
      {
        credentials: GOOGLE_CLIENT_SECRET,
        authenticateWith: "request_body",
      },
    );

    const user = (await getGoogleUser(access_token)) as GoogleUserPayload;
    return user;
  }
}
