import { Contract, ethers, TransactionRequest, Wallet, AbiCoder } from "ethers";
import { ChainType, getChainConfig } from "../../config/chain-config";
import { UNIVERSAL_ROUTER_INTERFACE } from "../../lib/smartcontract-abis/_index";
import { validateNetwork } from "../../lib/utils";
import { TRADING_CONFIG } from "../../config/trading-config";

export class UniversalRouter {
  private routerContract: Contract;
  private routerAddress: string;

  constructor(private chain: ChainType) {
    const chainConfig = getChainConfig(chain);

    this.routerAddress = chainConfig.uniswap.universalRouterAddress;

    if (!this.routerAddress || this.routerAddress.trim() === "") {
      throw new Error(`Universal Router address not defined for chain: ${chainConfig.name}`);
    }

    this.routerContract = new ethers.Contract(this.routerAddress, UNIVERSAL_ROUTER_INTERFACE);
  }

  getRouterAddress = () => this.routerAddress;

  /**
   * Validates that the address is actually a Universal Router by checking if it implements the required interface
   * @param wallet Wallet instance -> blockchain provider
   * @returns true if the initialized router address is a valid Universal Router, false otherwise
   */
  async validateIsRouter(wallet: Wallet): Promise<boolean> {
    this.routerContract = this.routerContract.connect(wallet) as Contract;

    const isValid = await this._networkAndRouterCheck(wallet);
    if (!isValid) {
      throw new Error(`Address ${this.routerContract.address} is not a valid Uniswap V4 Universal Router`);
    }

    return isValid;
  }

  /**
   * Create an execute transaction
   * @param wallet The wallet to execute the commands with
   * @param commands concatenated commands to execute in order
   * @param inputs list of encoded inputs for each command
   * @returns Transaction request
   */
  createExecuteTransaction(commands: string, inputs: string[], deadline?: number): TransactionRequest {
    const dl = deadline ?? TRADING_CONFIG.DEADLINE;

    const encodedData = this.routerContract.interface.encodeFunctionData("execute", [commands, inputs, dl]);

    const tx: TransactionRequest = {
      to: this.routerAddress,
      data: encodedData,
    };

    return tx;
  }

  /**
   * Validates that the wallet is on the correct network and that the router address is valid
   * @param wallet Wallet instance -> blockchain provider
   * @returns true if the wallet is on the correct network and the router address is valid
   */
  private async _networkAndRouterCheck(wallet: Wallet): Promise<boolean> {
    try {
      await validateNetwork(wallet, this.chain);

      const code = await wallet.provider!.getCode(this.routerAddress);
      if (code === "0x" || code === "0x0") {
        throw new Error(`No contract found at router address: ${this.routerAddress}`);
      }

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
