import { ethers, Wallet } from "ethers";
import { BaseRoutingStrategy } from "../BaseRoutingStrategy";
import { Route } from "../../trading/types/quoting-types";
import { Multicall3 } from "../../smartcontracts/multicall3/Multicall3";
import { UniswapV4Quoter } from "../../smartcontracts/uniswap-v4/UniswapV4Quoter";
import { FeeAmount, FeeToTickSpacing, PoolKey, PathSegment } from "../../smartcontracts/uniswap-v4/uniswap-v4-types";
import {
  Multicall3Context,
  Multicall3Request,
  Multicall3Result,
  Mutlicall3Metadata,
} from "../../smartcontracts/multicall3/multicall3-types";
import { ChainType } from "../../config/chain-config";

export class UniswapV4RoutingStrategy extends BaseRoutingStrategy {
  private intermediaryTokenList: string[] = [];
  private intermediaryTokenCombinations: { firstToken: string; secondToken: string; name: string }[] = [];

  private uniswapV4Quoter: UniswapV4Quoter;
  private multicall3: Multicall3;

  constructor(chain: ChainType) {
    super(chain);
    this.intermediaryTokenList = this.getIntermediaryTokenList();
    this.intermediaryTokenCombinations = this.getIntermediaryTokenCombinations();

    this.uniswapV4Quoter = new UniswapV4Quoter(chain);
    this.multicall3 = new Multicall3(chain);
  }

  async getBestRoute(tokenIn: string, amountIn: bigint, tokenOut: string, wallet: Wallet): Promise<Route> {
    const multicall3Contexts: Multicall3Context[] = [];
    let requestIndex = 0;

    const directRoutesMulticallContexts = this.createDirectRoutesMulticall3Contexts(
      tokenIn,
      amountIn,
      tokenOut,
      requestIndex,
    );
    multicall3Contexts.push(...directRoutesMulticallContexts);
    requestIndex += directRoutesMulticallContexts.length;

    const multihopRoutesMulticallContexts = this.createMultihopRoutesMulticall3Contexts(
      tokenIn,
      amountIn,
      tokenOut,
      requestIndex,
    );
    multicall3Contexts.push(...multihopRoutesMulticallContexts);
    requestIndex += multihopRoutesMulticallContexts.length;

    //console.log(`CREATED ${multicall3Contexts.length} MULTICALL CONTEXTS`);

    const multicall3Request: Multicall3Request[] = multicall3Contexts.map((context) => context.request);

    try {
      const multicall3Results: Multicall3Result[] = await this.multicall3.aggregate3StaticCall(
        wallet,
        multicall3Request,
      );
      //console.log("MULTICALL COMPLETED SUCCESSFULLY!");

      const bestRoute = this.findBestRouteFromResults(multicall3Results, multicall3Contexts);
      return bestRoute;
    } catch (error) {
      console.error("MULTICALL FAILED:", error);
      throw error;
    }
  }

  createDirectRoutesMulticall3Contexts(
    tokenIn: string,
    amountIn: bigint,
    tokenOut: string,
    startingRequestIndex: number,
  ): Multicall3Context[] {
    const multicall3Contexts: Multicall3Context[] = [];
    let currentRequestIndex = startingRequestIndex;

    const fees = [FeeAmount.LOWEST, FeeAmount.LOW, FeeAmount.MEDIUM, FeeAmount.HIGH];

    for (const fee of fees) {
      const poolKey = this.createPoolKey(tokenIn, tokenOut, fee);
      const zeroForOne = this.determineSwapDirection(tokenIn, poolKey);
      const hookData = "0x"; // No hooks for basic pools

      const callData = this.uniswapV4Quoter.encodeQuoteExactInputSingle(
        poolKey,
        zeroForOne,
        amountIn,
        hookData,
      );

      const request: Multicall3Request = {
        target: this.uniswapV4Quoter.getQuoterAddress(),
        allowFailure: true,
        callData: callData,
      };

      const metadata: Mutlicall3Metadata = {
        requestIndex: currentRequestIndex,
        type: "quote",
        path: [tokenIn, tokenOut],
        fees: [fee],
        description: `${tokenIn} -> ${tokenOut} | ${fee}`,
        poolKey: poolKey,
      };

      multicall3Contexts.push({ request, metadata });
      currentRequestIndex++;
    }

    return multicall3Contexts;
  }

  createMultihopRoutesMulticall3Contexts(
    tokenIn: string,
    amountIn: bigint,
    tokenOut: string,
    startingRequestIndex: number,
  ): Multicall3Context[] {
    const multicall3Contexts: Multicall3Context[] = [];
    let currentRequestIndex = startingRequestIndex;

    if (tokenIn.toLowerCase() === tokenOut.toLowerCase()) {
      return [];
    }

    const singleIntermediaryPaths = this.generateSingleIntermediaryPaths(tokenIn, tokenOut);
    const doubleIntermediaryPaths = this.generateDoubleIntermediaryPaths(tokenIn, tokenOut);

    // Single intermediary paths (2 hops)
    for (const pathInfo of singleIntermediaryPaths) {
      const twoHopFeeCombinations = this.getTwoHopFeeCombinations();

      for (const combo of twoHopFeeCombinations) {
        const pathSegments = this.createPathSegments(pathInfo.path, combo.fees);
        
        const callData = this.uniswapV4Quoter.encodeQuoteExactInput(
          pathInfo.path[0], // exactCurrency
          pathSegments,
          amountIn
        );

        const request: Multicall3Request = {
          target: this.uniswapV4Quoter.getQuoterAddress(),
          allowFailure: true,
          callData: callData,
        };

        const metadata: Mutlicall3Metadata = {
          requestIndex: currentRequestIndex,
          type: "quote",
          path: pathInfo.path,
          fees: combo.fees,
          description: `${pathInfo.description} | ${combo.fees.join("-")}`,
          pathSegments: pathSegments,
        };

        multicall3Contexts.push({ request, metadata });
        currentRequestIndex++;
      }
    }

    // Double intermediary paths (3 hops)
    for (const pathInfo of doubleIntermediaryPaths) {
      const threeHopFeeCombinations = this.getThreeHopFeeCombinations();

      for (const combo of threeHopFeeCombinations) {
        const pathSegments = this.createPathSegments(pathInfo.path, combo.fees);
        
        const callData = this.uniswapV4Quoter.encodeQuoteExactInput(
          pathInfo.path[0], // exactCurrency
          pathSegments,
          amountIn
        );

        const request: Multicall3Request = {
          target: this.uniswapV4Quoter.getQuoterAddress(),
          allowFailure: true,
          callData: callData,
        };

        const metadata: Mutlicall3Metadata = {
          requestIndex: currentRequestIndex,
          type: "quote",
          path: pathInfo.path,
          fees: combo.fees,
          description: `${pathInfo.description} | ${combo.fees.join("-")}`,
          pathSegments: pathSegments,
        };

        multicall3Contexts.push({ request, metadata });
        currentRequestIndex++;
      }
    }

    return multicall3Contexts;
  }

  // Helper methods
  private createPoolKey(tokenA: string, tokenB: string, fee: FeeAmount): PoolKey {
    const [currency0, currency1] = tokenA.toLowerCase() < tokenB.toLowerCase() ? [tokenA, tokenB] : [tokenB, tokenA];
    const tickSpacing = FeeToTickSpacing.get(fee);

    if (!tickSpacing) {
      throw new Error(`Invalid fee amount: ${fee}`);
    }

    return {
      currency0,
      currency1,
      fee,
      tickSpacing,
      hooks: ethers.ZeroAddress, // No hooks for basic pools
    };
  }

  private determineSwapDirection(tokenIn: string, poolKey: PoolKey): boolean {
    return tokenIn.toLowerCase() === poolKey.currency0.toLowerCase();
  }

  private createPathSegments(path: string[], fees: FeeAmount[]): PathSegment[] {
    const segments: PathSegment[] = [];
    
    for (let i = 0; i < path.length - 1; i++) {
      const fee = fees[i];
      const tickSpacing = FeeToTickSpacing.get(fee);
      
      if (!tickSpacing) {
        throw new Error(`Invalid fee amount: ${fee}`);
      }

      segments.push({
        intermediateCurrency: path[i + 1],
        fee,
        tickSpacing,
        hooks: ethers.ZeroAddress,
        hookData: "0x",
      });
    }

    return segments;
  }

  private generateSingleIntermediaryPaths(
    tokenIn: string,
    tokenOut: string,
  ): { path: string[]; description: string }[] {
    const paths: { path: string[]; description: string }[] = [];

    for (const intermediary of this.intermediaryTokenList) {
      if (
        intermediary.toLowerCase() === tokenIn.toLowerCase() ||
        intermediary.toLowerCase() === tokenOut.toLowerCase()
      ) {
        continue;
      }

      paths.push({
        path: [tokenIn, intermediary, tokenOut],
        description: `${tokenIn} -> ${this.getTokenSymbol(intermediary)} -> ${tokenOut}`,
      });
    }
    return paths;
  }

  private generateDoubleIntermediaryPaths(
    tokenIn: string,
    tokenOut: string,
  ): { path: string[]; description: string }[] {
    const paths: { path: string[]; description: string }[] = [];

    for (const combination of this.intermediaryTokenCombinations) {
      const isInvalidIntermediary =
        !combination.firstToken ||
        !combination.secondToken ||
        combination.firstToken === ethers.ZeroAddress ||
        combination.secondToken === ethers.ZeroAddress;

      if (isInvalidIntermediary) {
        continue;
      }

      const isIntermediaryInputOrOutput =
        combination.firstToken.toLowerCase() === tokenIn.toLowerCase() ||
        combination.firstToken.toLowerCase() === tokenOut.toLowerCase() ||
        combination.secondToken.toLowerCase() === tokenIn.toLowerCase() ||
        combination.secondToken.toLowerCase() === tokenOut.toLowerCase();

      if (isIntermediaryInputOrOutput) {
        continue;
      }

      const isDuplicateIntermediary = combination.firstToken.toLowerCase() === combination.secondToken.toLowerCase();
      if (isDuplicateIntermediary) {
        continue;
      }

      paths.push({
        path: [tokenIn, combination.firstToken, combination.secondToken, tokenOut],
        description: `${tokenIn} -> ${this.getTokenSymbol(combination.firstToken)} -> ${this.getTokenSymbol(combination.secondToken)} -> ${tokenOut}`,
      });
    }

    return paths;
  }



  private findBestRouteFromResults(
    multicall3Results: Multicall3Result[],
    multicall3Contexts: Multicall3Context[],
  ): Route {
    let bestRoute: Route | null = null;
    let bestAmountOut = 0n;

    if (!multicall3Results || multicall3Results.length === 0) {
      console.warn("No multicall results provided");
      return this.createDefaultRoute();
    }

    if (!multicall3Contexts || multicall3Contexts.length === 0) {
      console.warn("No multicall contexts provided");
      return this.createDefaultRoute();
    }

    if (multicall3Results.length !== multicall3Contexts.length) {
      console.warn("Mismatch between results and contexts length");
      return this.createDefaultRoute();
    }

    for (let i = 0; i < multicall3Results.length; i++) {
      const result = multicall3Results[i];
      const context = multicall3Contexts[i];

      if (!result.success || !result.returnData) {
        //console.log(`Route failed: ${context.metadata.description}`);
        continue;
      }

      try {
        const isMultihop = context.metadata.path.length > 2;
        let amountOut;

        if (isMultihop) {
          const { amountOut: decoded } = this.uniswapV4Quoter.decodeQuoteExactInputResultData(result.returnData);
          amountOut = decoded;
        } else {
          const { amountOut: decoded } = this.uniswapV4Quoter.decodeQuoteExactInputSingleResultData(result.returnData);
          amountOut = decoded;
        }

        //console.log(`Route: ${context.metadata.description} | AmountOut: ${amountOut.toString()}`);

        if (amountOut > bestAmountOut) {
          bestAmountOut = amountOut;
          bestRoute = {
            amountOut: bestAmountOut,
            path: context.metadata.path,
            fees: context.metadata.fees || [],
            encodedPath: null,
            poolKey: context.metadata.poolKey || null,
            pathSegments: context.metadata.pathSegments || null,
            aeroRoutes: null,
          };
        }
      } catch (error) {
        console.error(`Failed to decode route result for: ${context.metadata.description}`, error);
      }
    }

    if (!bestRoute) {
      console.warn("No valid routes found, returning default route");
      return this.createDefaultRoute();
    }

    console.log(`Best route selected: ${bestRoute.path.join(" -> ")} with fees: ${bestRoute.fees.join(" -> ")} | output: ${bestAmountOut.toString()}`);
    return bestRoute;
  }
}
