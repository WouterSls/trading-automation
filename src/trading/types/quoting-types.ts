import { AerodromeTradeRoute } from "../../smartcontracts/aerodrome/aerodrome-types";
import { FeeAmount } from "../../smartcontracts/uniswap-v3";
import { PoolKey, PathKey } from "../../smartcontracts/uniswap-v4/uniswap-v4-types";

export interface Quote {
  strategy: string;
  outputAmount: string;
  route: Route;
  //gasEstimate: string;
  //confidence: number; // 0-1 based on liquidity depth
}

export interface Route {
  amountOut: bigint;
  path: string[];
  fees: FeeAmount[];
  encodedPath: string | null;
  poolKey: PoolKey | null;
  pathSegments: PathKey[] | null;
  aeroRoutes: AerodromeTradeRoute[] | null;
}
