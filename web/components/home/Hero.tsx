import Link from "next/link";
import { LogoMark } from "../Logo";

function Phone({ children, dark = false, className = "" }: { children: React.ReactNode; dark?: boolean; className?: string }) {
  return (
    <div
      className={`relative w-[250px] shrink-0 overflow-hidden rounded-t-[44px] border-[7px] border-b-0 sm:w-[300px] ${
        dark ? "border-[#111] bg-[#0e0c14] text-white" : "border-[#151218] bg-white text-fg-1"
      } ${className}`}
    >
      <div className="absolute left-1/2 top-2 z-10 h-[22px] w-[84px] -translate-x-1/2 rounded-full bg-black" />
      <div className="flex items-center justify-between px-6 pt-3 text-[11px] font-semibold">
        <span>9:41</span>
        <span className="opacity-0">.</span>
      </div>
      {children}
    </div>
  );
}

const lines = [["Lending", "that", "checks"], ["the", "backing"]];

const bars =[52, 30, 74, 48, 62, 86, 100];

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

      <div className="load-phone mt-14 flex items-end justify-center gap-0 overflow-hidden px-4 sm:mt-20" style={{ "--d": "1550ms" } as React.CSSProperties}>
        {/* Left phone: backing check */}
        <Phone className="mb-0 hidden h-[420px] translate-x-6 translate-y-6 opacity-95 md:block">
          <div className="px-5 pb-6 pt-8">
            <div className="mx-auto mb-3 flex w-fit items-center gap-1.5 text-[11px] text-fg-2">
              <span className="h-2 w-2 rounded-full bg-ok" /> Backing verified
            </div>
            <div className="text-center">
              <div className="text-[13px] text-fg-2">Backing ratio</div>
              <div className="mt-1 text-[44px] font-semibold leading-none tracking-[-0.05em]">100.00%</div>
              <div className="mt-1 text-[12px] text-fg-3">Reserve ÷ bPOT supply</div>
            </div>
            <div className="mt-6 rounded-2xl bg-[#fff6e6] p-4 text-center">
              <div className="mx-auto mb-2 grid h-9 w-9 place-items-center rounded-full bg-[#ffe3a8] text-lg">🛡</div>
              <div className="text-[13px] font-semibold">Seasoning: 120 blocks</div>
              <div className="mt-1 text-[11px] leading-4 text-fg-3">Fresh collateral waits before it can back a loan.</div>
            </div>
          </div>
        </Phone>

        {/* Center phone: position */}
        <Phone className="z-10 h-[470px]">
          <div className="px-5 pb-6 pt-8 text-center">
            <div className="text-[12px] text-fg-2">● Net APY 3.42%</div>
            <div className="mt-2 text-[44px] font-semibold leading-none tracking-[-0.05em]">
              12,480<span className="text-[26px] text-fg-2">.74</span>
            </div>
            <div className="mt-1 text-[11px] text-ok-strong">+0.4120 tPOT earned past week</div>
            <div className="mt-5 flex h-[170px] items-end justify-between gap-2.5 px-1">
              {bars.map((h, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-t-[10px]"
                  style={{ height: `${h}%`, background: i === bars.length - 1 ? "#9788ff" : "#cfcdff" }}
                />
              ))}
            </div>
            <div className="mt-2 flex justify-between text-[10px] text-fg-3">
              <span>Oct 17</span>
              <span>Today</span>
            </div>
            <div className="mt-4 flex justify-center gap-2 text-[11px]">
              {["1W", "1M", "1Y", "All"].map((t, i) => (
                <span key={t} className={`rounded-full px-2.5 py-1 ${i === 0 ? "bg-bg-4 font-semibold" : "text-fg-3"}`}>
                  {t}
                </span>
              ))}
            </div>
          </div>
        </Phone>

        {/* Right phone: breaker */}
        <Phone dark className="hidden h-[420px] -translate-x-6 translate-y-6 opacity-95 md:block">
          <div className="px-5 pb-6 pt-8">
            <div className="text-[11px] text-white/60">Simulated attack · Exploit Fixture</div>
            <div className="mt-2 text-[34px] font-semibold leading-none tracking-[-0.05em] text-[#b8b2fa]">Borrow reverted</div>
            <div className="mt-1 text-[11px] text-white/50">BackingBelowThreshold · 61.4%</div>
            <div className="mt-6 flex h-[110px] items-end gap-[3px]">
              {Array.from({ length: 22 }).map((_, i) => (
                <div key={i} className="flex-1 rounded-t-[3px] bg-[#8b7df5]" style={{ height: `${18 + i * 3.6}%`, opacity: 0.5 + i / 44 }} />
              ))}
            </div>
            <div className="mt-3 rounded-xl bg-white/[0.07] px-3 py-2 text-[11px] text-white/80">
              <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-danger" /> Market paused by sentinel-02
            </div>
          </div>
        </Phone>
      </div>
    </section>
  );
}
