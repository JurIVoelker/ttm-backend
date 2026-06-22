import { z } from "zod";
import { Resend } from "resend";
import { render } from "@react-email/components";
import "dotenv/config";
import logger from "./logger";

interface sendEmailProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Email: React.FC<any>;
  to: string;
  subject: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
}

export const sendEmail = async ({
  Email,
  to,
  subject,
  data,
}: sendEmailProps) => {

  const { RESEND_API_KEY, RESEND_EMAIL_FROM } = process.env;

  if (!RESEND_API_KEY || !RESEND_EMAIL_FROM) {
    throw new Error(
      "Resend API key or email from address is not set in environment variables"
    );
  }

  const resend = new Resend(RESEND_API_KEY);
  try {
    const html = await render(Email({ ...data }) as React.ReactElement);
    await resend.emails.send({
      from: RESEND_EMAIL_FROM,
      to,
      subject,
      html,
    });
  } catch (err) {
    logger.error({ err, to }, "Failed to send email");
    throw err;
  }
};
