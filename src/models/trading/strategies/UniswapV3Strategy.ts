import { ERC20 } from "../../ERC/ERC20";
import { ethers, Wallet } from "ethers";
import { ChainType } from "../../../config/chain-config";

import { UniswapV2Quoter } from "../../uniswap-v3/UniswapV2Quoter";
import { UniswapV3Factory } from "../../uniswap-v3/UniswapV3Factory";

import { BuyTrade } from "../trades/BuyTrade";
import { ITradingStrategy } from "../ITradingStrategy";
import { ERC20_INTERFACE } from "../../../contract-abis/erc20";

export class UniswapV3Strategy implements ITradingStrategy {
  private quoter: UniswapV2Quoter;
  private factory: UniswapV3Factory;

  private strategyName: string;
  private chain: ChainType;

  constructor(STRATEGY_NAME: string, chain: ChainType) {
    this.strategyName = STRATEGY_NAME;
    this.chain = chain;
    this.quoter = new UniswapV2Quoter(chain);
    this.factory = new UniswapV3Factory(chain);
  }

  /**
   * Getters
   */
  getName = (): string => this.strategyName;
  getChain = (): ChainType => this.chain;

  async getETHLiquidity(wallet: Wallet, tokenAddress: string): Promise<string> {
    try {
      const feeTiers = [100, 500, 3000, 10000]; // 0.01%, 0.05%, 0.3%, 1%

      let bestLiquidity = 0n;

      for (const feeTier of feeTiers) {
        const poolAddress = await this.factory.getPoolAddress(wallet, tokenAddress, feeTier);
        if (!poolAddress) continue;

        const weth = new ethers.Contract(this.factory!.getWETHAddress(), ERC20_INTERFACE, wallet);
        const ethLiquidity = await weth.balanceOf(poolAddress);

        if (ethLiquidity > bestLiquidity) {
          bestLiquidity = ethLiquidity;
        }
      }

      const ethLiquidityFormatted = ethers.formatEther(bestLiquidity);
      return ethLiquidityFormatted;
    } catch (error) {
      console.error(
        `Error checking V3 liquidity for ${tokenAddress}: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      return "0";
    }
  }

  async getUsdcPrice(wallet: Wallet, tokenAddress: string): Promise<string> {
    throw new Error("Not implemented");
  }

  /**
   * Buy
   */
  async buy(wallet: Wallet, erc20: ERC20, usdAmount: number): Promise<BuyTrade> {
    return new Promise((resolve, reject) => {
      reject(new Error("Not implemented"));
    });
  }
  async simulateBuy(wallet: Wallet, token: ERC20, usdAmount: number): Promise<boolean> {
    return new Promise((resolve, reject) => {
      reject(new Error("Not implemented"));
    });
  }

  private shouldRetry(error: any, attempt: number): boolean {
    if (error.message.toLowerCase().includes("insufficient funds")) return false;
    if (error.message.toLowerCase().includes("insufficient allowance")) return false;
    if (error.message.toLowerCase().includes("user rejected")) return false;

    // TODO: MOVE TO CONFIG?
    const maxRetries = 3;
    if (attempt >= maxRetries) return false;

    return true;
  }
}
