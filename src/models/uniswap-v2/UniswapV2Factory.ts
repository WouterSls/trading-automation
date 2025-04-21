import { Contract, ethers, Wallet } from "ethers";
import { UNISWAP_V2_FACTORY_INTERFACE } from "../../contract-abis/uniswap-v2";
import { ChainType, getChainConfig } from "../../config/chain-config";
import { validateNetwork } from "../../lib/utils";
import { UniswapV2Pair } from "./UniswapV2Pair";

export class UniswapV2Factory {
  private factoryContract: Contract;
  private WETH_ADDRESS: string;

  constructor(private chain: ChainType) {
    const chainConfig = getChainConfig(chain);
    this.WETH_ADDRESS = chainConfig.tokenAddresses.weth;

    this.factoryContract = new Contract(chainConfig.uniswapV2.factoryAddress, UNISWAP_V2_FACTORY_INTERFACE);
  }

  getWETHAddress = (): string => this.WETH_ADDRESS;

  /**
   * Validates that the address is actually a Uniswap V2 Factory by checking if it implements the required interface
   * @param wallet Wallet instance -> blockchain provider
   * @returns true if the initialized factory address is a valid Uniswap V2 Factory, false otherwise
   */
  async validateIsFactory(wallet: Wallet): Promise<boolean> {
    this.factoryContract = this.factoryContract.connect(wallet) as Contract;

    const isValid = await this._networkAndFactoryCheck(wallet);
    if (!isValid) {
      throw new Error(`Address ${this.factoryContract.address} is not a valid Uniswap V2 Factory`);
    }

    return isValid;
  }

  /**
   * Gets the pair address for two tokens and returns a UniswapV2Pair instance
   * @param tokenA First token address
   * @param tokenB Second token address
   * @returns UniswapV2Pair instance or null if pair doesn't exist
   *
   * Note: The order of tokens doesn't matter. Uniswap V2 sorts token addresses internally,
   * so getPair(tokenA, tokenB) and getPair(tokenB, tokenA) will return the same pair address.
   * Internally, the token with the lower address becomes token0 and the higher address becomes token1.
   */
  async getTokenWETHPairAddress(wallet: Wallet, tokenAddress: string): Promise<string> {
    this.factoryContract = this.factoryContract.connect(wallet) as Contract;

    const isValid = await this._networkAndFactoryCheck(wallet);
    if (!isValid) {
      throw new Error(`Address ${this.factoryContract.address} is not a valid Uniswap V2 Factory`);
    }

    const pairAddress = await this.factoryContract.getPair.staticCall(tokenAddress, this.WETH_ADDRESS);

    if (pairAddress === ethers.ZeroAddress) {
      return ethers.ZeroAddress;
    }

    return pairAddress;
  }

  async getTokenWETHPair(wallet: Wallet, tokenAddress: string): Promise<UniswapV2Pair> {
    const pairAddress = await this.getTokenWETHPairAddress(wallet, tokenAddress);
    if (!pairAddress) {
      throw new Error("Pair not found");
    }
    return new UniswapV2Pair(wallet, pairAddress);
  }

  private async _networkAndFactoryCheck(wallet: Wallet): Promise<boolean> {
    try {
      await validateNetwork(wallet, this.chain);

      await this.factoryContract.getPair.staticCall(
        "0x0000000000000000000000000000000000000001",
        "0x0000000000000000000000000000000000000002",
      );
      return true;
    } catch (error: unknown) {
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
