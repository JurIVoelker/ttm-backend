import { Hono } from "hono";
import { access, jwtMiddleware } from "../lib/auth";
import { validateJSON } from "../lib/validate";
import logger from "../lib/logger";
import {
  DELETE_UNSUBSCRIBE_SCHEMA,
  POST_SUBSCRIBE_NOTIFICATION_SCHEMA,
} from "../validation/notification-schema";
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
    const payload = c.get("jwtPayload");
    logger.info({ endpoint: sub.endpoint }, "Subscribing to notifications");
    await notificationService.saveSubscription({
      subscription: sub,
      playerId: payload.player?.id,
      leaderId: payload.leader?.id,
      adminId: payload.admin?.id,
    });
    return c.json({});
  },
);

notificationController.delete(
  "/notifications/subscribe",
  access(["player", "leader", "admin"]),
  validateJSON(DELETE_UNSUBSCRIBE_SCHEMA),
  async (c) => {
    const { endpoint } = c.get("json");
    logger.info({ endpoint }, "Unsubscribing from notifications");
    await notificationService.deleteSubscription({ endpoint });
    return c.json({});
  },
);
