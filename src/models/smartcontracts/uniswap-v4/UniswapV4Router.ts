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

// Type-safe parameter types for each pool action
export type SwapExactInputSingleParams = [
  poolKey: PoolKey,
  zeroForOne: boolean,
  amountIn: bigint,
  amountOutMinimum: bigint,
  hookData: string,
];

export type SettleAllParams = [inputCurrency: string, amountIn: bigint, zeroForOne: boolean];

export type TakeAllParams = [outputCurrency: string, recipient: string, amount: number];

// Discriminated union for type-safe pool action parameters
export type PoolActionParams =
  | { action: V4PoolAction.SWAP_EXACT_IN_SINGLE; params: SwapExactInputSingleParams }
  | { action: V4PoolAction.SETTLE_ALL; params: SettleAllParams }
  | { action: V4PoolAction.TAKE_ALL; params: TakeAllParams };

/**
 * @description UniswapV4Router is an abstract contract not meant to be deployed
 *  This abstraction is created for the purpose to encode pool actions to be used as input for the universal router.
 *  It acts as an intermediary between the universal router and the uniswap v4 for swaps.
 */
//TODO: Static class?
export class UniswapV4Router {
  constructor() {}

  encodeV4SwapExactInputSingle(
    poolKey: PoolKey,
    zeroForOne: boolean,
    amountIn: bigint,
    amountOutMinimum: bigint,
    recipient: string,
  ): string {
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

    const encodedSwapExactInputSingleParams = this.encodeSwapExactInputSingle(
      poolKey,
      zeroForOne,
      amountIn,
      amountOutMinimum,
      ethers.ZeroAddress,
    );
    const encodedSettleParams = this.encodeSettleAll(
      settleParams.inputCurrency,
      settleParams.amountIn,
      settleParams.bool,
    );
    const encodedTakeParams = this.encodeTakeAll(takeParams.outputCurrency, takeParams.recipient, takeParams.amount);

    const encodedInput = this.encodeV4SwapCommandInput(actions, [
      encodedSwapExactInputSingleParams,
      encodedSettleParams,
      encodedTakeParams,
    ]);

    return encodedInput;
  }

  public encodeV4SwapCommandInput(actions: string, encodedActionsData: string[]) {
    const encodedSwapCommandInput = AbiCoder.defaultAbiCoder().encode(
      ["bytes", "bytes[]"],
      [actions, encodedActionsData],
    );
    return encodedSwapCommandInput;
  }

  public encodeSwapExactInputSingle(
    poolKey: PoolKey,
    zeroForOne: boolean,
    amountIn: bigint,
    amountOutMinimum: bigint,
    hookData: string,
  ) {
    const poolKeyTuple = [
      poolKey.currency0,
      poolKey.currency1,
      poolKey.fee,
      poolKey.tickSpacing,
      poolKey.hooks,
    ] as const;

    const encodedData = AbiCoder.defaultAbiCoder().encode(
      [
        "tuple(address,address,uint24,int24,address)", // PoolKey
        "bool", // zeroForOne
        "uint128", // amountIn
        "uint128", // amountOutMinimum
        "bytes", // hookData
      ],
      [poolKeyTuple, zeroForOne, amountIn, amountOutMinimum, hookData],
    );
    return encodedData;
  }

  private encodeSwapExactInput(swapParams: IV4ExactInputParams) {
    const encodedData = AbiCoder.defaultAbiCoder().encode([], []);

    return encodedData;
  }

  public encodeSettleAll(inputCurrency: string, amountIn: bigint, zeroForOne: boolean) {
    const encodedParams = AbiCoder.defaultAbiCoder().encode(
      ["address", "uint128", "bool"],
      [inputCurrency, amountIn, zeroForOne],
    );
    return encodedParams;
  }

  public encodeTakeAll(outputCurrency: string, recipient: string, amount: number) {
    const encodedParams = AbiCoder.defaultAbiCoder().encode(
      ["address", "address", "uint256"],
      [outputCurrency, recipient, amount],
    );
    return encodedParams;
  }

  /**
   * Type-safe method to encode pool actions
   * @param v4PoolAction The pool action to encode
   * @param params The parameters for the specific pool action
   * @returns Encoded data string
   */
  public encodePoolAction(v4PoolAction: V4PoolAction.SWAP_EXACT_IN_SINGLE, params: SwapExactInputSingleParams): string;
  public encodePoolAction(v4PoolAction: V4PoolAction.SETTLE_ALL, params: SettleAllParams): string;
  public encodePoolAction(v4PoolAction: V4PoolAction.TAKE_ALL, params: TakeAllParams): string;
  public encodePoolAction(v4PoolAction: V4PoolAction, params: any[]): string {
    switch (v4PoolAction) {
      case V4PoolAction.SWAP_EXACT_IN_SINGLE:
        const [poolKey, zeroForOne, amountIn, amountOutMinimum, hookData] = params as SwapExactInputSingleParams;
        return this.encodeSwapExactInputSingle(poolKey, zeroForOne, amountIn, amountOutMinimum, hookData);

      case V4PoolAction.SETTLE_ALL:
        const [inputCurrency, settlAmountIn, settleZeroForOne] = params as SettleAllParams;
        return this.encodeSettleAll(inputCurrency, settlAmountIn, settleZeroForOne);

      case V4PoolAction.TAKE_ALL:
        const [outputCurrency, recipient, amount] = params as TakeAllParams;
        return this.encodeTakeAll(outputCurrency, recipient, amount);

      default:
        throw new Error(`Unsupported pool action: ${v4PoolAction}`);
    }
  }
}
