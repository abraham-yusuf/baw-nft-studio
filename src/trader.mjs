import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const ACTIVE_LISTINGS_FILE = path.resolve("/workspace/baw-nft-studio/data/active_listings.json");
const SEAPORT_BSC = "0x0000000000000068F116a894984e2DB1123eB395";

export function getTraderWallet() {
  const raw = execSync("baw wallet address --json").toString();
  const parsed = JSON.parse(raw);
  return parsed?.data?.addresses?.find(a => a.binanceChainId === "56")?.address;
}

export function buildApprovalCalldata(operator = SEAPORT_BSC, approved = true) {
  // setApprovalForAll(address operator, bool approved) -> 0xa2224cb6
  const cleanOp = operator.toLowerCase().replace("0x", "").padStart(64, "0");
  const cleanApp = (approved ? "1" : "0").padStart(64, "0");
  return "0xa2224cb6" + cleanOp + cleanApp;
}

export function buildSeaportOrder({
  offerer,
  nftContract,
  tokenId,
  priceBnb,
  durationDays = 30
}) {
  const priceWei = (BigInt(Math.floor(parseFloat(priceBnb) * 1e18))).toString();
  const now = Math.floor(Date.now() / 1000);
  const end = now + durationDays * 86400;

  const payload = {
    domain: {
      name: "Seaport",
      version: "1.6",
      chainId: 56,
      verifyingContract: SEAPORT_BSC
    },
    types: {
      OrderComponents: [
        { name: "offerer", type: "address" },
        { name: "zone", type: "address" },
        { name: "offer", type: "OfferItem[]" },
        { name: "consideration", type: "ConsiderationItem[]" },
        { name: "orderType", type: "uint8" },
        { name: "startTime", type: "uint256" },
        { name: "endTime", type: "uint256" },
        { name: "zoneHash", type: "bytes32" },
        { name: "salt", type: "uint256" },
        { name: "conduitKey", type: "bytes32" },
        { name: "counter", type: "uint256" }
      ]
    },
    primaryType: "OrderComponents",
    message: {
      offerer: offerer.toLowerCase(),
      zone: "0x0000000000000000000000000000000000000000",
      offer: [{
        itemType: 2, // ERC721
        token: nftContract.toLowerCase(),
        identifierOrCriteria: tokenId.toString(),
        startAmount: "1",
        endAmount: "1"
      }],
      consideration: [{
        itemType: 0, // Native BNB
        token: "0x0000000000000000000000000000000000000000",
        identifierOrCriteria: "0",
        startAmount: priceWei,
        endAmount: priceWei,
        recipient: offerer.toLowerCase()
      }],
      orderType: 0, // FULL_OPEN
      startTime: now.toString(),
      endTime: end.toString(),
      zoneHash: "0x0000000000000000000000000000000000000000000000000000000000000000",
      salt: Math.floor(Math.random() * 1e12).toString(),
      conduitKey: "0x0000000000000000000000000000000000000000000000000000000000000000",
      counter: "0"
    }
  };

  return payload;
}

export async function signListingOrder(orderPayload) {
  const jsonStr = JSON.stringify(orderPayload);
  const cmd = `baw sign-message preview --binanceChainId 56 --signType EIP712 --message '${jsonStr}' --json`;
  console.log("Generating signature preview via BAW CLI...");
  const raw = execSync(cmd).toString();
  const parsed = JSON.parse(raw);
  return {
    command: cmd,
    previewResult: parsed
  };
}

export function saveListing(listing) {
  let listings = [];
  if (fs.existsSync(ACTIVE_LISTINGS_FILE)) {
    try {
      listings = JSON.parse(fs.readFileSync(ACTIVE_LISTINGS_FILE, "utf8"));
    } catch {}
  }
  listings.push({
    ...listing,
    createdAt: new Date().toISOString()
  });
  fs.writeFileSync(ACTIVE_LISTINGS_FILE, JSON.stringify(listings, null, 2));
}

if (process.argv[1]?.endsWith("trader.mjs")) {
  console.log("=== BAW NFT AGENTIC TRADER ===");
  const wallet = getTraderWallet();
  console.log("Trader Wallet Address:", wallet);
  console.log("Seaport BSC Contract :", SEAPORT_BSC);
  console.log("Supported Operations :");
  console.log(" 1. Gasless EIP-712 Listing via `baw sign-message` ($0 gas fee)");
  console.log(" 2. Approval Management via `baw contract-call`");
  console.log(" 3. Floor Sweeper / Auto-buy via `baw contract-call`");
  console.log("\nUsage:\n node src/trader.mjs list <contractAddress> <tokenId> <priceBnb>\n");
}
