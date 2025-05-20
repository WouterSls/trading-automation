import { Contract, ethers, Wallet } from "ethers";
import { UNISWAP_V2_FACTORY_INTERFACE } from "../../../lib/contract-abis/uniswap-v2";
import { ChainType, getChainConfig } from "../../../config/chain-config";
import { validateNetwork } from "../../../lib/utils";
import { UniswapV2Pair } from "./UniswapV2Pair";

export class UniswapV2Factory {
  private factoryContract: Contract;
  private factoryAddress: string;

  constructor(private chain: ChainType) {
    const chainConfig = getChainConfig(chain);

    this.factoryAddress = chainConfig.uniswap.v2.factoryAddress;

    if (!this.factoryAddress || this.factoryAddress.trim() == "") {
      throw new Error(`No Uniswap V2 factory address defined for chain ${chain}`);
    }
    this.factoryContract = new Contract(this.factoryAddress, UNISWAP_V2_FACTORY_INTERFACE);
  }

  getFactoryAddress = (): string => this.factoryAddress;

  /**
   * Gets the pair address for two tokens and returns a UniswapV2Pair instance
   * @param wallet the connection to the blockchain (Ethers Wallet)
   * @param tokenA First token address
   * @param tokenB Second token address
   * @returns UniswapV2Pair Address
   *
   * Note: The order of tokens doesn't matter. Uniswap V2 sorts token addresses internally,
   * so getPair(tokenA, tokenB) and getPair(tokenB, tokenA) will return the same pair address.
   * Internally, the token with the lower address becomes token0 and the higher address becomes token1.
   */
  async getPairAddress(wallet: Wallet, tokenA: string, tokenB: string): Promise<string> {
    this.factoryContract = this.factoryContract.connect(wallet) as Contract;

    await this._networkAndFactoryCheck(wallet);

    const pairAddress = await this.factoryContract.getPair.staticCall(tokenA, tokenB);

    return pairAddress;
  }

  /**
   * Gets the pair address for two tokens and returns a UniswapV2Pair instance
   * @param wallet the connection to the blockchain (Ethers Wallet)
   * @param tokenA First token address
   * @param tokenB Second token address
   * @returns UniswapV2Pair instance or null if pair doesn't exist
   *
   * Note: The order of tokens doesn't matter. Uniswap V2 sorts token addresses internally,
   * so getPair(tokenA, tokenB) and getPair(tokenB, tokenA) will return the same pair address.
   * Internally, the token with the lower address becomes token0 and the higher address becomes token1.
   */
  async getPair(wallet: Wallet, tokenA: string, tokenB: string): Promise<UniswapV2Pair | null> {
    const pairAddress = await this.getPairAddress(wallet, tokenA, tokenB);
    if (pairAddress === ethers.ZeroAddress) {
      return null;
    }
    return new UniswapV2Pair(wallet, pairAddress);
  }

  private async _networkAndFactoryCheck(wallet: Wallet): Promise<void> {
    try {
      await validateNetwork(wallet, this.chain);

      await this.factoryContract.getPair.staticCall(
        "0x0000000000000000000000000000000000000001",
        "0x0000000000000000000000000000000000000002",
      );
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
