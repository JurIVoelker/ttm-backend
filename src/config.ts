export const JWT_SECRET = Bun.env.JWT_SECRET || "it-is-very-secret";

export const BASE_URL = Bun.env.BASE_URL || "http://localhost:8080";

export const NODE_ENV = Bun.env.NODE_ENV || "production";

export const FRONTEND_URL = Bun.env.FRONTEND_URL || "http://localhost:3000";

export const TEST_DEFAULT_EMAIL = Bun.env.TEST_DEFAULT_EMAIL || "";

export const DATABASE_URL =
  Bun.env.DATABASE_URL || "postgres://postgres:password@localhost:5432/db";

export const GOOGLE_CLIENT_SECRET = Bun.env.GOOGLE_CLIENT_SECRET || "";
export const GOOGLE_CLIENT_ID = Bun.env.GOOGLE_CLIENT_ID || "";

if (GOOGLE_CLIENT_SECRET === "" || GOOGLE_CLIENT_ID === "") {
  throw new Error("GOOGLE_CLIENT_SECRET or GOOGLE_CLIENT_ID is not set");
}

export const VAPID_PUBLIC_KEY = Bun.env.VAPID_PUBLIC_KEY || "";
export const VAPID_PRIVATE_KEY = Bun.env.VAPID_PRIVATE_KEY || "";
export const VAPID_PUSH_EMAIL = Bun.env.VAPID_PUSH_EMAIL || "";

if (
  VAPID_PUBLIC_KEY === "" ||
  VAPID_PRIVATE_KEY === "" ||
  VAPID_PUSH_EMAIL === ""
) {
  throw new Error(
    "VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, or VAPID_PUSH_EMAIL is not set",
  );
}

export const DISCORD_WEBHOOK_URL = Bun.env.DISCORD_WEBHOOK_URL || "";

if (!DISCORD_WEBHOOK_URL) {
  console.warn("DISCORD_WEBHOOK_URL is not set, Discord notifications will not work");
}
