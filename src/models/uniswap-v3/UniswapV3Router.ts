import {
  Contract,
  ContractTransactionReceipt,
  ContractTransactionResponse,
  ethers,
  TransactionRequest,
  Wallet,
} from "ethers";
import {
  ExactInputParams,
  ExactInputSingleParams,
  ExactOutputParams,
  ExactOutputSingleParams,
} from "./uniswap-v3-types";
import { ChainType, getChainConfig } from "../../config/chain-config";
import { ROUTER_ABI } from "../../contract-abis/uniswap-v3";
import { extractRawTokenOutputFromLogs, validateNetwork } from "../../lib/utils";

export class UniswapV3Router {
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
    this.routerAddress = chainConfig.uniswapV3.swapRouterV2Address;

    if (!this.usdcAddress || this.usdcAddress.trim() === "") {
      throw new Error(`USDC address not defined for chain: ${chainConfig.name}`);
    }

    if (!this.wethAddress || this.wethAddress.trim() === "") {
      throw new Error(`WETH address not defined for chain: ${chainConfig.name}`);
    }

    if (!this.routerAddress || this.routerAddress.trim() === "") {
      throw new Error(`UniV3 Router address not defined for chain: ${chainConfig.name}`);
    }

    this.routerContract = new ethers.Contract(this.routerAddress, ROUTER_ABI);
  }

  getRouterAddress = () => this.routerAddress;
  getWethAddress = () => this.wethAddress;
  getUsdcAddress = () => this.usdcAddress;

  /**
   * Performs an exact input single swap
   * @param params The swap parameters
   * @returns The amount of tokens received
   */
  async exactInputSingle(wallet: Wallet, params: ExactInputSingleParams): Promise<string> {
    this.routerContract = this.routerContract.connect(wallet) as Contract;
    await this._networkAndRouterCheck(wallet);

    try {
      const tx: ContractTransactionResponse = await this.routerContract.exactInputSingle(
        {
          tokenIn: params.tokenIn,
          tokenOut: params.tokenOut,
          fee: params.fee,
          recipient: params.recipient,
          deadline: params.deadline,
          amountIn: params.amountIn,
          amountOutMinimum: params.amountOutMinimum,
          sqrtPriceLimitX96: params.sqrtPriceLimitX96,
        },
        {
          value: 0,
          gasLimit: 5000000,
          gasPrice: ethers.parseUnits("0.1", "gwei"),
        },
      );
      console.log("Transaction response:", tx);
      return tx.hash;
    } catch (error: unknown) {
      console.log("Error:", error);
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
        deadline: params.deadline,
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
  async exactInput(params: ExactInputParams): Promise<string> {
    // TODO: Implement swap functionality
    return "0";
  }

  /**
   * Performs an exact output single swap
   * @param params The swap parameters
   * @returns The amount of tokens spent
   */
  async exactOutputSingle(params: ExactOutputSingleParams): Promise<string> {
    // TODO: Implement swap functionality
    return "0";
  }

  /**
   * Performs an exact output path swap
   * @param params The swap parameters
   * @returns The amount of tokens spent
   */
  async exactOutput(params: ExactOutputParams): Promise<string> {
    // TODO: Implement swap functionality
    return "0";
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
          deadline: Math.floor(Date.now() / 1000) + 1000 * 60 * 20,
          amountIn: ethers.parseUnits("0.001", 18),
          amountOutMinimum: 0n,
          sqrtPriceLimitX96: 0n,
        },
        { value: 0 },
      );
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
        throw new Error(`Contract at ${this.routerAddress} is not a Uniswap V3 Router`);
      }

      if (missingProviderError) {
        throw new Error(`Wallet has missing provider: ${errorMessage}`);
      }

      throw new Error(`${errorMessage}`);
    }
  }
}
