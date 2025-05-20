import { Contract, ethers, Wallet } from "ethers";

import { ChainType, getChainConfig } from "../../../config/chain-config";

import { QUOTER_INTERFACE } from "../../../lib/contract-abis/uniswap-v3";
import { validateNetwork } from "../../../lib/utils";
import {
  QuoteExactInputSingleParams,
  QuoterExactInputResponse,
  QuoteExactOutputSingleParams,
  QuoterExactOutputResponse,
} from "./uniswap-v3-types";

export class UniswapV3QuoterV2 {
  //Addresses
  private wethAddress: string;
  private usdcAddress: string;
  private quoterAddress: string;

  //Contract
  private quoterContract: Contract;

  constructor(private chain: ChainType) {
    const chainConfig = getChainConfig(chain);
    this.wethAddress = chainConfig.tokenAddresses.weth;
    this.usdcAddress = chainConfig.tokenAddresses.usdc!;
    this.quoterAddress = chainConfig.uniswap.v3.quoterV2Address;

    if (!this.usdcAddress || this.usdcAddress.trim() === "") {
      throw new Error(`USDC address not defined for chain: ${chainConfig.name}`);
    }

    if (!this.wethAddress || this.wethAddress.trim() === "") {
      throw new Error(`WETH address not defined for chain: ${chainConfig.name}`);
    }

    if (!this.quoterAddress || this.quoterAddress.trim() === "") {
      throw new Error(`Quoter address not defined for chain: ${chainConfig.name}`);
    }

    this.quoterContract = new ethers.Contract(this.quoterAddress, QUOTER_INTERFACE);
  }

  getQuoterAddress = () => this.quoterAddress;
  getWethAddress = () => this.wethAddress;
  getUsdcAddress = () => this.usdcAddress;

  async quoteExactInput(wallet: Wallet, path: string, amountIn: bigint): Promise<QuoterExactInputResponse> {
    this.quoterContract = this.quoterContract.connect(wallet) as Contract;

    await this._networkAndQuoterCheck(wallet);

    const { amountOut, sqrtPriceX96After, initializedTicksCrossed, gasEstimate } =
      await this.quoterContract.quoteExactInput.staticCall(path, amountIn);

    return { amountOut, sqrtPriceX96After, initializedTicksCrossed, gasEstimate };
  }

  async quoteExactInputSingle(wallet: Wallet, params: QuoteExactInputSingleParams): Promise<QuoterExactInputResponse> {
    this.quoterContract = this.quoterContract.connect(wallet) as Contract;

    await this._networkAndQuoterCheck(wallet);

    const { amountOut, sqrtPriceX96After, initializedTicksCrossed, gasEstimate } =
      await this.quoterContract.quoteExactInputSingle.staticCall(params);

    return { amountOut, sqrtPriceX96After, initializedTicksCrossed, gasEstimate };
  }

  async quoteExactOutput(wallet: Wallet, path: string, amountOut: bigint): Promise<QuoterExactOutputResponse> {
    this.quoterContract = this.quoterContract.connect(wallet) as Contract;

    await this._networkAndQuoterCheck(wallet);

    const { amountIn, sqrtPriceX96After, initializedTicksCrossed, gasEstimate } =
      await this.quoterContract.quoteExactOutput.staticCall(path, amountOut);

    return { amountIn, sqrtPriceX96After, initializedTicksCrossed, gasEstimate };
  }

  async quoteExactOutputSingle(
    wallet: Wallet,
    params: QuoteExactOutputSingleParams,
  ): Promise<QuoterExactOutputResponse> {
    this.quoterContract = this.quoterContract.connect(wallet) as Contract;

    await this._networkAndQuoterCheck(wallet);

    const { amountIn, sqrtPriceX96After, initializedTicksCrossed, gasEstimate } =
      await this.quoterContract.quoteExactOutputSingle.staticCall(params);

    return { amountIn, sqrtPriceX96After, initializedTicksCrossed, gasEstimate };
  }

  /**
   * Validates that the wallet is on the correct network and that the factory address is valid
   * @param wallet Wallet instance -> blockchain provider
   * @returns true if the wallet is on the correct network and that the factory address is valid, false otherwise
   */
  private async _networkAndQuoterCheck(wallet: Wallet): Promise<boolean> {
    await validateNetwork(wallet, this.chain);

    const code = await wallet.provider!.getCode(this.quoterAddress);
    if (code === "0x" || code === "0x0") {
      throw new Error(`No contract found at router address: ${this.quoterAddress}`);
    }

    try {
      await this.quoterContract.quoteExactInputSingle.staticCall({
        tokenIn: this.wethAddress,
        tokenOut: this.usdcAddress,
        fee: 3000,
        amountIn: ethers.parseUnits("100", 18),
        sqrtPriceLimitX96: 0n,
      });
      return true;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";

      const revertDataError = errorMessage.includes("missing revert data");

      const functionNotFoundError =
        errorMessage.includes("function not found") ||
        errorMessage.includes("not a function") ||
        errorMessage.includes("unknown function");

      const missingProviderError =
        errorMessage.toLowerCase().includes("cannot read property") ||
        errorMessage.toLowerCase().includes("cannot read properties") ||
        errorMessage.includes("missing provider");

      if (revertDataError) {
        return true;
      }

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
