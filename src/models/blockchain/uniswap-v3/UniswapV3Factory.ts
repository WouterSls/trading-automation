import { Contract, Wallet, ethers } from "ethers";
import { ChainType, getChainConfig } from "../../../config/chain-config";
import { FACTORY_INTERFACE, POOL_INTERFACE } from "../../../lib/contract-abis/uniswap-v3";
import { validateNetwork } from "../../../lib/utils";
import { UniswapV3Pool, FeeAmount, FeeToTickSpacing } from "./index";

export class UniswapV3Factory {
  private factoryContract: Contract;

  private factoryAddress: string;
  private wethAddress: string;

  constructor(private chain: ChainType) {
    const chainConfig = getChainConfig(chain);

    this.wethAddress = chainConfig.tokenAddresses.weth;
    this.factoryAddress = chainConfig.uniswap.v3.factoryAddress;

    if (!this.wethAddress || this.wethAddress.trim() === "") {
      throw new Error(`WETH address not defined for chain: ${chainConfig.name}`);
    }

    if (!this.factoryAddress || this.factoryAddress.trim() === "") {
      throw new Error(`Factory address not defined for chain: ${chainConfig.name}`);
    }

    this.factoryContract = new Contract(this.factoryAddress, FACTORY_INTERFACE);
  }

  getFactoryAddress = (): string => this.factoryAddress;
  getWETHAddress = (): string => this.wethAddress;

  /**
   * Validates that the address is actually a Uniswap V3 Factory by checking if it implements the required interface
   * @param wallet Wallet instance -> blockchain provider
   * @returns true if the initialized factory address is a valid Uniswap V3 Factory, throws error if otherwise
   */
  async validateIsFactory(wallet: Wallet): Promise<boolean> {
    this.factoryContract = this.factoryContract.connect(wallet) as Contract;

    await this._networkAndFactoryCheck(wallet);

    return true;
  }

  /**
   * Gets the pool address for a given token and fee tier
   * @param wallet Wallet instance -> blockchain provider
   * @param token0Address The address of the token0 to get the pool address for
   * @param token1Address The address of the token1 to get the pool address for
   * @param feeTier The fee tier to get the pool address for
   * @returns The pool address for the given token and fee tier, or null if the pool does not exist
   */
  async getPoolAddress(
    wallet: Wallet,
    token0Address: string,
    token1Address: string,
    feeTier: FeeAmount,
  ): Promise<string> {
    this.factoryContract = this.factoryContract.connect(wallet) as Contract;

    await this._networkAndFactoryCheck(wallet);

    const poolAddress = await this.factoryContract.getPool(token0Address, token1Address, feeTier);
    if (poolAddress === ethers.ZeroAddress || poolAddress === undefined) {
      return ethers.ZeroAddress;
    }

    return poolAddress;
  }

  /**
   * Gets the pool for a given token and fee tier
   * @param wallet Wallet instance -> blockchain provider
   * @param token0Address The address of the token0 to get the pool for
   * @param token1Address The address of the token1 to get the pool for
   * @param feeTier The fee tier to get the pool for
   * @returns The pool for the given token and fee tier, or null if the pool does not exist
   */
  async getPool(
    wallet: Wallet,
    token0Address: string,
    token1Address: string,
    feeTier: FeeAmount,
  ): Promise<UniswapV3Pool> {
    const poolAddress = await this.getPoolAddress(wallet, token0Address, token1Address, feeTier);
    const provider = wallet.provider;
    if (poolAddress === ethers.ZeroAddress) {
      throw new Error(`Pool not found for ${token0Address} and ${token1Address} and ${feeTier}`);
    }
    if (!provider) {
      throw new Error(`Provider not found for ${token0Address} and ${token1Address} and ${feeTier}`);
    }

    const contract = new ethers.Contract(poolAddress, POOL_INTERFACE, wallet);
    const [token0, token1] = await Promise.all([contract.token0(), contract.token1()]);

    const tickSpacing = FeeToTickSpacing.get(feeTier);

    if (!tickSpacing) throw new Error(`V3 Pool creation failed: Tick spacing not found for fee tier: ${feeTier}`);

    return new UniswapV3Pool(wallet, poolAddress, this.factoryAddress, token0, token1, tickSpacing, feeTier);
  }

  /**
   * Validates that the wallet is on the correct network and that the factory address is valid
   * @param wallet Wallet instance -> blockchain provider
   * @returns true if the wallet is on the correct network and that the factory address is valid, false otherwise
   */
  private async _networkAndFactoryCheck(wallet: Wallet): Promise<void> {
    try {
      await validateNetwork(wallet, this.chain);

      await this.factoryContract.getPool.staticCall(
        "0x0000000000000000000000000000000000000001",
        "0x0000000000000000000000000000000000000002",
        3000,
      );
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
