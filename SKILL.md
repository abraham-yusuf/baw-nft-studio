---
name: binance-baw-nft
description: |
  Universal NFT Studio, Portfolio Indexer & Agentic Marketplace Manager for Binance Agentic Wallet (BAW).
  Bridges the official Binance Agentic Wallet (`baw`) with NFT capabilities on BNB Smart Chain (BSC).
  Use whenever the user mentions NFT balance, NFT holdings, Agent ID card, JAgent shares, free mint NFT,
  floor price, list NFT on PancakeSwap or Element, Seaport listing, or transferring NFTs from their Binance Agentic Wallet.
metadata:
  author: Abraham Yusuf & Agentika Community
  version: '1.1.0'
  openclaw:
    requires:
      bins:
        - baw
        - node
    install:
      - kind: node
        package: '@binance/agentic-wallet'
        bins: [baw]
        label: Install Binance Agentic Wallet CLI
---

# Binance Agentic Wallet — NFT Studio & Trader Skill

This skill extends the official **Binance Agentic Wallet (`binance-agentic-wallet`)** skill with comprehensive **ERC-721 and ERC-1155 NFT lifecycle management**. 

While the official Binance Mobile App hides NFT holdings (showing only `Token` and `DeFi` tabs), this skill provides direct on-chain indexing, visual portfolio rendering, autonomous minting, and gasless marketplace trading.

---

## 🧭 Command & Intent Routing: Bridge with `binance-agentic-wallet`

Always route user requests according to the asset class:

| User Intent | Routing Destination | Command / Skill |
|---|---|---|
| Check Fungible Tokens (USDT, BNB, IAO) | `binance-agentic-wallet` | `baw wallet balance --json` |
| Swap / Trade Tokens on DEX | `binance-agentic-wallet` | `baw market-order swap` |
| DeFi Lending, Yield, Staking | `binance-agentic-wallet` | `baw defi ...` |
| Prediction Markets (BTC Up/Down) | `binance-agentic-wallet` | `baw prediction ...` |
| **Check NFT Holdings & Collection Count** | **`binance-baw-nft`** | `node src/portfolio.mjs` or `npm run portfolio` |
| **View Visual NFT Cards & SVG Artwork** | **`binance-baw-nft`** | Open `http://localhost:8090` |
| **Scan Fresh On-Chain Transactions** | **`binance-baw-nft`** | `node src/scanner.mjs` or `npm run scan` |
| **Simulate & Free Mint New NFT** | **`binance-baw-nft`** | `node src/minter.mjs preview <contract> [type]` |
| **List NFT on PancakeSwap/Element ($0 Gas)** | **`binance-baw-nft`** | `node src/trader.mjs` (EIP-712 Seaport Sign) |
| **Transfer NFT to Another Wallet** | **`binance-baw-nft`** | Build `safeTransferFrom` calldata & run `contract-call` |

---

## 🛠️ Operational Workflows for Agent Harnesses

### 1. Portfolio Query (`baw-nft-portfolio`)
When the user asks: *"Berapa saldo NFT saya?"* or *"Tampilkan koleksi NFT saya di BAW"*:
```bash
# 1. Run summary script
node src/portfolio.mjs

# 2. Check live API if web studio is running
curl -s http://127.0.0.1:8090/api/portfolio
```
*Response formatting:* Present total NFTs owned, total collections, and top collection names with their Token IDs.

---

### 2. Autonomous Free Mint (`baw-nft-minter`)
When the user wants to mint a free NFT or JAgent share:
1. **Pre-flight check**:
   ```bash
   node src/minter.mjs
   ```
   Ensure `Developer Mode` is ACTIVE in `baw wallet settings --json` and BNB gas balance > 0.0001 BNB.
2. **Simulate mint calldata via BAW**:
   ```bash
   # Simulates freeMint() on target contract
   node src/minter.mjs preview <0xContractAddress> freeMint
   ```
3. **Show preview & request confirmation**:
   Show the simulated gas, risks, and target contract to the user.
4. **Execute on-chain**:
   ```bash
   baw contract-call execute --requestId <requestIdFromPreview> --json
   ```

---

### 3. Gasless Marketplace Listing (`baw-nft-trader`)
When the user asks to sell/list an NFT on PancakeSwap, Element Market, or Seaport BSC:
1. **Approval pre-check**:
   If the operator contract (`0x0000000000000068F116a894984e2DB1123eB395` Seaport 1.6) is not approved, build approval:
   ```bash
   # setApprovalForAll calldata: 0xa2224cb6...
   baw contract-call preview --binanceChainId 56 --from <userAddr> --to <nftContract> --value 0 --inputData 0xa2224cb60000000000000000000000000000000000000068f116a894984e2db1123eb3950000000000000000000000000000000000000000000000000000000000000001 --json
   ```
2. **Build EIP-712 Order**:
   Use `src/trader.mjs` to build Seaport 1.6 OrderComponents.
3. **Sign via BAW ($0 Gas Fee)**:
   ```bash
   baw sign-message preview --binanceChainId 56 --signType EIP712 --message '<orderJson>' --json
   baw sign-message execute --requestId <requestId> --json
   ```
4. **Broadcast Order**:
   Order is saved to `data/active_listings.json` and optionally pushed to Element Market or Reservoir API if keys are provided in `.env`.

---

## 🔒 Security Invariants
* **Always check Developer Mode**: Before calling `baw contract-call` or `baw sign-message`, confirm `devMode.enabled === true`.
* **Never sign uninspected calldata**: Always present the preview risks and value in human-readable BNB before triggering `execute`.
