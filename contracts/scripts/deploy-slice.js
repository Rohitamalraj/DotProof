// Check-in slice: Gateway (+ Reserve + bPOT, created by the Gateway) and BackingMonitor,
// followed by one real deposit so the explorer shows a mint and a live backing ratio.
//
// Dry run (no key needed, sends nothing, prints estimated cost):
//   $env:DRY_RUN="1"; npx hardhat run scripts/deploy-slice.js --network portaldot
// Real run (key is read from your environment, never from a file or chat):
//   $env:DEPLOYER_KEY="0x..."; npx hardhat run scripts/deploy-slice.js --network portaldot
const fs = require("fs");
const path = require("path");
const { ethers, network } = require("hardhat");

const WALLET = "0xba8212D81868EB497FF67263761B774EFC413179"; // public address, used for the dry run only
const DEMO_DEPOSIT = ethers.parseEther("1"); // 1 tPOT minted as 1 bPOT
const fmt = (wei) => ethers.formatEther(wei);

async function main() {
  const dry = process.env.DRY_RUN === "1";
  const provider = ethers.provider;
  const net = await provider.getNetwork();
  const feeData = await provider.getFeeData();
  const gasPrice = feeData.gasPrice;
  console.log(`Network ${network.name} (chain ${net.chainId}), gasPrice ${gasPrice} wei`);

  const Gateway = await ethers.getContractFactory("Gateway");
  const Monitor = await ethers.getContractFactory("BackingMonitor");

  if (dry) {
    const from = WALLET;
    console.log("DRY RUN from", from, "balance", fmt(await provider.getBalance(from)), "tPOT");
    const zero = ethers.ZeroAddress;
    let total = 0n;
    for (const [name, factory, args] of [["Gateway", Gateway, []], ["BackingMonitor", Monitor, [zero, zero]]]) {
      const tx = await factory.getDeployTransaction(...args);
      try {
        const gas = await provider.estimateGas({ from, data: tx.data });
        const cost = gas * gasPrice;
        total += cost;
        console.log(`${name.padEnd(15)} gas ${gas}  ~ ${fmt(cost)} tPOT`);
      } catch (e) {
        console.log(`${name.padEnd(15)} estimate failed: ${e.shortMessage || e.message}`);
      }
    }
    console.log(`Estimated total ~ ${fmt(total)} tPOT (the demo deposit adds ${fmt(DEMO_DEPOSIT)} tPOT, held in the Reserve)`);
    return;
  }

  const [deployer] = await ethers.getSigners();
  if (!deployer) throw new Error("No signer. Set DEPLOYER_KEY in your environment.");
  if (deployer.address.toLowerCase() !== WALLET.toLowerCase()) {
    throw new Error(`DEPLOYER_KEY belongs to ${deployer.address}, expected ${WALLET}. Aborting.`);
  }
  const start = await provider.getBalance(deployer.address);
  console.log("Deployer", deployer.address, "balance", fmt(start), "tPOT");

  const out = { network: network.name, chainId: Number(net.chainId), deployer: deployer.address, contracts: {}, txs: {} };
  const save = () => {
    const dir = path.join(__dirname, "..", "deployments");
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, `${network.name}.json`), JSON.stringify(out, null, 2));
  };
  const step = async (label, before) => {
    const now = await provider.getBalance(deployer.address);
    console.log(`  cost of ${label}: ${fmt(before - now)} tPOT, balance now ${fmt(now)}`);
    return now;
  };

  let bal = start;
  const gateway = await Gateway.deploy();
  await gateway.waitForDeployment();
  out.contracts.Gateway = await gateway.getAddress();
  out.txs.Gateway = gateway.deploymentTransaction().hash;
  out.contracts.BPOT = await gateway.token();
  out.contracts.Reserve = await gateway.reserve();
  console.log("Gateway        ", out.contracts.Gateway, "tx", out.txs.Gateway);
  console.log("  bPOT         ", out.contracts.BPOT);
  console.log("  Reserve      ", out.contracts.Reserve);
  save();
  bal = await step("Gateway + bPOT + Reserve", bal);

  const monitor = await Monitor.deploy(out.contracts.BPOT, out.contracts.Reserve);
  await monitor.waitForDeployment();
  out.contracts.BackingMonitor = await monitor.getAddress();
  out.txs.BackingMonitor = monitor.deploymentTransaction().hash;
  console.log("BackingMonitor ", out.contracts.BackingMonitor, "tx", out.txs.BackingMonitor);
  save();
  bal = await step("BackingMonitor", bal);

  const dep = await gateway.deposit({ value: DEMO_DEPOSIT });
  await dep.wait();
  out.txs.demoDeposit = dep.hash;
  const token = await ethers.getContractAt("BPOT", out.contracts.BPOT);
  out.demo = {
    bPOTBalance: fmt(await token.balanceOf(deployer.address)),
    reserve: fmt(await monitor.reserves()),
    supply: fmt(await monitor.supply()),
    ratioBps: (await monitor.ratioBps()).toString(),
  };
  console.log("Demo deposit    tx", dep.hash);
  console.log("  bPOT balance ", out.demo.bPOTBalance, " reserve", out.demo.reserve, " supply", out.demo.supply, " ratio(bps)", out.demo.ratioBps);
  save();
  await step("demo deposit", bal);
  console.log("Saved deployments/" + network.name + ".json. Total spent", fmt(start - (await provider.getBalance(deployer.address))), "tPOT");
}

main().catch((e) => { console.error(e); process.exit(1); });
