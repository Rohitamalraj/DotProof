"use client";
import { useMemo, useState } from "react";
import { BackingGauge } from "@/components/ui";
import { markets, network } from "@/lib/placeholder";

type Tab = "mint" | "borrow" | "repay";
const market = markets[0];
const BALANCE = 0; // placeholder until a wallet is connected

export default function AppPage() {
  const [connected, setConnected] = useState(false);
  const [tab, setTab] = useState<Tab>("mint");
  const [amount, setAmount] = useState("");
  const n = parseFloat(amount) || 0;

  const preview = useMemo(() => {
    if (tab === "mint") return [["You receive", `${n.toFixed(2)} bPOT`], ["Rate", "1 POT = 1 bPOT"], ["Reserve after", `+${n.toFixed(2)} POT`]];
    if (tab === "borrow")
      return [
        ["Max borrow at 70% LTV", `${(n * 0.7).toFixed(2)} tPOT`],
        ["Borrow APY", `${market.borrowApy}%`],
        ["Backing check", "Runs in this transaction"],
        ["Seasoning", `${market.seasoningBlocks} blocks`],
      ];
    return [["You repay", `${n.toFixed(2)} tPOT`], ["Interest accrued", "0.00 tPOT"]];
  }, [tab, n]);

  const labels: Record<Tab, [string, string]> = { mint: ["Deposit POT", "Mint bPOT"], borrow: ["Collateral (bPOT)", "Borrow tPOT"], repay: ["Repay tPOT", "Repay"] };

  return (
    <div className="wrap-wide py-12">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="h2">App</h1>
          <p className="mt-1 text-[14px] text-fg-3">{network.name} · chain {network.chainId}</p>
        </div>
        <button className={`btn ${connected ? "btn-soft" : "btn-dark"}`} onClick={() => setConnected((v) => !v)}>
          {connected ? "0x0000…0000 (placeholder)" : "Connect Wallet"}
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <div className="card-light p-6 sm:p-8">
          <div className="inline-flex rounded-full bg-bg-4 p-1">
            {(["mint", "borrow", "repay"] as Tab[]).map((t) => (
              <button key={t} onClick={() => { setTab(t); setAmount(""); }} className={`rounded-full px-5 py-2 text-[14px] font-medium capitalize transition-colors ${tab === t ? "bg-white shadow-sm" : "text-fg-3"}`}>
                {t === "mint" ? "Gateway" : t}
              </button>
            ))}
          </div>

          <label className="mt-6 block text-[13px] text-fg-3">{labels[tab][0]}</label>
          <div className="mt-2 flex items-center gap-3 rounded-2xl bg-bg-4 px-5 py-4">
            <input inputMode="decimal" value={amount} onChange={(e) => /^\d*\.?\d*$/.test(e.target.value) && setAmount(e.target.value)} placeholder="0.00" className="w-full bg-transparent text-[28px] font-semibold tracking-[-0.04em] outline-none placeholder:text-fg-4" />
            <button className="rounded-full bg-white px-3 py-1 text-[12px] font-medium text-primary-strong" onClick={() => setAmount(String(BALANCE))}>MAX</button>
          </div>
          <div className="mt-2 text-[12px] text-fg-3">Balance: {connected ? BALANCE.toFixed(2) : "—"}</div>

          <dl className="mt-6 space-y-3 rounded-2xl border border-line-1 p-5">
            {preview.map(([k, v]) => (
              <div key={k} className="flex justify-between text-[14px]"><dt className="text-fg-3">{k}</dt><dd className="font-medium">{v}</dd></div>
            ))}
          </dl>

          <button disabled={!connected || n <= 0} className="btn btn-primary mt-6 h-12 w-full text-[15px]">
            {!connected ? "Connect wallet to continue" : labels[tab][1]}
          </button>
          <p className="mt-3 text-center text-[12px] text-fg-4">Transactions are disabled in this UI shell. Contract calls arrive in the next step.</p>
        </div>

        <div className="space-y-4">
          <div className="card-light flex items-center gap-6 p-6">
            <BackingGauge value={market.backing} size={120} />
            <div>
              <div className="text-[15px] font-medium">{market.name}</div>
              <p className="mt-1 text-[13px] leading-5 text-fg-3">Borrows revert if reserve ÷ supply falls below 99.5%.</p>
            </div>
          </div>
          <div className="card-light p-6">
            <h3 className="text-[15px] font-medium">Your position</h3>
            <dl className="mt-4 space-y-3 text-[14px]">
              {[["bPOT collateral", connected ? "0.00" : "—"], ["tPOT debt", connected ? "0.00" : "—"], ["Health factor", connected ? "∞" : "—"], ["Seasoning ends", connected ? "—" : "—"]].map(([k, v]) => (
                <div key={k} className="flex justify-between"><dt className="text-fg-3">{k}</dt><dd className="font-medium">{v}</dd></div>
              ))}
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
