import { ethers, Wallet, Contract } from "ethers";
import { BaseRouteProvider } from "./BaseRouteProvider";
import { EnhancedRoute, RouteQuery, MulticallRequest, RouteResult, DexConfiguration } from "../types/route-types";

export class UniswapV2RouteProvider extends BaseRouteProvider {
  private factoryContract: Contract;
  private routerContract: Contract;

  constructor(chain: any) {
    super(chain);

    // Uniswap V2 Factory ABI (simplified)
    const factoryAbi = ["function getPair(address tokenA, address tokenB) external view returns (address pair)"];

    // Uniswap V2 Router ABI (simplified)
    const routerAbi = [
      "function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts)",
    ];

    this.factoryContract = new Contract(
      this.chainConfig.dexes?.uniswapV2?.factory || "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f",
      factoryAbi,
    );

    this.routerContract = new Contract(
      this.chainConfig.dexes?.uniswapV2?.router || "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",
      routerAbi,
    );
  }

  getConfiguration(): DexConfiguration {
    return {
      name: "UniswapV2",
      version: "2.0",
      factory: this.factoryContract.target as string,
      router: this.routerContract.target as string,
      supportedFeeTiers: [3000], // V2 has fixed 0.3% fee
      maxHops: 3,
    };
  }

  async generateRoutes(tokenIn: string, tokenOut: string, maxHops: number = 2): Promise<EnhancedRoute[]> {
    const routes: EnhancedRoute[] = [];

    // Direct routes
    const directRoutes = await this.generateDirectRoutes(tokenIn, tokenOut);
    routes.push(...directRoutes);

    // Multi-hop routes if requested
    if (maxHops > 1) {
      const multiHopRoutes = await this.generateMultiHopRoutes(tokenIn, tokenOut, maxHops);
      routes.push(...multiHopRoutes);
    }

    return routes;
  }

  async buildMulticallRequests(queries: RouteQuery[]): Promise<MulticallRequest[]> {
    const requests: MulticallRequest[] = [];

    for (const query of queries) {
      const routes = await this.generateRoutes(query.tokenIn, query.tokenOut);

      for (const route of routes) {
        // Check if pair exists for each hop
        for (let i = 0; i < route.path.length - 1; i++) {
          const tokenA = route.path[i];
          const tokenB = route.path[i + 1];

          requests.push({
            target: this.factoryContract.target as string,
            callData: this.factoryContract.interface.encodeFunctionData("getPair", [tokenA, tokenB]),
            identifier: `${query.routeId}-pair-${tokenA}-${tokenB}`,
            dex: "UniswapV2",
            queryType: "existence",
          });
        }

        // Get quote for the full route
        requests.push({
          target: this.routerContract.target as string,
          callData: this.routerContract.interface.encodeFunctionData("getAmountsOut", [query.amountIn, route.path]),
          identifier: `${query.routeId}-quote-${route.path.join("-")}`,
          dex: "UniswapV2",
          queryType: "quote",
        });
      }
    }

    return requests;
  }

  async processMulticallResults(
    requests: MulticallRequest[],
    results: Map<string, any>,
    queries: RouteQuery[],
  ): Promise<RouteResult[]> {
    const routeResults: RouteResult[] = [];

    for (const query of queries) {
      const routes = await this.generateRoutes(query.tokenIn, query.tokenOut);

      for (const route of routes) {
        const routeId = `${query.routeId}-quote-${route.path.join("-")}`;
        const quoteResult = results.get(routeId);

        if (quoteResult) {
          try {
            // quoteResult should be an array of amounts
            const amounts = Array.isArray(quoteResult) ? quoteResult : [quoteResult];
            const outputAmount = amounts[amounts.length - 1];

            // Check if all pairs exist for this route
            const pairsExist = await this.checkPairsExist(route, results, query.routeId);

            if (pairsExist) {
              // Calculate route score
              const gasEstimate = this.estimateGasForRoute(route);
              const score = this.calculateRouteScore(route, outputAmount, gasEstimate);

              // Update route with results
              route.estimatedOutput = outputAmount;
              route.score = score;
              route.metadata.gasEstimate = gasEstimate;

              routeResults.push({
                route,
                success: true,
                outputAmount,
                gasEstimate,
              });
            } else {
              routeResults.push({
                route,
                success: false,
                error: "Pair does not exist",
              });
            }
          } catch (error) {
            routeResults.push({
              route,
              success: false,
              error: `Failed to process quote: ${error}`,
            });
          }
        } else {
          routeResults.push({
            route,
            success: false,
            error: "No quote result found",
          });
        }
      }
    }

    return routeResults;
  }

  async hasDirectRoute(wallet: Wallet, tokenIn: string, tokenOut: string): Promise<boolean> {
    try {
      const normalizedTokenIn = this.normalizeTokenAddress(tokenIn);
      const normalizedTokenOut = this.normalizeTokenAddress(tokenOut);

      const pairAddress = await this.factoryContract.connect(wallet).getPair(normalizedTokenIn, normalizedTokenOut);
      return pairAddress !== ethers.ZeroAddress;
    } catch (error) {
      console.warn("Error checking direct route:", error);
      return false;
    }
  }

  /**
   * Checks if all pairs exist for a route based on multicall results
   */
  private async checkPairsExist(route: EnhancedRoute, results: Map<string, any>, routeId: string): Promise<boolean> {
    for (let i = 0; i < route.path.length - 1; i++) {
      const tokenA = route.path[i];
      const tokenB = route.path[i + 1];
      const pairKey = `${routeId}-pair-${tokenA}-${tokenB}`;
      const pairAddress = results.get(pairKey);

      if (!pairAddress || pairAddress === ethers.ZeroAddress) {
        return false;
      }
    }
    return true;
  }

  /**
   * Estimates gas cost for a route
   */
  private estimateGasForRoute(route: EnhancedRoute): bigint {
    // Base gas cost for V2 swap
    const baseGas = 100000n;

    // Additional gas for each hop
    const hopGas = 60000n * BigInt(route.path.length - 2);

    return baseGas + hopGas;
  }
}
