import Link from "next/link";
import { Reveal } from "../Reveal";
import { LogoMark } from "../Logo";
import { incidentStats } from "@/lib/placeholder";

const steps = [
  ["Forged mint", "Attacker mints unbacked bPOT through a compromised path."],
  ["Seasoning", "Fresh collateral cannot be borrowed against for N blocks."],
  ["Backing check", "Reserve ÷ supply fails, so the borrow reverts in the same transaction."],
  ["Isolated pause", "Sentinels pause that one market. Everything else keeps running."],
];

export function Incident() {
  return (
    <section className="mt-28">
      <div className="wrap text-center">
        <Reveal>
          <span className="inline-flex items-center gap-1.5 text-primary">
            <LogoMark size={22} />
            <span className="text-[17px] font-semibold tracking-[-0.05em]">dotproof</span>
          </span>
          <h2 className="h1 mt-4 text-fg-1">Backed by Default</h2>
          <p className="lead mx-auto mt-5 max-w-md text-[17px]">
            In April 2026, unbacked collateral was borrowed against before anyone could freeze the market. We check at the moment of
            the borrow.
          </p>
          <Link href="/markets/fixture" className="btn btn-soft mt-6 h-11">
            See the reproduction
          </Link>
        </Reveal>
      </div>

      <div className="wrap-wide mt-14">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {incidentStats.map((s, i) => (
            <Reveal key={s.l} delay={i * 70} className="card-light p-6">
              <div className="text-[34px] font-semibold leading-none tracking-[-0.05em]">{s.v}</div>
              <div className="mt-3 text-[14px] leading-5 text-fg-2">{s.l}</div>
              <div className="mt-3 text-[12px] text-fg-4">{s.s}</div>
            </Reveal>
          ))}
        </div>

        <ol className="mt-4 grid gap-4 md:grid-cols-4">
          {steps.map(([t, d], i) => (
            <Reveal key={t} delay={i * 70}>
              <li className="h-full rounded-[20px] bg-bg-4 p-6">
                <div className="mb-6 grid h-7 w-7 place-items-center rounded-full bg-primary text-[13px] font-semibold text-white">{i + 1}</div>
                <div className="text-[16px] font-medium tracking-[-0.01em]">{t}</div>
                <p className="mt-1.5 text-[14px] leading-5 text-fg-2">{d}</p>
              </li>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}
