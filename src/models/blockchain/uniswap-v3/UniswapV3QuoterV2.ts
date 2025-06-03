import { Contract, ethers, Wallet } from "ethers";

import { ChainConfig, ChainType, getChainConfig } from "../../../config/chain-config";

import { UNISWAP_V3_QUOTER_INTERFACE } from "../../../lib/contract-abis/uniswap-v3";
import { validateNetwork } from "../../../lib/utils";
import {
  QuoteExactInputSingleParams,
  QuoterExactInputResponse,
  QuoteExactOutputSingleParams,
  QuoterExactOutputResponse,
  FeeAmount,
} from "./uniswap-v3-types";

export class UniswapV3QuoterV2 {
  private quoterContract: Contract;
  private quoterAddress: string;

  private WETH_ADDRESS: string;
  private USDC_ADDRESS: string;

  constructor(private chain: ChainType) {
    const chainConfig = getChainConfig(chain);
    this.quoterAddress = chainConfig.uniswap.v3.quoterV2Address;
    this.WETH_ADDRESS = chainConfig.tokenAddresses.weth;
    this.USDC_ADDRESS = chainConfig.tokenAddresses.usdc;

    if (!this.quoterAddress || this.quoterAddress.trim() === "") {
      throw new Error(`Quoter address not defined for chain: ${chainConfig.name}`);
    }

    this.quoterContract = new ethers.Contract(this.quoterAddress, UNISWAP_V3_QUOTER_INTERFACE);
  }

  getQuoterAddress = () => this.quoterAddress;

  async quoteExactInput(wallet: Wallet, path: string, amountIn: bigint): Promise<QuoterExactInputResponse> {
    this.quoterContract = this.quoterContract.connect(wallet) as Contract;

    await this._networkAndQuoterCheck(wallet);

    try {
      const { amountOut, sqrtPriceX96After, initializedTicksCrossed, gasEstimate } =
        await this.quoterContract.quoteExactInput.staticCall(path, amountIn);

      return { amountOut, sqrtPriceX96After, initializedTicksCrossed, gasEstimate };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";

      if (errorMessage.toLowerCase().includes("no data present")) {
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

  async quoteExactInputSingle(
    wallet: Wallet,
    tokenIn: string,
    tokenOut: string,
    fee: FeeAmount,
    recipient: string,
    amountIn: bigint,
    amountOutMin: bigint,
    sqrtPriceLimitX96: bigint,
  ): Promise<QuoterExactInputResponse> {
    this.quoterContract = this.quoterContract.connect(wallet) as Contract;

    await this._networkAndQuoterCheck(wallet);

    const ExactInputSingleParmas = {
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
        await this.quoterContract.quoteExactInputSingle.staticCall(ExactInputSingleParmas);

      return { amountOut, sqrtPriceX96After, initializedTicksCrossed, gasEstimate };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";

      if (errorMessage.toLowerCase().includes("no data present")) {
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

  async quoteExactOutput(wallet: Wallet, path: string, amountOut: bigint): Promise<QuoterExactOutputResponse> {
    this.quoterContract = this.quoterContract.connect(wallet) as Contract;

    await this._networkAndQuoterCheck(wallet);

    try {
      const { amountIn, sqrtPriceX96After, initializedTicksCrossed, gasEstimate } =
        await this.quoterContract.quoteExactOutput.staticCall(path, amountOut);

      return { amountIn, sqrtPriceX96After, initializedTicksCrossed, gasEstimate };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";

      if (errorMessage.toLowerCase().includes("no data present")) {
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

  async quoteExactOutputSingle(
    wallet: Wallet,
    params: QuoteExactOutputSingleParams,
  ): Promise<QuoterExactOutputResponse> {
    this.quoterContract = this.quoterContract.connect(wallet) as Contract;

    await this._networkAndQuoterCheck(wallet);

    // Map the params to match the ABI expectation (amount -> amountOut)
    const contractParams = {
      tokenIn: params.tokenIn,
      tokenOut: params.tokenOut,
      amountOut: params.amount, // Map 'amount' to 'amountOut' for the contract call
      fee: params.fee,
      sqrtPriceLimitX96: params.sqrtPriceLimitX96,
    };

    try {
      const { amountIn, sqrtPriceX96After, initializedTicksCrossed, gasEstimate } =
        await this.quoterContract.quoteExactOutputSingle.staticCall(contractParams);

      return { amountIn, sqrtPriceX96After, initializedTicksCrossed, gasEstimate };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";

      if (errorMessage.toLowerCase().includes("no data present")) {
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
