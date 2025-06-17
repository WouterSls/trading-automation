import { ethers, Wallet } from "ethers";
import {
  getHighPoolKey,
  getLowestFeePoolKey,
  getLowPoolKey,
  getMediumPoolKey,
} from "../smartcontracts/uniswap-v4/uniswap-v4-utils";
import { encodePath, FeeAmount, UniswapV3QuoterV2 } from "../smartcontracts/uniswap-v3";
import { ChainType, getChainConfig } from "../../config/chain-config";
import { Route } from "../trading/types/quoting-types";
import { PoolKey } from "../smartcontracts/uniswap-v4/uniswap-v4-types";
import { EnhancedRouteOptimizer } from "./EnhancedRouteOptimizer";
import { EnhancedRoute } from "./route-types";
import { UniswapV2RouterV2 } from "../smartcontracts/uniswap-v2";
import { UniswapV4Quoter } from "../smartcontracts/uniswap-v4/UniswapV4Quoter";
import { Call3, Call3Result } from "../smartcontracts/multicall3/multicall3-types";
import { Multicall3 } from "../smartcontracts/multicall3/Multicall3";

export class RouteOptimizer {
  private WETH_ADDRESS;
  private USDC_ADDRESS;
  private DAI_ADDRESS;

  private enhancedOptimizer: EnhancedRouteOptimizer;

  private uniswapV2RouterV2: UniswapV2RouterV2;
  private uniswapV3QuoterV2: UniswapV3QuoterV2;
  private uniswapV4Quoter: UniswapV4Quoter;

  private multicall3: Multicall3;

  constructor(chain: ChainType) {
    const chainConfig = getChainConfig(chain);

    this.WETH_ADDRESS = chainConfig.tokenAddresses.weth;
    this.DAI_ADDRESS = chainConfig.tokenAddresses.dai;
    this.USDC_ADDRESS = chainConfig.tokenAddresses.usdc;

    this.enhancedOptimizer = new EnhancedRouteOptimizer(chain);

    this.uniswapV2RouterV2 = new UniswapV2RouterV2(chain);
    this.uniswapV3QuoterV2 = new UniswapV3QuoterV2(chain);
    this.uniswapV4Quoter = new UniswapV4Quoter(chain);

    this.multicall3 = new Multicall3(chain);
  }

  // ----------------- UNISWAP V2 -----------------
  async uniV2GetOptimizedRoute(wallet: Wallet, tokenIn: string, amountIn: bigint, tokenOut: string): Promise<Route> {
    if (tokenIn === ethers.ZeroAddress) {
      tokenIn = this.WETH_ADDRESS;
    }

    const multiCalls: Call3[] = [];

    // 1 result call
    const directQuoteCall3 = this.createDirectQuoteCall3(tokenIn, amountIn, tokenOut);
    // 5 result calls
    const multihopQuotesCall3 = this.createMultiHopQuotesCall3();
    // 5 result calls
    const theGraphQuotesCall3 = this.createTheGraphQuotesCall3();

    multiCalls.push(directQuoteCall3, ...multihopQuotesCall3, ...theGraphQuotesCall3);

    const result = await this.multicall3.aggregate3StaticCall(wallet, multiCalls);

    const bestRoute = this.decodeUniV2Multicall3Result(result);

    const route: Route = {
      path: bestRoute.path,
      fees: bestRoute.fees,
      encodedPath: null,
      poolKey: null,
    };

    return route;
  }

  private createDirectQuoteCall3(tokenIn: string, amountIn: bigint, tokenOut: string): Call3 {
    const path = [tokenIn, tokenOut];
    const callData = this.uniswapV2RouterV2.encodeGetAmountsOut(amountIn, path);
    const directQuoteCall3: Call3 = {
      target: this.uniswapV2RouterV2.getRouterAddress(),
      allowFailure: true,
      callData: callData,
    };

    return directQuoteCall3;
  }

  private createMultiHopQuotesCall3(tokenIn: string, amountIn: bigint, tokenOut: string): Call3[] {
    const pathWeth = [tokenIn, this.WETH_ADDRESS, tokenOut];
    const pathUsdc = [tokenIn, this.USDC_ADDRESS, tokenOut];
    const pathWethUsdc = [tokenIn, this.WETH_ADDRESS, this.USDC_ADDRESS, tokenOut];
    const pathUsdcWeth = [tokenIn, this.USDC_ADDRESS, this.WETH_ADDRESS, tokenOut];
    const pathDai = [tokenIn, this.DAI_ADDRESS, tokenOut];
    return [];
  }

  private createTheGraphQuotesCall3(): Call3[] {
    // TODO: implement
    return [];
  }

  private decodeUniV2Multicall3Result(multicallResults: Call3Result[]): Route {
    const directQuoteResult = multicallResults[0];
    const multiHopQuoteResult = multicallResults.slice(1, 6);

    return {
      path: [],
      fees: [FeeAmount.MEDIUM],
      encodedPath: null,
      poolKey: null,
    };
  }

  // ----------------- UNISWAP V3 -----------------
  async uniV3GetOptimizedRoute(tokenIn: string, tokenOut: string): Promise<Route> {
    if (tokenIn === ethers.ZeroAddress) tokenIn = this.WETH_ADDRESS;
    const routes: Route[] = [];

    const directRoutes = await this.createDirectRoutes(tokenIn, tokenOut);
    routes.push(...directRoutes);

    return routes[2];
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

  // ----------------- UNISWAP V4 -----------------
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

  private async createPoolKeys(tokenIn: string, tokenOut: string): Promise<PoolKey[]> {
    const lowestPoolKey = getLowestFeePoolKey(tokenIn, tokenOut);
    const lowPoolKey = getLowPoolKey(tokenIn, tokenOut);
    const medPoolKey = getMediumPoolKey(tokenIn, tokenOut);
    const highPoolKey = getHighPoolKey(tokenIn, tokenOut);

    return [lowestPoolKey, lowPoolKey, medPoolKey, highPoolKey];
  }

  // ----------------- MISC. -----------------
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
