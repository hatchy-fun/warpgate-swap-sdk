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
const FWOGBERRY = {
  address: "0x0cac10330f33921f12fbbec019dccaf7cb72440eb1e90192c3b36a38f9fb8362",
  decimals: 8,
  symbol: "FWOGBERRY",
  name: "Strawberry Fwog",
};

const BUTTER = {
  address: "0x5263448a04a80296d326ee3a9a66c4ee6fff6452c24f6939e4d373fe74bcd134",
  decimals: 8,
  symbol: "BUTTER",
  name: "BUTTER",
};

async function demonstrateSimplifiedOperations() {
  console.log("Demonstrating Simplified WarpGate Swap SDK Operations\n");

  // 1. Add Liquidity
  console.log("1. Adding Liquidity Transaction Parameters:");
  const addLiquidityParams = await sdk.addLiquidity({
    tokenA: FWOGBERRY,
    tokenB: BUTTER,
    amountA: "1.0", // 1.0 FWOGBERRY
    amountB: "1.0", // 1.0 BUTTER
    slippage: 0.5, // 0.5% slippage
    fee: "30", // 0.3% fee
  });
  console.log(JSON.stringify(addLiquidityParams, null, 2));

  console.log("\n-------------------\n");

  // 2. Swap
  console.log("2. Swap Transaction Parameters:");
  try {
    const swapParams = await sdk.swap({
      fromToken: FWOGBERRY,
      toToken: BUTTER,
      amount: "0.1", // Swap 0.1 FWOGBERRY
      exactIn: true, // Exact input amount
      slippage: 0.5, // 0.5% slippage
    });
    console.log(JSON.stringify(swapParams, null, 2));
  } catch (error) {
    console.error(error);
  }

  console.log("\n-------------------\n");

  // 3. Remove Liquidity
  console.log("3. Remove Liquidity Transaction Parameters:");
  try {
    const removeLiquidityParams = await sdk.removeLiquidity({
      tokenA: FWOGBERRY,
      tokenB: BUTTER,
      lpAmount: "0.5", // Remove 0.5 LP tokens
      slippage: 0.5, // 0.5% slippage
    });
    console.log(JSON.stringify(removeLiquidityParams, null, 2));
  } catch (error) {
    console.error(error);
  }
}

// Run the example
demonstrateSimplifiedOperations().catch((error) => {
  console.error("Error:", error);
});
