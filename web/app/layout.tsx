import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { SiteChrome } from "@/components/SiteChrome";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  title: "DotProof: Backing-aware lending on Portaldot",
  description:
    "Every loan is checked against proof that its collateral is actually backed, and a bonded agent network pauses the market the moment it isn't.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <SiteChrome>{children}</SiteChrome>
      </body>
    </html>
  );
}
