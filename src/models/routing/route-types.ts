export interface RouteMetadata {
  dex: string;
  version: string;
  gasEstimate?: bigint;
  liquidityUsd?: number;
  priceImpact?: number;
}

export interface EnhancedRoute {
  path: string[];
  fees: number[];
  encodedPath: string | null;
  poolKey?: any; // Keep flexible for different DEX pool types
  metadata: RouteMetadata;
  estimatedOutput?: bigint;
  score?: number;
}

export interface RouteQuery {
  tokenIn: string;
  tokenOut: string;
  amountIn: bigint;
  dex: string;
  routeId: string;
}

export interface MulticallRequest {
  target: string;
  callData: string;
  identifier: string;
  dex: string;
  queryType: "existence" | "quote" | "liquidity" | "price";
}

export interface RouteResult {
  route: EnhancedRoute;
  success: boolean;
  error?: string;
  outputAmount?: bigint;
  gasEstimate?: bigint;
}

export interface DexConfiguration {
  name: string;
  version: string;
  factory?: string;
  router?: string;
  quoter?: string;
  multicall?: string;
  supportedFeeTiers?: number[];
  maxHops?: number;
}
