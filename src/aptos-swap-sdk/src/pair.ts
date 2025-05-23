import invariant from "tiny-invariant";
import {
  Price,
  BigintIsh,
  FIVE,
  ONE,
  ZERO,
  _10000,
  _9975,
  InsufficientInputAmountError,
  InsufficientReservesError,
  CurrencyAmount,
  sqrt,
  MINIMUM_LIQUIDITY,
} from "../../swap-sdk-core/src";
import { TypeTagStruct, parseTypeTag } from "@aptos-labs/ts-sdk";

import { HexString } from "./hexString";
import { Currency } from "./currency";
import { PAIR_LP_TYPE_TAG, PAIR_RESERVE_TYPE_TAG } from "./constants";
import { ADDRESS } from "./generated/swap";
import { routerCreatePair } from "./generated/swap";
import { Coin } from "./coin";

const typeArgToAddress = (typeArg: TypeTagStruct): string => {
  const children = typeArg.value.typeArgs
    .filter((ta): ta is TypeTagStruct => ta.isStruct())
    .map((ta) => typeArgToAddress(ta));

  return `${HexString.fromUint8Array(
    typeArg.value.address.data
  ).toShortString()}::${typeArg.value.moduleName.identifier}::${
    typeArg.value.name.identifier
  }${children.length > 0 ? `<${children.join(", ")}>` : ""}`;
};

export class Pair {
  public readonly liquidityToken: Coin;
  private readonly pairAddress: `0x${string}`;

  private readonly tokenAmounts: [
    CurrencyAmount<Currency>,
    CurrencyAmount<Currency>,
  ];

  public static sortToken(
    tokenA: Currency,
    tokenB: Currency
  ): [Currency, Currency] {
    const [token0, token1] = tokenA.sortsBefore(tokenB)
      ? [tokenA, tokenB]
      : [tokenB, tokenA]; // it does safety checks
    return [token0, token1];
  }

  public static getAddress(tokenA: Currency, tokenB: Currency): `0x${string}` {
    const [token0, token1] = this.sortToken(tokenA, tokenB);

    return `${PAIR_LP_TYPE_TAG}<${token0.address}, ${token1.address}>`;
  }

  public static getReservesAddress(
    tokenA: Currency,
    tokenB: Currency
  ): `0x${string}` {
    const [token0, token1] = this.sortToken(tokenA, tokenB);
    return `${PAIR_RESERVE_TYPE_TAG}<${token0.address}, ${token1.address}>`;
  }

  public static parseType(type: string) {
    const parsedTypeTag = parseTypeTag(type);
    invariant(parsedTypeTag.isStruct(), `Pair type: ${type}`);
    invariant(parsedTypeTag.value.typeArgs.length === 2, `Pair type length`);

    const [typeArg0, typeArg1] = parsedTypeTag.value.typeArgs;

    invariant(typeArg0.isStruct() && typeArg1.isStruct(), "type args");

    const [address0, address1] = [
      typeArgToAddress(typeArg0),
      typeArgToAddress(typeArg1),
    ];

    return [address0, address1] as const;
  }

  static getLiquidityToken(
    tokenA: Currency,
    tokenB: Currency,
    customAddress?: `0x${string}`
  ) {
    const [token0, token1] = this.sortToken(tokenA, tokenB);
    const address = customAddress ?? this.getAddress(tokenA, tokenB);
    return new Coin(
      tokenA.chainId,
      address,
      8,
      "Warpgate-LP",
      `Warpgate-${token0.symbol}-${token1.symbol}-LP`
    );
  }

  public constructor(
    currencyAmountA: CurrencyAmount<Currency>,
    tokenAmountB: CurrencyAmount<Currency>,
    customAddress?: `0x${string}`
  ) {
    const tokenAmounts = currencyAmountA.currency.sortsBefore(
      tokenAmountB.currency
    ) // does safety checks
      ? [currencyAmountA, tokenAmountB]
      : [tokenAmountB, currencyAmountA];

    this.pairAddress =
      customAddress ??
      Pair.getAddress(tokenAmounts[0].currency, tokenAmounts[1].currency);

    this.liquidityToken = Pair.getLiquidityToken(
      tokenAmounts[0].currency,
      tokenAmounts[1].currency,
      customAddress
    );

    this.tokenAmounts = tokenAmounts as [
      CurrencyAmount<Currency>,
      CurrencyAmount<Currency>,
    ];
  }

  public get address(): `0x${string}` {
    return this.pairAddress;
  }

  /**
   * Gets the LP token address for a pair of tokens
   * @param aptos Aptos client instance
   * @param token0 First token
   * @param token1 Second token
   * @returns LP token address
   */
  public static async getLpToken(
    aptos: any,
    tokenA: Currency,
    tokenB: Currency
  ): Promise<string> {
    try {
      const [token0, token1] = this.sortToken(tokenA, tokenB);
      const payload = {
        function:
          `${ADDRESS}::swap::get_lp_token` as `${string}::${string}::${string}`,
        typeArguments: [],
        functionArguments: [token0.address, token1.address],
      };

      const response = await aptos.view({ payload });

      return response[0].inner;
    } catch (error: any) {
      throw new Error(
        `Failed to get LP token address: ${error?.message || "Unknown error"}`
      );
    }
  }

  /**
   * Returns true if the token is either token0 or token1
   * @param token to check
   */
  public involvesToken(token: Currency): boolean {
    return token.equals(this.token0) || token.equals(this.token1);
  }

  /**
   * Returns the current mid price of the pair in terms of token0, i.e. the ratio of reserve1 to reserve0
   */
  public get token0Price(): Price<Currency, Currency> {
    const result = this.tokenAmounts[1].divide(this.tokenAmounts[0]);
    return new Price(
      this.token0,
      this.token1,
      result.denominator,
      result.numerator
    );
  }

  /**
   * Returns the current mid price of the pair in terms of token1, i.e. the ratio of reserve0 to reserve1
   */
  public get token1Price(): Price<Currency, Currency> {
    const result = this.tokenAmounts[0].divide(this.tokenAmounts[1]);
    return new Price(
      this.token1,
      this.token0,
      result.denominator,
      result.numerator
    );
  }

  /**
   * Return the price of the given token in terms of the other token in the pair.
   * @param token token to return price of
   */
  public priceOf(token: Currency): Price<Currency, Currency> {
    invariant(this.involvesToken(token), "TOKEN");
    return token.equals(this.token0) ? this.token0Price : this.token1Price;
  }

  /**
   * Returns the chain ID of the tokens in the pair.
   */
  public get chainId(): number {
    return this.token0.chainId;
  }

  public get token0(): Currency {
    return this.tokenAmounts[0].currency;
  }

  public get token1(): Currency {
    return this.tokenAmounts[1].currency;
  }

  public get reserve0(): CurrencyAmount<Currency> {
    return this.tokenAmounts[0];
  }

  public get reserve1(): CurrencyAmount<Currency> {
    return this.tokenAmounts[1];
  }

  public reserveOf(token: Currency): CurrencyAmount<Currency> {
    invariant(this.involvesToken(token), "TOKEN");
    return token.equals(this.token0) ? this.reserve0 : this.reserve1;
  }

  /**
   * Gets the current reserves for a token pair
   * @param aptos Aptos client instance
   * @param tokenA First token
   * @param tokenB Second token
   * @returns Current reserves as BigInts
   */
  /**
   * Gets the metadata for a token pair including fees
   * @param aptos Aptos client instance
   * @param tokenA First token
   * @param tokenB Second token
   * @returns Pair metadata including fees
   */
  public static async getPairMetadata(
    aptos: any,
    tokenA: Currency,
    tokenB: Currency
  ): Promise<{ fee: bigint }> {
    const [token0, token1] = this.sortToken(tokenA, tokenB);
    const payload = {
      function: `${ADDRESS}::swap::get_pair_metadata`,
      typeArguments: [],
      functionArguments: [token0.address, token1.address],
    };

    try {
      const response = await aptos.view({ payload });
      if (!response || response.length < 9) {
        throw new Error("Invalid response format");
      }

      // Extract swap_fee from response (8th index)
      const swap_fee = response[7];
      if (!swap_fee) {
        throw new Error("Swap fee not found in response");
      }

      const fee = Number(swap_fee);
      console.log("Extracted fee:", fee);

      return {
        fee: BigInt(fee),
      };
    } catch (error: any) {
      if (
        error?.message?.includes("module_not_found") ||
        error?.message?.includes("Pool does not exist")
      ) {
        throw new Error(
          `Pool does not exist between ${tokenA.symbol} and ${tokenB.symbol}`
        );
      }
      const errorMessage = error?.message || "Unknown error";
      throw new Error(`Failed to get pair metadata: ${errorMessage}`);
    }
  }

  public static async getReserves(
    aptos: any,
    tokenA: Currency,
    tokenB: Currency
  ): Promise<{ reserve_x: bigint; reserve_y: bigint }> {
    // Check if pool exists first
    const poolExists = await this.checkPoolExists(aptos, tokenA, tokenB);
    if (!poolExists) {
      throw new Error(
        `Pool does not exist between ${tokenA.symbol} and ${tokenB.symbol}`
      );
    }

    // Try to fetch current reserves
    const [token0, token1] = this.sortToken(tokenA, tokenB);
    const payload = {
      function:
        `${ADDRESS}::swap::token_reserves` as `${string}::${string}::${string}`,
      typeArguments: [],
      functionArguments: [token0.address, token1.address],
    };

    const response = await aptos.view({ payload });
    if (!response || response.length < 2 || !response[0] || !response[1]) {
      throw new Error("Invalid response format");
    }

    const [reserve_x, reserve_y] = response;

    return {
      reserve_x: BigInt(reserve_x.toString()),
      reserve_y: BigInt(reserve_y.toString()),
    };
  }

  /**
   * Checks if the pool exists for the given token pair
   * @param aptos Aptos client instance
   * @param tokenA First token
   * @param tokenB Second token
   * @returns true if pool exists, false otherwise
   */
  public static async checkPoolExists(
    aptos: any,
    tokenA: Currency,
    tokenB: Currency
  ): Promise<boolean> {
    const [token0, token1] = this.sortToken(tokenA, tokenB);
    const payload = {
      function:
        `${ADDRESS}::swap::token_reserves` as `${string}::${string}::${string}`,
      typeArguments: [],
      functionArguments: [token0.address, token1.address],
    };

    try {
      const response = await aptos.view({ payload });
      return response && response.length >= 2 && response[0] && response[1];
    } catch (error: any) {
      return false;
    }
  }

  /**
   * Creates a new liquidity pool for the given token pair
   * @param tokenA First token
   * @param tokenB Second token
   * @returns Transaction payload to create the pool
   */
  public static createPool(tokenA: Currency, tokenB: Currency) {
    const [token0, token1] = this.sortToken(tokenA, tokenB);
    return routerCreatePair([token0.address, token1.address]);
  }

  public getOutputAmount(
    inputAmount: CurrencyAmount<Currency>,
    fee = _9975
  ): [CurrencyAmount<Currency>, Pair] {
    invariant(this.involvesToken(inputAmount.currency), "TOKEN");
    if (this.reserve0.quotient === ZERO || this.reserve1.quotient === ZERO) {
      throw new InsufficientReservesError();
    }
    const actualFee = fee ?? 9975n;

    const inputReserve = this.reserveOf(inputAmount.currency);
    const outputReserve = this.reserveOf(
      inputAmount.currency.equals(this.token0) ? this.token1 : this.token0
    );
    const inputAmountWithFee = inputAmount.quotient * actualFee;
    const numerator = inputAmountWithFee * outputReserve.quotient;
    const denominator = inputReserve.quotient * _10000 + inputAmountWithFee;
    const outputAmount = CurrencyAmount.fromRawAmount(
      inputAmount.currency.equals(this.token0) ? this.token1 : this.token0,
      numerator / denominator
    );
    if (outputAmount.quotient === ZERO) {
      throw new InsufficientInputAmountError();
    }
    return [
      outputAmount,
      new Pair(
        inputReserve.add(inputAmount),
        outputReserve.subtract(outputAmount)
      ),
    ];
  }

  public getInputAmount(
    outputAmount: CurrencyAmount<Currency>,
    fee = _9975
  ): [CurrencyAmount<Currency>, Pair] {
    invariant(this.involvesToken(outputAmount.currency), "TOKEN");
    if (
      this.reserve0.quotient === ZERO ||
      this.reserve1.quotient === ZERO ||
      outputAmount.quotient >= this.reserveOf(outputAmount.currency).quotient
    ) {
      throw new InsufficientReservesError();
    }

    const outputReserve = this.reserveOf(outputAmount.currency);
    const inputReserve = this.reserveOf(
      outputAmount.currency.equals(this.token0) ? this.token1 : this.token0
    );
    const numerator = inputReserve.quotient * outputAmount.quotient * _10000;
    const denominator = (outputReserve.quotient - outputAmount.quotient) * fee;
    const inputAmount = CurrencyAmount.fromRawAmount(
      outputAmount.currency.equals(this.token0) ? this.token1 : this.token0,
      numerator / denominator + ONE
    );
    return [
      inputAmount,
      new Pair(
        inputReserve.add(inputAmount),
        outputReserve.subtract(outputAmount)
      ),
    ];
  }

  public getLiquidityMinted(
    totalSupply: CurrencyAmount<Currency>,
    tokenAmountA: CurrencyAmount<Currency>,
    tokenAmountB: CurrencyAmount<Currency>
  ): CurrencyAmount<Currency> {
    invariant(totalSupply.currency.equals(this.liquidityToken), "LIQUIDITY");
    const tokenAmounts = tokenAmountA.currency.sortsBefore(
      tokenAmountB.currency
    ) // does safety checks
      ? [tokenAmountA, tokenAmountB]
      : [tokenAmountB, tokenAmountA];
    invariant(
      tokenAmounts[0].currency.equals(this.token0) &&
        tokenAmounts[1].currency.equals(this.token1),
      "TOKEN"
    );

    let liquidity: bigint;
    if (totalSupply.quotient === ZERO) {
      liquidity =
        sqrt(tokenAmounts[0].quotient * tokenAmounts[1].quotient) -
        MINIMUM_LIQUIDITY;
    } else {
      const amount0 =
        (tokenAmounts[0].quotient * totalSupply.quotient) /
        this.reserve0.quotient;
      const amount1 =
        (tokenAmounts[1].quotient * totalSupply.quotient) /
        this.reserve1.quotient;
      liquidity = amount0 <= amount1 ? amount0 : amount1;
    }
    if (!(liquidity > ZERO)) {
      throw new InsufficientInputAmountError();
    }
    return CurrencyAmount.fromRawAmount(this.liquidityToken, liquidity);
  }

  /**
   * Gets the total supply of LP tokens for this pair using GraphQL
   * @param lpTokenAddress LP token address
   * @param lpToken LP token currency
   * @returns Total supply as CurrencyAmount
   */
  public async getTotalSupply(
    aptos: any,
    lpTokenAddress: string,
    lpToken: Currency
  ): Promise<CurrencyAmount<Currency>> {
    try {
      // Ensure address is padded to correct length (64 characters after 0x)
      const hexAddress = new HexString(lpTokenAddress).hex().slice(2); // Remove 0x
      const formattedAddress = `0x${hexAddress.padStart(64, "0")}`;
      console.log("formattedAddress", formattedAddress);

      const metadata =
        await aptos.fungibleAsset.getFungibleAssetMetadataByAssetType({
          assetType: formattedAddress,
        });

      if (!metadata?.supply_v2) {
        throw new Error("Supply not found in metadata");
      }

      return CurrencyAmount.fromRawAmount(lpToken, BigInt(metadata.supply_v2));
    } catch (error: any) {
      throw new Error(
        `Failed to get total supply: ${error?.message || "Unknown error"}`
      );
    }
  }

  public getLiquidityValue(
    token: Currency,
    totalSupply: CurrencyAmount<Currency>,
    liquidity: CurrencyAmount<Currency>,
    lpToken: Currency,
    feeOn = false,
    kLast?: BigintIsh
  ): CurrencyAmount<Currency> {
    invariant(this.involvesToken(token), "TOKEN");
    invariant(totalSupply.currency.equals(lpToken), "TOTAL_SUPPLY");
    invariant(liquidity.currency.equals(lpToken), "LIQUIDITY");
    invariant(liquidity.quotient <= totalSupply.quotient, "LIQUIDITY");

    let totalSupplyAdjusted: CurrencyAmount<Currency>;
    if (!feeOn) {
      totalSupplyAdjusted = totalSupply;
    } else {
      invariant(!!kLast, "K_LAST");
      const kLastParsed = BigInt(kLast);
      if (!(kLastParsed === ZERO)) {
        const rootK = sqrt(this.reserve0.quotient * this.reserve1.quotient);
        const rootKLast = sqrt(kLastParsed);
        if (rootK > rootKLast) {
          const numerator = totalSupply.quotient * (rootK - rootKLast);
          const denominator = rootK * FIVE + rootKLast;
          const feeLiquidity = numerator / denominator;
          totalSupplyAdjusted = totalSupply.add(
            CurrencyAmount.fromRawAmount(lpToken, feeLiquidity)
          );
        } else {
          totalSupplyAdjusted = totalSupply;
        }
      } else {
        totalSupplyAdjusted = totalSupply;
      }
    }

    return CurrencyAmount.fromRawAmount(
      token,
      (liquidity.quotient * this.reserveOf(token).quotient) /
        totalSupplyAdjusted.quotient
    );
  }
}
