import { AbiCoder, ethers } from "ethers";
import { PoolKey } from "../uniswap-v4/uniswap-v4-types";
import { getPoolKey } from "../uniswap-v4/uniswap-v4-utils";
import { TradeCreationDto } from "../../api/trades/TradesController";
import { ChainType, getOutputTokenAddress } from "../../config/chain-config";
import { OutputToken } from "../../lib/types";
import { IV4ExactInputSingleParams, IV4SettleParams, IV4TakeParams } from "./universal-router-types";

export function encodeExactInputSingleSwapParams(swapParams: IV4ExactInputSingleParams) {
  const poolKeyTuple = [
    swapParams.poolKey.currency0,
    swapParams.poolKey.currency1,
    swapParams.poolKey.fee,
    swapParams.poolKey.tickSpacing,
    swapParams.poolKey.hooks,
  ] as const;

  const encodedParams = AbiCoder.defaultAbiCoder().encode(
    [
      "tuple(address,address,uint24,int24,address)", // your PoolKey
      "bool", // zeroForOne
      "uint128", // amountIn
      "uint128", // amountOutMinimum
      "bytes", // hookData
    ],
    [poolKeyTuple, swapParams.zeroForOne, swapParams.amountIn, swapParams.amountOutMinimum, swapParams.hookData],
  );
  return encodedParams;
}

export function encodeSettleParams(settleParams: IV4SettleParams) {
  const encodedParams = AbiCoder.defaultAbiCoder().encode(
    ["address", "uint128", "bool"],
    [settleParams.inputCurrency, settleParams.amountIn, settleParams.bool],
  );
  return encodedParams;
}

export function encodeTakeParams(takeParams: IV4TakeParams) {
  const encodedParams = AbiCoder.defaultAbiCoder().encode(
    ["address", "address", "uint256"],
    [takeParams.outputCurrency, takeParams.recipient, takeParams.amount],
  );
  return encodedParams;
}

export async function prepareV4SwapInput(tradeCreationDto: TradeCreationDto): Promise<{
  poolKey: PoolKey;
  zeroForOne: boolean;
}> {
  const outputToken = getOutputTokenAddress(
    tradeCreationDto.chain as ChainType,
    tradeCreationDto.outputToken as OutputToken,
  );
  const poolKey = getPoolKey(tradeCreationDto.inputToken, outputToken);
  const zeroForOne = poolKey.currency0 === tradeCreationDto.inputToken;

  return { poolKey, zeroForOne };
}
