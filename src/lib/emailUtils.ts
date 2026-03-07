import { z } from "zod";
import { Resend } from "resend";
import "dotenv/config";

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
  const result = await resend.emails.send({
    from: RESEND_EMAIL_FROM || "",
    to,
    subject,
    // @ts-expect-error
    react: Email({ ...data }),
  });

  console.log(result)
};
