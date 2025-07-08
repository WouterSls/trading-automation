import { ethers, Wallet } from "ethers";
import { BaseRoutingStrategy } from "../BaseRoutingStrategy";
import { UniswapV2RouterV2 } from "../../smartcontracts/uniswap-v2";
import {
  Multicall3Request,
  Multicall3Result,
  Multicall3Context,
  Mutlicall3Metadata,
} from "../../smartcontracts/multicall3/multicall3-types";
import { Route } from "../../trading/types/quoting-types";
import { Multicall3 } from "../../smartcontracts/multicall3/Multicall3";
import { FeeAmount } from "../../smartcontracts/uniswap-v3";

export class UniswapV2RoutingStrategy extends BaseRoutingStrategy {
  private intermediaryTokenList: string[] = [];
  private intermediaryTokenCombinations: { firstToken: string; secondToken: string; name: string }[] = [];

  private uniswapV2RouterV2: UniswapV2RouterV2;
  private multicall3: Multicall3;

  constructor(chain: any) {
    super(chain);
    this.intermediaryTokenList = this.getIntermediaryTokenList();
    this.intermediaryTokenCombinations = this.getIntermediaryTokenCombinations();

    this.uniswapV2RouterV2 = new UniswapV2RouterV2(chain);
    this.multicall3 = new Multicall3(chain);
  }

  async getBestRoute(tokenIn: string, amountIn: bigint, tokenOut: string, wallet: Wallet): Promise<Route> {
    tokenIn = tokenIn === ethers.ZeroAddress ? this.chainConfig.tokenAddresses.weth : tokenIn;
    tokenOut = tokenOut === ethers.ZeroAddress ? this.chainConfig.tokenAddresses.weth : tokenOut;

    const multicall3Contexts: Multicall3Context[] = [];
    let requestIndex = 0;

    const directRouteMulticallContext = this.createDirectRouteMulticall3Context(
      tokenIn,
      amountIn,
      tokenOut,
      requestIndex,
    );
    multicall3Contexts.push(directRouteMulticallContext);
    requestIndex++;

    const multihopRoutesMulticallContexts = this.createMultihopRoutesMulticall3Contexts(
      tokenIn,
      amountIn,
      tokenOut,
      requestIndex,
    );
    multicall3Contexts.push(...multihopRoutesMulticallContexts);
    requestIndex += multihopRoutesMulticallContexts.length;

    //console.log(`CREATED ${multicall3Contexts.length} MULTICALL CONTEXTS`);

    //TODO: Implement
    const theGraphQuotesCall3 = this.createTheGraphRoutesMulticall3Contexts();

    const multicall3Requests: Multicall3Request[] = multicall3Contexts.map((context) => context.request);
    const multicall3Results: Multicall3Result[] = await this.multicall3.aggregate3StaticCall(
      wallet,
      multicall3Requests,
    );

    const bestRoute = this.findBestRouteFromResults(multicall3Results, multicall3Contexts);

    return bestRoute;
  }

  createDirectRouteMulticall3Context(
    tokenIn: string,
    amountIn: bigint,
    tokenOut: string,
    requestIndex: number,
  ): Multicall3Context {
    const path = [tokenIn, tokenOut];
    const callData = this.uniswapV2RouterV2.encodeGetAmountsOut(amountIn, path);

    const request: Multicall3Request = {
      target: this.uniswapV2RouterV2.getRouterAddress(),
      allowFailure: true,
      callData: callData,
    };

    const metadata: Mutlicall3Metadata = {
      requestIndex,
      type: "quote",
      path,
      description: `${tokenIn} -> ${tokenOut}`,
    };

    return { request, metadata };
  }

  createMultihopRoutesMulticall3Contexts(
    tokenIn: string,
    amountIn: bigint,
    tokenOut: string,
    startingRequestIndex: number,
  ): Multicall3Context[] {
    const multicall3Contexts: Multicall3Context[] = [];

    let currentRequestIndex = startingRequestIndex;

    const allPaths: { path: string[]; description: string }[] = [];

    const singleIntermediaryPaths = this.generateSingleIntermediaryPaths(tokenIn, tokenOut);
    const doubleIntermediaryPaths = this.generateDoubleIntermediaryPaths(tokenIn, tokenOut);

    allPaths.push(...singleIntermediaryPaths, ...doubleIntermediaryPaths);

    for (const pathInfo of allPaths) {
      const callData = this.uniswapV2RouterV2.encodeGetAmountsOut(amountIn, pathInfo.path);

      const request: Multicall3Request = {
        target: this.uniswapV2RouterV2.getRouterAddress(),
        allowFailure: true,
        callData: callData,
      };

      const metadata: Mutlicall3Metadata = {
        requestIndex: currentRequestIndex,
        type: "quote",
        path: pathInfo.path,
        description: pathInfo.description,
      };

      multicall3Contexts.push({ request, metadata });
      currentRequestIndex++;
    }

    return multicall3Contexts;
  }

  private generateSingleIntermediaryPaths(
    tokenIn: string,
    tokenOut: string,
  ): { path: string[]; description: string }[] {
    const paths: { path: string[]; description: string }[] = [];
    for (const intermediary of this.intermediaryTokenList) {
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
        const decoded = this.uniswapV2RouterV2.decodeGetAmountsOutResult(result.returnData);
        const amountOut = decoded[decoded.length - 1];

        //console.log(`Route: ${context.metadata.description} | AmountOut: ${amountOut.toString()}`);

        if (amountOut > bestAmountOut) {
          bestAmountOut = amountOut;
          bestRoute = {
            amountOut: bestAmountOut,
            path: context.metadata.path,
            fees: [],
            encodedPath: null,
            poolKey: null,
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

    console.log(`Best route selected: ${bestRoute.path.join(" -> ")} with output: ${bestAmountOut.toString()}`);
    return bestRoute;
  }

  // TODO: Implement
  createTheGraphRoutesMulticall3Contexts() {}

  private estimateGasForRoute(route: Route): bigint {
    // Base gas cost for V2 swap
    const baseGas = 100000n;

    // Additional gas for each hop
    const hopGas = 60000n * BigInt(route.path.length - 2);

    return baseGas + hopGas;
  }
}
