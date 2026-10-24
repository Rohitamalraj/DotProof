import Link from "next/link";
import { LogoMark } from "../Logo";
import { HeroCards } from "./HeroCards";

const lines = [["Lending", "that", "checks"], ["the", "backing"]];

export function Hero() {
  return (
    <section className="panel hero-load -mt-px pt-20 sm:pt-24">
      <div className="wrap text-center">
        <div className="load-rise mb-5 inline-flex items-center gap-2 text-fg-2" style={{ "--d": "250ms" } as React.CSSProperties}>
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-primary text-white">
            <LogoMark size={18} mono />
          </span>
          <span className="text-[17px] font-medium tracking-tight">DotProof Markets</span>
        </div>
        <h1 className="h1 text-fg-1" aria-label="Lending that checks the backing">
          {lines.map((line, li) => (
            <span key={li} className="block" aria-hidden>
              {line.map((w, wi) => (
                <span
                  key={w + wi}
                  className="load-rise inline-block"
                  style={{ "--d": `${450 + (li * 3 + wi) * 110}ms`, marginRight: "0.25em" } as React.CSSProperties}
                >
                  {w}
                </span>
              ))}
            </span>
          ))}
        </h1>
        <p className="lead load-rise mx-auto mt-6 max-w-xl" style={{ "--d": "1150ms" } as React.CSSProperties}>
          Every borrow is verified against real reserves on-chain, and bonded agents pause the market the moment it isn&apos;t.
        </p>
        <div className="load-rise mt-8 flex flex-wrap items-center justify-center gap-3" style={{ "--d": "1350ms" } as React.CSSProperties}>
          <Link href="/app" className="btn btn-primary h-12 px-6 text-[15px]">
            Launch App
          </Link>
          <Link href="/markets" className="btn btn-soft h-12 px-6 text-[15px]">
            Explore Markets
          </Link>
        </div>
      </div>

      {/* Live cards: a real backing ring, a borrow request being stamped, and a scrolling feed of real transactions. */}
      <div className="load-phone mt-12 h-[400px] overflow-hidden px-4 pt-4 sm:mt-16" style={{ "--d": "1550ms" } as React.CSSProperties}>
        <HeroCards />
      </div>
    </section>
  );
}
