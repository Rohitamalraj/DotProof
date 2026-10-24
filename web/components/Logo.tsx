/**
 * The DotProof mark: a solid "D" with a dot held in its counter. The dot is the token, the D is the
 * vault that backs it. Solid shape so it survives favicon size. The D takes `currentColor`; the dot is the
 * "backed" green, or `currentColor` too when `mono` is set (use that on coloured tiles).
 */
export const MARK_PATH =
  "M20 14H46C68 14 84 29 84 48C84 67 68 82 46 82H20ZM50 33a15 15 0 1 0 0 30a15 15 0 0 0 0-30Z";

export function LogoMark({ size = 26, mono = false }: { size?: number; mono?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 96 96" fill="none" aria-hidden>
      <path d={MARK_PATH} fill="currentColor" fillRule="evenodd" />
      <circle cx="50" cy="48" r="8" fill={mono ? "currentColor" : "#28d358"} />
    </svg>
  );
}

export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <LogoMark size={28} />
      <span className="text-[22px] font-semibold tracking-[-0.06em] leading-none">dotproof</span>
    </span>
  );
}
