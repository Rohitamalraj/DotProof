const { expect } = require("chai");
const { ethers } = require("hardhat");
const { mine, time, loadFixture, setBalance } = require("@nomicfoundation/hardhat-network-helpers");

const E = (n) => ethers.parseEther(String(n));
const SEASON = 5;

const PARAMS = {
  ltvBps: 7000,
  liqThresholdBps: 8000,
  tightenedLiqThresholdBps: 6000,
  liqBonusBps: 500,
  seasoningBlocks: SEASON,
  minBackingBps: 9950,
  supplyCap: E(1_000_000),
  borrowCap: E(400_000),
  collateralCap: E(1_000_000),
  baseRateBps: 200,
  slopeBps: 1000,
  reserveFactorBps: 1000,
};

/** Deploys one full isolated system. `weak` swaps in the exploit-reproduction gateway. */
async function deploySystem(owner, attacker, weak) {
  const gateway = weak
    ? await (await ethers.getContractFactory("WeakGateway")).deploy(attacker.address)
    : await (await ethers.getContractFactory("Gateway")).deploy();
  const token = await ethers.getContractAt("BPOT", await gateway.token());
  const reserveAddr = await gateway.reserve();
  const monitor = await (await ethers.getContractFactory("BackingMonitor")).deploy(await token.getAddress(), reserveAddr);
  const backstop = await (await ethers.getContractFactory("Backstop")).deploy(owner.address);
  const registry = await (await ethers.getContractFactory("AgentRegistry")).deploy(
    owner.address, await backstop.getAddress(), E(10), E(5), E(2), 2000, E(1), 7 * 24 * 3600
  );
  const breaker = await (await ethers.getContractFactory("CircuitBreaker")).deploy(
    await monitor.getAddress(), 9950, 3600, await registry.getAddress()
  );
  await registry.setAuthority(await breaker.getAddress(), true);
  const market = await (await ethers.getContractFactory("LendingMarket")).deploy(
    await token.getAddress(), await monitor.getAddress(), await breaker.getAddress(), await backstop.getAddress(), PARAMS
  );
  await backstop.registerMarket(await market.getAddress());
  return { gateway, token, monitor, breaker, backstop, registry, market };
}

const SENTINEL = 1, KEEPER = 2;

async function fixture() {
  const [owner, lender, alice, bob, attacker, sentinel, keeper] = await ethers.getSigners();
  const good = await deploySystem(owner, attacker, false);
  const weak = await deploySystem(owner, attacker, true);
  await good.market.connect(lender).supply({ value: E(1000) });
  await weak.market.connect(lender).supply({ value: E(1000) });
  await good.registry.connect(sentinel).register(SENTINEL, { value: E(10) });
  await weak.registry.connect(sentinel).register(SENTINEL, { value: E(10) });
  return { owner, lender, alice, bob, attacker, sentinel, keeper, good, weak };
}

async function openPosition(sys, user, amount) {
  await sys.gateway.connect(user).deposit({ value: E(amount) });
  await sys.token.connect(user).approve(await sys.market.getAddress(), E(amount));
  await sys.market.connect(user).depositCollateral(E(amount));
}

describe("Gateway / bPOT / BackingMonitor", () => {
  it("mints 1:1 and reports 100% backing", async () => {
    const { alice, good } = await loadFixture(fixture);
    await good.gateway.connect(alice).deposit({ value: E(10) });
    expect(await good.token.balanceOf(alice.address)).to.equal(E(10));
    expect(await good.monitor.ratioBps()).to.equal(10000);
  });

  it("burns and releases on withdrawal", async () => {
    const { alice, good } = await loadFixture(fixture);
    await good.gateway.connect(alice).deposit({ value: E(10) });
    await good.gateway.connect(alice).withdraw(E(4));
    expect(await good.token.balanceOf(alice.address)).to.equal(E(6));
    expect(await good.monitor.reserves()).to.equal(E(6));
  });

  it("only the gateway can mint", async () => {
    const { alice, good } = await loadFixture(fixture);
    await expect(good.token.connect(alice).mint(alice.address, 1)).to.be.revertedWithCustomError(good.token, "NotGateway");
  });

  it("a forged mint drops the ratio below 100%", async () => {
    const { alice, attacker, weak } = await loadFixture(fixture);
    await weak.gateway.connect(alice).deposit({ value: E(100) });
    await weak.gateway.connect(attacker).forgedMint(attacker.address, E(60));
    expect(await weak.monitor.ratioBps()).to.equal(6250); // 100 / 160
  });
});

describe("LendingMarket: core flow", () => {
  it("seasoning blocks an immediate borrow, then allows it", async () => {
    const f = await loadFixture(fixture);
    await openPosition(f.good, f.alice, 100);
    expect(await f.good.market.maxBorrowOf(f.alice.address)).to.equal(0);
    await expect(f.good.market.connect(f.alice).borrow(E(10))).to.be.revertedWithCustomError(f.good.market, "ExceedsBorrowLimit");
    await mine(SEASON);
    expect(await f.good.market.maxBorrowOf(f.alice.address)).to.equal(E(70));
    await expect(() => f.good.market.connect(f.alice).borrow(E(50))).to.changeEtherBalance(f.alice, E(50));
  });

  it("enforces LTV", async () => {
    const f = await loadFixture(fixture);
    await openPosition(f.good, f.alice, 100);
    await mine(SEASON);
    await expect(f.good.market.connect(f.alice).borrow(E(71))).to.be.revertedWithCustomError(f.good.market, "ExceedsBorrowLimit");
  });

  it("accrues interest, splits it to the backstop, and repays in full", async () => {
    const f = await loadFixture(fixture);
    await openPosition(f.good, f.alice, 100);
    await mine(SEASON);
    await f.good.market.connect(f.alice).borrow(E(50));
    await time.increase(365 * 24 * 3600);
    const debt = await f.good.market.debtOf(f.alice.address);
    expect(debt).to.be.gt(E(50));
    // 5% util -> ~2.5% annual: expect roughly 51.2 to 51.3
    expect(debt).to.be.closeTo(E(51.27), E(0.1));
    await f.good.market.connect(f.alice).repay({ value: debt + E(1) }); // overpay, remainder refunded
    expect(await f.good.market.debtOf(f.alice.address)).to.equal(0);
    await f.good.market.flushBackstop();
    expect(await ethers.provider.getBalance(await f.good.backstop.getAddress())).to.be.gt(0);
  });

  it("lets lenders withdraw their share with interest", async () => {
    const f = await loadFixture(fixture);
    await openPosition(f.good, f.alice, 100);
    await mine(SEASON);
    await f.good.market.connect(f.alice).borrow(E(50));
    await time.increase(365 * 24 * 3600);
    await f.good.market.connect(f.alice).repay({ value: await f.good.market.debtOf(f.alice.address) + E(1) });
    const assets = await f.good.market.supplyAssetsOf(f.lender.address);
    expect(assets).to.be.gt(E(1000));
    const shares = await f.good.market.supplyShares(f.lender.address);
    const before = await ethers.provider.getBalance(f.lender.address);
    const tx = await f.good.market.connect(f.lender).withdrawSupply(shares);
    const r = await tx.wait();
    const received = (await ethers.provider.getBalance(f.lender.address)) - before + r.gasUsed * r.gasPrice;
    expect(received).to.be.closeTo(assets, 1000n); // rounding dust only
    expect(await f.good.market.totalShares()).to.equal(0);
  });

  it("blocks collateral withdrawal that would break the LTV", async () => {
    const f = await loadFixture(fixture);
    await openPosition(f.good, f.alice, 100);
    await mine(SEASON);
    await f.good.market.connect(f.alice).borrow(E(60));
    await expect(f.good.market.connect(f.alice).withdrawCollateral(E(50))).to.be.revertedWithCustomError(f.good.market, "ExceedsBorrowLimit");
    await f.good.market.connect(f.alice).withdrawCollateral(E(10));
  });

  it("enforces caps", async () => {
    const f = await loadFixture(fixture);
    await setBalance(f.lender.address, E(2_000_000));
    await expect(f.good.market.connect(f.lender).supply({ value: E(1_000_001) })).to.be.revertedWithCustomError(f.good.market, "CapExceeded");
  });
});

describe("LendingMarket: liquidation and backstop", () => {
  async function leveraged(f) {
    await openPosition(f.good, f.alice, 100);
    await mine(SEASON);
    await f.good.market.connect(f.alice).borrow(E(70));
  }

  it("refuses to liquidate a healthy position", async () => {
    const f = await loadFixture(fixture);
    await leveraged(f);
    await expect(f.good.market.connect(f.keeper).liquidate(f.alice.address, { value: E(10) })).to.be.revertedWithCustomError(f.good.market, "Healthy");
  });

  it("liquidates after interest pushes health below 1, paying a bonus", async () => {
    const f = await loadFixture(fixture);
    await leveraged(f);
    // 70 debt vs 100 * 80% = 80 threshold. At ~2.7% a year, interest needs about 8 years to lift debt above 80.
    await time.increase(8 * 365 * 24 * 3600);
    expect(await f.good.market.healthFactor(f.alice.address)).to.be.lt(E(1));
    const before = await f.good.token.balanceOf(f.keeper.address);
    await f.good.market.connect(f.keeper).liquidate(f.alice.address, { value: E(20) });
    const gained = (await f.good.token.balanceOf(f.keeper.address)) - before;
    expect(gained).to.be.closeTo(E(21), E(0.001)); // 20 repaid * 1.05
  });

  it("covers bad debt from the backstop first, then lenders", async () => {
    const f = await loadFixture(fixture);
    // Seed the backstop directly so it has funds to draw on.
    await f.owner.sendTransaction({ to: await f.weak.backstop.getAddress(), value: E(5) });
    await openPosition(f.weak, f.alice, 100);
    await mine(SEASON);
    await f.weak.market.connect(f.alice).borrow(E(70));
    // Forge supply so the ratio collapses and the position becomes deeply underwater.
    await f.weak.gateway.connect(f.attacker).forgedMint(f.attacker.address, E(400)); // 100 / 500 = 20%
    expect(await f.weak.monitor.ratioBps()).to.equal(2000);
    const suppliedBefore = await f.weak.market.totalSupplied();
    await f.weak.market.connect(f.keeper).liquidate(f.alice.address, { value: E(70) });
    expect(await f.weak.market.debtOf(f.alice.address)).to.equal(0);
    // 100 bPOT is worth 20 POT: repaid ~19, leftover ~51 is bad debt; backstop covers 5, lenders eat the rest.
    const lost = suppliedBefore - (await f.weak.market.totalSupplied());
    expect(lost).to.be.gt(E(40));
    expect(await ethers.provider.getBalance(await f.weak.backstop.getAddress())).to.equal(0);
  });
});

describe("Exploit reproduction: the KelpDAO pattern", () => {
  it("synchronous backing check reverts the attacker's borrow", async () => {
    const f = await loadFixture(fixture);
    await f.weak.gateway.connect(f.alice).deposit({ value: E(100) });
    await f.weak.gateway.connect(f.attacker).forgedMint(f.attacker.address, E(1000));
    await f.weak.token.connect(f.attacker).approve(await f.weak.market.getAddress(), E(1000));
    await f.weak.market.connect(f.attacker).depositCollateral(E(1000));
    await mine(SEASON);
    await expect(f.weak.market.connect(f.attacker).borrow(E(100)))
      .to.be.revertedWithCustomError(f.weak.market, "BackingBelowThreshold")
      .withArgs(909); // 100 / 1100
  });

  it("even before seasoning ends, the unbacked mint cannot pass the check", async () => {
    const f = await loadFixture(fixture);
    await f.weak.gateway.connect(f.alice).deposit({ value: E(100) });
    await f.weak.gateway.connect(f.attacker).forgedMint(f.attacker.address, E(1000));
    await f.weak.token.connect(f.attacker).approve(await f.weak.market.getAddress(), E(1000));
    await f.weak.market.connect(f.attacker).depositCollateral(E(1000));
    await expect(f.weak.market.connect(f.attacker).borrow(E(1))).to.be.revertedWithCustomError(f.weak.market, "BackingBelowThreshold");
  });

  it("the breaker confirms permissionlessly, pauses only the affected market, and tightens liquidation", async () => {
    const f = await loadFixture(fixture);
    await f.weak.gateway.connect(f.alice).deposit({ value: E(100) });
    await f.weak.gateway.connect(f.attacker).forgedMint(f.attacker.address, E(100));
    await f.weak.breaker.connect(f.sentinel).trip("reserve < supply");
    expect(await f.weak.breaker.isPaused()).to.equal(true);
    await f.weak.breaker.connect(f.keeper).confirm();
    expect(await f.weak.breaker.confirmed()).to.equal(true);
    expect(await f.weak.market.liqThresholdBps()).to.equal(6000);
    // The healthy market is untouched.
    expect(await f.good.breaker.isPaused()).to.equal(false);
    await openPosition(f.good, f.bob, 10);
    // The paused market rejects new borrows and collateral.
    await expect(f.weak.market.connect(f.alice).depositCollateral(1)).to.be.revertedWithCustomError(f.weak.market, "Paused");
    await expect(f.weak.market.connect(f.alice).borrow(1)).to.be.revertedWithCustomError(f.weak.market, "Paused");
  });

  it("confirm() reverts while the market is actually backed", async () => {
    const f = await loadFixture(fixture);
    await f.good.gateway.connect(f.alice).deposit({ value: E(10) });
    await expect(f.good.breaker.confirm()).to.be.revertedWithCustomError(f.good.breaker, "StillBacked");
  });

  it("only sentinels can trip, a soft trip expires, and release needs restored backing", async () => {
    const f = await loadFixture(fixture);
    await expect(f.good.breaker.connect(f.alice).trip("x")).to.be.revertedWithCustomError(f.good.breaker, "NotSentinel");
    await f.good.breaker.connect(f.sentinel).trip("false alarm");
    expect(await f.good.breaker.isPaused()).to.equal(true);
    await time.increase(3601);
    expect(await f.good.breaker.isPaused()).to.equal(false); // no deterministic confirmation, so it lapses

    await f.weak.gateway.connect(f.alice).deposit({ value: E(100) });
    await f.weak.gateway.connect(f.attacker).forgedMint(f.attacker.address, E(100));
    await f.weak.breaker.confirm();
    await expect(f.weak.breaker.release()).to.be.revertedWithCustomError(f.weak.breaker, "BackingNotRestored");
    // Backing recovers once genuine deposits dilute the forged supply: (100 + X) / (200 + X) >= 99.5%.
    await setBalance(f.bob.address, E(100_000));
    await f.weak.gateway.connect(f.bob).deposit({ value: E(50_000) });
    await f.weak.breaker.release();
    expect(await f.weak.breaker.confirmed()).to.equal(false);
  });
});


describe("AgentRegistry and bonded alarms", () => {
  async function forge(f) {
    await f.weak.gateway.connect(f.alice).deposit({ value: E(100) });
    await f.weak.gateway.connect(f.attacker).forgedMint(f.attacker.address, E(100)); // ratio 50%
  }

  it("registers with a bond and rejects bad registrations", async () => {
    const f = await loadFixture(fixture);
    const r = f.good.registry;
    expect(await r.isActive(f.sentinel.address, SENTINEL)).to.equal(true);
    await expect(r.connect(f.alice).register(SENTINEL, { value: E(9) })).to.be.revertedWithCustomError(r, "BondTooLow");
    await expect(r.connect(f.alice).register(0, { value: E(10) })).to.be.revertedWithCustomError(r, "BadRole");
    await expect(r.connect(f.sentinel).register(SENTINEL, { value: E(10) })).to.be.revertedWithCustomError(r, "AlreadyRegistered");
    await r.connect(f.keeper).register(KEEPER, { value: E(5) });
    expect(await r.isActive(f.keeper.address, KEEPER)).to.equal(true);
    expect(await r.isActive(f.keeper.address, SENTINEL)).to.equal(false);
  });

  it("only an active Sentinel can trip: strangers and Keepers cannot", async () => {
    const f = await loadFixture(fixture);
    await f.good.registry.connect(f.keeper).register(KEEPER, { value: E(5) });
    await expect(f.good.breaker.connect(f.alice).trip("x")).to.be.revertedWithCustomError(f.good.breaker, "NotSentinel");
    await expect(f.good.breaker.connect(f.keeper).trip("x")).to.be.revertedWithCustomError(f.good.breaker, "NotSentinel");
  });

  it("a true alarm is rewarded: confirm() judges the pending trip and pays the Sentinel", async () => {
    const f = await loadFixture(fixture);
    await forge(f);
    await f.weak.registry.fundRewards({ value: E(5) });
    await f.weak.breaker.connect(f.sentinel).trip("reserve < supply");
    await expect(f.weak.breaker.connect(f.keeper).confirm())
      .to.emit(f.weak.breaker, "AlarmJudged").withArgs(f.sentinel.address, true);
    const a = await f.weak.registry.agents(f.sentinel.address);
    expect(a.confirmedAlarms).to.equal(1);
    expect(a.earned).to.equal(E(1));
    expect(await f.weak.registry.claimable(f.sentinel.address)).to.equal(E(1));
    await expect(() => f.weak.registry.connect(f.sentinel).claimRewards()).to.changeEtherBalance(f.sentinel, E(1));
    expect(await f.weak.registry.claimable(f.sentinel.address)).to.equal(0);
  });

  it("a false alarm is slashed: it expires while the market is fully backed", async () => {
    const f = await loadFixture(fixture);
    await f.good.gateway.connect(f.alice).deposit({ value: E(10) });
    await f.good.breaker.connect(f.sentinel).trip("cry wolf");
    await expect(f.good.breaker.settleExpired()).to.be.revertedWithCustomError(f.good.breaker, "NotExpired");
    await time.increase(3601);
    const backstopBefore = await ethers.provider.getBalance(await f.good.backstop.getAddress());
    await expect(f.good.breaker.connect(f.keeper).settleExpired())
      .to.emit(f.good.breaker, "AlarmJudged").withArgs(f.sentinel.address, false);
    const a = await f.good.registry.agents(f.sentinel.address);
    expect(a.falseAlarms).to.equal(1);
    expect(a.bond).to.equal(E(8)); // 20% of 10
    expect(a.slashed).to.equal(E(2));
    // the slashed bond lands in the Backstop
    expect((await ethers.provider.getBalance(await f.good.backstop.getAddress())) - backstopBefore).to.equal(E(2));
    // bond fell below the minimum: inactive until topped up
    expect(await f.good.registry.isActive(f.sentinel.address, SENTINEL)).to.equal(false);
    await expect(f.good.breaker.connect(f.sentinel).trip("again")).to.be.revertedWithCustomError(f.good.breaker, "NotSentinel");
    await f.good.registry.connect(f.sentinel).topUp({ value: E(2) });
    expect(await f.good.registry.isActive(f.sentinel.address, SENTINEL)).to.equal(true);
  });

  it("an expired trip that was right is judged true, rewarded, and becomes a hard pause", async () => {
    const f = await loadFixture(fixture);
    await forge(f);
    await f.weak.registry.fundRewards({ value: E(5) });
    await f.weak.breaker.connect(f.sentinel).trip("reserve < supply");
    await time.increase(3601);
    await f.weak.breaker.connect(f.keeper).settleExpired();
    expect(await f.weak.breaker.confirmed()).to.equal(true);
    expect((await f.weak.registry.agents(f.sentinel.address)).confirmedAlarms).to.equal(1);
  });

  it("allows one unjudged trip at a time and has nothing to settle otherwise", async () => {
    const f = await loadFixture(fixture);
    await expect(f.good.breaker.settleExpired()).to.be.revertedWithCustomError(f.good.breaker, "NothingToSettle");
    await f.good.breaker.connect(f.sentinel).trip("first");
    await expect(f.good.breaker.connect(f.sentinel).trip("second")).to.be.revertedWithCustomError(f.good.breaker, "TripPending");
  });

  it("rewards are capped by the pool: with an empty pool the alarm still counts but pays nothing", async () => {
    const f = await loadFixture(fixture);
    await forge(f);
    await f.weak.breaker.connect(f.sentinel).trip("reserve < supply");
    await f.weak.breaker.confirm();
    const a = await f.weak.registry.agents(f.sentinel.address);
    expect(a.confirmedAlarms).to.equal(1);
    expect(a.earned).to.equal(0);
  });

  it("only authorities can reward or slash: strangers and the owner cannot", async () => {
    const f = await loadFixture(fixture);
    const r = f.good.registry;
    await expect(r.connect(f.alice).recordConfirmed(f.sentinel.address)).to.be.revertedWithCustomError(r, "NotAuthority");
    await expect(r.connect(f.alice).recordFalseAlarm(f.sentinel.address)).to.be.revertedWithCustomError(r, "NotAuthority");
    await expect(r.connect(f.owner).recordFalseAlarm(f.sentinel.address)).to.be.revertedWithCustomError(r, "NotAuthority");
  });

  it("unbonding: inactive at once, locked for the delay, and still slashable while locked", async () => {
    const f = await loadFixture(fixture);
    const r = f.good.registry;
    await f.good.gateway.connect(f.alice).deposit({ value: E(10) });
    await f.good.breaker.connect(f.sentinel).trip("exit before the verdict");
    await r.connect(f.sentinel).requestUnbond();
    expect(await r.isActive(f.sentinel.address, SENTINEL)).to.equal(false);
    await expect(r.connect(f.sentinel).withdraw()).to.be.revertedWithCustomError(r, "StillLocked");
    await time.increase(3601);
    await f.good.breaker.settleExpired(); // false alarm lands during the unbonding window
    await time.increase(7 * 24 * 3600);
    await expect(() => r.connect(f.sentinel).withdraw()).to.changeEtherBalance(f.sentinel, E(8)); // 10 minus the 20% slash
    expect((await r.agents(f.sentinel.address)).role).to.equal(0);
  });
});


describe("Agent bots (rule-based Sentinel and Keeper)", () => {
  const sentinelBot = require("../../agents/src/sentinel");
  const keeperBot = require("../../agents/src/keeper");

  const sentinelCtx = (sys, signer) => ({
    monitor: sys.monitor,
    breaker: sys.breaker.connect(signer),
    registry: sys.registry,
    address: signer.address,
    thresholdBps: 9950,
    now: async () => await time.latest(),
  });

  async function forge(f) {
    await f.weak.gateway.connect(f.alice).deposit({ value: E(100) });
    await f.weak.gateway.connect(f.attacker).forgedMint(f.attacker.address, E(100)); // ratio 50%
  }

  it("Sentinel does nothing while the market is fully backed", async () => {
    const f = await loadFixture(fixture);
    await f.good.gateway.connect(f.alice).deposit({ value: E(10) });
    expect(await sentinelBot.tick(sentinelCtx(f.good, f.sentinel))).to.equal("ok");
    expect(await f.good.breaker.isPaused()).to.equal(false);
  });

  it("Sentinel reacts to a forged mint by itself: trips, confirms, gets paid, then releases when backing returns", async () => {
    const f = await loadFixture(fixture);
    await forge(f);
    await f.weak.registry.fundRewards({ value: E(5) });
    const ctx = sentinelCtx(f.weak, f.sentinel);

    expect(await sentinelBot.tick(ctx)).to.equal("tripped+confirmed");
    expect(await f.weak.breaker.confirmed()).to.equal(true);
    expect(await f.weak.registry.claimable(f.sentinel.address)).to.equal(E(1));
    // the other market is untouched
    expect(await f.good.breaker.isPaused()).to.equal(false);
    // a second tick is a no-op, not a second alarm
    expect(await sentinelBot.tick(ctx)).to.equal("already-paused");

    // genuine deposits dilute the forged supply until the ratio recovers
    await setBalance(f.bob.address, E(100_000));
    await f.weak.gateway.connect(f.bob).deposit({ value: E(50_000) });
    expect(await sentinelBot.tick(ctx)).to.equal("released");
    expect(await f.weak.breaker.confirmed()).to.equal(false);
  });

  it("Sentinel settles its own expired false alarm when it is the one who cried wolf", async () => {
    const f = await loadFixture(fixture);
    await f.good.gateway.connect(f.alice).deposit({ value: E(10) });
    await f.good.breaker.connect(f.sentinel).trip("manual false alarm");
    await time.increase(3601);
    expect(await sentinelBot.tick(sentinelCtx(f.good, f.sentinel))).to.equal("settled");
    expect((await f.good.registry.agents(f.sentinel.address)).falseAlarms).to.equal(1);
  });

  it("an unregistered bot can still help: it can only confirm, never trip", async () => {
    const f = await loadFixture(fixture);
    await forge(f);
    expect(await sentinelBot.tick(sentinelCtx(f.weak, f.bob))).to.equal("confirmed");
    expect(await f.weak.breaker.confirmed()).to.equal(true);
    await expect(f.weak.breaker.connect(f.bob).trip("x")).to.be.revertedWithCustomError(f.weak.breaker, "NotSentinel");
  });

  it("Keeper finds borrowers from events and liquidates only unhealthy positions", async () => {
    const f = await loadFixture(fixture);
    await openPosition(f.good, f.alice, 100);
    await mine(SEASON);
    await f.good.market.connect(f.alice).borrow(E(70));
    await openPosition(f.good, f.bob, 100);
    await mine(SEASON);
    await f.good.market.connect(f.bob).borrow(E(10)); // stays healthy

    const ctx = {
      market: f.good.market.connect(f.keeper),
      signerAddress: f.keeper.address,
      getBalance: (a) => ethers.provider.getBalance(a),
      getBlockNumber: () => ethers.provider.getBlockNumber(),
      state: { users: new Set(), fromBlock: 0 },
      maxRange: 7, // forces the chunked scan to loop
    };

    expect(await keeperBot.tick(ctx)).to.deep.equal([]); // everyone healthy
    expect(ctx.state.users.size).to.equal(2);

    await time.increase(8 * 365 * 24 * 3600); // interest pushes alice past her threshold, bob stays fine
    const before = await f.good.token.balanceOf(f.keeper.address);
    expect(await keeperBot.tick(ctx)).to.deep.equal([f.alice.address]);
    expect(await f.good.token.balanceOf(f.keeper.address)).to.be.gt(before); // collected the bonus in bPOT
    expect(await keeperBot.tick(ctx)).to.deep.equal([]); // nothing left to do
  });
});
