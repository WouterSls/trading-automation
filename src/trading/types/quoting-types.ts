import { FeeAmount } from "../../smartcontracts/uniswap-v3";
import { PoolKey } from "../../smartcontracts/uniswap-v4/uniswap-v4-types";

export interface Quote {
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
}
