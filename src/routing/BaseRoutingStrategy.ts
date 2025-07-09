import { ethers, Wallet } from "ethers";
import { ChainConfig, ChainType, getChainConfig } from "../config/chain-config";
import { Route } from "../trading/types/quoting-types";
import { FeeAmount } from "../smartcontracts/uniswap-v3";

export abstract class BaseRoutingStrategy {
  protected chainConfig: ChainConfig;

  constructor(protected chain: ChainType) {
    this.chainConfig = getChainConfig(chain);
  }

  abstract getBestRoute(tokenIn: string, amountIn: bigint, tokenOut: string, wallet: Wallet): Promise<Route>;

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

  protected getIntermediaryTokenList(): string[] {
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

  protected getIntermediaryTokenCombinations() {
    const intermediaryCombinations = [
      {
        firstToken: this.chainConfig.tokenAddresses.usdc,
        secondToken: this.chainConfig.tokenAddresses.weth,
        name: "USDC-WETH",
      },
      {
        firstToken: this.chainConfig.tokenAddresses.usdt,
        secondToken: this.chainConfig.tokenAddresses.weth,
        name: "USDT-WETH",
      },
      {
        firstToken: this.chainConfig.tokenAddresses.dai,
        secondToken: this.chainConfig.tokenAddresses.weth,
        name: "DAI-WETH",
      },
      {
        firstToken: this.chainConfig.tokenAddresses.usds,
        secondToken: this.chainConfig.tokenAddresses.weth,
        name: "USDS-WETH",
      },

      {
        firstToken: this.chainConfig.tokenAddresses.weth,
        secondToken: this.chainConfig.tokenAddresses.usdc,
        name: "WETH-USDC",
      },
      {
        firstToken: this.chainConfig.tokenAddresses.weth,
        secondToken: this.chainConfig.tokenAddresses.usdt,
        name: "WETH-USDT",
      },
      {
        firstToken: this.chainConfig.tokenAddresses.weth,
        secondToken: this.chainConfig.tokenAddresses.dai,
        name: "WETH-DAI",
      },
      {
        firstToken: this.chainConfig.tokenAddresses.weth,
        secondToken: this.chainConfig.tokenAddresses.usds,
        name: "WETH-USDS",
      },

      {
        firstToken: this.chainConfig.tokenAddresses.usdc,
        secondToken: this.chainConfig.tokenAddresses.usdt,
        name: "USDC-USDT",
      },
      {
        firstToken: this.chainConfig.tokenAddresses.usdc,
        secondToken: this.chainConfig.tokenAddresses.dai,
        name: "USDC-DAI",
      },
      {
        firstToken: this.chainConfig.tokenAddresses.usdt,
        secondToken: this.chainConfig.tokenAddresses.dai,
        name: "USDT-DAI",
      },

      {
        firstToken: this.chainConfig.tokenAddresses.weth,
        secondToken: this.chainConfig.tokenAddresses.wbtc,
        name: "WETH-WBTC",
      },
      {
        firstToken: this.chainConfig.tokenAddresses.wbtc,
        secondToken: this.chainConfig.tokenAddresses.weth,
        name: "WBTC-WETH",
      },
      {
        firstToken: this.chainConfig.tokenAddresses.usdc,
        secondToken: this.chainConfig.tokenAddresses.wbtc,
        name: "USDC-WBTC",
      },
      {
        firstToken: this.chainConfig.tokenAddresses.wbtc,
        secondToken: this.chainConfig.tokenAddresses.usdc,
        name: "WBTC-USDC",
      },

      {
        firstToken: this.chainConfig.tokenAddresses.virtual,
        secondToken: this.chainConfig.tokenAddresses.weth,
        name: "VIRTUAL-WETH",
      },
      {
        firstToken: this.chainConfig.tokenAddresses.virtual,
        secondToken: this.chainConfig.tokenAddresses.weth,
        name: "WETH-VIRTUAL",
      },
      {
        firstToken: this.chainConfig.tokenAddresses.aero,
        secondToken: this.chainConfig.tokenAddresses.weth,
        name: "AERO-WETH",
      },
      {
        firstToken: this.chainConfig.tokenAddresses.weth,
        secondToken: this.chainConfig.tokenAddresses.aero,
        name: "WETH-AERO",
      },
    ];
    return intermediaryCombinations;
  }

  protected getTwoHopFeeCombinations(): { fees: FeeAmount[]; name: string }[] {
    return [
      { fees: [FeeAmount.LOWEST, FeeAmount.LOWEST], name: "LOWEST-LOWEST" },
      { fees: [FeeAmount.LOWEST, FeeAmount.LOW], name: "LOWEST-LOW" },
      { fees: [FeeAmount.LOWEST, FeeAmount.MEDIUM], name: "LOWEST-MEDIUM" },
      { fees: [FeeAmount.LOW, FeeAmount.LOWEST], name: "LOW-LOWEST" },
      { fees: [FeeAmount.LOW, FeeAmount.LOW], name: "LOW-LOW" },
      { fees: [FeeAmount.LOW, FeeAmount.MEDIUM], name: "LOW-MEDIUM" },
      { fees: [FeeAmount.MEDIUM, FeeAmount.LOWEST], name: "MEDIUM-LOWEST" },
      { fees: [FeeAmount.MEDIUM, FeeAmount.LOW], name: "MEDIUM-LOW" },
      { fees: [FeeAmount.MEDIUM, FeeAmount.MEDIUM], name: "MEDIUM-MEDIUM" },
    ];
  }

  protected getThreeHopFeeCombinations(): { fees: FeeAmount[]; name: string }[] {
    return [
      { fees: [FeeAmount.LOWEST, FeeAmount.LOWEST, FeeAmount.LOWEST], name: "LOWEST-LOWEST-LOWEST" },
      { fees: [FeeAmount.LOWEST, FeeAmount.LOWEST, FeeAmount.LOW], name: "LOWEST-LOWEST-LOW" },
      { fees: [FeeAmount.LOWEST, FeeAmount.LOW, FeeAmount.LOWEST], name: "LOWEST-LOW-LOWEST" },
      { fees: [FeeAmount.LOWEST, FeeAmount.LOW, FeeAmount.LOW], name: "LOWEST-LOW-LOW" },
      { fees: [FeeAmount.LOW, FeeAmount.LOWEST, FeeAmount.LOWEST], name: "LOW-LOWEST-LOWEST" },
      { fees: [FeeAmount.LOW, FeeAmount.LOWEST, FeeAmount.LOW], name: "LOW-LOWEST-LOW" },
      { fees: [FeeAmount.LOW, FeeAmount.LOW, FeeAmount.LOWEST], name: "LOW-LOW-LOWEST" },
      { fees: [FeeAmount.LOW, FeeAmount.LOW, FeeAmount.LOW], name: "LOW-LOW-LOW" },
      { fees: [FeeAmount.MEDIUM, FeeAmount.MEDIUM, FeeAmount.MEDIUM], name: "MEDIUM-MEDIUM-MEDIUM" },
    ];
  }

  protected createDefaultRoute(): Route {
    return {
      amountOut: 0n,
      path: [],
      fees: [],
      encodedPath: null,
      poolKey: null,
      pathSegments: null,
      aeroRoutes: null,
    };
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
