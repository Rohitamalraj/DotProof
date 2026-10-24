"use client";
import { useBacking } from "@/hooks/use-backing";
import { fmtAmount } from "@/lib/chain";
import { chainEvents } from "./data";

const R = 78;
const C = 2 * Math.PI * R;

/** Center card: the live backing ring, read from BackingMonitor on the Portaldot testnet. */
function LiveCard() {
  const { data, error } = useBacking(6000);
  const pct = data ? data.ratioBps / 100 : 0;
  return (
    <div className="hv-card hv-float relative z-10 w-[330px] shrink-0 p-6" style={{ ["--d" as string]: "0s" }}>
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[13px] font-semibold text-fg-1">bPOT backing</span>
        <span className="inline-flex items-center gap-2 text-[12px] text-fg-3">
          <span className="hv-live" style={error ? { background: "#f24900", animation: "none" } : undefined} />
          {error ? "RPC unreachable" : data ? "Live on-chain" : "Reading…"}
        </span>
      </div>

      <div className="relative mx-auto grid h-[200px] w-[200px] place-items-center">
        <svg viewBox="0 0 200 200" className="hv-ring absolute inset-0" aria-hidden>
          <circle cx="100" cy="100" r={R} fill="none" stroke="#f1eefc" strokeWidth="14" />
          <circle className="arc" cx="100" cy="100" r={R} fill="none" stroke="#9788ff" strokeWidth="14" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - Math.min(pct, 100) / 100)} />
        </svg>
        <svg viewBox="0 0 200 200" className="hv-sweep absolute inset-0 opacity-70" aria-hidden>
          <defs>
            <linearGradient id="hvsw" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#9788ff" stopOpacity="0" />
              <stop offset="1" stopColor="#9788ff" stopOpacity=".32" />
            </linearGradient>
          </defs>
          <path d="M100 100 L100 14 A86 86 0 0 1 166 44 Z" fill="url(#hvsw)" />
        </svg>
        <div className="relative text-center">
          <div className="text-[36px] font-semibold leading-none tracking-[-0.05em] text-fg-1">
            {data ? pct.toFixed(2) : "—"}
            <span className="text-[20px] text-fg-3">%</span>
          </div>
          <div className="mt-1.5 text-[11px] text-fg-3">reserve ÷ supply</div>
        </div>
      </div>

      <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
        {[
          ["reserve", data ? fmtAmount(data.reserves, 2) : "—"],
          ["supply", data ? fmtAmount(data.supply, 2) : "—"],
          ["block", data ? data.block.toString() : "—"],
        ].map(([k, v]) => (
          <div key={k} className="rounded-xl bg-bg-4 px-1 py-2.5">
            <dd className="text-[14px] font-semibold tabular-nums text-fg-1">{v}</dd>
            <dt className="mt-0.5 text-[10px] uppercase tracking-[0.1em] text-fg-3">{k}</dt>
          </div>
        ))}
      </dl>
    </div>
  );
}

/** Left card: a borrow request that loops between a passing check (BACKED) and a failing one (REFUSED). An illustration. */
function RequestCard() {
  const Row = ({ k, v }: { k: string; v: string }) => (
    <div className="flex items-center justify-between border-b border-line-1 py-2.5 text-[13px] last:border-0">
      <span className="text-fg-3">{k}</span>
      <span className="font-semibold text-fg-1">{v}</span>
    </div>
  );
  const Scene = ({ cls, collateral, label, pct }: { cls: string; collateral: string; label: string; pct: string }) => (
    <div className={`${cls} absolute inset-0 p-6`}>
      <div className="relative mb-3 flex items-center justify-between">
        <span className="text-[13px] font-semibold text-fg-1">Borrow request</span>
        <span className="rounded-full bg-bg-4 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.08em] text-fg-3">illustration</span>
      </div>
      <Row k="Borrow" v="5 tPOT" />
      <Row k="Collateral" v={collateral} />
      <div className="mt-5">
        <div className="mb-2 flex justify-between text-[12px]">
          <span className="text-fg-3">{label}</span>
          <span className="font-semibold text-fg-1">{pct}</span>
        </div>
        <div className="hv-bar"><i /></div>
      </div>
      <span className="hv-stamp">{cls === "hv-sc1" ? "BACKED" : "REFUSED"}</span>
    </div>
  );
  return (
    <div className="hv-card hv-float relative hidden h-[320px] w-[290px] shrink-0 translate-y-10 md:block" style={{ ["--d" as string]: "1.1s", ["--r" as string]: "-1.5deg" }}>
      <Scene cls="hv-sc1" collateral="10 bPOT, fully backed" label="Backing check" pct="100%" />
      <Scene cls="hv-sc2" collateral="1,000 forged bPOT" label="Backing check" pct="9%" />
    </div>
  );
}

/** Right card: real testnet transactions scrolling past. */
function FeedCard() {
  const items = chainEvents;
  const list = [...items, ...items];
  return (
    <div className="hv-card hv-float relative hidden h-[320px] w-[290px] shrink-0 translate-y-10 p-6 md:block" style={{ ["--d" as string]: "2.2s", ["--r" as string]: "1.5deg" }}>
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[13px] font-semibold text-fg-1">On-chain, latest</span>
        <span className="rounded-full bg-bg-4 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.08em] text-fg-3">testnet</span>
      </div>
      <div className="hv-feed">
        <div>
          {list.map((e, i) => (
            <div key={i} className="flex items-start gap-3 border-b border-line-1 py-3 last:border-0">
              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ background: e.tone === "bad" ? "#211d1d" : "#9788ff" }} />
              <div className="min-w-0">
                <div className="truncate text-[13px] font-semibold text-fg-1">{e.title}</div>
                <div className="truncate font-mono text-[11px] text-fg-3">{e.meta}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function HeroCards() {
  return (
    <div className="mx-auto flex max-w-[1080px] items-start justify-center gap-5">
      <RequestCard />
      <LiveCard />
      <FeedCard />
    </div>
  );
}
