import { ethers, Wallet } from "ethers";
import { BaseRoutingStrategy } from "../BaseRoutingStrategy";
import { Route } from "../../trading/types/quoting-types";
import { Multicall3 } from "../../smartcontracts/multicall3/Multicall3";
import { encodePath, FeeAmount, UniswapV3QuoterV2 } from "../../smartcontracts/uniswap-v3";
import {
  Multicall3Context,
  Multicall3Request,
  Multicall3Result,
  Mutlicall3Metadata,
} from "../../smartcontracts/multicall3/multicall3-types";

export class UniswapV3RoutingStrategy extends BaseRoutingStrategy {
  private intermediaryTokenList: string[] = [];
  private intermediaryTokenCombinations: { firstToken: string; secondToken: string; name: string }[] = [];

  private uniswapV3QuoterV2: UniswapV3QuoterV2;
  private multicall3: Multicall3;

  constructor(chain: any) {
    super(chain);
    this.intermediaryTokenList = this.getIntermediaryTokenList();
    this.intermediaryTokenCombinations = this.getIntermediaryTokenCombinations();

    this.uniswapV3QuoterV2 = new UniswapV3QuoterV2(chain);
    this.multicall3 = new Multicall3(chain);
  }

  async getBestRoute(tokenIn: string, amountIn: bigint, tokenOut: string, wallet: Wallet): Promise<Route> {
    tokenIn = tokenIn === ethers.ZeroAddress ? this.chainConfig.tokenAddresses.weth : tokenIn;
    tokenOut = tokenOut === ethers.ZeroAddress ? this.chainConfig.tokenAddresses.weth : tokenOut;

    const multicall3Contexts: Multicall3Context[] = [];
    let requestIndex = 0;


    const directRoutesMulticallContexts = this.createDirectRouteMulticall3Contexts(
      tokenIn,
      amountIn,
      tokenOut,
      requestIndex,
    );
    multicall3Contexts.push(...directRoutesMulticallContexts);
    requestIndex += directRoutesMulticallContexts.length;

    const multihopRoutesMulticallContexts = this.createMultihopRouteMulticall3Contexts(
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

      if (bestRoute.path.length > 0 && bestRoute.fees.length > 0) {
        const encodedPath = encodePath(bestRoute.path, bestRoute.fees);
        bestRoute.encodedPath = encodedPath;
      }

      return bestRoute;
    } catch (error) {
      console.error("MULTICALL FAILED:", error);
      throw error;
    }
  }

  createDirectRouteMulticall3Contexts(
    tokenIn: string,
    amountIn: bigint,
    tokenOut: string,
    startingRequestIndex: number,
  ): Multicall3Context[] {
    const multicall3Contexts: Multicall3Context[] = [];

    let currentRequestIndex = startingRequestIndex;

    const recipient = ethers.ZeroAddress;
    const amountOutMin = 0n;
    const sqrtPriceLimitX96 = 0n;

    const fees = [FeeAmount.LOWEST, FeeAmount.LOW, FeeAmount.MEDIUM, FeeAmount.HIGH];

    for (const fee of fees) {
      const callData = this.uniswapV3QuoterV2.encodeQuoteExactInputSingle(
        tokenIn,
        tokenOut,
        fee,
        recipient,
        amountIn,
        amountOutMin,
        sqrtPriceLimitX96,
      );

      const request: Multicall3Request = {
        target: this.uniswapV3QuoterV2.getQuoterAddress(),
        allowFailure: true,
        callData: callData,
      };

      const metadata: Mutlicall3Metadata = {
        requestIndex: currentRequestIndex,
        type: "quote",
        path: [tokenIn, tokenOut],
        fees: [fee],
        description: `${tokenIn} -> ${tokenOut} | ${fee}`,
      };

      multicall3Contexts.push({ request, metadata });
      currentRequestIndex++;
    }

    return multicall3Contexts;
  }

  createMultihopRouteMulticall3Contexts(
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
      const twoHopFeeCombinations = this.getFeeCombinations();

      for (const combo of twoHopFeeCombinations) {
        const encodedPath = encodePath(pathInfo.path, combo.fees);
        const callData = this.uniswapV3QuoterV2.encodeQuoteExactInput(encodedPath, amountIn);
        const description = `${pathInfo.description} | ${combo.fees.join("-")}`;

        const request: Multicall3Request = {
          target: this.uniswapV3QuoterV2.getQuoterAddress(),
          allowFailure: true,
          callData: callData,
        };

        const metadata: Mutlicall3Metadata = {
          requestIndex: currentRequestIndex,
          type: "quote",
          path: pathInfo.path,
          description: description,
          fees: combo.fees,
          encodedPath: encodedPath,
        };

        multicall3Contexts.push({ request, metadata });
        currentRequestIndex++;
      }
    }

    for (const pathInfo of doubleIntermediaryPaths) {
      const threeHopFeeCombinations = this.getThreeHopFeeCombinations();

      for (const combo of threeHopFeeCombinations) {
        const encodedPath = encodePath(pathInfo.path, combo.fees);
        const callData = this.uniswapV3QuoterV2.encodeQuoteExactInput(encodedPath, amountIn);
        const description = `${pathInfo.description} | ${combo.fees.join("-")}`;

        const request: Multicall3Request = {
          target: this.uniswapV3QuoterV2.getQuoterAddress(),
          allowFailure: true,
          callData: callData,
        };

        const metadata: Mutlicall3Metadata = {
          requestIndex: currentRequestIndex,
          type: "quote",
          path: pathInfo.path,
          description: description,
          fees: combo.fees,
          encodedPath: encodedPath,
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
          const { amountOut: decoded } = this.uniswapV3QuoterV2.decodeQuoteExactInputResult(result.returnData);
          amountOut = decoded;
        } else {
          const { amountOut: decoded } = this.uniswapV3QuoterV2.decodeQuoteExactInputSingleResult(result.returnData);
          amountOut = decoded;
        }

        //console.log(`Route: ${context.metadata.description} | AmountOut: ${amountOut.toString()}`);

        if (amountOut > bestAmountOut) {
          bestAmountOut = amountOut;
          bestRoute = {
            amountOut: bestAmountOut,
            path: context.metadata.path,
            fees: context.metadata.fees!,
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
      return this.createDefaultRoute();
    }

    console.log(
      `Best route selected: ${bestRoute.path.join(" -> ")} with fees: ${bestRoute.fees.join(" -> ")} | output: ${bestAmountOut.toString()}`,
    );
    return bestRoute;
  }
}
