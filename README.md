# Warpgate Swap SDK

A comprehensive SDK for building decentralized exchange applications on the Aptos blockchain using Warpgate Swap. This SDK provides essential tools for token swaps, liquidity management, and price calculations.

## Installation

```bash
npm install warpgate-swap-sdk
```

## Features

- **Aptos Blockchain Integration**: Native support for Aptos blockchain with type-safe Move contract interactions
- **Token Management**: Create and manage tokens with support for native and custom coins
- **Swap Operations**: Execute token swaps with optimal routing and slippage protection
- **Liquidity Pool Management**: Add, remove, and manage liquidity positions
- **Price Calculations**: Accurate price impact and optimal path calculations
- **Type Safety**: Full TypeScript support with comprehensive type definitions

## Usage

### Token Operations

```typescript
import { 
  Coin,
  ChainId,
  Pair,
  Route,
  Trade,
  TradeType
} from 'warpgate-swap-sdk'

// Create tokens
const tokenA = new Coin(
  ChainId.TESTNET,
  "0x1::coin::CoinA",
  8,
  "COINA",
  "Coin A"
)

const tokenB = new Coin(
  ChainId.TESTNET,
  "0x1::coin::CoinB",
  8,
  "COINB",
  "Coin B"
)

// Create a pair
const pair = new Pair(tokenA, tokenB)

// Create a route
const route = new Route([pair], tokenA, tokenB)

// Create a trade
const trade = new Trade(
  route,
  CurrencyAmount.fromRawAmount(tokenA, "1000000"),
  TradeType.EXACT_INPUT
)
```

### Price Calculations

```typescript
// Get execution price
const executionPrice = trade.executionPrice.toSignificant(6)
console.log(`Execution Price: ${executionPrice}`)

// Calculate price impact
const priceImpact = trade.priceImpact.toSignificant(6)
console.log(`Price Impact: ${priceImpact}%`)
```

## Development

### Building the Package

```bash
npm install
npm run build
```

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Update snapshots
npm test -- -u
```

## Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

## License

MIT License - see the [LICENSE](LICENSE) file for details
