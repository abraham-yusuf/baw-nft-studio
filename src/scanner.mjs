import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const BSC_RPCS = [
  "https://bsc-dataseed.binance.org/",
  "https://bsc-dataseed1.defibit.io/",
  "https://bsc-dataseed1.ninicoin.io/"
];

async function rpcCall(method, params) {
  let lastErr = null;
  for (const rpc of BSC_RPCS) {
    try {
      const res = await fetch(rpc, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));
      return data.result;
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error("All RPCs failed");
}

function decodeString(hex) {
  if (!hex || hex === "0x") return "";
  try {
    const raw = hex.slice(2);
    // standard abi encoding: offset (32 bytes), length (32 bytes), data
    if (raw.length >= 128) {
      const lenHex = raw.slice(64, 128);
      const len = parseInt(lenHex, 16);
      const dataHex = raw.slice(128, 128 + len * 2);
      return Buffer.from(dataHex, "hex").toString("utf8");
    }
    return Buffer.from(raw, "hex").toString("utf8").replace(/\0/g, "").trim();
  } catch {
    return "";
  }
}

async function getTokenMetadata(contract, tokenId) {
  const hexId = BigInt(tokenId).toString(16).padStart(64, "0");
  
  // tokenURI(uint256) -> 0xc87b56dd
  let uri = "";
  try {
    const res = await rpcCall("eth_call", [{ to: contract, data: "0xc87b56dd" + hexId }, "latest"]);
    uri = decodeString(res);
  } catch (err) {
    // some contracts use uri(uint256) -> 0x0e89341c (ERC1155)
    try {
      const res = await rpcCall("eth_call", [{ to: contract, data: "0x0e89341c" + hexId }, "latest"]);
      uri = decodeString(res);
    } catch {}
  }

  let metadata = { name: `NFT #${tokenId}`, description: "", image: "", attributes: [] };
  if (uri) {
    if (uri.startsWith("data:application/json;base64,")) {
      try {
        const b64 = uri.replace("data:application/json;base64,", "");
        const parsed = JSON.parse(Buffer.from(b64, "base64").toString("utf8"));
        metadata = { ...metadata, ...parsed };
      } catch (e) {}
    } else if (uri.startsWith("data:application/json,")) {
      try {
        const parsed = JSON.parse(decodeURIComponent(uri.replace("data:application/json,", "")));
        metadata = { ...metadata, ...parsed };
      } catch (e) {}
    } else if (uri.startsWith("http://") || uri.startsWith("https://") || uri.startsWith("ipfs://")) {
      const httpUrl = uri.startsWith("ipfs://") 
        ? uri.replace("ipfs://", "https://ipfs.io/ipfs/") 
        : uri;
      try {
        const res = await fetch(httpUrl, { signal: AbortSignal.timeout(5000) });
        const parsed = await res.json();
        metadata = { ...metadata, ...parsed };
      } catch (e) {}
    }
  }

  return { uri, metadata };
}

export async function scanBawNFTs() {
  console.log("Reading Binance Agentic Wallet transactions...");
  let txRaw;
  try {
    txRaw = execSync("baw wallet tx-history --size 100 --json").toString();
  } catch (e) {
    console.error("Failed to query baw wallet tx-history:", e.message);
    return [];
  }

  const txData = JSON.parse(txRaw);
  const transactions = txData?.data?.transactions || [];

  const candidates = [];
  for (const tx of transactions) {
    const rec = tx.txHashList?.[0]?.instructions?.receive?.[0];
    const isZeroDecimals = rec?.tokenInfo?.decimals === 0;
    const isMint = tx.txType === "mint";
    if (isMint || isZeroDecimals) {
      candidates.push({
        txHash: tx.txHash,
        txTime: tx.txTime,
        contract: rec?.tokenInfo?.contractAddress,
        symbol: rec?.tokenInfo?.symbol || "NFT",
        recipient: rec?.addressInfo?.address
      });
    }
  }

  console.log(`Found ${candidates.length} NFT mint transactions. Resolving on-chain receipts & metadata...`);

  const nfts = [];
  const TRANSFER_TOPIC = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
  const BATCH_SIZE = 5;

  async function processCandidate(c) {
    if (!c.contract) return null;
    try {
      const receipt = await rpcCall("eth_getTransactionReceipt", [c.txHash]);
      if (!receipt || receipt.status !== "0x1") return null;

      let tokenId = null;
      for (const log of receipt.logs || []) {
        if (log.address.toLowerCase() === c.contract.toLowerCase() && log.topics[0] === TRANSFER_TOPIC) {
          if (log.topics[3]) {
            tokenId = BigInt(log.topics[3]).toString();
          } else if (log.data && log.data !== "0x") {
            tokenId = BigInt(log.data).toString();
          }
        }
      }

      if (!tokenId) tokenId = "1";

      const { uri, metadata } = await getTokenMetadata(c.contract, tokenId);

      return {
        txHash: c.txHash,
        txTime: c.txTime,
        contractAddress: c.contract,
        collectionSymbol: c.symbol,
        tokenId,
        name: metadata.name || `${c.symbol} #${tokenId}`,
        description: metadata.description || `Minted on BSC via Binance Agentic Wallet.`,
        image: metadata.image || "",
        attributes: metadata.attributes || [],
        tokenUri: uri.slice(0, 150) + (uri.length > 150 ? "..." : "")
      };
    } catch (e) {
      return null;
    }
  }

  for (let i = 0; i < candidates.length; i += BATCH_SIZE) {
    const batch = candidates.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(batch.map(processCandidate));
    for (const r of results) {
      if (r) {
        nfts.push(r);
        console.log(`Resolved: [${r.collectionSymbol}] #${r.tokenId} -> ${r.name}`);
      }
    }
  }

  const outPath = path.resolve("/workspace/baw-nft-studio/data/nfts.json");
  fs.writeFileSync(outPath, JSON.stringify(nfts, null, 2));
  console.log(`Successfully indexed ${nfts.length} NFTs to ${outPath}`);
  return nfts;
}

if (process.argv[1]?.endsWith("scanner.mjs")) {
  scanBawNFTs().catch(console.error);
}
