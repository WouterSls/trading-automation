import { Contract, ethers, TransactionRequest, Wallet } from "ethers";
import { FeeAmount } from "./uniswap-v3-types";
import { ChainType, getChainConfig } from "../../config/chain-config";
import { UNISWAP_V3_ROUTER_INTERFACE } from "../../lib/smartcontract-abis/_index";

export class UniswapV3SwapRouterV2 {
  private routerContract: Contract;
  private routerAddress: string;

  constructor(private chain: ChainType) {
    const chainConfig = getChainConfig(chain);

    this.routerAddress = chainConfig.uniswap.v3.swapRouterV2Address;

    if (!this.routerAddress || this.routerAddress.trim() === "") {
      throw new Error(`UniV3 Router address not defined for chain: ${chainConfig.name}`);
    }

    this.routerContract = new ethers.Contract(this.routerAddress, UNISWAP_V3_ROUTER_INTERFACE);
  }

  getRouterAddress = () => this.routerAddress;

  /**
   * The swapExactInputSingle function is for performing exact input swaps,
   * which swap a fixed amount of one token for a maximum possible amount of another token
   *
   * @param tokenIn The address of the token to use a input for the swap
   * @param tokenOut The address of the token to receive
   * @param fee The fee amount
   * @param recipient The recipient of the tokens
   * @param amountIn The input amount for the trade
   * @param amountOutMin The minimum amount of output tokens to receive
   * @param sqrtPriceLimitX96 The sqrtPriceX96 pricelimit of the trade
   * @returns The encoded transaction request
   */
  createExactInputSingleTransaction(
    tokenIn: string,
    tokenOut: string,
    fee: FeeAmount,
    recipient: string,
    amountIn: bigint,
    amountOutMin: bigint,
    sqrtPriceLimitX96: bigint,
  ): TransactionRequest {
    const encodedData = this.routerContract.interface.encodeFunctionData("exactInputSingle", [
      {
        tokenIn: tokenIn,
        tokenOut: tokenOut,
        fee: fee,
        recipient: recipient,
        amountIn: amountIn,
        amountOutMinimum: amountOutMin,
        sqrtPriceLimitX96: sqrtPriceLimitX96,
      },
    ]);

    const tx: TransactionRequest = {
      to: this.routerAddress,
      data: encodedData,
    };

    return tx;
  }

  /**
   * Function for encoding exactInputSingle transaction data
   * Can be used in multicall transaction crafting
   *
   * @param tokenIn The address of the token to use a input for the swap
   * @param tokenOut The address of the token to receive
   * @param fee The fee amount
   * @param recipient The recipient of the tokens
   * @param amountIn The input amount for the trade
   * @param amountOutMin The minimum amount of output tokens to receive
   * @param sqrtPriceLimitX96 The sqrtPriceX96 pricelimit of the trade
   * @returns The encoded transaction data
   */
  encodeExactInputSingle(
    tokenIn: string,
    tokenOut: string,
    fee: FeeAmount,
    recipient: string,
    amountIn: bigint,
    amountOutMin: bigint,
    sqrtPriceLimitX96: bigint,
  ): string {
    const encodedData = this.routerContract.interface.encodeFunctionData("exactInputSingle", [
      {
        tokenIn: tokenIn,
        tokenOut: tokenOut,
        fee: fee,
        recipient: recipient,
        amountIn: amountIn,
        amountOutMinimum: amountOutMin,
        sqrtPriceLimitX96: sqrtPriceLimitX96,
      },
    ]);
    return encodedData;
  }

  /**
   * Creates an exact input transaction
   *
   * @param encodedPath The encoded path including the path of tokens to trade along of with the fee amounts
   * @param recipient The recipient of the tokens
   * @param amountIn The amount of input tokens to trade
   * @param amountOutMin The minimum amount of tokens to receive
   * @returns The encoded transaction request
   */
  createExactInputTransaction(
    encodedPath: string,
    recipient: string,
    amountIn: bigint,
    amountOutMin: bigint,
  ): TransactionRequest {
    const encodedData = this.routerContract.interface.encodeFunctionData("exactInput", [
      {
        path: encodedPath,
        recipient: recipient,
        amountIn: amountIn,
        amountOutMinimum: amountOutMin,
      },
    ]);

    const tx: TransactionRequest = {
      to: this.routerAddress,
      data: encodedData,
    };

    return tx;
  }

  /**
   * Function for encoding exactInput transaction data
   * Can be used in multicall transaction crafting
   *
   * @param encodedPath The encoded path including the path of tokens to trade along of with the fee amounts
   * @param recipient The recipient of the tokens
   * @param amountIn The amount of input tokens to trade
   * @param amountOutMin The minimum amount of tokens to receive
   * @returns The encoded transaction data
   */
  encodeExactInput(encodedPath: string, recipient: string, amountIn: bigint, amountOutMin: bigint): string {
    const encodedData = this.routerContract.interface.encodeFunctionData("exactInput", [
      {
        path: encodedPath,
        recipient: recipient,
        amountIn: amountIn,
        amountOutMinimum: amountOutMin,
      },
    ]);

    return encodedData;
  }

  /**
   *
   * The swapExactOutputSingle function is for performing exact output swaps,
   * which swap a minimum possible amount of one token for a fixed amount of another token.
   *
   * @param tokenIn The address of the token to use a input for the swap
   * @param tokenOut The address of the token to receive
   * @param fee The fee amount
   * @param recipient The recipient of the tokens
   * @param amountOut The amount of tokens to receive as output
   * @param amountInMaximum The maximum amount of input tokens to use for the swap
   * @param sqrtPriceLimitX96 The sqrtPriceX96 pricelimit of the trade
   * @returns The encoded transaction request
   */
  createExactOutputSingleTransaction(
    tokenIn: string,
    tokenOut: string,
    fee: FeeAmount,
    recipient: string,
    amountOut: bigint,
    amountInMaximum: bigint,
    sqrtPriceLimitX96: bigint,
  ): TransactionRequest {
    const encodedData = this.routerContract.interface.encodeFunctionData("exactOutputSingle", [
      {
        tokenIn: tokenIn,
        tokenOut: tokenOut,
        fee: fee,
        recipient: recipient,
        amountOut: amountOut,
        amountInMaximum: amountInMaximum,
        sqrtPriceLimitX96: sqrtPriceLimitX96,
      },
    ]);

    const tx: TransactionRequest = {
      to: this.routerAddress,
      data: encodedData,
    };

    return tx;
  }

  /**
   * Function for encoding exactInput transaction data
   * Can be used in multicall transaction crafting
   *
   * @param encodedPath The encoded path including the path of tokens to trade alongside of with the fee amounts (token order is reversed in ExactOutput)
   * @param recipient The recipient of the tokens
   * @param amountOut The amount of tokens to receive as output
   * @param amountInMaximum The maximum amount of input tokens to use for the swap
   * @returns The encoded transaction data
   */
  createExactOutputTransaction(
    encodedPath: string,
    recipient: string,
    amountOut: bigint,
    amountInMaximum: bigint,
  ): TransactionRequest {
    const encodedData = this.routerContract.interface.encodeFunctionData("exactOutput", [
      {
        path: encodedPath,
        recipient: recipient,
        amountOut: amountOut,
        amountInMaximum: amountInMaximum,
      },
    ]);

    const tx: TransactionRequest = {
      to: this.routerAddress,
      data: encodedData,
    };

    return tx;
  }

  /**
   * Function for encoding exactInput transaction data
   * Can be used in multicall transaction crafting
   *
   * @param encodedPath The encoded path including the path of tokens to trade along of with the fee amounts
   * @param recipient The recipient of the tokens
   * @param amountIn The amount of input tokens to trade
   * @param amountOutMin The minimum amount of tokens to receive
   * @returns The encoded transaction data
   */
  encodeWrapETH(value: bigint): string {
    const encodedData = this.routerContract.interface.encodeFunctionData("wrapETH", [value]);
    return encodedData;
  }

  /**
   * Function for encoding refundETH transaction data
   * Can be used in multicall transaction crafting for handling dust ETH after wrapping
   * @returns The encoded transaction data
   */
  encodeRefundETH(): string {
    const encodedData = this.routerContract.interface.encodeFunctionData("refundETH", []);
    return encodedData;
  }

  /**
   * Creates a multicall transaction for batching multiple router operations
   * @param data Array of encoded function data to execute in batch
   * @param deadline Optional deadline timestamp (defaults to 20 minutes from now)
   * @returns Transaction request for the multicall
   */
  createMulticallTransaction(deadline: number, data: string[]): TransactionRequest {
    const encodedData = this.routerContract.interface.encodeFunctionData("multicall", [deadline, data]);

    const tx: TransactionRequest = {
      to: this.routerAddress,
      data: encodedData,
    };

    return tx;
  }
}
