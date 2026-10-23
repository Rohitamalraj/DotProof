// Sentinel: watches a market's backing and can only ever make it safer.
//
// Rule-based by design. It reads real on-chain state (BackingMonitor), applies a threshold, and
// calls the contract paths the CircuitBreaker allows: trip() (pause), then confirm() (promote to a
// hard pause on proof), settleExpired() and release(). It cannot unpause, raise caps or move funds,
// and those limits are enforced by the contracts, not by this code.
//
// An optional LLM advisor (see advisor.js) can add two things, and only in the cautious direction:
//   - an early warning while backing is still above the threshold but falling, and
//   - a plain-language incident summary on a trip the rules already decided.
// The advisor can never release a pause, skip a rule, or act on its own. Without it, or if it fails,
// the Sentinel behaves exactly as the rules say.
//
// `ctx` takes already-connected contract objects so the same logic runs in tests and in production:
//   { monitor, breaker, registry, address, thresholdBps, log,
//     advisor?, state?, now?, reserves?, supply?, earlyWarningConfidence? }

const FULL = 10_000n;

function remember(state, t, ratioBps) {
  state.history = state.history || [];
  state.history.push({ t, ratioBps: Number(ratioBps) });
  if (state.history.length > 12) state.history.shift();
}

async function snapshot(ctx, ratio, task, t) {
  const { monitor } = ctx;
  return {
    market: ctx.market,
    task,
    thresholdBps: ctx.thresholdBps,
    ratioBps: Number(ratio),
    reserves: monitor.reserves ? String(await monitor.reserves()) : undefined,
    supply: monitor.supply ? String(await monitor.supply()) : undefined,
    history: (ctx.state && ctx.state.history) || [{ t, ratioBps: Number(ratio) }],
  };
}

async function tick(ctx) {
  const { monitor, breaker, registry, address, thresholdBps } = ctx;
  const log = ctx.log || (() => {});
  const state = (ctx.state = ctx.state || {});

  const ratio = BigInt(await monitor.ratioBps());
  const backed = ratio >= BigInt(thresholdBps);
  const confirmed = await breaker.confirmed();
  const pending = await breaker.tripPending();
  const pausedUntil = BigInt(await breaker.pausedUntil());
  const nowSec = Number((await ctx.now?.()) ?? Math.floor(Date.now() / 1000));
  const now = BigInt(nowSec);

  const previous = state.history && state.history.length ? BigInt(state.history[state.history.length - 1].ratioBps) : null;
  remember(state, nowSec, ratio);

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

    // Early warning: still above the threshold, but not at 100% and falling since the last look.
    const slipping = ratio < FULL && previous !== null && ratio < previous;
    if (ctx.advisor && slipping && !pending) {
      const v = await ctx.advisor(await snapshot(ctx, ratio, "early", nowSec));
      if (!v) {
        log(`slipping (${previous} -> ${ratio} bps), advisor unavailable: staying on rules`);
        return "ok";
      }
      log(`advisor: ${v.verdict} (${v.confidence}) ${v.reason}`);
      const needed = ctx.earlyWarningConfidence ?? 0.8;
      if (v.verdict === "alarm" && v.confidence >= needed && (await registry.isActive(address, 1))) {
        // This is a soft, expiring pause. If backing holds, it lapses and costs this Sentinel part of its
        // bond, so the advisor's call carries real economic risk and is never made lightly.
        await (await breaker.trip(`AI early warning: ${v.reason}`.slice(0, 200))).wait();
        log("tripped on an advisor early warning (soft pause, expires on its own)");
        return "tripped-early-warning";
      }
      return "watch";
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
    // The rules have already decided. The advisor, if present, only writes the reason text.
    let reason = `backing ${ratio} bps < ${thresholdBps} bps`;
    if (ctx.advisor) {
      const v = await ctx.advisor(await snapshot(ctx, ratio, "incident", nowSec));
      if (v && v.reason) reason = `${reason}. ${v.reason}`.slice(0, 200);
    }
    await (await breaker.trip(reason)).wait();
    tripped = true;
    log(`tripped: ${reason}`);
  }
  // confirm() is permissionless and deterministic: it only succeeds if the chain agrees backing is low.
  await (await breaker.confirm()).wait();
  log(`confirmed hard pause (backing ${ratio} bps)`);
  return tripped ? "tripped+confirmed" : "confirmed";
}

module.exports = { tick };
