import { Contract, ContractTransactionResponse, ethers, TransactionRequest, Wallet } from "ethers";
import {
  ExactInputParams,
  ExactInputSingleParams,
  ExactOutputParams,
  ExactOutputSingleParams,
} from "./uniswap-v3-types";
import { ChainType, getChainConfig } from "../../../config/chain-config";
import { ROUTER_INTERFACE } from "../../../lib/contract-abis/uniswap-v3";
import { validateNetwork } from "../../../lib/utils";

export class UniswapV3SwapRouterV2 {
  private routerContract: Contract;
  private routerAddress: string;

  constructor(private chain: ChainType) {
    const chainConfig = getChainConfig(chain);

    this.routerAddress = chainConfig.uniswap.v3.swapRouterV2Address;

    if (!this.routerAddress || this.routerAddress.trim() === "") {
      throw new Error(`UniV3 Router address not defined for chain: ${chainConfig.name}`);
    }

    this.routerContract = new ethers.Contract(this.routerAddress, ROUTER_INTERFACE);
  }

  getRouterAddress = () => this.routerAddress;

  /**
   * The swapExactInputSingle function is for performing exact input swaps,
   * which swap a fixed amount of one token for a maximum possible amount of another token
   *
   * @param params The swap parameters
   * @returns The amount of tokens received
   */
  async createExactInputSingleTransaction(wallet: Wallet, params: ExactInputSingleParams): Promise<TransactionRequest> {
    this.routerContract = this.routerContract.connect(wallet) as Contract;

    await this._networkAndRouterCheck(wallet);

    const encodedData = this.routerContract.interface.encodeFunctionData("exactInputSingle", [
      {
        tokenIn: params.tokenIn,
        tokenOut: params.tokenOut,
        fee: params.fee,
        recipient: params.recipient,
        amountIn: params.amountIn,
        amountOutMinimum: params.amountOutMinimum,
        sqrtPriceLimitX96: params.sqrtPriceLimitX96,
      },
    ]);

    const tx: TransactionRequest = {
      to: this.routerAddress,
      data: encodedData,
    };

    return tx;
  }
  encodeExactInputSingle(): string {
    return "0x";
  }

  /**
   * Performs an exact input path swap
   * @param params The swap parameters
   * @returns The amount of tokens received
   */
  async createExactInputTransaction(wallet: Wallet, params: ExactInputParams): Promise<TransactionRequest> {
    this.routerContract = this.routerContract.connect(wallet) as Contract;

    await this._networkAndRouterCheck(wallet);

    const encodedData = this.routerContract.interface.encodeFunctionData("exactInput", [
      {
        path: params.path,
        recipient: params.recipient,
        amountIn: params.amountIn,
        amountOutMinimum: params.amountOutMinimum,
      },
    ]);

    const tx: TransactionRequest = {
      to: this.routerAddress,
      data: encodedData,
    };

    return tx;
  }
  encodeExactInput(): string {
    return "0x";
  }

  /**
   *
   * The swapExactOutputSingle function is for performing exact output swaps,
   * which swap a minimum possible amount of one token for a fixed amount of another token.
   *
   * @param params The swap parameters
   * @returns The amount of tokens spent
   */
  async createExactOutputSingleTransaction(
    wallet: Wallet,
    params: ExactOutputSingleParams,
  ): Promise<TransactionRequest> {
    this.routerContract = this.routerContract.connect(wallet) as Contract;

    await this._networkAndRouterCheck(wallet);

    const encodedData = this.routerContract.interface.encodeFunctionData("exactOutputSingle", [
      {
        tokenIn: params.tokenIn,
        tokenOut: params.tokenOut,
        fee: params.fee,
        recipient: params.recipient,
        amountOut: params.amountOut,
        amountInMaximum: params.amountInMaximum,
        sqrtPriceLimitX96: params.sqrtPriceLimitX96,
      },
    ]);

    const tx: TransactionRequest = {
      to: this.routerAddress,
      data: encodedData,
    };

    return tx;
  }

  /**
   * Performs an exact output path swap
   * @param params The swap parameters
   * @returns The amount of tokens spent
   */
  async createExactOutputTransaction(wallet: Wallet, params: ExactOutputParams): Promise<TransactionRequest> {
    this.routerContract = this.routerContract.connect(wallet) as Contract;

    await this._networkAndRouterCheck(wallet);

    const encodedData = this.routerContract.interface.encodeFunctionData("exactOutput", [
      {
        path: params.path,
        recipient: params.recipient,
        amountOut: params.amountOut,
        amountInMaximum: params.amountInMaximum,
      },
    ]);

    const tx: TransactionRequest = {
      to: this.routerAddress,
      data: encodedData,
    };

    return tx;
  }

  /**
   * Creates a multicall transaction for batching multiple router operations
   * @param wallet The wallet to execute the multicall with
   * @param data Array of encoded function data to execute in batch
   * @param deadline Optional deadline timestamp (defaults to 20 minutes from now)
   * @returns Transaction request for the multicall
   */
  async createMulticallTransaction(data: string[], deadline: number): Promise<TransactionRequest> {
    const encodedData = this.routerContract.interface.encodeFunctionData("multicall", [deadline, data]);

    const tx: TransactionRequest = {
      to: this.routerAddress,
      data: encodedData,
    };

    return tx;
  }

  /**
   * Helper function to encode function data for use in multicall
   * @param functionName The name of the function to encode
   * @param params The parameters for the function
   * @returns Encoded function data as hex string
   */
  encodeFunctionData(functionName: string, params: any[]): string {
    return this.routerContract.interface.encodeFunctionData(functionName, params);
  }

  /**
   * Validates that the wallet is on the correct network and that the factory address is valid
   * @param wallet Wallet instance -> blockchain provider
   * @returns true if the wallet is on the correct network and that the factory address is valid, false otherwise
   */
  private async _networkAndRouterCheck(wallet: Wallet): Promise<void> {
    await validateNetwork(wallet, this.chain);

    const code = await wallet.provider!.getCode(this.routerAddress);
    if (code === "0x" || code === "0x0") {
      throw new Error(`No contract found at router address: ${this.routerAddress}`);
    }

    try {
      await this.routerContract.positionManager();
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
        throw new Error(`Contract at ${this.routerAddress} is not a Uniswap V3 Router`);
      }

      if (missingProviderError) {
        throw new Error(`Wallet has missing provider: ${errorMessage}`);
      }

      throw new Error(`${errorMessage}`);
    }
  }
}
