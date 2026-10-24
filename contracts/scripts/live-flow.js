// Real end-to-end run against the deployed contracts on Portaldot V3 testnet.
//
//   DRY_RUN=1 npx hardhat run scripts/live-flow.js --network portaldot   # read-only, prints current state
//   npx hardhat run scripts/live-flow.js --network portaldot             # sends real transactions
//
// Flow: supply lender liquidity -> mint bPOT -> post it as collateral -> wait out seasoning ->
// borrow tPOT (the backing check runs inside this transaction) -> repay.
// Every tx hash is appended to deployments/<network>.json under `liveFlow` so the submission can cite them.
const fs = require("fs");
const path = require("path");
const { ethers, network } = require("hardhat");

const E = (n) => ethers.parseEther(String(n));
const f = (w, d = 4) => Number(ethers.formatEther(w)).toLocaleString("en-US", { maximumFractionDigits: d });

// Small amounts: this is a demonstration, and every byte of state costs a deposit on this chain.
const SUPPLY = E(20); // lender liquidity so there is something to borrow
const MINT = E(10); // tPOT locked for bPOT
const COLLATERAL = E(10); // bPOT posted as collateral
const BORROW = E(5); // under the 70% LTV on 10 bPOT

async function main() {
  const dry = process.env.DRY_RUN === "1";
  const file = path.join(__dirname, "..", "deployments", `${network.name}.json`);
  const out = JSON.parse(fs.readFileSync(file, "utf8"));
  const c = out.contracts;
  for (const k of ["Gateway", "BPOT", "BackingMonitor", "LendingMarket", "CircuitBreaker"])
    if (!c[k]) throw new Error(`${k} missing from ${file}`);

  const provider = ethers.provider;
  const gateway = await ethers.getContractAt("Gateway", c.Gateway);
  const token = await ethers.getContractAt("BPOT", c.BPOT);
  const monitor = await ethers.getContractAt("BackingMonitor", c.BackingMonitor);
  const market = await ethers.getContractAt("LendingMarket", c.LendingMarket);
  const breaker = await ethers.getContractAt("CircuitBreaker", c.CircuitBreaker);

  const [signer] = await ethers.getSigners();
  const who = signer ? signer.address : out.deployer;

  const seasoning = (await market.params()).seasoningBlocks;
  const state = async (label) => {
    const [ratio, reserves, supply, col, seasoned, debt, maxB, block] = await Promise.all([
      monitor.ratioBps(), monitor.reserves(), monitor.supply(),
      market.collateralOf(who), market.seasonedCollateralOf(who), market.debtOf(who),
      market.maxBorrowOf(who), provider.getBlockNumber(),
    ]);
    console.log(`\n── ${label} (block ${block}) ──`);
    console.log(`  backing ${Number(ratio) / 100}%   reserve ${f(reserves)} tPOT   bPOT supply ${f(supply)}`);
    console.log(`  your collateral ${f(col)} bPOT (seasoned ${f(seasoned)})   debt ${f(debt)} tPOT   borrowable now ${f(maxB)} tPOT`);
  };

  console.log(`DotProof live flow on ${network.name} (chain ${(await provider.getNetwork()).chainId})`);
  console.log(`  LendingMarket ${c.LendingMarket}`);
  console.log(`  account       ${who}`);
  console.log(`  paused: ${await breaker.isPaused()}   seasoning: ${seasoning} blocks`);
  await state("Current state");
  if (dry) {
    console.log("\n(dry run: nothing sent)");
    return;
  }

  if (!signer) throw new Error("No signer. Put DEPLOYER_KEY in the repo-root .env.");
  const start = await provider.getBalance(who);
  console.log(`\n  balance ${f(start, 2)} tPOT`);

  out.liveFlow = out.liveFlow || {};
  const save = () => fs.writeFileSync(file, JSON.stringify(out, null, 2));
  const send = async (name, promise) => {
    const tx = await promise;
    const r = await tx.wait();
    out.liveFlow[name] = tx.hash;
    save();
    console.log(`  ${name.padEnd(18)} tx ${tx.hash}  block ${r.blockNumber}`);
    return r;
  };

  console.log("\n1. Supply lender liquidity");
  await send("supply", market.supply({ value: SUPPLY }));

  console.log("2. Lock tPOT in the Gateway, receive bPOT 1:1");
  await send("mint", gateway.deposit({ value: MINT }));

  console.log("3. Approve and post bPOT as collateral");
  await send("approve", token.approve(c.LendingMarket, COLLATERAL));
  await send("depositCollateral", market.depositCollateral(COLLATERAL));
  await state("After depositing collateral");

  console.log(`\n4. Prove seasoning: borrowing now must revert (collateral is ${seasoning} blocks from maturity)`);
  try {
    await market.borrow.staticCall(E(1));
    console.log("  unexpected: the borrow would have succeeded");
  } catch (e) {
    const r = e.revert ?? (e.data ? market.interface.parseError(e.data) : null);
    console.log(`  reverted with ${r ? `${r.name}(${(r.args || []).join(", ")})` : e.shortMessage || e.message}  <- seasoning holds`);
  }

  console.log(`\n5. Wait for ${seasoning} blocks`);
  const target = (await provider.getBlockNumber()) + Number(seasoning);
  while ((await provider.getBlockNumber()) < target) {
    process.stdout.write(`  block ${await provider.getBlockNumber()} / ${target}\r`);
    await new Promise((r) => setTimeout(r, 4000));
  }
  console.log(`  block ${await provider.getBlockNumber()} / ${target}  collateral is seasoned   `);

  console.log("\n6. Borrow (the backing check runs inside this transaction)");
  const r = await send("borrow", market.borrow(BORROW));
  const ev = r.logs.map((l) => { try { return market.interface.parseLog(l); } catch { return null; } }).find((x) => x?.name === "Borrowed");
  if (ev) console.log(`  Borrowed event: amount ${f(ev.args.amount)} tPOT, backing checked at ${Number(ev.args.ratioBps) / 100}%`);
  await state("After borrowing");

  console.log("\n7. Repay in full");
  const debt = await market.debtOf(who);
  await send("repay", market.repay({ value: debt + E(0.01) })); // small buffer for interest, refunded
  await state("After repaying");

  out.liveFlow.completedAt = new Date().toISOString();
  save();
  console.log(`\nDone. Spent ${f(start - (await provider.getBalance(who)), 3)} tPOT. Hashes saved to deployments/${network.name}.json`);
}

main().catch((e) => { console.error(e); process.exit(1); });
