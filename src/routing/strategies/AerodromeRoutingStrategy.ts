import { ethers, Wallet } from "ethers";
import { BaseRoutingStrategy } from "../BaseRoutingStrategy";
import { Route } from "../../trading/types/quoting-types";
import { Multicall3 } from "../../smartcontracts/multicall3/Multicall3";
import { AerodromeRouter } from "../../smartcontracts/aerodrome/AerodromeRouter";
import { ChainType } from "../../config/chain-config";
import {
  Multicall3Context,
  Multicall3Request,
  Multicall3Result,
  Mutlicall3Metadata,
} from "../../smartcontracts/multicall3/multicall3-types";

import { AerodromeTradeRoute } from "../../smartcontracts/aerodrome/aerodrome-types";

export class AerodromeRoutingStrategy extends BaseRoutingStrategy {
  private intermediaryTokenList: string[] = [];
  private intermediaryTokenCombinations: { firstToken: string; secondToken: string; name: string }[] = [];

  private aerodromeRouter: AerodromeRouter;
  private aerodromeFactoryAddress: string;

  private multicall3: Multicall3;

  constructor(chain: ChainType) {
    super(chain);
    this.intermediaryTokenList = this.getIntermediaryTokenList();
    this.intermediaryTokenCombinations = this.getIntermediaryTokenCombinations();

    this.aerodromeRouter = new AerodromeRouter(chain);
    this.aerodromeFactoryAddress = this.chainConfig.aerodrome.poolFactoryAddress;

    this.multicall3 = new Multicall3(chain);
  }

  async getBestRoute(tokenIn: string, amountIn: bigint, tokenOut: string, wallet: Wallet): Promise<Route> {
    tokenIn = tokenIn === ethers.ZeroAddress ? this.chainConfig.tokenAddresses.weth : tokenIn;
    tokenOut = tokenOut === ethers.ZeroAddress ? this.chainConfig.tokenAddresses.weth : tokenOut;

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

    const multiHopRoutesMulticallContexts = this.createMultiHopRoutes(tokenIn, amountIn, tokenOut, requestIndex);
    multicall3Contexts.push(...multiHopRoutesMulticallContexts);
    requestIndex += multiHopRoutesMulticallContexts.length;

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

    const isStable = true;
    const stableTradeRoute: AerodromeTradeRoute = {
      from: tokenIn,
      to: tokenOut,
      stable: isStable,
      factory: this.aerodromeFactoryAddress,
    };

    const stableCallData = this.aerodromeRouter.encodeGetAmountsOut(amountIn, [stableTradeRoute]);
    const stableRequest: Multicall3Request = {
      target: this.aerodromeRouter.getRouterAddress(),
      allowFailure: true,
      callData: stableCallData,
    };

    const stableMetadata: Mutlicall3Metadata = {
      requestIndex: currentRequestIndex,
      type: "quote",
      path: [tokenIn, tokenOut],
      fees: [],
      description: `${tokenIn} -> ${tokenOut} | stable`,
      aeroRoutes: [stableTradeRoute],
    };

    multicall3Contexts.push({ request: stableRequest, metadata: stableMetadata });
    currentRequestIndex++;

    const isVolatile = !isStable;
    const volatileTradeRoute: AerodromeTradeRoute = {
      from: tokenIn,
      to: tokenOut,
      stable: isVolatile,
      factory: this.aerodromeFactoryAddress,
    };

    const volatileCallData = this.aerodromeRouter.encodeGetAmountsOut(amountIn, [volatileTradeRoute]);
    const volatileRequest: Multicall3Request = {
      target: this.aerodromeRouter.getRouterAddress(),
      allowFailure: true,
      callData: volatileCallData,
    };

    const volatileMetadata: Mutlicall3Metadata = {
      requestIndex: currentRequestIndex,
      type: "quote",
      path: [tokenIn, tokenOut],
      fees: [],
      description: `${tokenIn} -> ${tokenOut} | volatile`,
      aeroRoutes: [volatileTradeRoute],
    };

    multicall3Contexts.push({ request: volatileRequest, metadata: volatileMetadata });
    currentRequestIndex++;

    return multicall3Contexts;
  }

  createMultiHopRoutes(
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

    for (const pathInfo of singleIntermediaryPaths) {
      const stableCombinations = this.getTwoHopStableCombinations();

      for (const combo of stableCombinations) {
        const tradeRoutes: AerodromeTradeRoute[] = [
          {
            from: pathInfo.path[0],
            to: pathInfo.path[1],
            stable: combo.stable[0],
            factory: this.aerodromeFactoryAddress,
          },
          {
            from: pathInfo.path[1],
            to: pathInfo.path[2],
            stable: combo.stable[1],
            factory: this.aerodromeFactoryAddress,
          },
        ];

        const callData = this.aerodromeRouter.encodeGetAmountsOut(amountIn, tradeRoutes);
        const description = `${pathInfo.description} | ${combo.name}`;

        const request: Multicall3Request = {
          target: this.aerodromeRouter.getRouterAddress(),
          allowFailure: true,
          callData: callData,
        };

        const metadata: Mutlicall3Metadata = {
          requestIndex: currentRequestIndex,
          type: "quote",
          path: pathInfo.path,
          description: description,
          fees: [],
          aeroRoutes: tradeRoutes,
        };

        multicall3Contexts.push({ request, metadata });
        currentRequestIndex++;
      }
    }

    for (const pathInfo of doubleIntermediaryPaths) {
      const stableCombinations = this.getThreeHopStableCombinations();

      for (const combo of stableCombinations) {
        const tradeRoutes: AerodromeTradeRoute[] = [
          {
            from: pathInfo.path[0],
            to: pathInfo.path[1],
            stable: combo.stable[0],
            factory: this.aerodromeFactoryAddress,
          },
          {
            from: pathInfo.path[1],
            to: pathInfo.path[2],
            stable: combo.stable[1],
            factory: this.aerodromeFactoryAddress,
          },
          {
            from: pathInfo.path[2],
            to: pathInfo.path[3],
            stable: combo.stable[2],
            factory: this.aerodromeFactoryAddress,
          },
        ];

        const callData = this.aerodromeRouter.encodeGetAmountsOut(amountIn, tradeRoutes);
        const description = `${pathInfo.description} | ${combo.name}`;

        const request: Multicall3Request = {
          target: this.aerodromeRouter.getRouterAddress(),
          allowFailure: true,
          callData: callData,
        };

        const metadata: Mutlicall3Metadata = {
          requestIndex: currentRequestIndex,
          type: "quote",
          path: pathInfo.path,
          description: description,
          fees: [],
          aeroRoutes: tradeRoutes,
        };

        multicall3Contexts.push({ request, metadata });
        currentRequestIndex++;
      }
    }

    return multicall3Contexts;
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

  private getTwoHopStableCombinations(): { stable: boolean[]; name: string }[] {
    return [
      { stable: [false, false], name: "volatile-volatile" },
      { stable: [false, true], name: "volatile-stable" },
      { stable: [true, false], name: "stable-volatile" },
      { stable: [true, true], name: "stable-stable" },
    ];
  }

  private getThreeHopStableCombinations(): { stable: boolean[]; name: string }[] {
    return [
      { stable: [false, false, false], name: "volatile-volatile-volatile" },
      { stable: [false, false, true], name: "volatile-volatile-stable" },
      { stable: [false, true, false], name: "volatile-stable-volatile" },
      { stable: [false, true, true], name: "volatile-stable-stable" },
      { stable: [true, false, false], name: "stable-volatile-volatile" },
      { stable: [true, false, true], name: "stable-volatile-stable" },
      { stable: [true, true, false], name: "stable-stable-volatile" },
      { stable: [true, true, true], name: "stable-stable-stable" },
    ];
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
        const amountsOut: bigint[] = this.aerodromeRouter.decodedGetAmountsOutResult(result.returnData);
        const amountOut = amountsOut[amountsOut.length - 1];

        //console.log(`Route: ${context.metadata.description} | AmountOut: ${amountOut.toString()}`);

        if (amountOut > bestAmountOut) {
          bestAmountOut = amountOut;
          bestRoute = {
            amountOut: bestAmountOut,
            path: context.metadata.path,
            fees: [],
            encodedPath: null,
            poolKey: null,
            aeroRoutes: context.metadata.aeroRoutes || null,
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

    console.log(`Best route selected: ${bestRoute.path.join(" -> ")} | output: ${bestAmountOut.toString()}`);
    return bestRoute;
  }
}
