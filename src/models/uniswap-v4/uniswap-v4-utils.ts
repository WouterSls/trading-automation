import { PoolKey, FeeAmount, FeeToTickSpacing } from "./uniswap-v4-types";
import { keccak256, AbiCoder } from "ethers";
import { ethers } from "ethers";
import { TheGraphApi } from "../../services/TheGraphApi";
import { ChainType } from "../../config/chain-config";

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
 * @param fee Optional fee tier (defaults to MEDIUM)
 * @param hooks Optional hooks address (defaults to ZeroAddress)
 * @returns An object containing the pool key and its computed ID
 */
export function getPoolKeyAndId(
  tokenA: string,
  tokenB: string,
  fee: FeeAmount = FeeAmount.MEDIUM,
  hooks: string = ethers.ZeroAddress,
): { poolKey: PoolKey; poolId: string } {
  // Sort token addresses (lower address should be currency0)
  const [currency0, currency1] = tokenA.toLowerCase() < tokenB.toLowerCase() ? [tokenA, tokenB] : [tokenB, tokenA];

  // Get tick spacing based on fee
  const tickSpacing = FeeToTickSpacing.get(fee);

  if (!tickSpacing) {
    throw new Error(`Invalid fee amount: ${fee}`);
  }

  // Create pool key
  const poolKey: PoolKey = {
    currency0,
    currency1,
    fee,
    tickSpacing,
    hooks,
  };

  // Compute pool ID
  const poolId = computePoolId(poolKey);

  return { poolKey, poolId };
}

/**
 * Fetch all PoolKey objects for a given token pair.
 */
export async function getBestPoolKey(poolKeys: PoolKey[]): Promise<PoolKey> {
  return poolKeys.sort((a, b) => a.fee - b.fee)[0];
} 