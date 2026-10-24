"use client";
import { LogoMark } from "@/components/Logo";
import { Card, Count, Eyebrow, Pill, Stat, Sub, Title, d } from "./parts";

export type Theme = "light" | "dark" | "plain";
export interface SlideDef {
  id: string;
  label: string;
  theme: Theme;
  render: () => React.ReactNode;
}

/* ───────────────────────── 1. Cover ───────────────────────── */
function Cover() {
  return (
    <div className="text-center">
      <div className="s-pop mx-auto mb-7 grid h-16 w-16 place-items-center rounded-2xl bg-primary text-white shadow-[0_18px_50px_-18px_rgba(151,136,255,.9)]" style={d(80)}>
        <LogoMark size={34} />
      </div>
      <h1 className="s-rise text-[clamp(2.6rem,7vw,5.2rem)] font-[550] leading-[1.02] tracking-[-0.055em]" style={d(220)}>
        DotProof
      </h1>
      <p className="s-rise mx-auto mt-5 max-w-2xl text-[clamp(1.1rem,2.2vw,1.6rem)] leading-[1.3] tracking-[-0.02em] text-fg-2" style={d(360)}>
        Lending that checks whether the collateral is <span className="text-fg-1">actually backed</span> — inside the borrow transaction.
      </p>
      <div className="s-rise mt-9 flex flex-wrap items-center justify-center gap-3 text-[13px]" style={d(520)}>
        <Pill tone="ok">
          <span className="h-1.5 w-1.5 rounded-full bg-ok" /> Live on Portaldot V3 testnet
        </Pill>
        <Pill tone="muted">38 tests passing</Pill>
        <Pill tone="muted">Ecosystem DApps track</Pill>
      </div>
    </div>
  );
}

/* ───────────────────────── 2. Market ───────────────────────── */
function Market() {
  return (
    <div>
      <Eyebrow>The market</Eyebrow>
      <Title>
        Lending runs on wrapped collateral.
        <br />
        Nothing checks the wrapper.
      </Title>
      <Sub className="text-fg-2">Every bridged or wrapped token is collateral somewhere. When its reserve breaks, the price feed is the last to know.</Sub>

      <div className="mt-11 grid grid-cols-2 gap-x-8 gap-y-9 sm:grid-cols-4">
        <Stat delay={420} value={<Count prefix="$" to={2} suffix="B" />} label="Stolen from cross-chain bridges" source="Chainalysis, 2022 — dated figure" />
        <Stat delay={520} value={<Count to={69} suffix="%" />} label="Of all stolen crypto funds that year" source="Chainalysis, 2022" />
        <Stat delay={620} value={<Count to={13} />} label="Separate bridge hacks" source="Chainalysis, 2022" />
        <Stat delay={720} value="0" label="Lending protocols that verify backing at borrow time" source="Before DotProof" tone="danger" />
      </div>

      <Card delay={860} className="mt-11 !bg-bg-4 !shadow-none">
        <p className="text-[15px] leading-[1.5] text-fg-2">
          Price feeds answer <span className="font-medium text-fg-1">&ldquo;what is it worth?&rdquo;</span> — never{" "}
          <span className="font-medium text-fg-1">&ldquo;does it still exist?&rdquo;</span>
        </p>
      </Card>
    </div>
  );
}

/* ───────────────────────── 3. Real incident ───────────────────────── */
const timeline = [
  { t: "Step 1", d: "Forged cross-chain message", v: "116,500 rsETH minted, unbacked", tone: "danger" as const },
  { t: "Step 2", d: "Deposited as Aave collateral", v: "89,567 rsETH, seven wallets", tone: "danger" as const },
  { t: "Step 3", d: "Borrowed against it", v: "~$190M WETH and wstETH", tone: "danger" as const },
  { t: "Step 4", d: "Markets frozen — hours later", v: "The borrowing had already happened", tone: "muted" as const },
];

function Incident() {
  return (
    <div>
      <Eyebrow tone="dark">A real incident · April 2026</Eyebrow>
      <Title className="text-white">KelpDAO → Aave</Title>
      <Sub className="text-white/60">Aave&rsquo;s own report found its contracts functioned exactly as designed. That is the problem.</Sub>

      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_1.1fr] lg:items-center">
        <div className="grid grid-cols-2 gap-x-8 gap-y-8">
          <Stat tone="dark" delay={380} value={<Count prefix="$" to={292} suffix="M" />} label="Stolen in the bridge exploit" source="Unchained" />
          <Stat tone="dark" delay={470} value={<Count prefix="~$" to={190} suffix="M" />} label="Borrowed against unbacked collateral" source="Unchained" />
          <Stat tone="dark" delay={560} value={<Count prefix="$" to={230} suffix="M" />} label="Upper bad-debt estimate for Aave" source="CoinDesk" />
          <Stat tone="dark" delay={650} value={<Count to={100} suffix="%" />} label="Pool utilization after the run — withdrawals froze" source="Unchained" />
        </div>

        <ol className="space-y-2.5">
          {timeline.map((s, i) => (
            <li
              key={s.t}
              className="s-rise flex items-start gap-4 rounded-2xl border border-white/[0.07] bg-white/[0.04] px-5 py-3.5"
              style={d(760 + i * 110)}
            >
              <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${s.tone === "danger" ? "bg-danger" : "bg-white/30"}`} />
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/40">{s.t}</div>
                <div className="text-[15px] font-medium text-white">{s.d}</div>
                <div className="text-[13px] text-white/50">{s.v}</div>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

/* ───────────────────────── 4. Problem ───────────────────────── */
const layers = [
  { n: "01", h: "Backing breaks silently", p: "A forged mint looks normal on every price feed until the market reacts." },
  { n: "02", h: "Reaction is too slow", p: "Freezes need a guardian or a per-asset feed. Atomic mint-and-borrow beats any off-chain bot." },
  { n: "03", h: "Damage spreads", p: "One bad asset in a shared pool becomes bad debt for lenders who never touched it." },
];

function Problem() {
  return (
    <div>
      <Eyebrow>The problem</Eyebrow>
      <Title>Three failures, every time</Title>
      <Sub className="text-fg-2">Lending protocols judge collateral by price and governance review — not by whether it is still backed.</Sub>

      <div className="mt-12 grid gap-4 md:grid-cols-3">
        {layers.map((l, i) => (
          <Card key={l.n} delay={420 + i * 140} className="relative overflow-hidden">
            <div className="text-[13px] font-semibold tracking-[0.1em] text-primary">{l.n}</div>
            <h3 className="mt-5 text-[19px] font-medium tracking-[-0.02em]">{l.h}</h3>
            <p className="mt-2.5 text-[14px] leading-[1.5] text-fg-2">{l.p}</p>
            <div className="s-grow mt-6 h-[3px] rounded-full bg-gradient-to-r from-primary to-purple-6" style={d(700 + i * 140)} />
          </Card>
        ))}
      </div>
    </div>
  );
}

/* ───────────────────────── 5. Solution ───────────────────────── */
function Solution() {
  return (
    <div>
      <Eyebrow>The solution</Eyebrow>
      <Title>
        The check runs <span className="text-primary">inside</span> the borrow.
      </Title>
      <Sub className="text-fg-2">If mint and borrow happen in one transaction, only an on-chain check at borrow time can stop it.</Sub>

      <div className="s-rise mt-8 flex items-start gap-4 rounded-2xl border border-primary/15 bg-white/70 px-6 py-5 backdrop-blur-sm" style={d(320)}>
        <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary text-white">
          <LogoMark size={19} />
        </span>
        <p className="text-[15px] leading-[1.55] text-fg-2">
          <span className="font-semibold text-fg-1">DotProof</span> is an isolated-market lending protocol on Portaldot. Lock POT to mint{" "}
          <span className="font-mono text-[14px] text-fg-1">bPOT</span>, borrow against it — and the market proves the collateral is still backed before
          it lends.
        </p>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card delay={460} className="!bg-bg-4 !shadow-none">
          <div className="mb-4 text-[12px] font-semibold uppercase tracking-[0.12em] text-fg-3">Today</div>
          <pre className="overflow-x-auto font-mono text-[13px] leading-[1.7] text-fg-2">
            <code>
              {`borrow(amount)
  ✓ price feed
  ✓ LTV
  ✓ caps
`}
              <span className="text-danger">{`  ✗ 61%-backed collateral
    still prices at 100%`}</span>
            </code>
          </pre>
        </Card>

        <Card delay={580} className="relative overflow-hidden ring-1 ring-primary/25">
          <div className="mb-4 text-[12px] font-semibold uppercase tracking-[0.12em] text-primary-strong">DotProof</div>
          <pre className="overflow-x-auto font-mono text-[13px] leading-[1.7] text-fg-2">
            <code>
              {`borrow(amount)
  ratio = reserve / supply
`}
              <span className="text-ok-strong">{`  ✓ read on-chain, same tx`}</span>
              {`
`}
              <span className="font-semibold text-danger">{`  ✗ revert BackingBelowThreshold`}</span>
            </code>
          </pre>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-4">
        {[
          ["Borrow-time check", "Reverts in the same transaction"],
          ["Seasoning", "Fresh collateral waits N blocks"],
          ["Isolation", "One market pauses, not the pool"],
          ["Backstop", "Pre-funded, absorbs the first loss"],
        ].map(([h, p], i) => (
          <Card key={h} delay={760 + i * 100} className="!p-5">
            <div className="text-[15px] font-medium tracking-[-0.01em]">{h}</div>
            <div className="mt-1.5 text-[13px] leading-[1.4] text-fg-3">{p}</div>
          </Card>
        ))}
      </div>
    </div>
  );
}

/* ───────────────────────── 6. How it works ───────────────────────── */
const flow = [
  { k: "Gateway", v: "Locks tPOT, mints bPOT 1:1", live: true },
  { k: "BackingMonitor", v: "reserve ÷ supply, on-chain", live: true },
  { k: "LendingMarket", v: "Checks the ratio at borrow", live: false },
  { k: "CircuitBreaker", v: "Pauses one market, no admin key", live: false },
];

function How() {
  return (
    <div>
      <Eyebrow tone="dark">How it works</Eyebrow>
      <Title className="text-white">Four contracts and a bonded agent</Title>
      <Sub className="text-white/60">No price oracle. Collateral and debt are both POT-denominated, so value = amount × backing ratio.</Sub>

      <div className="mt-11 flex flex-col gap-3 lg:flex-row lg:items-stretch">
        {flow.map((f, i) => (
          <div key={f.k} className="flex flex-1 items-center gap-3">
            <div
              className="s-rise flex-1 rounded-2xl border border-white/[0.07] bg-white/[0.04] px-5 py-5"
              style={d(400 + i * 130)}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-[14px] font-medium text-white">{f.k}</span>
                <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${f.live ? "bg-ok" : "bg-warn"}`} />
              </div>
              <div className="mt-2 text-[13px] leading-[1.4] text-white/55">{f.v}</div>
            </div>
            {i < flow.length - 1 && (
              <span className="s-pop hidden text-white/25 lg:block" style={d(470 + i * 130)}>
                →
              </span>
            )}
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="s-rise rounded-2xl border border-white/[0.07] bg-white/[0.04] p-6" style={d(960)}>
          <div className="mb-4 flex items-center gap-2 text-[13px] font-medium text-[#b8b2fa]">
            <span className="h-2 w-2 rounded-full bg-ok" /> Sentinel agent — bonded, autonomous
          </div>
          <div className="grid grid-cols-2 gap-5 text-[14px]">
            <div>
              <div className="font-medium text-ok">Can</div>
              <div className="mt-1 leading-[1.5] text-white/55">Pause a market, lower caps</div>
            </div>
            <div>
              <div className="font-medium text-danger">Cannot</div>
              <div className="mt-1 leading-[1.5] text-white/55">Unpause, raise caps, move funds</div>
            </div>
          </div>
        </div>
        <div className="s-rise rounded-2xl border border-white/[0.07] bg-white/[0.04] p-6" style={d(1060)}>
          <div className="mb-4 text-[13px] font-medium text-[#b8b2fa]">Judged by the chain, not by us</div>
          <div className="space-y-2 text-[14px] leading-[1.5] text-white/60">
            <div>
              <span className="text-ok">True alarm</span> → the Sentinel earns a reward
            </div>
            <div>
              <span className="text-danger">False alarm</span> → 20% of its bond is slashed into the Backstop
            </div>
          </div>
        </div>
      </div>

      <p className="s-rise mt-6 text-[13px] text-white/35" style={d(1180)}>
        An optional LLM advisor writes incident reasons and flags early slips. It is advisory only — it can never lift a pause.
      </p>
    </div>
  );
}

/* ───────────────────────── 7. Why better ───────────────────────── */
const rows = [
  { n: "Aave Proof of Reserve", gap: "Flags after the fact. Needs a Chainlink feed per asset plus governance. Freeze is reserve-wide", live: "5 assets, one chain" },
  { n: "Aave Umbrella", gap: "Pays after the loss by slashing stakers. 20-day cooldown", live: "Live" },
  { n: "Morpho Blue", gap: "Isolated, but no backing check or backstop described", live: "Live" },
  { n: "Euler v2", gap: "Bad-debt cover is opt-in per vault", live: "Live" },
];

function Why() {
  return (
    <div>
      <Eyebrow>Why DotProof</Eyebrow>
      <Title>Everyone else reacts. We refuse.</Title>

      <div className="mt-9 space-y-2.5">
        {rows.map((r, i) => (
          <div
            key={r.n}
            className="s-rise grid grid-cols-1 items-center gap-2 rounded-2xl border border-line-1 bg-white px-5 py-4 sm:grid-cols-[200px_1fr_140px]"
            style={d(320 + i * 110)}
          >
            <div className="text-[15px] font-medium tracking-[-0.01em]">{r.n}</div>
            <div className="text-[14px] leading-[1.45] text-fg-2">{r.gap}</div>
            <div className="text-[12px] text-fg-4 sm:text-right">{r.live}</div>
          </div>
        ))}

        <div
          className="s-rise grid grid-cols-1 items-center gap-2 rounded-2xl bg-fg-1 px-5 py-5 text-white sm:grid-cols-[200px_1fr_140px]"
          style={d(780)}
        >
          <div className="flex items-center gap-2 text-[16px] font-semibold tracking-[-0.01em]">
            <LogoMark size={20} /> DotProof
          </div>
          <div className="text-[14px] leading-[1.45] text-white/75">
            Refuses the borrow in the same transaction. Pauses one market only. No feed, no governance vote, no admin key.
          </div>
          <div className="text-[12px] text-white/40 sm:text-right">Testnet prototype</div>
        </div>
      </div>

      <p className="s-rise mt-7 text-[13px] text-fg-4" style={d(900)}>
        Where we are not better: liquidity, audits, battle-testing. Cross-chain backing still relies on bonded attestation.
      </p>
    </div>
  );
}

/* ───────────────────────── 8. Status ───────────────────────── */
function Status() {
  return (
    <div className="text-center">
      <Eyebrow>Live right now</Eyebrow>
      <Title className="mx-auto">Deployed, tested, verifiable</Title>

      <div className="mx-auto mt-12 grid max-w-3xl grid-cols-2 gap-x-8 gap-y-10 sm:grid-cols-4">
        <Stat delay={380} value={<Count to={7} />} label="Contracts live on Portaldot V3" />
        <Stat delay={470} value={<Count to={38} />} label="Tests passing" />
        <Stat delay={560} value={<Count to={6} />} label="Real borrow-flow txs on testnet" />
        <Stat delay={650} value={<Count to={909} />} label="bps — where the attack reverted" tone="danger" />
      </div>

      <div className="s-rise mx-auto mt-12 max-w-2xl rounded-2xl bg-bg-4 px-6 py-5 text-left" style={d(800)}>
        <div className="mb-3 text-[12px] font-semibold uppercase tracking-[0.12em] text-fg-3">Next</div>
        <div className="grid gap-2 text-[14px] text-fg-2 sm:grid-cols-3">
          <div>Run the agents on the live contracts</div>
          <div>Wire borrow and repay into the app</div>
          <div>Open the monitor to any token</div>
        </div>
      </div>

      <p className="s-rise mt-9 text-[15px] text-fg-3" style={d(920)}>
        github.com/Rohitamalraj/DotProof
      </p>
    </div>
  );
}

/* ───────────────────────── 8b. Why Portaldot ───────────────────────── */
const why = [
  { h: "EVM on pallet-revive", p: "Plain Solidity deploys as it is. Existing tools and audits carry over." },
  { h: "Built for RWA and security", p: "Tokenized assets need a proof of backing. That is our primitive." },
  { h: "A primitive for the ecosystem", p: "BackingMonitor works for any token backed by a native reserve." },
  { h: "Real on-chain activity", p: "Every mint, borrow and agent action is a transaction." },
];

function WhyPortaldot() {
  return (
    <div>
      <Eyebrow tone="dark">Why Portaldot</Eyebrow>
      <Title className="text-white">Where this belongs</Title>
      <Sub className="text-white/60">Not ported from elsewhere. Measured and built on V3.</Sub>

      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        {why.map((w, i) => (
          <Card key={w.h} tone="dark" delay={420 + i * 120}>
            <div className="text-[20px] font-medium tracking-[-0.02em] text-white">{w.h}</div>
            <div className="mt-2 text-[15px] leading-[1.45] text-white/60">{w.p}</div>
          </Card>
        ))}
      </div>

      <div className="mt-10 grid grid-cols-3 gap-6">
        <Stat tone="dark" delay={950} value={<Count to={7} />} label="Contracts live on V3" />
        <Stat tone="dark" delay={1050} value={<Count to={6} />} label="Real borrow-flow transactions" />
        <Stat tone="dark" delay={1150} value={<Count prefix="" to={1766} />} label="tPOT of code deposits, spent on-chain" />
      </div>
    </div>
  );
}

/* ───────────────────────── 10. What's next and the ask ───────────────────────── */
const road = [
  ["Now", "Borrow and repay in the app, all pages on live contracts"],
  ["Next", "More markets: tokenized and bridged assets, one isolated market each"],
  ["Then", "Cross-chain backing through bonded Sentinel attestation"],
  ["Mainnet", "Security review, then migration"],
];

function Next() {
  return (
    <div>
      <Eyebrow>What&rsquo;s next</Eyebrow>
      <Title>Why keep backing this</Title>

      <div className="mt-10 grid gap-6 lg:grid-cols-[1.25fr_1fr]">
        <ol className="space-y-2.5">
          {road.map(([k, v], i) => (
            <li
              key={k}
              className="s-rise flex items-start gap-4 rounded-2xl border border-line-1 bg-white px-5 py-4"
              style={d(380 + i * 120)}
            >
              <span className="mt-0.5 w-[74px] shrink-0 font-mono text-[12px] font-semibold uppercase tracking-[0.12em] text-primary-strong">{k}</span>
              <span className="text-[15px] leading-[1.4] text-fg-1">{v}</span>
            </li>
          ))}
        </ol>

        <Card delay={900} className="!bg-fg-1 !border-fg-1">
          <div className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[#b8b2fa]">The ask</div>
          <ul className="mt-4 space-y-3 text-[15px] leading-[1.4] text-white/85">
            <li>Mainnet migration support</li>
            <li>Help with contract storage deposits. Our full protocol cost 1,766 tPOT.</li>
            <li>Technical and security review</li>
          </ul>
        </Card>
      </div>

      <p className="s-rise mt-8 text-[13px] text-fg-4" style={d(1200)}>
        An unaudited prototype today. Cross-chain backing relies on bonded attestation, a trust assumption we document.
      </p>
    </div>
  );
}

export const slides: SlideDef[] = [
  { id: "cover", label: "DotProof", theme: "plain", render: () => <Cover /> },
  { id: "market", label: "Market", theme: "light", render: () => <Market /> },
  { id: "incident", label: "Incident", theme: "dark", render: () => <Incident /> },
  { id: "problem", label: "Problem", theme: "plain", render: () => <Problem /> },
  { id: "solution", label: "Solution", theme: "light", render: () => <Solution /> },
  { id: "how", label: "How it works", theme: "dark", render: () => <How /> },
  { id: "why", label: "Why better", theme: "plain", render: () => <Why /> },
  { id: "portaldot", label: "Why Portaldot", theme: "dark", render: () => <WhyPortaldot /> },
  { id: "status", label: "Status", theme: "light", render: () => <Status /> },
  { id: "next", label: "What's next", theme: "plain", render: () => <Next /> },
];
