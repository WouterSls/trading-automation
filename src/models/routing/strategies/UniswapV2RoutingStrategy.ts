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
  private intermediaryTokens: string[] = [];

  private uniswapV2RouterV2: UniswapV2RouterV2;
  private multicall3: Multicall3;

  constructor(chain: any) {
    super(chain);
    this.intermediaryTokens = this.getIntermediaryTokens();

    this.uniswapV2RouterV2 = new UniswapV2RouterV2(chain);
    this.multicall3 = new Multicall3(chain);
  }

  async getBestRoute(wallet: Wallet, tokenIn: string, amountIn: bigint, tokenOut: string): Promise<Route> {
    tokenIn = tokenIn === ethers.ZeroAddress ? this.chainConfig.tokenAddresses.weth : tokenIn;

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

    const multihopPaths = this.createMultihopPaths(tokenIn, tokenOut);

    for (const pathInfo of multihopPaths) {
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

  private createMultihopPaths(tokenIn: string, tokenOut: string): { path: string[]; description: string }[] {
    if (tokenIn.toLowerCase() === tokenOut.toLowerCase()) {
      return [];
    }

    const allPaths: { path: string[]; description: string }[] = [];

    const singleIntermediaryPaths = this.generateSingleIntermediaryPaths(tokenIn, tokenOut);
    const doubleIntermediaryPaths = this.generateDoubleIntermediaryPaths(tokenIn, tokenOut);

    allPaths.push(...singleIntermediaryPaths, ...doubleIntermediaryPaths);

    return allPaths;
  }

  private generateSingleIntermediaryPaths(
    tokenIn: string,
    tokenOut: string,
  ): { path: string[]; description: string }[] {
    const paths: { path: string[]; description: string }[] = [];
    for (const intermediary of this.intermediaryTokens) {
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

    const strategicCombinations = [
      // Major stable -> WETH -> major stable routes
      { first: this.chainConfig.tokenAddresses.usdc, second: this.chainConfig.tokenAddresses.weth, name: "USDC-WETH" },
      { first: this.chainConfig.tokenAddresses.usdt, second: this.chainConfig.tokenAddresses.weth, name: "USDT-WETH" },
      { first: this.chainConfig.tokenAddresses.dai, second: this.chainConfig.tokenAddresses.weth, name: "DAI-WETH" },
      { first: this.chainConfig.tokenAddresses.usds, second: this.chainConfig.tokenAddresses.weth, name: "USDS-WETH" },

      // WETH -> major stable routes
      { first: this.chainConfig.tokenAddresses.weth, second: this.chainConfig.tokenAddresses.usdc, name: "WETH-USDC" },
      { first: this.chainConfig.tokenAddresses.weth, second: this.chainConfig.tokenAddresses.usdt, name: "WETH-USDT" },
      { first: this.chainConfig.tokenAddresses.weth, second: this.chainConfig.tokenAddresses.dai, name: "WETH-DAI" },
      { first: this.chainConfig.tokenAddresses.weth, second: this.chainConfig.tokenAddresses.usds, name: "WETH-USDS" },

      // Cross-stable arbitrage routes
      { first: this.chainConfig.tokenAddresses.usdc, second: this.chainConfig.tokenAddresses.usdt, name: "USDC-USDT" },
      { first: this.chainConfig.tokenAddresses.usdc, second: this.chainConfig.tokenAddresses.dai, name: "USDC-DAI" },
      { first: this.chainConfig.tokenAddresses.usdt, second: this.chainConfig.tokenAddresses.dai, name: "USDT-DAI" },

      // BTC bridge routes
      { first: this.chainConfig.tokenAddresses.weth, second: this.chainConfig.tokenAddresses.wbtc, name: "WETH-WBTC" },
      { first: this.chainConfig.tokenAddresses.wbtc, second: this.chainConfig.tokenAddresses.weth, name: "WBTC-WETH" },
      { first: this.chainConfig.tokenAddresses.usdc, second: this.chainConfig.tokenAddresses.wbtc, name: "USDC-WBTC" },
      { first: this.chainConfig.tokenAddresses.wbtc, second: this.chainConfig.tokenAddresses.usdc, name: "WBTC-USDC" },

      // Specific bridge routes
      {
        first: this.chainConfig.tokenAddresses.virtual,
        second: this.chainConfig.tokenAddresses.weth,
        name: "VIRTUAL-WETH",
      },
      {
        first: this.chainConfig.tokenAddresses.virtual,
        second: this.chainConfig.tokenAddresses.weth,
        name: "WETH-VIRTUAL",
      },
      { first: this.chainConfig.tokenAddresses.aero, second: this.chainConfig.tokenAddresses.weth, name: "AERO-WETH" },
      { first: this.chainConfig.tokenAddresses.weth, second: this.chainConfig.tokenAddresses.aero, name: "WETH-AERO" },
    ];

    for (const combo of strategicCombinations) {
      const isInvalidIntermediary =
        !combo.first || !combo.second || combo.first === ethers.ZeroAddress || combo.second === ethers.ZeroAddress;
      if (isInvalidIntermediary) {
        continue;
      }

      const isIntermediaryInputOrOutput =
        combo.first.toLowerCase() === tokenIn.toLowerCase() ||
        combo.first.toLowerCase() === tokenOut.toLowerCase() ||
        combo.second.toLowerCase() === tokenIn.toLowerCase() ||
        combo.second.toLowerCase() === tokenOut.toLowerCase();
      if (isIntermediaryInputOrOutput) {
        continue;
      }

      const isDuplicateIntermediary = combo.first.toLowerCase() === combo.second.toLowerCase();
      if (isDuplicateIntermediary) {
        continue;
      }

      paths.push({
        path: [tokenIn, combo.first, combo.second, tokenOut],
        description: `${tokenIn} -> ${this.getTokenSymbol(combo.first)} -> ${this.getTokenSymbol(combo.second)} -> ${tokenOut}`,
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

    for (let i = 0; i < multicall3Results.length; i++) {
      const result = multicall3Results[i];
      const context = multicall3Contexts[i];

      if (!result.success || !result.returnData) {
        console.log(`Route failed: ${context.metadata.description}`);
        continue;
      }

      try {
        const decoded = this.uniswapV2RouterV2.decodeGetAmountsOutResult(result.returnData);
        const amountOut = decoded[decoded.length - 1];

        console.log(`Route: ${context.metadata.description} | AmountOut: ${amountOut.toString()}`);

        if (amountOut > bestAmountOut) {
          bestAmountOut = amountOut;
          bestRoute = {
            path: context.metadata.path,
            fees: [FeeAmount.MEDIUM], // Default fee if not specified
            encodedPath: null,
            poolKey: null,
          };
        }
      } catch (error) {
        console.error(`Failed to decode route result for: ${context.metadata.description}`, error);
      }
    }

    if (!bestRoute) {
      console.warn("No valid routes found, returning default route");
      return {
        path: [],
        fees: [],
        encodedPath: null,
        poolKey: null,
      };
    }

    console.log();
    console.log(`Best route selected: ${bestRoute.path.join(" -> ")} with output: ${bestAmountOut.toString()}`);
    return bestRoute;
  }

  // TODO: Implement
  createTheGraphRoutesMulticall3Contexts() {}

  /**
   * Estimates gas cost for a route
   */
  private estimateGasForRoute(route: Route): bigint {
    // Base gas cost for V2 swap
    const baseGas = 100000n;

    // Additional gas for each hop
    const hopGas = 60000n * BigInt(route.path.length - 2);

    return baseGas + hopGas;
  }
}
