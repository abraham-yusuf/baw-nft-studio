import { execSync } from "node:child_process";

export function getMinterPreflight() {
  const settingsRaw = execSync("baw wallet settings --json").toString();
  const settings = JSON.parse(settingsRaw)?.data;

  const agentRaw = execSync("baw wallet agent-id --json").toString();
  const agent = JSON.parse(agentRaw)?.data;

  const addrRaw = execSync("baw wallet address --json").toString();
  const bscAddr = JSON.parse(addrRaw)?.data?.addresses?.find(a => a.binanceChainId === "56")?.address;

  const balRaw = execSync("baw wallet balance --symbol BNB --binanceChainId 56 --json").toString();
  const bnbBal = JSON.parse(balRaw)?.data?.[0]?.balance || "0";

  return {
    address: bscAddr,
    devModeEnabled: settings?.devMode?.enabled === true,
    devModeExpiresAt: settings?.devMode?.expiresAt,
    agentIdClaimed: agent?.claimed === true,
    agentId: agent?.agentId,
    bnbBalance: bnbBal,
    ready: settings?.devMode?.enabled === true && parseFloat(bnbBal) > 0.0001
  };
}

export function buildMintCalldata(type = "freeMint", params = {}) {
  // Common free mint selectors
  const SELECTORS = {
    freeMint: "0x24e05294", // freeMint()
    mint: "0x1249c58b",     // mint()
    claim: "0x4e71d92d",    // claim()
    publicMint: "0x497121ad", // publicMint()
    mintAmount: "0xa0712d68", // mint(uint256)
    mintTo: "0x6a627842"      // mint(address)
  };

  if (params.customCalldata) return params.customCalldata;

  if (type === "mintAmount") {
    const amountHex = BigInt(params.amount || 1).toString(16).padStart(64, "0");
    return SELECTORS.mintAmount + amountHex;
  }

  if (type === "mintTo") {
    const addrHex = (params.recipient || "").toLowerCase().replace("0x", "").padStart(64, "0");
    return SELECTORS.mintTo + addrHex;
  }

  return SELECTORS[type] || SELECTORS.freeMint;
}

export async function previewMint({ contractAddress, calldata = "0x24e05294", valueWei = "0" }) {
  const pre = getMinterPreflight();
  if (!pre.devModeEnabled) {
    throw new Error("Developer Mode is not active in Binance App. Please enable Developer Mode in Agentic Wallet settings.");
  }
  if (!pre.address) {
    throw new Error("BSC address not found in connected wallet.");
  }

  const cmd = `baw contract-call preview --binanceChainId 56 --from ${pre.address} --to ${contractAddress} --value ${valueWei} --inputData ${calldata} --json`;
  console.log("Simulating contract call via BAW CLI:\n", cmd);
  const raw = execSync(cmd).toString();
  const res = JSON.parse(raw);
  return {
    command: cmd,
    previewResult: res
  };
}

export async function executeMint(requestId) {
  if (!requestId) throw new Error("requestId is required to execute mint");
  const cmd = `baw contract-call execute --requestId ${requestId} --json`;
  console.log("Executing contract call via BAW CLI:\n", cmd);
  const raw = execSync(cmd).toString();
  return JSON.parse(raw);
}

if (process.argv[1]?.endsWith("minter.mjs")) {
  console.log("=== BAW NFT AUTONOMOUS MINTER ===");
  const pre = getMinterPreflight();
  console.log("Wallet Address   :", pre.address);
  console.log("Developer Mode   :", pre.devModeEnabled ? `ACTIVE (expires ${pre.devModeExpiresAt})` : "OFF");
  console.log("Agent ID Bound   :", pre.agentIdClaimed ? pre.agentId : "None");
  console.log("BNB Gas Balance  :", pre.bnbBalance, "BNB");
  console.log("Minter Status    :", pre.ready ? "READY FOR ON-CHAIN MINTING" : "INSUFFICIENT GAS OR DEV MODE OFF");
  console.log("\nUsage:\n node src/minter.mjs preview <contractAddress> [freeMint|mint|claim]\n");
}
