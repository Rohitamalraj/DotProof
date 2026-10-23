"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { LogoMark } from "@/components/Logo";
import { slides } from "@/components/pitch/slides";

const BG: Record<string, string> = {
  plain: "bg-white text-fg-1",
  light: "text-fg-1",
  dark: "text-white",
};

export default function PitchPage() {
  const [i, setI] = useState(0);
  const [dir, setDir] = useState(1);
  const [full, setFull] = useState(false);
  const touch = useRef(0);
  const last = slides.length - 1;
  const slide = slides[i];
  const dark = slide.theme === "dark";

  const go = useCallback(
    (next: number) => {
      setI((cur) => {
        const t = Math.max(0, Math.min(last, next));
        if (t !== cur) setDir(t > cur ? 1 : -1);
        return t;
      });
    },
    [last]
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (["ArrowRight", "ArrowDown", " ", "PageDown"].includes(e.key)) {
        e.preventDefault();
        go(i + 1);
      } else if (["ArrowLeft", "ArrowUp", "PageUp"].includes(e.key)) {
        e.preventDefault();
        go(i - 1);
      } else if (e.key === "Home") go(0);
      else if (e.key === "End") go(last);
      else if (e.key.toLowerCase() === "f") {
        if (document.fullscreenElement) document.exitFullscreen();
        else document.documentElement.requestFullscreen().catch(() => {});
      }
    };
    window.addEventListener("keydown", onKey);
    const onFs = () => setFull(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("fullscreenchange", onFs);
    };
  }, [i, go, last]);

  return (
    <div
      className={`deck-stage relative select-none overflow-hidden ${BG[slide.theme]}`}
      style={
        slide.theme === "light"
          ? { background: "linear-gradient(180deg,#fff 0%,#f4f1ff 55%,#e9e3ff 100%)" }
          : slide.theme === "dark"
            ? { background: "radial-gradient(70% 60% at 85% 100%, rgba(92,37,110,.55), transparent 70%), linear-gradient(180deg,#171020 0%,#2b1634 100%)" }
            : undefined
      }
      onTouchStart={(e) => (touch.current = e.changedTouches[0].clientX)}
      onTouchEnd={(e) => {
        const dx = e.changedTouches[0].clientX - touch.current;
        if (Math.abs(dx) > 60) go(i + (dx < 0 ? 1 : -1));
      }}
    >
      {/* ambient layers */}
      <div className={`pointer-events-none absolute inset-0 ${dark ? "deck-grid" : "deck-aura"}`} aria-hidden />

      {/* top bar */}
      <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-between px-6 py-5 sm:px-10">
        <Link href="/" className={`flex items-center gap-2 text-[15px] font-semibold tracking-[-0.03em] ${dark ? "text-white/80" : "text-fg-2"}`}>
          <LogoMark size={20} />
          dotproof
        </Link>
        <div className={`flex items-center gap-4 text-[12px] ${dark ? "text-white/40" : "text-fg-4"}`}>
          <span className="hidden sm:inline">{slide.label}</span>
          <span className="font-mono tabular-nums">
            {String(i + 1).padStart(2, "0")} / {String(slides.length).padStart(2, "0")}
          </span>
          <button
            onClick={() => (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen().catch(() => {}))}
            className={`rounded-full px-3 py-1 transition-colors ${dark ? "bg-white/10 hover:bg-white/20" : "bg-black/[0.05] hover:bg-black/10"}`}
            aria-label="Toggle fullscreen"
          >
            {full ? "Exit" : "Present"}
          </button>
        </div>
      </div>

      {/* slide */}
      <div className="relative z-10 grid place-items-center px-6 py-24 sm:px-10">
        <div
          key={slide.id}
          className="w-full max-w-5xl"
          style={{ ["--dir" as string]: dir }}
        >
          {slide.render()}
        </div>
      </div>

      {/* controls */}
      <div className="relative z-20 flex items-center justify-between gap-6 px-6 pb-7 sm:px-10">
        <div className="flex items-center gap-1.5">
          {slides.map((s, n) => (
            <button
              key={s.id}
              onClick={() => go(n)}
              aria-label={s.label}
              title={s.label}
              className={`h-1.5 rounded-full transition-all duration-500 ${
                n === i ? (dark ? "w-8 bg-white" : "w-8 bg-primary") : dark ? "w-1.5 bg-white/25 hover:bg-white/50" : "w-1.5 bg-fg-4/50 hover:bg-fg-3"
              }`}
            />
          ))}
        </div>

        <div className={`hidden text-[12px] sm:block ${dark ? "text-white/30" : "text-fg-4"}`}>
          <kbd className="font-mono">←</kbd> <kbd className="font-mono">→</kbd> to move · <kbd className="font-mono">F</kbd> to present
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => go(i - 1)}
            disabled={i === 0}
            className={`grid h-10 w-10 place-items-center rounded-full text-[18px] transition-all disabled:opacity-25 ${
              dark ? "bg-white/10 hover:bg-white/20" : "bg-black/[0.05] hover:bg-black/10"
            }`}
            aria-label="Previous slide"
          >
            ←
          </button>
          <button
            onClick={() => go(i + 1)}
            disabled={i === last}
            className={`grid h-10 w-10 place-items-center rounded-full text-[18px] transition-all disabled:opacity-25 ${
              dark ? "bg-white text-fg-1 hover:bg-white/90" : "bg-fg-1 text-white hover:opacity-90"
            }`}
            aria-label="Next slide"
          >
            →
          </button>
        </div>
      </div>

      {/* progress */}
      <div className={`absolute inset-x-0 bottom-0 z-20 h-[3px] ${dark ? "bg-white/10" : "bg-black/[0.06]"}`}>
        <div
          className={`h-full origin-left transition-transform duration-700 ease-out ${dark ? "bg-[#b8b2fa]" : "bg-primary"}`}
          style={{ transform: `scaleX(${(i + 1) / slides.length})`, width: "100%" }}
        />
      </div>
    </div>
  );
}
