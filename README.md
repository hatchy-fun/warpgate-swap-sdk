# WarpGate Swap SDK

[![npm version](https://img.shields.io/npm/v/warpgate-swap-sdk.svg)](https://www.npmjs.com/package/warpgate-swap-sdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-4.9%2B-blue)](https://www.typescriptlang.org/)

TypeScript SDK for interacting with WarpGate Swap on Movement blockchain. This SDK provides a simple and intuitive way to integrate WarpGate Swap functionality into your applications.

## Features

- Token Swapping with Best Price Routing
- Liquidity Pool Management
- Price Calculations and Pool Information
- Type-safe Implementation
- Simple and Intuitive Interface
- Comprehensive Error Handling

## Installation

```bash
npm install warpgate-swap-sdk @aptos-labs/ts-sdk
```

## Quick Start

### 1. Initialize SDK

```typescript
import { Aptos, AptosConfig, Network } from "@aptos-labs/ts-sdk";
import { WarpGateSDK } from "warpgate-swap-sdk";

// Initialize Aptos client for Movement Network
const config = new AptosConfig({
  network: Network.CUSTOM,
  fullnode: "https://mainnet.movementnetwork.xyz/v1",
  indexer: "https://indexer.mainnet.movementnetwork.xyz/v1/graphql",
});
const aptos = new Aptos(config);

// Initialize WarpGate SDK
const sdk = new WarpGateSDK(aptos);
```

### 2. Define Your Tokens

```typescript
// Token definitions
const USDC = {
  address: "0x83121c9f9b0527d1f056e21a950d6bf3b9e9e2e8353d0e95ccea726713cbea39",
  decimals: 6,
  symbol: "USDC.e",
  name: "USD Coin",
};

const USDT = {
  address: "0x447721a30109c662dde9c73a0c2c9c9c459fb5e5a9c92f03c50fa69737f5d08d",
  decimals: 6,
  symbol: "USDT.e",
  name: "USDT",
};
```

### 3. Check Pool Information

```typescript
// Get pool information and check if it exists
const poolInfo = await sdk.getPoolInfo(tokenA, tokenB);
// Returns: { exists: boolean, fee?: bigint, reserveA?: string, reserveB?: string }
```

### 4. Add Liquidity

```typescript
// For existing pools:
// Only need to specify one amount, the other is calculated automatically
const addToExistingPool = await sdk.addLiquidity({
  tokenA,
  tokenB,
  amountA: "1", // Amount of tokenA to add
  slippage: 0.5, // Maximum price slippage tolerance (0.5%)
});

// For new pools:
// Must specify both amounts and pool fee
const createNewPool = await sdk.addLiquidity({
  tokenA,
  tokenB,
  amountA: "1000", // Initial tokenA amount
  amountB: "1000", // Initial tokenB amount
  fee: "10", // Pool fee in basis points (0.1%)
  slippage: 0.5, // Maximum price slippage tolerance (0.5%)
});
// Both return: InputGenerateTransactionPayloadData for creating the transaction
```

### 5. Swap Tokens

```typescript
// The SDK automatically finds the best route for the swap
const swapParams = await sdk.swap({
  fromToken: tokenA,
  toToken: tokenB,
  amount: "1", // Amount of fromToken to swap
  slippage: 0.5, // Maximum price slippage tolerance (0.5%)
});
// Returns: InputGenerateTransactionPayloadData for creating the transaction
```

### 6. Remove Liquidity

```typescript
// Remove liquidity and receive both tokens back
const removeLiquidityParams = await sdk.removeLiquidity({
  tokenA,
  tokenB,
  lpAmount: "1", // Amount of LP tokens to burn
  slippage: 0.5, // Maximum price slippage tolerance (0.5%)
});
// Returns: InputGenerateTransactionPayloadData for creating the transaction
```

## Complete Example

Check out our [example implementation](./examples/sdk-example.ts) that demonstrates:

1. Checking pool existence
2. Adding liquidity (both new and existing pools)
3. Performing swaps
4. Removing liquidity

## Development

```bash
# Clone the repository
git clone https://github.com/hatchy-fun/warpgate-swap-sdk.git
cd warpgate-swap-sdk

# Install dependencies
npm install

# Build the project
npm run build
```

### Available Scripts

- `npm run build` - Build the SDK
- `npm run clean` - Clean build artifacts
- `npm run format` - Format code with Prettier
- `npm run lint` - Lint code with ESLint

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
