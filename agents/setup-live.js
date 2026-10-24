#!/usr/bin/env node
// One-time setup of the Sentinel and Keeper wallets on Portaldot V3 testnet. Idempotent.
//
//   node setup-live.js            # real run
//   node setup-live.js --dry      # show what it would do, send nothing
//
// - Generates a fresh testnet-only key for each agent if SENTINEL_KEY / KEEPER_KEY are missing from the
//   repo-root .env, and appends them there (the file is git-ignored). Keys are NEVER printed.
// - Tops each agent wallet up from the deployer (DEPLOYER_KEY) so it can pay gas and post its bond.
// - Registers each agent in the live AgentRegistry with its role bond.
const fs = require("fs");
const path = require("path");
const { ethers } = require("ethers");

const ENV = path.join(__dirname, "..", ".env");
try { process.loadEnvFile(ENV); } catch { /* handled below */ }

const dry = process.argv.includes("--dry");
const RPC = process.env.PORTALDOT_RPC || "https://test-evm-rpc-v3.portaldot.dev";
const E = (n) => ethers.parseEther(String(n));
const f = (w) => Number(ethers.formatEther(w)).toLocaleString("en-US", { maximumFractionDigits: 4 });

// Funding covers the bond plus gas and the one-time storage deposits for new account entries.
const AGENTS = [
  { name: "sentinel", env: "SENTINEL_KEY", role: 1, bond: E(10), fund: E(40) },
  { name: "keeper", env: "KEEPER_KEY", role: 2, bond: E(5), fund: E(25) },
];
const REGISTRY_ABI = [
  "function register(uint8 role) payable",
  "function isActive(address agent, uint8 role) view returns (bool)",
  "function agents(address) view returns (uint8 role, uint256 bond, uint64 unbondAt, uint32 confirmedAlarms, uint32 falseAlarms, uint256 earned, uint256 slashed)",
];

function ensureKey(name) {
  const cur = (process.env[name] || "").trim();
  if (cur) return cur.startsWith("0x") ? cur : "0x" + cur;
  const w = ethers.Wallet.createRandom();
  if (!dry) {
    let text = fs.existsSync(ENV) ? fs.readFileSync(ENV, "utf8") : "";
    if (text && !text.endsWith("\n")) text += "\n";
    fs.writeFileSync(ENV, text + `${name}=${w.privateKey.slice(2)}\n`);
    process.env[name] = w.privateKey.slice(2);
  }
  return w.privateKey;
}

async function main() {
  const dep = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "contracts", "deployments", "portaldot.json"), "utf8"));
  if (!dep.contracts.AgentRegistry) throw new Error("AgentRegistry is not deployed");
  const provider = new ethers.JsonRpcProvider(RPC);
  const dk = (process.env.DEPLOYER_KEY || "").trim();
  if (!dk) throw new Error("DEPLOYER_KEY missing from .env");
  const deployer = new ethers.Wallet(dk.startsWith("0x") ? dk : "0x" + dk, provider);
  if (deployer.address.toLowerCase() !== dep.deployer.toLowerCase()) throw new Error("DEPLOYER_KEY does not match the deployer in deployments/portaldot.json");
  console.log(`${dry ? "DRY RUN. " : ""}Deployer ${deployer.address} balance ${f(await provider.getBalance(deployer.address))} tPOT`);

  const out = { agents: {} };
  for (const a of AGENTS) {
    const had = !!(process.env[a.env] || "").trim();
    const key = ensureKey(a.name === "sentinel" ? "SENTINEL_KEY" : "KEEPER_KEY");
    const wallet = new ethers.Wallet(key, provider);
    console.log(`\n${a.name}: ${wallet.address}  (${had ? "key already in .env" : dry ? "would generate a new key" : "new key saved to .env"})`);
    out.agents[a.name] = wallet.address;

    const registry = new ethers.Contract(dep.contracts.AgentRegistry, REGISTRY_ABI, wallet);
    if (await registry.isActive(wallet.address, a.role)) {
      console.log("  already registered and active");
      continue;
    }
    const bal = await provider.getBalance(wallet.address);
    if (bal < a.fund) {
      const need = a.fund - bal;
      console.log(`  funding ${f(need)} tPOT from the deployer`);
      if (!dry) await (await deployer.sendTransaction({ to: wallet.address, value: need })).wait();
    } else console.log(`  balance ${f(bal)} tPOT, no funding needed`);
    console.log(`  registering with a ${f(a.bond)} tPOT bond`);
    if (!dry) {
      const tx = await registry.register(a.role, { value: a.bond });
      await tx.wait();
      out.agents[a.name + "RegisterTx"] = tx.hash;
      console.log(`  register tx ${tx.hash}`);
    }
  }

  if (!dry) {
    const file = path.join(__dirname, "..", "contracts", "deployments", "portaldot.json");
    const d = JSON.parse(fs.readFileSync(file, "utf8"));
    d.agents = { ...(d.agents || {}), ...out.agents }; // public addresses and tx hashes only, never keys
    fs.writeFileSync(file, JSON.stringify(d, null, 2));
    for (const a of AGENTS) {
      const w = new ethers.Wallet(process.env[a.env].startsWith("0x") ? process.env[a.env] : "0x" + process.env[a.env]);
      const reg = new ethers.Contract(dep.contracts.AgentRegistry, REGISTRY_ABI, provider);
      const s = await reg.agents(w.address);
      console.log(`\n${a.name} on-chain: role ${s.role}, bond ${f(s.bond)} tPOT, active ${await reg.isActive(w.address, a.role)}`);
    }
  }
  console.log(dry ? "\n(dry run: nothing sent, no key written)" : "\nDone. Keys are in the git-ignored .env only.");
}

main().catch((e) => { console.error(e.shortMessage || e.message); process.exit(1); });
