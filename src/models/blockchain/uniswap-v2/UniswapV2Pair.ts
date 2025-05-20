import { Contract, Wallet } from "ethers";
import { UNISWAP_V2_PAIR_INTERFACE } from "../../contract-abis/uniswap-v2";

export class UniswapV2Pair {
  private pairContract: Contract | null = null;
  private isInitialized = false;

  constructor(
    private wallet: Wallet,
    private pairAddress: string,
  ) {
    this.pairContract = new Contract(pairAddress, UNISWAP_V2_PAIR_INTERFACE, wallet);
  }

  /**
   * Getters
   */
  getAddress = (): string => this.pairAddress;

  /**
   * Validates that the address is actually a Uniswap V2 Pair by checking if it implements the required interface
   */
  async validateIsPair(): Promise<boolean> {
    try {
      // Try to call methods that should exist on the pair contract using staticCall
      // This validates the interface without executing a transaction
      await this.pairContract!.getReserves.staticCall();
      await this.pairContract!.token0.staticCall();
      return true;
    } catch (error) {
      console.error("Address validation failed, not a valid Uniswap V2 Pair:", error);
      return false;
    }
  }

  /**
   * Initialize and validate the pair contract
   */
  async initialize(): Promise<boolean> {
    if (this.isInitialized) return true;

    const isValid = await this.validateIsPair();
    if (!isValid) {
      throw new Error(`Address ${this.pairAddress} is not a valid Uniswap V2 Pair`);
    }

    this.isInitialized = true;
    return true;
  }

  /**
   * Gets the reserves of the pair
   */
  async getReserves() {
    await this.initialize();
    const { reserve0, reserve1, blockTimestampLast } = await this.pairContract!.getReserves();
    return { reserve0, reserve1, blockTimestampLast };
  }

  /**
   * Gets the address of token0 (the token with the lower address)
   */
  async token0() {
    await this.initialize();
    return await this.pairContract!.token0();
  }

  /**
   * Gets the address of token1 (the token with the higher address)
   */
  async token1() {
    await this.initialize();
    return await this.pairContract!.token1();
  }

  /**
   * Gets the total supply of LP tokens
   */
  async totalSupply() {
    await this.initialize();
    return await this.pairContract!.totalSupply();
  }

  /**
   * Gets the balance of LP tokens for a given address
   */
  async balanceOf(ownerAddress: string) {
    await this.initialize();
    return await this.pairContract!.balanceOf(ownerAddress);
  }
}
