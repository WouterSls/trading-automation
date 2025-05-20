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
  // Addresses
  private wethAddress: string;
  private usdcAddress: string;
  private routerAddress: string;

  // Contract
  private routerContract: Contract;

  constructor(private chain: ChainType) {
    const chainConfig = getChainConfig(chain);

    this.wethAddress = chainConfig.tokenAddresses.weth;
    this.usdcAddress = chainConfig.tokenAddresses.usdc!;
    this.routerAddress = chainConfig.uniswap.v3.swapRouterV2Address;

    if (!this.usdcAddress || this.usdcAddress.trim() === "") {
      throw new Error(`USDC address not defined for chain: ${chainConfig.name}`);
    }

    if (!this.wethAddress || this.wethAddress.trim() === "") {
      throw new Error(`WETH address not defined for chain: ${chainConfig.name}`);
    }

    if (!this.routerAddress || this.routerAddress.trim() === "") {
      throw new Error(`UniV3 Router address not defined for chain: ${chainConfig.name}`);
    }

    this.routerContract = new ethers.Contract(this.routerAddress, ROUTER_INTERFACE);
  }

  getRouterAddress = () => this.routerAddress;
  getWethAddress = () => this.wethAddress;
  getUsdcAddress = () => this.usdcAddress;

  /**
   * The swapExactInputSingle function is for performing exact input swaps,
   * which swap a fixed amount of one token for a maximum possible amount of another token
   *
   * @param params The swap parameters
   * @returns The amount of tokens received
   */
  async exactInputSingle(wallet: Wallet, params: ExactInputSingleParams): Promise<ContractTransactionResponse> {
    this.routerContract = this.routerContract.connect(wallet) as Contract;

    await this._networkAndRouterCheck(wallet);

    try {
      const txResponse: ContractTransactionResponse = await this.routerContract.exactInputSingle({
        tokenIn: params.tokenIn,
        tokenOut: params.tokenOut,
        fee: params.fee,
        recipient: params.recipient,
        amountIn: params.amountIn,
        amountOutMinimum: params.amountOutMinimum,
        sqrtPriceLimitX96: params.sqrtPriceLimitX96,
      });
      return txResponse;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      throw new Error(`${errorMessage}`);
    }
  }
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

  /**
   * Performs an exact input path swap
   * @param params The swap parameters
   * @returns The amount of tokens received
   */
  async exactInput(wallet: Wallet, params: ExactInputParams): Promise<ContractTransactionResponse> {
    this.routerContract = this.routerContract.connect(wallet) as Contract;

    await this._networkAndRouterCheck(wallet);

    try {
      const txResponse: ContractTransactionResponse = await this.routerContract.exactInput(params);
      return txResponse;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      throw new Error(`${errorMessage}`);
    }
  }
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

  /**
   *
   * The swapExactOutputSingle function is for performing exact output swaps,
   * which swap a minimum possible amount of one token for a fixed amount of another token.
   *
   * @param params The swap parameters
   * @returns The amount of tokens spent
   */
  async exactOutputSingle(wallet: Wallet, params: ExactOutputSingleParams): Promise<ContractTransactionResponse> {
    this.routerContract = this.routerContract.connect(wallet) as Contract;

    await this._networkAndRouterCheck(wallet);

    try {
      const txResponse: ContractTransactionResponse = await this.routerContract.exactOutputSingle({
        tokenIn: params.tokenIn,
        tokenOut: params.tokenOut,
        fee: params.fee,
        recipient: params.recipient,
        amountOut: params.amountOut,
        amountInMaximum: params.amountInMaximum,
        sqrtPriceLimitX96: params.sqrtPriceLimitX96,
      });
      return txResponse;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      throw new Error(`${errorMessage}`);
    }
  }
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
  async exactOutput(wallet: Wallet, params: ExactOutputParams): Promise<ContractTransactionResponse> {
    this.routerContract = this.routerContract.connect(wallet) as Contract;

    await this._networkAndRouterCheck(wallet);

    try {
      const txResponse: ContractTransactionResponse = await this.routerContract.exactOutput(params);
      return txResponse;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      throw new Error(`${errorMessage}`);
    }
  }
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
   * Validates that the wallet is on the correct network and that the factory address is valid
   * @param wallet Wallet instance -> blockchain provider
   * @returns true if the wallet is on the correct network and that the factory address is valid, false otherwise
   */
  private async _networkAndRouterCheck(wallet: Wallet): Promise<boolean> {
    await validateNetwork(wallet, this.chain);

    const code = await wallet.provider!.getCode(this.routerAddress);
    if (code === "0x" || code === "0x0") {
      throw new Error(`No contract found at router address: ${this.routerAddress}`);
    }

    try {
      await this.routerContract.exactInputSingle.staticCall(
        {
          tokenIn: this.wethAddress,
          tokenOut: this.usdcAddress,
          fee: 3000,
          recipient: wallet.address,
          amountIn: ethers.parseUnits("0.001", 18),
          amountOutMinimum: 0n,
          sqrtPriceLimitX96: 0n,
        },
        { value: 0 },
      );
      return true;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";

      const revertDataError =
        errorMessage.includes("missing revert data") || errorMessage.includes("execution reverted");

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
        throw new Error(`Contract at ${this.routerAddress} is not a Uniswap V3 Router`);
      }

      if (missingProviderError) {
        throw new Error(`Wallet has missing provider: ${errorMessage}`);
      }

      throw new Error(`${errorMessage}`);
    }
  }
}
