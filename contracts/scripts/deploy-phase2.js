// Phase 2: the rest of the protocol, wired to the phase-1 Gateway / bPOT / BackingMonitor already on-chain.
// Deploys Backstop, AgentRegistry, CircuitBreaker, LendingMarket, then wires them together.
//
//   DRY_RUN=1 npx hardhat run scripts/deploy-phase2.js --network portaldot   # estimate, sends nothing
//   npx hardhat run scripts/deploy-phase2.js --network portaldot             # real run (key from repo-root .env)
//
// Code on Portaldot V3 carries a storage deposit of about 0.06 tPOT per byte, so this needs a funded wallet.
const fs = require("fs");
const path = require("path");
const { ethers, network } = require("hardhat");

const WALLET = "0xba8212D81868EB497FF67263761B774EFC413179";
const E = (n) => ethers.parseEther(String(n));
const fmt = (w) => ethers.formatEther(w);

const MARKET_PARAMS = {
  ltvBps: 7000,
  liqThresholdBps: 8000,
  tightenedLiqThresholdBps: 6000,
  liqBonusBps: 500,
  seasoningBlocks: 120,
  minBackingBps: 9950,
  supplyCap: E(1_000_000),
  borrowCap: E(400_000),
  collateralCap: E(1_000_000),
  baseRateBps: 200,
  slopeBps: 1000,
  reserveFactorBps: 1000,
};
// Registry economics (proposals, tune freely): minimum bonds, 20% slash per false alarm, reward per true alarm.
const REGISTRY = { sentinelMin: E(10), keeperMin: E(5), guardianMin: E(2), slashBps: 2000, reward: E(1), unbond: 7 * 24 * 3600 };

async function main() {
  const dry = process.env.DRY_RUN === "1";
  const file = path.join(__dirname, "..", "deployments", `${network.name}.json`);
  const out = JSON.parse(fs.readFileSync(file, "utf8"));
  const c = out.contracts;
  for (const k of ["BPOT", "BackingMonitor"]) if (!c[k]) throw new Error(`${k} missing from ${file}. Run deploy-slice.js first.`);

  const provider = ethers.provider;
  const gasPrice = (await provider.getFeeData()).gasPrice;
  const F = (n) => ethers.getContractFactory(n);
  const zero = ethers.ZeroAddress;

  if (dry) {
    console.log("DRY RUN from", WALLET, "balance", fmt(await provider.getBalance(WALLET)), "tPOT");
    let total = 0n;
    const plan = [
      ["Backstop", await F("Backstop"), [WALLET]],
      ["AgentRegistry", await F("AgentRegistry"), [WALLET, zero, REGISTRY.sentinelMin, REGISTRY.keeperMin, REGISTRY.guardianMin, REGISTRY.slashBps, REGISTRY.reward, REGISTRY.unbond]],
      ["CircuitBreaker", await F("CircuitBreaker"), [c.BackingMonitor, 9950, 3600, zero]],
      ["LendingMarket", await F("LendingMarket"), [c.BPOT, c.BackingMonitor, zero, zero, MARKET_PARAMS]],
    ];
    for (const [name, f, args] of plan) {
      const tx = await f.getDeployTransaction(...args);
      try {
        const gas = await provider.estimateGas({ from: WALLET, data: tx.data });
        total += gas * gasPrice;
        console.log(`${name.padEnd(15)} ~ ${fmt(gas * gasPrice)} tPOT`);
      } catch (e) {
        console.log(`${name.padEnd(15)} estimate failed: ${e.shortMessage || e.message}`);
      }
    }
    console.log(`Estimated total ~ ${fmt(total)} tPOT, plus a few tPOT for the wiring transactions and agent bonds`);
    return;
  }

  const [deployer] = await ethers.getSigners();
  if (!deployer) throw new Error("No signer. Put DEPLOYER_KEY in the repo-root .env.");
  if (deployer.address.toLowerCase() !== WALLET.toLowerCase()) throw new Error(`Key belongs to ${deployer.address}, expected ${WALLET}.`);
  out.txs = out.txs || {};
  const start = await provider.getBalance(deployer.address);
  console.log("Deployer", deployer.address, "balance", fmt(start), "tPOT");

  const save = () => fs.writeFileSync(file, JSON.stringify(out, null, 2));
  const deploy = async (name, ...args) => {
    const before = await provider.getBalance(deployer.address);
    const k = await (await F(name)).deploy(...args);
    await k.waitForDeployment();
    c[name] = await k.getAddress();
    out.txs[name] = k.deploymentTransaction().hash;
    save();
    console.log(`${name.padEnd(15)} ${c[name]}  tx ${out.txs[name]}  cost ${fmt(before - (await provider.getBalance(deployer.address)))} tPOT`);
    return k;
  };

  const backstop = await deploy("Backstop", deployer.address);
  const registry = await deploy("AgentRegistry", deployer.address, c.Backstop, REGISTRY.sentinelMin, REGISTRY.keeperMin, REGISTRY.guardianMin, REGISTRY.slashBps, REGISTRY.reward, REGISTRY.unbond);
  const breaker = await deploy("CircuitBreaker", c.BackingMonitor, 9950, 3600, c.AgentRegistry);
  const market = await deploy("LendingMarket", c.BPOT, c.BackingMonitor, c.CircuitBreaker, c.Backstop, MARKET_PARAMS);

  console.log("Wiring: registry authority = breaker, backstop market = LendingMarket");
  await (await registry.setAuthority(c.CircuitBreaker, true)).wait();
  await (await backstop.registerMarket(c.LendingMarket)).wait();
  out.phase2 = { deployedAt: new Date().toISOString(), wired: true };
  save();
  console.log("Saved", path.relative(process.cwd(), file), "- total spent", fmt(start - (await provider.getBalance(deployer.address))), "tPOT");
}

main().catch((e) => { console.error(e); process.exit(1); });
