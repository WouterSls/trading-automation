import { ethers } from "ethers";
import { getLowPoolKey } from "../smartcontracts/uniswap-v4/uniswap-v4-utils";
import { encodePath, FeeAmount } from "../smartcontracts/uniswap-v3";
import { ChainType, getChainConfig } from "../../config/chain-config";
import { Route } from "./types/quoting-types";

export class RouteOptimizer {
  private WETH_ADDRESS;

  constructor(private chain: ChainType) {
    const chainConfig = getChainConfig(chain);
    this.WETH_ADDRESS = chainConfig.tokenAddresses.weth;
  }

  async uniV2GetOptimizedRoute(tokenIn: string, tokenOut: string): Promise<Route> {
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
    // route.path = [tokenIn,this.WETH_ADDRESS,tokenOut];

    // Action plan
    // 1. Quote route directly
    // 2. Quote Using Known Liquid pairs
    // 3. Create Custom Routes based on TheGraph Info

    return route;
  }

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

  async uniV4GetOptimizedRoute(tokenIn: string, tokenOut: string): Promise<Route> {
    const route: Route = {
      path: [],
      fees: [],
      encodedPath: null,
      poolKey: null,
    };

    route.poolKey = getLowPoolKey(tokenIn, tokenOut);
    route.path = [tokenIn, tokenOut];

    return route;
  }
}
