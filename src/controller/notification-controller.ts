import { Hono } from "hono";
import { access, jwtMiddleware } from "../lib/auth";
import { validateJSON, validatePath } from "../lib/validate";
import { MatchService } from "../service/match-service";
import logger from "../lib/logger";
import { POST_SUBSCRIBE_NOTIFICATION_SCHEMA } from "../validation/notification-schema";
import { NotificationService } from "../service/notification-service";

// Config
export const notificationController = new Hono();
notificationController.use(jwtMiddleware);

// Services
const notificationService = new NotificationService();

// Routes
notificationController.post(
  "/notifications/subscribe",
  access(["player", "leader", "admin"]),
  validateJSON(POST_SUBSCRIBE_NOTIFICATION_SCHEMA),
  async (c) => {
    const sub = c.get("json");
    logger.info({ sub }, "Subscribing to notifications");
    await notificationService.subscribe({ subscription: sub });
    return c.json({});
  },
);
