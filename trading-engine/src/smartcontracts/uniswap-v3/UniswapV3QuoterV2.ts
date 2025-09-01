import { Contract, ethers, Wallet } from "ethers";

import { ChainType, getChainConfig } from "../../config/chain-config";

import { UNISWAP_V3_QUOTER_INTERFACE } from "../../lib/smartcontract-abis/_index";
import { validateNetwork } from "../../lib/utils";
import { FeeAmount } from "./uniswap-v3-types";

export class UniswapV3QuoterV2 {
  private quoterContract: Contract;
  private quoterAddress: string;

  constructor(private chain: ChainType) {
    const chainConfig = getChainConfig(chain);
    this.quoterAddress = chainConfig.uniswap.v3.quoterV2Address;

    if (!this.quoterAddress || this.quoterAddress.trim() === "") {
      throw new Error(`Quoter address not defined for chain: ${chainConfig.name}`);
    }

    this.quoterContract = new ethers.Contract(this.quoterAddress, UNISWAP_V3_QUOTER_INTERFACE);
  }

  getQuoterAddress = () => this.quoterAddress;

  /**
   * Quotes the amount out for a single-hop exact input swap
   * @param wallet - The wallet instance connected to the blockchain provider
   * @param tokenIn - The input token address
   * @param tokenOut - The output token address
   * @param fee - The pool fee tier (from FeeAmount enum)
   * @param recipient - The recipient address for the swap
   * @param amountIn - The exact input amount to swap
   * @param amountOutMin - The minimum output amount expected (for slippage protection)
   * @param sqrtPriceLimitX96 - The price limit for the swap (0 for no limit)
   * @returns Promise containing the quoted output amount, price after swap, ticks crossed, and gas estimate
   */
  async quoteExactInputSingle(
    wallet: Wallet,
    tokenIn: string,
    tokenOut: string,
    fee: FeeAmount,
    recipient: string,
    amountIn: bigint,
    amountOutMin: bigint,
    sqrtPriceLimitX96: bigint,
  ): Promise<{ amountOut: bigint; sqrtPriceX96After: bigint; initializedTicksCrossed: bigint; gasEstimate: bigint }> {
    this.quoterContract = this.quoterContract.connect(wallet) as Contract;

    await this._networkAndQuoterCheck(wallet);

    const exactInputSingleParmas = {
      tokenIn,
      tokenOut,
      fee,
      recipient,
      amountIn,
      amountOutMin,
      sqrtPriceLimitX96,
    };

    try {
      const { amountOut, sqrtPriceX96After, initializedTicksCrossed, gasEstimate } =
        await this.quoterContract.quoteExactInputSingle.staticCall(exactInputSingleParmas);

      return { amountOut, sqrtPriceX96After, initializedTicksCrossed, gasEstimate };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";

      if (
        errorMessage.toLowerCase().includes("no data present") ||
        errorMessage.toLowerCase().includes("unexpected error")
      ) {
        return {
          amountOut: 0n,
          sqrtPriceX96After: 0n,
          initializedTicksCrossed: 0n,
          gasEstimate: 0n,
        };
      }
      throw error;
    }
  }

  /**
   * Function for encoding quoteExactInputSingle call data
   * Can be used in multicall transaction crafting
   *
   * @param tokenIn - The input token address
   * @param tokenOut - The output token address
   * @param fee - The pool fee tier (from FeeAmount enum)
   * @param recipient - The recipient address for the swap
   * @param amountIn - The exact input amount to swap
   * @param amountOutMin - The minimum output amount expected (for slippage protection)
   * @param sqrtPriceLimitX96 - The price limit for the swap (0 for no limit)
   * @returns The encoded function call data
   */
  encodeQuoteExactInputSingle(
    tokenIn: string,
    tokenOut: string,
    fee: FeeAmount,
    recipient: string,
    amountIn: bigint,
    amountOutMin: bigint,
    sqrtPriceLimitX96: bigint,
  ): string {
    const exactInputSingleParams = {
      tokenIn,
      tokenOut,
      fee,
      recipient,
      amountIn,
      amountOutMin,
      sqrtPriceLimitX96,
    };

    const encodedData = this.quoterContract.interface.encodeFunctionData("quoteExactInputSingle", [
      exactInputSingleParams,
    ]);

    return encodedData;
  }

  /**
   * Function for encoding quoteExactInputSingle call data
   * Can be used in multicall transaction crafting
   *
   * @param data - the resulting hex byte data from the  call request
   * @returns amountOut, sqrtPriceX96After, initiliazedTicksCrossed, gasEstimate
   */
  decodeQuoteExactInputSingleResultData(data: ethers.BytesLike): {
    amountOut: bigint;
    sqrtPriceX96After: bigint;
    initializedTicksCrossed: bigint;
    gasEstimate: bigint;
  } {
    const { amountOut, sqrtPriceX96After, initializedTicksCrossed, gasEstimate } =
      this.quoterContract.interface.decodeFunctionResult("quoteExactInputSingle", data);

    return { amountOut, sqrtPriceX96After, initializedTicksCrossed, gasEstimate };
  }

  /**
   * Quotes the amount out for a multi-hop exact input swap
   * @param wallet - The wallet instance connected to the blockchain provider
   * @param path - The encoded path for the multi-hop swap (token addresses and fees concatenated)
   * @param amountIn - The exact input amount to swap
   * @returns Promise containing the quoted output amount, price after swap, ticks crossed, and gas estimate
   */
  async quoteExactInput(
    wallet: Wallet,
    path: string,
    amountIn: bigint,
  ): Promise<{ amountOut: bigint; sqrtPriceX96After: bigint; initializedTicksCrossed: bigint; gasEstimate: bigint }> {
    this.quoterContract = this.quoterContract.connect(wallet) as Contract;

    await this._networkAndQuoterCheck(wallet);

    try {
      const { amountOut, sqrtPriceX96After, initializedTicksCrossed, gasEstimate } =
        await this.quoterContract.quoteExactInput.staticCall(path, amountIn);

      return { amountOut, sqrtPriceX96After, initializedTicksCrossed, gasEstimate };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";

      if (
        errorMessage.toLowerCase().includes("no data present") ||
        errorMessage.toLowerCase().includes("unexpected error")
      ) {
        return {
          amountOut: 0n,
          sqrtPriceX96After: 0n,
          initializedTicksCrossed: 0n,
          gasEstimate: 0n,
        };
      }

      throw error;
    }
  }

  /**
   * Function for encoding quoteExactInput call data
   * Can be used in multicall transaction crafting
   *
   * @param path - The encoded path for the multi-hop swap (token addresses and fees concatenated)
   * @param amountIn - The exact input amount to swap
   * @returns The encoded function call data
   */
  encodeQuoteExactInput(path: string, amountIn: bigint): string {
    const encodedData = this.quoterContract.interface.encodeFunctionData("quoteExactInput", [path, amountIn]);

    return encodedData;
  }

  /**
   * Function for encoding quoteExactInputSingle call data
   * Can be used in multicall transaction crafting
   *
   * @param data - the resulting hex byte data from the  call request
   * @returns amountOut, sqrtPriceX96After, initiliazedTicksCrossed, gasEstimate
   */
  decodeQuoteExactInputResultData(data: ethers.BytesLike): {
    amountOut: bigint;
    sqrtPriceX96After: bigint;
    initializedTicksCrossed: bigint;
    gasEstimate: bigint;
  } {
    const { amountOut, sqrtPriceX96After, initializedTicksCrossed, gasEstimate } =
      this.quoterContract.interface.decodeFunctionResult("quoteExactInput", data);

    return { amountOut, sqrtPriceX96After, initializedTicksCrossed, gasEstimate };
  }

  /**
   * Quotes the amount in required for a single-hop exact output swap
   * @param wallet - The wallet instance connected to the blockchain provider
   * @param tokenIn - The input token address
   * @param tokenOut - The output token address
   * @param amountOut - The exact output amount desired
   * @param fee - The pool fee tier (from FeeAmount enum)
   * @param sqrtPriceLimitX96 - The price limit for the swap (0 for no limit)
   * @returns Promise containing the quoted input amount required, price after swap, ticks crossed, and gas estimate
   */
  async quoteExactOutputSingle(
    wallet: Wallet,
    tokenIn: string,
    tokenOut: string,
    amountOut: bigint,
    fee: FeeAmount,
    sqrtPriceLimitX96: bigint,
  ): Promise<{ amountIn: bigint; sqrtPriceX96After: bigint; initializedTicksCrossed: bigint; gasEstimate: bigint }> {
    this.quoterContract = this.quoterContract.connect(wallet) as Contract;

    await this._networkAndQuoterCheck(wallet);

    const exactOutputSingleParams = {
      tokenIn,
      tokenOut,
      amountOut,
      fee,
      sqrtPriceLimitX96,
    };

    try {
      const { amountIn, sqrtPriceX96After, initializedTicksCrossed, gasEstimate } =
        await this.quoterContract.quoteExactOutputSingle.staticCall(exactOutputSingleParams);

      return { amountIn, sqrtPriceX96After, initializedTicksCrossed, gasEstimate };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";

      if (
        errorMessage.toLowerCase().includes("no data present") ||
        errorMessage.toLowerCase().includes("unexpected error")
      ) {
        return {
          amountIn: 0n,
          sqrtPriceX96After: 0n,
          initializedTicksCrossed: 0n,
          gasEstimate: 0n,
        };
      }

      throw error;
    }
  }

  /**
   * Quotes the amount in required for a multi-hop exact output swap
   * @param wallet - The wallet instance connected to the blockchain provider
   * @param path - The encoded path for the multi-hop swap (token addresses and fees concatenated, in reverse order)
   * @param amountOut - The exact output amount desired
   * @returns Promise containing the quoted input amount required, price after swap, ticks crossed, and gas estimate
   */
  async quoteExactOutput(
    wallet: Wallet,
    path: string,
    amountOut: bigint,
  ): Promise<{ amountIn: bigint; sqrtPriceX96After: bigint; initializedTicksCrossed: bigint; gasEstimate: bigint }> {
    this.quoterContract = this.quoterContract.connect(wallet) as Contract;

    await this._networkAndQuoterCheck(wallet);

    try {
      const { amountIn, sqrtPriceX96After, initializedTicksCrossed, gasEstimate } =
        await this.quoterContract.quoteExactOutput.staticCall(path, amountOut);

      return { amountIn, sqrtPriceX96After, initializedTicksCrossed, gasEstimate };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";

      if (
        errorMessage.toLowerCase().includes("no data present") ||
        errorMessage.toLowerCase().includes("unexpected error")
      ) {
        return {
          amountIn: 0n,
          sqrtPriceX96After: 0n,
          initializedTicksCrossed: 0n,
          gasEstimate: 0n,
        };
      }

      throw error;
    }
  }

  /**
   * Validates that the wallet is on the correct network and that the factory address is valid
   * @param wallet Wallet instance -> blockchain provider
   * @returns true if the wallet is on the correct network and that the factory address is valid, false otherwise
   */
  private async _networkAndQuoterCheck(wallet: Wallet): Promise<void> {
    try {
      await validateNetwork(wallet, this.chain);

      const code = await wallet.provider!.getCode(this.quoterAddress);
      if (code === "0x" || code === "0x0") {
        throw new Error(`No contract found at quoter address: ${this.quoterAddress}`);
      }

      await this.quoterContract.factory();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";

      const functionNotFoundError =
        errorMessage.includes("function not found") ||
        errorMessage.includes("not a function") ||
        errorMessage.includes("unknown function");

      const missingProviderError =
        errorMessage.toLowerCase().includes("cannot read property") ||
        errorMessage.toLowerCase().includes("cannot read properties") ||
        errorMessage.includes("missing provider");

      if (functionNotFoundError) {
        throw new Error(`Contract at ${this.quoterAddress} is not a Uniswap V3 Quoter`);
      }

      if (missingProviderError) {
        throw new Error(`Wallet has missing provider: ${errorMessage}`);
      }

      throw new Error(`${errorMessage}`);
    }
  }
}
