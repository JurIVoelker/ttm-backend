import {
  Body,
  Button,
  Container,
  Heading,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import EmailLayout from "./EmailLayout";

interface PasswordResetEmailProps {
  username?: string;
  token?: string;
  email?: string;
  expiryHours?: number;
  companyName?: string;
}

export function PasswordResetEmail({
  username = "User",
  email = "",
  token = "token",
  expiryHours = 24,
  companyName = "Company Name",
}: PasswordResetEmailProps) {
  const previewText = `Setzen Sie ihr ${companyName} Passwort zurück`;

  const baseUrl =
    Bun.env.FRONTEND_URL || "https://tt-manager.ttc-klingenmuenster.de";
  const resetLink = `${baseUrl}/passwort-reset?token=${token}&email=${email}`;

  return (
    <EmailLayout>
      <Preview>{previewText}</Preview>
      <Body className="bg-gray-100 font-sans">
        <Container className="mx-auto my-10 max-w-[600px] rounded-lg bg-white p-5 shadow-md">
          <Section className="mt-4 text-center">
            <Text>Tischtennis Manager</Text>
          </Section>
          <Heading className="mx-0 my-6 text-center text-xl font-semibold text-gray-800">
            Anfrage zur Passwort-Zurücksetzung
          </Heading>
          <Text className="text-base leading-6 text-gray-700">
            Hallo {username},
          </Text>
          <Text className="text-base leading-6 text-gray-700">
            Wir haben eine Anfrage zur Zurücksetzung des Passworts für Ihr{" "}
            {companyName} Konto erhalten. Um mit der Zurücksetzung Ihres
            Passworts fortzufahren, klicken Sie bitte auf die Schaltfläche
            unten:
          </Text>
          <Section className="my-8 text-center">
            <Button
              className="rounded bg-primary px-6 py-3 text-center text-base font-medium text-white no-underline"
              href={typeof resetLink === "string" ? resetLink : ""}
            >
              Passwort zurücksetzen
            </Button>
          </Section>
          <Text className="text-base leading-6 text-gray-700">
            Dieser Link zur Passwort-Zurücksetzung läuft in {expiryHours}{" "}
            Stunden ab.
          </Text>
          <Text className="text-base leading-6 text-gray-700">
            Falls Sie keine Passwort-Zurücksetzung angefordert haben, ignorieren
            Sie bitte diese E-Mail.
          </Text>
        </Container>
      </Body>
    </EmailLayout>
  );
}

export default PasswordResetEmail;
