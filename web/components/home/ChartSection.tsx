"use client";
import { useEffect, useRef, useState } from "react";
import { Reveal } from "../Reveal";

// PLACEHOLDER series (illustrative, not measured). Backing ratio over time.
const W = 760, H = 300, L = 44, R = 12, T = 16, B = 34;
const xs = ["Block 0", "+200", "+400", "+600", "+800", "+1000"];
const series = [
  { name: "DotProof (borrow-time check)", color: "#9788ff", fill: true, pts: [100, 100, 100, 100, 100, 100] },
  { name: "Unchecked collateral", color: "#4b4750", fill: false, pts: [100, 100, 100, 72, 64, 61.4] },
  { name: "Shared-pool exposure", color: "#a9a7ab", fill: false, pts: [100, 100, 100, 100, 88, 79] },
];
const yMin = 55, yMax = 105;
const px = (i: number) => L + (i * (W - L - R)) / (series[0].pts.length - 1);
const py = (v: number) => T + ((yMax - v) / (yMax - yMin)) * (H - T - B);
const path = (pts: number[]) => pts.map((v, i) => `${i ? "L" : "M"}${px(i).toFixed(1)} ${py(v).toFixed(1)}`).join(" ");

export function ChartSection() {
  const ref = useRef<HTMLDivElement>(null);
  const [on, setOn] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && (setOn(true), io.disconnect()), { threshold: 0.3 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <section className="panel panel-lavender mt-6 py-14 sm:py-20">
      <div className="wrap-wide">
        <Reveal>
          <div ref={ref} className="card-light mx-auto max-w-[860px] p-6 sm:p-10">
            <h3 className="text-[19px] font-medium tracking-[-0.02em]">Stay backed when the backing breaks.</h3>
            <div className="mt-1 flex flex-wrap items-start justify-between gap-3">
              <p className="text-[15px] text-fg-3">Reserve ÷ supply of collateral during a forged-mint event</p>
              <ul className="flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-fg-2">
                {series.map((s) => (
                  <li key={s.name} className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
                    {s.name}
                  </li>
                ))}
              </ul>
            </div>
            <svg viewBox={`0 0 ${W} ${H}`} className="mt-6 w-full" role="img" aria-label="Backing ratio comparison chart (placeholder data)">
              <defs>
                <linearGradient id="area" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#9788ff" stopOpacity=".28" />
                  <stop offset="1" stopColor="#9788ff" stopOpacity="0" />
                </linearGradient>
              </defs>
              {[60, 70, 80, 90, 100].map((v) => (
                <g key={v}>
                  <line x1={L} x2={W - R} y1={py(v)} y2={py(v)} stroke="#e8e6e6" strokeDasharray="3 5" />
                  <text x={0} y={py(v) + 4} fontSize="12" fill="#bcbbbb">{v}%</text>
                </g>
              ))}
              {xs.map((x, i) => (
                <text key={x} x={px(i)} y={H - 8} fontSize="12" fill="#8f8e8e" textAnchor="middle">{x}</text>
              ))}
              <path d={`${path(series[0].pts)} L${px(5)} ${py(yMin)} L${px(0)} ${py(yMin)} Z`} fill="url(#area)" opacity={on ? 1 : 0} style={{ transition: "opacity 1.2s ease .4s" }} />
              {series.map((s) => (
                <path
                  key={s.name}
                  d={path(s.pts)}
                  fill="none"
                  stroke={s.color}
                  strokeWidth={s.fill ? 3 : 2.2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  pathLength={1}
                  strokeDasharray={1}
                  strokeDashoffset={on ? 0 : 1}
                  style={{ transition: "stroke-dashoffset 1.6s cubic-bezier(.4,0,.2,1)" }}
                />
              ))}
              <circle cx={px(5)} cy={py(61.4)} r="4.5" fill="#4b4750" opacity={on ? 1 : 0} style={{ transition: "opacity .4s ease 1.6s" }} />
            </svg>
            <p className="mt-5 text-center text-[12px] text-fg-4">
              Illustrative placeholder data. The fixture market reproduces this curve on testnet with real transactions.
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
