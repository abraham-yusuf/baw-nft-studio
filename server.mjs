import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { scanBawNFTs } from "./src/scanner.mjs";
import { getPortfolioSummary } from "./src/portfolio.mjs";
import { getMinterPreflight, previewMint, executeMint, buildMintCalldata } from "./src/minter.mjs";
import { buildSeaportOrder, signListingOrder, buildApprovalCalldata, saveListing } from "./src/trader.mjs";

const PORT = 8090;
const PUBLIC_DIR = path.resolve("/workspace/baw-nft-studio/public");
const DATA_FILE = path.resolve("/workspace/baw-nft-studio/data/nfts.json");

function getBawWalletInfo() {
  try {
    const addrRaw = execSync("baw wallet address --json").toString();
    const settingsRaw = execSync("baw wallet settings --json").toString();
    const agentRaw = execSync("baw wallet agent-id --json").toString();
    const balanceRaw = execSync("baw wallet balance --json").toString();
    return {
      address: JSON.parse(addrRaw)?.data?.addresses?.find(a => a.binanceChainId === "56")?.address,
      settings: JSON.parse(settingsRaw)?.data,
      agentId: JSON.parse(agentRaw)?.data,
      balance: JSON.parse(balanceRaw)?.data
    };
  } catch (e) {
    return { error: e.message };
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  // --- MODUL 1: BAW-NFT-PORTFOLIO ---
  if (url.pathname === "/api/portfolio") {
    try {
      const summary = await getPortfolioSummary();
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: true, data: summary }));
    } catch (e) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: false, error: e.message }));
    }
    return;
  }

  if (url.pathname === "/api/nfts") {
    let nfts = [];
    if (fs.existsSync(DATA_FILE)) {
      try {
        nfts = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
      } catch (e) {}
    }
    if (nfts.length === 0) {
      const wallet = getBawWalletInfo();
      if (wallet?.address) {
        try {
          nfts = await scanBawNFTs();
        } catch (e) {
          console.warn("Auto-scan on empty cache:", e.message);
        }
      }
    }
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ success: true, count: nfts.length, data: nfts }));
    return;
  }

  if (url.pathname === "/api/wallet") {
    const info = getBawWalletInfo();
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ success: true, data: info }));
    return;
  }

  if (url.pathname === "/api/refresh" && req.method === "POST") {
    try {
      const nfts = await scanBawNFTs();
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: true, count: nfts.length }));
    } catch (e) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: false, error: e.message }));
    }
    return;
  }

  // --- MODUL 2: BAW-NFT-MINTER ---
  if (url.pathname === "/api/minter/status") {
    const pre = getMinterPreflight();
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ success: true, data: pre }));
    return;
  }

  if (url.pathname === "/api/minter/preview" && req.method === "POST") {
    let body = "";
    req.on("data", chunk => body += chunk);
    req.on("end", async () => {
      try {
        const { contractAddress, type = "freeMint", customCalldata, valueWei = "0" } = JSON.parse(body);
        const calldata = buildMintCalldata(type, { customCalldata });
        const preview = await previewMint({ contractAddress, calldata, valueWei });
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: true, data: preview }));
      } catch (e) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: false, error: e.message }));
      }
    });
    return;
  }

  if (url.pathname === "/api/minter/execute" && req.method === "POST") {
    let body = "";
    req.on("data", chunk => body += chunk);
    req.on("end", async () => {
      try {
        const { requestId } = JSON.parse(body);
        const receipt = await executeMint(requestId);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: true, data: receipt }));
      } catch (e) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: false, error: e.message }));
      }
    });
    return;
  }

  // --- MODUL 3: BAW-NFT-TRADER ---
  if (url.pathname === "/api/trader/list-order" && req.method === "POST") {
    let body = "";
    req.on("data", chunk => body += chunk);
    req.on("end", async () => {
      try {
        const { offerer, nftContract, tokenId, priceBnb, signNow = false } = JSON.parse(body);
        const orderPayload = buildSeaportOrder({ offerer, nftContract, tokenId, priceBnb });
        let signResult = null;
        if (signNow) {
          signResult = await signListingOrder(orderPayload);
          saveListing({ offerer, nftContract, tokenId, priceBnb, signResult });
        }
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
          success: true,
          orderPayload,
          signResult
        }));
      } catch (e) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: false, error: e.message }));
      }
    });
    return;
  }

  // Build Calldata for Transfer
  if (url.pathname === "/api/build-transfer" && req.method === "POST") {
    let body = "";
    req.on("data", chunk => body += chunk);
    req.on("end", () => {
      try {
        const { contract, from, to, tokenId } = JSON.parse(body);
        const cleanFrom = from.toLowerCase().replace("0x", "").padStart(64, "0");
        const cleanTo = to.toLowerCase().replace("0x", "").padStart(64, "0");
        const cleanId = BigInt(tokenId).toString(16).padStart(64, "0");
        const calldata = "0x42842e0e" + cleanFrom + cleanTo + cleanId;
        const cliPreview = `baw contract-call preview --binanceChainId 56 --from ${from} --to ${contract} --value 0 --inputData ${calldata} --json`;

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
          success: true,
          calldata,
          cliCommand: cliPreview
        }));
      } catch (e) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: false, error: e.message }));
      }
    });
    return;
  }

  // Static File Serving
  let filePath = path.join(PUBLIC_DIR, url.pathname === "/" ? "index.html" : url.pathname);
  if (!fs.existsSync(filePath)) {
    filePath = path.join(PUBLIC_DIR, "index.html");
  }

  const ext = path.extname(filePath);
  const mimeTypes = {
    ".html": "text/html",
    ".js": "text/javascript",
    ".css": "text/css",
    ".json": "application/json",
    ".png": "image/png",
    ".svg": "image/svg+xml"
  };

  try {
    const content = fs.readFileSync(filePath);
    res.writeHead(200, { "Content-Type": mimeTypes[ext] || "text/plain" });
    res.end(content);
  } catch (e) {
    res.writeHead(404);
    res.end("Not Found");
  }
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`BAW NFT Studio Server running on http://127.0.0.1:${PORT}`);
});
