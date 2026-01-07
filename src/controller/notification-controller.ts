import { Hono } from "hono";
import { access } from "../lib/auth";
import { validateJSON, validatePath } from "../lib/validate";
import { MatchService } from "../service/match-service";
import logger from "../lib/logger";
import { POST_SUBSCRIBE_NOTIFICATION_SCHEMA } from "../validation/notification-schema";

// Config
export const notificationController = new Hono();
// notificationController.use(jwtMiddleware);

// Services
const matchService = new MatchService();

// Routes
notificationController.post(
  "/notifications/subscribe",
  access(["player", "leader", "admin"]),
  validateJSON(POST_SUBSCRIBE_NOTIFICATION_SCHEMA),
  async (c) => {
    const sub = c.get("json");
    logger.info({ sub }, "Subscribing to notifications");
    return c.json({});
  },
);
