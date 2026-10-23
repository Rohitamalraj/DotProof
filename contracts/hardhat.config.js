require("@nomicfoundation/hardhat-toolbox");

// Portaldot V3 testnet (EVM). The deployer key is read from the environment and never committed.
// Load the deployer key from the repo-root .env (git-ignored). Values are never printed.
try { process.loadEnvFile(require("path").join(__dirname, "..", ".env")); } catch { /* no .env: fall back to the shell */ }

const PORTALDOT_RPC = process.env.PORTALDOT_RPC || "https://test-evm-rpc-v3.portaldot.dev";
const rawKey = (process.env.DEPLOYER_KEY || "").trim();
const accounts = rawKey ? [rawKey.startsWith("0x") ? rawKey : "0x" + rawKey] : [];

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: { enabled: true, runs: 1 },
      // "paris" avoids PUSH0, the safest target for a chain whose opcode support is unconfirmed.
      evmVersion: "paris",
    },
  },
  networks: {
    portaldot: { url: PORTALDOT_RPC, chainId: 420420777, accounts },
  },
};
