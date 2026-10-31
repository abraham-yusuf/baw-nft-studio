# 🎨 BAW NFT Studio (Binance Agentic Wallet NFT Suite)

> **The Missing NFT Tab & Agentic Trading Studio for Binance Agentic Wallet (BAW) on BNB Smart Chain.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Binance Agentic Wallet](https://img.shields.io/badge/Binance-Agentic_Wallet_1.12+-F0B90B.svg)](https://web3.binance.com)
[![Network: BSC](https://img.shields.io/badge/Network-BNB_Smart_Chain_(56)-F3BA2F.svg)](https://bscscan.com)
[![Protocol: Seaport 1.6](https://img.shields.io/badge/Protocol-Seaport_1.6-blue.svg)](https://github.com/ProjectOpenSea/seaport)

---

## 🛑 The Problem: "NFT Portfolio Blindness" on Binance App

Currently, the Web3 ecosystem on Binance is booming with **free mint NFTs, JAgent model shares, and Agent ID exclusive drops (`.ai` Space ID)**. 

However, a critical limitation exists in the official Binance Mobile App:
1. **No NFT Tab in Dompet Agentif:** The Binance App interface only displays **`Token`** and **`DeFi`** tabs. Users who mint NFTs or hold Agent IDs are completely blind to their NFT holdings, token IDs, metadata, and floor prices.
2. **Missing Agentic NFT Trading:** While DEXes like PancakeSwap support agentic fungible token swaps via BAW, there is **zero native agentic support** for discovering, minting, transferring, or trading NFTs.

---

## 💡 The Solution: BAW NFT Studio

**BAW NFT Studio** provides the first complete, community-ready, open-source NFT infrastructure specifically designed for **Binance Agentic Wallet (`baw`)**.

```
┌────────────────────────────────────────────────────────────────────────┐
│                   BAW NFT Studio (Port 8090 UI)                        │
│        [Virtual NFT Tab] &bull; [Auto Free Minter] &bull; [Agentic Trader]        │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │
      ┌──────────────────────────────┼──────────────────────────────┐
      ▼                              ▼                              ▼
┌──────────────┐            ┌─────────────────┐            ┌──────────────────┐
│  Portfolio   │            │   Autonomous    │            │     Agentic      │
│   Indexer    │            │     Minter      │            │      Trader      │
│              │            │                 │            │                  │
│ • BSC RPC    │            │ • Pre-flight    │            │ • Seaport 1.6    │
│ • SVG/IPFS   │            │ • Calldata      │            │ • EIP-712 Sign   │
│ • Token IDs  │            │ • contract-call │            │ • $0 Gas Listing │
└──────┬───────┘            └────────┬────────┘            └────────┬─────────┘
       │                             │                              │
       └─────────────────────────────┼──────────────────────────────┘
                                     ▼
                      ┌─────────────────────────────┐
                      │    Binance Agentic Wallet   │
                      │          (baw CLI)          │
                      │ • Developer Mode Active     │
                      │ • BNB Smart Chain (BSC 56)  │
                      └─────────────────────────────┘
```

---

## 🚀 Key Features & The 3 Core Modules

### 1. `baw-nft-portfolio` (Virtual NFT Tab)
* Directly parses confirmed transactions from `baw wallet tx-history`.
* Queries BSC JSON-RPC nodes to decode `Transfer(from, to, tokenId)` logs and calls `tokenURI(tokenId)`.
* Fully supports **On-Chain Base64 SVGs** (e.g. *GanfanPig*, *Agentika Pass*), IPFS gateways, and Arweave metadata.
* Provides an interactive, Binance-styled Dark Mode Web UI at `http://localhost:8090`.

### 2. `baw-nft-minter` (Autonomous Mint & Claim)
* Auto-detects free mint functions (`freeMint()`, `mint()`, `claim()`, `publicMint()`) or custom calldata.
* Performs automated pre-flight checks: Developer Mode status, BNB gas balance, and Agent ID verification (`wallet agent-id`).
* Runs `baw contract-call preview` to simulate execution before signing.
* Executes mints on-chain via `baw contract-call execute`.

### 3. `baw-nft-trader` (Gasless Marketplace Listing & Floor Sweeper)
* **Gasless Listing ($0 Fee):** Creates standard Seaport 1.6 `OrderComponents` payloads and signs them off-chain via `baw sign-message` (EIP-712). You pay zero network fees to list your NFT!
* **Approval Manager:** Generates `setApprovalForAll` calldata for Seaport / PancakeSwap NFT conduits.
* **Orderbook Broadcasting:** Optional automatic broadcast to Element Market and Reservoir orderbook APIs.

---

## 🔑 Tech Stack & Platform Architecture

| Layer | Component | Notes |
|---|---|---|
| **Runtime** | Node.js (v18+) ES Modules | Fast, lightweight, zero compilation required. |
| **Wallet Gateway** | `@binance/agentic-wallet` (`baw` v1.12+) | Authenticated via local session; drives DevMode contract calls. |
| **Decentralized Protocol** | Seaport 1.6 (`0x0000000000000068F116a894984e2DB1123eB395`) | Universal EVM NFT marketplace protocol on BSC. |
| **RPC & Blockchain** | Public BSC Dataseed + Custom Fallbacks | Permissionless `eth_call` and `eth_getTransactionReceipt`. |
| **Orderbooks (Optional)** | Element Market, Reservoir, PancakeSwap Subgraph | For broadcasting off-chain orders to marketplace UIs. |
| **Web UI** | Tailwind CSS + FontAwesome + Native Fetch | Responsive Binance-themed mobile & desktop experience. |

---

## ❓ Why Does It Work Out-Of-The-Box Without API Keys?

A common question is: *Why wasn't an API key required to start seeing 50 NFTs and generating listing orders?*

1. **Permissionless Blockchain (RPC):** Reading your NFT holdings, token IDs, and SVG artwork uses standard BSC JSON-RPC calls (`eth_call`, `eth_getTransactionReceipt`). Public BSC dataseeds allow this without any API key or subscription.
2. **Seaport is a Smart Contract, Not an API Company:** Seaport 1.6 is a decentralized on-chain protocol. Anyone can build, sign, and execute orders directly on the blockchain without asking anyone for an API key.
3. **BAW Uses Device Sessions:** The `baw` CLI authenticates through your Binance App QR code pairing (`~/.baw/session.json`), not via third-party developer API keys.

### 🌟 When Should You Add API Keys?
If you want enhanced features in production, you can copy `.env.example` to `.env`:
* **`BSCSCAN_API_KEY`**: Unlocks unlimited, high-speed indexing from BscScan V2 without rate limits.
* **`ELEMENT_API_KEY`**: Automatically publishes your signed listing to Element Market's website so external buyers can find and buy it immediately.
* **`RESERVOIR_API_KEY`**: Enables live floor price tracking and multi-marketplace order aggregation.

---

## 📦 Installation & Quick Start

### Prerequisites
* Node.js v18 or later
* Binance Agentic Wallet CLI (`npm install -g @binance/agentic-wallet`)
* Binance App with **Developer Mode** enabled in Agentic Wallet settings.

### 1. Clone & Setup
```bash
git clone https://github.com/abraham-yusuf/baw-nft-studio.git
cd baw-nft-studio
cp .env.example .env # Optional: Add API keys if desired
```

### 2. Scan Your BAW NFTs
```bash
npm run scan
```

### 3. Launch the Studio Dashboard
```bash
npm start
```
Open **`http://localhost:8090`** in your browser.

---

## 💻 CLI Commands

You can run individual modules directly from the terminal or automate them in CI/CD / cron:

```bash
# 1. Summary of your NFT portfolio
npm run portfolio

# 2. Check minter pre-flight & gas readiness
npm run minter

# 3. Simulate a free-mint transaction
node src/minter.mjs preview 0xContractAddress freeMint

# 4. Generate gasless Seaport listing order
node src/trader.mjs
```

---

## 🤝 Contributing

Contributions from the Binance, Web3, and Agentic AI communities are warmly welcomed!
1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

Distributed under the **MIT License**. See `LICENSE` for more information.
