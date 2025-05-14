import { AbiCoder } from "ethers";
import { IPermitSingle, IV4ExactInputSingleParams, IV4SettleParams, IV4TakeParams } from "./universal-router-types";

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
      "tuple(address,address,uint24,int24,address)", // PoolKey
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

export function encodeSwapCommandInput(
  actions: string,
  encodedSwapParams: string,
  encodedSettleParams: string,
  encodedTakeParams: string,
) {
  const encodedSwapCommandInput = AbiCoder.defaultAbiCoder().encode(
    ["bytes", "bytes[]"],
    [actions, [encodedSwapParams, encodedSettleParams, encodedTakeParams]],
  );
  return encodedSwapCommandInput;
}

export function encodePermitInput(owner: string, permitSingle: IPermitSingle, signature: string) {
  const permitSingleTuple = [permitSingle.token, permitSingle.amount, permitSingle.expiration, permitSingle.nonce];
  const encodedPermitInput = AbiCoder.defaultAbiCoder().encode(
    ["address", "tuple(address,uint160,uint48,uint48)", "string"],
    [owner, permitSingleTuple, signature],
  );
  return encodedPermitInput;
}
