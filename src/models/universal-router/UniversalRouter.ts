import { Contract, ContractTransactionResponse, ethers, hexlify, TransactionRequest, Wallet, AbiCoder } from "ethers";
import { ChainType, getChainConfig } from "../../config/chain-config";
import { UNIVERSAL_ROUTER_INTERFACE } from "../../contract-abis/universal-router";
import { validateNetwork } from "../../lib/utils";
import { CommandType } from "./commands";
import {
  FeeAmount,
  FeeToTickSpacing,
  IV4ExactInputSingle,
  PoolKey,
  SettleParams,
  SwapParams,
} from "../uniswap-v4/uniswap-v4-types";
import { encodeExactInputSingleSwapParams, encodeSettleParams, encodeTakeParams } from "./universal-router-utils";
import { Action } from "./actions";

export type V3SwapParams = {
  path: string;
  recipient: string;
  amountIn: bigint;
  amountOutMinimum: bigint;
};

export class UniversalRouter {
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
    this.routerAddress = chainConfig.uniswap.universalRouterAddress;

    if (!this.usdcAddress || this.usdcAddress.trim() === "") {
      throw new Error(`USDC address not defined for chain: ${chainConfig.name}`);
    }

    if (!this.wethAddress || this.wethAddress.trim() === "") {
      throw new Error(`WETH address not defined for chain: ${chainConfig.name}`);
    }

    if (!this.routerAddress || this.routerAddress.trim() === "") {
      throw new Error(`Universal Router address not defined for chain: ${chainConfig.name}`);
    }

    this.routerContract = new ethers.Contract(this.routerAddress, UNIVERSAL_ROUTER_INTERFACE);
  }

  getRouterAddress = () => this.routerAddress;
  getWethAddress = () => this.wethAddress;
  getUsdcAddress = () => this.usdcAddress;

  /**
   * Execute commands on the Universal Router
   * @param wallet The wallet to execute the commands with
   * @param params The command parameters
   * @returns Transaction response
   */
  async execute(
    wallet: Wallet,
    commandType: CommandType,
    command: string,
    deadline?: bigint,
  ): Promise<ContractTransactionResponse> {
    this.routerContract = this.routerContract.connect(wallet) as Contract;

    await this._networkAndRouterCheck(wallet);

    const dl = deadline ?? BigInt(Math.floor(Date.now() / 1000) + 1200);

    try {
      const txResponse: ContractTransactionResponse = await this.routerContract.execute(commandType, command, dl);
      return txResponse;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      throw new Error(`${errorMessage}`);
    }
  }

  /**
   * Create an execute transaction
   * @param wallet The wallet to execute the commands with
   * @param params The command parameters
   * @returns Transaction request
   */
  async createExecuteTransaction(
    wallet: Wallet,
    commandType: CommandType,
    command: string,
    deadline?: number,
  ): Promise<TransactionRequest> {
    this.routerContract = this.routerContract.connect(wallet) as Contract;

    await this._networkAndRouterCheck(wallet);

    const dl = deadline ?? Math.floor(Date.now() / 1000) + 1200;

    const encodedData = this.routerContract.interface.encodeFunctionData("execute", [commandType, command, dl]);

    const tx: TransactionRequest = {
      to: this.routerAddress,
      data: encodedData,
      value: 1 * 10 ** 18,
    };

    return tx;
  }

  /**
   * Create a V4 swap exact input single command
   * @param key The pool key
   * @param params The swap parameters
   * @param hookData The hook data
   * @returns The encoded command
   */
  public createV4ExactInputSingleCommand(exactInputSingle: IV4ExactInputSingle): string {
    // Encode the 3 actions required to execute a V4 swap into a single command
    // actions can be found in Actions.sol in v4-periphery
    // 1) swap -> SWAP_EXACT_INPUT_SINGLE (0x06)
    // 2) settle ->
    // 3) take ->

    const swapParams: SwapParams = {
      zeroForOne: exactInputSingle.zeroForOne,
      amountIn: exactInputSingle.inputAmount,
      amountOutMinimum: exactInputSingle.minOutputAmount ?? 0n,
    };

    const inputCurrency = exactInputSingle.zeroForOne
      ? exactInputSingle.poolKey.currency0
      : exactInputSingle.poolKey.currency1;

    const encodedExactInputSingleParams = encodeExactInputSingleSwapParams(exactInputSingle.poolKey, swapParams);

    const encodedSettleParams = encodeSettleParams(
      inputCurrency,
      exactInputSingle.inputAmount,
      exactInputSingle.zeroForOne,
    );

    const encodedTakeParams = encodeTakeParams(
      exactInputSingle.poolKey,
      exactInputSingle.inputAmount,
      exactInputSingle.zeroForOne,
    );

    console.log("encodedExactInputSingleParams:");
    console.log(encodedExactInputSingleParams);
    console.log();
    console.log("encodedSettleParams:");
    console.log(encodedSettleParams);
    console.log();
    console.log("encodedTakeParams:");
    console.log(encodedTakeParams);
    console.log();

    const encodedCommand = [encodedExactInputSingleParams, encodedSettleParams, encodedTakeParams].join("");

    return encodedCommand;
  }

  /**
   * Helper method to create V3 exact input swap command
   * @param params V3 swap parameters
   * @returns Command and inputs for the execute method
   */
  createV3ExactInputCommand(params: V3SwapParams): string {
    // This would encode the V3 exact input command
    // Command code for V3 exact input is typically 0x00 or similar
    const V3_EXACT_INPUT_COMMAND = "0x00";

    // Encode the V3 swap parameters according to Universal Router specs
    const encodedParams = ethers.solidityPacked(
      ["bytes", "address", "uint256", "uint256"],
      [params.path, params.recipient, params.amountIn, params.amountOutMinimum],
    );

    return "0x01";
  }

  /**
   * Validates that the wallet is on the correct network and that the router address is valid
   * @param wallet Wallet instance -> blockchain provider
   * @returns true if the wallet is on the correct network and the router address is valid
   */
  private async _networkAndRouterCheck(wallet: Wallet): Promise<boolean> {
    await validateNetwork(wallet, this.chain);

    this.routerContract = this.routerContract.connect(wallet) as Contract;

    const code = await wallet.provider!.getCode(this.routerAddress);
    if (code === "0x" || code === "0x0") {
      throw new Error(`No contract found at router address: ${this.routerAddress}`);
    }

    try {
      const deadline = Math.floor(Date.now() / 1000) + 1200;
      await this.routerContract.execute.staticCall("0x", [], deadline);
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
        throw new Error(`Contract at ${this.routerAddress} is not a Uniswap Universal Router`);
      }

      if (missingProviderError) {
        throw new Error(`Wallet has missing provider: ${errorMessage}`);
      }

      throw new Error(`${errorMessage}`);
    }
  }
}
