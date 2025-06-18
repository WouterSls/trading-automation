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
    requestIndex + multihopRoutesMulticallContexts.length;

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
    requestIndex: number,
  ): Multicall3Context[] {
    const multicall3Contexts: Multicall3Context[] = [];

    const multihopPaths = this.createMultihopPaths(tokenIn, tokenOut);

    for (const pathInfo of multihopPaths) {
      const callData = this.uniswapV2RouterV2.encodeGetAmountsOut(amountIn, pathInfo.path);

      const request: Multicall3Request = {
        target: this.uniswapV2RouterV2.getRouterAddress(),
        allowFailure: true,
        callData: callData,
      };

      const metadata: Mutlicall3Metadata = {
        requestIndex: requestIndex++,
        type: "quote",
        path: pathInfo.path,
        description: pathInfo.description,
      };

      multicall3Contexts.push({ request, metadata });
    }

    return multicall3Contexts;
  }

  private createMultihopPaths(tokenIn: string, tokenOut: string): { path: string[]; description: string }[] {
    if (tokenIn.toLowerCase() === tokenOut.toLowerCase()) {
      return [];
    }

    const allPaths: { path: string[]; description: string }[] = [];

    const prioritizedIntermediaries = this.getPrioritizedIntermediaryTokens(tokenIn, tokenOut);

    // 2. Single intermediary paths (2 hops)
    for (const intermediary of prioritizedIntermediaries) {
      allPaths.push({
        path: [tokenIn, intermediary, tokenOut],
        description: `${tokenIn} -> ${this.getTokenSymbol(intermediary)} -> ${tokenOut}`,
      });
    }

    const doubleIntermediaryPaths = this.generateDoubleIntermediaryPaths(tokenIn, tokenOut, prioritizedIntermediaries);
    allPaths.push(...doubleIntermediaryPaths);

    return allPaths;
  }
  private getPrioritizedIntermediaryTokens(tokenIn: string, tokenOut: string): string[] {
    const allIntermediaries = this.getIntermediaryTokens();

    // Remove input/output tokens from intermediaries
    const validIntermediaries = allIntermediaries.filter(
      (token) => token.toLowerCase() !== tokenIn.toLowerCase() && token.toLowerCase() !== tokenOut.toLowerCase(),
    );

    // Define liquidity priority order
    const liquidityPriority = [
      this.chainConfig.tokenAddresses.weth, // WETH - highest liquidity base pair
      this.chainConfig.tokenAddresses.usdc, // USDC - major stablecoin
      this.chainConfig.tokenAddresses.usdt, // USDT - major stablecoin
      this.chainConfig.tokenAddresses.dai, // DAI - decentralized stablecoin
      this.chainConfig.tokenAddresses.wbtc, // WBTC - major BTC proxy
      this.chainConfig.tokenAddresses.usds, // USDS - newer stablecoin
      this.chainConfig.tokenAddresses.wsteth, // wstETH - liquid staking
      this.chainConfig.tokenAddresses.uni, // UNI - platform token
      this.chainConfig.tokenAddresses.aero, // AERO - Aerodrome token
      this.chainConfig.tokenAddresses.virtual, // VIRTUAL
      this.chainConfig.tokenAddresses.arb, // ARB - Arbitrum token
    ].filter((addr) => addr && addr !== ethers.ZeroAddress);

    // Sort by priority order
    const prioritized = validIntermediaries.sort((a, b) => {
      const indexA = liquidityPriority.indexOf(a);
      const indexB = liquidityPriority.indexOf(b);

      // If both are in priority list, sort by index
      if (indexA !== -1 && indexB !== -1) {
        return indexA - indexB;
      }

      // Priority tokens come first
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;

      // Equal priority for non-listed tokens
      return 0;
    });

    return prioritized;
  }
  private generateDoubleIntermediaryPaths(
    tokenIn: string,
    tokenOut: string,
    intermediaries: string[],
  ): { path: string[]; description: string }[] {
    const paths: { path: string[]; description: string }[] = [];

    // Get top intermediaries for 3-hop routes (limit to prevent explosion)
    const topIntermediaries = intermediaries.slice(0, 6); // Use top 6 most liquid tokens

    // Strategic 3-hop combinations
    const strategicCombinations = [
      // Major stable -> WETH -> major stable routes
      { first: this.chainConfig.tokenAddresses.usdc, second: this.chainConfig.tokenAddresses.weth, name: "USDC-WETH" },
      { first: this.chainConfig.tokenAddresses.usdt, second: this.chainConfig.tokenAddresses.weth, name: "USDT-WETH" },
      { first: this.chainConfig.tokenAddresses.dai, second: this.chainConfig.tokenAddresses.weth, name: "DAI-WETH" },

      // WETH -> major stable routes
      { first: this.chainConfig.tokenAddresses.weth, second: this.chainConfig.tokenAddresses.usdc, name: "WETH-USDC" },
      { first: this.chainConfig.tokenAddresses.weth, second: this.chainConfig.tokenAddresses.usdt, name: "WETH-USDT" },
      { first: this.chainConfig.tokenAddresses.weth, second: this.chainConfig.tokenAddresses.dai, name: "WETH-DAI" },

      // Cross-stable arbitrage routes
      { first: this.chainConfig.tokenAddresses.usdc, second: this.chainConfig.tokenAddresses.usdt, name: "USDC-USDT" },
      { first: this.chainConfig.tokenAddresses.usdc, second: this.chainConfig.tokenAddresses.dai, name: "USDC-DAI" },
      { first: this.chainConfig.tokenAddresses.usdt, second: this.chainConfig.tokenAddresses.dai, name: "USDT-DAI" },

      // BTC bridge routes
      { first: this.chainConfig.tokenAddresses.weth, second: this.chainConfig.tokenAddresses.wbtc, name: "WETH-WBTC" },
      { first: this.chainConfig.tokenAddresses.usdc, second: this.chainConfig.tokenAddresses.wbtc, name: "USDC-WBTC" },
    ];

    // Filter valid combinations and create paths
    for (const combo of strategicCombinations) {
      if (!combo.first || !combo.second || combo.first === ethers.ZeroAddress || combo.second === ethers.ZeroAddress) {
        continue;
      }

      // Skip if either intermediary is the input/output token
      if (
        combo.first.toLowerCase() === tokenIn.toLowerCase() ||
        combo.first.toLowerCase() === tokenOut.toLowerCase() ||
        combo.second.toLowerCase() === tokenIn.toLowerCase() ||
        combo.second.toLowerCase() === tokenOut.toLowerCase()
      ) {
        continue;
      }

      // Skip if same intermediary
      if (combo.first.toLowerCase() === combo.second.toLowerCase()) {
        continue;
      }

      // Forward path: tokenIn -> first -> second -> tokenOut
      paths.push({
        path: [tokenIn, combo.first, combo.second, tokenOut],
        description: `${tokenIn} -> ${this.getTokenSymbol(combo.first)} -> ${this.getTokenSymbol(combo.second)} -> ${tokenOut}`,
      });

      // Reverse path: tokenIn -> second -> first -> tokenOut (if different from forward)
      if (combo.first !== combo.second) {
        paths.push({
          path: [tokenIn, combo.second, combo.first, tokenOut],
          description: `${tokenIn} -> ${this.getTokenSymbol(combo.second)} -> ${this.getTokenSymbol(combo.first)} -> ${tokenOut}`,
        });
      }
    }

    return paths;
  }

  createTheGraphRoutesMulticall3Contexts() {
    // Implementation for TheGraph integration
  }

  private findBestRouteFromResults(
    multicall3Results: Multicall3Result[],
    multicall3Contexts: Multicall3Context[],
  ): Route {
    let bestRoute: Route | null = null;
    let bestAmountOut = 0n;

    // Process each result with its corresponding metadata
    for (let i = 0; i < multicall3Results.length; i++) {
      const result = multicall3Results[i];
      const context = multicall3Contexts[i];

      // Skip failed calls
      if (!result.success || !result.returnData) {
        console.log(`Route failed: ${context.metadata.description}`);
        continue;
      }

      try {
        // Decode the amounts out from the router call
        const decoded = this.uniswapV2RouterV2.decodeGetAmountsOutResult(result.returnData);
        const amountOut = decoded[decoded.length - 1]; // Last element is the final output amount

        console.log(`Route: ${context.metadata.description} | AmountOut: ${amountOut.toString()}`);

        // Check if this is the best route so far
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

    // Return best route or default route if none found
    if (!bestRoute) {
      console.warn("No valid routes found, returning default route");
      return {
        path: [],
        fees: [FeeAmount.MEDIUM],
        encodedPath: null,
        poolKey: null,
      };
    }

    console.log(`Best route selected: ${bestRoute.path.join(" -> ")} with output: ${bestAmountOut.toString()}`);
    return bestRoute;
  }

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

  private isValidPath(path: string[]): boolean {
    const uniqueTokens = new Set(path);
    if (uniqueTokens.size !== path.length) {
      return false;
    }

    const hasZeroAddress = path.some((token) => token === ethers.ZeroAddress);
    if (hasZeroAddress) {
      return false;
    }

    return true;
  }
}
