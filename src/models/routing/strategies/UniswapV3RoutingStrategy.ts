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
  private feeCombinations: { fees: FeeAmount[]; name: string }[];

  private uniswapV3QuoterV2: UniswapV3QuoterV2;
  private multicall3: Multicall3;

  constructor(chain: any) {
    super(chain);
    this.intermediaryTokenList = this.getIntermediaryTokenList();
    this.intermediaryTokenCombinations = this.getIntermediaryTokenCombinations();
    this.feeCombinations = this.getFeeCombinations();

    this.uniswapV3QuoterV2 = new UniswapV3QuoterV2(chain);
    this.multicall3 = new Multicall3(chain);
  }

  async getBestRoute(tokenIn: string, amountIn: bigint, tokenOut: string, wallet: Wallet): Promise<Route> {
    tokenIn = tokenIn === ethers.ZeroAddress ? this.chainConfig.tokenAddresses.weth : tokenIn;

    let bestRoute: Route = {
      amountOut: 0n,
      path: [],
      fees: [],
      encodedPath: null,
      poolKey: null,
    };

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

    const multicall3Request: Multicall3Request[] = multicall3Contexts.map((context) => context.request);
    console.log(multicall3Contexts);
    console.log(requestIndex);
    throw new Error("Stop");
    const multicall3Results: Multicall3Result[] = await this.multicall3.aggregate3StaticCall(wallet, multicall3Request);

    const route = this.findBestRouteFromResults(multicall3Results, multicall3Contexts);

    return bestRoute;
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

    const allPaths: { path: string[]; description: string }[] = [];

    const singleIntermediaryPaths = this.generateSingleIntermediaryPaths(tokenIn, tokenOut);
    //const doubleIntermediaryPaths = this.generateDoubleIntermediaryPaths(tokenIn, tokenOut);

    allPaths.push(...singleIntermediaryPaths);

    for (const pathInfo of allPaths) {
      for (const combo of this.feeCombinations) {
        const encodedPath = encodePath(pathInfo.path, combo.fees);
        const callData = this.uniswapV3QuoterV2.encodeQuoteExactInput(encodedPath, amountIn);
        const description = `${pathInfo.description} | ${combo.fees}`;

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

    for (let i = 0; i < multicall3Results.length; i++) {
      const result = multicall3Results[i];
      const context = multicall3Contexts[i];

      if (!result.success || !result.returnData) {
        console.log(`Route failed: ${context.metadata.description}`);
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

        console.log(`Route: ${context.metadata.description} | AmountOut: ${amountOut.toString()}`);

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
      return {
        amountOut: 0n,
        path: [],
        fees: [],
        encodedPath: null,
        poolKey: null,
      };
    }

    console.log();
    console.log(
      `Best route selected: ${bestRoute.path.join(" -> ")} with fees: ${bestRoute.fees.join(" -> ")} | output: ${bestAmountOut.toString()}`,
    );
    return bestRoute;
  }
}
