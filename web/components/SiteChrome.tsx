"use client";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Nav } from "./Nav";
import { Footer } from "./Footer";

/** The pitch deck runs full-screen, so it opts out of the site header and footer. */
export function SiteChrome({ children }: { children: ReactNode }) {
  const bare = usePathname()?.startsWith("/pitch");
  if (bare) return <>{children}</>;
  return (
    <>
      <Nav />
      <main>{children}</main>
      <Footer />
    </>
  );
}
