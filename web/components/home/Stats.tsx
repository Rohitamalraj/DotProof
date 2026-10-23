import { Reveal } from "../Reveal";
import { protocolStats } from "@/lib/placeholder";

export function Stats() {
  return (
    <section className="wrap-wide mt-6">
      <Reveal className="card-light mx-5 px-6 py-12 text-center sm:px-10">
        <h2 className="text-[22px] font-medium tracking-[-0.03em] text-fg-1">A lending market that proves its backing</h2>
        <div className="mx-auto mt-10 grid max-w-3xl grid-cols-1 divide-y divide-line-1 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {protocolStats.map((s) => (
            <div key={s.label} className="px-4 py-6 sm:py-2">
              <div className="text-[44px] font-semibold leading-none tracking-[-0.05em] text-primary">{s.value}</div>
              <div className="mt-2 text-[13px] text-fg-3">{s.label}</div>
            </div>
          ))}
        </div>
      </Reveal>
    </section>
  );
}
