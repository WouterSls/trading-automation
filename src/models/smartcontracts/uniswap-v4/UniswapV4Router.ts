import { AbiCoder, Contract, dnsEncode, Wallet } from "ethers";
import { IV4ExactInputParams, IV4ExactInputSingleParams } from "../universal-router/universal-router-types";

/**
 * @description UniswapV4Router is an abstract contract not meant to be deployed
 *  This abstraction is created for the purpose to encode pool actions to be used as input for the universal router.
 *  It acts as an intermediary between the universal router and the uniswap v4 for swaps.
 */
//TODO: Static class?
export class UniswapV4Router {
  constructor() {}

  encodeSwapExactInputSingle(swapParams: IV4ExactInputSingleParams) {
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

  encodeSwapExactInput(swapParams:IV4ExactInputParams) {
    const encodedData = AbiCoder.defaultAbiCoder().encode(
      [],
      []
    )

    return encodedData;
  }

  encodeSettleAll() {}

  encodeTakeAll() {}
}
