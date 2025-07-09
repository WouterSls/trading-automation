import { AerodromeTradeRoute } from "../aerodrome/aerodrome-types";
import { FeeAmount } from "../uniswap-v3";
import { PoolKey, PathSegment } from "../uniswap-v4/uniswap-v4-types";

// Ethers.js returns multicall results as tuples (arrays), not objects
// So we define it as a tuple type that can be accessed by index
// export type Call3Result = [boolean, string]; // [success, returnData]
// We map the result type to the object defined below in Multicall3 abstraction

export interface Multicall3Result {
  success: boolean;
  returnData: string;
}

export interface Multicall3Context {
  request: Multicall3Request;
  metadata: Mutlicall3Metadata;
}

export interface Multicall3Request {
  target: string;
  allowFailure: boolean;
  callData: string;
}

export interface Mutlicall3Metadata {
  requestIndex: number;
  type: "quote" | "info" | "transaction";
  path: string[];
  description: string;
  fees?: FeeAmount[];
  encodedPath?: string;
  aeroRoutes?: AerodromeTradeRoute[];
  poolKey?: PoolKey;
  pathSegments?: PathSegment[];
}
