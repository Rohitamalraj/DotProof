// PLACEHOLDER DATA ONLY. Every value here is static UI filler until the
// frontend is wired to the Portaldot V3 testnet contracts (chain 420420777).
// Keep it isolated in this file so it is easy to replace with real RPC reads.

export type MarketStatus = "active" | "paused" | "seasoning";

export interface Market {
  id: string;
  name: string;
  tag: string;
  blurb: string;
  collateral: string;
  borrow: string;
  backing: number; // reserve / supply, percent
  supplyApy: number;
  borrowApy: number;
  utilization: number;
  tvl: string;
  supplyCap: string;
  borrowCap: string;
  ltv: number;
  liqThreshold: number;
  seasoningBlocks: number;
  status: MarketStatus;
  chips: string[];
}

export const markets: Market[] = [
  {
    id: "bpot-core",
    name: "bPOT Core",
    tag: "Collateral-Isolated",
    blurb:
      "Deposit bPOT and borrow tPOT. Every borrow is checked against live reserves in the same transaction.",
    collateral: "bPOT",
    borrow: "tPOT",
    backing: 100,
    supplyApy: 3.42,
    borrowApy: 5.1,
    utilization: 41.6,
    tvl: "—",
    supplyCap: "1,000,000 bPOT",
    borrowCap: "400,000 tPOT",
    ltv: 70,
    liqThreshold: 80,
    seasoningBlocks: 120,
    status: "active",
    chips: ["bPOT", "tPOT"],
  },
  {
    id: "wbridge",
    name: "Bridged Asset",
    tag: "Agent-Attested",
    blurb:
      "For assets whose reserves live on another chain. Sentinel agents compare source-chain reserves during seasoning.",
    collateral: "xAsset",
    borrow: "tPOT",
    backing: 100,
    supplyApy: 2.1,
    borrowApy: 4.4,
    utilization: 18.2,
    tvl: "—",
    supplyCap: "250,000 xAsset",
    borrowCap: "100,000 tPOT",
    ltv: 55,
    liqThreshold: 68,
    seasoningBlocks: 600,
    status: "seasoning",
    chips: ["xAsset", "tPOT"],
  },
  {
    id: "fixture",
    name: "Exploit Fixture",
    tag: "Demo Only",
    blurb:
      "A deliberately weak mint path that reproduces the KelpDAO failure so the circuit breaker has something to catch.",
    collateral: "fbPOT",
    borrow: "tPOT",
    backing: 61.4,
    supplyApy: 0,
    borrowApy: 0,
    utilization: 0,
    tvl: "—",
    supplyCap: "10,000 fbPOT",
    borrowCap: "4,000 tPOT",
    ltv: 0,
    liqThreshold: 0,
    seasoningBlocks: 120,
    status: "paused",
    chips: ["fbPOT", "tPOT"],
  },
];

// Facts about this repo, not simulated protocol data.
export const protocolStats = [
  { label: "Contracts live on testnet", value: "3" },
  { label: "Tests passing", value: "38" },
  { label: "Backing check per borrow", value: "1 tx" },
];

export type AgentRole = "Sentinel" | "Keeper" | "Guardian";

export const agents = [
  { id: "sentinel-01", role: "Sentinel" as AgentRole, address: "0x71C3…a9E2", bond: "250 tPOT", reward: "12.4 tPOT", slashes: 0, actions: 14, status: "Online" },
  { id: "sentinel-02", role: "Sentinel" as AgentRole, address: "0x2bF0…41d8", bond: "250 tPOT", reward: "9.1 tPOT", slashes: 0, actions: 11, status: "Online" },
  { id: "keeper-01", role: "Keeper" as AgentRole, address: "0xD04a…7c15", bond: "100 tPOT", reward: "3.8 tPOT", slashes: 0, actions: 6, status: "Online" },
  { id: "keeper-02", role: "Keeper" as AgentRole, address: "0x9E12…b630", bond: "100 tPOT", reward: "1.2 tPOT", slashes: 1, actions: 3, status: "Idle" },
  { id: "guardian-01", role: "Guardian" as AgentRole, address: "0x58aC…02F9", bond: "75 tPOT", reward: "0.4 tPOT", slashes: 0, actions: 2, status: "Stretch" },
];

export const rolePermissions = [
  { role: "Sentinel", job: "Reads real source-chain reserves and mint/borrow patterns, flags danger", can: "Pause one market, lower caps, post incident reports", cannot: "Unpause, raise caps, move funds", slashed: "It raises false alarms" },
  { role: "Keeper", job: "Liquidates unhealthy loans. Permissionless, anyone can run one", can: "Liquidate", cannot: "Anything else", slashed: "It acts outside its limits" },
  { role: "Guardian", job: "Protects a user's position within their allowance", can: "Spend up to the user's allowance", cannot: "Exceed it or touch other accounts", slashed: "It overspends" },
];

export const activity = [
  { t: "2m ago", who: "sentinel-01", what: "Backing check passed on bPOT Core", hash: "0x4f1c…e07a", tone: "ok" },
  { t: "9m ago", who: "keeper-01", what: "Liquidated position 0x3a…91 (health 0.97)", hash: "0xa82d…13bc", tone: "ok" },
  { t: "31m ago", who: "sentinel-02", what: "Paused Exploit Fixture: reserves 61.4% of supply", hash: "0x07de…c5f1", tone: "danger" },
  { t: "31m ago", who: "contract", what: "Borrow reverted: BackingBelowThreshold", hash: "0x6c90…2aa4", tone: "danger" },
  { t: "1h ago", who: "sentinel-01", what: "Seasoning window cleared for 3 deposits", hash: "0xe1b3…0d77", tone: "ok" },
];

export const incidentStats = [
  { v: "$292M", l: "Stolen in the KelpDAO bridge exploit", s: "Unchained, Apr 18 2026" },
  { v: "116,500", l: "Unbacked rsETH released by a forged message", s: "CoinDesk" },
  { v: "~$190M", l: "WETH and wstETH borrowed against it", s: "Unchained" },
  { v: "100%", l: "WETH pool utilization after the run", s: "Unchained" },
];

export const footerCols = [
  { h: "Protocol", l: ["Markets", "Launch App", "Agents", "BackingMonitor", "Backstop"] },
  { h: "Developers", l: ["Documentation", "Contracts", "GitHub", "Testnet Explorer", "Faucet"] },
  { h: "Resources", l: ["Litepaper", "Security", "Incident Analysis", "FAQs", "Pitch Deck"] },
  { h: "Project", l: ["About", "Roadmap", "Contact", "Discord"] },
];

export const network = {
  name: "Portaldot V3 Testnet",
  chainId: 420420777,
  rpc: "https://test-evm-rpc-v3.portaldot.dev",
  explorer: "https://node-console.portaldot.dev/",
};
