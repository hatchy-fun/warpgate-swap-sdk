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
- Comprehensive Documentation
- Full Test Coverage

## Installation

```bash
npm install warpgate-swap-sdk @aptos-labs/ts-sdk
```

## Core Operations

### 1. Initialize Client

```typescript
import { Aptos, AptosConfig, Network } from "@aptos-labs/ts-sdk";

// For Movement Network
export const config = new AptosConfig({
  network: Network.CUSTOM,
  fullnode: "https://mainnet.movementnetwork.xyz/v1",
  indexer: "https://indexer.mainnet.movementnetwork.xyz/v1/graphql",
});

export const aptos = new Aptos(config);
```

### 2. Token Swap

```typescript
import {
  Coin,
  ChainId,
  Pair,
  Route,
  Trade,
  TradeType,
  Percent,
  Router,
  CurrencyAmount,
} from "warpgate-swap-sdk";

// Initialize tokens
const USDC = new Coin(
  ChainId.MOVE_MAINNET,
  "0x83121c9f9b0527d1f056e21a950d6bf3b9e9e2e8353d0e95ccea726713cbea39",
  8,
  "USDC.e",
  "USD Coin"
);

const USDT = new Coin(
  ChainId.MOVE_MAINNET,
  "0x447721a30109c662dde9c73a0c2c9c9c459fb5e5a9c92f03c50fa69737f5d08d",
  8,
  "USDT.e",
  "USDT"
);

// Get current reserves
const { reserve_x, reserve_y } = await Pair.getReserves(aptos, USDC, USDT);
console.log(`USDC Reserve: ${reserve_x}`);
console.log(`USDT Reserve: ${reserve_y}`);

// Create pair and route
const pair = new Pair(
  CurrencyAmount.fromRawAmount(USDC, reserve_x),
  CurrencyAmount.fromRawAmount(USDT, reserve_y)
);
const route = new Route([pair], USDC, USDT);

// Create a trade with 1 USDC
const trade = Trade.exactIn(
  route,
  CurrencyAmount.fromRawAmount(USDC, "1000000"), // 1 USDC (6 decimals)
  9975 // 0.25% fee
);

// Execute the swap with 0.5% slippage tolerance
const router = new Router();
const swapParams = router.swapCallParameters(trade, {
  allowedSlippage: new Percent("50", "10000"), // 0.5%
});

// Submit transaction
const transaction = await client.generateTransaction(
  account.address,
  swapParams
);
const pendingTx = await client.signAndSubmitTransaction(account, transaction);
const txResult = await client.waitForTransaction(pendingTx.hash);
```

### 3. Add Liquidity

```typescript
import { Router } from "warpgate-swap-sdk";

const router = new Router();

// Add liquidity parameters
const addLiquidityParams = router.addLiquidityParameters(
  "100000000", // Amount of token X (e.g., 1 USDC with 6 decimals)
  "100000000", // Amount of token Y (e.g., 1 MOVE with 8 decimals)
  "99500000", // Minimum amount of token X (0.5% slippage)
  "99500000", // Minimum amount of token Y (0.5% slippage)
  "0x83121c9f9b0527d1f056e21a950d6bf3b9e9e2e8353d0e95ccea726713cbea39", // Token X address (USDC.e)
  "0x447721a30109c662dde9c73a0c2c9c9c459fb5e5a9c92f03c50fa69737f5d08d", // Token Y address (USDT.e)
  "30" // Fee in basis points (0.3%)
);

// Submit transaction
const transaction = await client.generateTransaction(
  account.address,
  addLiquidityParams
);
const pendingTx = await client.signAndSubmitTransaction(account, transaction);
const txResult = await client.waitForTransaction(pendingTx.hash);
```

### 4. Remove Liquidity

```typescript
import { Router } from "warpgate-swap-sdk";

const router = new Router();

// Remove liquidity parameters
const removeLiquidityParams = router.removeLiquidityParameters(
  "1000000", // LP token amount to remove
  "99500000", // Minimum amount of token X to receive (0.5% slippage)
  "99500000", // Minimum amount of token Y to receive (0.5% slippage)
  "0x83121c9f9b0527d1f056e21a950d6bf3b9e9e2e8353d0e95ccea726713cbea39", // Token X address (USDC.e)
  "0x447721a30109c662dde9c73a0c2c9c9c459fb5e5a9c92f03c50fa69737f5d08d" // Token Y address (USDT.e)
);

// Submit transaction
const transaction = await client.generateTransaction(
  account.address,
  removeLiquidityParams
);
const pendingTx = await client.signAndSubmitTransaction(
  account,
  removeLiquidityParams
);
const txResult = await client.waitForTransaction(pendingTx.hash);
```

### 5. Advanced Swap Operations

```typescript
import { Router, Trade, TradeType } from "warpgate-swap-sdk";

// For exact input swaps (you specify exact input amount)
const exactInputTrade = Trade.exactIn(route, inputAmount, 9975); // 0.25% fee
const exactInputParams = router.swapCallParameters(exactInputTrade, {
  allowedSlippage: new Percent("50", "10000"), // 0.5%
});

// For exact output swaps (you specify exact output amount)
const exactOutputTrade = Trade.exactOut(route, outputAmount, 9975); // 0.25% fee
const exactOutputParams = router.swapCallParameters(exactOutputTrade, {
  allowedSlippage: new Percent("50", "10000"), // 0.5%
});
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
