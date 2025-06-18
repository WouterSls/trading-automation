import { ethers, Wallet } from "ethers";
import { ChainType, getChainConfig } from "../../config/chain-config";
import { Route } from "../trading/types/quoting-types";

export abstract class BaseRoutingStrategy {
  protected chainConfig: any;

  constructor(protected chain: ChainType) {
    this.chainConfig = getChainConfig(chain);
  }

  abstract getBestRoute(wallet: Wallet, tokenIn: string, amountIn: bigint, tokenOut: string): Promise<Route>;

  /**
   * Gets common intermediary tokens for routing
   */
  protected getIntermediaryTokens(): string[] {
    return [
      this.chainConfig.tokenAddresses.usdt,
      this.chainConfig.tokenAddresses.usdc,
      this.chainConfig.tokenAddresses.usds,
      this.chainConfig.tokenAddresses.dai,
      this.chainConfig.tokenAddresses.wbtc,
      this.chainConfig.tokenAddresses.weth,
      this.chainConfig.tokenAddresses.wsteth,
      this.chainConfig.tokenAddresses.uni,
      this.chainConfig.tokenAddresses.aero,
      this.chainConfig.tokenAddresses.virtual,
      this.chainConfig.tokenAddresses.arb,
    ].filter((addr) => addr !== ethers.ZeroAddress);
  }

  protected getTokenSymbol(address: string): string {
    const symbols: { [key: string]: string } = {
      [this.chainConfig.tokenAddresses.weth]: "WETH",
      [this.chainConfig.tokenAddresses.usdc]: "USDC",
      [this.chainConfig.tokenAddresses.usdt]: "USDT",
      [this.chainConfig.tokenAddresses.dai]: "DAI",
      [this.chainConfig.tokenAddresses.wbtc]: "WBTC",
      [this.chainConfig.tokenAddresses.usds]: "USDS",
      [this.chainConfig.tokenAddresses.wsteth]: "wstETH",
      [this.chainConfig.tokenAddresses.uni]: "UNI",
      [this.chainConfig.tokenAddresses.aero]: "AERO",
      [this.chainConfig.tokenAddresses.virtual]: "VIRTUAL",
      [this.chainConfig.tokenAddresses.arb]: "ARB",
    };

    return symbols[address] || address.slice(0, 6) + "...";
  }

  /**
   * Basic route scoring algorithm
   */
  protected calculateRouteScore(
    //route: EnhancedRoute,
    route: Route,
    outputAmount: bigint,
    gasEstimate: bigint,
    tokenOutPrice: number = 1,
  ): number {
    // Convert to numbers for calculation
    const outputValue = Number(outputAmount) / 1e18; // Assuming 18 decimals for simplicity
    const gasValue = Number(gasEstimate) * 20e-9; // Assuming 20 gwei gas price
    const gasCostInUsd = gasValue * 2000; // Assuming $2000 ETH price

    // Base score is output value minus gas cost
    let score = outputValue * tokenOutPrice - gasCostInUsd;

    // Penalty for multi-hop routes (higher gas, more slippage risk)
    const hopPenalty = (route.path.length - 2) * 0.1;
    score -= hopPenalty;

    // Bonus for routes with higher liquidity
    /**
    if (route.metadata.liquidityUsd) {
      const liquidityBonus = Math.min(route.metadata.liquidityUsd / 1000000, 1); // Max 1 point bonus
      score += liquidityBonus;
    }
    */

    // Penalty for high price impact
    /**
    if (route.metadata.priceImpact) {
      const impactPenalty = route.metadata.priceImpact * 0.01; // 1% impact = 0.01 penalty
      score -= impactPenalty;
    }
    */

    return score;
  }
}
