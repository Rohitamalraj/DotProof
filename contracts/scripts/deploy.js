// Usage:
//   $env:DEPLOYER_KEY = "0x..."            (EVM key funded with testnet POT; never commit it)
//   npx hardhat run scripts/deploy.js --network portaldot
//
// Deploys one full isolated system (Gateway + bPOT + Reserve, BackingMonitor, CircuitBreaker,
// Backstop, LendingMarket) and writes the addresses and tx hashes to deployments/<network>.json.
const fs = require("fs");
const path = require("path");
const { ethers, network } = require("hardhat");

const PARAMS = {
  ltvBps: 7000,
  liqThresholdBps: 8000,
  tightenedLiqThresholdBps: 6000,
  liqBonusBps: 500,
  seasoningBlocks: 120,
  minBackingBps: 9950,
  supplyCap: ethers.parseEther("1000000"),
  borrowCap: ethers.parseEther("400000"),
  collateralCap: ethers.parseEther("1000000"),
  baseRateBps: 200,
  slopeBps: 1000,
  reserveFactorBps: 1000,
};

async function main() {
  const [deployer] = await ethers.getSigners();
  if (!deployer) throw new Error("No deployer. Set DEPLOYER_KEY.");
  console.log("Network :", network.name, "chain", (await ethers.provider.getNetwork()).chainId.toString());
  console.log("Deployer:", deployer.address);
  console.log("Balance :", ethers.formatEther(await ethers.provider.getBalance(deployer.address)));

  const out = { network: network.name, deployer: deployer.address, contracts: {}, txs: {} };
  const record = async (name, contract) => {
    const tx = contract.deploymentTransaction();
    await contract.waitForDeployment();
    out.contracts[name] = await contract.getAddress();
    out.txs[name] = tx.hash;
    console.log(`${name.padEnd(15)} ${out.contracts[name]}  tx ${tx.hash}`);
  };

  const gateway = await (await ethers.getContractFactory("Gateway")).deploy();
  await record("Gateway", gateway);
  out.contracts.BPOT = await gateway.token();
  out.contracts.Reserve = await gateway.reserve();

  const monitor = await (await ethers.getContractFactory("BackingMonitor")).deploy(out.contracts.BPOT, out.contracts.Reserve);
  await record("BackingMonitor", monitor);
  const breaker = await (await ethers.getContractFactory("CircuitBreaker")).deploy(out.contracts.BackingMonitor, 9950, 3600, deployer.address);
  await record("CircuitBreaker", breaker);
  const backstop = await (await ethers.getContractFactory("Backstop")).deploy(deployer.address);
  await record("Backstop", backstop);
  const market = await (await ethers.getContractFactory("LendingMarket")).deploy(
    out.contracts.BPOT, out.contracts.BackingMonitor, out.contracts.CircuitBreaker, out.contracts.Backstop, PARAMS
  );
  await record("LendingMarket", market);
  await (await backstop.registerMarket(out.contracts.LendingMarket)).wait();

  const dir = path.join(__dirname, "..", "deployments");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `${network.name}.json`), JSON.stringify(out, null, 2));
  console.log("Saved deployments/" + network.name + ".json");
}

main().catch((e) => { console.error(e); process.exit(1); });
