import { Contract, Wallet, ethers } from "ethers";
import { ChainType, getChainConfig } from "../../config/chain-config";
import { FACTORY_INTERFACE } from "../../contract-abis/uniswap-v3";
import { validateNetwork } from "../../lib/utils";
import { UniswapV3Pool } from "./UniswapV3Pool";

export class UniswapV3Factory {
  private factoryContract: Contract;

  private FACTORY_ADDRESS: string;
  private WETH_ADDRESS: string;

  constructor(private chain: ChainType) {
    const chainConfig = getChainConfig(chain);

    this.WETH_ADDRESS = chainConfig.tokenAddresses.weth;
    this.FACTORY_ADDRESS = chainConfig.uniswapV3.factoryAddress;

    if (!this.WETH_ADDRESS || this.WETH_ADDRESS.trim() === "") {
      throw new Error(`WETH address not defined for chain: ${chainConfig.name}`);
    }

    if (!this.FACTORY_ADDRESS || this.FACTORY_ADDRESS.trim() === "") {
      throw new Error(`Factory address not defined for chain: ${chainConfig.name}`);
    }

    this.factoryContract = new Contract(this.FACTORY_ADDRESS, FACTORY_INTERFACE);
  }

  getFactoryAddress = (): string => this.FACTORY_ADDRESS;
  getWETHAddress = (): string => this.WETH_ADDRESS;

  /**
   * Validates that the address is actually a Uniswap V3 Factory by checking if it implements the required interface
   * @param wallet Wallet instance -> blockchain provider
   * @returns true if the initialized factory address is a valid Uniswap V3 Factory, false otherwise
   */
  async validateIsFactory(wallet: Wallet): Promise<boolean> {
    this.factoryContract = this.factoryContract.connect(wallet) as Contract;

    const isValid = await this._networkAndFactoryCheck(wallet);
    if (!isValid) {
      throw new Error(`Address ${this.factoryContract.address} is not a valid Uniswap V3 Factory`);
    }

    return isValid;
  }

  /**
   * Gets the pool address for a given token and fee tier
   * @param wallet Wallet instance -> blockchain provider
   * @param token0Address The address of the token0 to get the pool address for
   * @param token1Address The address of the token1 to get the pool address for
   * @param feeTier The fee tier to get the pool address for
   * @returns The pool address for the given token and fee tier, or null if the pool does not exist
   */
  async getPoolAddress(wallet: Wallet, token0Address: string, token1Address: string, feeTier: number): Promise<string> {
    this.factoryContract = this.factoryContract.connect(wallet) as Contract;

    const isValid = await this._networkAndFactoryCheck(wallet);
    if (!isValid) {
      throw new Error(`Address ${this.factoryContract.address} is not a valid Uniswap V3 Factory`);
    }

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
  async getPool(wallet: Wallet, token0Address: string, token1Address: string, feeTier: number): Promise<UniswapV3Pool> {
    const poolAddress = await this.getPoolAddress(wallet, token0Address, token1Address, feeTier);
    if (poolAddress === ethers.ZeroAddress) {
      throw new Error(`Pool not found for ${token0Address} and ${token1Address} and ${feeTier}`);
    }
    return new UniswapV3Pool(wallet, poolAddress);
  }

  /**
   * Gets the pool address for a given token and fee tier
   * @param wallet Wallet instance -> blockchain provider
   * @param tokenAddress The address of the token to get the pool address for
   * @param feeTier The fee tier to get the pool address for
   * @returns The pool address for the given token and fee tier, or null if the pool does not exist
   */
  async getTokenWETHPoolAddress(wallet: Wallet, tokenAddress: string, feeTier: number): Promise<string> {
    this.factoryContract = this.factoryContract.connect(wallet) as Contract;

    const isValid = await this._networkAndFactoryCheck(wallet);
    if (!isValid) {
      throw new Error(`Address ${this.factoryContract.address} is not a valid Uniswap V3 Factory`);
    }

    const poolAddress = await this.factoryContract.getPool(tokenAddress, this.WETH_ADDRESS, feeTier);

    if (poolAddress === ethers.ZeroAddress || poolAddress === undefined) {
      return ethers.ZeroAddress;
    }
    return poolAddress;
  }

  /**
   * Gets the pool address for a given token and fee tier
   * @param wallet Wallet instance -> blockchain provider
   * @param tokenAddress The address of the token to get the pool address for
   * @param feeTier The fee tier to get the pool address for
   * @returns The pool address for the given token and fee tier, or null if the pool does not exist
   */
  async getTokenWETHPool(wallet: Wallet, tokenAddress: string, feeTier: number): Promise<UniswapV3Pool> {
    const poolAddress = await this.getTokenWETHPoolAddress(wallet, tokenAddress, feeTier);
    if (poolAddress === ethers.ZeroAddress) {
      throw new Error(`Pool not found for ${tokenAddress} and ${feeTier}`);
    }
    return new UniswapV3Pool(wallet, poolAddress);
  }

  /**
   * Validates that the wallet is on the correct network and that the factory address is valid
   * @param wallet Wallet instance -> blockchain provider
   * @returns true if the wallet is on the correct network and that the factory address is valid, false otherwise
   */
  private async _networkAndFactoryCheck(wallet: Wallet): Promise<boolean> {
    try {
      await validateNetwork(wallet, this.chain);

      await this.factoryContract.getPool.staticCall(
        "0x0000000000000000000000000000000000000001",
        "0x0000000000000000000000000000000000000002",
        3000,
      );
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
