import Link from "next/link";
import { Reveal } from "../Reveal";
import { LogoMark } from "../Logo";

const pills = [
  { t: "Sentinel", d: "Pauses one market" },
  { t: "Keeper", d: "Liquidates bad debt" },
  { t: "Guardian", d: "Protects positions" },
];

export function AgentsDark() {
  return (
    <section id="security" className="panel panel-dark mt-6 py-24">
      <div className="wrap text-center">
        <Reveal>
          <div className="mb-4 inline-flex items-center gap-2 text-white/80">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-white/10">
              <LogoMark size={18} mono />
            </span>
            <span className="text-[17px] font-medium">DotProof Agents</span>
          </div>
          <h2 className="h1 text-white">
            The <span className="text-[#a99cff]">Full Power</span> of
            <br className="hidden sm:block" /> bonded automation
          </h2>
          <p className="mx-auto mt-5 max-w-lg text-[17px] text-white/60">
            Agents have their own wallets, hard permission limits and slashable bonds. They can only make the system safer.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/agents" className="btn btn-light h-11">
              Meet the Agents
            </Link>
            <Link href="/#build" className="btn btn-ghost-dark h-11">
              Learn More
            </Link>
          </div>
        </Reveal>
        <div className="mt-14 grid gap-4 text-left sm:grid-cols-3">
          {pills.map((p, i) => (
            <Reveal key={p.t} delay={i * 90} className="card-dark p-6">
              <div className="mb-8 flex items-center gap-2 text-[13px] text-[#a99cff]">
                <span className="h-2 w-2 rounded-full bg-ok" style={{ animation: "pulse-ring 1.8s infinite" }} /> Online
              </div>
              <div className="text-[20px] font-medium tracking-[-0.02em]">{p.t}</div>
              <div className="mt-1 text-[15px] text-white/55">{p.d}</div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
