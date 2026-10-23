import Link from "next/link";
import { Reveal } from "../Reveal";
import { markets } from "@/lib/placeholder";

export function Chip({ label, dark = true }: { label: string; dark?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-medium ${dark ? "bg-white/[0.07] text-white/85" : "bg-bg-4 text-fg-2"}`}>
      <span className="h-3.5 w-3.5 rounded-full bg-gradient-to-br from-[#b8b2fa] to-[#7f6df0]" />
      {label}
    </span>
  );
}

export function MarketsDark() {
  return (
    <section className="panel panel-dark mt-6 py-24">
      <div className="wrap">
        <Reveal className="flex flex-wrap items-start justify-between gap-6">
          <div className="max-w-xl">
            <h2 className="h2 text-white">Markets for every strategy.</h2>
            <p className="mt-4 text-[17px] leading-6 text-white/60">
              Each collateral asset gets its own isolated market, so one bad asset can never contaminate another.
            </p>
          </div>
          <Link href="/markets" className="btn btn-ghost-dark h-11">
            Learn More
          </Link>
        </Reveal>
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {markets.map((m, i) => (
            <Reveal key={m.id} delay={i * 90}>
              <Link href={`/markets/${m.id}`} className="card-dark group block h-full p-6 transition-colors hover:bg-white/[0.07]">
                <div className="text-[13px] font-medium text-[#a99cff]">{m.tag}</div>
                <div className="mt-1 text-[20px] font-medium tracking-[-0.02em]">{m.name}</div>
                <p className="mt-4 min-h-[96px] text-[15px] leading-6 text-white/60">{m.blurb}</p>
                <div className="my-5 h-px bg-white/[0.07]" />
                <div className="flex flex-wrap gap-2">
                  {m.chips.map((c) => (
                    <Chip key={c} label={c} />
                  ))}
                  <span className="rounded-full bg-white/[0.07] px-2.5 py-1 text-[12px] text-white/70">
                    {m.status === "paused" ? "Paused" : `Backing ${m.backing}%`}
                  </span>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
