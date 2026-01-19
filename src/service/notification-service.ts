import { sendNotification, setVapidDetails } from "web-push";
import { Subscription } from "../types/notification";
import {
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
}
