"use client";
import { useCallback, useEffect, useState } from "react";
import { parseEther } from "viem";
import { LiveGauge } from "@/components/Live";
import { useBacking } from "@/hooks/use-backing";
import { useWallet } from "@/hooks/use-wallet";
import { addresses, bpotAbi, fmtAmount, gatewayAbi, portaldot, publicClient, short } from "@/lib/chain";

type Tab = "mint" | "redeem" | "borrow" | "repay";
const TABS: { id: Tab; label: string }[] = [
  { id: "mint", label: "Mint" },
  { id: "redeem", label: "Redeem" },
  { id: "borrow", label: "Borrow" },
  { id: "repay", label: "Repay" },
];

export default function AppPage() {
  const w = useWallet();
  const { data: backing } = useBacking();
  const [tab, setTab] = useState<Tab>("mint");
  const [amount, setAmount] = useState("");
  const [tpot, setTpot] = useState<bigint | null>(null);
  const [bpot, setBpot] = useState<bigint | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const n = parseFloat(amount) || 0;
  const live = tab === "mint" || tab === "redeem";

  const loadBalances = useCallback(async () => {
    if (!w.account) return;
    const [a, b] = await Promise.all([
      publicClient.getBalance({ address: w.account }),
      publicClient.readContract({ address: addresses.bpot, abi: bpotAbi, functionName: "balanceOf", args: [w.account] }),
    ]);
    setTpot(a);
    setBpot(b);
  }, [w.account]);

  useEffect(() => {
    loadBalances().catch(() => {});
  }, [loadBalances]);

  async function submit() {
    setMsg(null);
    const client = w.walletClient();
    if (!client || !w.account || n <= 0) return;
    setBusy(true);
    try {
      const value = parseEther(amount);
      const hash =
        tab === "mint"
          ? await client.writeContract({ address: addresses.gateway, abi: gatewayAbi, functionName: "deposit", account: w.account, value })
          : await client.writeContract({ address: addresses.gateway, abi: gatewayAbi, functionName: "withdraw", account: w.account, args: [value] });
      setMsg({ kind: "ok", text: `Submitted ${short(hash, 10)}. Waiting for confirmation…` });
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      setMsg({
        kind: receipt.status === "success" ? "ok" : "err",
        text: receipt.status === "success" ? `Confirmed in block ${receipt.blockNumber}. Tx ${hash}` : `Transaction reverted. Tx ${hash}`,
      });
      setAmount("");
      await loadBalances();
    } catch (e) {
      setMsg({ kind: "err", text: e instanceof Error ? e.message.split("\n")[0] : "Transaction failed" });
    } finally {
      setBusy(false);
    }
  }

  const ready = !!w.account && w.onRightChain;
  const balance = tab === "redeem" ? bpot : tpot;
  const unit = tab === "redeem" ? "bPOT" : "tPOT";
  const tooMuch = balance !== null && n > 0 && parseEther(amount || "0") > balance;

  const preview =
    tab === "mint"
      ? [["You receive", `${n.toFixed(4)} bPOT`], ["Rate", "1 tPOT = 1 bPOT"], ["Backing after", "Reserve and supply both rise by the same amount"]]
      : [["You receive", `${n.toFixed(4)} tPOT`], ["Rate", "1 bPOT = 1 tPOT"], ["Needs", "Reserve must hold enough tPOT (first come, first served)"]];

  return (
    <div className="wrap-wide py-12">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="h2">App</h1>
          <p className="mt-1 text-[14px] text-fg-3">
            {portaldot.name} · chain {portaldot.id}
          </p>
        </div>
        {!w.account ? (
          <button className="btn btn-dark" onClick={w.connect}>
            Connect Wallet
          </button>
        ) : !w.onRightChain ? (
          <button className="btn btn-primary" onClick={() => w.switchChain().catch(() => {})}>
            Switch to Portaldot
          </button>
        ) : (
          <span className="btn btn-soft pointer-events-none font-mono">{short(w.account, 6)}</span>
        )}
      </div>
      {w.error && <p className="mb-4 text-[14px] text-danger">{w.error}</p>}

      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <div className="card-light p-6 sm:p-8">
          <div className="inline-flex flex-wrap rounded-full bg-bg-4 p-1">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  setTab(t.id);
                  setAmount("");
                  setMsg(null);
                }}
                className={`rounded-full px-5 py-2 text-[14px] font-medium transition-colors ${tab === t.id ? "bg-white shadow-sm" : "text-fg-3"}`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {live ? (
            <>
              <label className="mt-6 block text-[13px] text-fg-3">{tab === "mint" ? "Deposit tPOT" : "Redeem bPOT"}</label>
              <div className="mt-2 flex items-center gap-3 rounded-2xl bg-bg-4 px-5 py-4">
                <input
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => /^\d*\.?\d*$/.test(e.target.value) && setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-transparent text-[28px] font-semibold tracking-[-0.04em] outline-none placeholder:text-fg-4"
                />
                <span className="text-[13px] text-fg-3">{unit}</span>
              </div>
              <div className="mt-2 text-[12px] text-fg-3">
                Balance: {ready && balance !== null ? `${fmtAmount(balance)} ${unit}` : "—"}
              </div>

              <dl className="mt-6 space-y-3 rounded-2xl border border-line-1 p-5">
                {preview.map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-6 text-[14px]">
                    <dt className="text-fg-3">{k}</dt>
                    <dd className="text-right font-medium">{v}</dd>
                  </div>
                ))}
              </dl>

              <button disabled={!ready || n <= 0 || tooMuch || busy} onClick={submit} className="btn btn-primary mt-6 h-12 w-full text-[15px]">
                {!w.account ? "Connect wallet to continue" : !w.onRightChain ? "Switch network first" : busy ? "Confirm in wallet…" : tooMuch ? "Amount exceeds balance" : tab === "mint" ? "Mint bPOT" : "Redeem for tPOT"}
              </button>
              {tab === "mint" && (
                <p className="mt-3 text-[12px] leading-5 text-fg-4">
                  Your first mint on this chain also pays a one-time storage deposit of a few tPOT for your new token balance entry. The
                  deposited amount itself is held 1:1 as backing.
                </p>
              )}
              {msg && (
                <p className={`mt-4 break-all rounded-xl px-4 py-3 text-[13px] ${msg.kind === "ok" ? "bg-[#e6f9ec] text-ok-strong" : "bg-[#ffe9e0] text-danger"}`}>
                  {msg.text}
                </p>
              )}
            </>
          ) : (
            <div className="mt-6 rounded-2xl bg-bg-4 p-6">
              <div className="text-[16px] font-medium">LendingMarket is not deployed yet</div>
              <p className="mt-2 text-[14px] leading-6 text-fg-2">
                {tab === "borrow" ? "Borrowing" : "Repaying"} runs through <code className="font-mono">LendingMarket</code>, which is written and passes 18 local tests
                but isn&apos;t on the testnet yet. Contract code on Portaldot V3 costs about 0.06 tPOT per byte, so it is waiting on more testnet tokens. Mint and
                redeem above are live.
              </p>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="card-light flex items-center gap-6 p-6">
            <LiveGauge size={120} />
            <div>
              <div className="text-[15px] font-medium">bPOT backing</div>
              <p className="mt-1 text-[13px] leading-5 text-fg-3">
                {backing
                  ? `${fmtAmount(backing.reserves)} tPOT held for ${fmtAmount(backing.supply)} bPOT. Read live from BackingMonitor.`
                  : "Reading BackingMonitor…"}
              </p>
            </div>
          </div>
          <div className="card-light p-6">
            <h3 className="text-[15px] font-medium">Your balances</h3>
            <dl className="mt-4 space-y-3 text-[14px]">
              {[
                ["tPOT", ready && tpot !== null ? fmtAmount(tpot) : "—"],
                ["bPOT", ready && bpot !== null ? fmtAmount(bpot) : "—"],
                ["Debt", "LendingMarket not deployed"],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between">
                  <dt className="text-fg-3">{k}</dt>
                  <dd className="font-medium">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
