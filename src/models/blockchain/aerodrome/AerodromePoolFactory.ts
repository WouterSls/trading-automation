import { Contract, ethers, Wallet } from "ethers";
import { ChainType, getChainConfig } from "../../../config/chain-config";
import { AERODROME_FACTORY_INTERFACE } from "../../../lib/contract-abis/aerodrome";
import { validateNetwork } from "../../../lib/utils";

export class AerodromePoolFactory {
  private poolFactoryContract: Contract;

  private factoryAddress: string;

  constructor(private chain: ChainType) {
    if (chain != ChainType.BASE) throw new Error("Aerodrome Factory can only be initiliazed on Base");

    const chainConfig = getChainConfig(chain);

    this.factoryAddress = chainConfig.aerodrome.poolFactoryAddress;

    if (!this.factoryAddress || this.factoryAddress.trim() === "") {
      throw new Error(`Factory address not defined for chain: ${chainConfig.name}`);
    }

    this.poolFactoryContract = new ethers.Contract(this.factoryAddress, AERODROME_FACTORY_INTERFACE);
  }

  getFactoryAddress = (): string => this.factoryAddress;

  /**
   * Validates that the address is actually a Uniswap V3 Factory by checking if it implements the required interface
   * @param wallet Wallet instance -> blockchain provider
   * @returns true if the initialized factory address is a valid Uniswap V3 Factory, throws error if otherwise
   */
  async validateIsFactory(wallet: Wallet): Promise<boolean> {
    this.poolFactoryContract = this.poolFactoryContract.connect(wallet) as Contract;

    await this._networkAndFactoryCheck(wallet);

    return true;
  }

  /**
   * Gets the pool address for a given token and fee tier
   * @param wallet Wallet instance -> blockchain provider
   * @param token0Address The address of the token0 to get the pool address for
   * @param token1Address The address of the token1 to get the pool address for
   * @param stable does the pool exists of stables
   * @returns The pool address for the given token and fee tier, or null if the pool does not exist
   */
  async getPoolAddress(wallet: Wallet, token0Address: string, token1Address: string, stable: boolean) {
    this.poolFactoryContract = this.poolFactoryContract.connect(wallet) as Contract;

    await this._networkAndFactoryCheck(wallet);

    const poolAddress = await this.poolFactoryContract.getPool(token0Address, token1Address, stable);

    if (poolAddress === ethers.ZeroAddress || poolAddress === undefined) {
      return ethers.ZeroAddress;
    }
    return poolAddress;
  }

  private async _networkAndFactoryCheck(wallet: Wallet): Promise<void> {
    try {
      await validateNetwork(wallet, this.chain);

      await this.poolFactoryContract.getPool.staticCall(
        "0x0000000000000000000000000000000000000001",
        "0x0000000000000000000000000000000000000002",
        true,
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";

      if (errorMessage.toLowerCase().includes("cannot read properties of null")) {
        throw new Error(`Wallet has missing provider: ${errorMessage}`);
      }

      if (errorMessage.includes("missing provider")) {
        throw new Error(`Wallet has missing provider: ${errorMessage}`);
      }

      throw new Error(`${errorMessage}`);
    }
  }
}
