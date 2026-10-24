// Keeper: liquidates unhealthy loans. Permissionless, anyone can run one.
//
// Finds borrowers from the market's `Borrowed` events, checks each position's health factor on-chain,
// and repays the debt of any position below 1.0 to collect the liquidation bonus. It can do nothing
// but call liquidate(); the contract decides whether a position is liquidatable.
//
// `ctx`: { market, signerAddress, getBalance, getBlockNumber, state, log, maxRange }
//   state persists between ticks: { users:Set<string>, fromBlock:number }

const ONE = 10n ** 18n;

async function tick(ctx) {
  const { market, state } = ctx;
  const log = ctx.log || (() => {});
  const maxRange = ctx.maxRange || 2000;

  // 1. Discover borrowers incrementally (chunked, so public RPC range limits are respected).
  const head = await ctx.getBlockNumber();
  let from = state.fromBlock ?? 0;
  while (from <= head) {
    const to = Math.min(from + maxRange - 1, head);
    const events = await market.queryFilter(market.filters.Borrowed(), from, to);
    for (const e of events) state.users.add(e.args.user);
    from = to + 1;
  }
  state.fromBlock = head + 1;

  // 2. Check each known borrower.
  const liquidated = [];
  for (const user of state.users) {
    const debt = BigInt(await market.debtOf(user));
    if (debt === 0n) continue;
    const hf = BigInt(await market.healthFactor(user));
    if (hf >= ONE) continue;
    const balance = BigInt(await ctx.getBalance(ctx.signerAddress));
    if (balance <= debt) {
      log(`skip ${user}: unhealthy (hf ${hf}) but the keeper balance cannot cover debt ${debt}`);
      continue;
    }
    // Send the full debt; any excess is refunded by the contract.
    await (await market.liquidate(user, { value: debt })).wait();
    log(`liquidated ${user}: repaid ~${debt} (health factor was ${hf})`);
    liquidated.push(user);
  }
  if (liquidated.length === 0) {
    log(`scanned ${state.users.size} known borrower(s) up to block ${head}: nothing to liquidate`);
  }
  return liquidated;
}

module.exports = { tick };
