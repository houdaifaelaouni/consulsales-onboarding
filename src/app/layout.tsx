import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const mono = JetBrains_Mono({ variable: "--font-jetbrains", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ConsulSales Onboarding",
  description: "From signed contract to a running LinkedIn system in 30 days.",
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#010102" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${mono.variable} antialiased`}>{children}</body>
    </html>
  );
}
