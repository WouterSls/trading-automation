import { Contract, Wallet } from "ethers";
import { UNISWAP_V2_FACTORY_INTERFACE } from "../../contract-abis/uniswap-v2";
import { ChainType } from "../../lib/types/trading.types";
import { getChainConfig } from "../../config/chain-config";

export class UniswapV2Factory {
  private factoryContract: Contract;
  private WETH_ADDRESS: string;

  constructor(chain: ChainType) {
    const chainConfig = getChainConfig(chain);
    this.WETH_ADDRESS = chainConfig.tokenAddresses.weth;

    this.factoryContract = new Contract(chainConfig.uniswapV2.factoryAddress, UNISWAP_V2_FACTORY_INTERFACE);
  }

  /**
   * Validates that the address is actually a Uniswap V2 Factory by checking if it implements the required interface
   */
  async validateIsFactory(wallet: Wallet): Promise<boolean> {
    try {
      console.log("validating factory...");
      // Attempt to call a method that should exist on the factory contract with dummy arguments
      // This won't execute the transaction but will fail if the method doesn't exist
      await this.factoryContract.getPair.staticCall(
        "0x0000000000000000000000000000000000000001",
        "0x0000000000000000000000000000000000000002",
      );
      console.log("factory validated");
      return true;
    } catch (error: any) {
      // If the error is NOT about the method not existing, then it's likely a valid factory
      if (!error.message.includes("function selector was not recognized")) {
        return true;
      }
      console.error("Address validation failed, not a valid Uniswap V2 Factory:", error);
      return false;
    }
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
  async getPairAddress(wallet: Wallet, tokenAddress: string): Promise<string | null> {
    // Validate the factory first
    console.log("getting pair address...");
    console.log("connecting factory...");
    this.factoryContract = this.factoryContract.connect(wallet) as Contract;
    console.log("factory connected");

    const isValid = await this.validateIsFactory(wallet);
    if (!isValid) {
      throw new Error(`Address ${this.factoryContract.address} is not a valid Uniswap V2 Factory`);
    }

    // Use staticCall to get the pair address since it's a view function

    const pairAddress = await this.factoryContract.getPair.staticCall(tokenAddress, this.WETH_ADDRESS);

    // If the pair doesn't exist, return null
    if (pairAddress === "0x0000000000000000000000000000000000000000") {
      return null;
    }

    /**
    // Create a new pair instance
    const pair = new UniswapV2Pair(wallet, pairAddress);

    // Validate that it's actually a pair
    const isPair = await pair.validateIsPair();
    if (!isPair) {
      throw new Error(`Factory returned invalid pair address: ${pairAddress}`);
    }
 */

    return pairAddress;
  }
}
