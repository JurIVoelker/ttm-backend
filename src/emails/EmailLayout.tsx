import { Container, Font, Head, Html, Tailwind } from "@react-email/components";
import React from "react";

interface EmailTailwindConfigProps {
  children: React.ReactNode;
}

const EmailLayout: React.FC<EmailTailwindConfigProps> = ({ children }) => {
  return (
    <Html lang="de">
      <Head>
        <Font
          fontFamily="Roboto"
          fallbackFontFamily="Verdana"
          webFont={{
            url: "https://fonts.gstatic.com/s/roboto/v27/KFOmCnqEu92Fr1Mu4mxKKTU1Kg.woff2",
            format: "woff2",
          }}
          fontWeight={400}
          fontStyle="normal"
        />
      </Head>
      <Tailwind
        config={{
          theme: {
            extend: {
              colors: {
                brand: "#007291",
                background: "#FFFFFF",
                foreground: "#0A0A0A",
                card: "#FFFFFF",
                cardForeground: "#0A0A0A",
                popover: "#FFFFFF",
                popoverForeground: "#0A0A0A",
                primary: "#006D99",
                primaryForeground: "#F0F9FF",
                secondary: "#D9F2FF",
                secondaryForeground: "#171717",
                muted: "#F5F5F5",
                mutedForeground: "#737373",
                accent: "#D9F2FF",
                accentForeground: "#171717",
                destructive: "#D93636",
                destructiveForeground: "#FCFCFC",
                border: "#E5E5E5",
                input: "#E5E5E5",
                ring: "#2B4D66",
                radius: "0.5rem",
                positiveDark: "#396922",
                positiveLight: "#DEFFDE",
                positiveBorder: "#A1CAA1",
                negativeDark: "#C32733",
                negativeLight: "#FFDEE0",
                negativeBorder: "#F39FA5",
                neutralDark: "#845719",
                neutralLight: "#FFF6DE",
                neutralBorder: "#E5C393",
              },
            },
          },
        }}
      >
        <Container>{children}</Container>
      </Tailwind>
    </Html>
  );
};

export default EmailLayout;
