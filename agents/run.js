#!/usr/bin/env node
// Runs a Sentinel or Keeper against Portaldot V3 testnet.
//
//   node run.js sentinel            # loops every POLL_SECONDS (default 15)
//   node run.js keeper --once       # one pass, then exit
//
// Keys are read from the git-ignored .env at the repo root (never printed):
//   SENTINEL_KEY=...   KEEPER_KEY=...   (use throwaway testnet-only wallets)
// Contract addresses come from contracts/deployments/portaldot.json and must include the market,
// breaker and registry, which are deployed in the second phase.
const fs = require("fs");
const path = require("path");
const { ethers } = require("ethers");

try { process.loadEnvFile(path.join(__dirname, "..", ".env")); } catch { /* use the shell environment */ }

const role = process.argv[2];
const once = process.argv.includes("--once");
const RPC = process.env.PORTALDOT_RPC || "https://test-evm-rpc-v3.portaldot.dev";
const POLL = Number(process.env.POLL_SECONDS || 15) * 1000;
const stamp = () => new Date().toISOString().slice(11, 19);
const log = (m) => console.log(`[${stamp()}] [${role}] ${m}`);

const ABIS = {
  monitor: ["function ratioBps() view returns (uint256)"],
  breaker: [
    "function confirmed() view returns (bool)",
    "function tripPending() view returns (bool)",
    "function pausedUntil() view returns (uint256)",
    "function trip(string reason)",
    "function confirm()",
    "function settleExpired()",
    "function release()",
  ],
  registry: ["function isActive(address agent, uint8 role) view returns (bool)"],
  market: [
    "event Borrowed(address indexed user, uint256 amount, uint256 ratioBps)",
    "function debtOf(address) view returns (uint256)",
    "function healthFactor(address) view returns (uint256)",
    "function liquidate(address user) payable",
  ],
};

async function main() {
  if (!["sentinel", "keeper"].includes(role)) throw new Error("usage: node run.js <sentinel|keeper> [--once]");
  const file = path.join(__dirname, "..", "contracts", "deployments", "portaldot.json");
  const c = JSON.parse(fs.readFileSync(file, "utf8")).contracts;
  const need = role === "sentinel" ? ["BackingMonitor", "CircuitBreaker", "AgentRegistry"] : ["LendingMarket"];
  const missing = need.filter((n) => !c[n]);
  if (missing.length) {
    console.error(`Not deployed yet: ${missing.join(", ")}. See contracts/deployments/portaldot.json.`);
    console.error("The second-phase contracts need more testnet tPOT for code deposits.");
    process.exit(2);
  }
  const keyName = role === "sentinel" ? "SENTINEL_KEY" : "KEEPER_KEY";
  const raw = (process.env[keyName] || "").trim();
  if (!raw) throw new Error(`${keyName} is not set in .env`);
  const provider = new ethers.JsonRpcProvider(RPC);
  const wallet = new ethers.Wallet(raw.startsWith("0x") ? raw : "0x" + raw, provider);
  log(`running as ${wallet.address}`);

  let step;
  if (role === "sentinel") {
    const { tick } = require("./src/sentinel");
    const ctx = {
      monitor: new ethers.Contract(c.BackingMonitor, ABIS.monitor, wallet),
      breaker: new ethers.Contract(c.CircuitBreaker, ABIS.breaker, wallet),
      registry: new ethers.Contract(c.AgentRegistry, ABIS.registry, wallet),
      address: wallet.address,
      thresholdBps: Number(process.env.THRESHOLD_BPS || 9950),
      now: async () => (await provider.getBlock("latest")).timestamp,
      log,
    };
    step = () => tick(ctx);
  } else {
    const { tick } = require("./src/keeper");
    const ctx = {
      market: new ethers.Contract(c.LendingMarket, ABIS.market, wallet),
      signerAddress: wallet.address,
      getBalance: (a) => provider.getBalance(a),
      getBlockNumber: () => provider.getBlockNumber(),
      state: { users: new Set(), fromBlock: Number(process.env.START_BLOCK || 0) },
      log,
    };
    step = () => tick(ctx);
  }

  do {
    try { await step(); } catch (e) { log(`error: ${e.shortMessage || e.message}`); }
    if (once) break;
    await new Promise((r) => setTimeout(r, POLL));
  } while (true);
}

main().catch((e) => { console.error(e.message); process.exit(1); });
