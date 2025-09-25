import NodeCache from "node-cache";

import { Wallet } from "ethers";
import { ChainType } from "../config/chain-config";
import { Route } from "../trading/types/quoting-types";
import { Protocol } from "../lib/generated-solidity-types";
import { UniswapV2RoutingStrategy } from "./strategies/UniswapV2RoutingStrategy";
import { UniswapV3RoutingStrategy } from "./strategies/UniswapV3RoutingStrategy";
import { UniswapV4RoutingStrategy } from "./strategies/UniswapV4RoutingStrategy";
import { AerodromeRoutingStrategy } from "./strategies/AerodromeRoutingStrategy";

export class RouteOptimizer {
  private routeCache: NodeCache = new NodeCache({ stdTTL: 600 }); //10 min

  private uniswapV2RoutingStrategy: UniswapV2RoutingStrategy;
  private uniswapV3RoutingStrategy: UniswapV3RoutingStrategy;
  private uniswapV4RoutingStrategy: UniswapV4RoutingStrategy;
  private aerodromeRoutingStrategy: AerodromeRoutingStrategy;

  constructor(chain: ChainType) {
    this.uniswapV2RoutingStrategy = new UniswapV2RoutingStrategy(chain);
    this.uniswapV3RoutingStrategy = new UniswapV3RoutingStrategy(chain);
    this.uniswapV4RoutingStrategy = new UniswapV4RoutingStrategy(chain);
    this.aerodromeRoutingStrategy = new AerodromeRoutingStrategy(chain);
  }

  async getBestUniV2Route(tokenIn: string, amountIn: bigint, tokenOut: string, wallet: Wallet): Promise<Route> {
    const cacheKey = `${tokenIn}_${amountIn.toString()}_${tokenOut}`;
    const cachedRoute = this.routeCache.get<Route>(cacheKey);
    if (cachedRoute) {
      return cachedRoute;
    }
    const route = await this.uniswapV2RoutingStrategy.getBestRoute(tokenIn, amountIn, tokenOut, wallet);
    this.routeCache.set(cacheKey, route);
    return route;
  }

  async getBestUniV3Route(tokenIn: string, amountIn: bigint, tokenOut: string, wallet: Wallet): Promise<Route> {
    const cacheKey = `${tokenIn}_${amountIn.toString()}_${tokenOut}`;
    const cachedRoute = this.routeCache.get<Route>(cacheKey);
    if (cachedRoute) {
      return cachedRoute;
    }
    const route = await this.uniswapV3RoutingStrategy.getBestRoute(tokenIn, amountIn, tokenOut, wallet);
    this.routeCache.set(cacheKey, route);
    return route;
  }

  async getBestUniV4Route(tokenIn: string, amountIn: bigint, tokenOut: string, wallet: Wallet): Promise<Route> {
    const cacheKey = `${tokenIn}_${amountIn.toString()}_${tokenOut}`;
    const cachedRoute = this.routeCache.get<Route>(cacheKey);
    if (cachedRoute) {
      return cachedRoute;
    }
    const route = await this.uniswapV4RoutingStrategy.getBestRoute(tokenIn, amountIn, tokenOut, wallet);
    this.routeCache.set(cacheKey, route);
    return route;
  }

  async getBestAeroRoute(tokenIn: string, amountIn: bigint, tokenOut: string, wallet: Wallet): Promise<Route> {
    const cacheKey = `${tokenIn}_${amountIn.toString()}_${tokenOut}`;
    const cachedRoute = this.routeCache.get<Route>(cacheKey);
    if (cachedRoute) {
      return cachedRoute;
    }
    const route = await this.aerodromeRoutingStrategy.getBestRoute(tokenIn, amountIn, tokenOut, wallet);
    this.routeCache.set(cacheKey, route);
    return route;
  }

  /**
   * Gets the best route across all available protocols
   * @param tokenIn Input token address
   * @param amountIn Input amount
   * @param tokenOut Output token address
   * @param wallet Wallet instance
   * @returns Object containing the best route and its protocol
   */
  async getBestRoute(
    tokenIn: string,
    amountIn: bigint,
    tokenOut: string,
    wallet: Wallet,
  ): Promise<{ route: Route; protocol: Protocol }> {
    const cacheKey = `best_${tokenIn}_${amountIn.toString()}_${tokenOut}`;
    const cachedResult = this.routeCache.get<{ route: Route; protocol: Protocol }>(cacheKey);
    if (cachedResult) {
      return cachedResult;
    }

    // Get routes from all available protocols in parallel
    const routePromises = [
      this.getBestUniV2Route(tokenIn, amountIn, tokenOut, wallet).then((route) => ({
        route,
        protocol: Protocol.UNISWAP_V2,
      })),
      this.getBestUniV3Route(tokenIn, amountIn, tokenOut, wallet).then((route) => ({
        route,
        protocol: Protocol.UNISWAP_V3,
      })),
      this.getBestUniV4Route(tokenIn, amountIn, tokenOut, wallet).then((route) => ({
        route,
        protocol: Protocol.UNISWAP_V2,
      })), // Note: Using UNISWAP_V2 as placeholder since UNISWAP_V4 is not in the enum
      this.getBestAeroRoute(tokenIn, amountIn, tokenOut, wallet).then((route) => ({
        route,
        protocol: Protocol.UNISWAP_V2,
      })), // Note: Using UNISWAP_V2 as placeholder since AERODROME is not in the enum
    ];

    try {
      const results = await Promise.allSettled(routePromises);

      // Filter successful results and find the one with highest amountOut
      const successfulResults = results
        .filter(
          (result): result is PromiseFulfilledResult<{ route: Route; protocol: Protocol }> =>
            result.status === "fulfilled",
        )
        .map((result) => result.value);

      if (successfulResults.length === 0) {
        throw new Error("No successful routes found across any protocol");
      }

      // Find the route with the highest amountOut
      const bestResult = successfulResults.reduce((best, current) =>
        current.route.amountOut > best.route.amountOut ? current : best,
      );

      // Cache the result
      this.routeCache.set(cacheKey, bestResult);

      return bestResult;
    } catch (error) {
      throw new Error(`Failed to get best route: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }
}
