// Demo for the check-in video. Reads the deployed Gateway / bPOT / BackingMonitor on Portaldot V3
// testnet and prints the live backing state. Read-only by default, no key needed.
//
//   npx hardhat run scripts/demo-slice.js --network portaldot
//
// To mint on camera (needs DEPLOYER_KEY in the repo-root .env), add a small amount of tPOT:
//   $env:DEPOSIT="0.1"; npx hardhat run scripts/demo-slice.js --network portaldot
const fs = require("fs");
const path = require("path");
const { ethers, network } = require("hardhat");

const fmt = (wei) => ethers.formatEther(wei);
const bar = (bps) => "[" + "#".repeat(Math.round(Number(bps) / 500)).padEnd(20, ".") + "]";

async function snapshot(label, gateway, token, monitor, who) {
  const [reserves, supply, ratio] = await Promise.all([monitor.reserves(), monitor.supply(), monitor.ratioBps()]);
  console.log(`\n== ${label} ==`);
  console.log(`  reserve held by Gateway : ${fmt(reserves)} tPOT`);
  console.log(`  bPOT total supply       : ${fmt(supply)} bPOT`);
  console.log(`  backing ratio           : ${Number(ratio) / 100}%  ${bar(ratio)}`);
  if (who) console.log(`  your bPOT balance       : ${fmt(await token.balanceOf(who))} bPOT`);
}

async function main() {
  const file = path.join(__dirname, "..", "deployments", `${network.name}.json`);
  const d = JSON.parse(fs.readFileSync(file, "utf8"));
  const c = d.contracts;
  const gateway = await ethers.getContractAt("Gateway", c.Gateway);
  const token = await ethers.getContractAt("BPOT", c.BPOT);
  const monitor = await ethers.getContractAt("BackingMonitor", c.BackingMonitor);

  console.log(`DotProof on ${network.name} (chain ${(await ethers.provider.getNetwork()).chainId})`);
  console.log(`  Gateway        ${c.Gateway}`);
  console.log(`  bPOT           ${c.BPOT}`);
  console.log(`  BackingMonitor ${c.BackingMonitor}`);

  const amount = process.env.DEPOSIT;
  const [signer] = await ethers.getSigners();
  const who = signer ? signer.address : d.deployer;
  await snapshot("Before", gateway, token, monitor, who);

  if (amount) {
    if (!signer) throw new Error("DEPOSIT needs DEPLOYER_KEY in the repo-root .env");
    console.log(`\nDepositing ${amount} tPOT into the Gateway...`);
    const tx = await gateway.connect(signer).deposit({ value: ethers.parseEther(amount) });
    console.log("  tx", tx.hash);
    await tx.wait();
    await snapshot("After", gateway, token, monitor, who);
    console.log("\nEvery bPOT in circulation is backed 1:1 by tPOT locked in the Gateway.");
  } else {
    console.log("\n(read-only run: set DEPOSIT=0.1 to mint on camera)");
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
