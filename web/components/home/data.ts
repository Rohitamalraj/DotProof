// Every item here is a real fact from this project: a transaction on the Portaldot V3 testnet, a result from the
// test suite, or an entry from contracts/deployments/portaldot.json. Nothing is simulated or invented.

export type Tone = "ok" | "bad" | "info";
export interface EventCard {
  tag: string; // where it came from
  title: string;
  meta: string;
  tone: Tone;
  stamp?: "BACKED" | "REFUSED" | "SLASHED" | "PAID";
}

/** Real transactions from the live borrow flow (contracts/scripts/live-flow.js) and deployments. */
export const chainEvents: EventCard[] = [
  { tag: "TESTNET", title: "Supply 20 tPOT", meta: "block 171671 · 0x23f7…b573", tone: "info" },
  { tag: "TESTNET", title: "Mint 10 bPOT, one to one", meta: "block 171672 · 0x595a…8871", tone: "info" },
  { tag: "TESTNET", title: "Post bPOT as collateral", meta: "block 171674 · 0x94d8…e986", tone: "info" },
  { tag: "SIMULATED CALL", title: "Borrow right away", meta: "ExceedsBorrowLimit: still seasoning", tone: "bad", stamp: "REFUSED" },
  { tag: "TESTNET", title: "Borrow 5 tPOT", meta: "backing 100% · block 171795 · 0x831f…c594", tone: "ok", stamp: "BACKED" },
  { tag: "TESTNET", title: "Repay in full", meta: "block 171798 · 0xbef9…ea6d", tone: "ok" },
  { tag: "TESTNET", title: "Deploy LendingMarket", meta: "block 171634 · 0x363d…d55e", tone: "info" },
];

/** Results from the test suite (local chain; the same Solidity as the deployment). */
export const testEvents: EventCard[] = [
  { tag: "LOCAL TEST", title: "Forge 1,000 unbacked bPOT", meta: "backing falls to 9.09%", tone: "bad" },
  { tag: "LOCAL TEST", title: "Attacker tries to borrow", meta: "BackingBelowThreshold(909)", tone: "bad", stamp: "REFUSED" },
  { tag: "LOCAL TEST", title: "Sentinel trips the breaker", meta: "only that market pauses", tone: "info" },
  { tag: "LOCAL TEST", title: "A true alarm", meta: "Sentinel earns 1 tPOT. No admin decides", tone: "ok", stamp: "PAID" },
  { tag: "LOCAL TEST", title: "A false alarm", meta: "20% of the bond goes to the Backstop", tone: "bad", stamp: "SLASHED" },
  { tag: "LOCAL TEST", title: "Liquidation", meta: "5% bonus, bad debt hits the Backstop first", tone: "info" },
  { tag: "LOCAL TEST", title: "Backing restored", meta: "the pause lifts. There is no unpause key", tone: "ok" },
];

export const contracts = [
  { name: "Gateway", address: "0x619cA0F74Bbe92CaE32CA72920CbA0ff0E5aF370" },
  { name: "bPOT", address: "0xF8191413d53B750cE2F0BFc44722c0EBF0bF95A1" },
  { name: "BackingMonitor", address: "0x60A22c14e7c3353d5B26843c8eA1cFF5D12Ef589" },
  { name: "Backstop", address: "0xB57969CE443DBDF2F41e67408A77e5311b548187" },
  { name: "AgentRegistry", address: "0x95ccEd224908A20D7B4A7d684CbC9ACd4b0E2177" },
  { name: "CircuitBreaker", address: "0xfa5DC13B034A66a206e06CCd5e6F9e0Aaee9cBE4" },
  { name: "LendingMarket", address: "0x7e3444c1f9dbD53dEA5ebc8160522b154857566b" },
];

/** The two agents actually registered in the live AgentRegistry (public addresses and bonds). */
export const agents = [
  {
    role: "Sentinel",
    address: "0xeEc862Eb96c212a8F788121Ca36176070382F2e4",
    bond: "10 tPOT",
    job: "Reads the backing ratio. Can pause one market, never unpause.",
    earns: "A true alarm pays 1 tPOT. A false alarm costs 20% of its bond.",
  },
  {
    role: "Keeper",
    address: "0x5D46053e2EA5d66D1f315895BE3a0B685E6e5bA9",
    bond: "5 tPOT",
    job: "Finds unhealthy loans and liquidates them. That is all it can do.",
    earns: "Keeps the 5% liquidation bonus.",
  },
];

export const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;
