/* eslint-disable @typescript-eslint/no-unused-vars */
// @ts-nocheck
/**
 * WarpGate Swap SDK Example
 * This example demonstrates how to use the WarpGate Swap SDK for common operations:
 * - Checking pool existence
 * - Adding liquidity (both new and existing pools)
 * - Swapping tokens
 * - Removing liquidity
 */

import {
  Aptos,
  AptosConfig,
  Network,
  Ed25519PrivateKey,
  InputGenerateTransactionPayloadData,
} from "@aptos-labs/ts-sdk";
import { WarpGateSDK } from "warpgate-swap-sdk";

/**
 * Token Definitions
 * Each token requires:
 * - address: The token's contract address
 * - decimals: Number of decimal places
 * - symbol: Token symbol
 * - name: Token name
 */
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

/**
 * SDK Initialization
 * 1. Configure Aptos client with network details
 * 2. Initialize Aptos client
 * 3. Create WarpGate SDK instance
 */
const config = new AptosConfig({
  network: Network.CUSTOM,
  fullnode: "https://mainnet.movementnetwork.xyz/v1",
  indexer: "https://indexer.mainnet.movementnetwork.xyz/v1/graphql",
});
const aptos = new Aptos(config);
const sdk = new WarpGateSDK(aptos);

/**
 * Transaction Helper Functions
 */

// Waits for transaction confirmation with retry logic
async function waitForTransactionWithRetry(
  hash: string,
  maxAttempts = 10
): Promise<any> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      console.log(`Attempt ${attempt}/${maxAttempts} to fetch transaction...`);
      const txResult = await aptos.waitForTransaction({
        transactionHash: hash,
      });
      return txResult;
    } catch (error: any) {
      if (attempt === maxAttempts) throw error;
      if (error.status === 404) {
        console.log("Transaction not found yet, waiting 5 seconds...");
        await new Promise((resolve) => setTimeout(resolve, 5000));
        continue;
      }
      throw error;
    }
  }
}

// Initializes an account using a private key
async function initializeAccount() {
  // IMPORTANT: Replace with your own private key or use your preferred wallet integration
  const PRIVATE_KEY = "PRIVATE_KEY";
  const privateKeyBytes = new Ed25519PrivateKey(PRIVATE_KEY);
  const account = await aptos.deriveAccountFromPrivateKey({
    privateKey: privateKeyBytes,
  });
  console.log("Account Address:", account.accountAddress.toString());
  return account;
}

// Executes a transaction and handles the response
async function executeTransaction(
  account: any,
  payload: any,
  operationName: string
) {
  console.log(`\n${operationName} payload:`, payload);

  // Build transaction
  console.log("\nCreating transaction...");
  const transaction = await aptos.transaction.build.simple({
    sender: account.accountAddress,
    data: payload as InputGenerateTransactionPayloadData,
  });

  // Sign and submit
  console.log("\nSigning and submitting transaction...");
  const committedTx = await aptos.signAndSubmitTransaction({
    signer: account,
    transaction,
  });
  console.log("Transaction Hash:", committedTx.hash);

  // Wait for confirmation
  console.log("\nWaiting for transaction confirmation (with retry)...");
  const txResult = await waitForTransactionWithRetry(committedTx.hash);

  if (txResult.success) {
    console.log("Transaction succeeded!");
    console.log(
      "View on explorer: https://explorer.aptoslabs.com/txn/",
      committedTx.hash
    );
  } else {
    console.error("Transaction failed!");
    console.error("Failure details:", txResult.vm_status);
  }

  return txResult;
}

/**
 * Core SDK Operations
 */

// Check if a pool exists and get its information
async function getPoolInfo(tokenA, tokenB) {
  console.log("\n=== Checking Pool Info ===");
  const poolInfo = await sdk.getPoolInfo(tokenA, tokenB);
  console.log("Pool exists:", poolInfo.exists);
  if (poolInfo.exists) {
    console.log("Pool fee:", poolInfo?.fee?.toString());
    console.log("Reserve A:", poolInfo?.reserveA);
    console.log("Reserve B:", poolInfo?.reserveB);
  }
  return poolInfo;
}

// Add liquidity to an existing pool
async function addLiquidity(tokenA, tokenB) {
  console.log("\n=== Adding Liquidity to Existing Pool ===");
  const account = await initializeAccount();

  // For existing pools, you only need to specify one amount
  // The other amount will be calculated based on the current pool ratio
  const addLiquidityParams = await sdk.addLiquidity({
    tokenA,
    tokenB,
    amountA: "1", // Amount of tokenA to add
    slippage: 0.5, // Maximum price slippage tolerance (0.5%)
  });
  return executeTransaction(account, addLiquidityParams, "Add Liquidity");
}

// Create a new liquidity pool and add initial liquidity
async function addLiquidityForNewPool(tokenA, tokenB) {
  console.log("\n=== Creating New Pool and Adding Initial Liquidity ===");
  const account = await initializeAccount();

  // For new pools, you must specify:
  // 1. Both token amounts to establish the initial price ratio
  // 2. The pool fee (in basis points, e.g., 10 = 0.1%)
  const addLiquidityParams = await sdk.addLiquidity({
    tokenA,
    tokenB,
    amountA: "1000", // Initial tokenA amount
    amountB: "1000", // Initial tokenB amount
    fee: "10", // Pool fee in basis points (0.1%)
    slippage: 0.5, // Maximum price slippage tolerance (0.5%)
  });
  return executeTransaction(
    account,
    addLiquidityParams,
    "Create Pool and Add Liquidity"
  );
}

// Swap tokens using the best available route
async function swap(fromToken, toToken) {
  console.log("\n=== Swapping Tokens ===");
  const account = await initializeAccount();

  // The SDK automatically finds the best route for the swap
  const swapParams = await sdk.swap({
    fromToken,
    toToken,
    amount: "1", // Amount of fromToken to swap
    slippage: 0.5, // Maximum price slippage tolerance (0.5%)
  });

  return executeTransaction(account, swapParams, "Swap");
}

// Remove liquidity from a pool
async function removeLiquidity(tokenA, tokenB) {
  console.log("\n=== Removing Liquidity ===");
  const account = await initializeAccount();

  // Remove liquidity and receive both tokens back
  const removeLiquidityParams = await sdk.removeLiquidity({
    tokenA,
    tokenB,
    lpAmount: "1", // Amount of LP tokens to burn
    slippage: 0.5, // Maximum price slippage tolerance (0.5%)
  });

  return executeTransaction(account, removeLiquidityParams, "Remove Liquidity");
}

/**
 * Example Usage
 * This demonstrates a complete workflow:
 * 1. Check if pool exists
 * 2. Add liquidity (create pool if needed)
 * 3. Perform a swap
 * 4. Remove liquidity
 */
async function main() {
  try {
    const tokenA = BUTTER;
    const tokenB = FWOGBERRY;

    // Step 1: Check pool existence and get info
    console.log("\n=== Starting WarpGate Swap Example ===");
    const poolInfo = await getPoolInfo(tokenA, tokenB);

    // Step 2: Add liquidity
    if (poolInfo.exists) {
      console.log("\nPool exists, adding liquidity to existing pool...");
      await addLiquidity(tokenA, tokenB);
    } else {
      console.log("\nPool doesn't exist, creating new pool...");
      await addLiquidityForNewPool(tokenA, tokenB);
    }

    // Step 3: Perform a swap
    console.log("\nPerforming a swap...");
    await swap(tokenA, tokenB);

    // Step 4: Remove liquidity
    console.log("\nRemoving liquidity...");
    await removeLiquidity(tokenA, tokenB);

    console.log("\n=== Example Complete ===");
  } catch (error: any) {
    console.error("\nError occurred:");
    if (error.message) console.error("Message:", error.message);
    if (error.response?.data)
      console.error("Response data:", error.response.data);
    throw error; // Re-throw to see the full stack trace
  }
}

// Run the example
main().catch(console.error);
