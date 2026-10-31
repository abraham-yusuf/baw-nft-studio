# CLAUDE.md — BAW NFT Studio Developer Guidelines

## 📌 Repository Overview
**BAW NFT Studio** is the dedicated NFT infrastructure and visual portfolio engine for **Binance Agentic Wallet (`baw`)** on BNB Smart Chain (BSC). It bridges the gap caused by the Binance mobile app's lack of an NFT tab.

---

## 🚀 Key Commands

| Task | Command |
|---|---|
| Run Visual Studio (Port 8090) | `npm start` or `node server.mjs` |
| Scan Fresh On-Chain NFTs | `npm run scan` or `node src/scanner.mjs` |
| View Portfolio Summary | `npm run portfolio` or `node src/portfolio.mjs` |
| Check Minter Readiness | `npm run minter` or `node src/minter.mjs` |
| Simulate Free Mint | `node src/minter.mjs preview <0xContractAddress> freeMint` |
| Generate Seaport EIP-712 Order | `npm run trader` or `node src/trader.mjs` |

---

## 🧭 Multi-Agent Intent Routing Matrix
When interacting with Binance Agentic Wallet:
* **Fungible Tokens (BNB, USDT, IAO, Memes)**: Route to official `binance-agentic-wallet` (`baw wallet balance`, `baw market-order swap`).
* **DeFi Staking / Lending**: Route to `binance-agentic-wallet` (`baw defi`).
* **Prediction Markets**: Route to `binance-agentic-wallet` (`baw prediction`).
* **NFTs (ERC-721/1155, Agent ID cards, Free Mints, Floor Prices, Seaport/PancakeSwap listing)**: Route to **`binance-baw-nft`** using scripts in this repo.

---

## 🔒 Security Invariants
1. **Developer Mode Pre-Check**: Developer Mode must be active (`devMode.enabled === true`) in `baw wallet settings --json` before attempting `contract-call` or `sign-message`.
2. **Never Execute Without Preview**: Always run `preview` first, inspect simulated gas & risks, present it clearly to the user, and only execute with explicit confirmation.
3. **No Private Keys**: All transactions and signatures are delegated through the local `baw` session.
