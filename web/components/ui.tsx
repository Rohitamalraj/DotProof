import type { MarketStatus } from "@/lib/placeholder";

export function StatusBadge({ status }: { status: MarketStatus }) {
  const map = {
    active: ["Active", "bg-[#e6f9ec] text-ok-strong", "bg-ok"],
    seasoning: ["Seasoning", "bg-[#fff6d6] text-[#9a7400]", "bg-warn"],
    paused: ["Paused", "bg-[#ffe9e0] text-danger", "bg-danger"],
  } as const;
  const [label, cls, dot] = map[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-medium ${cls}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {label}
    </span>
  );
}

export function PageHeader({ eyebrow, title, sub, children }: { eyebrow?: string; title: string; sub?: string; children?: React.ReactNode }) {
  return (
    <section className="panel panel-lavender -mt-px pb-14 pt-16 sm:pt-20">
      <div className="wrap text-center">
        {eyebrow && <div className="mb-3 text-[14px] font-medium text-primary-strong">{eyebrow}</div>}
        <h1 className="h1 !text-[clamp(2.2rem,5vw,3.5rem)]">{title}</h1>
        {sub && <p className="lead mx-auto mt-4 max-w-xl text-[17px]">{sub}</p>}
        {children && <div className="mt-7 flex flex-wrap justify-center gap-3">{children}</div>}
      </div>
    </section>
  );
}

export function BackingGauge({ value, size = 140 }: { value: number; size?: number }) {
  const r = 52, c = 2 * Math.PI * r;
  const ok = value >= 99.5;
  const color = ok ? "#28d358" : value >= 90 ? "#ffd631" : "#f24900";
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg viewBox="0 0 120 120" width={size} height={size} className="-rotate-90">
        <circle cx="60" cy="60" r={r} fill="none" stroke="#f1f1f0" strokeWidth="10" />
        <circle cx="60" cy="60" r={r} fill="none" stroke={color} strokeWidth="10" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - Math.min(value, 100) / 100)} style={{ transition: "stroke-dashoffset 1s ease" }} />
      </svg>
      <div className="absolute text-center">
        <div className="text-[26px] font-semibold leading-none tracking-[-0.05em]">{value.toFixed(1)}%</div>
        <div className="mt-1 text-[11px] text-fg-3">backed</div>
      </div>
    </div>
  );
}
