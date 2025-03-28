import {
  Coin,
  ChainId,
  Pair,
  Route,
  Trade,
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

async function demonstrateOperations() {
  console.log("Demonstrating WarpGate Swap SDK Operations\n");

  // 1. Adding Liquidity
  console.log("1. Adding Liquidity Transaction Parameters:");
  const addLiquidityParams = Router.addLiquidityParameters(
    "100000000", // Amount of USDC (1 USDC with 8 decimals)
    "100000000", // Amount of USDT (1 USDT with 8 decimals)
    "99500000", // Minimum amount of USDC (0.5% slippage)
    "99500000", // Minimum amount of USDT (0.5% slippage)
    USDC.address, // USDC address
    USDT.address, // USDT address
    "30" // Fee in basis points (0.3%)
  );
  console.log(JSON.stringify(addLiquidityParams, null, 2));
  console.log("\n-------------------\n");

  // 2. Swap Transaction
  console.log("2. Swap Transaction Parameters:");

  // Create a pair and route
  const pair = new Pair(
    CurrencyAmount.fromRawAmount(USDC, BigInt("100000000")), // 1 USDC
    CurrencyAmount.fromRawAmount(USDT, BigInt("100000000")) // 1 USDT
  );
  const route = new Route([pair], USDC, USDT);

  // Create a trade with 1 USDC
  const trade = Trade.exactIn(
    route,
    CurrencyAmount.fromRawAmount(USDC, BigInt("100000000")), // 1 USDC
    BigInt(9975) // 0.25% fee
  );

  // Get swap parameters with 0.5% slippage tolerance
  const swapParams = Router.swapCallParameters(trade, {
    allowedSlippage: new Percent("50", "10000"), // 0.5%
  });
  console.log(JSON.stringify(swapParams, null, 2));
  console.log("\n-------------------\n");

  // 3. Removing Liquidity
  console.log("3. Remove Liquidity Transaction Parameters:");
  const removeLiquidityParams = Router.removeLiquidityParameters(
    "1000000", // LP token amount to remove
    "99500000", // Minimum amount of USDC to receive (0.5% slippage)
    "99500000", // Minimum amount of USDT to receive (0.5% slippage)
    USDC.address, // USDC address
    USDT.address // USDT address
  );
  console.log(JSON.stringify(removeLiquidityParams, null, 2));
}

// Run the demonstration
demonstrateOperations().catch(console.error);
