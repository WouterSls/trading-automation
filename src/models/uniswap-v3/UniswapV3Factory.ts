import { Contract, Wallet, ethers } from "ethers";
import { ChainType, getChainConfig } from "../../config/chain-config";
import { FACTORY_ABI } from "../../contract-abis/uniswap-v3";

export class UniswapV3Factory {
  private factoryContract: Contract;

  private WETH_ADDRESS: string;
  private FACTORY_ADDRESS: string;
  private USDC_ADDRESS: string;

  constructor(chain: ChainType) {
    const chainConfig = getChainConfig(chain);

    this.WETH_ADDRESS = chainConfig.tokenAddresses.weth;
    this.FACTORY_ADDRESS = chainConfig.uniswapV3.factoryAddress;
    this.USDC_ADDRESS = chainConfig.tokenAddresses.usdc!;

    if (!this.USDC_ADDRESS || this.USDC_ADDRESS.trim() === "") {
      throw new Error(`USDC address not defined for chain: ${chainConfig.name}`);
    }

    if (!this.WETH_ADDRESS || this.WETH_ADDRESS.trim() === "") {
      throw new Error(`WETH address not defined for chain: ${chainConfig.name}`);
    }

    if (!this.FACTORY_ADDRESS || this.FACTORY_ADDRESS.trim() === "") {
      throw new Error(`Factory address not defined for chain: ${chainConfig.name}`);
    }
    this.factoryContract = new Contract(this.FACTORY_ADDRESS, FACTORY_ABI);
  }

  getFactoryAddress = (): string => this.FACTORY_ADDRESS;
  getWETHAddress = (): string => this.WETH_ADDRESS;
  getUSDCAddress = (): string => this.USDC_ADDRESS;

  async getPoolAddress(wallet: Wallet, tokenAddress: string, feeTier: number): Promise<string | null> {
    try {
      this.factoryContract = this.factoryContract.connect(wallet) as Contract;
      const poolAddress = await this.factoryContract.getPool(tokenAddress, this.WETH_ADDRESS, feeTier);
      if (poolAddress === ethers.ZeroAddress || poolAddress === undefined) {
        return null;
      }
      return poolAddress;
    } catch (error) {
      console.warn(`Failed to get V3 pool for token ${tokenAddress} with fee ${feeTier}`);
      return null;
    }
  }
}
