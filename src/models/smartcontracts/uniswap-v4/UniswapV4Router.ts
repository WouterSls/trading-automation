import { AbiCoder, Contract, dnsEncode, ethers, Wallet } from "ethers";
import {
  IV4ExactInputParams,
  IV4ExactInputSingleParams,
  IV4SettleParams,
  IV4TakeParams,
  V4PoolAction,
  V4PoolActionConstants,
} from "../universal-router/universal-router-types";
import { PoolKey } from "./uniswap-v4-types";

/**
 * @description UniswapV4Router is an abstract contract not meant to be deployed
 *  This abstraction is created for the purpose to encode pool actions to be used as input for the universal router.
 *  It acts as an intermediary between the universal router and the uniswap v4 for swaps.
 */
//TODO: Static class?
export class UniswapV4Router {
  constructor() {}

  encodeV4SwapExactInputSingle(poolKey: PoolKey, zeroForOne: boolean, amountIn: bigint, amountOutMinimum: bigint, recipient: string): string {

    const swapParams: IV4ExactInputSingleParams = {
      poolKey: poolKey,
      zeroForOne: zeroForOne,
      amountIn: amountIn,
      amountOutMinimum: amountOutMinimum,
      hookData: recipient,
    };

    const settleParams: IV4SettleParams = {
      inputCurrency: poolKey.currency0,
      amountIn: amountIn,
      bool: zeroForOne,
    };

    const takeParams: IV4TakeParams = {
      outputCurrency: poolKey.currency1,
      recipient: recipient,
      amount: V4PoolActionConstants.OPEN_DELTA,
    };

    const actions = ethers.concat([V4PoolAction.SWAP_EXACT_IN_SINGLE, V4PoolAction.SETTLE, V4PoolAction.TAKE]);
    const encodedSwapExactInputSingleParams = this.encodeSwapExactInputSingle(swapParams);
    const encodedSettleParams = this.encodeSettleAll(settleParams);
    const encodedTakeParams = this.encodeTakeAll(takeParams);

    const encodedInput = this.encodeSwapCommandInput(
      actions,
      encodedSwapExactInputSingleParams,
      encodedSettleParams,
      encodedTakeParams,
    );

    return encodedInput;
  }

  private encodeSwapCommandInput(
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

  private encodeSwapExactInputSingle(swapParams: IV4ExactInputSingleParams) {
    const poolKeyTuple = [
      swapParams.poolKey.currency0,
      swapParams.poolKey.currency1,
      swapParams.poolKey.fee,
      swapParams.poolKey.tickSpacing,
      swapParams.poolKey.hooks,
    ] as const;

    const encodedData = AbiCoder.defaultAbiCoder().encode(
      [
        "tuple(address,address,uint24,int24,address)", // PoolKey
        "bool", // zeroForOne
        "uint128", // amountIn
        "uint128", // amountOutMinimum
        "bytes", // hookData
      ],
      [poolKeyTuple, swapParams.zeroForOne, swapParams.amountIn, swapParams.amountOutMinimum, swapParams.hookData],
    );
    return encodedData;
  }

  private encodeSwapExactInput(swapParams: IV4ExactInputParams) {
    const encodedData = AbiCoder.defaultAbiCoder().encode([], []);

    return encodedData;
  }

  private encodeSettleAll(settleParams: IV4SettleParams) {
    const encodedParams = AbiCoder.defaultAbiCoder().encode(
      ["address", "uint128", "bool"],
      [settleParams.inputCurrency, settleParams.amountIn, settleParams.bool],
    );
    return encodedParams;
  }

  private encodeTakeAll(takeParams: IV4TakeParams) {
    const encodedParams = AbiCoder.defaultAbiCoder().encode(
      ["address", "address", "uint256"],
      [takeParams.outputCurrency, takeParams.recipient, takeParams.amount],
    );
    return encodedParams;
  }
}
