import { Contract, Wallet } from "ethers";
import { UNISWAP_V2_FACTORY_INTERFACE } from "../../contract-abis/uniswap-v2";
import { UniswapV2Pair } from "./UniswapV2Pair";

export class UniswapV2Factory {
  private factoryContract: Contract;

  constructor(private wallet: Wallet, private factoryAddress: string) {
    this.factoryContract = new Contract(factoryAddress, UNISWAP_V2_FACTORY_INTERFACE, wallet);
  }

  /**
   * Validates that the address is actually a Uniswap V2 Factory by checking if it implements the required interface
   */
  async validateIsFactory(): Promise<boolean> {
    try {
      // Attempt to call a method that should exist on the factory contract with dummy arguments
      // This won't execute the transaction but will fail if the method doesn't exist
      await this.factoryContract.getPair.staticCall(
        "0x0000000000000000000000000000000000000001",
        "0x0000000000000000000000000000000000000002"
      );
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
  async getPair(tokenA: string, tokenB: string): Promise<UniswapV2Pair | null> {
    // Validate the factory first
    const isValid = await this.validateIsFactory();
    if (!isValid) {
      throw new Error(`Address ${this.factoryAddress} is not a valid Uniswap V2 Factory`);
    }

    // Use staticCall to get the pair address since it's a view function
    const pairAddress = await this.factoryContract.getPair.staticCall(tokenA, tokenB);

    // If the pair doesn't exist, return null
    if (pairAddress === "0x0000000000000000000000000000000000000000") {
      return null;
    }

    // Create a new pair instance
    const pair = new UniswapV2Pair(this.wallet, pairAddress);

    // Validate that it's actually a pair
    const isPair = await pair.validateIsPair();
    if (!isPair) {
      throw new Error(`Factory returned invalid pair address: ${pairAddress}`);
    }

    return pair;
  }
}
