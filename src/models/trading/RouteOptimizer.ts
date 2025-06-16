import { ethers, Wallet } from "ethers";
import {
  getHighPoolKey,
  getLowestFeePoolKey,
  getLowPoolKey,
  getMediumPoolKey,
} from "../smartcontracts/uniswap-v4/uniswap-v4-utils";
import { encodePath, FeeAmount } from "../smartcontracts/uniswap-v3";
import { ChainType, getChainConfig } from "../../config/chain-config";
import { Route } from "./types/quoting-types";
import { PoolKey } from "../smartcontracts/uniswap-v4/uniswap-v4-types";
import { EnhancedRouteOptimizer } from "./EnhancedRouteOptimizer";
import { EnhancedRoute } from "./types/route-types";

export class RouteOptimizer {
  private WETH_ADDRESS;
  private enhancedOptimizer: EnhancedRouteOptimizer;

  constructor(chain: ChainType) {
    const chainConfig = getChainConfig(chain);
    this.WETH_ADDRESS = chainConfig.tokenAddresses.weth;
    this.enhancedOptimizer = new EnhancedRouteOptimizer(chain);
  }

  async uniV2GetOptimizedRoute(tokenIn: string, tokenOut: string, wallet?: Wallet): Promise<Route> {
    // If wallet is provided, use enhanced optimizer for better routing
    if (wallet) {
      const amountIn = ethers.parseEther("1"); // Default amount for route discovery
      const enhancedRoute = await this.enhancedOptimizer.getRouteForDex(
        wallet,
        "UniswapV2",
        tokenIn,
        tokenOut,
        amountIn,
      );

      if (enhancedRoute) {
        return this.convertEnhancedRouteToRoute(enhancedRoute);
      }
    }

    // Fallback to original simple routing
    const route: Route = {
      path: [],
      fees: [],
      encodedPath: null,
      poolKey: null,
    };

    if (tokenIn === ethers.ZeroAddress) {
      tokenIn = this.WETH_ADDRESS;
    }
    route.path = [tokenIn, tokenOut];

    return route;
  }

  async uniV3GetOptimizedRoute(tokenIn: string, tokenOut: string): Promise<Route> {
    if (tokenIn === ethers.ZeroAddress) tokenIn = this.WETH_ADDRESS;
    const routes: Route[] = [];

    const directRoutes = await this.createDirectRoutes(tokenIn, tokenOut);
    routes.push(...directRoutes);

    return routes[2];
  }

  async uniV4GetOptimizedRoute(tokenIn: string, tokenOut: string): Promise<Route> {
    const route: Route = {
      path: [],
      fees: [],
      encodedPath: null,
      poolKey: null,
    };

    const poolsKey = await this.createPoolKeys(tokenIn, tokenOut);

    route.path = [tokenIn, tokenOut];
    route.fees = [poolsKey[2].fee];
    route.poolKey = poolsKey[2];

    return route;
  }

  private async createDirectRoutes(tokenIn: string, tokenOut: string): Promise<Route[]> {
    const lowestRoute: Route = {
      path: [tokenIn, tokenOut],
      fees: [FeeAmount.LOWEST],
      encodedPath: encodePath([tokenIn, tokenOut], [FeeAmount.LOWEST]),
      poolKey: null,
    };
    const lowRoute: Route = {
      path: [tokenIn, tokenOut],
      fees: [FeeAmount.LOW],
      encodedPath: encodePath([tokenIn, tokenOut], [FeeAmount.LOW]),
      poolKey: null,
    };
    const medRoute: Route = {
      path: [tokenIn, tokenOut],
      fees: [FeeAmount.MEDIUM],
      encodedPath: encodePath([tokenIn, tokenOut], [FeeAmount.MEDIUM]),
      poolKey: null,
    };
    const highRoute: Route = {
      path: [tokenIn, tokenOut],
      fees: [FeeAmount.HIGH],
      encodedPath: encodePath([tokenIn, tokenOut], [FeeAmount.HIGH]),
      poolKey: null,
    };

    return [lowestRoute, lowRoute, medRoute, highRoute];
  }

  private async createPoolKeys(tokenIn: string, tokenOut: string): Promise<PoolKey[]> {
    const lowestPoolKey = getLowestFeePoolKey(tokenIn, tokenOut);
    const lowPoolKey = getLowPoolKey(tokenIn, tokenOut);
    const medPoolKey = getMediumPoolKey(tokenIn, tokenOut);
    const highPoolKey = getHighPoolKey(tokenIn, tokenOut);

    return [lowestPoolKey, lowPoolKey, medPoolKey, highPoolKey];
  }

  /**
   * Convert EnhancedRoute to legacy Route format for backwards compatibility
   */
  private convertEnhancedRouteToRoute(enhancedRoute: EnhancedRoute): Route {
    return {
      path: enhancedRoute.path,
      fees: enhancedRoute.fees,
      encodedPath: enhancedRoute.encodedPath,
      poolKey: enhancedRoute.poolKey || null,
    };
  }

  /**
   * Get the best route across all DEXes using multicall (new method)
   */
  async getBestRoute(
    wallet: Wallet,
    tokenIn: string,
    tokenOut: string,
    amountIn: bigint,
    options?: {
      maxHops?: number;
      includeDEXes?: string[];
      excludeDEXes?: string[];
      maxRoutes?: number;
    },
  ): Promise<EnhancedRoute | null> {
    return this.enhancedOptimizer.findBestRoute(wallet, tokenIn, tokenOut, amountIn, options);
  }

  /**
   * Compare routes across different DEXes (new method)
   */
  async compareAllDexRoutes(
    wallet: Wallet,
    tokenIn: string,
    tokenOut: string,
    amountIn: bigint,
  ): Promise<Map<string, EnhancedRoute | null>> {
    return this.enhancedOptimizer.compareRoutes(wallet, tokenIn, tokenOut, amountIn);
  }
}
