import { Wallet } from "ethers";
import { ChainType } from "../../config/chain-config";
import { ITradingStrategy } from "./strategies/interface/ITradingStrategy";
import { ERC20 } from "../ERC/ERC20";
import { BuyTrade } from "./trades/BuyTrade";

export class Trader {
  private bestStrategy: ITradingStrategy | null = null;

  constructor(
    private wallet: Wallet,
    private chain: ChainType,
    private strategies: ITradingStrategy[],
  ) {}

  getChain = (): ChainType => this.chain;
  getStrategies = (): ITradingStrategy[] => this.strategies;
  getBestStrategy = (): ITradingStrategy | null => this.bestStrategy;

  async buy(token: ERC20, usdAmount: number): Promise<BuyTrade> {
    await this.sortStrategies(token.getTokenAddress());

    return this.bestStrategy!.buy(this.wallet, token, usdAmount);
  }
  async simulateBuy(token: ERC20, usdAmount: number): Promise<boolean> {
    await this.sortStrategies(token.getTokenAddress());

    return this.bestStrategy!.simulateBuy(this.wallet, token, usdAmount);
  }

  private async sortStrategies(tokenAddress: string): Promise<void> {
    let bestStrategy: ITradingStrategy | null = null;
    let bestETHLiquidity: number = 0;

    console.log("sorting strategies...");
    for (const strategy of this.strategies) {
      console.log("strategy", strategy.getName());
      const ethLiquidity = await strategy.getETHLiquidity(this.wallet, tokenAddress);
      const ethLiquidityNumber = Number(ethLiquidity);

      if (isNaN(ethLiquidityNumber)) throw new Error(`Invalid ETH liquidity for strategy: ${strategy.getName()}`);

      if (!bestETHLiquidity || ethLiquidityNumber > bestETHLiquidity) {
        console.log(`new best strategy: ${strategy.getName()} | ETH Liquidity: ${ethLiquidity}`);
        bestETHLiquidity = ethLiquidityNumber;
        bestStrategy = strategy;
      }
    }

    if (!bestStrategy) {
      throw new Error(`No strategy found for token: ${tokenAddress}`);
    }

    this.bestStrategy = bestStrategy;
  }
}
