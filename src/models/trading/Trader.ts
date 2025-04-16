import { Wallet } from "ethers";
import { ChainType } from "../../config/chain-config";
import { ITradingStrategy } from "./strategies/interface/ITradingStrategy";
import { ERC20 } from "../ERC/ERC20";
import { BuyTrade } from "./trades/BuyTrade";

export class Trader {
  constructor(
    private wallet: Wallet,
    private chain: ChainType,
    private strategies: ITradingStrategy[],
  ) {}

  getChain = (): ChainType => this.chain;
  getStrategies = (): ITradingStrategy[] => this.strategies;

  async buy(token: ERC20, usdAmount: number): Promise<BuyTrade> {
    const bestStrategy = await this.getBestStrategy(token.getTokenAddress());

    return bestStrategy.buy(this.wallet, token, usdAmount);
  }
  async simulateBuy(token: ERC20, usdAmount: number): Promise<boolean> {
    const bestStrategy = await this.getBestStrategy(token.getTokenAddress());

    return bestStrategy.simulateBuy(this.wallet, token, usdAmount);
  }

  private async getBestStrategy(tokenAddress: string): Promise<ITradingStrategy> {
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

    return bestStrategy;
  }
}
