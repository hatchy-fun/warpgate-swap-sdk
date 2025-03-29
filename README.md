# WarpGate Swap SDK

[![npm version](https://img.shields.io/npm/v/warpgate-swap-sdk.svg)](https://www.npmjs.com/package/warpgate-swap-sdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-4.9%2B-blue)](https://www.typescriptlang.org/)

TypeScript SDK for interacting with WarpGate Swap on Movement blockchain. This SDK provides a simple and intuitive way to integrate WarpGate Swap functionality into your applications.

## Features

- Token Swapping with Best Price Routing
- Liquidity Pool Management
- Price Calculations and Pool Information
- Type-safe with TypeScript
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

### 3. Add Liquidity

```typescript
// Add liquidity with 0.5% slippage tolerance
const addLiquidityParams = await sdk.addLiquidity({
  tokenA: USDC,
  tokenB: USDT,
  amountA: "1.0",     // 1.0 USDC
  amountB: "1.0",     // 1.0 USDT
  slippage: 0.5,      // 0.5% slippage
  fee: "30",         // 0.3% fee (only needed when creating new pool)
});

// Submit transaction using the generated parameters
const transaction = await aptos.generateTransaction(account.address, addLiquidityParams);
const pendingTx = await aptos.signAndSubmitTransaction(account, transaction);
const txResult = await aptos.waitForTransaction(pendingTx.hash);
```

### 4. Swap Tokens

```typescript
// Swap tokens with 0.5% slippage tolerance
const swapParams = await sdk.swap({
  fromToken: USDC,
  toToken: USDT,
  amount: "0.1",      // Swap 0.1 USDC
  exactIn: true,      // Exact input amount
  slippage: 0.5,      // 0.5% slippage
});

// Submit transaction
const transaction = await aptos.generateTransaction(account.address, swapParams);
const pendingTx = await aptos.signAndSubmitTransaction(account, transaction);
const txResult = await aptos.waitForTransaction(pendingTx.hash);
```

### 5. Remove Liquidity

```typescript
// Remove liquidity with 0.5% slippage tolerance
const removeLiquidityParams = await sdk.removeLiquidity({
  tokenA: USDC,
  tokenB: USDT,
  lpAmount: "0.5",    // Remove 50% of LP tokens
  slippage: 0.5,      // 0.5% slippage
});

// Submit transaction
const transaction = await aptos.generateTransaction(account.address, removeLiquidityParams);
const pendingTx = await aptos.signAndSubmitTransaction(account, transaction);
const txResult = await aptos.waitForTransaction(pendingTx.hash);
```

## Error Handling

The SDK provides clear error messages for common scenarios:

1. Non-existent Liquidity Pool:
```typescript
try {
  const swapParams = await sdk.swap({
    fromToken: USDC,
    toToken: USDT,
    amount: "0.1",
    slippage: 0.5,
  });
} catch (error) {
  if (error.message.includes("Pool doesn't exist")) {
    console.log("Liquidity pool does not exist yet. Create it first!");
  }
}
```

2. Missing Fee for New Pool:
```typescript
try {
  const addLiquidityParams = await sdk.addLiquidity({
    tokenA: USDC,
    tokenB: USDT,
    amountA: "1.0",
    amountB: "1.0",
    slippage: 0.5,
    // fee parameter missing
  });
} catch (error) {
  if (error.message.includes("must specify a fee")) {
    console.log("Fee required when creating a new pool");
  }
}
```

## Development

### Setup

```bash
# Clone the repository
git clone https://github.com/hatchy-fun/warpgate-swap-sdk.git
cd warpgate-swap-sdk

# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm test
```

### Scripts

- `npm run build` - Build the SDK
- `npm test` - Run tests
- `npm run clean` - Clean build artifacts
- `npm run format` - Format code with Prettier
- `npm run lint` - Lint code with ESLint

### Examples

Check out the [examples](./examples) directory for more detailed examples:

1. `simplified-operations.ts` - Basic operations using USDC and USDT
2. `simplified-operations-fwog.ts` - Basic operations using FWOGBERRY and BUTTER
3. `swap-operations.ts` - Advanced swap operations with detailed configurations

To run an example:

```bash
cd examples
npm install
npx ts-node simplified-operations.ts
```
- `npm test` - Run tests
- `npm run lint` - Lint the code
- `npm run format` - Format the code

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Process

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Security

For security concerns, please open a security advisory on GitHub.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

- [GitHub Issues](https://github.com/hatchy-fun/warpgate-swap-sdk/issues)
- [Documentation](https://github.com/hatchy-fun/warpgate-swap-sdk#readme)
