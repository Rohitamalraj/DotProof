import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader, StatusBadge, BackingGauge } from "@/components/ui";
import { LiveGauge } from "@/components/Live";
import { activity, markets } from "@/lib/placeholder";

export function generateStaticParams() {
  return markets.map((m) => ({ id: m.id }));
}

export default async function MarketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const m = markets.find((x) => x.id === id);
  if (!m) notFound();
  const paused = m.status === "paused";

  const params_ = [
    ["Max LTV", `${m.ltv}%`],
    ["Liquidation threshold", `${m.liqThreshold}%`],
    ["Seasoning", `${m.seasoningBlocks} blocks`],
    ["Supply cap", m.supplyCap],
    ["Borrow cap", m.borrowCap],
    ["Backing threshold", "99.5%"],
  ];

  return (
    <>
      <PageHeader eyebrow={m.tag} title={m.name} sub={m.blurb}>
        <StatusBadge status={m.status} />
        <Link href="/app" className="btn btn-primary">Deposit &amp; Borrow</Link>
        <Link href="/markets" className="btn btn-soft">All markets</Link>
      </PageHeader>

      <section className="wrap-wide mt-10 grid gap-4 lg:grid-cols-3">
        <div className="card-light flex flex-col items-center p-8 text-center">
          {m.id === "bpot-core" ? <LiveGauge size={180} /> : <BackingGauge value={m.backing} size={180} />}
          <div className="mt-5 text-[15px] font-medium">BackingMonitor</div>
          <p className="mt-1 text-[13px] text-fg-3">Reserve balance ÷ {m.collateral} supply, computed on-chain.</p>
          {paused && (
            <div className="mt-5 w-full rounded-2xl bg-[#ffe9e0] p-4 text-[13px] leading-5 text-danger">
              CircuitBreaker tripped. Borrows revert with BackingBelowThreshold. Pause expires unless confirmed on-chain.
            </div>
          )}
        </div>

        <div className="card-light p-8 lg:col-span-2">
          <h3 className="text-[17px] font-medium tracking-[-0.02em]">Market parameters</h3>
          <dl className="mt-5 grid gap-x-8 gap-y-5 sm:grid-cols-2">
            {params_.map(([k, v]) => (
              <div key={k} className="flex items-baseline justify-between border-b border-line-1 pb-3">
                <dt className="text-[14px] text-fg-3">{k}</dt>
                <dd className="text-[15px] font-medium">{v}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-6">
            <div className="mb-2 flex justify-between text-[13px] text-fg-3"><span>Utilization</span><span>{m.utilization}%</span></div>
            <div className="h-2 rounded-full bg-bg-4"><div className="h-2 rounded-full bg-primary" style={{ width: `${m.utilization}%` }} /></div>
          </div>
        </div>

        <div className="card-light p-8 lg:col-span-3">
          <h3 className="text-[17px] font-medium tracking-[-0.02em]">Recent agent and contract activity</h3>
          <ul className="mt-4 divide-y divide-line-1">
            {activity.map((a) => (
              <li key={a.hash} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3.5">
                <span className={`h-2 w-2 rounded-full ${a.tone === "ok" ? "bg-ok" : "bg-danger"}`} />
                <span className="w-24 text-[13px] text-fg-3">{a.t}</span>
                <span className="w-28 text-[13px] font-medium">{a.who}</span>
                <span className="flex-1 text-[14px] text-fg-2">{a.what}</span>
                <span className="font-mono text-[12px] text-primary-strong">{a.hash}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[12px] text-fg-4">Placeholder rows. Hashes will link to the Portaldot explorer.</p>
        </div>
      </section>
    </>
  );
}
