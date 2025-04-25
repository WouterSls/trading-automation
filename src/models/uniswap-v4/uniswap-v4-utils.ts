import { PoolKey } from "./uniswap-v4-types";
import { keccak256, AbiCoder } from "ethers";

export function computePoolId(key: PoolKey): string {
  // ABI-encode exactly 5 slots (5 × 32 bytes = 0xa0 length in memory)
  const encoded = AbiCoder.defaultAbiCoder().encode(
    ["address", "address", "uint24", "int24", "address"],
    [key.currency0, key.currency1, key.fee, key.tickSpacing, key.hooks],
  );
  // keccak256 over the 0xa0-byte struct
  return keccak256(encoded);
}
