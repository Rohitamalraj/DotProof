export function LogoMark({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size * 0.7} viewBox="0 0 40 28" fill="none" aria-hidden>
      <path d="M3 25C3 12 10.5 3 20 3s17 9 17 22" stroke="currentColor" strokeWidth="5.5" strokeLinecap="round" />
      <circle cx="20" cy="17" r="3.4" fill="currentColor" />
      <circle cx="29.5" cy="17" r="3.4" fill="currentColor" />
    </svg>
  );
}

export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <LogoMark />
      <span className="text-[22px] font-semibold tracking-[-0.06em] leading-none">dotproof</span>
    </span>
  );
}
