import { Contract, ContractTransactionResponse, ethers, hexlify, TransactionRequest, Wallet } from "ethers";
import { ChainType, getChainConfig } from "../../config/chain-config";
import { UNIVERSAL_ROUTER_INTERFACE } from "../../contract-abis/universal-router";
import { validateNetwork } from "../../lib/utils";
import { Command } from "./commands";
import { PoolKey, SwapParams } from "../uniswap-v4/uniswap-v4-types";

export type CommandType = {
  commands: string;
  inputs: string[];
};

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
  async executeOld(wallet: Wallet, params: CommandType): Promise<ContractTransactionResponse> {
    this.routerContract = this.routerContract.connect(wallet) as Contract;

    await this._networkAndRouterCheck(wallet);

    try {
      const txResponse: ContractTransactionResponse = await this.routerContract.execute(params.commands, params.inputs);
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
  async createExecuteTransaction(wallet: Wallet, params: CommandType): Promise<TransactionRequest> {
    this.routerContract = this.routerContract.connect(wallet) as Contract;

    await this._networkAndRouterCheck(wallet);

    const encodedData = this.routerContract.interface.encodeFunctionData("execute", [params.commands, params.inputs]);

    const tx: TransactionRequest = {
      to: this.routerAddress,
      data: encodedData,
    };

    return tx;
  }

  async execute(
    wallet: Wallet,
    cmd: CommandType & { value?: bigint },
    deadline?: bigint,
  ): Promise<ContractTransactionResponse> {
    this.routerContract = this.routerContract.connect(wallet) as Contract;
    await this._networkAndRouterCheck(wallet);

    const dl = deadline ?? BigInt(Math.floor(Date.now() / 1000) + 1200);

    return await this.routerContract.execute(cmd.commands, cmd.inputs, dl, { value: cmd.value ?? 0n });
  }

  public createV4SwapCommand(key: PoolKey, params: SwapParams, hookData = "0x"): CommandType {
    const encodedInput = ethers.AbiCoder.defaultAbiCoder().encode(
      ["tuple(address,address,uint24,int24,address)", "tuple(bool,int256,uint160)", "bytes"],
      [
        [key.currency0, key.currency1, key.fee, key.tickSpacing, key.hooks],
        [params.zeroForOne, params.amountSpecified, params.sqrtPriceLimitX96],
        hookData,
      ],
    );

    // 0x10 is V4_SWAP
    return {
      commands: "0x10",
      inputs: [encodedInput],
    };
  }

  /**
   * Helper method to create V3 exact input swap command
   * @param params V3 swap parameters
   * @returns Command and inputs for the execute method
   */
  createV3ExactInputCommand(params: V3SwapParams): CommandType {
    // This would encode the V3 exact input command
    // Command code for V3 exact input is typically 0x00 or similar
    const V3_EXACT_INPUT_COMMAND = "0x00";

    // Encode the V3 swap parameters according to Universal Router specs
    const encodedParams = ethers.solidityPacked(
      ["bytes", "address", "uint256", "uint256"],
      [params.path, params.recipient, params.amountIn, params.amountOutMinimum],
    );

    return {
      commands: V3_EXACT_INPUT_COMMAND,
      inputs: [encodedParams],
    };
  }

  /**
   * Validates that the wallet is on the correct network and that the router address is valid
   * @param wallet Wallet instance -> blockchain provider
   * @returns true if the wallet is on the correct network and the router address is valid
   */
  private async _networkAndRouterCheck(wallet: Wallet): Promise<boolean> {
    await validateNetwork(wallet, this.chain);

    const code = await wallet.provider!.getCode(this.routerAddress);
    if (code === "0x" || code === "0x0") {
      throw new Error(`No contract found at router address: ${this.routerAddress}`);
    }

    try {
      await this.routerContract.execute.staticCall("0x", [], { value: 0 });
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
