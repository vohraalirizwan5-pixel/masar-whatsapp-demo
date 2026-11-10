import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans_Arabic } from "next/font/google";
import "./globals.css";

const plex = IBM_Plex_Sans_Arabic({
  variable: "--font-plex",
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Arabic AI Agent Demo · Masar Cloud Labs",
  description:
    "Live demo: a customer-service agent that answers in Gulf Arabic, checks orders and shipments, opens returns and hands over to a person. Built by Masar Cloud Labs.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0b141a",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={plex.variable}>{children}</body>
    </html>
  );
}
