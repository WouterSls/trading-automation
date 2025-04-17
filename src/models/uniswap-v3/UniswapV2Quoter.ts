import { Contract, ethers } from "ethers";

import { ChainType, getChainConfig } from "../../config/chain-config";

import { QUOTER_ABI } from "../../contract-abis/uniswap-v3";

export class UniswapV2Quoter {
  //Addresses
  private WETH_ADDRESS: string;
  private USDC_ADDRESS: string;
  private QUOTER_ADDRESS: string;

  //Contract
  private quoterContract: Contract;

  //Constants
  private readonly USDC_DECIMALS = 6;

  constructor(chain: ChainType) {
    const chainConfig = getChainConfig(chain);
    this.WETH_ADDRESS = chainConfig.tokenAddresses.weth;
    this.USDC_ADDRESS = chainConfig.tokenAddresses.usdc!;
    this.QUOTER_ADDRESS = chainConfig.uniswapV3.quoterAddress;

    if (!this.USDC_ADDRESS || this.USDC_ADDRESS.trim() === "") {
      throw new Error(`USDC address not defined for chain: ${chainConfig.name}`);
    }

    if (!this.WETH_ADDRESS || this.WETH_ADDRESS.trim() === "") {
      throw new Error(`WETH address not defined for chain: ${chainConfig.name}`);
    }

    if (!this.QUOTER_ADDRESS || this.QUOTER_ADDRESS.trim() === "") {
      throw new Error(`Quoter address not defined for chain: ${chainConfig.name}`);
    }

    this.quoterContract = new ethers.Contract(this.QUOTER_ADDRESS, QUOTER_ABI);
  }

  /**
   *
   * @pricing
   */
  async quoteExactInput(path: string[], amountIn: number): Promise<number> {
    return 0;
  }

  async quoteExactInputSingle(path: string[], amountIn: number): Promise<number> {
    return 10;
  }

  async quoteExactOutput(path: string[], amountOut: number): Promise<number> {
    return 0;
  }

  async quoteExactOutputSingle(path: string[], amountOut: number): Promise<number> {
    return 0;
  }
}
