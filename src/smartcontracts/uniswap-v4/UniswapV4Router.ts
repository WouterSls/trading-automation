import { AbiCoder} from "ethers";
import { PoolActionParams, PoolKey, V4PoolAction} from "./uniswap-v4-types";

/**
 * @description UniswapV4Router is an abstract contract not meant to be deployed
 *  This abstraction is created for the purpose to encode pool actions to be used as input for the universal router.
 *  It acts as an intermediary between the universal router and the uniswap v4 for swaps.
 */
export class UniswapV4Router {
  public static encodeV4SwapCommandInput(actions: string, encodedActionsData: string[]) {
    const encodedSwapCommandInput = AbiCoder.defaultAbiCoder().encode(
      ["bytes", "bytes[]"],
      [actions, encodedActionsData],
    );
    return encodedSwapCommandInput;
  }

  public static encodeSwapExactInputSingle(
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

  public static encodeSwapExactInput() {
    const encodedData = AbiCoder.defaultAbiCoder().encode([], []);

    return encodedData;
  }

  public static encodeSettleAllSingle(inputCurrency: string, amountIn: bigint, zeroForOne: boolean) {
    const encodedParams = AbiCoder.defaultAbiCoder().encode(
      ["address", "uint128", "bool"],
      [inputCurrency, amountIn, zeroForOne],
    );
    return encodedParams;
  }

  public static encodeSettleAll(inputCurrency: string, amountIn: bigint) {
    const encodedParams = AbiCoder.defaultAbiCoder().encode(["address", "uint128"], [inputCurrency, amountIn]);
    return encodedParams;
  }

  public static encodeTakeAll(outputCurrency: string, recipient: string, amount: number) {
    const encodedParams = AbiCoder.defaultAbiCoder().encode(
      ["address", "address", "uint256"],
      [outputCurrency, recipient, amount],
    );
    return encodedParams;
  }

  public static encodePoolActionSafe(actionParams: PoolActionParams): string {
    switch (actionParams.action) {
      case V4PoolAction.SWAP_EXACT_IN_SINGLE:
        const [poolKey, zeroForOne, amountIn, amountOutMinimum, hookData] = actionParams.params;
        return UniswapV4Router.encodeSwapExactInputSingle(poolKey, zeroForOne, amountIn, amountOutMinimum, hookData);

      case V4PoolAction.SETTLE_ALL:
        const [inputCurrency, settlAmountIn] = actionParams.params;
        return UniswapV4Router.encodeSettleAll(inputCurrency, settlAmountIn);

      case V4PoolAction.TAKE_ALL:
        const [outputCurrency, recipient, amount] = actionParams.params;
        return UniswapV4Router.encodeTakeAll(outputCurrency, recipient, amount);
    }
  }
}
