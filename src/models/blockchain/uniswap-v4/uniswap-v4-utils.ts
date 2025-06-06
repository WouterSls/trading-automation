import { PoolKey, FeeAmount, FeeToTickSpacing } from "./uniswap-v4-types";
import { keccak256, AbiCoder } from "ethers";
import { ethers } from "ethers";

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
 * Creates a pool key and computes its ID for two given token addresses
 * @param tokenA First token address
 * @param tokenB Second token address
 * @param hooks Optional hooks address (defaults to ZeroAddress)
 * @returns An object containing the pool key and its computed ID
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
 * Creates a pool key and computes its ID for two given token addresses
 * @param tokenA First token address
 * @param tokenB Second token address
 * @param hooks Optional hooks address (defaults to ZeroAddress)
 * @returns An object containing the pool key and its computed ID
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
 * Creates a pool key and computes its ID for two given token addresses
 * @param tokenA First token address
 * @param tokenB Second token address
 * @param hooks Optional hooks address (defaults to ZeroAddress)
 * @returns An object containing the pool key and its computed ID
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
 * Creates a pool key and computes its ID for two given token addresses
 * @param tokenA First token address
 * @param tokenB Second token address
 * @param hooks Optional hooks address (defaults to ZeroAddress)
 * @returns An object containing the pool key and its computed ID
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
 * Fetch all PoolKey objects for a given token pair.
 */
export async function getBestPoolKey(poolKeys: PoolKey[]): Promise<PoolKey> {
  return poolKeys.sort((a, b) => a.fee - b.fee)[0];
}
