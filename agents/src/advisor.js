// LLM advisor for the Sentinel (Groq, OpenAI-compatible API). Advisory only.
//
// The model never touches a contract. It returns a verdict and a written reason that the Sentinel may
// use in two limited ways, both of which can only make the system MORE cautious:
//   1. an early warning while backing is still above the threshold but slipping, and
//   2. a plain-language incident summary attached to a trip that the deterministic rules already decided.
// If there is no key, the API is down, the reply is malformed or it times out, `advise` returns null
// and the Sentinel runs on its rules alone. It never throws.
//
//   GROQ_API_KEY   required to enable the advisor
//   GROQ_MODEL     optional, default openai/gpt-oss-120b

const ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";
const DEFAULT_MODEL = "openai/gpt-oss-120b";
const VERDICTS = new Set(["alarm", "watch", "ignore"]);

const SYSTEM = [
  "You are a risk analyst advising a bonded Sentinel agent for a lending protocol.",
  "Collateral is a wrapped token that must stay backed by reserves: backing ratio = reserve / supply.",
  "A ratio below the threshold means the collateral is provably under-backed. A falling ratio that is still",
  "above the threshold may be an early sign of a forged or buggy mint.",
  "You only advise. A wrong 'alarm' costs the Sentinel part of its bond, so do not cry wolf; a missed real",
  "attack costs lenders. Weigh both. Use only the numbers provided. Do not invent facts.",
  'Reply with ONE JSON object and nothing else: {"verdict":"alarm"|"watch"|"ignore","confidence":0..1,',
  '"reason":"<one or two plain sentences, max 200 characters>"}',
].join(" ");

function buildPrompt(s) {
  const pct = (bps) => (Number(bps) / 100).toFixed(2) + "%";
  const hist = (s.history || []).map((h) => `${h.t}s: ${pct(h.ratioBps)}`).join(", ") || "none";
  return [
    `Market: ${s.market || "bPOT Core"}`,
    `Backing threshold: ${pct(s.thresholdBps)}`,
    `Current backing ratio: ${pct(s.ratioBps)}`,
    `Reserve held: ${s.reserves ?? "n/a"}`,
    `Token supply: ${s.supply ?? "n/a"}`,
    `Recent ratio samples (oldest to newest): ${hist}`,
    `Task: ${s.task === "incident" ? "Write a short incident summary for the on-chain trip reason. The rules have already decided to pause." : "Decide whether this slip is an early warning worth a pause."}`,
  ].join("\n");
}

/** Extract the first JSON object from a model reply, tolerating stray prose or code fences. */
function parseVerdict(text) {
  if (typeof text !== "string") return null;
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return null;
  let o;
  try {
    o = JSON.parse(m[0]);
  } catch {
    return null;
  }
  if (!VERDICTS.has(o.verdict)) return null;
  const confidence = Number(o.confidence);
  if (!Number.isFinite(confidence) || confidence < 0 || confidence > 1) return null;
  const reason = String(o.reason ?? "").replace(/\s+/g, " ").trim().slice(0, 200);
  return { verdict: o.verdict, confidence, reason };
}

/**
 * Build an `advise(snapshot)` function. `opts.fetch` is injectable for tests.
 * Returns null from advise() whenever the advisor is unavailable or unusable.
 */
function createAdvisor(opts = {}) {
  const key = (opts.apiKey ?? process.env.GROQ_API_KEY ?? "").trim();
  if (!key) return null;
  const model = opts.model || process.env.GROQ_MODEL || DEFAULT_MODEL;
  const doFetch = opts.fetch || globalThis.fetch;
  const timeoutMs = opts.timeoutMs ?? 12000;
  const log = opts.log || (() => {});

  return async function advise(snapshot) {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), timeoutMs);
    try {
      const res = await doFetch(ENDPOINT, {
        method: "POST",
        signal: ctl.signal,
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          temperature: 0.1,
          max_completion_tokens: 1500,
          reasoning_effort: "low",
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: SYSTEM },
            { role: "user", content: buildPrompt(snapshot) },
          ],
        }),
      });
      if (!res.ok) {
        log(`advisor unavailable: HTTP ${res.status}`);
        return null;
      }
      const j = await res.json();
      const out = parseVerdict(j?.choices?.[0]?.message?.content);
      if (!out) log("advisor reply was not a valid verdict, ignoring it");
      return out ? { ...out, model } : null;
    } catch (e) {
      log(`advisor unavailable: ${e.name === "AbortError" ? "timed out" : e.message}`);
      return null;
    } finally {
      clearTimeout(timer);
    }
  };
}

module.exports = { createAdvisor, parseVerdict, buildPrompt, DEFAULT_MODEL };
