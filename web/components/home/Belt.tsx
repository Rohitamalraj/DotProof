import { Reveal } from "../Reveal";
import { chainEvents, testEvents, type EventCard } from "./data";

function Mini({ e, i }: { e: EventCard; i: number }) {
  // Only the two stamps that matter keep their label; the palette stays lavender and ink.
  const stamp = e.stamp === "BACKED" ? "BACKED" : e.stamp === "REFUSED" ? "REFUSED" : null;
  return (
    <article className="hv-mini">
      {stamp && (
        <span className="hv-stamp" style={{ color: stamp === "BACKED" ? "#7f6df0" : "#211d1d", ["--sd" as string]: `${(i % 4) * 1.4}s` }}>
          {stamp}
        </span>
      )}
      <div className="flex items-center gap-2 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-fg-3">
        <span className="h-2 w-2 rounded-full" style={{ background: e.tone === "bad" ? "#211d1d" : "#9788ff" }} />
        {e.tag}
      </div>
      <div className="mt-2.5 text-[16px] font-semibold leading-tight tracking-[-0.02em] text-fg-1">{e.title}</div>
      <div className="mt-1.5 font-mono text-[11.5px] leading-snug text-fg-3">{e.meta}</div>
    </article>
  );
}

function Row({ items, rev = false, label }: { items: EventCard[]; rev?: boolean; label: string }) {
  const doubled = [...items, ...items]; // the track slides by exactly half its width, so the loop is seamless
  return (
    <div className="hv-row" role="group" aria-label={label}>
      <div className={`hv-track ${rev ? "rev" : ""}`}>
        {doubled.map((e, i) => (
          <Mini key={`${e.title}-${i}`} e={e} i={i} />
        ))}
      </div>
    </div>
  );
}

/** Two belts of real events sliding in opposite directions: the live testnet above, the test suite below. */
export function Belt() {
  return (
    <section className="mt-6 pb-4 pt-14">
      <Reveal className="wrap mb-8 text-center">
        <h2 className="h2">Real transactions, not mock-ups</h2>
        <p className="lead mx-auto mt-3 max-w-xl">Top row: the live testnet. Bottom row: our test suite replaying the attack. Hover to pause.</p>
      </Reveal>
      <div className="hv-belts">
        <Row items={chainEvents} label="Live testnet transactions" />
        <Row items={testEvents} rev label="Test suite results" />
      </div>
    </section>
  );
}
