import { sendNotification, setVapidDetails } from "web-push";
import { Subscription } from "../types/notification";
import {
  DISCORD_WEBHOOK_URL,
  VAPID_PRIVATE_KEY,
  VAPID_PUBLIC_KEY,
  VAPID_PUSH_EMAIL,
} from "../config";

export class NotificationService {
  constructor() {
    setVapidDetails(
      `mailto:${VAPID_PUSH_EMAIL}`,
      VAPID_PUBLIC_KEY,
      VAPID_PRIVATE_KEY,
    );
  }

  public async subscribe({ subscription }: { subscription: Subscription }) {
    await sendNotification(
      subscription,
      JSON.stringify({
        title: "Test Notification",
        body: "You have successfully subscribed to notifications!",
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
