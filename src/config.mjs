import fs from "node:fs";
import path from "node:path";

function loadEnv() {
  const envPath = path.resolve("/workspace/baw-nft-studio/.env");
  const env = {};
  if (fs.existsSync(envPath)) {
    try {
      const content = fs.readFileSync(envPath, "utf8");
      for (const line of content.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const [k, ...v] = trimmed.split("=");
        if (k && v.length) {
          env[k.trim()] = v.join("=").replace(/^["']|["']$/g, "").trim();
        }
      }
    } catch {}
  }
  return env;
}

const env = loadEnv();

export const config = {
  port: parseInt(process.env.PORT || env.PORT || "8090", 10),
  host: process.env.HOST || env.HOST || "0.0.0.0",
  bscRpcUrl: process.env.BSC_RPC_URL || env.BSC_RPC_URL || "https://bsc-dataseed.binance.org/",
  fallbackBscRpcs: (process.env.FALLBACK_BSC_RPCS || env.FALLBACK_BSC_RPCS || "https://bsc-dataseed1.defibit.io/,https://bsc-dataseed1.ninicoin.io/").split(",").map(s => s.trim()),
  bscScanApiKey: process.env.BSCSCAN_API_KEY || env.BSCSCAN_API_KEY || "",
  elementApiKey: process.env.ELEMENT_API_KEY || env.ELEMENT_API_KEY || "",
  reservoirApiKey: process.env.RESERVOIR_API_KEY || env.RESERVOIR_API_KEY || "",
  simpleHashApiKey: process.env.SIMPLEHASH_API_KEY || env.SIMPLEHASH_API_KEY || ""
};
