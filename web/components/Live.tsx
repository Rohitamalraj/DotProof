"use client";
import { useBacking } from "@/hooks/use-backing";
import { BackingGauge } from "@/components/ui";
import { addresses, deployTxs, fmtAmount, short } from "@/lib/chain";

/** Gauge fed by the live BackingMonitor read (falls back to a neutral state while loading). */
export function LiveGauge({ size = 180 }: { size?: number }) {
  const { data } = useBacking();
  return <BackingGauge value={data ? data.ratioBps / 100 : 0} size={size} />;
}

/** "Live on testnet" strip: real values read from the deployed contracts. */
export function LiveStrip() {
  const { data, error, loading } = useBacking();
  const cells = [
    ["Backing ratio", data ? `${(data.ratioBps / 100).toFixed(2)}%` : "…"],
    ["Reserve held", data ? `${fmtAmount(data.reserves)} tPOT` : "…"],
    ["bPOT supply", data ? `${fmtAmount(data.supply)} bPOT` : "…"],
    ["Latest block", data ? data.block.toString() : "…"],
  ];
  return (
    <section className="wrap-wide mt-6">
      <div className="card-light mx-5 px-6 py-8 sm:px-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-[19px] font-medium tracking-[-0.02em]">Live on Portaldot testnet</h3>
          <span className="inline-flex items-center gap-2 text-[13px] text-fg-3">
            <span className={`h-2 w-2 rounded-full ${error ? "bg-danger" : loading ? "bg-warn" : "bg-ok"}`} />
            {error ? "RPC unreachable" : loading ? "Reading chain…" : "Read from BackingMonitor"}
          </span>
        </div>
        <dl className="mt-6 grid grid-cols-2 gap-6 sm:grid-cols-4">
          {cells.map(([k, v]) => (
            <div key={k}>
              <dd className="text-[26px] font-semibold leading-none tracking-[-0.04em] text-primary">{v}</dd>
              <dt className="mt-2 text-[13px] text-fg-3">{k}</dt>
            </div>
          ))}
        </dl>
        <p className="mt-6 break-all text-[12px] leading-5 text-fg-3">
          Gateway <span className="font-mono">{short(addresses.gateway, 10)}</span> · bPOT{" "}
          <span className="font-mono">{short(addresses.bpot, 10)}</span> · BackingMonitor{" "}
          <span className="font-mono">{short(addresses.monitor, 10)}</span> · demo deposit tx{" "}
          <span className="font-mono">{short(deployTxs.demoDeposit, 10)}</span>
        </p>
      </div>
    </section>
  );
}
