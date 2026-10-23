import Link from "next/link";
import { Reveal } from "../Reveal";
import { LogoMark } from "../Logo";

function Cube({ layers, className = "", shade = 0 }: { layers: number; className?: string; shade?: number }) {
  const tops = ["#8b7df5", "#7a67ee", "#6a55e0"];
  const sides = ["#a99cff", "#9788ff", "#8878f5"];
  const h = 34;
  return (
    <svg viewBox="0 0 180 220" className={className} aria-hidden>
      {Array.from({ length: layers }).map((_, i) => {
        const y = 150 - i * h;
        return (
          <g key={i}>
            <path d={`M90 ${y + 46} L170 ${y + 4} V${y + 4 + h} L90 ${y + 46 + h} L10 ${y + 4 + h} V${y + 4} Z`} fill={sides[(shade + 1) % 3]} opacity={0.9} />
            <path d={`M90 ${y + 46 + h} L170 ${y + 4 + h} V${y + 4} L90 ${y + 46} Z`} fill={sides[shade]} />
          </g>
        );
      })}
      {(() => {
        const y = 150 - (layers - 1) * h;
        return (
          <g>
            <path d={`M90 ${y - 42} L170 ${y} L90 ${y + 42} L10 ${y} Z`} fill={tops[shade]} />
            <path d={`M90 ${y - 42} L170 ${y} L90 ${y + 42} L10 ${y} Z`} fill="url(#sheen)" />
            <g transform={`translate(54 ${y - 12}) scale(1.2)`} color="#fff">
              <LogoMarkInline />
            </g>
          </g>
        );
      })()}
      <defs>
        <linearGradient id="sheen" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity=".35" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function LogoMarkInline() {
  return (
    <g fill="none" stroke="#fff" strokeLinecap="round">
      <path d="M2 20C2 9 9 2 18 2s16 7 16 18" strokeWidth="5" />
      <circle cx="18" cy="14" r="3" fill="#fff" stroke="none" />
      <circle cx="27" cy="14" r="3" fill="#fff" stroke="none" />
    </g>
  );
}

export function Build() {
  return (
    <section id="build" className="mt-28">
      <div className="wrap text-center">
        <Reveal>
          <h2 className="h1 text-fg-1">Build with DotProof</h2>
          <p className="lead mx-auto mt-5 max-w-md text-[17px]">
            Drop <code className="rounded bg-bg-4 px-1.5 py-0.5 font-mono text-[14px]">BackingMonitor</code> into any Portaldot token and
            let your protocol check reserves before it trusts a balance.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link href="#" className="btn btn-primary h-11">
              Start Building
            </Link>
            <Link href="#" className="btn btn-soft h-11">
              Read the Docs
            </Link>
          </div>
        </Reveal>
      </div>
      <div className="panel mt-14" style={{ background: "linear-gradient(180deg,#fff 0%,#eeeaff 55%,#d9d3fb 100%)" }}>
        <div className="mx-auto flex max-w-[700px] items-end justify-center gap-2 px-4 pt-14 sm:gap-6">
          <Cube layers={1} shade={0} className="w-[28%] translate-y-6" />
          <Cube layers={2} shade={1} className="w-[30%] translate-y-3" />
          <Cube layers={3} shade={2} className="w-[32%]" />
        </div>
        <div className="wrap grid gap-3 pb-14 pt-4 text-left sm:grid-cols-3">
          {[
            ["Reusable primitive", "Compute reserve ÷ supply on-chain for any ERC-20 you mint."],
            ["Open source", "Public repo, disclosed dependencies, written inside the build window."],
            ["EVM native", "Solidity contracts on the Portaldot V3 EVM, chain ID 420420777."],
          ].map(([t, d], i) => (
            <Reveal key={t} delay={i * 80} className="card-light bg-white/90 p-5">
              <div className="text-[15px] font-semibold">{t}</div>
              <p className="mt-1.5 text-[14px] leading-5 text-fg-2">{d}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
