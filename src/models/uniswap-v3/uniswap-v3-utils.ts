import { FeeAmount } from "./uniswap-v3-types";

/**
 * Converts sqrtPriceX96 to a human readable price
 * @param sqrtPriceX96 The sqrt price value from the pool
 * @returns The human readable price (token1/token0)
 */
export function calculatePriceFromSqrtPriceX96(sqrtPriceX96: string): number {
  const sqrtPriceX96BigInt = BigInt(sqrtPriceX96);

  const numerator = sqrtPriceX96BigInt * sqrtPriceX96BigInt;
  const denominator = 2n ** 192n;

  return Number((numerator * 10000000000n) / denominator) / 10000000000;
}

/**
 * Encode a Uniswap V3 multihop path for ISwapRouter.
 *
 * @param path  Array of token addresses: [tokenIn, tokenMid?, ..., tokenOut]
 * @param fees  Array of FeeAmount values, one less than path.length
 * @returns     Hex string: 0x{tokenIn}{fee1}{tokenMid}{fee2}…{tokenOut}
 */
export function encodePath(path: string[], fees: FeeAmount[]): string {
  if (path.length !== fees.length + 1) {
    throw new Error("path/fee lengths do not match");
  }

  let result = "0x";
  for (let i = 0; i < fees.length; i++) {
    result += path[i].slice(2);
    result += fees[i].toString(16).padStart(6, "0");
  }
  result += path[path.length - 1].slice(2);

  return result.toLowerCase();
}
