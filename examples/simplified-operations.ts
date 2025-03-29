import { Aptos, AptosConfig, Network } from "@aptos-labs/ts-sdk";
import { WarpGateSDK } from "warpgate-swap-sdk";

// Initialize Aptos client
const config = new AptosConfig({
  network: Network.CUSTOM,
  fullnode: "https://mainnet.movementnetwork.xyz/v1",
  indexer: "https://indexer.mainnet.movementnetwork.xyz/v1/graphql",
});
const aptos = new Aptos(config);

// Initialize SDK
const sdk = new WarpGateSDK(aptos);

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

async function demonstrateSimplifiedOperations() {
  console.log("Demonstrating Simplified WarpGate Swap SDK Operations\n");

  // 1. Adding Liquidity
  console.log("1. Adding Liquidity Transaction Parameters:");
  const addLiquidityParams = await sdk.addLiquidity({
    tokenA: USDC,
    tokenB: USDT,
    amountA: "1.0", // 1 USDC
    amountB: "1.0", // 1 USDT
    slippage: 0.5, // 0.5% slippage
    fee: "30", // 0.3% fee for new pools (optional, will use default if not specified)
  });
  console.log(JSON.stringify(addLiquidityParams, null, 2));
  console.log("\n-------------------\n");

  // 2. Swap Transaction
  console.log("2. Swap Transaction Parameters:");
  const swapParams = await sdk.swap({
    fromToken: USDC,
    toToken: USDT,
    amount: "1.0", // Swap 1 USDC
    slippage: 0.5, // 0.5% slippage
    exactIn: true, // Exact input swap
  });
  console.log(JSON.stringify(swapParams, null, 2));
  console.log("\n-------------------\n");

  // 3. Remove Liquidity
  console.log("3. Remove Liquidity Transaction Parameters:");
  const removeLiquidityParams = await sdk.removeLiquidity({
    tokenA: USDC,
    tokenB: USDT,
    lpAmount: "0.01", // Remove 0.01 LP tokens
    slippage: 0.5, // 0.5% slippage
  });
  console.log(JSON.stringify(removeLiquidityParams, null, 2));
}

// Run the example
demonstrateSimplifiedOperations().catch((error) => {
  console.error("Error:", error);
});
