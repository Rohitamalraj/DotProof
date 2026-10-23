// Live smoke test for the advisor. Sends three realistic scenarios to Groq and prints each verdict.
// The key is read from the repo-root .env and never printed.
//   node scripts/groq-smoke.js
const path = require("path");
try { process.loadEnvFile(path.join(__dirname, "..", "..", ".env")); } catch { /* use the shell environment */ }
const { createAdvisor, DEFAULT_MODEL } = require("../src/advisor");

const advise = createAdvisor({ log: (m) => console.log("  [log]", m) });
if (!advise) {
  console.error("GROQ_API_KEY is not set in .env");
  process.exit(1);
}

const t0 = 1_700_000_000;
const scenarios = [
  { name: "healthy, fully backed", task: "early", thresholdBps: 9950, ratioBps: 10000, reserves: "1000", supply: "1000",
    history: [10000, 10000, 10000, 10000].map((r, i) => ({ t: t0 + i * 15, ratioBps: r })) },
  { name: "slipping above the threshold (possible forged mint)", task: "early", thresholdBps: 9950, ratioBps: 9962, reserves: "1000", supply: "1003.8",
    history: [10000, 9996, 9981, 9962].map((r, i) => ({ t: t0 + i * 15, ratioBps: r })) },
  { name: "below the threshold, incident summary for the trip reason", task: "incident", thresholdBps: 9950, ratioBps: 5000, reserves: "100", supply: "200",
    history: [10000, 10000, 5000].map((r, i) => ({ t: t0 + i * 15, ratioBps: r })) },
];

(async () => {
  console.log("model:", process.env.GROQ_MODEL || DEFAULT_MODEL);
  for (const s of scenarios) {
    const t = Date.now();
    const v = await advise(s);
    console.log(`\n${s.name}\n  -> ${v ? `${v.verdict} (confidence ${v.confidence})\n     "${v.reason}"` : "no verdict (advisor unavailable)"}  [${Date.now() - t} ms]`);
  }
})();
