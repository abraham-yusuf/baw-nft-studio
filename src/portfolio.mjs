import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { scanBawNFTs } from "./scanner.mjs";

const DATA_FILE = path.resolve("/workspace/baw-nft-studio/data/nfts.json");

export function loadNFTs() {
  if (!fs.existsSync(DATA_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  } catch {
    return [];
  }
}

export async function getPortfolioSummary() {
  let nfts = loadNFTs();
  if (nfts.length === 0) {
    nfts = await scanBawNFTs();
  }

  // Group by collection
  const collections = {};
  for (const nft of nfts) {
    const sym = nft.collectionSymbol || "UNKNOWN";
    if (!collections[sym]) {
      collections[sym] = {
        symbol: sym,
        contractAddress: nft.contractAddress,
        itemsCount: 0,
        tokens: []
      };
    }
    collections[sym].itemsCount++;
    collections[sym].tokens.push({
      tokenId: nft.tokenId,
      name: nft.name,
      txHash: nft.txHash
    });
  }

  let walletAddress = "Wallet Belum Terhubung (Jalankan 'baw auth signin')";
  try {
    const raw = execSync("baw wallet address --json").toString();
    const parsed = JSON.parse(raw);
    const bsc = parsed?.data?.addresses?.find(a => a.binanceChainId === "56");
    if (bsc?.address) walletAddress = bsc.address;
  } catch {}

  return {
    walletAddress,
    chain: "BNB Smart Chain (56)",
    totalNFTs: nfts.length,
    totalCollections: Object.keys(collections).length,
    collections: Object.values(collections),
    nfts
  };
}

if (process.argv[1]?.endsWith("portfolio.mjs")) {
  getPortfolioSummary().then(res => {
    console.log("=== BAW NFT PORTFOLIO SUMMARY ===");
    console.log(`Wallet Address   : ${res.walletAddress}`);
    console.log(`Total NFTs Owned : ${res.totalNFTs}`);
    console.log(`Total Collections: ${res.totalCollections}`);
    console.log("\nTop Collections:");
    res.collections.slice(0, 10).forEach((c, i) => {
      console.log(` ${i + 1}. [${c.symbol}] ${c.itemsCount} item(s) - ${c.contractAddress}`);
    });
    console.log("\nTo view full visual gallery, open http://127.0.0.1:8090");
  }).catch(console.error);
}
