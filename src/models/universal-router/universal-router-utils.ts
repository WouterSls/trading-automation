import { AbiCoder, ethers } from "ethers";
import { PoolKey, SwapParams } from "../uniswap-v4/uniswap-v4-types";

export function encodeExactInputSingleSwapParams(
  poolKey: PoolKey,
  swapParams: SwapParams,
  hookData = ethers.ZeroAddress,
) {
  const poolKeyTuple = [poolKey.currency0, poolKey.currency1, poolKey.fee, poolKey.tickSpacing, poolKey.hooks] as const;

  const encodedParams = AbiCoder.defaultAbiCoder().encode(
    [
      "tuple(address,address,uint24,int24,address)", // your PoolKey
      "bool", // zeroForOne
      "uint128", // amountIn
      "uint128", // amountOutMinimum
      "bytes", // hookData
    ],
    [poolKeyTuple, swapParams.zeroForOne, swapParams.amountIn, swapParams.amountOutMinimum, hookData],
  );
  return encodedParams;
}

export function encodeSettleParams(inputCurreny: string, amountIn: bigint, bool: Boolean) {
  const encodedParams = AbiCoder.defaultAbiCoder().encode(
    ["address", "uint128", "bool"],
    [inputCurreny, amountIn, bool],
  );
  return encodedParams;
}

export function encodeTakeParams(poolKey: PoolKey, amountIn: bigint, bool: Boolean) {
  return "0x";
}
