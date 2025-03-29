import { Aptos, AptosConfig, Network } from "@aptos-labs/ts-sdk";
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
  6,
  "USDC.e",
  "USD Coin"
);

const USDT = new Coin(
  ChainId.MOVE_MAINNET,
  "0x447721a30109c662dde9c73a0c2c9c9c459fb5e5a9c92f03c50fa69737f5d08d",
  6,
  "USDT.e",
  "USDT"
);

// Initialize Aptos client
const config = new AptosConfig({
  network: Network.CUSTOM,
  fullnode: "https://mainnet.movementnetwork.xyz/v1",
  indexer: "https://indexer.mainnet.movementnetwork.xyz/v1/graphql",
});
const aptos = new Aptos(config);

async function demonstrateOperations() {
  console.log("Demonstrating WarpGate Swap SDK Operations\n");

  // 1. Adding Liquidity
  console.log("1. Adding Liquidity Transaction Parameters:");

  // Default fee for new pools (30 basis points = 0.3%)
  const DEFAULT_FEE = "30";

  // Try to get pool's fee, if pool exists use that fee,
  // otherwise use the default fee for new pool creation
  let poolFee = DEFAULT_FEE;
  try {
    const metadata = await Pair.getPairMetadata(aptos, USDC, USDT);
    poolFee = metadata.fee.toString();
    console.log(`Pool exists, using pool fee: ${poolFee} basis points`);
  } catch (error) {
    console.log(
      `Pool doesn't exist, using default fee: ${poolFee} basis points`
    );
  }

  const addLiquidityParams = Router.addLiquidityParameters(
    "100000000", // Amount of USDC (1 USDC with 8 decimals)
    "100000000", // Amount of USDT (1 USDT with 8 decimals)
    "99500000", // Minimum amount of USDC (0.5% slippage)
    "99500000", // Minimum amount of USDT (0.5% slippage)
    USDC.address, // USDC address
    USDT.address, // USDT address
    poolFee // Use pool's fee if exists, otherwise user provided fee
  );
  console.log(JSON.stringify(addLiquidityParams, null, 2));
  console.log("\n-------------------\n");

  // 2. Swap Transaction
  console.log("2. Swap Transaction Parameters:");

  // For swaps, we need both:
  // 1. Pool reserves (current balance of both tokens)
  // 2. Pool fee (for calculating price impact)
  // If pool doesn't exist, we can't perform the swap
  let reserves;
  let fee;
  try {
    // Fetch both reserves and metadata in parallel
    [reserves, { fee }] = await Promise.all([
      Pair.getReserves(aptos, USDC, USDT),
      Pair.getPairMetadata(aptos, USDC, USDT),
    ]);
  } catch (error) {
    throw new Error("Cannot perform swap: Pool does not exist");
  }

  console.log(`Pool fee: ${fee} basis points`);

  // Create pair and route
  const pair = new Pair(
    CurrencyAmount.fromRawAmount(USDC, reserves.reserve_x),
    CurrencyAmount.fromRawAmount(USDT, reserves.reserve_y)
  );
  const route = new Route([pair], USDC, USDT);

  // Convert fee to basis points format for swaps (e.g., 30 -> 9970)
  const swapFee = BigInt(10000 - Number(fee));
  console.log(`Converting fee ${fee} to basis points: ${swapFee}`);

  // Create a trade with 1 USDC using converted fee
  const trade = Trade.exactIn(
    route,
    CurrencyAmount.fromRawAmount(USDC, BigInt("100000000")), // 1 USDC
    swapFee // Use converted fee (9970 for 0.3%)
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
