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
  const breaker = await (await ethers.getContractFactory("CircuitBreaker")).deploy(await monitor.getAddress(), 9950, 3600, owner.address);
  const backstop = await (await ethers.getContractFactory("Backstop")).deploy(owner.address);
  const market = await (await ethers.getContractFactory("LendingMarket")).deploy(
    await token.getAddress(), await monitor.getAddress(), await breaker.getAddress(), await backstop.getAddress(), PARAMS
  );
  await backstop.registerMarket(await market.getAddress());
  return { gateway, token, monitor, breaker, backstop, market };
}

async function fixture() {
  const [owner, lender, alice, bob, attacker, sentinel, keeper] = await ethers.getSigners();
  const good = await deploySystem(owner, attacker, false);
  const weak = await deploySystem(owner, attacker, true);
  await good.market.connect(lender).supply({ value: E(1000) });
  await weak.market.connect(lender).supply({ value: E(1000) });
  await good.breaker.setSentinel(sentinel.address, true);
  await weak.breaker.setSentinel(sentinel.address, true);
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
