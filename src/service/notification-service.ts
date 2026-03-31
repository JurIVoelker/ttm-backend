import { sendNotification, setVapidDetails } from "web-push";
import { Subscription } from "../types/notification";
import {
  DISCORD_WEBHOOK_URL,
  VAPID_PRIVATE_KEY,
  VAPID_PUBLIC_KEY,
  VAPID_PUSH_EMAIL,
} from "../config";
import { prisma } from "../prisma/prisma";
import logger from "../lib/logger";

export class NotificationService {
  constructor() {
    setVapidDetails(
      `mailto:${VAPID_PUSH_EMAIL}`,
      VAPID_PUBLIC_KEY,
      VAPID_PRIVATE_KEY,
    );
  }

  public async saveSubscription({
    subscription,
    playerId,
    leaderId,
    adminId,
  }: {
    subscription: Subscription;
    playerId?: string;
    leaderId?: string;
    adminId?: string;
  }) {
    await prisma.pushSubscription.upsert({
      where: { endpoint: subscription.endpoint },
      update: {
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        expirationTime: subscription.expirationTime
          ? new Date(subscription.expirationTime)
          : null,
      },
      create: {
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        expirationTime: subscription.expirationTime
          ? new Date(subscription.expirationTime)
          : null,
        playerId,
        leaderId,
        adminId,
      },
    });

    await sendNotification(
      subscription,
      JSON.stringify({
        title: "Notifications enabled",
        body: "You will now receive push notifications.",
      }),
    );
  }

  public async deleteSubscription({ endpoint }: { endpoint: string }) {
    await prisma.pushSubscription.delete({ where: { endpoint } });
  }

  public async sendToUser({
    playerId,
    leaderId,
    adminId,
    payload,
  }: {
    playerId?: string;
    leaderId?: string;
    adminId?: string;
    payload: object;
  }) {
    const where = playerId
      ? { playerId }
      : leaderId
        ? { leaderId }
        : { adminId };

    const subs = await prisma.pushSubscription.findMany({ where });

    await Promise.allSettled(
      subs.map(async (s) => {
        try {
          await sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            JSON.stringify(payload),
          );
        } catch (err: any) {
          if (err?.statusCode === 410) {
            logger.info(
              { endpoint: s.endpoint },
              "Push subscription expired, removing",
            );
            await prisma.pushSubscription.delete({
              where: { endpoint: s.endpoint },
            });
          } else {
            logger.error(
              { endpoint: s.endpoint, err },
              "Failed to send push notification",
            );
          }
        }
      }),
    );
  }

  public async sendDiscordNotification(message: string) {
    await fetch(DISCORD_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        content: message.substring(0, 1900),
      }),
    });
  }
}
