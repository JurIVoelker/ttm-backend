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
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import { GOOGLE_CLIENT_SECRET, NODE_ENV } from "../config";
import { sendEmail } from "../lib/emailUtils";
// @ts-expect-error hono issue
import PasswordResetEmail from "../emails/ResetPassword";
import { render } from "@react-email/components";

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
          AND: [{ userEmail: email }, { expiresAt: { lt: new Date(new Date().valueOf() - 30 * 1000) } }],
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

  async verifyRefreshToken(token: string, email: string) {
    const refreshToken = await prisma.refreshToken.findUnique({
      where: { token, userEmail: email },
    });

    return Boolean(refreshToken && refreshToken.expiresAt > new Date());
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

  public async deleteCookies(c: Context) {
    deleteCookie(c, "refreshToken", {
      httpOnly: true,
      secure: NODE_ENV === "production",
      sameSite: "Lax",
    });

    return c;
  }

  public async requestPasswordReset(email: string) {
    const credentials = await prisma.userCredentials.findFirst({
      where: {
        email: email.toLowerCase(),
      },
    });

    if (!credentials) {
      logger.warn({ email }, "Password reset requested for non-existent email");
      return;
    }

    const resets = await prisma.passwordReset.findMany({
      where: {
        email,
      },
    });

    const finishedResets = resets.filter((reset) => reset.expiresAt < new Date());
    const unfinishedResets = resets.filter(
      (reset) => reset.expiresAt > new Date()
    );

    await prisma.passwordReset.deleteMany({
      where: {
        id: {
          in: finishedResets.map((reset) => reset.id),
        },
      },
    });

    if (unfinishedResets.length > 2) {
      logger.warn({ email }, "Too many password reset requests for this email");
      return;
    }

    const token = getRandomString(64);

    const emailsSentToday = await prisma.emailsSent.count({
      where: {
        createdAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
          lt: new Date(new Date().setHours(23, 59, 59, 999)),
        },
      },
    });

    if (emailsSentToday >= 90) {
      logger.warn({ emailsSentToday }, "Too many emails sent today");
      return new Response(
        JSON.stringify({ ok: false, error: "Email limit reached for today" }),
        { status: 403 }
      );
    }

    const data = {
      email,
      username: credentials.email,
      companyName: "Tischtennis Manager",
      token,
    };

    await sendEmail({
      Email: PasswordResetEmail,
      to: email,
      subject: "Passwort zurücksetzen",
      data,
    });

    await prisma.passwordReset.create({
      data: {
        email,
        token,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
      },
    });

    logger.info({ email }, "Password reset email sent");

    const logEmailHtml = await render(
      PasswordResetEmail({ ...data, token: "token" }),
      {
        plainText: true,
      }
    );

    await prisma.emailsSent.create({
      data: {
        email,
        body: logEmailHtml,
        subject: "Passwort zurücksetzen",
      },
    });
  }


  public async verifyPasswordReset(email: string, token: string, password: string) {
    const credentials = await prisma.userCredentials.findFirst({
      where: {
        email,
      },
    });

    if (!credentials) {
      logger.warn({ email }, "Password reset attempted for non-existent email");
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }

    const reset = await prisma.passwordReset.findFirst({
      where: {
        email,
        token,
        expiresAt: {
          gt: new Date(),
        },
      },
    });

    if (!reset) {
      logger.warn({ email, token }, "No reset found for email and token");
      return new Response(JSON.stringify({ ok: false }), { status: 404 });
    }

    const passwordHash = hashPassword(password);

    await prisma.userCredentials.update({
      where: {
        email,
      },
      data: {
        passwordHash,
      },
    });

    await prisma.passwordReset.deleteMany({
      where: {
        email,
      },
    });

    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  }
}
