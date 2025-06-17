import { ethers, Wallet } from "ethers";
import { ChainType } from "../../../config/chain-config";
import { RouteOptimizer } from "../RouteOptimizer";
import { EnhancedRouteOptimizer } from "../EnhancedRouteOptimizer";
import { BuyTradeCreationDto, InputType } from "../../trading/types/_index";

/**
 * Example usage of the enhanced route optimizer with multicall support
 */
export class RouteOptimizerUsageExample {
  private routeOptimizer: RouteOptimizer;
  private enhancedOptimizer: EnhancedRouteOptimizer;

  constructor(private chain: ChainType) {
    this.routeOptimizer = new RouteOptimizer(chain);
    this.enhancedOptimizer = new EnhancedRouteOptimizer(chain);
  }

  /**
   * Example 1: Using the enhanced optimizer directly
   */
  async findBestRouteExample(wallet: Wallet): Promise<void> {
    const tokenIn = ethers.ZeroAddress; // ETH
    const tokenOut = "0x6982508145454ce325ddbe47a25d4ec3d2311933"; // PEPE
    const amountIn = ethers.parseEther("1");

    console.log("=== Finding Best Route Across All DEXes ===");

    // Find the best route across all DEXes with multicall
    const bestRoute = await this.enhancedOptimizer.findBestRoute(wallet, tokenIn, tokenOut, amountIn, {
      maxHops: 2,
      maxRoutes: 5,
      // includeDEXes: ["UniswapV2", "UniswapV3"], // Optional: limit to specific DEXes
      // excludeDEXes: ["UniswapV4"], // Optional: exclude specific DEXes
    });

    if (bestRoute) {
      console.log("Best route found:");
      console.log(`  DEX: ${bestRoute.metadata.dex} v${bestRoute.metadata.version}`);
      console.log(`  Path: ${bestRoute.path.join(" -> ")}`);
      console.log(`  Fees: ${bestRoute.fees.join(", ")}`);
      console.log(`  Estimated Output: ${bestRoute.estimatedOutput}`);
      console.log(`  Score: ${bestRoute.score}`);
      console.log(`  Gas Estimate: ${bestRoute.metadata.gasEstimate}`);
    } else {
      console.log("No viable route found");
    }
  }

  /**
   * Example 2: Comparing routes across different DEXes
   */
  async compareRoutesExample(wallet: Wallet): Promise<void> {
    const tokenIn = ethers.ZeroAddress; // ETH
    const tokenOut = "0x6982508145454ce325ddbe47a25d4ec3d2311933"; // PEPE
    const amountIn = ethers.parseEther("1");

    console.log("=== Comparing Routes Across DEXes ===");

    const routeComparison = await this.enhancedOptimizer.compareRoutes(wallet, tokenIn, tokenOut, amountIn);

    for (const [dexName, route] of routeComparison) {
      console.log(`\n${dexName}:`);
      if (route) {
        console.log(`  Path: ${route.path.join(" -> ")}`);
        console.log(`  Output: ${route.estimatedOutput}`);
        console.log(`  Score: ${route.score}`);
        console.log(`  Gas: ${route.metadata.gasEstimate}`);
      } else {
        console.log("  No route available");
      }
    }
  }

  /**
   * Example 3: Using with existing trading strategies (backwards compatible)
   */
  async backwardsCompatibilityExample(wallet: Wallet): Promise<void> {
    const tokenIn = ethers.ZeroAddress; // ETH
    const tokenOut = "0x6982508145454ce325ddbe47a25d4ec3d2311933"; // PEPE

    console.log("=== Backwards Compatibility Example ===");

    // Original method still works (without multicall)
    const legacyRoute = await this.routeOptimizer.uniV2GetOptimizedRoute(tokenIn, tokenOut);
    console.log("Legacy V2 route:", legacyRoute.path.join(" -> "));

    // Enhanced method with multicall
    const enhancedRoute = await this.routeOptimizer.uniV2GetOptimizedRoute(tokenIn, tokenOut, wallet);
    console.log("Enhanced V2 route:", enhancedRoute.path.join(" -> "));

    // New method for all DEXes
    const bestRoute = await this.routeOptimizer.getBestRoute(wallet, tokenIn, tokenOut, ethers.parseEther("1"));

    if (bestRoute) {
      console.log("Best route across all DEXes:", bestRoute.path.join(" -> "));
      console.log("From DEX:", bestRoute.metadata.dex);
    }
  }

  /**
   * Example 4: Integration with trading strategies
   */
  async tradingStrategyIntegrationExample(wallet: Wallet): Promise<void> {
    const trade: BuyTradeCreationDto = {
      tradeType: "BUY",
      chain: this.chain,
      inputType: InputType.ETH,
      inputToken: ethers.ZeroAddress,
      inputAmount: "1",
      outputToken: "0x6982508145454ce325ddbe47a25d4ec3d2311933", // PEPE
    };

    console.log("=== Trading Strategy Integration ===");

    // 1. Find best route across all DEXes
    const amountIn = ethers.parseEther(trade.inputAmount);
    const bestRoute = await this.enhancedOptimizer.findBestRoute(wallet, trade.inputToken, trade.outputToken, amountIn);

    if (bestRoute) {
      console.log(`Best route found on ${bestRoute.metadata.dex}:`);
      console.log(`  Expected output: ${bestRoute.estimatedOutput}`);
      console.log(`  Gas estimate: ${bestRoute.metadata.gasEstimate}`);

      // 2. You can now use this route information to:
      // - Choose the appropriate trading strategy
      // - Set slippage tolerance based on price impact
      // - Estimate total transaction cost
      // - Execute the trade with the optimal route

      // Example: Route to strategy mapping
      const strategyName = this.getStrategyForRoute(bestRoute);
      console.log(`  Should use strategy: ${strategyName}`);
    }
  }

  /**
   * Helper method to determine which strategy to use based on route
   */
  private getStrategyForRoute(route: any): string {
    switch (route.metadata.dex) {
      case "UniswapV2":
        return "UniswapV2Strategy";
      case "UniswapV3":
        return "UniswapV3Strategy";
      case "UniswapV4":
        return "UniswapV4Strategy";
      case "SushiSwap":
        return "SushiSwapStrategy";
      case "Aerodrome":
        return "AerodromeStrategy";
      default:
        return "DefaultStrategy";
    }
  }

  /**
   * Example 5: Advanced filtering and options
   */
  async advancedFilteringExample(wallet: Wallet): Promise<void> {
    const tokenIn = ethers.ZeroAddress; // ETH
    const tokenOut = "0x6982508145454ce325ddbe47a25d4ec3d2311933"; // PEPE
    const amountIn = ethers.parseEther("10"); // Larger trade

    console.log("=== Advanced Filtering Example ===");

    // For large trades, you might want to exclude certain DEXes or limit hops
    const bestRouteForLargeTrade = await this.enhancedOptimizer.findBestRoute(wallet, tokenIn, tokenOut, amountIn, {
      maxHops: 2, // Limit to 2 hops to reduce slippage
      excludeDEXes: ["UniswapV2"], // Exclude V2 for large trades (less liquidity)
      maxRoutes: 3, // Only check top 3 routes
    });

    if (bestRouteForLargeTrade) {
      console.log("Best route for large trade:");
      console.log(`  DEX: ${bestRouteForLargeTrade.metadata.dex}`);
      console.log(`  Output: ${bestRouteForLargeTrade.estimatedOutput}`);
      console.log(`  Price Impact: ${bestRouteForLargeTrade.metadata.priceImpact}%`);
    }
  }
}

// Usage example
export async function runRouteOptimizerExamples(wallet: Wallet, chain: ChainType): Promise<void> {
  const examples = new RouteOptimizerUsageExample(chain);

  try {
    await examples.findBestRouteExample(wallet);
    await examples.compareRoutesExample(wallet);
    await examples.backwardsCompatibilityExample(wallet);
    await examples.tradingStrategyIntegrationExample(wallet);
    await examples.advancedFilteringExample(wallet);
  } catch (error) {
    console.error("Error running route optimizer examples:", error);
  }
}
