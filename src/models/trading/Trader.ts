import { Wallet } from "ethers";
import { ChainType } from "../../config/chain-config";
import { ITradingStrategy } from "./ITradingStrategy";
import { ERC20 } from "../ERC/ERC20";
import { BuyTrade } from "./types/BuyTrade";

export class Trader {
  constructor(
    private wallet: Wallet,
    private chain: ChainType,
    private strategies: ITradingStrategy[],
  ) {}

  getChain = (): ChainType => this.chain;
  getStrategies = (): ITradingStrategy[] => this.strategies;

  async buy(token: ERC20, usdAmount: number): Promise<BuyTrade> {
    const bestStrategy = await this.getBestEthLiquidityStrategy(token.getTokenAddress());

    return bestStrategy.buy(this.wallet, token, usdAmount);
  }
  async simulateBuy(token: ERC20, usdAmount: number): Promise<boolean> {
    const bestStrategy = await this.getBestEthLiquidityStrategy(token.getTokenAddress());

    return bestStrategy.simulateBuy(this.wallet, token, usdAmount);
  }

  async usdPrice(tokenAddress: string): Promise<number> {
    const bestStrategy = await this.getBestUsdcStrategy(tokenAddress);
    return Number(bestStrategy.getUsdcPrice(this.wallet, tokenAddress));
  }

  async wethLiquidity(tokenAddress: string): Promise<number> {
    const bestStrategy = await this.getBestEthLiquidityStrategy(tokenAddress);
    const ethLiquidity = await bestStrategy.getETHLiquidity(this.wallet, tokenAddress);
    return parseFloat(ethLiquidity);
  }

  private async getBestUsdcStrategy(tokenAddress: string): Promise<ITradingStrategy> {
    let bestStrategy: ITradingStrategy | null = null;
    let bestUsdcPrice: number = 0;

    console.log("sorting strategies on usdc price...");
    for (const strategy of this.strategies) {
      console.log("strategy", strategy.getName());
      const usdcPrice = await strategy.getUsdcPrice(this.wallet, tokenAddress);
      console.log("$", usdcPrice);
      const usdcPriceNumber = Number(usdcPrice);

      if (isNaN(usdcPriceNumber)) throw new Error(`Invalid usdc price for strategy: ${strategy.getName()}`);

      if (!bestUsdcPrice || usdcPriceNumber > bestUsdcPrice) {
        bestUsdcPrice = usdcPriceNumber;
        bestStrategy = strategy;
      }
    }

    if (!bestStrategy) {
      throw new Error(`No strategy found for token: ${tokenAddress}`);
    }

    console.log("best strategy:", bestStrategy.getName());

    return bestStrategy;
  }
  private async getBestEthLiquidityStrategy(tokenAddress: string): Promise<ITradingStrategy> {
    let bestStrategy: ITradingStrategy | null = null;
    let bestETHLiquidity: number = 0;

    console.log("sorting strategies on eth liquidity...");
    for (const strategy of this.strategies) {
      console.log("strategy:", strategy.getName());
      const ethLiquidity = await strategy.getETHLiquidity(this.wallet, tokenAddress);
      console.log("\tETH Liquidity", ethLiquidity);
      const ethLiquidityNumber = Number(ethLiquidity);

      if (isNaN(ethLiquidityNumber)) throw new Error(`Invalid ETH liquidity for strategy: ${strategy.getName()}`);

      if (!bestETHLiquidity || ethLiquidityNumber > bestETHLiquidity) {
        bestETHLiquidity = ethLiquidityNumber;
        bestStrategy = strategy;
      }
    }

    if (!bestStrategy) {
      throw new Error(`No strategy found for token: ${tokenAddress}`);
    }

    console.log(`best strategy: ${bestStrategy.getName()}`);

    return bestStrategy;
  }
}
