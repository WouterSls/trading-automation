import { PoolKey, FeeAmount, FeeToTickSpacing, PathKey } from "./uniswap-v4-types";
import { keccak256, AbiCoder } from "ethers";
import { ethers } from "ethers";

/**
 * Computes the pool ID hash for a given pool key
 * @param key The pool key containing currency addresses, fee, tick spacing, and hooks
 * @returns The keccak256 hash of the pool key as a string
 */
export function computePoolId(key: PoolKey): string {
  // ABI-encode exactly 5 slots (5 × 32 bytes = 0xa0 length in memory)
  const encoded = AbiCoder.defaultAbiCoder().encode(
    ["address", "address", "uint24", "int24", "address"],
    [key.currency0, key.currency1, key.fee, key.tickSpacing, key.hooks],
  );
  // keccak256 over the 0xa0-byte struct
  return keccak256(encoded);
}

/**
 * Creates a pool key for the lowest fee tier (0.01%)
 * @param tokenA First token address
 * @param tokenB Second token address
 * @param hooks Optional hooks address (defaults to ZeroAddress)
 * @returns A PoolKey object with lowest fee configuration
 */
export function getLowestFeePoolKey(tokenA: string, tokenB: string, hooks: string = ethers.ZeroAddress): PoolKey {
  const fee: FeeAmount = FeeAmount.LOWEST;
  const [currency0, currency1] = tokenA.toLowerCase() < tokenB.toLowerCase() ? [tokenA, tokenB] : [tokenB, tokenA];

  const tickSpacing = FeeToTickSpacing.get(fee);

  if (!tickSpacing) {
    throw new Error(`Invalid fee amount: ${fee}`);
  }

  const poolKey: PoolKey = {
    currency0,
    currency1,
    fee,
    tickSpacing,
    hooks,
  };

  return poolKey;
}

/**
 * Creates a pool key for the low fee tier (0.05%)
 * @param tokenA First token address
 * @param tokenB Second token address
 * @param hooks Optional hooks address (defaults to ZeroAddress)
 * @returns A PoolKey object with low fee configuration
 */
export function getLowPoolKey(tokenA: string, tokenB: string, hooks: string = ethers.ZeroAddress): PoolKey {
  const fee: FeeAmount = FeeAmount.LOW;
  const [currency0, currency1] = tokenA.toLowerCase() < tokenB.toLowerCase() ? [tokenA, tokenB] : [tokenB, tokenA];

  const tickSpacing = FeeToTickSpacing.get(fee);

  if (!tickSpacing) {
    throw new Error(`Invalid fee amount: ${fee}`);
  }

  const poolKey: PoolKey = {
    currency0,
    currency1,
    fee,
    tickSpacing,
    hooks,
  };

  return poolKey;
}

/**
 * Creates a pool key for the medium fee tier (0.3%)
 * @param tokenA First token address
 * @param tokenB Second token address
 * @param hooks Optional hooks address (defaults to ZeroAddress)
 * @returns A PoolKey object with medium fee configuration
 */
export function getMediumPoolKey(tokenA: string, tokenB: string, hooks: string = ethers.ZeroAddress): PoolKey {
  const fee: FeeAmount = FeeAmount.MEDIUM;
  const [currency0, currency1] = tokenA.toLowerCase() < tokenB.toLowerCase() ? [tokenA, tokenB] : [tokenB, tokenA];

  const tickSpacing = FeeToTickSpacing.get(fee);

  if (!tickSpacing) {
    throw new Error(`Invalid fee amount: ${fee}`);
  }

  const poolKey: PoolKey = {
    currency0,
    currency1,
    fee,
    tickSpacing,
    hooks,
  };

  return poolKey;
}

/**
 * Creates a pool key for the high fee tier (1%)
 * @param tokenA First token address
 * @param tokenB Second token address
 * @param hooks Optional hooks address (defaults to ZeroAddress)
 * @returns A PoolKey object with high fee configuration
 */
export function getHighPoolKey(tokenA: string, tokenB: string, hooks: string = ethers.ZeroAddress): PoolKey {
  const fee: FeeAmount = FeeAmount.HIGH;
  const [currency0, currency1] = tokenA.toLowerCase() < tokenB.toLowerCase() ? [tokenA, tokenB] : [tokenB, tokenA];

  const tickSpacing = FeeToTickSpacing.get(fee);

  if (!tickSpacing) {
    throw new Error(`Invalid fee amount: ${fee}`);
  }

  const poolKey: PoolKey = {
    currency0,
    currency1,
    fee,
    tickSpacing,
    hooks,
  };

  return poolKey;
}

/**
 * Finds the pool key with the lowest fee from an array of pool keys
 * @param poolKeys Array of pool keys to compare
 * @returns Promise resolving to the pool key with the lowest fee
 */
export async function getBestPoolKey(poolKeys: PoolKey[]): Promise<PoolKey> {
  return poolKeys.sort((a, b) => a.fee - b.fee)[0];
}

/**
 * Creates a pool key for a specific fee amount
 * @param tokenA First token address
 * @param tokenB Second token address
 * @param fee The fee amount for the pool
 * @returns A PoolKey object with the specified fee configuration
 */
export function createPoolKey(tokenA: string, tokenB: string, fee: FeeAmount): PoolKey {
  const [currency0, currency1] = tokenA.toLowerCase() < tokenB.toLowerCase() ? [tokenA, tokenB] : [tokenB, tokenA];
  const tickSpacing = FeeToTickSpacing.get(fee);

  if (!tickSpacing) {
    throw new Error(`Invalid fee amount: ${fee}`);
  }

  return {
    currency0,
    currency1,
    fee,
    tickSpacing,
    hooks: ethers.ZeroAddress, // No hooks for basic pools
  };
}

/**
 * Determines the swap direction based on input token and pool key
 * @param tokenIn The address of the input token
 * @param poolKey The pool key to check against
 * @returns True if swapping from currency0 to currency1, false otherwise
 */
export function determineSwapDirection(tokenIn: string, poolKey: PoolKey): boolean {
  return tokenIn.toLowerCase() === poolKey.currency0.toLowerCase();
}

/**
 * Creates path segments for multi-hop swaps
 * @param path Array of token addresses representing the swap path
 * @param fees Array of fee amounts for each hop
 * @returns Array of PathSegment objects for the swap path
 */
export function createPathSegments(path: string[], fees: FeeAmount[]): PathKey[] {
  const segments: PathKey[] = [];

  for (let i = 0; i < path.length - 1; i++) {
    const fee = fees[i];
    const tickSpacing = FeeToTickSpacing.get(fee);

    if (!tickSpacing) {
      throw new Error(`Invalid fee amount: ${fee}`);
    }

    segments.push({
      intermediateCurrency: path[i + 1],
      fee,
      tickSpacing,
      hooks: ethers.ZeroAddress,
      hookData: "0x",
    });
  }

  return segments;
}
