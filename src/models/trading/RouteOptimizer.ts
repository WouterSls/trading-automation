import { ethers } from "ethers";
import { PoolKey } from "../smartcontracts/uniswap-v4/uniswap-v4-types";
import { getLowPoolKey } from "../smartcontracts/uniswap-v4/uniswap-v4-utils";
import { encodePath, FeeAmount } from "../smartcontracts/uniswap-v3";

const WETH_ADDRESS = "";

export class RouteOptimizer {
  async uniV2GetBestPath(tokenIn: string, tokenOut: string): Promise<string[]> {
    let bestPath: string[] = [];

    // Action plan
    // 1. Quote route directly
    // 2. Quote Using Known Liquid pairs
    // 3. Create Custom Routes based on TheGraph Info

    // TODO: fix WETH_ADDRESS = "";
    if (tokenIn === ethers.ZeroAddress) {
      bestPath = [WETH_ADDRESS, tokenOut];
    } else {
      bestPath = [tokenIn, tokenOut];
    }

    return bestPath;
  }

  async uniV3GetBestEncodedPath(tokenIn: string, tokenOut: string): Promise<string> {
    const path = [tokenIn, tokenOut];
    const fees = [FeeAmount.MEDIUM];
    let bestEncodedPath = encodePath(path, fees);
    return bestEncodedPath;
  }

  async uniV4GetBestPoolKey(tokenIn: string, tokenOut: string): Promise<PoolKey> {
    const poolKey: PoolKey = getLowPoolKey(tokenIn, tokenOut);
    return poolKey;
  }
}
