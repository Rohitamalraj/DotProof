<p align="center">
  <img src="web/public/logo-mark.svg" alt="DotProof logo: a D holding a dot" width="96" />
</p>

# DotProof — The First Backing-Aware Lending on Portaldot

> **The first lending protocol on Portaldot where every borrow is checked, on-chain and inside the same transaction, against proof that the collateral is actually backed — and where a bonded agent network can only ever make the system safer.**

> Built for Portaldot Hacker House 2026 (Ecosystem DApps track). Unaudited hackathon prototype on the V3 testnet. Testnet tokens have no value.

---

## The Problem in One Sentence

Lending protocols judge collateral by **market price and governance review**, not by **whether it is still backed**, so a forged or buggy mint can be deposited and borrowed against before anyone can react.

---

## Why This Matters — The KelpDAO / Aave Incident (April 2026)

| Figure | Detail | Source |
|---|---|---|
| **$292M** | Stolen in the KelpDAO bridge exploit (Apr 18, 2026) | [Unchained](https://unchainedcrypto.com/aave-faces-up-to-230-million-in-losses-after-kelp-dao-exploit-incident-report-finds/) |
| **116,500** | Unbacked rsETH released by a forged cross-chain message | [CoinDesk](https://www.coindesk.com/tech/2026/04/20/aave-could-face-up-to-usd230-million-in-losses-after-kelp-dao-bridge-exploit-triggers-defi-chaos) |
| **89,567** | rsETH deposited as Aave collateral across seven wallets | [Unchained](https://unchainedcrypto.com/aave-faces-up-to-230-million-in-losses-after-kelp-dao-exploit-incident-report-finds/) |
| **~$190M** | WETH and wstETH borrowed against it, on Ethereum and Arbitrum | [Unchained](https://unchainedcrypto.com/aave-faces-up-to-230-million-in-losses-after-kelp-dao-exploit-incident-report-finds/) |
| **$123.7M – $230.1M** | Aave bad-debt estimate range (loss spread across all holders vs confined to L2s) | Unchained, CoinDesk |
| **100%** | WETH pool utilization after the run, which froze withdrawals | [Unchained](https://unchainedcrypto.com/aave-faces-up-to-230-million-in-losses-after-kelp-dao-exploit-incident-report-finds/) |
| **~$2B, 69%** | Stolen from cross-chain bridges in 2022 (Chainalysis, as of Aug 2022): 69% of all stolen funds across 13 hacks. *Dated figure.* | [CryptoSlate](https://cryptoslate.com/chainalysis-reports-2b-lost-in-cross-chain-bridge-hacks/) |

Outflow figures after the incident differ by source and by what they measure ($6B to $10B), so we do not rely on a single number. Aave's own report found its contracts functioned as designed. The gap is structural: nothing checked the backing.

---

## Three Layers of the Problem

### 1. Backing Breaks Silently
A forged or buggy mint creates tokens that look normal on price feeds until the market reacts. A price feed can't tell you that the reserve behind a token is gone.

### 2. Reaction Is Slow and Narrow
Freezes depend on a governance guardian or on an asset-specific feed existing and being enabled. In KelpDAO the attacker borrowed *before* Aave's markets were frozen. If mint and borrow happen atomically in one transaction, **no off-chain bot can stop them**. Only a check inside the borrow transaction can.

### 3. Damage Spreads
In a shared pool, one bad collateral creates bad debt that hits unrelated lenders. After the incident, WETH pools hit 100% utilization and lenders could not withdraw.

---

## The Solution — DotProof

DotProof is an **isolated-market** lending protocol. Each collateral asset gets its own market. Before any borrow, the market runs a **synchronous on-chain backing check**. Autonomous agents with their own wallets, hard permission limits and slashable bonds watch what the chain cannot see, and can only tighten the system.

```
Without a backing check (today's lending):
  borrow(amount)
  → checks: price feed, LTV, caps
  → collateral that is 61% backed still "looks" fully priced
  → borrow succeeds, loss lands on lenders

With DotProof:
  borrow(amount)
  → BackingMonitor.ratioBps()  = reserve / supply, read on-chain, same transaction
  → ratio < 99.5%  →  revert BackingBelowThreshold(ratio)
  → seasoning:     fresh collateral can't back a loan for N blocks
  → isolation:     only this market pauses, every other market keeps running
```

### Principles
1. **No simulated data.** Every price, reserve and attestation comes from real on-chain state or real RPC reads. Testnet tokens are valueless by nature, but no logic is faked.
2. **AI proposes, contracts dispose.** Safety-critical decisions are deterministic contract logic. Agents can only tighten, never loosen.
3. **Isolation by default.** One bad collateral must not contaminate other markets.
4. **Honest trust model.** Where trust is required (cross-chain attestation), it is documented, bonded and limited.

### Valuation Without a Price Oracle
Collateral (bPOT) and the borrow asset (native tPOT) are both POT-denominated, so collateral value is simply `amount × backing ratio × 1 POT`. No external price feed, nothing that can be manipulated or faked.

---

## What Makes DotProof Unique

| Protocol | Backing check at borrow | Scope of a freeze | Needs per-asset feed + governance | Loss cover | Where it is today |
|---|---|---|---|---|---|
| **Aave Proof of Reserve** | ❌ Flags after the fact, then an executor freezes | ❌ Reserve-wide (V2 executor also disables borrowing for all pool assets) | ✅ Chainlink feed per asset + governance enablement | ❌ | Live on Avalanche for 5 assets |
| **Aave Umbrella** | ❌ | n/a | n/a | ✅ Staker slashing, **after** the loss, 20-day cooldown | Live |
| **Morpho Blue** | ❌ None described | ✅ Isolated markets | Immutable per-market oracle | ❌ None described | Live |
| **Euler v2** | ❌ None described | ✅ Isolated vaults | n/a | ⚠️ Opt-in per vault | Live |
| **DotProof** | ✅ In the borrow transaction | ✅ One market only | ❌ No feed for assets we mint | ✅ Pre-funded backstop per market | Testnet prototype |

> Aave PoR and Umbrella rows come from the [Aave Proof of Reserve repo](https://github.com/aave-dao/aave-proof-of-reserve) and [Umbrella docs](https://aave.com/docs/aave-v3/umbrella). Morpho and Euler rows come from third-party overviews and should be verified against their official docs before being cited externally.

**Three capabilities this combination brings:**
1. **Borrow-time backing check**: the market itself refuses the borrow, so an atomic mint-and-borrow can't slip past an off-chain monitor.
2. **A breaker that can only tighten**: a sentinel can pause, anyone can confirm a pause with an on-chain proof, nobody (not even the owner) can unpause by decree.
3. **A reusable primitive**: `BackingMonitor` works for any Portaldot token whose backing is held as native currency by one reserve.

### Where DotProof Is *Not* Better
Liquidity, audits, battle-testing and price-oracle coverage. This is a hackathon prototype. Cross-chain backing in the design still depends on agent attestation, which is a trust assumption, not a trustless proof.

---

## Technical Architecture

### System Overview

```
┌──────────────────────── User / Browser ──────────────────────────┐
│  Next.js frontend (React 19, Tailwind)                            │
│  Landing page, markets, agents, app shell                         │
│  Status: built, data is placeholder until wired to the contracts  │
└───────────────────────────────────┬──────────────────────────────┘
                                    │  eth JSON-RPC
                                    ▼
┌────────────────── Portaldot V3 testnet (pallet-revive EVM) ──────┐
│                                                                   │
│  Gateway.sol                                  [deployed]          │
│  ├─ deposit()  → mints bPOT 1:1 against native POT it holds       │
│  ├─ withdraw() → burns bPOT, releases POT                         │
│  └─ the Gateway's own balance IS the reserve                      │
│                                                                   │
│  BPOT.sol                                     [deployed]          │
│  └─ minimal ERC-20, only the Gateway can mint or burn             │
│                                                                   │
│  BackingMonitor.sol                           [deployed]          │
│  └─ ratioBps() = reserve balance / bPOT supply, capped at 100%    │
│                                                                   │
│  LendingMarket.sol                            [tested locally]    │
│  ├─ supply / withdrawSupply  (share-based, interest accrues)      │
│  ├─ depositCollateral / withdrawCollateral                        │
│  ├─ borrow()  → BackingMonitor.ratioBps() check, same tx          │
│  ├─ seasoning: new collateral waits N blocks                      │
│  ├─ repay() / liquidate()  (bonus, bad-debt write-off)            │
│  └─ caps: supply, borrow, collateral                              │
│                                                                   │
│  CircuitBreaker.sol                           [tested locally]    │
│  ├─ trip()    sentinel only, expiring pause                       │
│  ├─ confirm() anyone, when BackingMonitor proves under-backing    │
│  └─ release() anyone, only once backing is restored               │
│                                                                   │
│  AgentRegistry.sol                            [tested locally]    │
│  ├─ bonds per role, reward pool, pull-based rewards               │
│  └─ slashing only by authorities (the breaker), funds → Backstop  │
│                                                                   │
│  Backstop.sol                                 [tested locally]    │
│  └─ first-loss reserve, funded by a share of interest             │
│                                                                   │
│  WeakGateway.sol  (EXPLOIT REPRODUCTION FIXTURE, not a bridge)    │
│  └─ forgedMint() creates bPOT with no reserve behind it           │
└───────────────────────────────────────────────────────────────────┘
        ▲                                         ▲
        │ trip(): pause only                      │ liquidate()
   Sentinel agent                            Keeper agent
   [written, tested]                         [written, tested]
```

```mermaid
flowchart LR
    U[User] -- deposit POT --> G[Gateway<br/>holds the backing]
    G -- mints 1:1 --> B[bPOT token]
    M[BackingMonitor<br/>reserve / supply] -. reads balance .-> G
    M -. reads supply .-> B

    U -- deposit bPOT, borrow tPOT --> L[LendingMarket<br/>isolated]
    L -- ratioBps check<br/>in the same tx --> M
    L -- isPaused --> CB[CircuitBreaker]
    CB -- confirm / release<br/>reads --> M
    L -- interest share,<br/>bad-debt cover --> BS[Backstop]

    S[Sentinel agent] -- trip: pause only --> CB
    K[Keeper agent] -- liquidate --> L
    CB -- judges each alarm:<br/>reward true, slash false --> R[AgentRegistry<br/>bonds, rewards]
    S -. posts bond .-> R
    R -- slashed bond --> BS

    subgraph Deployed on testnet
      G
      B
      M
    end
    subgraph Written and tested locally
      L
      CB
      BS
    end
```

---

## How the Safeguards Work

### 1. Synchronous Backing Check (`LendingMarket.borrow`)

```solidity
uint256 ratio = monitor.ratioBps();
if (ratio < params.minBackingBps) revert BackingBelowThreshold(ratio);
```

`BackingMonitor.ratioBps()` returns `reserve balance × 10,000 / supply`, capped at 100%, and treats an empty supply as fully backed. The check runs in the same transaction as the borrow.

### 2. Collateral Seasoning

New collateral sits in a `pending` bucket and only joins `seasoned` collateral after `seasoningBlocks`. Only seasoned collateral counts toward borrowing power. Each new deposit restarts the clock for the whole pending bucket, which is deliberately conservative.

### 3. Collateral Valuation Follows the Live Ratio

```solidity
function valueOf(uint256 amount) public view returns (uint256) {
    return (amount * monitor.ratioBps()) / BPS;   // no oracle
}
```

If backing falls, collateral value falls with it, positions become liquidatable on their own, and health factors reflect reality without any feed.

### 4. A Circuit Breaker That Can Only Tighten

| Action | Who | What it does |
|---|---|---|
| `trip(reason)` | Whitelisted sentinel | Time-limited pause. **Lapses on its own** unless confirmed |
| `confirm()` | Anyone | Promotes to a hard pause, **only if** `BackingMonitor` shows under-backing |
| `release()` | Anyone | Lifts a hard pause, **only once** backing is restored |
| unpause by decree | **Nobody** | Not possible, not even for the owner |

While paused, the market rejects new borrows and new collateral, and the liquidation threshold tightens (80% to 60% in the test configuration) so bad positions are cleared sooner. Repay, liquidate and lender withdrawals keep working.

### 5. Backstop
A configurable share of interest (10% in tests) accrues to the Backstop. On bad debt, the market draws from it first and only then reduces lenders' assets.

### 6. Exploit Reproduction Fixture
A correct wrapped token never goes unbacked, so a breaker would never fire. `contracts/contracts/fixtures/WeakGateway.sol` adds a deliberately weak privileged mint (`forgedMint`) mirroring how the KelpDAO attacker minted unbacked tokens. It exists only so the monitor and breaker have something real to catch. **It is a demo fixture, not a production bridge**, and is labelled as such in code and docs.

---

## The Same Attack Against DotProof — Sequence Diagrams

> This is how the system behaves in the automated tests (see "What the Tests Cover"). It is not a mainnet result.

### Honest Mint and Borrow

```mermaid
sequenceDiagram
    actor User
    participant Gateway as Gateway.sol
    participant bPOT as BPOT.sol
    participant Market as LendingMarket.sol
    participant Monitor as BackingMonitor.sol
    participant Breaker as CircuitBreaker.sol

    User->>Gateway: deposit{value: 100 tPOT}
    Gateway->>bPOT: mint(user, 100)
    Note over Gateway: Gateway balance = 100 tPOT backing 100 bPOT

    User->>bPOT: approve(Market, 100)
    User->>Market: depositCollateral(100)
    Note over Market: collateral is "pending" for N blocks

    User->>Market: borrow(50) before seasoning ends
    Market-->>User: revert ExceedsBorrowLimit (no seasoned collateral yet)

    Note over User,Market: N blocks later
    User->>Market: borrow(50)
    Market->>Breaker: isPaused()
    Breaker-->>Market: false
    Market->>Monitor: ratioBps()
    Monitor->>Gateway: balance()
    Monitor-->>Market: 10000 (100%)
    Market->>Market: check LTV against seasoned collateral value
    Market-->>User: send 50 tPOT
```

### Forged Mint: Borrow Reverts, Breaker Trips

```mermaid
sequenceDiagram
    actor Attacker
    actor Anyone
    participant Weak as WeakGateway.sol (fixture)
    participant Market as LendingMarket.sol
    participant Monitor as BackingMonitor.sol
    participant Breaker as CircuitBreaker.sol
    participant Sentinel as Sentinel bot (agents/src/sentinel.js)
    participant Keeper as Keeper bot (agents/src/keeper.js)

    Attacker->>Weak: forgedMint(attacker, 1000)
    Note over Weak: reserve 100 tPOT, supply 1,100 bPOT (no reserve behind 1,000)
    Attacker->>Market: depositCollateral(1000)
    Attacker->>Market: borrow(100)
    Market->>Monitor: ratioBps()
    Monitor-->>Market: 909 (9.09%)
    Market-->>Attacker: revert BackingBelowThreshold(909)

    Sentinel->>Breaker: trip("reserve < supply")
    Note over Breaker: expiring pause, only this market is affected
    Anyone->>Breaker: confirm()
    Breaker->>Monitor: isBacked(threshold)?
    Monitor-->>Breaker: false
    Breaker-->>Anyone: Confirmed, hard pause
    Note over Market: borrows and new collateral rejected,<br/>liquidation threshold tightened to 60%

    Keeper->>Market: liquidate(unhealthy position)
    Note over Market: backstop covers bad debt first,<br/>lenders only take the remainder

    Note over Anyone,Breaker: later, genuine deposits restore the ratio
    Anyone->>Breaker: release()
    Breaker->>Monitor: isBacked(threshold)?
    Monitor-->>Breaker: true
    Breaker-->>Anyone: Released
```

---

## Agent Network

Each agent has its own wallet (pays its own gas), a registered identity, role-limited permissions enforced by contracts, and a slashable bond.

| Agent | Job | Earns | Loses bond if | Can | Cannot |
|---|---|---|---|---|---|
| **Sentinel** | Reads source-chain reserves and mint/borrow patterns, flags danger | Reward when danger is confirmed | It raises false alarms | Pause one market, lower caps, post incident reports | Unpause, raise caps, move funds |
| **Keeper** | Liquidates unhealthy loans (permissionless, anyone can run one) | Liquidation bonus | It acts outside its limits | Liquidate | Anything else |
| **Guardian** *(stretch)* | Protects a user's position within their allowance | Small fee | It overspends | Spend up to the user's allowance | Exceed it or touch other accounts |

**Status:** `AgentRegistry`, the bonded-alarm logic in `CircuitBreaker`, and the rule-based Sentinel and Keeper bots are written, covered by tests, and **running against the live testnet contracts**. Two dedicated agent wallets are registered in the live `AgentRegistry` with their bonds (set up by `agents/setup-live.js`, which generates throwaway testnet-only keys into the git-ignored `.env` and never prints them):

| Agent | Address | Bond | Register tx |
|---|---|---|---|
| Sentinel | `0xeEc862Eb96c212a8F788121Ca36176070382F2e4` | 10 tPOT | `0x9d950273…2d4c4651` |
| Keeper | `0x5D46053e2EA5d66D1f315895BE3a0B685E6e5bA9` | 5 tPOT | `0xca7abf24…e590c` |

Live runs so far: `node agents/run.js sentinel --once` reads the real `BackingMonitor` (10000 bps), the advisor is on, and it correctly does nothing while backing is full. `node agents/run.js keeper --once` found the real borrower from the on-chain `Borrowed` events and correctly left the healthy position alone. The attack path (trip, confirm, reward) is demonstrated locally in `scripts/demo-e2e.js` because a correct Gateway can never go unbacked on-chain, which is why the exploit fixture exists.

**How bonds, rewards and slashing work (all deterministic, no human in the loop)**

| Step | What the contracts do |
|---|---|
| Register | An agent posts a native-currency bond (`register(role)`, minimum per role) and is active while its bond stays at or above the minimum |
| Trip | Only an **active Sentinel** can call `CircuitBreaker.trip()`. One unjudged trip at a time |
| Judge: true alarm | `confirm()` (anyone) succeeds only if `BackingMonitor` proves backing is below the threshold. A pending trip is then judged true and the Sentinel earns a reward (claimable, pull-based) |
| Judge: false alarm | If the trip expires and the market is still fully backed, anyone can call `settleExpired()`. The Sentinel is slashed 20% of its bond and the slashed funds go to the **Backstop** |
| After a slash | If the bond falls below the minimum the agent is inactive until it tops up |
| Leaving | `requestUnbond()` deactivates at once; the bond is withdrawable after a delay and stays slashable during it |
| Who can reward or slash | Only registered **authorities** (the breaker). The owner can only manage that list and fund the reward pool, and has no power over any agent |

There is no admin key on `CircuitBreaker`: it has no owner. Rewards are pull-based so a hostile agent contract can't block the breaker by reverting when paid.

**The bots** (`agents/`)
- **Sentinel** (`agents/src/sentinel.js`) reads `BackingMonitor`. Under-backed: trip, then confirm. Backed again: release a hard pause or settle its own expired trip. It cannot unpause, raise caps or move funds.
- **Keeper** (`agents/src/keeper.js`) finds borrowers from `Borrowed` events in chunks that respect RPC range limits, checks each health factor on-chain, and liquidates only positions below 1.0.
- Run with `node run.js sentinel` or `node run.js keeper --once`. Keys come from the git-ignored `.env` (`SENTINEL_KEY`, `KEEPER_KEY`), use throwaway testnet wallets.

**Decision logic:** rule-based. An optional **LLM advisor** (Groq API, default model `openai/gpt-oss-120b`, set `GROQ_MODEL` to change it) assists the Sentinel on borderline cases and logs its reasoning. It is **advisory only** and the rules stay in charge.

**What the advisor can and cannot do** (enforced in `agents/src/sentinel.js`, covered by tests)

| The advisor can | The advisor cannot |
|---|---|
| Raise an **early warning** while backing is still above the threshold but falling. Only a confident `alarm` (confidence ≥ 0.8) causes a soft, expiring trip | Trip below that confidence, or on a `watch` or `ignore` verdict |
| Write the **plain-language reason** attached to a trip that the rules already decided | Stop a trip the rules decided on, even if it says `ignore` |
| Add caution | **Release or lift a pause.** Releasing depends only on the on-chain backing ratio |
| | Call any contract directly. Only the bot's own rule-checked code sends transactions |

- **It has skin in the game.** An advisor-driven early warning is a soft pause. If backing holds and it expires, the Sentinel is slashed like any false alarm, so an over-eager model costs real bond.
- **It degrades safely.** With no `GROQ_API_KEY`, an API error, a malformed reply or a timeout (12 s), the advisor returns nothing and the Sentinel runs on rules alone. Run with `--no-ai` to force that.
- **Live check:** `node agents/scripts/groq-smoke.js` sends three scenarios to Groq and prints the verdicts (healthy → `ignore`, slipping above threshold → `watch`, below threshold → `alarm` with a written reason).
- **Honest note:** a plain script can read real chain data and apply thresholds just as well. The model adds explanation and a cautious second opinion, not safety. The safety comes from the contracts.

---

## Why Portaldot

- The ecosystem's stated focus on RWA tokenization and contract security fits a backing-check layer. (Portaldot's performance, quantum and AI claims are unverified and are not cited here.)
- V3 accepts Solidity through `pallet-revive`, so the contracts run there as plain EVM bytecode.
- **Ecosystem contribution:** `BackingMonitor` is reusable by any token on Portaldot, including future bridged assets. Integrations with iBridge, iSwap or a cross-chain oracle will be claimed only after their testnet availability is confirmed.

### Measured Findings About the Network (useful to other builders)

Measured against the live chain while building:

| Finding | Value | Consequence |
|---|---|---|
| EVM implementation | `pallet-revive`, `allowEVMBytecode = true`, RPC identifies as `eth-rpc` | Plain `solc` bytecode deploys directly. No `resolc` needed |
| Code storage deposit | `depositPerByte = 6e12` ≈ **0.06 tPOT per byte** of contract code, plus a fixed per-contract deposit | Bytecode size is a real cost: 20 KB across 7 contracts cost **1,766 tPOT** to deploy. `eth_estimateGas` includes the deposit, so dry-run before you spend |
| PolkaVM (`resolc`) build size | ~7× larger than EVM bytecode (`LendingMarket` 72 KB vs ~8 KB) | We deploy EVM bytecode |
| Decimals | `nativeToEthRatio = 10000`: 14 native decimals appear as 18 on the EVM side | Contracts assume 1e18 per tPOT |
| Account mapping | `autoMap = true`. An EVM `0x` address maps to the SS58 address `<20 bytes><12 × 0xEE>` | EVM wallets can be funded from a native account |

These findings shaped the code: bPOT is a minimal hand-written ERC-20, and the Reserve is merged into the Gateway, to save deposit.

---

## Live on Portaldot V3 Testnet

Network `PortaldotV3 Test` · EVM chain ID `420420777` · RPC `https://test-evm-rpc-v3.portaldot.dev` · node console `https://node-console.portaldot.dev/`

> **The whole protocol is deployed.** Deployer: `0xba8212D81868EB497FF67263761B774EFC413179`. Addresses and hashes are also in [`contracts/deployments/portaldot.json`](contracts/deployments/portaldot.json).

### Deployed Contracts

| Contract | Address | Code on-chain | Deploy tx |
|---|---|---|---|
| Gateway (also the reserve) | `0x619cA0F74Bbe92CaE32CA72920CbA0ff0E5aF370` | 1,055 B | `0x2b6ea71c…5ed06651` |
| bPOT | `0xF8191413d53B750cE2F0BFc44722c0EBF0bF95A1` | 1,884 B | created by the Gateway |
| BackingMonitor | `0x60A22c14e7c3353d5B26843c8eA1cFF5D12Ef589` | 828 B | `0x3eca7066…c804278` |
| Backstop | `0xB57969CE443DBDF2F41e67408A77e5311b548187` | 1,104 B | `0xe3338d89…3e97bbf0` |
| AgentRegistry | `0x95ccEd224908A20D7B4A7d684CbC9ACd4b0E2177` | 4,703 B | `0xb99bc324…ecdb1cec` |
| CircuitBreaker | `0xfa5DC13B034A66a206e06CCd5e6F9e0Aaee9cBE4` | 2,629 B | `0xca0dfa89…4b63a11b` |
| LendingMarket | `0x7e3444c1f9dbD53dEA5ebc8160522b154857566b` | 7,993 B | `0x363dab83…010e5d55e` |

Full hashes are in [`contracts/deployments/portaldot.json`](contracts/deployments/portaldot.json). Phase 1 (Gateway, bPOT, BackingMonitor) landed in blocks 162329–162331; phase 2 in blocks 171630–171634. Total deployment cost: **1,766 tPOT**, almost all of it storage deposit for contract code.

### Verified On-Chain After Deployment

Read straight from the chain, not from the deploy script's output:

| Check | Result |
|---|---|
| `AgentRegistry.isAuthority(CircuitBreaker)` | `true` — only the breaker can reward or slash |
| `Backstop.isMarket(LendingMarket)` | `true` |
| `CircuitBreaker.monitor()` / `.registry()` | match the deployed addresses |
| `LendingMarket.collateral()` / `.monitor()` | bPOT and BackingMonitor |
| `CircuitBreaker.isPaused()` | `false` |
| `LendingMarket.liqThresholdBps()` | `8000` (tightens to `6000` when paused) |
| `BackingMonitor.ratioBps()` | `10000` — 100% backed |
| `LendingMarket.valueOf(1 bPOT)` | `1 tPOT` |
| `AgentRegistry.minBond(Sentinel)` | `10 tPOT`, slash `2000` bps, reward `1 tPOT`, unbond `604800` s |

To verify any hash without an explorer, call `eth_getTransactionReceipt` against the RPC above (status `0x1` means success).

### Live Borrow Flow on the Testnet

A real supply → mint → collateral → borrow → repay run against the deployed contracts (`contracts/scripts/live-flow.js`), with every transaction confirmed `status=0x1`:

| Step | What happened | Tx | Block |
|---|---|---|---|
| 1. Supply | 20 tPOT of lender liquidity into `LendingMarket` | `0x23f7695e…0815b573` | 171671 |
| 2. Mint | 10 tPOT locked in the Gateway, 10 bPOT minted 1:1 | `0x595a96c6…d618871` | 171672 |
| 3. Approve | bPOT allowance to the market | `0x95bb3919…aa1498dc6` | 171673 |
| 4. Deposit collateral | 10 bPOT posted | `0x94d88104…dc4ae986` | 171674 |
| — Seasoning check | `borrow` simulated right after: **reverted `ExceedsBorrowLimit()`**, because the collateral was still seasoning | (simulated call) | 171674 |
| 5. Borrow | 5 tPOT, **backing checked at 100% inside the transaction**, after 120 blocks of seasoning | `0x831f9623…18f3c594` | 171795 |
| 6. Repay | Debt cleared to 0 | `0xbef95740…b4ea6d` | 171798 |

Full hashes are in `contracts/deployments/portaldot.json` under `liveFlow`. The whole run spent about 68.5 tPOT, mostly storage deposits for the new account entries. Afterwards, read from the chain: debt `0`, collateral `10 bPOT` (all seasoned), and the lenders' supply had grown from `20` to `20.0000001` tPOT from the interest the borrow accrued.

Run it yourself (read-only dry run needs no key): `DRY_RUN=1 npx hardhat run scripts/live-flow.js --network portaldot`.

> **ethers quirk worth knowing:** `LendingMarket.valueOf(...)` collides with JavaScript's built-in `Object.prototype.valueOf`, so an ethers `Contract` proxy returns the built-in instead of the contract method. Use `contract.getFunction("valueOf")(...)` or a raw `eth_call`. viem addresses functions by name and is unaffected.

---

## Project Status

| Item | State |
|---|---|
| All 7 contracts deployed on the Portaldot V3 testnet, wiring verified on-chain | ✅ Done |
| Gateway, bPOT, BackingMonitor, LendingMarket, CircuitBreaker, Backstop, AgentRegistry | ✅ 38 passing tests · ✅ live |
| Exploit reproduction fixture (`WeakGateway`) | ✅ Written and tested · ⏳ not deployed (a correct Gateway can't go unbacked, so the reproduction runs locally) |
| Frontend: live backing ratio, reserve, supply and block; wallet connect; **mint and redeem through the deployed Gateway** | ✅ Wired to the testnet contracts (viem) |
| Frontend: borrow/repay UI, markets list, agents page | ⏳ Contracts are live; the UI still reads placeholder data and needs wiring |
| Sentinel and Keeper bots | ✅ Written, tested, registered with bonds, and **run against the live contracts** |
| MarketFactory | ⏳ Not started |

---

## Repository Structure

```
DotProof/
├── contracts/                  # Hardhat project, all Solidity
│   ├── contracts/
│   │   ├── Gateway.sol                  # Mint/burn bPOT, holds the backing
│   │   ├── BPOT.sol                     # Minimal ERC-20, Gateway-controlled
│   │   ├── BackingMonitor.sol           # reserve / supply, on-chain
│   │   ├── LendingMarket.sol            # Isolated market (core)
│   │   ├── CircuitBreaker.sol           # Pause that can only tighten, no owner
│   │   ├── AgentRegistry.sol            # Bonds, rewards, slashing
│   │   ├── Backstop.sol                 # First-loss reserve
│   │   └── fixtures/WeakGateway.sol     # EXPLOIT REPRODUCTION FIXTURE
│   ├── test/DotProof.test.js            # 38 tests: contracts, agent registry, bots, AI advisor, the KelpDAO-style attack
│   ├── scripts/
│   │   ├── deploy-slice.js              # Check-in slice deploy (dry-run mode included)
│   │   ├── deploy-phase2.js             # Rest of the protocol + wiring (dry-run mode included)
│   │   ├── live-flow.js                 # Real supply/mint/collateral/borrow/repay on the testnet
│   │   ├── demo-slice.js                # Live backing-state demo against the testnet
│   │   └── demo-e2e.js                  # Full attack-and-response story on a local chain
│   └── deployments/portaldot.json       # Live addresses and tx hashes
│
├── agents/                     # Rule-based Sentinel and Keeper bots
│   ├── src/sentinel.js          # trip, confirm, settle, release
│   ├── src/keeper.js            # find borrowers, liquidate unhealthy positions
│   ├── run.js                   # CLI runner for the testnet
│   └── setup-live.js            # One-time: fund and register the agent wallets
│
└── web/                        # Next.js frontend
    ├── app/                     # /, /markets, /markets/[id], /agents, /app
    ├── components/              # Nav, Footer, landing sections
    └── lib/placeholder.ts       # Placeholder data, isolated for easy replacement
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Smart contracts | Solidity 0.8.24 (`paris` EVM target), Hardhat |
| Libraries | OpenZeppelin Contracts 5.x (`Ownable`, `ReentrancyGuard`, `SafeERC20`, `IERC20`) |
| Chain | Portaldot V3 testnet (`pallet-revive` EVM, chain ID 420420777) |
| Frontend | Next.js 15, React 19, TypeScript, Tailwind CSS 4, viem 2 (injected wallet, MetaMask) |
| Agents | Sentinel and Keeper bots (Node.js, ethers 6), rule-based, with an optional Groq LLM advisor (advisory only) |

---

## Local Setup

### Prerequisites

- Node.js 20+ (developed on Node 24)
- For testnet deployment: an EVM wallet funded with testnet tPOT (see below)

### Install

```bash
cd contracts && npm install
cd ../web && npm install
```

### Run the Tests

```bash
cd contracts
npx hardhat test          # 38 tests on a local Hardhat chain, no key needed
```

### Run the Frontend

```bash
cd web
npm run dev               # http://localhost:3000
```

> Don't run `npm run build` while `npm run dev` is running; both write to `.next` and the dev server will break until you delete `.next` and restart.

### Environment

**`.env`** at the repo root (git-ignored, never commit it):

```env
DEPLOYER_KEY=<testnet-only private key, no real funds>
# PORTALDOT_RPC=https://test-evm-rpc-v3.portaldot.dev   (optional override)
# SENTINEL_KEY=...   KEEPER_KEY=...    (throwaway testnet wallets for the bots)
# GROQ_API_KEY=gsk_...                 (optional, enables the Sentinel's LLM advisor)
# GROQ_MODEL=openai/gpt-oss-120b       (optional)
```

Use a throwaway wallet that holds only testnet tokens. The deploy script refuses to run if the key does not belong to the expected deployer address.

### Get Testnet Tokens

Testnet tPOT is distributed by the Portaldot team. Request tokens in the [Portaldot Discord](https://discord.gg/portaldot) with a **native** address (starts with `5`), not a `0x` address. To fund an EVM wallet, transfer from a native account to the wallet's mapped SS58 address (`<20-byte 0x address><12 × 0xEE>` encoded with prefix 42) using `balances.transferKeepAlive`.

### Deploy to the Testnet

```bash
cd contracts
DRY_RUN=1 npx hardhat run scripts/deploy-slice.js --network portaldot   # estimate cost, sends nothing
npx hardhat run scripts/deploy-slice.js --network portaldot             # real deployment
```

---

## End-to-End Test Flow

1. **Run the suite:** `cd contracts && npx hardhat test` and watch the 38 tests pass.
1. **Watch the whole story in one run (no tokens needed):** `npx hardhat run scripts/demo-e2e.js`. Two isolated markets: an honest user borrows after seasoning, an attacker forges 1,000 unbacked bPOT on the fixture market and the borrow reverts with `BackingBelowThreshold(909)`, the Sentinel bot pauses only that market and is paid, the healthy market keeps working, backing is restored and the pause lifts, and finally a false alarm costs the Sentinel part of its bond. With `GROQ_API_KEY` set, the LLM advisor writes the pause reason live.
2. **See the live deployment:** `npx hardhat run scripts/demo-slice.js --network portaldot` prints the addresses, the reserve held, the bPOT supply and the backing ratio read from the testnet, with no key needed.
3. **Mint on camera:** `DEPOSIT=0.1 npx hardhat run scripts/demo-slice.js --network portaldot` (needs `DEPLOYER_KEY`). Supply and reserve rise together and the ratio stays at 100%.
4. **Replay the attack locally:** the test `synchronous backing check reverts the attacker's borrow` forges 1,000 unbacked tokens against 100 real reserve and asserts the borrow reverts with `BackingBelowThreshold(909)`.
5. **See the breaker:** the tests `the breaker confirms permissionlessly, pauses only the affected market, and tightens liquidation` and `only sentinels can trip, a soft trip expires, and release needs restored backing` cover the full pause lifecycle.

6. **Use the browser app:** `cd web && npm run dev`, open `/app`, connect MetaMask (the app adds the Portaldot testnet for you), then **Mint** tPOT into bPOT and **Redeem** it back. The landing page's "Live on Portaldot testnet" strip and the `/app` gauge read `BackingMonitor` directly from the chain.

> Borrow and repay in the browser are not available yet, because `LendingMarket` is not deployed. Those tabs say so. The markets list, agents page and market details other than the bPOT gauge still show placeholder data.

---

## What the Tests Cover

- **Gateway and monitor:** mint and redeem 1:1, only the Gateway can mint, and a forged mint drops the ratio (100 real + 60 forged = 62.5%).
- **Seasoning and limits:** an immediate borrow fails, then succeeds after seasoning. LTV limit, collateral withdrawal that would break LTV, supply cap.
- **Interest:** accrual over a year, backstop share routed on flush, full repayment with refund of any overpayment, lender withdrawal with interest.
- **Liquidation:** healthy positions can't be liquidated, unhealthy ones can with the bonus, and bad debt is covered by the backstop first, then lenders.
- **The KelpDAO pattern:** an attacker forges 1,000 unbacked tokens, deposits them, and the borrow reverts in the same transaction, even before seasoning ends.
- **Breaker:** pauses only the affected market, tightens liquidation, anyone can confirm when backing is provably low, only sentinels can trip, a soft trip expires, and release needs restored backing.

---

## Honest Trust Model and Risks

- Where the backing lives on this chain (the Gateway's own balance), the check is **trustless and fully on-chain**.
- For assets whose reserves live on another chain, the design relies on **Sentinel attestation**, which is a trust assumption, not a trustless proof. It is bonded and limited by the live `AgentRegistry`, but reading another chain's reserves is not built: the Sentinel today only reads the on-chain `BackingMonitor`.
- **Unaudited prototype.** No liquidity, no audits, no battle-testing, and price-oracle coverage is intentionally out of scope.
- **Withdrawal under stress:** the Gateway pays withdrawals first-come-first-served when the reserve is short, so under-backing creates a run, which is exactly what the breaker and borrow check exist to contain.
- **Rounding dust:** repayments round a wei or so between per-user debt and `totalBorrows`. Lender exits tolerate dust up to `totalSupplied / 1e12 + 1000` wei so the last lender can leave.
- **Testnet deposits:** contract code deposits on this chain are large. I haven't verified whether they are refundable via `removeCode`.
- **Token value:** testnet tPOT has no value. The mainnet POT token trades thinly, so the POT half of any prize is hard to value.

---

## Dependencies and Licences

| Dependency | Use | Licence |
|---|---|---|
| OpenZeppelin Contracts 5.x | `Ownable`, `ReentrancyGuard`, `SafeERC20`, `IERC20` | MIT |
| Hardhat and hardhat-toolbox | Build, test, deploy | MIT |
| Next.js, React, Tailwind CSS | Frontend | MIT |

The frontend's look is adapted from a public, MIT-licensed design-system extraction of aave.com. The layout and tokens are adapted, not copied, and no Aave assets, logo or branding are used. Core code was written during the build window (Oct 14 to Nov 6, 2026).

---

## Acknowledgements

- [Portaldot](https://portaldot.world/) for the V3 testnet and the Hacker House
- [OpenZeppelin](https://openzeppelin.com/) for audited contract building blocks
- [Parity](https://parity.io/) for `pallet-revive` and the Polkadot SDK
- Reporting by [Unchained](https://unchainedcrypto.com/) and [CoinDesk](https://www.coindesk.com/) on the KelpDAO / Aave incident

---

## License

MIT
