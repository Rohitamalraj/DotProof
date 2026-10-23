import Link from "next/link";
import { PageHeader, StatusBadge, BackingGauge } from "@/components/ui";
import { markets } from "@/lib/placeholder";

export const metadata = { title: "Markets · DotProof" };

export default function MarketsPage() {
  return (
    <>
      <PageHeader eyebrow="Isolated markets" title="Every asset gets its own market" sub="Backing ratio is computed on-chain from reserves and checked at the moment of each borrow." />
      <section className="wrap-wide mt-10">
        <div className="card-light overflow-hidden">
          <div className="hidden grid-cols-[1.6fr_1fr_1fr_1fr_1fr_120px] gap-4 border-b border-line-1 px-6 py-3 text-[12px] font-medium text-fg-3 md:grid">
            <span>Market</span><span>Backing</span><span>Supply APY</span><span>Borrow APY</span><span>Utilization</span><span>Status</span>
          </div>
          {markets.map((m) => (
            <Link key={m.id} href={`/markets/${m.id}`} className="grid grid-cols-2 items-center gap-4 border-b border-line-1 px-6 py-5 transition-colors last:border-0 hover:bg-bg-panel md:grid-cols-[1.6fr_1fr_1fr_1fr_1fr_120px]">
              <div className="col-span-2 md:col-span-1">
                <div className="text-[16px] font-medium tracking-[-0.01em]">{m.name}</div>
                <div className="text-[13px] text-fg-3">{m.collateral} → {m.borrow} · {m.tag}</div>
              </div>
              <div className="text-[15px] font-medium">{m.backing.toFixed(1)}%</div>
              <div className="text-[15px]">{m.supplyApy ? `${m.supplyApy}%` : "—"}</div>
              <div className="text-[15px]">{m.borrowApy ? `${m.borrowApy}%` : "—"}</div>
              <div className="text-[15px]">{m.utilization ? `${m.utilization}%` : "—"}</div>
              <div><StatusBadge status={m.status} /></div>
            </Link>
          ))}
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {markets.map((m) => (
            <div key={m.id} className="card-light flex items-center gap-5 p-6">
              <BackingGauge value={m.backing} size={104} />
              <div>
                <div className="text-[15px] font-medium">{m.name}</div>
                <div className="mt-1 text-[13px] text-fg-3">Seasoning {m.seasoningBlocks} blocks</div>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-6 text-center text-[12px] text-fg-4">All figures are placeholders until the app is wired to testnet contracts.</p>
      </section>
    </>
  );
}
