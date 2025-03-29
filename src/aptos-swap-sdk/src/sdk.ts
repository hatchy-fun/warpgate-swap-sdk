import { Coin } from "./coin";
import { ChainId } from "./constants";
import { Pair } from "./pair";
import { Route } from "./route";
import { Trade } from "./trade";
import { Router } from "./router";
import { CurrencyAmount, Percent } from "../../swap-sdk-core/src";

export * from "./coin";
export * from "./constants";
export * from "./pair";
export * from "./route";
export * from "./trade";
export * from "./router";

export interface TokenInfo {
  address: string;
  decimals: number;
  symbol: string;
  name?: string;
}

export interface AddLiquidityParams {
  tokenA: TokenInfo;
  tokenB: TokenInfo;
  amountA: string; // Human readable amount
  amountB: string; // Human readable amount
  slippage?: number; // Default 0.5%
  fee?: string; // Fee in basis points (e.g., "30" for 0.3%). Used only when creating new pool.
}

export interface SwapParams {
  fromToken: TokenInfo;
  toToken: TokenInfo;
  amount: string; // Human readable amount
  slippage?: number; // Default 0.5%
  exactIn?: boolean; // Default true (exactIn)
}

export interface RemoveLiquidityParams {
  tokenA: TokenInfo;
  tokenB: TokenInfo;
  lpAmount: string; // Human readable LP token amount
  slippage?: number; // Default 0.5%
}

export class WarpGateSDK {
  constructor(
    private aptos: any,
    private chainId = ChainId.MOVE_MAINNET
  ) {}

  private createCoin(tokenInfo: TokenInfo): Coin {
    return new Coin(
      this.chainId,
      tokenInfo.address,
      tokenInfo.decimals,
      tokenInfo.symbol,
      tokenInfo.name || tokenInfo.symbol
    );
  }

  private parseAmount(amount: string, decimals: number): bigint {
    // Convert human readable amount to raw amount
    const [whole, fraction = ""] = amount.split(".");
    const paddedFraction = fraction.padEnd(decimals, "0");
    const rawAmount = `${whole}${paddedFraction}`;
    return BigInt(rawAmount);
  }

  private calculateMinimumAmount(
    amount: bigint,
    slippagePercent: number
  ): bigint {
    // Convert slippage to Percent
    const slippage = new Percent(Math.floor(slippagePercent * 100), 10000); // Convert to basis points
    const minimumAmount =
      (amount * BigInt(10000n - BigInt(slippage.numerator))) / BigInt(10000);
    return minimumAmount;
  }

  async addLiquidity({
    tokenA,
    tokenB,
    amountA,
    amountB,
    slippage = 0.5,
    fee,
  }: AddLiquidityParams) {
    // Create Coin instances
    const coinA = this.createCoin(tokenA);
    const coinB = this.createCoin(tokenB);

    // Convert amounts to raw values
    const rawAmountA = this.parseAmount(amountA, tokenA.decimals);
    const rawAmountB = this.parseAmount(amountB, tokenB.decimals);

    // Calculate minimum amounts based on slippage
    const minAmountA = this.calculateMinimumAmount(rawAmountA, slippage);
    const minAmountB = this.calculateMinimumAmount(rawAmountB, slippage);

    // Get pool's fee or use provided fee
    let poolFee: string;
    try {
      // Try to get existing pool's fee
      const metadata = await Pair.getPairMetadata(this.aptos, coinA, coinB);
      poolFee = metadata.fee.toString();
      console.log(
        `Pool exists, using existing pool fee: ${poolFee} basis points`
      );
    } catch (error) {
      // If pool doesn't exist, require fee parameter
      if (!fee) {
        throw new Error(
          `Pool doesn't exist between ${tokenA.symbol} and ${tokenB.symbol}. ` +
            `You must specify a fee (in basis points) when creating a new pool.`
        );
      }
      poolFee = fee;
      console.log(
        `Pool doesn't exist yet. Creating pool with fee: ${poolFee} basis points`
      );
    }

    // Generate add liquidity parameters
    return Router.addLiquidityParameters(
      rawAmountA.toString(),
      rawAmountB.toString(),
      minAmountA.toString(),
      minAmountB.toString(),
      coinA.address,
      coinB.address,
      poolFee
    );
  }

  async swap({
    fromToken,
    toToken,
    amount,
    slippage = 0.5,
    exactIn = true,
  }: SwapParams) {
    // Create Coin instances
    const tokenIn = this.createCoin(fromToken);
    const tokenOut = this.createCoin(toToken);

    // Convert amount to raw value
    const rawAmount = this.parseAmount(amount, fromToken.decimals);

    // Get pool data
    const [reserves, metadata] = await Promise.all([
      Pair.getReserves(this.aptos, tokenIn, tokenOut),
      Pair.getPairMetadata(this.aptos, tokenIn, tokenOut),
    ]);

    console.log("\nFetching current reserves...");
    console.log(`Token0 Reserve: ${reserves.reserve_x}`);
    console.log(`Token1 Reserve: ${reserves.reserve_y}\n`);

    // Create pair and route
    const pair = new Pair(
      CurrencyAmount.fromRawAmount(tokenIn, reserves.reserve_x),
      CurrencyAmount.fromRawAmount(tokenOut, reserves.reserve_y)
    );
    const route = new Route([pair], tokenIn, tokenOut);

    // Convert fee to basis points for swaps
    const rawFee = Number(metadata.fee);
    const swapFee = BigInt(10000 - rawFee);
    console.log(`Pool fee: ${rawFee} basis points`);
    console.log(`Converting fee ${rawFee} to basis points: ${swapFee}`);

    // Create trade
    const trade = exactIn
      ? Trade.exactIn(
          route,
          CurrencyAmount.fromRawAmount(tokenIn, rawAmount),
          swapFee
        )
      : Trade.exactOut(
          route,
          CurrencyAmount.fromRawAmount(tokenOut, rawAmount),
          swapFee
        );

    // Get swap parameters with slippage
    const slippagePercent = new Percent(Math.floor(slippage * 100), 10000); // Convert to basis points
    return Router.swapCallParameters(trade, {
      allowedSlippage: slippagePercent,
    });
  }

  async removeLiquidity({
    tokenA,
    tokenB,
    lpAmount,
    slippage = 0.5,
  }: RemoveLiquidityParams) {
    // Create Coin instances
    const coinA = this.createCoin(tokenA);
    const coinB = this.createCoin(tokenB);

    // Convert LP amount to raw value (LP tokens always have 8 decimals)
    const rawLPAmount = this.parseAmount(lpAmount, 8);

    // Calculate minimum amounts (using same slippage for both tokens)
    const minAmount = this.calculateMinimumAmount(rawLPAmount, slippage);

    // Generate remove liquidity parameters
    return Router.removeLiquidityParameters(
      coinA.address,
      coinB.address,
      rawLPAmount.toString(),
      minAmount.toString(),
      minAmount.toString()
    );
  }
}
