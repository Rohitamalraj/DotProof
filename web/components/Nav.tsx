"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Logo } from "./Logo";

const links = [
  { href: "/markets", label: "Markets" },
  { href: "/agents", label: "Agents" },
  { href: "/#security", label: "Security" },
  { href: "/#build", label: "Developers" },
];

export function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled ? "bg-white/80 backdrop-blur-xl border-b border-line-1" : "bg-white border-b border-transparent"
      }`}
    >
      <div className="wrap flex h-[72px] items-center justify-between">
        <Link href="/" aria-label="DotProof home" className="text-fg-1">
          <Logo />
        </Link>
        <nav className="hidden items-center gap-9 md:flex">
          {links.map((l) => (
            <Link key={l.label} href={l.href} className="text-[15px] font-medium text-fg-2 transition-colors hover:text-fg-1">
              {l.label}
            </Link>
          ))}
          <Link href="/app" className="btn btn-dark">
            Launch App
          </Link>
        </nav>
        <button className="p-2 md:hidden" aria-label="Menu" onClick={() => setOpen((v) => !v)}>
          <span className="mb-1.5 block h-0.5 w-6 bg-fg-1" />
          <span className="block h-0.5 w-6 bg-fg-1" />
        </button>
      </div>
      {open && (
        <div className="border-t border-line-1 bg-white px-4 pb-4 md:hidden">
          {links.map((l) => (
            <Link key={l.label} href={l.href} onClick={() => setOpen(false)} className="block py-3 text-fg-2">
              {l.label}
            </Link>
          ))}
          <Link href="/app" className="btn btn-dark mt-2 w-full">
            Launch App
          </Link>
        </div>
      )}
    </header>
  );
}
