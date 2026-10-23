// End-to-end demo of the whole DotProof story on a local chain (no testnet tokens needed).
//
//   npx hardhat run scripts/demo-e2e.js
//
// Two isolated markets run side by side. One is healthy; the other uses the WeakGateway exploit
// reproduction fixture (NOT a production bridge) so an unbacked mint can happen. Watch the borrow-time
// check stop the attacker, the Sentinel bot pause only that market and get paid, and the other market
// carry on. If GROQ_API_KEY is in the repo-root .env the Sentinel also asks its LLM advisor to write the
// incident reason; without a key it runs on rules alone.
const { ethers } = require("hardhat");
const { mine, time, setBalance } = require("@nomicfoundation/hardhat-network-helpers");
const sentinelBot = require("../../agents/src/sentinel");
const { createAdvisor } = require("../../agents/src/advisor");

const E = (n) => ethers.parseEther(String(n));
const f = (w, d = 2) => Number(ethers.formatEther(w)).toLocaleString("en-US", { maximumFractionDigits: d });
const pct = (bps) => (Number(bps) / 100).toFixed(2) + "%";
const c = { g: (s) => `\x1b[32m${s}\x1b[0m`, r: (s) => `\x1b[31m${s}\x1b[0m`, y: (s) => `\x1b[33m${s}\x1b[0m`, b: (s) => `\x1b[1m${s}\x1b[0m`, d: (s) => `\x1b[2m${s}\x1b[0m` };
const ok = (m) => console.log("  " + c.g("✔ ") + m);
const bad = (m) => console.log("  " + c.r("✖ ") + m);
const say = (m) => console.log("  " + m);
const act = (t) => console.log("\n" + c.b(`━━ ${t} ━━`));

const PARAMS = {
  ltvBps: 7000, liqThresholdBps: 8000, tightenedLiqThresholdBps: 6000, liqBonusBps: 500, seasoningBlocks: 5,
  minBackingBps: 9950, supplyCap: E(1_000_000), borrowCap: E(400_000), collateralCap: E(1_000_000),
  baseRateBps: 200, slopeBps: 1000, reserveFactorBps: 1000,
};

async function system(owner, attacker, weak) {
  const G = await ethers.getContractFactory(weak ? "WeakGateway" : "Gateway");
  const gateway = weak ? await G.deploy(attacker.address) : await G.deploy();
  const token = await ethers.getContractAt("BPOT", await gateway.token());
  const monitor = await (await ethers.getContractFactory("BackingMonitor")).deploy(await token.getAddress(), await gateway.reserve());
  const backstop = await (await ethers.getContractFactory("Backstop")).deploy(owner.address);
  const registry = await (await ethers.getContractFactory("AgentRegistry")).deploy(owner.address, await backstop.getAddress(), E(10), E(5), E(2), 2000, E(1), 7 * 86400);
  const breaker = await (await ethers.getContractFactory("CircuitBreaker")).deploy(await monitor.getAddress(), 9950, 3600, await registry.getAddress());
  await registry.setAuthority(await breaker.getAddress(), true);
  const market = await (await ethers.getContractFactory("LendingMarket")).deploy(
    await token.getAddress(), await monitor.getAddress(), await breaker.getAddress(), await backstop.getAddress(), PARAMS);
  await backstop.registerMarket(await market.getAddress());
  return { gateway, token, monitor, backstop, registry, breaker, market };
}

async function deposit(sys, user, amount) {
  await sys.gateway.connect(user).deposit({ value: E(amount) });
  await sys.token.connect(user).approve(await sys.market.getAddress(), E(amount));
  await sys.market.connect(user).depositCollateral(E(amount));
}

async function revertName(p, market) {
  try { await p; return null; }
  catch (e) {
    const r = e.revert || (e.data && market.interface.parseError(e.data));
    return r ? `${r.name}(${(r.args || []).join(", ")})` : (e.shortMessage || e.message);
  }
}

async function main() {
  const [owner, lender, alice, attacker, sentinel, keeper, bob] = await ethers.getSigners();
  console.log(c.b("\nDotProof end-to-end demo") + c.d("  (local chain, same contracts as the testnet slice)"));

  act("Setup: two isolated markets");
  const good = await system(owner, attacker, false);
  const weak = await system(owner, attacker, true);
  for (const s of [good, weak]) {
    await s.market.connect(lender).supply({ value: E(1000) });
    await s.registry.fundRewards({ value: E(5) });
    await s.registry.connect(sentinel).register(1, { value: E(10) });
  }
  ok("bPOT Core (healthy)            deployed, 1,000 tPOT of lender liquidity");
  ok("Exploit Fixture (weak mint)    deployed, 1,000 tPOT of lender liquidity");
  ok(`Sentinel registered in both markets with a ${f(E(10))} tPOT bond, reward pool funded`);

  act("Act 1: an honest user");
  await deposit(good, alice, 100);
  say(`Alice mints 100 bPOT and deposits it as collateral. Backing: ${pct(await good.monitor.ratioBps())}`);
  const early = await revertName(good.market.connect(alice).borrow(E(50)), good.market);
  bad(`Borrow right away: reverts ${c.y(early)}  ${c.d("(collateral is still seasoning)")}`);
  await mine(5);
  await good.market.connect(alice).borrow(E(50));
  ok(`After seasoning, Alice borrows 50 tPOT. Debt: ${f(await good.market.debtOf(alice.address))} tPOT`);

  act("Act 2: the KelpDAO-style attack on the fixture market");
  await weak.gateway.connect(bob).deposit({ value: E(100) });
  say(`A real user locked 100 tPOT. Reserve ${f(await weak.monitor.reserves())}, supply ${f(await weak.monitor.supply())}, backing ${pct(await weak.monitor.ratioBps())}`);
  await weak.gateway.connect(attacker).forgedMint(attacker.address, E(1000));
  bad(`${c.r("Attacker forges 1,000 bPOT")} with no reserve behind it. Backing falls to ${c.r(pct(await weak.monitor.ratioBps()))}`);
  await weak.token.connect(attacker).approve(await weak.market.getAddress(), E(1000));
  await weak.market.connect(attacker).depositCollateral(E(1000));
  await mine(5);
  say("Attacker deposits the unbacked tokens and waits out seasoning, then tries to borrow 100 tPOT...");
  const blocked = await revertName(weak.market.connect(attacker).borrow(E(100)), weak.market);
  ok(`${c.g("Borrow reverted in the same transaction:")} ${c.y(blocked)}`);
  say(c.d("No off-chain bot was involved. The market itself refused, because it checks backing at borrow time."));

  act("Act 3: the Sentinel bot reacts by itself");
  const advisor = createAdvisor({ log: (m) => say(c.d(m)) });
  say(advisor ? `AI advisor ${c.g("on")} (advisory only, rules decide)` : `AI advisor ${c.y("off")} (no GROQ_API_KEY), running on rules alone`);
  const ctx = {
    monitor: weak.monitor, breaker: weak.breaker.connect(sentinel), registry: weak.registry,
    address: sentinel.address, thresholdBps: 9950, now: async () => await time.latest(),
    advisor, state: {}, market: "Exploit Fixture", log: (m) => say(c.d("bot: " + m)),
  };
  const outcome = await sentinelBot.tick(ctx);
  ok(`Sentinel outcome: ${c.b(outcome)}`);
  const trip = (await weak.breaker.queryFilter(weak.breaker.filters.Tripped())).at(-1);
  say(`On-chain pause reason: "${trip.args.reason}"`);
  ok(`Exploit Fixture is now paused: ${await weak.breaker.isPaused()}, liquidation threshold tightened ${pct(PARAMS.liqThresholdBps)} → ${pct(await weak.market.liqThresholdBps())}`);
  const stillBlocked = await revertName(weak.market.connect(attacker).borrow(E(1)), weak.market);
  ok(`Any further borrow there: ${c.y(stillBlocked)}`);
  ok(`${c.g("bPOT Core is untouched:")} paused = ${await good.breaker.isPaused()}`);
  await good.market.connect(alice).borrow(E(10));
  ok(`Alice keeps borrowing on bPOT Core. Her debt is now ${f(await good.market.debtOf(alice.address))} tPOT`);
  const a = await weak.registry.agents(sentinel.address);
  ok(`Sentinel was judged right and earned ${f(a.earned)} tPOT (confirmed alarms: ${a.confirmedAlarms}, false alarms: ${a.falseAlarms})`);
  say(c.d("The owner has no unpause key. The only way out is for backing to be restored on-chain."));

  act("Act 4: backing is restored, the Sentinel releases the pause");
  // (100 + X) / (1,100 + X) must reach 99.5%, which needs about 199,000 of genuine deposits.
  await setBalance(bob.address, E(300_000));
  await weak.gateway.connect(bob).deposit({ value: E(250_000) });
  say(`Genuine deposits (250,000 tPOT) dilute the forged supply. Backing: ${pct(await weak.monitor.ratioBps())}`);
  const released = await sentinelBot.tick(ctx);
  ok(`Sentinel outcome: ${c.b(released)}. Hard pause lifted: ${!(await weak.breaker.confirmed())}`);
  say(c.d(`The Sentinel's original 1-hour soft pause is still running (paused = ${await weak.breaker.isPaused()}), and lapses on its own.`));
  await time.increase(3601);
  ok(`An hour later: paused = ${await weak.breaker.isPaused()}. The market is open again.`);

  act("Act 5: a false alarm costs the Sentinel its bond");
  await good.breaker.connect(sentinel).trip("a reckless alarm on a healthy market");
  say("Sentinel pauses bPOT Core even though it is fully backed...");
  await time.increase(3601);
  await good.breaker.connect(keeper).settleExpired();
  const b = await good.registry.agents(sentinel.address);
  bad(`The pause lapsed with backing at ${pct(await good.monitor.ratioBps())}: judged a ${c.r("false alarm")}. Bond ${f(E(10))} → ${f(b.bond)} tPOT, ${f(b.slashed)} tPOT sent to the Backstop`);
  say(`Sentinel active again? ${await good.registry.isActive(sentinel.address, 1)} ${c.d("(its bond fell below the minimum until it tops up)")}`);

  console.log("\n" + c.b("Done.") + c.d("  Contracts decide. Agents can only tighten, and they are paid or slashed by the same on-chain facts.\n"));
}

main().catch((e) => { console.error(e); process.exit(1); });
