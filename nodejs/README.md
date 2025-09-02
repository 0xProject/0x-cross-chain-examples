# Cross-Chain Swap Examples

This TypeScript project demonstrates how to interact with the [0x Cross-Chain API](https://docs.0x.org) to perform cross-chain token swaps between EVM chains and Solana. It includes four complete examples with real-time transaction monitoring.

## Example Output

```bash
$ npm run evm-to-solana

> cross-chain-examples@1.0.0 evm-to-solana
> tsx src/fromEvmToSolana.ts

🌉 Base to Solana Cross-Chain Swap Example
==========================================
👤 Sender (Base): 0x742d35Cc6635C0532925a3b8D5c1C5e45e37b1c5
🎯 Receiver (Solana): 9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM

📊 Getting cross-chain quote...
✅ Quote received:
💰 Send: 0.001 WETH
💱 Receive: 3.248 USDC
🛡️ Min Receive: 3.216 USDC
⏱️ Estimated Time: 10s

🔧 Handling token approval...
📤 Sending approval transaction...
📝 Approval sent: 0xabc123...
⏳ Waiting for approval confirmation...
✅ Approval confirmed
🔗 View approval: https://basescan.org/tx/0xabc123...

🚀 Executing transaction...
📤 Sending transaction...
📝 Transaction sent: 0xdef456...
⏳ Waiting for transaction confirmation...
✅ Transaction confirmed in block: 12345678
🔗 View on BaseScan: https://basescan.org/tx/0xdef456...

👀 Monitoring cross-chain transaction...
This may take several minutes...
[10:30:15] 📊 Status: origin_tx_succeeded
[10:32:20] 📊 Status: bridge_pending
[10:34:45] 📊 Status: destination_tx_succeeded
🔗 2 transactions found:
  1. Base: https://basescan.org/tx/0xdef456...
  2. Solana: https://solscan.io/tx/5uHR...

🏁 Final Status: destination_tx_succeeded
🎉 Cross-chain swap completed successfully!
```

## What It Does

This project provides four cross-chain swap examples that demonstrate the complete flow from quote to execution:

### Available Scripts

- **`npm run evm-to-solana`** - WETH on Base → USDC on Solana
- **`npm run solana-to-evm`** - WSOL on Solana → USDC on Base
- **`npm run solana-to-evm-with-gas-payer`** - WSOL on Solana → USDC on Base (with gas payer)
- **`npm run evm-to-evm`** - WETH on Base → USDC on Arbitrum

### Process Flow (All Examples)

Each script performs these steps:

1. **Configuration Loading** - Validates environment variables and private key formats
2. **Quote Fetching** - Gets optimal cross-chain pricing and routing from 0x API
3. **Safety Checks** - Validates token balances and receiver addresses
4. **Token Approvals** - Handles ERC-20 approvals automatically when needed
5. **Transaction Execution** - Signs and sends transactions on the origin chain
6. **Real-time Monitoring** - Tracks bridge progress with live status updates until completion
7. **Final Settlement** - Confirms successful token delivery on destination chain

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Create a `.env` File

Copy the example from [.env.example](./.env.example) into a new `.env` file:

| Variable Name             | Description                                           | Required | Default Value                         |
| ------------------------- | ----------------------------------------------------- | -------- | ------------------------------------- |
| `ZEROEX_API_KEY`          | API Key from [0x Dashboard](https://dashboard.0x.org) | ✅       | _None_                                |
| `EVM_PRIVATE_KEY`         | EVM private key (64 hex chars, optional 0x prefix)    | ❌       | _Quote-only mode_                     |
| `SOLANA_PRIVATE_KEY`      | Solana private key (44-character base58 format)       | ❌       | _Quote-only mode_                     |
| `SOLANA_RECEIVER_ADDRESS` | Solana address to receive tokens (base58 format)      | ❌\*     | _Uses default address_                |
| `EVM_RECEIVER_ADDRESS`    | EVM address to receive tokens (hex format)            | ❌\*     | _Uses default address_                |
| `BASE_RPC_URL`            | Base network RPC endpoint                             | ❌       | `https://mainnet.base.org`            |
| `ARBITRUM_RPC_URL`        | Arbitrum network RPC endpoint                         | ❌       | `https://arb1.arbitrum.io/rpc`        |
| `SOLANA_RPC_URL`          | Solana RPC endpoint                                   | ❌       | `https://api.mainnet-beta.solana.com` |

_\*Required when executing transactions to prevent accidental sends to default addresses_

### 3. Run the Examples

```bash
# EVM to Solana cross-chain swap
npm run evm-to-solana

# Solana to EVM cross-chain swap
npm run solana-to-evm

# Solana to EVM swap with gas payer
npm run solana-to-evm-with-gas-payer

# EVM to EVM swap (Base ↔ Arbitrum)
npm run evm-to-evm
```

## Notes

- **Token amounts**: Hardcoded to small amounts (0.001 tokens) for safety - modify in source files
- **Slippage**: Set to 1% (100 basis points) - adjustable per swap
- **Monitoring**: 10-minute timeout with 5-second polling intervals
- **Validation**: Strict private key format validation (64-char hex for EVM, 44-char base58 for Solana)
