import { Contract, ethers, Wallet } from "ethers";
import { ChainType, getChainConfig } from "../../config/chain-config";
import { UNISWAP_V4_QUOTER_INTERFACE } from "../../lib/smartcontract-abis/_index";
import { PoolKey, PathSegment } from "./uniswap-v4-types";
import { validateNetwork } from "../../lib/utils";

export class UniswapV4Quoter {
  private quoterContract: Contract;
  private quoterAddress: string;

  constructor(private chain: ChainType) {
    const chainConfig = getChainConfig(chain);
    this.quoterAddress = chainConfig.uniswap.v4.quoterAddress;

    if (!this.quoterAddress || this.quoterAddress.trim() === "") {
      throw new Error(`Quoter address not defined for chain: ${chainConfig.name}`);
    }

    this.quoterContract = new ethers.Contract(this.quoterAddress, UNISWAP_V4_QUOTER_INTERFACE);
  }

  getQuoterAddress = () => this.quoterAddress;

  /**
   * Quotes the amount out for a single-hop exact input swap
   * @param wallet - The wallet instance connected to the blockchain provider
   * @param poolKey - The pool key containing currency addresses, fee, tick spacing, and hooks
   * @param zeroForOne - Direction of the swap (true = currency0 to currency1, false = currency1 to currency0)
   * @param amountSpecified - The exact input amount to swap
   * @param hookData - Encoded hook data to pass to the pool hooks
   * @returns Promise containing the quoted output amount and gas estimate
   */
  async quoteExactInputSingle(
    wallet: Wallet,
    poolKey: PoolKey,
    zeroForOne: boolean,
    amountSpecified: bigint,
    hookData: string,
  ): Promise<{ amountOut: bigint; gasEstimate: bigint }> {
    this.quoterContract = this.quoterContract.connect(wallet) as Contract;

    await this._networkAndQuoterCheck(wallet);

    const params = {
      poolKey,
      zeroForOne,
      exactAmount: amountSpecified,
      hookData,
    };

    try {
      const { amountOut, gasEstimate } = await this.quoterContract.quoteExactInputSingle.staticCall(params);

      return { amountOut, gasEstimate };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";

      if (errorMessage.toLowerCase().includes("no data present")) {
        return {
          amountOut: 0n,
          gasEstimate: 0n,
        };
      }

      throw new Error(errorMessage);
    }
  }

  /**
   * Quotes the amount out for a multi-hop exact input swap
   * @param wallet - The wallet instance connected to the blockchain provider
   * @param exactCurrency - The input currency address
   * @param path - Array of path segments defining the swap route
   * @param exactAmount - The exact input amount to swap
   * @returns Promise containing the quoted output amount and gas estimate
   */
  async quoteExactInput(
    wallet: Wallet,
    exactCurrency: string,
    path: PathSegment[],
    exactAmount: bigint,
  ): Promise<{ amountOut: bigint; gasEstimate: bigint }> {
    this.quoterContract = this.quoterContract.connect(wallet) as Contract;

    await this._networkAndQuoterCheck(wallet);

    const params = {
      exactCurrency,
      path,
      exactAmount,
    };

    try {
      const { amountOut, gasEstimate } = await this.quoterContract.quoteExactInput.staticCall(params);

      return { amountOut, gasEstimate };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";

      if (errorMessage.toLowerCase().includes("no data present")) {
        return {
          amountOut: 0n,
          gasEstimate: 0n,
        };
      }

      throw new Error(errorMessage);
    }
  }

  /**
   * Quotes the amount in for a single-hop exact output swap
   * @param wallet - The wallet instance connected to the blockchain provider
   * @param poolKey - The pool key containing currency addresses, fee, tick spacing, and hooks
   * @param zeroForOne - Direction of the swap (true = currency0 to currency1, false = currency1 to currency0)
   * @param amountSpecified - The exact output amount desired
   * @param hookData - Encoded hook data to pass to the pool hooks
   * @returns Promise containing the quoted input amount required and gas estimate
   */
  async quoteExactOutputSingle(
    wallet: Wallet,
    poolKey: PoolKey,
    zeroForOne: boolean,
    amountSpecified: bigint,
    hookData: string,
  ): Promise<{ amountIn: bigint; gasEstimate: bigint }> {
    this.quoterContract = this.quoterContract.connect(wallet) as Contract;

    await this._networkAndQuoterCheck(wallet);

    const params = {
      poolKey,
      zeroForOne,
      exactAmount: amountSpecified,
      hookData,
    };

    try {
      const { amountIn, gasEstimate } = await this.quoterContract.quoteExactOutputSingle.staticCall(params);

      return { amountIn, gasEstimate };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";

      if (errorMessage.toLowerCase().includes("no data present")) {
        return {
          amountIn: 0n,
          gasEstimate: 0n,
        };
      }

      throw new Error(errorMessage);
    }
  }

  /**
   * Quotes the amount in for a multi-hop exact output swap
   * @param wallet - The wallet instance connected to the blockchain provider
   * @param exactCurrency - The output currency address
   * @param path - Array of path segments defining the swap route
   * @param exactAmount - The exact output amount desired
   * @returns Promise containing the quoted input amount required and gas estimate
   */
  async quoteExactOutput(
    wallet: Wallet,
    exactCurrency: string,
    path: PathSegment[],
    exactAmount: bigint,
  ): Promise<{ amountIn: bigint; gasEstimate: bigint }> {
    this.quoterContract = this.quoterContract.connect(wallet) as Contract;

    await this._networkAndQuoterCheck(wallet);

    const params = {
      exactCurrency,
      path,
      exactAmount,
    };

    try {
      const { amountIn, gasEstimate } = await this.quoterContract.quoteExactOutput.staticCall(params);

      return { amountIn, gasEstimate };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";

      if (errorMessage.toLowerCase().includes("no data present")) {
        return {
          amountIn: 0n,
          gasEstimate: 0n,
        };
      }

      throw new Error(errorMessage);
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

      await this.quoterContract.poolManager();
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
