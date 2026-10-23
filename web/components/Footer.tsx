import Link from "next/link";
import { Logo } from "./Logo";
import { footerCols, network } from "@/lib/placeholder";

const socials = ["X", "GH", "DC", "TG"];

export function Footer() {
  return (
    <footer className="panel mb-5 mt-24" style={{ background: "linear-gradient(180deg,#fff 0%,#f4f1ff 60%,#ebe6ff 100%)" }}>
      <div className="wrap pb-14 pt-20">
        <div className="grid grid-cols-2 gap-10 sm:grid-cols-4">
          {footerCols.map((c) => (
            <div key={c.h}>
              <h4 className="mb-4 text-[13px] font-semibold text-primary-strong">{c.h}</h4>
              <ul className="space-y-3">
                {c.l.map((x) => (
                  <li key={x}>
                    <Link href="#" className="text-[15px] font-medium text-fg-2 hover:text-fg-1">
                      {x}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-16 flex flex-wrap items-center justify-between gap-6">
          <Logo className="text-primary" />
          <div className="flex items-center gap-3">
            {socials.map((s) => (
              <span key={s} className="grid h-8 w-8 place-items-center rounded-full bg-white/70 text-[11px] font-semibold text-fg-3">
                {s}
              </span>
            ))}
          </div>
          <span className="rounded-xl bg-white/70 px-4 py-2 text-sm text-fg-2">
            <span className="mr-2 inline-block h-2 w-2 rounded-full bg-ok align-middle" />
            {network.name}
          </span>
        </div>
        <p className="mt-14 text-[13px] leading-5 text-fg-4">
          DotProof is an unaudited hackathon prototype built for Portaldot Hacker House 2026 (Ecosystem DApps track). Testnet
          tokens carry no value. Nothing on this site is financial advice. The exploit fixture market demonstrates a weak mint
          path and is not a production bridge.
        </p>
      </div>
    </footer>
  );
}
