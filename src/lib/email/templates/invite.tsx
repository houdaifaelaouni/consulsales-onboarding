import { Body, Button, Container, Head, Heading, Html, Preview, Section, Text } from "@react-email/components";
import type { InviteCopy } from "../copy";

// Inline styles only: email clients ignore stylesheets. Colours follow the design tokens.
const c = { canvas: "#010102", surface: "#0f1011", hairline: "#23252a", ink: "#f7f8f8", muted: "#d0d6e0", subtle: "#8a8f98", primary: "#5e6ad2" };

export function InviteEmail({ copy, url, lang }: { copy: InviteCopy; url: string; lang: string }) {
  return (
    <Html lang={lang}>
      <Head />
      <Preview>{copy.preview}</Preview>
      <Body style={{ backgroundColor: c.canvas, color: c.ink, fontFamily: "Inter, -apple-system, Segoe UI, Arial, sans-serif", margin: 0, padding: "32px 16px" }}>
        <Container style={{ maxWidth: 480, margin: "0 auto", backgroundColor: c.surface, border: `1px solid ${c.hairline}`, borderRadius: 12, padding: 32 }}>
          <Heading as="h1" style={{ fontSize: 24, lineHeight: 1.2, fontWeight: 600, margin: "0 0 12px", color: c.ink }}>{copy.heading}</Heading>
          <Text style={{ fontSize: 16, lineHeight: 1.5, color: c.muted, margin: "0 0 24px" }}>{copy.body}</Text>
          <Section>
            <Button href={url} style={{ backgroundColor: c.primary, color: "#ffffff", borderRadius: 8, padding: "12px 20px", fontSize: 14, fontWeight: 500, textDecoration: "none" }}>
              {copy.button}
            </Button>
          </Section>
          <Text style={{ fontSize: 12, lineHeight: 1.4, color: c.subtle, margin: "24px 0 0" }}>{copy.footer}</Text>
        </Container>
      </Body>
    </Html>
  );
}
