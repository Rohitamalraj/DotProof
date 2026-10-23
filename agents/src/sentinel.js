// Sentinel: watches a market's backing and can only ever make it safer.
//
// Rule-based by design. It reads real on-chain state (BackingMonitor), applies a threshold, and
// calls the contract paths the CircuitBreaker allows: trip() (pause), then confirm() (promote to a
// hard pause on proof), settleExpired() and release(). It cannot unpause, raise caps or move funds,
// and those limits are enforced by the contracts, not by this code.
//
// `ctx` takes already-connected contract objects so the same logic runs in tests and in production:
//   { monitor, breaker, registry, address, thresholdBps, log }

async function tick(ctx) {
  const { monitor, breaker, registry, address, thresholdBps } = ctx;
  const log = ctx.log || (() => {});

  const ratio = BigInt(await monitor.ratioBps());
  const backed = ratio >= BigInt(thresholdBps);
  const confirmed = await breaker.confirmed();
  const pending = await breaker.tripPending();
  const pausedUntil = BigInt(await breaker.pausedUntil());
  const now = BigInt((await ctx.now?.()) ?? Math.floor(Date.now() / 1000));

  if (backed) {
    // Housekeeping that keeps the system honest and the registry's verdicts flowing.
    if (confirmed) {
      await (await breaker.release()).wait();
      log(`backing restored (${ratio} bps): released hard pause`);
      return "released";
    }
    if (pending && now >= pausedUntil) {
      await (await breaker.settleExpired()).wait();
      log("settled an expired trip");
      return "settled";
    }
    log(`ok: backing ${ratio} bps`);
    return "ok";
  }

  // Under-backed.
  if (confirmed) {
    log(`already hard-paused (backing ${ratio} bps)`);
    return "already-paused";
  }

  let tripped = false;
  if (!pending && (await registry.isActive(address, 1))) {
    await (await breaker.trip(`backing ${ratio} bps < ${thresholdBps} bps`)).wait();
    tripped = true;
    log(`tripped: backing ${ratio} bps is below ${thresholdBps} bps`);
  }
  // confirm() is permissionless and deterministic: it only succeeds if the chain agrees backing is low.
  await (await breaker.confirm()).wait();
  log(`confirmed hard pause (backing ${ratio} bps)`);
  return tripped ? "tripped+confirmed" : "confirmed";
}

module.exports = { tick };
