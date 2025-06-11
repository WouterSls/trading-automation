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
    const route: Route = {
      path: [],
      fees: [],
      encodedPath: null,
      poolKey: null,
    };
    route.path = [tokenIn, tokenOut];
    route.fees = [FeeAmount.MEDIUM];
    route.encodedPath = encodePath(route.path, route.fees);
    return route;
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
