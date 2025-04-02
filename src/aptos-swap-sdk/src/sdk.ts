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
  amountB?: string; // Optional for existing pools
  slippage?: number; // Default 0.5%
  fee?: string; // Fee in basis points (e.g., "30" for 0.3%). Used only when creating new pool.
}

export interface PoolInfo {
  exists: boolean;
  fee?: string;
  reserveA?: string;
  reserveB?: string;
  price?: string;
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

  async getPoolInfo(tokenA: TokenInfo, tokenB: TokenInfo): Promise<PoolInfo> {
    const coinA = this.createCoin(tokenA);
    const coinB = this.createCoin(tokenB);

    try {
      const [metadata, reserves] = await Promise.all([
        Pair.getPairMetadata(this.aptos, coinA, coinB),
        Pair.getReserves(this.aptos, coinA, coinB),
      ]);

      const [token0] = Pair.sortToken(coinA, coinB);
      const [reserve0, reserve1] = token0.equals(coinA)
        ? [reserves.reserve_x, reserves.reserve_y]
        : [reserves.reserve_y, reserves.reserve_x];

      // Calculate price based on reserves
      const price =
        Number(reserve1) /
        Math.pow(10, tokenB.decimals) /
        (Number(reserve0) / Math.pow(10, tokenA.decimals));

      return {
        exists: true,
        fee: metadata.fee.toString(),
        reserveA: reserve0.toString(),
        reserveB: reserve1.toString(),
        price: price.toString(),
      };
    } catch (error) {
      return { exists: false };
    }
  }

  async calculateDependentAmount(
    tokenA: TokenInfo,
    tokenB: TokenInfo,
    amount: string,
    isReversed: boolean = false
  ): Promise<string | undefined> {
    const poolInfo = await this.getPoolInfo(tokenA, tokenB);

    if (!poolInfo.exists || !poolInfo.price) {
      return undefined;
    }

    const price = Number(poolInfo.price);
    const inputAmount = Number(amount);

    return isReversed
      ? (inputAmount / price).toFixed(tokenA.decimals)
      : (inputAmount * price).toFixed(tokenB.decimals);
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

    // Get pool info
    const poolInfo = await this.getPoolInfo(tokenA, tokenB);
    const poolExists = poolInfo.exists;

    // Handle amount calculations
    let finalAmountB = amountB;
    if (poolExists && !amountB) {
      // Calculate amountB based on pool price if not provided
      finalAmountB = await this.calculateDependentAmount(
        tokenA,
        tokenB,
        amountA
      );
      if (!finalAmountB) {
        throw new Error("Failed to calculate dependent amount");
      }
    } else if (!poolExists && !amountB) {
      throw new Error("Both amounts must be provided when creating a new pool");
    }

    // Convert amounts to raw values
    const rawAmountA = this.parseAmount(amountA, tokenA.decimals);
    const rawAmountB = this.parseAmount(finalAmountB!, tokenB.decimals);

    // Calculate minimum amounts based on slippage
    const minAmountA = this.calculateMinimumAmount(
      rawAmountA,
      slippage
    ).toString();
    const minAmountB = this.calculateMinimumAmount(
      rawAmountB,
      slippage
    ).toString();

    // Get or validate pool fee
    let poolFee: string;
    if (poolExists) {
      poolFee = poolInfo.fee!;
      console.log(`Using existing pool fee: ${poolFee} basis points`);
    } else {
      if (!fee) {
        throw new Error(
          `Pool doesn't exist between ${tokenA.symbol} and ${tokenB.symbol}. ` +
            `You must specify a fee (in basis points) when creating a new pool.`
        );
      }
      poolFee = fee;
      console.log(`Creating new pool with fee: ${poolFee} basis points`);
    }

    // Generate add liquidity parameters
    return Router.addLiquidityParameters(
      rawAmountA.toString(),
      rawAmountB.toString(),
      minAmountA,
      minAmountB,
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

    // Create pair instance with sorted tokens
    const [token0] = Pair.sortToken(tokenIn, tokenOut);
    const [reserve0, reserve1] = token0.equals(tokenIn)
      ? [reserves.reserve_x, reserves.reserve_y]
      : [reserves.reserve_y, reserves.reserve_x];

    console.log("\nFetching current reserves...");
    console.log(`Token0 Reserve: ${reserves.reserve_x}`);
    console.log(`Token1 Reserve: ${reserves.reserve_y}\n`);

    // Create pair and route
    const pair = new Pair(
      CurrencyAmount.fromRawAmount(tokenIn, reserve0),
      CurrencyAmount.fromRawAmount(tokenOut, reserve1)
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

    // Get pair instance and reserves
    const reserves = await Pair.getReserves(this.aptos, coinA, coinB);
    const lpTokenAddress = await Pair.getLpToken(this.aptos, coinA, coinB);

    // Create pair instance with sorted tokens
    const [token0, token1] = Pair.sortToken(coinA, coinB);
    const [reserve0, reserve1] = token0.equals(coinA)
      ? [reserves.reserve_x, reserves.reserve_y]
      : [reserves.reserve_y, reserves.reserve_x];

    const pair = new Pair(
      CurrencyAmount.fromRawAmount(token0, reserve0),
      CurrencyAmount.fromRawAmount(token1, reserve1)
    );

    // Convert LP amount to CurrencyAmount
    const rawLPAmount = this.parseAmount(lpAmount, 8);
    const lpToken = new Coin(
      coinA.chainId,
      lpTokenAddress,
      8,
      "Warpgate-LP",
      "Warpgate-LP"
    );
    const liquidityAmount = CurrencyAmount.fromRawAmount(lpToken, rawLPAmount);

    // Get total supply of LP tokens
    const totalSupply = await pair.getTotalSupply(
      this.aptos,
      lpTokenAddress,
      lpToken
    );
    // Calculate exact amounts to receive
    const token0Amount = pair.getLiquidityValue(
      token0.equals(coinA) ? token0 : token1,
      totalSupply,
      liquidityAmount,
      lpToken,
      false // feeOn
    );
    const token1Amount = pair.getLiquidityValue(
      token1.equals(coinB) ? token1 : token0,
      totalSupply,
      liquidityAmount,
      lpToken,
      false // feeOn
    );

    // Calculate minimum amounts with slippage
    const minAmount0 = this.calculateMinimumAmount(
      token0Amount.quotient,
      slippage
    );
    const minAmount1 = this.calculateMinimumAmount(
      token1Amount.quotient,
      slippage
    );

    return Router.removeLiquidityParameters(
      rawLPAmount.toString(),
      minAmount0.toString(),
      minAmount1.toString(),
      token0.address,
      token1.address
    );
  }
}
