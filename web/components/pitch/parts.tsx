"use client";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

export const d = (ms: number) => ({ "--d": `${ms}ms` }) as CSSProperties;

export function Eyebrow({ children, delay = 0, tone = "light" }: { children: ReactNode; delay?: number; tone?: "light" | "dark" }) {
  return (
    <div
      className={`s-rise mb-5 inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[12px] font-semibold uppercase tracking-[0.14em] ${
        tone === "dark" ? "bg-white/10 text-[#b8b2fa]" : "bg-purple-8 text-primary-strong"
      }`}
      style={d(delay)}
    >
      {children}
    </div>
  );
}

export function Title({ children, delay = 120, className = "" }: { children: ReactNode; delay?: number; className?: string }) {
  return (
    <h2 className={`s-rise text-[clamp(2rem,4.4vw,3.4rem)] font-[550] leading-[1.06] tracking-[-0.045em] ${className}`} style={d(delay)}>
      {children}
    </h2>
  );
}

export function Sub({ children, delay = 220, className = "" }: { children: ReactNode; delay?: number; className?: string }) {
  return (
    <p className={`s-rise mt-4 max-w-2xl text-[clamp(1rem,1.5vw,1.2rem)] leading-[1.45] ${className}`} style={d(delay)}>
      {children}
    </p>
  );
}

/** Counts up when it mounts, so every slide entrance feels alive. */
export function Count({ to, decimals = 0, prefix = "", suffix = "", ms = 1100 }: { to: number; decimals?: number; prefix?: string; suffix?: string; ms?: number }) {
  const [v, setV] = useState(0);
  const raf = useRef(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setV(to);
      return;
    }
    const t0 = performance.now();
    const step = (t: number) => {
      const p = Math.min(1, (t - t0) / ms);
      setV(to * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf.current);
  }, [to, ms]);
  return (
    <>
      {prefix}
      {v.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
      {suffix}
    </>
  );
}

export function Stat({
  value,
  label,
  source,
  delay = 0,
  tone = "light",
}: {
  value: ReactNode;
  label: string;
  source?: string;
  delay?: number;
  tone?: "light" | "dark" | "danger";
}) {
  const colour = tone === "dark" ? "text-[#b8b2fa]" : tone === "danger" ? "text-danger" : "text-primary";
  return (
    <div className="s-rise" style={d(delay)}>
      <div className={`text-[clamp(1.9rem,3.6vw,2.9rem)] font-semibold leading-none tracking-[-0.05em] ${colour}`}>{value}</div>
      <div className={`mt-2.5 text-[14px] leading-[1.35] ${tone === "dark" ? "text-white/70" : "text-fg-2"}`}>{label}</div>
      {source && <div className={`mt-1.5 text-[11px] ${tone === "dark" ? "text-white/35" : "text-fg-4"}`}>{source}</div>}
    </div>
  );
}

export function Card({
  children,
  delay = 0,
  tone = "light",
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  tone?: "light" | "dark";
  className?: string;
}) {
  return (
    <div
      className={`s-rise rounded-[20px] p-5 sm:p-6 ${
        tone === "dark" ? "border border-white/[0.07] bg-white/[0.04]" : "border border-line-1 bg-white shadow-[0_14px_40px_-28px_rgba(33,29,29,.35)]"
      } ${className}`}
      style={d(delay)}
    >
      {children}
    </div>
  );
}

export function Pill({ children, tone = "ok" }: { children: ReactNode; tone?: "ok" | "danger" | "muted" }) {
  const map = {
    ok: "bg-[#e6f9ec] text-ok-strong",
    danger: "bg-[#ffe9e0] text-danger",
    muted: "bg-bg-4 text-fg-2",
  } as const;
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-medium ${map[tone]}`}>{children}</span>;
}
