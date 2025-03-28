import { expect, test } from "vitest";
import * as exports from "./index";

test("exports", () => {
  expect(Object.keys(exports)).toMatchInlineSnapshot(`
    [
      "Coin",
      "ChainId",
      "SWAP_ADDRESS",
      "SWAP_ADDRESS_MODULE",
      "PAIR_RESERVE_TYPE_TAG",
      "PAIR_LP_TYPE_TAG",
      "ZERO_PERCENT",
      "ONE_HUNDRED_PERCENT",
      "Router",
      "Pair",
      "Route",
      "DEFAULT_FEE",
      "FEE_PRECISION",
      "getPairFee",
      "getEffectiveFee",
      "inputOutputComparator",
      "tradeComparator",
      "Trade",
      "AptosCoin",
      "TradeType",
      "Rounding",
      "MINIMUM_LIQUIDITY",
      "ZERO",
      "ONE",
      "TWO",
      "THREE",
      "FIVE",
      "TEN",
      "_100",
      "_9975",
      "_10000",
      "MaxUint256",
      "VMType",
      "VM_TYPE_MAXIMA",
      "BaseCurrency",
      "Fraction",
      "Percent",
      "CurrencyAmount",
      "Price",
      "NativeCurrency",
      "Token",
      "InsufficientReservesError",
      "InsufficientInputAmountError",
      "validateVMTypeInstance",
      "sqrt",
      "sortedInsert",
      "computePriceImpact",
      "getTokenComparator",
      "sortCurrencies",
      "WarpGateSDK",
    ]
  `);
});
