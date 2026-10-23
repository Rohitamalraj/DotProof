import { createPublicClient, defineChain, http, parseAbi } from "viem";

/** Portaldot V3 testnet. 18 decimals is the EVM-side unit (revive.nativeToEthRatio maps native 14 -> 18). */
export const portaldot = defineChain({
  id: 420420777,
  name: "Portaldot V3 Testnet",
  nativeCurrency: { name: "tPOT", symbol: "tPOT", decimals: 18 },
  rpcUrls: { default: { http: ["https://test-evm-rpc-v3.portaldot.dev"] } },
  blockExplorers: { default: { name: "Portaldot Node Console", url: "https://node-console.portaldot.dev" } },
  testnet: true,
});

/** Source of truth: contracts/deployments/portaldot.json (check-in slice). */
export const addresses = {
  gateway: "0x619cA0F74Bbe92CaE32CA72920CbA0ff0E5aF370",
  bpot: "0xF8191413d53B750cE2F0BFc44722c0EBF0bF95A1",
  monitor: "0x60A22c14e7c3353d5B26843c8eA1cFF5D12Ef589",
} as const;

export const deployTxs = {
  gateway: "0x2b6ea71cc1f2e36e5bd01ab240149b425af2f13fe0381105102b5f345ed06651",
  monitor: "0x3eca706625c37f8308782f41c9b71d08256b1ab2e312e2e0163410854c804278",
  demoDeposit: "0x8c0fd8f59613050537c223e881833c248735707e7af983d8bcfd23f53d978040",
} as const;

export const gatewayAbi = parseAbi([
  "function deposit() payable",
  "function withdraw(uint256 amount)",
]);

export const monitorAbi = parseAbi([
  "function reserves() view returns (uint256)",
  "function supply() view returns (uint256)",
  "function ratioBps() view returns (uint256)",
]);

export const bpotAbi = parseAbi([
  "function balanceOf(address) view returns (uint256)",
]);

export const publicClient = createPublicClient({ chain: portaldot, transport: http() });

export const short = (a: string, n = 6) => `${a.slice(0, n)}…${a.slice(-4)}`;

/** Trim a 18-decimal bigint string to a readable number. */
export function fmtAmount(wei: bigint, max = 4): string {
  const s = (Number(wei) / 1e18).toLocaleString("en-US", { maximumFractionDigits: max });
  return s;
}
