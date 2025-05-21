import { Wallet } from "ethers";
import { ChainType } from "../../config/chain-config";
import { ITradingStrategy } from "./ITradingStrategy";
import { BuyTrade } from "./types/BuyTrade";
import { BuyTradeCreationDto, SellTradeCreationDto } from "../../api/trades/TradesController";
import { SellTrade } from "./types/SellTrade";

export class Trader {
  constructor(
    private wallet: Wallet,
    private chain: ChainType,
    private strategies: ITradingStrategy[],
  ) {}

  getChain = (): ChainType => this.chain;
  getStrategies = (): ITradingStrategy[] => this.strategies;

  async buy(trade: BuyTradeCreationDto): Promise<BuyTrade> {
    const bestStrategy = await this.getBestEthLiquidityStrategy(trade.inputToken);

    const tx = await bestStrategy.createBuyTransaction(this.wallet, trade);

    await this.wallet.call(tx);

    const txResponse = await this.wallet.sendTransaction(tx);
    const txReceipt = await txResponse.wait();
    if (!txReceipt) throw new Error("Transaction failed");

    const transactionHash = txReceipt.hash;
    const confirmedBlock = txReceipt.blockNumber;
    const gasCost = "";
    const tokenPriceUsd = "";
    const ethPriceUsd = "";
    const rawTokensReceived = "";
    const formattedTokensReceived = "";
    const ethSpent = "";

    const buyTrade: BuyTrade = new BuyTrade(
      transactionHash,
      confirmedBlock,
      gasCost,
      tokenPriceUsd,
      ethPriceUsd,
      rawTokensReceived,
      formattedTokensReceived,
      ethSpent,
    );

    return buyTrade;
  }

  async sell(trade: SellTradeCreationDto): Promise<SellTrade> {
    const bestStrategy =
      trade.outputToken === "USDC"
        ? await this.getBestUsdcStrategy(trade.inputToken)
        : await this.getBestEthLiquidityStrategy(trade.inputToken);

    const ethUsdcPrice = await bestStrategy.getEthUsdcPrice(this.wallet);
    const preTradeTokenUsdcPrice = await bestStrategy.getTokenUsdcPrice(this.wallet, trade.inputToken);

    const tx = await bestStrategy.createSellTransaction(this.wallet, trade);

    const transactionHash = "";
    const confirmedBlock = 0;
    const gasCost = "";
    const tokenPriceUsd = "";
    const ethPriceUsd = "";
    const rawTokensSpent = "";
    const formattedTokensSpent = "";
    const ethReceived = "";
    const rawTokensReceived = "";
    const formattedTokensReceived = "";

    const sellTrade: SellTrade = new SellTrade(
      transactionHash,
      confirmedBlock,
      gasCost,
      tokenPriceUsd,
      ethPriceUsd,
      rawTokensSpent,
      formattedTokensSpent,
      ethReceived,
    );
    return sellTrade;
  }

  private async getBestUsdcStrategy(tokenAddress: string): Promise<ITradingStrategy> {
    let bestStrategy: ITradingStrategy | null = null;
    let bestUsdcPrice: number = 0;

    console.log("sorting strategies on usdc price...");
    for (const strategy of this.strategies) {
      console.log("strategy", strategy.getName());
      const usdcPrice = await strategy.getTokenUsdcPrice(this.wallet, tokenAddress);
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
      const ethLiquidity = await strategy.getTokenEthLiquidity(this.wallet, tokenAddress);
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
