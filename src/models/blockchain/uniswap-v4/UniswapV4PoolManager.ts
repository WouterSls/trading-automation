import { Contract, Wallet } from "ethers";
import { ChainType, getChainConfig } from "../../../config/chain-config";
import { UNISWAP_V4_POOL_MANAGER_INTERFACE } from "../../../lib/contract-abis/uniswap-v4";
import { validateNetwork } from "../../../lib/utils";

export class UniswapV4PoolManager {
  private poolManagerContract: Contract;

  private POOL_MANAGER_ADDRESS: string;
  private WETH_ADDRESS: string;

  constructor(private chain: ChainType) {
    const chainConfig = getChainConfig(chain);

    this.WETH_ADDRESS = chainConfig.tokenAddresses.weth;
    this.POOL_MANAGER_ADDRESS = chainConfig.uniswap.v4.poolManagerAddress;

    if (!this.WETH_ADDRESS || this.WETH_ADDRESS.trim() === "") {
      throw new Error(`WETH address not defined for chain: ${chainConfig.name}`);
    }

    if (!this.POOL_MANAGER_ADDRESS || this.POOL_MANAGER_ADDRESS.trim() === "") {
      throw new Error(`Pool manager address not defined for chain: ${chainConfig.name}`);
    }

    this.poolManagerContract = new Contract(this.POOL_MANAGER_ADDRESS, UNISWAP_V4_POOL_MANAGER_INTERFACE);
  }

  getPoolManagerAddress = (): string => this.POOL_MANAGER_ADDRESS;
  getWETHAddress = (): string => this.WETH_ADDRESS;

  /**
   * Validates that the address is actually a Uniswap V3 Factory by checking if it implements the required interface
   * @param wallet Wallet instance -> blockchain provider
   * @returns true if the initialized factory address is a valid Uniswap V3 Factory, false otherwise
   */
  async validateIsPoolManager(wallet: Wallet): Promise<boolean> {
    this.poolManagerContract = this.poolManagerContract.connect(wallet) as Contract;

    const isValid = await this._networkAndPoolManagerCheck(wallet);
    if (!isValid) {
      throw new Error(`Address ${this.poolManagerContract.address} is not a valid Uniswap V4 Pool Manager`);
    }

    return isValid;
  }

  /**
   * Validates that the wallet is on the correct network and that the factory address is valid
   * @param wallet Wallet instance -> blockchain provider
   * @returns true if the wallet is on the correct network and that the factory address is valid, false otherwise
   */
  private async _networkAndPoolManagerCheck(wallet: Wallet): Promise<boolean> {
    try {
      await validateNetwork(wallet, this.chain);

      await this.poolManagerContract.protocolFeeController.staticCall();
      return true;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";

      if (errorMessage.toLowerCase().includes("cannot read property")) {
        throw new Error(`Wallet has missing provider: ${errorMessage}`);
      }

      if (errorMessage.toLowerCase().includes("cannot read properties")) {
        throw new Error(`Wallet has missing provider: ${errorMessage}`);
      }

      if (errorMessage.includes("missing provider")) {
        throw new Error(`Wallet has missing provider: ${errorMessage}`);
      }

      throw new Error(`${errorMessage}`);
    }
  }
}
