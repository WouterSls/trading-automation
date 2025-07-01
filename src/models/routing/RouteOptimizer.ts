import { Wallet } from "ethers";
import {
  getHighPoolKey,
  getLowestFeePoolKey,
  getLowPoolKey,
  getMediumPoolKey,
} from "../smartcontracts/uniswap-v4/uniswap-v4-utils";
import { ChainType } from "../../config/chain-config";
import { Route } from "../trading/types/quoting-types";
import { UniswapV2RoutingStrategy } from "./strategies/UniswapV2RoutingStrategy";
import { UniswapV3RoutingStrategy } from "./strategies/UniswapV3RoutingStrategy";
import { UniswapV4RoutingStrategy } from "./strategies/UniswapV4RoutingStrategy";
import { AerodromeRoutingStrategy } from "./strategies/AerodromeRoutingStrategy";

export class RouteOptimizer {
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

  async getBestUniV2Route(wallet: Wallet, tokenIn: string, amountIn: bigint, tokenOut: string): Promise<Route> {
    return this.uniswapV2RoutingStrategy.getBestRoute(wallet, tokenIn, amountIn, tokenOut);
  }

  async getBestUniV3Route(wallet: Wallet, tokenIn: string, amountIn: bigint, tokenOut: string): Promise<Route> {
    return this.uniswapV3RoutingStrategy.getBestRoute(wallet, tokenIn, amountIn, tokenOut);
  }

  async getBestUniV4Route(wallet: Wallet, tokenIn: string, amountIn: bigint, tokenOut: string): Promise<Route> {
    const route: Route = {
      amountOut: 0n,
      path: [],
      fees: [],
      encodedPath: null,
      poolKey: null,
    };

    const lowestPoolKey = getLowestFeePoolKey(tokenIn, tokenOut);
    const lowPoolKey = getLowPoolKey(tokenIn, tokenOut);
    const medPoolKey = getMediumPoolKey(tokenIn, tokenOut);
    const highPoolKey = getHighPoolKey(tokenIn, tokenOut);

    route.path = [tokenIn, tokenOut];
    route.fees = [medPoolKey.fee];
    route.poolKey = medPoolKey;

    return route;
  }

  async getBestAeroRoute(wallet: Wallet, tokenIn: string, amountIn: bigint, tokenOut: string): Promise<Route> {
    const route: Route = {
      amountOut: 0n,
      path: [],
      fees: [],
      encodedPath: null,
      poolKey: null,
    };
    return route;
  }
}
